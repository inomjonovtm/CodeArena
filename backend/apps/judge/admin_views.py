from __future__ import annotations

import django_filters as filters
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.exports import ExportMixin
from apps.core.mixins import BulkActionMixin, write_audit
from apps.core.permissions import HasResourcePerm, IsStaff
from apps.problems.models import Language

from .models import Submission, SubmissionStatus
from .serializers import (
    AdminSubmissionDetailSerializer,
    AdminSubmissionListSerializer,
    RejudgeSerializer,
)


class SubmissionFilter(filters.FilterSet):
    status = filters.MultipleChoiceFilter(choices=SubmissionStatus.choices)
    language = filters.MultipleChoiceFilter(choices=Language.choices)
    username = filters.CharFilter(field_name="user__username", lookup_expr="iexact")
    problem_slug = filters.CharFilter(field_name="problem__slug", lookup_expr="iexact")
    is_practice = filters.BooleanFilter()
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    runtime_min = filters.NumberFilter(field_name="runtime_ms", lookup_expr="gte")

    class Meta:
        model = Submission
        fields = ["status", "language", "problem", "contest", "user", "is_practice"]


class AdminSubmissionViewSet(
    ExportMixin,
    BulkActionMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """`/api/admin/submissions/` — submissionlarni ko'rish, rejudge qilish."""

    queryset = Submission.objects.all()
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "submissions"
    perm_actions = {
        "rejudge": "rejudge", "rejudge_many": "rejudge",
        "judge_health": "judge.view", "export": "view",
    }
    filterset_class = SubmissionFilter
    search_fields = ["user__username", "problem__title_uz", "problem__slug", "code"]
    ordering_fields = ["created_at", "runtime_ms", "memory_kb", "score", "code_length"]
    ordering = ["-created_at"]
    audit_label = "submission"
    bulk_allowed_actions = ("delete", "rejudge")
    export_filename = "codearena-submissionlar"
    export_columns = [
        ("created_at", "Vaqt"),
        ("user__username", "Foydalanuvchi"),
        ("problem__title_uz", "Masala"),
        ("problem__slug", "Slug"),
        ("language", "Til"),
        ("status", "Holat"),
        ("runtime_ms", "Vaqt (ms)"),
        ("memory_kb", "Xotira (KB)"),
        ("passed_tests", "Otgan testlar"),
        ("total_tests", "Jami testlar"),
        ("score", "Ball"),
        ("is_practice", "Amaliyot"),
        ("ip_address", "IP"),
    ]

    @action(detail=False, methods=["get"])
    def export(self, request):
        return self.export_csv(request)

    def get_queryset(self):
        qs = super().get_queryset().select_related("user", "problem", "contest")
        if self.action == "retrieve":
            qs = qs.prefetch_related("test_results")
        return qs

    def get_serializer_class(self):
        return AdminSubmissionDetailSerializer if self.action == "retrieve" else AdminSubmissionListSerializer

    @action(detail=True, methods=["post"])
    def rejudge(self, request, pk=None):
        from .tasks import rejudge_submissions

        submission = self.get_object()
        rejudge_submissions.delay([str(submission.id)])
        write_audit(request, action_name="submission.rejudge", obj=submission)
        return Response({"detail": "Qayta tekshirish navbatga qo'yildi.", "id": str(submission.id)})

    @action(detail=False, methods=["post"], url_path="rejudge")
    def rejudge_many(self, request):
        from .tasks import rejudge_submissions

        serializer = RejudgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        queryset = Submission.objects.all()
        if data.get("ids"):
            queryset = queryset.filter(id__in=data["ids"])
        if data.get("problem"):
            queryset = queryset.filter(problem_id=data["problem"])
        if data.get("contest"):
            queryset = queryset.filter(contest_id=data["contest"])
        if data.get("status"):
            queryset = queryset.filter(status=data["status"])

        ids = [str(pk) for pk in queryset.values_list("id", flat=True)[:5000]]
        if not ids:
            return Response({"detail": "Mos submission topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        rejudge_submissions.delay(ids)
        write_audit(request, action_name="submission.rejudge_bulk",
                    target_type="Submission", target_repr=f"{len(ids)} ta",
                    changes=dict(data))
        return Response({"detail": f"{len(ids)} ta submission navbatga qo'yildi.", "count": len(ids)})

    @action(detail=False, methods=["get"], url_path="judge-health")
    def judge_health(self, request):
        from . import engine

        payload = engine.health()
        payload["queued"] = Submission.objects.filter(
            status__in=[SubmissionStatus.PENDING, SubmissionStatus.JUDGING]
        ).count()
        payload["checked_at"] = timezone.now()
        return Response(payload)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = Submission.objects.all()
        today = timezone.localdate()
        return Response(
            {
                "total": qs.count(),
                "today": qs.filter(created_at__date=today).count(),
                "pending": qs.filter(status__in=[SubmissionStatus.PENDING, SubmissionStatus.JUDGING]).count(),
                "accepted": qs.filter(status=SubmissionStatus.ACCEPTED).count(),
                "by_status": list(qs.values("status").annotate(count=Count("id")).order_by("-count")),
                "by_language": list(qs.values("language").annotate(count=Count("id")).order_by("-count")),
                "avg_runtime_ms": qs.filter(status=SubmissionStatus.ACCEPTED).aggregate(
                    v=Avg("runtime_ms")
                )["v"],
            }
        )

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "rejudge":
            from .tasks import rejudge_submissions

            ids = [str(pk) for pk in queryset.values_list("id", flat=True)]
            rejudge_submissions.delay(ids)
            return {"affected": len(ids)}
        return {"affected": 0}
