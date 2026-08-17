from __future__ import annotations

import copy

import django_filters as filters
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.exports import ExportMixin
from apps.core.mixins import AuditLogMixin, BulkActionMixin, OwnScopedMixin, write_audit
from apps.core.permissions import HasResourcePerm, IsStaff
from apps.core.trash import SoftDeleteViewSetMixin
from apps.core.utils import to_int, unique_slug

from .models import (
    DailyChallenge,
    Difficulty,
    Problem,
    ProblemStatus,
    Tag,
    TestCase,
)
from .serializers import (
    DailyChallengeSerializer,
    ProblemDetailSerializer,
    ProblemListSerializer,
    TagSerializer,
    TestCaseSerializer,
    publish_blockers,
)
from .studio_views import visible_problems


class ProblemFilter(filters.FilterSet):
    difficulty = filters.MultipleChoiceFilter(choices=Difficulty.choices)
    status = filters.MultipleChoiceFilter(choices=ProblemStatus.choices)
    tags = filters.ModelMultipleChoiceFilter(queryset=Tag.objects.all())
    tag_slug = filters.CharFilter(field_name="tags__slug", lookup_expr="iexact")
    is_premium = filters.BooleanFilter()
    is_contest_only = filters.BooleanFilter()
    author = filters.CharFilter(field_name="author__username", lookup_expr="iexact")
    has_test_cases = filters.BooleanFilter(method="filter_has_test_cases")
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Problem
        fields = ["difficulty", "status", "tags", "is_premium", "is_contest_only"]

    def filter_has_test_cases(self, queryset, name, value):
        # `distinct=True` — teg filtri bilan birga kelganda JOIN qatorlarni
        # ko'paytirib, sonni noto'g'ri oshirib yubormasin.
        queryset = queryset.annotate(_tc=Count("test_cases", distinct=True))
        return queryset.filter(_tc__gt=0) if value else queryset.filter(_tc=0)


class AdminProblemViewSet(
    OwnScopedMixin, SoftDeleteViewSetMixin, ExportMixin, AuditLogMixin, BulkActionMixin,
    viewsets.ModelViewSet,
):
    """`/api/admin/problems/` — masalalar CRUD (5-bo'lim: Masala CRUD)."""

    queryset = Problem.objects.all()
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "problems"
    perm_actions = {
        "publish": "publish", "unpublish": "publish", "duplicate": "edit",
        "test_cases": "testcases.edit", "stats": "view", "export": "import",
    }
    filterset_class = ProblemFilter
    search_fields = ["title_uz", "title_en", "slug", "description_uz", "description_en"]
    ordering_fields = [
        "created_at", "updated_at", "title_uz", "difficulty", "points",
        "total_submissions", "accepted_submissions", "published_at",
    ]
    ordering = ["-created_at"]
    audit_label = "problem"
    bulk_allowed_actions = ("delete", "publish", "unpublish", "archive", "set_difficulty", "add_tags", "remove_tags")
    bulk_perm_actions = {"publish": "publish", "unpublish": "publish"}
    export_filename = "codearena-masalalar"
    export_columns = [
        ("slug", "Slug"),
        ("title_uz", "Sarlavha (uz)"),
        ("title_en", "Sarlavha (en)"),
        ("difficulty", "Qiyinlik"),
        ("points", "Ball"),
        ("status", "Holat"),
        ("total_submissions", "Submissionlar"),
        ("accepted_submissions", "Accepted"),
        ("time_limit_ms", "Vaqt limiti"),
        ("memory_limit_kb", "Xotira limiti"),
        ("author__username", "Muallif"),
        ("published_at", "Chop etilgan"),
        ("created_at", "Yaratilgan"),
    ]

    @action(detail=False, methods=["get"])
    def export(self, request):
        return self.export_csv(request)

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related("author")
            .prefetch_related("tags")
            .annotate(test_case_count=Count("test_cases", distinct=True))
        )

    def get_serializer_class(self):
        return ProblemListSerializer if self.action == "list" else ProblemDetailSerializer

    # ------------------------------------------------------------- actions
    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        problem = self.get_object()
        blockers = publish_blockers(
            description_uz=problem.description_uz,
            test_cases=list(problem.test_cases.all()),
            checker_type=problem.checker_type,
            checker_code=problem.checker_code,
        )
        if blockers:
            return Response({"detail": " ".join(blockers), "blockers": blockers},
                            status=status.HTTP_400_BAD_REQUEST)
        problem.status = ProblemStatus.PUBLISHED
        problem.published_at = problem.published_at or timezone.now()
        problem.save(update_fields=["status", "published_at", "updated_at"])
        write_audit(request, action_name="problem.publish", obj=problem)
        return Response(self.get_serializer(problem).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        problem = self.get_object()
        problem.status = ProblemStatus.DRAFT
        # Rejalashtirilgan sana ham tozalanadi — aks holda `publish_scheduled`
        # beat vazifasi masalani jimgina qaytadan chop etib yuborardi.
        problem.publish_at = None
        problem.save(update_fields=["status", "publish_at", "updated_at"])
        write_audit(request, action_name="problem.unpublish", obj=problem)
        return Response(self.get_serializer(problem).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        source = self.get_object()
        tags = list(source.tags.all())
        test_cases = list(source.test_cases.all())

        clone = copy.copy(source)
        clone.pk = None
        clone.id = None
        clone.slug = unique_slug(Problem, f"{source.slug}-copy", max_length=120)
        clone.title_uz = f"{source.title_uz} (nusxa)"
        clone.title_en = f"{source.title_en} (copy)" if source.title_en else ""
        clone.status = ProblemStatus.DRAFT
        clone.published_at = None
        clone.publish_at = None
        clone.total_submissions = 0
        clone.accepted_submissions = 0
        clone.author = request.user
        clone.save()
        clone.tags.set(tags)
        TestCase.objects.bulk_create(
            [
                TestCase(
                    problem=clone, order=tc.order, input=tc.input,
                    expected_output=tc.expected_output, is_sample=tc.is_sample,
                    explanation_uz=tc.explanation_uz, explanation_en=tc.explanation_en,
                    time_limit_ms=tc.time_limit_ms, memory_limit_kb=tc.memory_limit_kb,
                )
                for tc in test_cases
            ]
        )
        write_audit(request, action_name="problem.duplicate", obj=clone,
                    changes={"source": str(source.pk)})
        return Response(ProblemDetailSerializer(clone, context=self.get_serializer_context()).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="test-cases")
    def test_cases(self, request, pk=None):
        problem = self.get_object()
        if request.method == "GET":
            # Studio bitta masalada ko'pi bilan bir necha yuz test saqlaydi;
            # 2000 — himoya chegarasi, "hammasini yukla"ning oldini oladi.
            rows = problem.test_cases.order_by("order")[:2000]
            return Response(TestCaseSerializer(rows, many=True).data)

        # `problem` maydoni endi majburiy — bu yerda esa u URL dan keladi,
        # shuning uchun data'ga o'zimiz qo'shamiz.
        payload = {key: request.data[key] for key in request.data}
        payload["problem"] = problem.pk
        serializer = TestCaseSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save(problem=problem)
        write_audit(request, action_name="testcase.create", obj=problem,
                    changes={"test_case": serializer.data})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # `test-cases/reorder` endpointi olib tashlandi: masala serializeri
    # test-case'larni `order` maydoni bilan birga sinxronlaydi
    # (`_sync_test_cases`), shuning uchun tartibni o'zgartirish masalani
    # saqlash orqali amalga oshadi — alohida endpoint takror edi.

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        problem = self.get_object()
        by_status = problem.submissions.values("status").annotate(count=Count("id")).order_by("-count")
        by_language = problem.submissions.values("language").annotate(count=Count("id")).order_by("-count")
        return Response(
            {
                "total_submissions": problem.total_submissions,
                "accepted_submissions": problem.accepted_submissions,
                "acceptance_rate": problem.acceptance_rate,
                "unique_solvers": problem.solvers.count(),
                "bookmarks": problem.bookmarks.count(),
                "discussions": problem.discussions.count(),
                "by_status": list(by_status),
                "by_language": list(by_language),
            }
        )

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "publish":
            # Yakka `publish` bilan BIR XIL shartlar (namunaviy test, bo'sh
            # kutilgan chiqish, custom checker kodi) — bulk yo'li ilgari
            # yumshoqroq tekshirar va sifatsiz masala saytga chiqib ketardi.
            ready_ids = [
                problem.pk
                for problem in queryset.prefetch_related("test_cases")
                if not publish_blockers(
                    description_uz=problem.description_uz,
                    test_cases=list(problem.test_cases.all()),
                    checker_type=problem.checker_type,
                    checker_code=problem.checker_code,
                )
            ]
            now = timezone.now()
            # Allaqachon chop etilganlarning asl sanasi saqlanadi — aks holda
            # bulk amal barcha «chop etilgan» tarixini bugunga surib yuborardi.
            affected = Problem.objects.filter(pk__in=ready_ids, published_at__isnull=True).update(
                status=ProblemStatus.PUBLISHED, published_at=now
            )
            affected += Problem.objects.filter(pk__in=ready_ids, published_at__isnull=False).update(
                status=ProblemStatus.PUBLISHED
            )
            return {"affected": affected}
        if action_name == "unpublish":
            return {"affected": queryset.update(status=ProblemStatus.DRAFT, publish_at=None)}
        if action_name == "archive":
            return {"affected": queryset.update(status=ProblemStatus.ARCHIVED)}
        if action_name == "set_difficulty":
            difficulty = payload.get("difficulty")
            if difficulty not in dict(Difficulty.choices):
                from rest_framework.exceptions import ValidationError

                raise ValidationError({"difficulty": "Noto'g'ri qiymat."})
            points = {"easy": 10, "medium": 30, "hard": 50}[difficulty]
            return {"affected": queryset.update(difficulty=difficulty, points=points)}
        if action_name in {"add_tags", "remove_tags"}:
            tags = Tag.objects.filter(pk__in=payload.get("tag_ids") or [])
            count = 0
            for problem in queryset:
                if action_name == "add_tags":
                    problem.tags.add(*tags)
                else:
                    problem.tags.remove(*tags)
                count += 1
            return {"affected": count}
        return {"affected": 0}

    @action(detail=False, methods=["get"])
    def summary(self, request):
        # Jadval bilan bir xil manba: muallif chegarasi ham, faol filtrlar
        # ham hisob kartalariga birdek ta'sir qiladi.
        qs = self.filter_queryset(self.get_queryset())
        return Response(
            {
                "total": qs.count(),
                "published": qs.filter(status=ProblemStatus.PUBLISHED).count(),
                "draft": qs.filter(status=ProblemStatus.DRAFT).count(),
                "archived": qs.filter(status=ProblemStatus.ARCHIVED).count(),
                "by_difficulty": list(qs.values("difficulty").annotate(count=Count("id"))),
                "without_test_cases": qs.annotate(tc=Count("test_cases")).filter(tc=0).count(),
            }
        )


class AdminTestCaseViewSet(AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet):
    """`/api/admin/test-cases/` — alohida test-case boshqaruvi."""

    queryset = TestCase.objects.select_related("problem")
    serializer_class = TestCaseSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "testcases"
    filterset_fields = ["problem", "is_sample"]
    search_fields = ["input", "expected_output"]
    ordering_fields = ["order", "created_at"]
    ordering = ["problem", "order"]
    audit_label = "testcase"

    def get_queryset(self):
        # Setter faqat O'Z masalalarining testlarini ko'radi va o'zgartiradi.
        # Busiz u boshqa mualliflarning yashirin testlarini (va kutilgan
        # javoblarini) bemalol o'qiy olardi.
        return super().get_queryset().filter(problem__in=visible_problems(self.request.user))

    def _guard_problem(self, serializer):
        problem = serializer.validated_data.get("problem")
        if problem is not None and not visible_problems(self.request.user).filter(pk=problem.pk).exists():
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Bu masala sizniki emas.")

    def perform_create(self, serializer, **save_kwargs):
        self._guard_problem(serializer)
        return super().perform_create(serializer, **save_kwargs)

    def perform_update(self, serializer, **save_kwargs):
        self._guard_problem(serializer)
        return super().perform_update(serializer, **save_kwargs)


class AdminTagViewSet(AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "tags"
    search_fields = ["name_uz", "name_en", "slug"]
    ordering_fields = ["name_en", "created_at", "problem_count"]
    ordering = ["name_en"]
    pagination_class = None
    audit_label = "tag"

    def get_queryset(self):
        return super().get_queryset().annotate(problem_count=Count("problems", distinct=True))


class AdminDailyChallengeViewSet(AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet):
    """`/api/admin/daily-challenges/` — kunlik masala kalendari."""

    queryset = DailyChallenge.objects.select_related("problem")
    serializer_class = DailyChallengeSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "problems"
    perm_actions = {"calendar": "view", "auto_fill": "edit"}
    filterset_fields = ["problem"]
    search_fields = ["problem__title_uz", "problem__title_en"]
    ordering_fields = ["date", "created_at"]
    ordering = ["-date"]
    audit_label = "daily_challenge"

    @action(detail=False, methods=["get"])
    def calendar(self, request):
        """Oy bo'yicha kalendar ko'rinishi: `?year=2026&month=7`."""
        today = timezone.localdate()
        year = to_int(request.query_params.get("year"), today.year, low=2000, high=2100)
        month = to_int(request.query_params.get("month"), today.month, low=1, high=12)
        rows = self.get_queryset().filter(date__year=year, date__month=month).order_by("date")
        return Response(
            {
                "year": year,
                "month": month,
                "days": DailyChallengeSerializer(rows, many=True).data,
            }
        )

    @action(detail=False, methods=["post"], url_path="auto-fill")
    def auto_fill(self, request):
        """Bo'sh kunlarni tasodifiy chop etilgan masalalar bilan to'ldiradi."""
        import datetime
        import random

        start = request.data.get("start_date")
        days = to_int(request.data.get("days"), 7, low=1, high=90)
        difficulty = request.data.get("difficulty")

        try:
            start_date = (
                datetime.date.fromisoformat(start)
                if start
                else timezone.localdate() + datetime.timedelta(days=1)
            )
        except ValueError:
            return Response(
                {"detail": "start_date `YYYY-MM-DD` ko'rinishida bo'lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pool = Problem.objects.filter(status=ProblemStatus.PUBLISHED, is_contest_only=False)
        if difficulty:
            pool = pool.filter(difficulty=difficulty)
        used = (
            DailyChallenge.objects.filter(date__gte=start_date - datetime.timedelta(days=60))
            .values_list("problem_id", flat=True)
        )
        # Bazadan faqat ID lar: butun masala jadvalini xotiraga yuklamaymiz.
        candidate_ids = list(pool.exclude(id__in=used).values_list("id", flat=True))
        if not candidate_ids:
            return Response({"detail": "Mos masala topilmadi."}, status=status.HTTP_400_BAD_REQUEST)

        random.shuffle(candidate_ids)
        taken_dates = set(
            DailyChallenge.objects.filter(
                date__gte=start_date,
                date__lt=start_date + datetime.timedelta(days=days),
            ).values_list("date", flat=True)
        )
        created = []
        cursor = 0
        for offset in range(days):
            date = start_date + datetime.timedelta(days=offset)
            if date in taken_dates:
                continue
            if cursor >= len(candidate_ids):
                break
            challenge = DailyChallenge.objects.create(problem_id=candidate_ids[cursor], date=date)
            created.append(challenge)
            cursor += 1

        write_audit(request, action_name="daily_challenge.auto_fill",
                    target_type="DailyChallenge", target_repr=f"{len(created)} kun",
                    changes={"days": days, "difficulty": difficulty})
        return Response(
            {"detail": f"{len(created)} ta kun to'ldirildi.",
             "created": DailyChallengeSerializer(created, many=True).data},
            status=status.HTTP_201_CREATED,
        )
