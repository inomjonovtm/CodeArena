from __future__ import annotations

import itertools
import logging

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.judge.models import Submission, SubmissionStatus

from .models import PlagiarismPair
from .similarity import matched_lines, similarity

logger = logging.getLogger(__name__)


def _scan_group(submissions: list[Submission], threshold: float, contest=None) -> int:
    created = 0
    for a, b in itertools.combinations(submissions, 2):
        if a.user_id == b.user_id:
            continue
        score = similarity(a.code, b.code)
        if score < threshold:
            continue

        first, second = sorted([a, b], key=lambda s: str(s.id))
        if PlagiarismPair.objects.filter(submission_a=first, submission_b=second).exists():
            continue

        PlagiarismPair.objects.create(
            contest=contest,
            problem=a.problem,
            submission_a=first,
            submission_b=second,
            user_a=first.user,
            user_b=second.user,
            similarity=score,
            language=a.language,
            same_ip=bool(a.ip_address and a.ip_address == b.ip_address),
            time_delta_seconds=int(abs((a.created_at - b.created_at).total_seconds())),
            matched_lines=matched_lines(first.code, second.code),
        )
        created += 1
    return created


@shared_task(name="apps.moderation.tasks.scan_contest_plagiarism")
def scan_contest_plagiarism(contest_id: str, threshold: float | None = None) -> str:
    """Contest tugagach barcha ACCEPTED submissionlarni taqqoslaydi (13-bo'lim)."""
    from apps.contests.models import Contest

    contest = Contest.objects.filter(pk=contest_id).first()
    if not contest:
        return "not-found"

    threshold = threshold if threshold is not None else settings.PLAGIARISM_THRESHOLD
    total = 0
    problem_ids = contest.contest_problems.values_list("problem_id", flat=True)

    for problem_id in problem_ids:
        for language in ("python", "javascript", "cpp"):
            rows = list(
                Submission.objects.filter(
                    contest=contest, problem_id=problem_id,
                    language=language, status=SubmissionStatus.ACCEPTED,
                ).select_related("user", "problem")[:400]
            )
            if len(rows) > 1:
                total += _scan_group(rows, threshold, contest=contest)

    contest.plagiarism_checked_at = timezone.now()
    contest.save(update_fields=["plagiarism_checked_at"])
    return f"pairs:{total}"


@shared_task(name="apps.moderation.tasks.scheduled_backup")
def scheduled_backup() -> str:
    """Rejaga ko'ra zaxira (celery beat, sukut bo'yicha kuniga bir marta).

    Jadval `BACKUP_SCHEDULE_ENABLED` bilan boshqariladi: o'chirilgan bo'lsa
    task chaqirilsa ham hech narsa qilmaydi. Bu lokal ishlab chiqishda
    keraksiz fayllar to'planib qolmasligi uchun.
    """
    from . import backups

    if not getattr(settings, "BACKUP_SCHEDULE_ENABLED", False):
        return "disabled"

    try:
        record = backups.create_backup(automatic=True, note="Rejaga ko'ra")
    except Exception as exc:
        # `logger.error` Sentry'ga hodisa sifatida tushadi — tungi zaxira
        # uzilib qolgani jimgina o'tib ketmasligi kerak.
        logger.error("Rejadagi zaxira muvaffaqiyatsiz: %s", exc)
        raise

    logger.info(
        "Zaxira olindi",
        extra={"filename": record.filename, "size_bytes": record.size_bytes},
    )
    return record.filename


@shared_task(name="apps.moderation.tasks.scan_problem_plagiarism")
def scan_problem_plagiarism(problem_id: str, threshold: float | None = None, limit: int = 300) -> str:
    """Bitta masala bo'yicha amaliyot submissionlarini tekshiradi."""
    threshold = threshold if threshold is not None else settings.PLAGIARISM_THRESHOLD
    total = 0
    for language in ("python", "javascript", "cpp"):
        rows = list(
            Submission.objects.filter(
                problem_id=problem_id, language=language, status=SubmissionStatus.ACCEPTED
            ).select_related("user", "problem").order_by("-created_at")[:limit]
        )
        if len(rows) > 1:
            total += _scan_group(rows, threshold)
    return f"pairs:{total}"
