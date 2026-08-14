"""Test savollari va sinovlari — panel API (`/api/admin/...`).

Studio ham, admin panel ham shu endpointlardan foydalanadi: farq huquq
kodlarida, marshrutda emas.
"""
from __future__ import annotations

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

from .models import (
    Question,
    QuestionFolder,
    Quiz,
    QuizAttempt,
    QuizItem,
)
from .serializers import (
    QuestionFolderSerializer,
    QuestionSerializer,
    QuizAttemptSerializer,
    QuizDetailSerializer,
    QuizItemSerializer,
    QuizListSerializer,
)


class AdminQuestionFolderViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """`/api/admin/question-folders/` — savollar daraxti."""

    queryset = QuestionFolder.objects.select_related("owner", "parent")
    serializer_class = QuestionFolderSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "assessments"
    perm_actions = {"tree": "view"}
    filterset_fields = ["parent", "is_shared"]
    search_fields = ["name"]
    ordering = ["order", "name"]
    pagination_class = None
    audit_label = "question_folder"

    def get_queryset(self):
        queryset = super().get_queryset().annotate(
            question_count=Count("questions", distinct=True)
        )
        user = self.request.user
        # Muallif o'z papkalarini va ochiq ulashilganlarni ko'radi.
        if getattr(user, "role", "") == "setter":
            return queryset.filter(Q(owner=user) | Q(is_shared=True))
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user)
        write_audit(self.request, action_name="question_folder.create", obj=instance)

    @action(detail=False, methods=["get"])
    def tree(self, request):
        """Butun daraxt bitta so'rovda — chapdagi papka paneli uchun."""
        rows = list(self.filter_queryset(self.get_queryset()))
        by_parent: dict[str, list] = {}
        for row in rows:
            by_parent.setdefault(str(row.parent_id or ""), []).append(row)

        def build(parent_key: str, depth: int) -> list:
            # Chuqurlik cheklangan: buzilgan ma'lumot rekursiyani cheksiz
            # qilib qo'ymasin.
            if depth > 10:
                return []
            return [
                {
                    **QuestionFolderSerializer(node).data,
                    "children": build(str(node.pk), depth + 1),
                }
                for node in by_parent.get(parent_key, [])
            ]

        return Response({"folders": build("", 0), "total": len(rows)})


class QuestionFilter(filters.FilterSet):
    kind = filters.MultipleChoiceFilter(choices=Question._meta.get_field("kind").choices)
    difficulty = filters.MultipleChoiceFilter(
        choices=Question._meta.get_field("difficulty").choices
    )
    folder = filters.UUIDFilter(field_name="folder__id")
    # Papkani tanlaganda ichidagi papkalar savollari ham ko'rinsin.
    folder_tree = filters.UUIDFilter(method="filter_folder_tree")
    tag = filters.CharFilter(field_name="tags__slug", lookup_expr="iexact")
    unused = filters.BooleanFilter(method="filter_unused")

    class Meta:
        model = Question
        fields = ["kind", "difficulty", "folder"]

    def filter_folder_tree(self, queryset, name, value):
        ids, frontier, guard = {value}, [value], 0
        while frontier and guard < 10:
            children = list(
                QuestionFolder.objects.filter(parent_id__in=frontier).values_list("id", flat=True)
            )
            frontier = [c for c in children if c not in ids]
            ids.update(frontier)
            guard += 1
        return queryset.filter(folder_id__in=ids)

    def filter_unused(self, queryset, name, value):
        """Hech qaysi sinovga qo'shilmagan savollar — bank tozalash uchun."""
        queryset = queryset.annotate(_used=Count("quiz_items"))
        return queryset.filter(_used=0) if value else queryset.filter(_used__gt=0)


class AdminQuestionViewSet(
    OwnScopedMixin, SoftDeleteViewSetMixin, ExportMixin, AuditLogMixin, BulkActionMixin,
    viewsets.ModelViewSet,
):
    """`/api/admin/questions/` — savollar bankasi."""

    queryset = Question.objects.select_related("folder", "author").prefetch_related("tags")
    serializer_class = QuestionSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "assessments"
    perm_actions = {"summary": "view", "export": "view", "duplicate": "edit"}
    filterset_class = QuestionFilter
    search_fields = ["body_md", "explanation_md"]
    ordering_fields = ["created_at", "difficulty", "points", "times_answered"]
    ordering = ["-created_at"]
    audit_label = "question"
    bulk_allowed_actions = ("delete", "move", "set_difficulty", "add_tags")
    export_filename = "codearena-savollar"
    export_columns = [
        ("body_md", "Savol"),
        ("kind", "Turi"),
        ("difficulty", "Qiyinlik"),
        ("points", "Ball"),
        ("folder__name", "Papka"),
        ("author__username", "Muallif"),
        ("times_answered", "Javob berilgan"),
        ("times_correct", "To'g'ri"),
    ]

    @action(detail=False, methods=["get"])
    def export(self, request):
        return self.export_csv(request)

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        write_audit(self.request, action_name="question.create", obj=instance)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        source = self.get_object()
        tags = list(source.tags.all())
        source.pk = None
        source.id = None
        source.times_answered = 0
        source.times_correct = 0
        source.author = request.user
        source.save()
        source.tags.set(tags)
        return Response(self.get_serializer(source).data, status=status.HTTP_201_CREATED)

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "move":
            folder = QuestionFolder.objects.filter(pk=payload.get("folder")).first()
            return {"affected": queryset.update(folder=folder)}
        if action_name == "set_difficulty":
            value = payload.get("difficulty")
            if value not in dict(Question._meta.get_field("difficulty").choices):
                from rest_framework.exceptions import ValidationError

                raise ValidationError({"difficulty": "Noto'g'ri qiymat."})
            return {"affected": queryset.update(difficulty=value)}
        if action_name == "add_tags":
            from apps.problems.models import Tag

            tags = Tag.objects.filter(pk__in=payload.get("tag_ids") or [])
            count = 0
            for question in queryset:
                question.tags.add(*tags)
                count += 1
            return {"affected": count}
        return {"affected": 0}

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return Response({
            "total": qs.count(),
            "by_kind": list(qs.values("kind").annotate(count=Count("id"))),
            "by_difficulty": list(qs.values("difficulty").annotate(count=Count("id"))),
            "unused": qs.annotate(_used=Count("quiz_items")).filter(_used=0).count(),
        })


class AdminQuizViewSet(
    OwnScopedMixin, SoftDeleteViewSetMixin, AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet
):
    """`/api/admin/quizzes/` — test sinovlari."""

    queryset = Quiz.objects.select_related("author")
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "assessments"
    perm_actions = {
        "publish": "publish", "close": "publish", "items": "edit",
        "remove_item": "edit", "reorder_items": "edit", "add_questions": "edit",
        "attempts": "results", "results": "results", "summary": "view",
    }
    filterset_fields = ["status"]
    search_fields = ["title_uz", "slug", "description_md"]
    ordering_fields = ["created_at", "starts_at", "title_uz"]
    ordering = ["-created_at"]
    audit_label = "quiz"
    bulk_allowed_actions = ("delete", "publish", "close")
    bulk_perm_actions = {"publish": "publish", "close": "publish"}

    def get_queryset(self):
        return super().get_queryset().annotate(
            question_count=Count("items", distinct=True),
            attempt_count=Count("attempts", distinct=True),
        )

    def get_serializer_class(self):
        return QuizListSerializer if self.action == "list" else QuizDetailSerializer

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        write_audit(self.request, action_name="quiz.create", obj=instance)

    # ------------------------------------------------------------- savollar
    @action(detail=True, methods=["get", "post"])
    def items(self, request, pk=None):
        quiz = self.get_object()
        if request.method == "GET":
            rows = quiz.items.select_related("question").order_by("order")
            return Response(QuizItemSerializer(rows, many=True).data)

        serializer = QuizItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(quiz=quiz)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-questions")
    def add_questions(self, request, pk=None):
        """Bankdan bir nechta savolni bir yo'la qo'shadi."""
        quiz = self.get_object()
        ids = request.data.get("questions") or []
        existing = set(quiz.items.values_list("question_id", flat=True))
        start = (quiz.items.order_by("-order").values_list("order", flat=True).first() or 0) + 1

        rows = []
        for offset, question in enumerate(
            Question.objects.filter(pk__in=ids).exclude(pk__in=existing)
        ):
            rows.append(QuizItem(
                quiz=quiz, question=question, order=start + offset, points=question.points
            ))
        QuizItem.objects.bulk_create(rows)
        write_audit(request, action_name="quiz.add_questions", obj=quiz,
                    changes={"added": len(rows)})
        return Response({"added": len(rows), "skipped": len(ids) - len(rows)},
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"items/(?P<item_id>[^/.]+)")
    def remove_item(self, request, pk=None, item_id=None):
        quiz = self.get_object()
        deleted, _ = QuizItem.objects.filter(pk=item_id, quiz=quiz).delete()
        if not deleted:
            return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="items/reorder")
    def reorder_items(self, request, pk=None):
        quiz = self.get_object()
        ids = request.data.get("ids") or []
        rows = {str(item.pk): item for item in quiz.items.all()}
        updated = []
        for index, item_id in enumerate(ids, start=1):
            item = rows.get(str(item_id))
            if item and item.order != index:
                item.order = index
                updated.append(item)
        QuizItem.objects.bulk_update(updated, ["order"])
        return Response({"affected": len(updated)})

    # --------------------------------------------------------------- holat
    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        quiz = self.get_object()
        if not quiz.items.exists():
            return Response({"detail": "Sinovda birorta savol yo'q."},
                            status=status.HTTP_400_BAD_REQUEST)
        quiz.status = Quiz.Status.PUBLISHED
        quiz.published_at = quiz.published_at or timezone.now()
        quiz.save(update_fields=["status", "published_at", "updated_at"])
        write_audit(request, action_name="quiz.publish", obj=quiz)
        return Response(QuizDetailSerializer(quiz).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        quiz = self.get_object()
        quiz.status = Quiz.Status.CLOSED
        quiz.save(update_fields=["status", "updated_at"])
        write_audit(request, action_name="quiz.close", obj=quiz)
        return Response(QuizDetailSerializer(quiz).data)

    # ------------------------------------------------------------ natijalar
    @action(detail=True, methods=["get"])
    def attempts(self, request, pk=None):
        quiz = self.get_object()
        rows = quiz.attempts.select_related("user").order_by("-score", "submitted_at")
        page = self.paginate_queryset(rows)
        serializer = QuizAttemptSerializer(page if page is not None else rows, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def results(self, request, pk=None):
        """Sinov bo'yicha yig'ma tahlil + har bir savolning qiyinligi.

        Eng foydali ustun — savol darajasidagi to'g'ri javob ulushi: 0% yoki
        100% bo'lgan savol sinovda hech narsani o'lchamaydi.
        """
        quiz = self.get_object()
        attempts = list(quiz.attempts.all())
        finished = [a for a in attempts if a.submitted_at]
        scores = [a.percent for a in finished]

        per_question = []
        for item in quiz.items.select_related("question").order_by("order"):
            answered = correct = 0
            for attempt in finished:
                given = (attempt.answers or {}).get(str(item.question_id))
                if given is None:
                    continue
                answered += 1
                if item.question.check_answer(given):
                    correct += 1
            per_question.append({
                "item": str(item.pk),
                "question": str(item.question_id),
                "order": item.order,
                "body": (item.question.body_md or "")[:160],
                "kind": item.question.kind,
                "answered": answered,
                "correct": correct,
                "correct_rate": round(correct / answered * 100, 1) if answered else 0.0,
            })

        return Response({
            "attempts": len(attempts),
            "finished": len(finished),
            "passed": sum(1 for a in finished if a.is_passed),
            "average_percent": round(sum(scores) / len(scores), 1) if scores else 0.0,
            "best_percent": max(scores) if scores else 0.0,
            "worst_percent": min(scores) if scores else 0.0,
            "questions": per_question,
        })

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "publish":
            return {"affected": queryset.update(
                status=Quiz.Status.PUBLISHED, published_at=timezone.now()
            )}
        if action_name == "close":
            return {"affected": queryset.update(status=Quiz.Status.CLOSED)}
        return {"affected": 0}

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return Response({
            "total": qs.count(),
            "draft": qs.filter(status=Quiz.Status.DRAFT).count(),
            "published": qs.filter(status=Quiz.Status.PUBLISHED).count(),
            "closed": qs.filter(status=Quiz.Status.CLOSED).count(),
            "attempts": QuizAttempt.objects.filter(quiz__in=qs).count(),
        })


class AdminQuizAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """`/api/admin/quiz-attempts/` — barcha urinishlar."""

    queryset = QuizAttempt.objects.select_related("quiz", "user")
    serializer_class = QuizAttemptSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "assessments"
    perm_actions = {"list": "results", "retrieve": "results"}
    filterset_fields = ["quiz", "is_passed"]
    search_fields = ["user__username", "user__full_name"]
    ordering_fields = ["created_at", "score", "submitted_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self.request.user, "role", "") == "setter":
            return queryset.filter(quiz__author=self.request.user)
        return queryset
