"""Admin dashboard — KPI, grafiklar, tezkor ro'yxatlar, global qidiruv."""
from __future__ import annotations

import datetime

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import Role, User
from apps.contests.models import Contest, ContestStatus
from apps.content.models import Comment, ContentReport, Discussion
from apps.core import ranks
from apps.core.permissions import require
from apps.judge import engine as judge_engine
from apps.judge.models import Submission, SubmissionStatus
from apps.moderation.models import AuditLog, PlagiarismPair, PlagiarismStatus
from apps.problems.models import DailyChallenge, Problem, ProblemStatus


def _delta(current: int, previous: int) -> float:
    if not previous:
        return 100.0 if current else 0.0
    return round((current - previous) / previous * 100, 1)


@api_view(["GET"])
@permission_classes([require("dashboard.view")])
def stats(request):
    """KPI kartalari uchun asosiy ko'rsatkichlar."""
    now = timezone.now()
    today = timezone.localdate()
    week_ago = now - datetime.timedelta(days=7)
    two_weeks_ago = now - datetime.timedelta(days=14)

    users = User.objects.all()
    submissions = Submission.objects.all()
    problems = Problem.objects.all()

    users_week = users.filter(created_at__gte=week_ago).count()
    users_prev = users.filter(created_at__gte=two_weeks_ago, created_at__lt=week_ago).count()
    subs_week = submissions.filter(created_at__gte=week_ago).count()
    subs_prev = submissions.filter(created_at__gte=two_weeks_ago, created_at__lt=week_ago).count()

    accepted = submissions.filter(status=SubmissionStatus.ACCEPTED).count()
    total_subs = submissions.count()

    return Response(
        {
            "users": {
                "total": users.count(),
                "active": users.filter(is_active=True, is_banned=False).count(),
                "banned": users.filter(is_banned=True).count(),
                "new_today": users.filter(created_at__date=today).count(),
                "new_this_week": users_week,
                "trend_percent": _delta(users_week, users_prev),
                "staff": users.filter(role__in=[Role.ADMIN, Role.MODERATOR]).count(),
            },
            "problems": {
                "total": problems.count(),
                "published": problems.filter(status=ProblemStatus.PUBLISHED).count(),
                "draft": problems.filter(status=ProblemStatus.DRAFT).count(),
                "without_tests": problems.annotate(tc=Count("test_cases")).filter(tc=0).count(),
            },
            "submissions": {
                "total": total_subs,
                "today": submissions.filter(created_at__date=today).count(),
                "this_week": subs_week,
                "trend_percent": _delta(subs_week, subs_prev),
                "pending": submissions.filter(
                    status__in=[SubmissionStatus.PENDING, SubmissionStatus.JUDGING]
                ).count(),
                "acceptance_rate": round(accepted / total_subs * 100, 1) if total_subs else 0.0,
            },
            "contests": {
                "total": Contest.objects.count(),
                "running": Contest.objects.filter(start_time__lte=now, end_time__gte=now).count(),
                "upcoming": Contest.objects.filter(start_time__gt=now)
                .exclude(status=ContestStatus.DRAFT).count(),
            },
            "moderation": {
                "plagiarism_pending": PlagiarismPair.objects.filter(
                    status=PlagiarismStatus.PENDING).count(),
                "reports_open": ContentReport.objects.filter(is_resolved=False).count(),
                "flagged_discussions": Discussion.objects.filter(flagged_count__gt=0).count(),
            },
            "content": {
                "discussions": Discussion.objects.count(),
                "comments": Comment.objects.count(),
            },
            "generated_at": now,
        }
    )


@api_view(["GET"])
@permission_classes([require("dashboard.view")])
def charts(request):
    """Grafiklar uchun vaqt qatorlari. `?days=30`"""
    days = min(int(request.query_params.get("days", 30)), 365)
    start = timezone.now() - datetime.timedelta(days=days)

    def series(queryset, field="created_at"):
        rows = (
            queryset.filter(**{f"{field}__gte": start})
            .annotate(day=TruncDate(field))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        return {str(row["day"]): row["count"] for row in rows}

    submissions_by_day = series(Submission.objects.all())
    accepted_by_day = series(Submission.objects.filter(status=SubmissionStatus.ACCEPTED))
    users_by_day = series(User.objects.all())

    timeline = []
    for offset in range(days, -1, -1):
        day = str((timezone.localdate() - datetime.timedelta(days=offset)))
        timeline.append(
            {
                "date": day,
                "submissions": submissions_by_day.get(day, 0),
                "accepted": accepted_by_day.get(day, 0),
                "new_users": users_by_day.get(day, 0),
            }
        )

    return Response(
        {
            "timeline": timeline,
            "submissions_by_status": list(
                Submission.objects.values("status").annotate(count=Count("id")).order_by("-count")
            ),
            "submissions_by_language": list(
                Submission.objects.values("language").annotate(count=Count("id")).order_by("-count")
            ),
            "problems_by_difficulty": list(
                Problem.objects.values("difficulty").annotate(count=Count("id"))
            ),
            "users_by_locale": list(User.objects.values("locale").annotate(count=Count("id"))),
            "top_problems": list(
                Problem.objects.order_by("-total_submissions")
                .values("slug", "title_uz", "difficulty", "total_submissions", "accepted_submissions")[:10]
            ),
            "top_users": [
                {**row, "rank": ranks.rank_info(row["rating"])}
                for row in User.objects.filter(is_active=True, is_banned=False)
                .order_by("-total_points")
                .values("username", "full_name", "avatar_url", "total_points", "rating", "problems_solved")[:10]
            ],
        }
    )


@api_view(["GET"])
@permission_classes([require("dashboard.view")])
def activity(request):
    """So'nggi faollik: submissionlar, foydalanuvchilar, audit yozuvlari."""
    from apps.accounts.serializers import AdminUserListSerializer
    from apps.judge.serializers import AdminSubmissionListSerializer
    from apps.moderation.serializers import AuditLogSerializer

    limit = min(int(request.query_params.get("limit", 10)), 50)
    return Response(
        {
            "recent_submissions": AdminSubmissionListSerializer(
                Submission.objects.select_related("user", "problem").order_by("-created_at")[:limit],
                many=True,
            ).data,
            "recent_users": AdminUserListSerializer(
                User.objects.order_by("-created_at")[:limit], many=True
            ).data,
            "recent_audit": AuditLogSerializer(
                AuditLog.objects.select_related("actor").order_by("-created_at")[:limit], many=True
            ).data,
        }
    )


@api_view(["GET"])
@permission_classes([require("dashboard.view")])
def system_health(request):
    """Tizim holati: judge navbati, kunlik masala, e'tibor talab qiladigan joylar."""
    now = timezone.now()
    today = timezone.localdate()
    judge = judge_engine.health()

    stuck = Submission.objects.filter(
        status__in=[SubmissionStatus.PENDING, SubmissionStatus.JUDGING],
        created_at__lt=now - datetime.timedelta(minutes=10),
    ).count()

    warnings = []
    if not judge["available"]:
        warnings.append({"level": "danger", "message": "Judge xizmati ishlamayapti — yechimlar tekshirilmaydi."})
    elif judge["backend"] == "local":
        warnings.append(
            {"level": "info",
             "message": "Judge0 ishlamayapti; lokal runner ishlatilmoqda (produksiya uchun tavsiya etilmaydi)."}
        )
    if stuck:
        warnings.append({"level": "danger", "message": f"{stuck} ta submission 10 daqiqadan ortiq navbatda."})
    if not DailyChallenge.objects.filter(date=today).exists():
        warnings.append({"level": "warning", "message": "Bugungi kunlik masala belgilanmagan."})
    empty_problems = Problem.objects.filter(status=ProblemStatus.PUBLISHED).annotate(
        tc=Count("test_cases")
    ).filter(tc=0).count()
    if empty_problems:
        warnings.append(
            {"level": "warning", "message": f"{empty_problems} ta chop etilgan masalada test-case yo'q."}
        )
    pending_plagiarism = PlagiarismPair.objects.filter(status=PlagiarismStatus.PENDING).count()
    if pending_plagiarism:
        warnings.append(
            {"level": "info", "message": f"{pending_plagiarism} ta plagiat signali ko'rib chiqilmagan."}
        )

    return Response(
        {
            "judge0": {
                "url": judge["judge0_url"],
                "available": judge["available"],
                "backend": judge["backend"],
                "judge0_available": judge["judge0_available"],
                "languages": judge["languages"],
            },
            "queue": {
                "pending": Submission.objects.filter(status=SubmissionStatus.PENDING).count(),
                "judging": Submission.objects.filter(status=SubmissionStatus.JUDGING).count(),
                "stuck": stuck,
            },
            "daily_challenge_today": DailyChallenge.objects.filter(date=today).exists(),
            "warnings": warnings,
            "checked_at": now,
        }
    )


@api_view(["GET"])
@permission_classes([require("dashboard.view")])
def global_search(request):
    """Command palette (Cmd+K) uchun global qidiruv."""
    query = (request.query_params.get("q") or "").strip()
    if len(query) < 2:
        return Response({"results": []})

    results = []
    for problem in Problem.objects.filter(
        Q(title_uz__icontains=query) | Q(title_en__icontains=query) | Q(slug__icontains=query)
    )[:5]:
        results.append({
            "type": "problem", "id": str(problem.id), "title": problem.title_uz,
            "subtitle": f"{problem.get_difficulty_display()} · {problem.slug}",
            "url": f"/admin/problems/{problem.id}",
        })

    for user in User.objects.filter(
        Q(username__icontains=query) | Q(email__icontains=query) | Q(full_name__icontains=query)
    )[:5]:
        results.append({
            "type": "user", "id": str(user.id), "title": user.username,
            "subtitle": f"{user.email} · {user.get_role_display()}",
            "url": f"/admin/users/{user.id}",
        })

    for contest in Contest.objects.filter(
        Q(title_uz__icontains=query) | Q(title_en__icontains=query)
    )[:5]:
        results.append({
            "type": "contest", "id": str(contest.id), "title": contest.title_uz,
            "subtitle": contest.start_time.strftime("%Y-%m-%d %H:%M"),
            "url": f"/admin/contests/{contest.id}",
        })

    return Response({"results": results, "query": query})
