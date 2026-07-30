"""Davom etayotgan musobaqa natijalarini submissionlardan hisoblash.

`tasks.recalculate_standings` bilan bir xil mantiq, lekin Celery'siz — jadval
so'ralganda darhol ishlaydi.

Hisoblash **throttle** qilingan: oddiy `leaderboard` endpointi ham, jonli SSE
oqimi ham shu yerdan chaqiradi, ya'ni bir vaqtda 200 kishi natijalarni ochib
tursa ham baza `REFRESH_EVERY` soniyada bir martadan ko'p yangilanmaydi.
Ishtirokchilar soni ortganda bu farq sezilarli: har bir hisob har bir ishtirokchi
uchun ikkita so'rov qiladi.
"""
from __future__ import annotations

from django.core.cache import cache

# Natijalarni qayta hisoblash oralig'i (soniya)
REFRESH_EVERY = 5


def _lock_key(contest_id) -> str:
    return f"contest:standings:{contest_id}"


def refresh_live_standings(contest) -> None:
    """Ballarni, penaltyni va o'rinlarni submissionlardan qayta hisoblaydi."""
    from apps.judge.models import SubmissionStatus

    points_by_problem = {cp.problem_id: cp.points for cp in contest.contest_problems.all()}
    participants = list(contest.participants.select_related("user"))
    if not participants:
        return

    for participant in participants:
        accepted_ids = list(
            contest.submissions.filter(user=participant.user, status=SubmissionStatus.ACCEPTED)
            .values_list("problem_id", flat=True)
            .distinct()
        )
        wrong = (
            contest.submissions.filter(user=participant.user, problem_id__in=accepted_ids)
            .exclude(status=SubmissionStatus.ACCEPTED)
            .count()
        )
        score = sum(points_by_problem.get(pid, 0) for pid in accepted_ids)
        penalty = wrong * 10
        if (
            participant.solved_count != len(accepted_ids)
            or participant.score != score
            or participant.penalty != penalty
        ):
            participant.solved_count = len(accepted_ids)
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
