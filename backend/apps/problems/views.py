"""Public (user qismi) endpointlari — 17-bo'lim."""
from __future__ import annotations

import datetime

from django.db.models import BooleanField, Count, Exists, OuterRef, Q, Value
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Bookmark, DailyChallenge, Problem, ProblemStatus, SolvedProblem, Tag
from .serializers import (
    BookmarkSerializer,
    DailyChallengeSerializer,
    PublicProblemDetailSerializer,
    PublicProblemListSerializer,
    TagSerializer,
)


def annotate_user_state(queryset, user):
    """Har bir masalaga joriy foydalanuvchi holatini qo'shadi (yechilgan / urinilgan / saqlangan)."""
    if not (user and user.is_authenticated):
        return queryset.annotate(
            is_solved=Value(False, output_field=BooleanField()),
            is_attempted=Value(False, output_field=BooleanField()),
            is_bookmarked=Value(False, output_field=BooleanField()),
        )

    from apps.judge.models import Submission

    return queryset.annotate(
        is_solved=Exists(SolvedProblem.objects.filter(user=user, problem=OuterRef("pk"))),
        is_attempted=Exists(Submission.objects.filter(user=user, problem=OuterRef("pk"))),
        is_bookmarked=Exists(Bookmark.objects.filter(user=user, problem=OuterRef("pk"))),
    )


class PublicProblemViewSet(viewsets.ReadOnlyModelViewSet):
    """`GET /api/problems` va `GET /api/problems/:slug`.

    Qo'shimcha filtrlar (barchasi ixtiyoriy):
      `difficulty`, `tags__slug`, `search`, `ordering`
      `status` — `solved` | `attempted` | `todo` | `bookmarked` (faqat kirgan foydalanuvchi uchun)
    """

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_fields = ["difficulty", "tags__slug"]
    search_fields = ["title_uz", "title_en"]
    ordering_fields = ["created_at", "points", "total_submissions", "title_uz", "difficulty"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = (
            Problem.objects.filter(status=ProblemStatus.PUBLISHED, is_contest_only=False)
            .prefetch_related("tags")
        )
        queryset = annotate_user_state(queryset, self.request.user)

        # Bir nechta teg bo'yicha (VA emas — YOKI mantiqi bilan)
        tags = self.request.query_params.getlist("tag")
        if tags:
            queryset = queryset.filter(tags__slug__in=tags).distinct()

        state = self.request.query_params.get("status")
        if state and self.request.user.is_authenticated:
            if state == "solved":
                queryset = queryset.filter(is_solved=True)
            elif state == "attempted":
                queryset = queryset.filter(is_attempted=True, is_solved=False)
            elif state == "todo":
                queryset = queryset.filter(is_attempted=False)
            elif state == "bookmarked":
                queryset = queryset.filter(is_bookmarked=True)

        return queryset

    def get_serializer_class(self):
        return PublicProblemListSerializer if self.action == "list" else PublicProblemDetailSerializer

    @action(detail=True, methods=["get"], url_path="submissions", permission_classes=[IsAuthenticated])
    def my_submissions(self, request, slug=None):
        """Shu masala bo'yicha foydalanuvchining oxirgi urinishlari."""
        from apps.judge.models import Submission
        from apps.judge.serializers import PublicSubmissionListSerializer

        problem = self.get_object()
        rows = (
            Submission.objects.filter(user=request.user, problem=problem)
            .select_related("problem")
            .order_by("-created_at")[:50]
        )
        return Response(PublicSubmissionListSerializer(rows, many=True).data)

    @action(detail=True, methods=["get"], url_path="comments")
    def comments(self, request, slug=None):
        """`GET /api/problems/:slug/comments/` — masala ostidagi izohlar.

        Daraxt tuzilishi frontendda yig'iladi, shuning uchun tekis ro'yxat
        qaytadi. Import funksiya ichida: `apps.content` allaqachon
        `apps.problems` dan import qiladi, modul darajasida yozilsa
        aylanma bog'liqlik chiqardi.
        """
        from apps.content.models import Comment, ModerationStatus
        from apps.content.serializers import PublicCommentSerializer

        problem = self.get_object()
        rows = (
            Comment.objects.filter(problem=problem, status=ModerationStatus.VISIBLE)
            .select_related("author")
            .order_by("created_at")
        )
        return Response(
            PublicCommentSerializer(rows, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="bookmark", permission_classes=[IsAuthenticated])
    def toggle_bookmark(self, request, slug=None):
        """Xatcho'pni qo'shadi yoki olib tashlaydi (bitta tugma uchun)."""
        problem = self.get_object()
        existing = Bookmark.objects.filter(user=request.user, problem=problem).first()
        if existing:
            existing.delete()
            return Response({"bookmarked": False, "detail": "Xatcho'pdan olib tashlandi."})

        bookmark = Bookmark.objects.create(
            user=request.user, problem=problem, note=request.data.get("note", "")[:500]
        )
        return Response(
            {"bookmarked": True, "detail": "Xatcho'plarga qo'shildi.",
             "bookmark": BookmarkSerializer(bookmark).data},
            status=status.HTTP_201_CREATED,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def daily_challenge(request):
    """`GET /api/daily-challenge` — bugungi masala, seriya va oylik kalendar."""
    today = timezone.localdate()
    challenge = DailyChallenge.objects.select_related("problem").filter(date=today).first()

    user = request.user if request.user.is_authenticated else None
    history_days = min(int(request.query_params.get("days", 30) or 30), 120)
    since = today - datetime.timedelta(days=history_days)

    past = (
        DailyChallenge.objects.select_related("problem")
        .filter(date__gte=since, date__lte=today)
        .order_by("date")
    )
    solved_ids: set = set()
    if user:
        solved_ids = set(
            SolvedProblem.objects.filter(
                user=user, problem_id__in=[row.problem_id for row in past]
            ).values_list("problem_id", flat=True)
        )

    calendar = [
        {
            "date": str(row.date),
            "problem_slug": row.problem.slug,
            "problem_title": row.problem.title_uz,
            "difficulty": row.problem.difficulty,
            "bonus_points": row.bonus_points,
            "is_solved": row.problem_id in solved_ids,
            "is_today": row.date == today,
        }
        for row in past
    ]

    payload = {
        "calendar": calendar,
        "streak": {
            "current": getattr(user, "current_streak", 0) if user else 0,
            "longest": getattr(user, "longest_streak", 0) if user else 0,
            "last_solved_date": getattr(user, "last_solved_date", None) if user else None,
        },
    }

    if not challenge:
        # 404 emas: seriya va kalendar baribir ko'rsatiladi, sahifa bo'sh qolmaydi
        payload["detail"] = "Bugungi masala hali belgilanmagan."
        return Response(payload)

    payload.update(DailyChallengeSerializer(challenge).data)
    detail_queryset = annotate_user_state(
        Problem.objects.filter(pk=challenge.problem_id).prefetch_related("tags"), user
    )
    problem = detail_queryset.first()
    payload["problem_detail"] = PublicProblemDetailSerializer(problem).data if problem else None
    payload["is_solved"] = challenge.problem_id in solved_ids
    return Response(payload)


class BookmarkViewSet(viewsets.ModelViewSet):
    """`/api/bookmarks/` — shaxsiy saqlanganlar va izohlar (16-bo'lim)."""

    serializer_class = BookmarkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bookmark.objects.filter(user=self.request.user).select_related("problem")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(["GET"])
@permission_classes([AllowAny])
def problem_tags(request):
    rows = (
        Tag.objects.annotate(
            problem_count=Count(
                "problems",
                filter=Q(problems__status=ProblemStatus.PUBLISHED, problems__is_contest_only=False),
                distinct=True,
            )
        )
        .filter(problem_count__gt=0)
        .order_by("-problem_count")
    )
    return Response(TagSerializer(rows, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_progress(request):
    """`GET /api/progress/` — profil va bosh sahifadagi progress kartalari uchun."""
    user = request.user
    published = Problem.objects.filter(status=ProblemStatus.PUBLISHED, is_contest_only=False)

    totals = {row["difficulty"]: row["count"] for row in published.values("difficulty").annotate(count=Count("id"))}
    solved = {
        row["problem__difficulty"]: row["count"]
        for row in SolvedProblem.objects.filter(user=user)
        .values("problem__difficulty")
        .annotate(count=Count("id"))
    }

    return Response(
        {
            "totals": totals,
            "solved": solved,
            "total_problems": published.count(),
            "total_solved": sum(solved.values()),
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
            "total_points": user.total_points,
            "rating": user.rating,
        }
    )
