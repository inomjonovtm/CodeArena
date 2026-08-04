from __future__ import annotations

import random

from celery import shared_task
from django.utils import timezone

from .models import DailyChallenge, Problem, ProblemStatus


@shared_task(name="apps.problems.tasks.rotate_daily_challenge")
def rotate_daily_challenge() -> str:
    """Har kuni 00:00 da kunlik masalani tayinlaydi (16-bo'lim)."""
    today = timezone.localdate()
    if DailyChallenge.objects.filter(date=today).exists():
        return "already-set"

    recent = set(
        DailyChallenge.objects.filter(date__gte=today - timezone.timedelta(days=60))
        .values_list("problem_id", flat=True)
    )
    pool = list(
        Problem.objects.filter(status=ProblemStatus.PUBLISHED, is_contest_only=False)
        .exclude(id__in=recent)
    )
    if not pool:
        return "no-candidates"

    # Kunlik masala tanlash — kriptografik tasodifiylik talab qilmaydi.
    DailyChallenge.objects.create(problem=random.choice(pool), date=today)  # noqa: S311
    return "created"


@shared_task(name="apps.problems.tasks.publish_scheduled")
def publish_scheduled() -> str:
    """`publish_at` vaqti kelgan masalalarni avtomatik chop etadi."""
    now = timezone.now()

    problems = Problem.objects.filter(
        publish_at__isnull=False,
        publish_at__lte=now,
        status=ProblemStatus.DRAFT,
    )
    problem_count = 0
    for problem in problems:
        if not problem.description_uz.strip() or not problem.test_cases.exists():
            continue  # to'liq bo'lmagan masalani chop etmaymiz
        problem.status = ProblemStatus.PUBLISHED
        problem.published_at = problem.published_at or now
        problem.publish_at = None
        problem.save(update_fields=["status", "published_at", "publish_at", "updated_at"])
        problem_count += 1

    return f"problems={problem_count}"


@shared_task(name="apps.problems.tasks.purge_trash")
def purge_trash() -> str:
    """Savatchada 30 kundan ortiq turgan yozuvlarni butunlay o'chiradi."""
    from django.conf import settings

    from apps.core.trash import TRASHABLE, _model

    cutoff = timezone.now() - timezone.timedelta(days=settings.TRASH_RETENTION_DAYS)
    total = 0
    for key in TRASHABLE:
        model = _model(key)
        queryset = model.all_objects.filter(deleted_at__isnull=False, deleted_at__lt=cutoff)
        total += queryset.count()
        queryset.hard_delete()
    return f"purged={total}"
