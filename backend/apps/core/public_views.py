"""Saytning umumiy (public) endpointlari: statistika, e'lonlar, sozlamalar, qidiruv.

Admin paneldagi `dashboard` endpointlaridan farqi — bu yerda hech qanday
maxfiy ko'rsatkich yo'q va autentifikatsiya talab qilinmaydi.
"""
from __future__ import annotations

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def site_stats(request):
    """Bosh sahifa va footer uchun jonli raqamlar."""
    from apps.accounts.models import User
    from apps.contests.models import Contest, ContestStatus
    from apps.judge.models import Submission, SubmissionStatus
    from apps.problems.models import Problem, ProblemStatus

    now = timezone.now()
    problems = Problem.objects.filter(status=ProblemStatus.PUBLISHED, is_contest_only=False)
    submissions = Submission.objects.all()
    accepted = submissions.filter(status=SubmissionStatus.ACCEPTED).count()
    total = submissions.count()

    return Response(
        {
            "problems": problems.count(),
            "problems_by_difficulty": {
                row["difficulty"]: row["count"]
                for row in problems.values("difficulty").annotate(count=Count("id"))
            },
            "users": User.objects.filter(is_active=True, is_banned=False).count(),
            "submissions": total,
            "accepted_submissions": accepted,
            "acceptance_rate": round(accepted / total * 100, 1) if total else 0.0,
            "contests": Contest.objects.exclude(
                status__in=[ContestStatus.DRAFT, ContestStatus.CANCELLED]
            ).count(),
            "running_contests": Contest.objects.filter(
                start_time__lte=now, end_time__gte=now
            ).exclude(status__in=[ContestStatus.DRAFT, ContestStatus.CANCELLED]).count(),
            "generated_at": now,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def active_announcements(request):
    """Sayt tepasida ko'rsatiladigan faol bannerlar."""
    from apps.moderation.models import Announcement

    now = timezone.now()
    queryset = (
        Announcement.objects.filter(is_active=True)
        .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
    )

    user = request.user if request.user.is_authenticated else None

    if user is None:
        # Mehmonga faqat hammaga ochiq e'lon
        queryset = queryset.filter(audience="all")
    else:
        # Maqsadli e'lonlar modelga ancha oldin qo'shilgan, lekin bu yerda
        # tekshirilmagani uchun musobaqa yoki guruh uchun yozilgan banner
        # BARCHA kirgan foydalanuvchilarga chiqib ketardi.
        allowed = Q(audience="all") | Q(audience="users")
        if getattr(user, "is_staff_member", False):
            allowed |= Q(audience="staff")
        allowed |= Q(audience="contest", target_contest__participants__user=user)
        allowed |= Q(audience="group", target_group__members__user=user)
        queryset = queryset.filter(allowed).distinct()

    rows = queryset.order_by("-is_pinned", "-created_at")[:5]
    return Response(
        [
            {
                "id": str(row.id),
                "title_uz": row.title_uz,
                "title_en": row.title_en,
                "body_uz": row.body_uz,
                "body_en": row.body_en,
                "level": row.level,
                "ends_at": row.ends_at,
                "action_url": row.action_url,
                "action_label_uz": row.action_label_uz,
                "action_label_en": row.action_label_en,
                "is_dismissible": row.is_dismissible,
                "is_pinned": row.is_pinned,
            }
            for row in rows
        ]
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def public_settings(request):
    """`is_public=True` deb belgilangan sayt sozlamalari (kalit → qiymat)."""
    from apps.moderation.models import SiteSetting

    rows = SiteSetting.objects.filter(is_public=True)
    return Response({row.key: row.value for row in rows})


@api_view(["GET"])
@permission_classes([AllowAny])
def geo_regions(request):
    """`GET /api/geo/regions/` — ro'yxatdan o'tish formasi uchun viloyat/tuman."""
    from apps.accounts.regions import as_list

    return Response({"regions": as_list()})


@api_view(["GET"])
@permission_classes([AllowAny])
def rank_table(request):
    """`GET /api/ranks/` — Bronzadan Afsonagacha bo'lgan pog'onalar jadvali."""
    from apps.core import ranks

    return Response(
        {
            "ranks": ranks.rank_table(),
            "groups": ranks.GROUPS,
            "max_tier": ranks.MAX_TIER,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def public_search(request):
    """Sayt bo'ylab qidiruv — faqat ochiq kontent.

    Admin paneldagi `global_search` dan farqi: foydalanuvchi, qoralama masala
    yoki chop etilmagan maqola chiqmaydi, havolalar esa sayt sahifalariga oladi.
    """
    from apps.accounts.models import User
    from apps.contests.models import Contest, ContestStatus
    from apps.problems.models import Problem, ProblemStatus

    query = (request.query_params.get("q") or "").strip()
    if len(query) < 2:
        return Response({"query": query, "results": [], "counts": {}})

    limit = min(int(request.query_params.get("limit", 6) or 6), 20)
    results: list[dict] = []

    problems = Problem.objects.filter(
        status=ProblemStatus.PUBLISHED, is_contest_only=False
    ).filter(Q(title_uz__icontains=query) | Q(title_en__icontains=query) | Q(slug__icontains=query))
    for problem in problems[:limit]:
        results.append(
            {
                "type": "problem",
                "id": str(problem.id),
                "title": problem.title_uz,
                "title_en": problem.title_en,
                "subtitle": f"{problem.get_difficulty_display()} · {problem.points} ball",
                "difficulty": problem.difficulty,
                "url": f"/problems/{problem.slug}",
            }
        )

    contests = Contest.objects.exclude(
        status__in=[ContestStatus.DRAFT, ContestStatus.CANCELLED]
    ).filter(Q(title_uz__icontains=query) | Q(title_en__icontains=query))
    for contest in contests[:limit]:
        results.append(
            {
                "type": "contest",
                "id": str(contest.id),
                "title": contest.title_uz,
                "title_en": contest.title_en,
                "subtitle": contest.start_time.strftime("%Y-%m-%d %H:%M"),
                "url": f"/contests/{contest.slug}",
            }
        )

    from apps.core import ranks

    users = User.objects.filter(is_active=True, is_banned=False).filter(
        Q(username__icontains=query) | Q(full_name__icontains=query)
    ).order_by("-total_points")
    for user in users[:limit]:
        rank = ranks.rank_info(user.rating)
        results.append(
            {
                "type": "user",
                "id": str(user.id),
                "title": user.username,
                "title_en": user.username,
                "subtitle": f"{rank['name_uz']} · {user.total_points:,} ball".replace(",", " "),
                "avatar_url": user.avatar_url,
                "rank": rank,
                "url": f"/u/{user.username}",
            }
        )

    counts: dict[str, int] = {}
    for row in results:
        counts[row["type"]] = counts.get(row["type"], 0) + 1

    return Response({"query": query, "results": results, "counts": counts})
