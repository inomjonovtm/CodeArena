from __future__ import annotations

from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Contest, ContestParticipant, ContestStatus
from .rating import RatingRow, compute_rating_changes


@shared_task(name="apps.contests.tasks.refresh_contest_statuses")
def refresh_contest_statuses() -> str:
    now = timezone.now()
    started = Contest.objects.filter(
        status=ContestStatus.SCHEDULED, start_time__lte=now, end_time__gt=now
    ).update(status=ContestStatus.RUNNING)
    finished = Contest.objects.filter(
        status__in=[ContestStatus.SCHEDULED, ContestStatus.RUNNING], end_time__lte=now
    ).update(status=ContestStatus.FINISHED)
    return f"started={started} finished={finished}"


@shared_task(name="apps.contests.tasks.send_contest_reminders")
def send_contest_reminders() -> str:
    """Boshlanishiga oz qolgan musobaqalar uchun ishtirokchilarga eslatma.

    Sozlamalardagi "Musobaqa eslatmalari" (`notify_contest`) o'chirilgan
    foydalanuvchilar chetlab o'tiladi. Xabar sayt ichidagi qo'ng'iroqqa
    yoziladi va obuna bo'lgan qurilmalarga brauzer push xabari sifatida ketadi
    (`notifications.services.notify_many`).

    Takroriy xabardan `reminder_sent_at` himoya qiladi: bayroq **oldin**
    va shartli `UPDATE` bilan qo'yiladi, shuning uchun ikkita beat bir vaqtda
    ishga tushib qolsa ham xabar bir marta ketadi.
    """
    from apps.notifications.models import NotificationKind
    from apps.notifications.services import notify_many

    now = timezone.now()
    minutes = int(getattr(settings, "CONTEST_REMINDER_MINUTES", 30))
    horizon = now + timedelta(minutes=minutes)

    # Ro'yxat darhol o'qib olinadi: quyida `reminder_sent_at` yozilgach,
    # queryset qayta hisoblansa bo'sh qaytardi.
    upcoming = list(
        Contest.objects.filter(
            start_time__gt=now, start_time__lte=horizon, reminder_sent_at__isnull=True
        ).exclude(status__in=[ContestStatus.DRAFT, ContestStatus.CANCELLED])
    )

    total = 0
    for contest in upcoming:
        claimed = Contest.objects.filter(pk=contest.pk, reminder_sent_at__isnull=True).update(
            reminder_sent_at=now
        )
        if not claimed:
            continue  # boshqa ishchi ulgurdi

        recipients = [
            participant.user
            for participant in contest.participants.select_related("user").filter(
                is_disqualified=False, user__notify_contest=True, user__is_active=True
            )
        ]
        if not recipients:
            continue

        left = max(1, int((contest.start_time - now).total_seconds() // 60))
        total += notify_many(
            recipients,
            kind=NotificationKind.CONTEST_SOON,
            level="info",
            title=f"{contest.title_uz} — {left} daqiqadan keyin",
            body="Musobaqa boshlanmoqda. Tayyor bo'ling!",
            url=f"/contests/{contest.slug}",
        )

    return f"contests={len(upcoming)} notified={total}"


@shared_task(name="apps.contests.tasks.recalculate_standings")
def recalculate_standings(contest_id: str) -> str:
    """Ballarni submissionlardan qayta hisoblab, rank'larni yangilaydi."""
    from apps.judge.models import SubmissionStatus

    contest = Contest.objects.filter(pk=contest_id).prefetch_related("contest_problems").first()
    if not contest:
        return "not-found"

    points_by_problem = {cp.problem_id: cp.points for cp in contest.contest_problems.all()}

    with transaction.atomic():
        for participant in contest.participants.select_related("user"):
            accepted = (
                contest.submissions.filter(
                    user=participant.user, status=SubmissionStatus.ACCEPTED
                )
                .values("problem_id")
                .distinct()
            )
            solved_ids = [row["problem_id"] for row in accepted]
            participant.solved_count = len(solved_ids)
            participant.score = sum(points_by_problem.get(pid, 0) for pid in solved_ids)

            wrong = contest.submissions.filter(
                user=participant.user, problem_id__in=solved_ids
            ).exclude(status=SubmissionStatus.ACCEPTED).count()
            participant.penalty = wrong * 10
            participant.save(update_fields=["solved_count", "score", "penalty"])

        ordered = contest.participants.filter(is_disqualified=False).order_by("-score", "penalty", "created_at")
        for index, participant in enumerate(ordered, start=1):
            if participant.rank != index:
                participant.rank = index
                participant.save(update_fields=["rank"])

    return f"ok:{contest.participants.count()}"


@shared_task(name="apps.contests.tasks.apply_contest_ratings")
def apply_contest_ratings(contest_id: str) -> str:
    """Contest tugagach Elo reytingini qo'llaydi (7-bo'lim)."""
    contest = Contest.objects.filter(pk=contest_id).first()
    if not contest:
        return "not-found"
    if not contest.is_rated:
        return "not-rated"
    if contest.ratings_applied_at:
        return "already-applied"

    participants = list(
        contest.participants.filter(is_disqualified=False, is_virtual=False)
        .select_related("user")
        .order_by("rank")
    )
    if len(participants) < 2:
        return "not-enough-participants"

    rows = [
        RatingRow(
            user_id=str(p.user_id),
            rating_before=p.user.rating,
            actual_rank=p.rank or index,
            contests_played=p.user.contests_participated,
        )
        for index, p in enumerate(participants, start=1)
    ]
    changes = compute_rating_changes(
        rows, k_new=contest.rating_k_new, k_experienced=contest.rating_k_experienced
    )

    with transaction.atomic():
        for participant in participants:
            delta = changes.get(str(participant.user_id), 0)
            user = participant.user
            participant.rating_before = user.rating
            participant.rating_change = delta
            participant.rating_after = max(0, user.rating + delta)
            participant.save(update_fields=["rating_before", "rating_change", "rating_after"])

            user.rating = participant.rating_after
            user.max_rating = max(user.max_rating, user.rating)
            user.contests_participated += 1
            user.save(update_fields=["rating", "max_rating", "contests_participated"])

        contest.ratings_applied_at = timezone.now()
        contest.save(update_fields=["ratings_applied_at"])

    return f"applied:{len(participants)}"
