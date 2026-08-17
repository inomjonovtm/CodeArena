"""Musobaqa natijalarini submissionlardan hisoblash.

`tasks.recalculate_standings` ham, jonli `leaderboard`/SSE ham shu yerdagi
YAGONA funksiyani chaqiradi — ilgari mantiq ikki joyda takrorlanib, sekin
farqlanib ketgan edi.

Hisoblash **throttle** qilingan: oddiy `leaderboard` endpointi ham, jonli SSE
oqimi ham shu yerdan chaqiradi, ya'ni bir vaqtda 200 kishi natijalarni ochib
tursa ham baza `REFRESH_EVERY` soniyada bir martadan ko'p yangilanmaydi.
"""
from __future__ import annotations

from django.core.cache import cache
from django.db.models import Max, Min

# Natijalarni qayta hisoblash oralig'i (soniya)
REFRESH_EVERY = 5


def _lock_key(contest_id) -> str:
    return f"contest:standings:{contest_id}"


def refresh_live_standings(contest) -> None:
    """Ballarni, penaltyni va o'rinlarni submissionlardan qayta hisoblaydi.

    Ikki rejim:
    - **ICPC** — yechilgan masala to'liq ball beradi; penalty faqat HAQIQIY
      noto'g'ri verdiktlar (WA/TLE/MLE/RE) uchun va faqat masala birinchi
      marta qabul qilingunga QADAR yuborilganlari uchun. Ilgari navbatda
      turgan (PENDING) yoki tizim xatosi olgan yechim ham 10 daqiqa jarima
      olardi, AC dan keyingi urinishlar ham sanardi.
    - **IOI** — har bir masala bo'yicha eng yaxshi qisman ball (0..100%)
      masala balliga ko'paytiriladi; jarima yo'q. Ilgari bu rejim umuman
      hisoblanmasdi — IOI musobaqasi ham ICPC kabi baholanardi.
    """
    from apps.judge.models import SubmissionStatus

    from .models import ScoringRule

    wrong_statuses = [
        SubmissionStatus.WRONG_ANSWER,
        SubmissionStatus.TIME_LIMIT_EXCEEDED,
        SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
        SubmissionStatus.RUNTIME_ERROR,
    ]

    points_by_problem = {cp.problem_id: cp.points for cp in contest.contest_problems.all()}
    participants = list(contest.participants.select_related("user"))
    if not participants:
        return

    ioi = getattr(contest, "scoring", "") == ScoringRule.IOI

    for participant in participants:
        if ioi:
            best_rows = (
                contest.submissions.filter(user=participant.user)
                .values("problem_id")
                .annotate(best=Max("score"))
            )
            score = sum(
                round((row["best"] or 0) * points_by_problem.get(row["problem_id"], 0) / 100)
                for row in best_rows
            )
            solved = sum(1 for row in best_rows if (row["best"] or 0) >= 100)
            penalty = 0
        else:
            first_ac = {
                row["problem_id"]: row["first"]
                for row in (
                    contest.submissions.filter(
                        user=participant.user, status=SubmissionStatus.ACCEPTED
                    )
                    .values("problem_id")
                    .annotate(first=Min("created_at"))
                )
            }
            solved = len(first_ac)
            score = sum(points_by_problem.get(pid, 0) for pid in first_ac)
            wrong_rows = contest.submissions.filter(
                user=participant.user,
                status__in=wrong_statuses,
                problem_id__in=list(first_ac),
            ).values_list("problem_id", "created_at")
            wrong = sum(1 for pid, created in wrong_rows if created < first_ac[pid])
            penalty = wrong * 10

        if (
            participant.solved_count != solved
            or participant.score != score
            or participant.penalty != penalty
        ):
            participant.solved_count = solved
            participant.score = score
            participant.penalty = penalty
            participant.save(update_fields=["solved_count", "score", "penalty"])

    ordered = (
        contest.participants.filter(is_disqualified=False)
        .order_by("-score", "penalty", "created_at")
    )
    for index, participant in enumerate(ordered, start=1):
        if participant.rank != index:
            participant.rank = index
            participant.save(update_fields=["rank"])


def refresh_if_stale(contest) -> bool:
    """Oxirgi hisobdan `REFRESH_EVERY` soniya o'tgan bo'lsa yangilaydi.

    `cache.add()` — kalit yo'q bo'lgandagina yozadi, shuning uchun bir vaqtda
    kelgan bir nechta so'rovdan faqat bittasi hisoblaydi, qolganlari o'sha
    zahoti yangilangan natijani o'qiydi.
    """
    if not cache.add(_lock_key(contest.pk), 1, REFRESH_EVERY):
        return False
    refresh_live_standings(contest)
    return True
