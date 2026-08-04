from __future__ import annotations

import logging

from celery import shared_task
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.problems.models import SolvedProblem

from . import engine
from .models import Submission, SubmissionStatus, SubmissionTestResult

logger = logging.getLogger(__name__)

TERMINAL_FIRST = {
    SubmissionStatus.COMPILE_ERROR,
    SubmissionStatus.SYSTEM_ERROR,
}


@shared_task(name="apps.judge.tasks.judge_submission", bind=True, max_retries=2)
def judge_submission(self, submission_id: str) -> str:
    """Submissionni Judge0'ga yuborib, natijani saqlaydi (8-bo'lim statuslari)."""
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

    try:
        backend, results = engine.execute(
            language=submission.language,
            code=submission.code,
            cases=[
                {"input": tc.input, "expected_output": tc.expected_output}
                for tc in test_cases
            ],
            # Limitlar test-case darajasida ham belgilanishi mumkin; eng
            # kattasini olamiz, chunki batch bitta chaqiruvda ketadi.
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
            error_message = (result.stderr or result.message or "")[:2000]
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


def _update_counters(submission: Submission) -> None:
    user = submission.user
    problem = submission.problem

    # Rejudge hisoblagichlarni ikkinchi marta oshirmasligi kerak — shuning
    # uchun urinishlar soni faqat birinchi tekshiruvda yoziladi.
    if not submission.is_counted:
        problem.total_submissions = F("total_submissions") + 1
        if submission.status == SubmissionStatus.ACCEPTED:
            problem.accepted_submissions = F("accepted_submissions") + 1
        problem.save(update_fields=["total_submissions", "accepted_submissions"])

        user.submissions_count = F("submissions_count") + 1
        user.save(update_fields=["submissions_count"])
        user.refresh_from_db(fields=["submissions_count"])

        Submission.objects.filter(pk=submission.pk).update(is_counted=True)
        submission.is_counted = True

    if submission.status != SubmissionStatus.ACCEPTED:
        return

    # Ball faqat amaliyotda beriladi — contestda o'rniga Elo reyting o'zgaradi
    # (7-bo'lim). Shuning uchun `points_awarded` haqiqatan berilgan ballni
    # saqlaydi va hisoblagichlarni qayta hisoblash mos keladi.
    awarded = problem.points if submission.is_practice else 0

    _solved, created = SolvedProblem.objects.get_or_create(
        user=user, problem=problem, defaults={"points_awarded": awarded}
    )
    if created:
        submission.is_first_accepted = True
        submission.save(update_fields=["is_first_accepted"])
        # "Yechilgan" hisobi va streak contestda ham yangilanadi — masala
        # yechilgani rost; faqat ball nolga teng bo'ladi.
        user.register_solve(awarded, solved_on=timezone.localdate())
        _notify_first_solve(user, problem, submission)


def _notify_first_solve(user, problem, submission) -> None:
    """Masala birinchi marta yechilganda sayt ichi bildirishnoma."""
    from apps.notifications.models import NotificationKind
    from apps.notifications.services import notify

    # Contestda ball berilmaydi — xabarda ham noto'g'ri raqam ko'rsatilmasin
    awarded = problem.points if submission.is_practice else 0
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
        )
        judge_submission.delay(str(sid))
    return f"queued:{len(submission_ids)}"
