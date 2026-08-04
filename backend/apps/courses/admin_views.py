"""Kurslarni boshqarish — `/api/admin/...`.

Muharrir bitta sahifada ishlaydi: chapda kurs daraxti, o'ngda tanlangan
mavzu. Shuning uchun ikkita maxsus endpoint bor —
`courses/<id>/tree/` (butun daraxt bitta so'rovda) va har bir resursdagi
`reorder/` (tartibni sudrab o'zgartirish).
"""
from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Prefetch
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.mixins import AuditLogMixin, BulkActionMixin, write_audit
from apps.core.permissions import HasResourcePerm, IsStaff
from apps.core.trash import SoftDeleteViewSetMixin

from .admin_serializers import (
    AdminCourseSerializer,
    AdminExampleSerializer,
    AdminExerciseSerializer,
    AdminLessonDetailSerializer,
    AdminLessonSerializer,
    AdminModuleSerializer,
    AdminQuizQuestionSerializer,
    CourseTreeModuleSerializer,
)
from .models import (
    Course,
    Example,
    Exercise,
    Lesson,
    Module,
    PublishStatus,
    QuizQuestion,
)


class ReorderMixin:
    """`POST /reorder/` — `{"ids": [...]}` tartibida `order` ni qayta yozadi."""

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        ids = request.data.get("ids") or []
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "`ids` bo'sh."}, status=status.HTTP_400_BAD_REQUEST)

        model = self.queryset.model
        rows = {str(row.pk): row for row in model.objects.filter(pk__in=ids)}
        updated = []
        for index, pk in enumerate(ids):
            row = rows.get(str(pk))
            if row is None:
                continue
            row.order = index
            updated.append(row)
        model.objects.bulk_update(updated, ["order"])

        write_audit(
            request,
            action_name=f"{getattr(self, 'audit_label', model.__name__.lower())}.reorder",
            target_type=model.__name__,
            target_repr=f"{len(updated)} ta",
            changes={"ids": [str(i) for i in ids]},
        )
        return Response({"detail": "Tartib yangilandi.", "affected": len(updated)})


class AdminCourseViewSet(
    SoftDeleteViewSetMixin, AuditLogMixin, BulkActionMixin, ReorderMixin, viewsets.ModelViewSet
):
    """`/api/admin/courses/`"""

    queryset = Course.objects.all()
    serializer_class = AdminCourseSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "courses"
    perm_actions = {"publish": "publish", "tree": "view", "summary": "view", "reorder": "edit"}
    filterset_fields = ["status", "language", "level", "is_featured"]
    search_fields = ["title_uz", "subtitle_uz", "slug", "description_uz"]
    ordering_fields = ["created_at", "order", "title_uz", "status"]
    ordering = ["order", "title_uz"]
    audit_label = "course"
    bulk_allowed_actions = ("delete", "publish", "unpublish", "archive", "feature", "unfeature")

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related("author")
            .annotate(
                module_count=Count("modules", distinct=True),
                lesson_count=Count("lessons", distinct=True),
                exercise_count=Count("lessons__exercises", distinct=True),
                enrollment_count=Count("enrollments", distinct=True),
            )
        )

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        write_audit(self.request, action_name="course.create", obj=instance)
        return instance

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Chop etish / qoralamaga qaytarish — bitta tugma."""
        course = self.get_object()
        publish = request.data.get("publish", True)
        course.status = PublishStatus.PUBLISHED if publish else PublishStatus.DRAFT
        if publish and course.published_at is None:
            course.published_at = timezone.now()
        course.save(update_fields=["status", "published_at", "updated_at"])
        write_audit(request, action_name="course.publish", obj=course, changes={"publish": bool(publish)})
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["get"])
    def tree(self, request, pk=None):
        """Kursning butun tuzilmasi — muharrirning chap ustuni uchun."""
        course = self.get_object()
        modules = (
            Module.objects.filter(course=course)
            .order_by("order", "created_at")
            .prefetch_related(
                Prefetch(
                    "lessons",
                    queryset=Lesson.objects.annotate(
                        example_count=Count("examples", distinct=True),
                        quiz_count=Count("quiz_questions", distinct=True),
                        exercise_count=Count("exercises", distinct=True),
                    ).order_by("order", "created_at"),
                )
            )
        )
        return Response(
            {
                "course": self.get_serializer(course).data,
                "modules": CourseTreeModuleSerializer(modules, many=True).data,
            }
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = Course.objects.all()
        return Response(
            {
                "total": queryset.count(),
                "published": queryset.filter(status=PublishStatus.PUBLISHED).count(),
                "draft": queryset.filter(status=PublishStatus.DRAFT).count(),
                "lessons": Lesson.objects.count(),
                "exercises": Exercise.objects.count(),
                "by_language": list(
                    queryset.values("language").annotate(count=Count("id")).order_by("-count")
                ),
            }
        )

    def handle_bulk_action(self, request, action_name, queryset, payload):
        mapping = {
            "publish": {"status": PublishStatus.PUBLISHED},
            "unpublish": {"status": PublishStatus.DRAFT},
            "archive": {"status": PublishStatus.ARCHIVED},
            "feature": {"is_featured": True},
            "unfeature": {"is_featured": False},
        }
        if action_name in mapping:
            return {"affected": queryset.update(**mapping[action_name])}
        return {"affected": 0}


class AdminModuleViewSet(AuditLogMixin, ReorderMixin, viewsets.ModelViewSet):
    """`/api/admin/course-modules/`"""

    queryset = Module.objects.all()
    serializer_class = AdminModuleSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "courses"
    perm_actions = {"reorder": "edit"}
    filterset_fields = ["course"]
    search_fields = ["title_uz", "slug"]
    ordering_fields = ["order", "created_at"]
    ordering = ["order", "created_at"]
    audit_label = "course_module"
    pagination_class = None

    def get_queryset(self):
        return super().get_queryset().annotate(lesson_count=Count("lessons", distinct=True))


class AdminLessonViewSet(AuditLogMixin, BulkActionMixin, ReorderMixin, viewsets.ModelViewSet):
    """`/api/admin/course-lessons/`"""

    queryset = Lesson.objects.all()
    serializer_class = AdminLessonSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "courses"
    perm_actions = {"reorder": "edit"}
    filterset_fields = ["course", "module", "status"]
    search_fields = ["title_uz", "slug", "content_md"]
    ordering_fields = ["order", "created_at", "title_uz"]
    ordering = ["order", "created_at"]
    audit_label = "course_lesson"
    bulk_allowed_actions = ("delete", "publish", "unpublish")

    def get_queryset(self):
        queryset = (
            super()
            .get_queryset()
            .select_related("course", "module")
            .annotate(
                example_count=Count("examples", distinct=True),
                quiz_count=Count("quiz_questions", distinct=True),
                exercise_count=Count("exercises", distinct=True),
            )
        )
        if self.action == "retrieve":
            queryset = queryset.prefetch_related(
                "examples", "quiz_questions", "exercises__tests"
            )
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return AdminLessonDetailSerializer
        return AdminLessonSerializer

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "publish":
            return {"affected": queryset.update(status=PublishStatus.PUBLISHED)}
        if action_name == "unpublish":
            return {"affected": queryset.update(status=PublishStatus.DRAFT)}
        return {"affected": 0}

    @action(detail=True, methods=["post"], url_path="duplicate")
    @transaction.atomic
    def duplicate(self, request, pk=None):
        """Mavzuni butun ichki kontenti bilan nusxalaydi.

        O'xshash mavzularni (masalan «For sikli» → «While sikli») noldan
        emas, tayyor skeletdan yozish tezroq.
        """
        source = self.get_object()
        copy = Lesson.objects.create(
            module=source.module,
            title_uz=f"{source.title_uz} (nusxa)",
            slug=f"{source.slug}-nusxa"[:160],
            summary_uz=source.summary_uz,
            content_md=source.content_md,
            order=source.order + 1,
            status=PublishStatus.DRAFT,
            points=source.points,
            estimated_minutes=source.estimated_minutes,
        )
        for example in source.examples.all():
            Example.objects.create(
                lesson=copy, title_uz=example.title_uz, language=example.language,
                code=example.code, expected_output=example.expected_output,
                explanation_uz=example.explanation_uz, is_runnable=example.is_runnable,
                order=example.order,
            )
        for question in source.quiz_questions.all():
            QuizQuestion.objects.create(
                lesson=copy, question_uz=question.question_uz, options=question.options,
                correct_index=question.correct_index, explanation_uz=question.explanation_uz,
                order=question.order,
            )
        for exercise in source.exercises.all():
            new_exercise = Exercise.objects.create(
                lesson=copy, title_uz=exercise.title_uz, prompt_md=exercise.prompt_md,
                language=exercise.language, starter_code=exercise.starter_code,
                solution_code=exercise.solution_code, hint_uz=exercise.hint_uz,
                points=exercise.points, order=exercise.order,
                time_limit_ms=exercise.time_limit_ms, memory_limit_kb=exercise.memory_limit_kb,
            )
            for test in exercise.tests.all():
                test.pk = None
                test.exercise = new_exercise
                test.save()

        write_audit(request, action_name="course_lesson.duplicate", obj=copy)
        return Response(AdminLessonDetailSerializer(copy).data, status=status.HTTP_201_CREATED)


class AdminExampleViewSet(AuditLogMixin, ReorderMixin, viewsets.ModelViewSet):
    """`/api/admin/course-examples/`"""

    queryset = Example.objects.all()
    serializer_class = AdminExampleSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "courses"
    perm_actions = {"reorder": "edit"}
    filterset_fields = ["lesson", "language"]
    ordering = ["order", "created_at"]
    audit_label = "course_example"
    pagination_class = None


class AdminQuizQuestionViewSet(AuditLogMixin, ReorderMixin, viewsets.ModelViewSet):
    """`/api/admin/course-quiz/`"""

    queryset = QuizQuestion.objects.all()
    serializer_class = AdminQuizQuestionSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "courses"
    perm_actions = {"reorder": "edit"}
    filterset_fields = ["lesson"]
    ordering = ["order", "created_at"]
    audit_label = "course_quiz"
    pagination_class = None


class AdminExerciseViewSet(AuditLogMixin, ReorderMixin, viewsets.ModelViewSet):
    """`/api/admin/course-exercises/`"""

    queryset = Exercise.objects.all()
    serializer_class = AdminExerciseSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "courses"
    perm_actions = {"reorder": "edit"}
    filterset_fields = ["lesson", "language"]
    search_fields = ["title_uz", "prompt_md"]
    ordering = ["order", "created_at"]
    audit_label = "course_exercise"
    pagination_class = None

    def get_queryset(self):
        return super().get_queryset().prefetch_related("tests")
