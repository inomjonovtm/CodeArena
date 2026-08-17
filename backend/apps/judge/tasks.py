from __future__ import annotations

import logging

from celery import shared_task
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.problems.models import SolvedProblem

from . import checker, engine
from .models import Submission, SubmissionStatus, SubmissionTestResult

logger = logging.getLogger(__name__)

TERMINAL_FIRST = {
    SubmissionStatus.COMPILE_ERROR,
    SubmissionStatus.SYSTEM_ERROR,
}


@shared_task(name="apps.judge.tasks.judge_submission", bind=True, max_retries=2)
def judge_submission(self, submission_id: str) -> str:
    """Yechimni bajarish xizmatiga yuborib, natijani saqlaydi (8-bo'lim statuslari)."""
    submission = (
        Submission.objects.select_related("problem", "user").filter(pk=submission_id).first()
    )
    if submission is None:
        return "not-found"

    test_cases = list(submission.problem.test_cases.order_by("order"))
    if not test_cases:
        submission.status = SubmissionStatus.SYSTEM_ERROR
        submission.error_message = "Masalada test-case yo'q."
        submission.judged_at = timezone.now()
        submission.save(update_fields=["status", "error_message", "judged_at"])
        return "no-tests"

    submission.status = SubmissionStatus.JUDGING
    submission.total_tests = len(test_cases)
    submission.save(update_fields=["status", "total_tests"])

    problem = submission.problem
    # `exact` da solishtirishni backendning o'zi bajaradi (eski, tekshirilgan
    # yo'l). Qolgan usullarda kutilgan chiqish YUBORILMAYDI: bizga dasturning
    # chiqishi kerak, qarorni esa `checker` chiqaradi.
    use_checker = checker_needed(problem)

    try:
        backend, results = engine.execute(
            language=submission.language,
            code=submission.code,
            cases=[
                {
                    "input": tc.input,
                    "expected_output": None if use_checker else tc.expected_output,
                    # Har bir test O'Z limiti bilan boradi. Ilgari faqat eng
                    # katta limit yuborilardi va bitta yumshoq test butun
                    # to'plamning TLE nazoratini o'chirib qo'yardi.
                    "time_limit_ms": tc.effective_time_limit,
                    "memory_limit_kb": tc.effective_memory_limit,
                }
                for tc in test_cases
            ],
            time_limit_ms=max(tc.effective_time_limit for tc in test_cases),
            memory_limit_kb=max(tc.effective_memory_limit for tc in test_cases),
        )
    except Exception as exc:
        logger.exception("Judge xatosi: %s", exc)
        submission.status = SubmissionStatus.SYSTEM_ERROR
        submission.error_message = "Judge xizmatiga ulanib bo'lmadi."
        submission.judged_at = timezone.now()
        submission.save(update_fields=["status", "error_message", "judged_at"])
        return "judge-error"

    if backend == engine.BACKEND_NONE:
        submission.status = SubmissionStatus.SYSTEM_ERROR
        submission.error_message = engine.NO_BACKEND_MESSAGE
        submission.judged_at = timezone.now()
        submission.save(update_fields=["status", "error_message", "judged_at"])
        return "no-backend"

    if use_checker:
        try:
            apply_checker(problem, test_cases, results)
        except Exception as exc:
            logger.exception("Checker xatosi: %s", exc)
            submission.status = SubmissionStatus.SYSTEM_ERROR
            submission.error_message = "Masalaning checkeri ishlamadi — muallifga xabar berildi."
            submission.judged_at = timezone.now()
            submission.save(update_fields=["status", "error_message", "judged_at"])
            return "checker-error"

    try:
        _apply_results(submission, test_cases, results)
    except Exception as exc:
        # Natijalarni yozishda xato bo'lsa (masalan natijalar soni testlar
        # soniga mos kelmasa yoki baza uzilsa), submission JUDGING holatida
        # ABADIY qolib ketardi va foydalanuvchi javob kutib o'tirardi.
        logger.exception("Natijalarni yozib bo'lmadi: %s", exc)
        submission.status = SubmissionStatus.SYSTEM_ERROR
        submission.error_message = "Natijalarni saqlashda xatolik yuz berdi."
        submission.judged_at = timezone.now()
        submission.save(update_fields=["status", "error_message", "judged_at"])
        return "apply-error"

    return submission.status


def checker_needed(problem) -> bool:
    """Baholashni backendga emas, `checker` moduliga topshirish kerakmi."""
    return (getattr(problem, "checker_type", "exact") or "exact") != "exact"


def apply_checker(problem, test_cases, results) -> None:
    """Bajarilish natijalarini checker qarori bilan yakunlaydi.

    Dastur muvaffaqiyatli tugagan testlarning holati shu paytda `ACCEPTED`
    bo'ladi — chunki backendga kutilgan chiqish berilmagan. Haqiqiy qarorni
    shu yerda chiqaramiz. TLE, RE va kompilyatsiya xatosi tegilmaydi: ular
    javob mazmuniga bog'liq emas.
    """
    runnable = [
        (index, tc, result)
        for index, (tc, result) in enumerate(zip(test_cases, results, strict=True))
        if result.status == SubmissionStatus.ACCEPTED
    ]
    if not runnable:
        return

    verdicts = checker.check_many(
        problem,
        [
            {"input": tc.input, "expected": tc.expected_output, "actual": result.stdout}
            for _index, tc, result in runnable
        ],
    )

    for (_index, _tc, result), verdict in zip(runnable, verdicts, strict=True):
        if verdict.message:
            result.meta["checker"] = verdict.message
        if verdict.ok:
            continue
        # Checkerning o'zi qulasa — bu masala nuqsoni: foydalanuvchini
        # noto'g'ri javob bilan ayblash o'rniga tizim xatosi qaytariladi.
        result.status = (
            SubmissionStatus.SYSTEM_ERROR if verdict.system_error else SubmissionStatus.WRONG_ANSWER
        )


@transaction.atomic
def _apply_results(submission: Submission, test_cases, results) -> None:
    SubmissionTestResult.objects.filter(submission=submission).delete()

    passed = 0
    final_status = SubmissionStatus.ACCEPTED
    failed_index = None
    max_runtime = 0
    max_memory = 0
    error_message = ""
    compile_output = ""

    rows = []
    # `strict=True` — `engine.execute` uzunliklar tengligini kafolatlaydi;
    # kafolat buzilsa jimgina qisqartirish o'rniga xato ko'tarilsin.
    for index, (tc, result) in enumerate(zip(test_cases, results, strict=True), start=1):
        rows.append(
            SubmissionTestResult(
                submission=submission,
                test_case=tc,
                order=index,
                status=result.status,
                runtime_ms=result.runtime_ms,
                memory_kb=result.memory_kb,
                # 8-bo'lim: yashirin testlarning chiqishi saqlanmaydi
                stdout=result.stdout[:2000] if tc.is_sample else "",
                stderr=result.stderr[:2000] if tc.is_sample else "",
                is_sample=tc.is_sample,
            )
        )
        max_runtime = max(max_runtime, result.runtime_ms or 0)
        max_memory = max(max_memory, result.memory_kb or 0)

        if result.status == SubmissionStatus.ACCEPTED:
            passed += 1
            continue

        if final_status == SubmissionStatus.ACCEPTED:
            final_status = result.status
            failed_index = index
            # Checker izohi eng aniq tushuntirish — u bo'lsa oldinda turadi
            # («3-son xato», «juftlik yig'indisi mos emas»).
            error_message = (
                result.meta.get("checker") or result.stderr or result.message or ""
            )[:2000]
            compile_output = result.compile_output[:4000]
            if result.status in TERMINAL_FIRST:
                break

    SubmissionTestResult.objects.bulk_create(rows)

    submission.status = final_status
    submission.passed_tests = passed
    submission.failed_test_index = failed_index
    submission.runtime_ms = max_runtime or None
    submission.memory_kb = max_memory or None
    submission.error_message = error_message
    submission.compile_output = compile_output
    submission.judged_at = timezone.now()
    submission.score = int(passed / max(len(test_cases), 1) * 100)
    submission.save()

    _update_counters(submission)


def _daily_bonus(problem) -> int:
    """Bugungi kunlik masala bonusi (bo'lmasa 0).

    Bitta joyda hisoblanadi: ilgari mukofot va bildirishnoma alohida-alohida
    hisoblab, yarim tunda har xil raqam ko'rsatishi mumkin edi.
    """
    from apps.problems.models import DailyChallenge

    bonus = (
        DailyChallenge.objects.filter(problem=problem, date=timezone.localdate())
        .values_list("bonus_points", flat=True)
        .first()
    )
    return int(bonus or 0)


def _update_counters(submission: Submission) -> None:
    user = submission.user
    problem = submission.problem

    # Rejudge hisoblagichlarni ikkinchi marta oshirmasligi kerak. Bayroq
    # ATOMIK bosib olinadi: ilgari «o'qi, keyin yoz» edi va bitta submission
    # ikki worker qo'liga tushsa, hisoblagichlar ikki marta oshardi.
    claimed = Submission.objects.filter(pk=submission.pk, is_counted=False).update(is_counted=True)
    if claimed:
        submission.is_counted = True
        problem.total_submissions = F("total_submissions") + 1
        if submission.status == SubmissionStatus.ACCEPTED:
            problem.accepted_submissions = F("accepted_submissions") + 1
        problem.save(update_fields=["total_submissions", "accepted_submissions"])

        user.submissions_count = F("submissions_count") + 1
        user.save(update_fields=["submissions_count"])
        user.refresh_from_db(fields=["submissions_count"])

    if submission.status != SubmissionStatus.ACCEPTED:
        return

    # Ball faqat amaliyotda beriladi — contestda o'rniga Elo reyting o'zgaradi
    # (7-bo'lim). Shuning uchun `points_awarded` haqiqatan berilgan ballni
    # saqlaydi va hisoblagichlarni qayta hisoblash mos keladi.
    awarded = problem.points if submission.is_practice else 0

    # KUNLIK BONUS — masala aynan o'zining kunida yechilsa qo'shiladi.
    if awarded:
        awarded += _daily_bonus(problem)

    _solved, created = SolvedProblem.objects.get_or_create(
        user=user, problem=problem, defaults={"points_awarded": awarded}
    )
    if created:
        submission.is_first_accepted = True
        submission.save(update_fields=["is_first_accepted"])

        # Bir foydalanuvchining ikki DAV masalasi parallel tekshirilsa,
        # ball/streak/reyting o'zgarishlari bir-birini bosib ketmasligi uchun
        # foydalanuvchi qatori qulflab olinadi (xotiradagi nusxa emas,
        # bazadagi eng yangi qiymatlar ustida ishlaymiz).
        from apps.accounts.models import User

        with transaction.atomic():
            locked_user = User.objects.select_for_update().get(pk=user.pk)
            # "Yechilgan" hisobi va streak contestda ham yangilanadi — masala
            # yechilgani rost; faqat ball nolga teng bo'ladi.
            locked_user.register_solve(awarded, solved_on=timezone.localdate())

            # Reyting masalaning qiyinlik darajasiga qarab o'sadi. Amaliyotda
            # ham, olimpiadada ham: masala yechilgani — yechilgani. Olimpiada
            # oxirida ustiga o'rin bo'yicha hisob ham qo'shiladi.
            from apps.accounts import rating as rating_engine

            rating_engine.apply_solve(locked_user, problem)

        # Tashqi obyekt eskirib qolmasin — keyingi bildirishnomalar yangi
        # qiymatlarni (streak, reyting) ko'rsatadi.
        user.refresh_from_db()

        _log_group_activity(user, problem)
        _notify_first_solve(user, problem, submission)


def _log_group_activity(user, problem) -> None:
    """Yechilgan masala foydalanuvchi guruhlarining tasmasiga tushadi.

    Guruh sahifasi shu tufayli tirik bo'ladi: a'zolar bir-birining
    harakatini ko'radi va qaytib kelish uchun sabab paydo bo'ladi.
    """
    from apps.community.models import GroupActivity, GroupMember

    memberships = GroupMember.objects.filter(user=user).values_list("group_id", flat=True)
    if not memberships:
        return

    GroupActivity.objects.bulk_create(
        [
            GroupActivity(
                group_id=group_id,
                user=user,
                kind=GroupActivity.Kind.SOLVED,
                text=problem.title_uz[:200],
                url=f"/problems/{problem.slug}",
            )
            for group_id in memberships
        ]
    )


def _notify_first_solve(user, problem, submission) -> None:
    """Masala birinchi marta yechilganda sayt ichi bildirishnoma."""
    from apps.notifications.models import NotificationKind
    from apps.notifications.services import notify

    # Contestda ball berilmaydi — xabarda ham noto'g'ri raqam ko'rsatilmasin
    awarded = problem.points if submission.is_practice else 0
    if awarded:
        awarded += _daily_bonus(problem)
    body = f"+{awarded} ball" if awarded else "Musobaqa masalasi yechildi"
    if user.current_streak > 1:
        body += f" · {user.current_streak} kunlik seriya"

    notify(
        user,
        kind=NotificationKind.SUBMISSION_RESULT,
        level="success",
        title=f"«{problem.title_uz}» yechildi",
        body=body,
        url=f"/problems/{problem.slug}",
        payload={"submission_id": str(submission.id), "points": awarded},
    )


@shared_task(name="apps.judge.tasks.rejudge_submissions")
def rejudge_submissions(submission_ids: list[str]) -> str:
    for sid in submission_ids:
        Submission.objects.filter(pk=sid).update(
            status=SubmissionStatus.PENDING, error_message="", compile_output="",
            passed_tests=0, failed_test_index=None, judged_at=None,
            # Eski o'lchovlar ham tozalanadi — aks holda yangi natija chiqquncha
            # sahifada avvalgi vaqt/xotira/ball ko'rinib turardi.
            score=0, runtime_ms=None, memory_kb=None, total_tests=0,
        )
        judge_submission.delay(str(sid))
    return f"queued:{len(submission_ids)}"


@shared_task(name="apps.judge.tasks.requeue_stuck_submissions")
def requeue_stuck_submissions(minutes: int = 10) -> str:
    """PENDING/JUDGING holatida qotib qolgan yechimlarni qayta navbatga qo'yadi.

    Worker o'lsa (OOM, deploy, SIGKILL) xabar yo'qoladi va submission abadiy
    «tekshirilmoqda»da qolardi — foydalanuvchi esa javob kutib o'tiraverardi.
    Beat har necha daqiqada eskirganlarni topib qayta yuboradi.
    """
    cutoff = timezone.now() - timezone.timedelta(minutes=minutes)
    stuck = list(
        Submission.objects.filter(
            status__in=[SubmissionStatus.PENDING, SubmissionStatus.JUDGING],
            created_at__lt=cutoff,
        ).values_list("pk", flat=True)[:200]
    )
    for sid in stuck:
        Submission.objects.filter(pk=sid).update(status=SubmissionStatus.PENDING, judged_at=None)
        judge_submission.delay(str(sid))
    if stuck:
        logger.warning("Qotib qolgan %s ta submission qayta navbatga qo'yildi.", len(stuck))
    return f"requeued:{len(stuck)}"
