"""Public contest endpointlari — 17-bo'lim."""
from __future__ import annotations

from django.db.models import Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Contest, ContestParticipant, ContestStatus
from .serializers import (
    ContestParticipantSerializer,
    PublicContestDetailSerializer,
    PublicContestSerializer,
)
from .standings import refresh_if_stale


class PublicContestViewSet(viewsets.ReadOnlyModelViewSet):
    """`/api/contests/` — ro'yxat, tafsilot, qo'shilish va leaderboard."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    ordering = ["-start_time"]

    def get_queryset(self):
        return (
            Contest.objects.exclude(status__in=[ContestStatus.DRAFT, ContestStatus.CANCELLED])
            .annotate(
                problem_count=Count("contest_problems", distinct=True),
                participant_count=Count("participants", distinct=True),
            )
        )

    def get_serializer_class(self):
        return PublicContestSerializer if self.action == "list" else PublicContestDetailSerializer

    def list(self, request, *args, **kwargs):
        """`?state=running|scheduled|finished` bo'yicha filtr (hisoblangan holat)."""
        queryset = self.filter_queryset(self.get_queryset())
        state = request.query_params.get("state")
        now = timezone.now()
        if state == "running":
            queryset = queryset.filter(start_time__lte=now, end_time__gte=now)
        elif state == "scheduled":
            queryset = queryset.filter(start_time__gt=now)
        elif state == "finished":
            queryset = queryset.filter(end_time__lt=now)

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    # ------------------------------------------------------------- yordamchi
    def _participation(self, contest, user):
        if not (user and user.is_authenticated):
            return None
        return ContestParticipant.objects.filter(contest=contest, user=user).first()

    def _may_see_problems(self, contest, participation) -> bool:
        """Masalalar contest boshlangandan keyin ishtirokchiga, tugagach hammaga ochiq."""
        state = contest.computed_status
        if state == ContestStatus.FINISHED:
            return True
        if state == ContestStatus.RUNNING:
            return participation is not None
        return False

    # --------------------------------------------------------------- amallar
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def join(self, request, slug=None):
        contest = self.get_object()
        now = timezone.now()
        is_virtual = now > contest.end_time

        if contest.computed_status == ContestStatus.SCHEDULED and now < contest.start_time:
            pass  # oldindan ro'yxatdan o'tish ochiq
        if is_virtual and not contest.is_virtual_allowed:
            return Response({"detail": "Virtual rejim yopiq."}, status=status.HTTP_400_BAD_REQUEST)
        if contest.visibility == "private":
            if (request.data.get("password") or "") != contest.access_password:
                return Response({"detail": "Parol noto'g'ri."}, status=status.HTTP_403_FORBIDDEN)
        if contest.max_participants and contest.participants.count() >= contest.max_participants:
            existing = ContestParticipant.objects.filter(contest=contest, user=request.user).exists()
            if not existing:
                return Response({"detail": "Joylar tugagan."}, status=status.HTTP_400_BAD_REQUEST)

        participant, created = ContestParticipant.objects.get_or_create(
            contest=contest, user=request.user,
            defaults={"is_virtual": is_virtual, "started_at": now},
        )

        if created:
            from apps.notifications.models import NotificationKind
            from apps.notifications.services import notify

            notify(
                request.user,
                kind=NotificationKind.CONTEST_SOON,
                level="success",
                title=("Virtual rejimda qo'shildingiz" if is_virtual else "Musobaqaga yozildingiz"),
                body=contest.title_uz,
                url=f"/contests/{contest.slug}",
            )

        return Response(
            ContestParticipantSerializer(participant).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def leave(self, request, slug=None):
        """Boshlanmagan musobaqadan yozilishni bekor qilish."""
        contest = self.get_object()
        if contest.computed_status != ContestStatus.SCHEDULED:
            return Response(
                {"detail": "Boshlangan musobaqadan chiqib bo'lmaydi."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted, _ = ContestParticipant.objects.filter(contest=contest, user=request.user).delete()
        return Response({"detail": "Ro'yxatdan chiqarildingiz.", "removed": bool(deleted)})

    @action(detail=True, methods=["get"])
    def problems(self, request, slug=None):
        """Contest masalalari — ruxsat bo'lsa, har biri bo'yicha o'z holatingiz bilan."""
        contest = self.get_object()
        participation = self._participation(contest, request.user)

        if not self._may_see_problems(contest, participation):
            return Response(
                {
                    "detail": "Masalalar musobaqa boshlangach ishtirokchilarga ochiladi.",
                    "code": "locked",
                    "problems": [],
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        from apps.judge.models import Submission, SubmissionStatus

        rows = contest.contest_problems.select_related("problem").order_by("order")
        solved_ids: set = set()
        attempted_ids: set = set()
        if request.user.is_authenticated:
            base = Submission.objects.filter(contest=contest, user=request.user)
            solved_ids = set(
                base.filter(status=SubmissionStatus.ACCEPTED).values_list("problem_id", flat=True)
            )
            attempted_ids = set(base.values_list("problem_id", flat=True))

        return Response(
            {
                "problems": [
                    {
                        "id": str(cp.id),
                        "label": cp.label or chr(65 + cp.order),
                        "order": cp.order,
                        "points": cp.points,
                        "problem_slug": cp.problem.slug,
                        "title_uz": cp.problem.title_uz,
                        "title_en": cp.problem.title_en,
                        "difficulty": cp.problem.difficulty,
                        "is_solved": cp.problem_id in solved_ids,
                        "is_attempted": cp.problem_id in attempted_ids,
                    }
                    for cp in rows
                ]
            }
        )

    @action(
        detail=True,
        methods=["get"],
        url_path=r"problems/(?P<problem_slug>[^/.]+)",
        permission_classes=[IsAuthenticated],
    )
    def problem_detail(self, request, slug=None, problem_slug=None):
        """Musobaqa ichidagi bitta masala.

        Amaliyot sahifasidan farqi ataylab: **tahlil (editorial), maslahat va
        muhokama qaytarilmaydi** — musobaqa davomida ular spoyler bo'lardi.
        Faqat shart, namuna testlar va boshlang'ich kod beriladi.
        """
        contest = self.get_object()
        participation = self._participation(contest, request.user)
        if not self._may_see_problems(contest, participation):
            return Response(
                {"detail": "Masalalar musobaqa boshlangach ochiladi.", "code": "locked"},
                status=status.HTTP_403_FORBIDDEN,
            )

        entry = (
            contest.contest_problems.select_related("problem")
            .filter(problem__slug=problem_slug)
            .first()
        )
        if entry is None:
            return Response(
                {"detail": "Bu masala musobaqada yo'q."}, status=status.HTTP_404_NOT_FOUND
            )

        from apps.judge.models import Submission, SubmissionStatus

        problem = entry.problem
        mine = Submission.objects.filter(contest=contest, user=request.user, problem=problem)

        return Response(
            {
                "contest_slug": contest.slug,
                "contest_title_uz": contest.title_uz,
                "contest_title_en": contest.title_en,
                "contest_end_time": contest.end_time,
                "contest_state": contest.computed_status,
                "label": entry.label or chr(65 + entry.order),
                "points": entry.points,
                "slug": problem.slug,
                "title_uz": problem.title_uz,
                "title_en": problem.title_en,
                "difficulty": problem.difficulty,
                "description_uz": problem.description_uz,
                "description_en": problem.description_en,
                "constraints_uz": problem.constraints_uz,
                "constraints_en": problem.constraints_en,
                "time_limit_ms": problem.time_limit_ms,
                "memory_limit_kb": problem.memory_limit_kb,
                "starter_code_python": problem.starter_code_python,
                "starter_code_javascript": problem.starter_code_javascript,
                "starter_code_cpp": problem.starter_code_cpp,
                "samples": [
                    {
                        "input": tc.input,
                        "expected_output": tc.expected_output,
                        "explanation_uz": tc.explanation_uz,
                        "explanation_en": tc.explanation_en,
                    }
                    for tc in problem.test_cases.filter(is_sample=True).order_by("order")
                ],
                "is_solved": mine.filter(status=SubmissionStatus.ACCEPTED).exists(),
                "attempts": mine.count(),
                # Shu masala bo'yicha o'z urinishlarim tarixi — musobaqada
                # qaysi yechim qaysi statusni olganini ko'rib turish kerak
                "my_submissions": [
                    {
                        "id": str(row.id),
                        "language": row.language,
                        "status": row.status,
                        "passed_tests": row.passed_tests,
                        "total_tests": row.total_tests,
                        "runtime_ms": row.runtime_ms,
                        "created_at": row.created_at,
                    }
                    for row in mine.order_by("-created_at")[:20]
                ],
                "server_time": timezone.now(),
            }
        )

    @action(detail=True, methods=["get"])
    def leaderboard(self, request, slug=None):
        """Jonli natijalar jadvali. Contest davomida ballar submissionlardan hisoblanadi."""
        contest = self.get_object()
        if contest.computed_status == ContestStatus.RUNNING:
            refresh_if_stale(contest)

        rows = (
            contest.participants.filter(is_disqualified=False)
            .select_related("user")
            .order_by("rank", "-score", "penalty")[:300]
        )
        data = ContestParticipantSerializer(rows, many=True).data

        me = None
        if request.user.is_authenticated:
            mine = contest.participants.filter(user=request.user).select_related("user").first()
            if mine:
                me = ContestParticipantSerializer(mine).data

        return Response({"results": data, "me": me, "server_time": timezone.now()})

    @action(detail=False, methods=["get"], url_path="mine", permission_classes=[IsAuthenticated])
    def my_contests(self, request):
        """Foydalanuvchi qatnashgan musobaqalar."""
        rows = (
            ContestParticipant.objects.filter(user=request.user)
            .select_related("contest")
            .order_by("-contest__start_time")[:50]
        )
        return Response(
            [
                {
                    "contest_slug": row.contest.slug,
                    "title_uz": row.contest.title_uz,
                    "title_en": row.contest.title_en,
                    "start_time": row.contest.start_time,
                    "computed_status": row.contest.computed_status,
                    "rank": row.rank,
                    "score": row.score,
                    "solved_count": row.solved_count,
                    "rating_change": row.rating_change,
                    "is_virtual": row.is_virtual,
                    "is_disqualified": row.is_disqualified,
                }
                for row in rows
            ]
        )


