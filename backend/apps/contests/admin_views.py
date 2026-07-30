from __future__ import annotations

import django_filters as filters
from django.db.models import Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.exports import ExportMixin
from apps.core.mixins import AuditLogMixin, BulkActionMixin, write_audit
from apps.core.trash import SoftDeleteViewSetMixin
from apps.core import ranks
from apps.core.permissions import HasResourcePerm, IsStaff

from .models import Contest, ContestParticipant, ContestProblem, ContestStatus
from .serializers import (
    ContestDetailSerializer,
    ContestListSerializer,
    ContestParticipantSerializer,
    ContestProblemSerializer,
    DisqualifySerializer,
)


class ContestFilter(filters.FilterSet):
    status = filters.MultipleChoiceFilter(choices=ContestStatus.choices)
    is_rated = filters.BooleanFilter()
    starts_after = filters.DateTimeFilter(field_name="start_time", lookup_expr="gte")
    starts_before = filters.DateTimeFilter(field_name="start_time", lookup_expr="lte")

    class Meta:
        model = Contest
        fields = ["status", "visibility", "is_rated", "is_virtual_allowed"]


class AdminContestViewSet(
    SoftDeleteViewSetMixin, ExportMixin, AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet
):
    """`/api/admin/contests/` — musobaqalarni boshqarish (11-bo'lim)."""

    queryset = Contest.objects.all()
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "contests"
    perm_actions = {
        "problems": "edit", "remove_problem": "edit",
        "participants": "view", "leaderboard": "view", "monitor": "view",
        "disqualify": "edit", "restore_participant": "edit",
        "recalculate": "ratings", "apply_ratings": "ratings",
        "scan_plagiarism": "moderation.review",
    }
    filterset_class = ContestFilter
    search_fields = ["title_uz", "title_en", "slug"]
    ordering_fields = ["start_time", "end_time", "created_at", "title_uz"]
    ordering = ["-start_time"]
    audit_label = "contest"
    bulk_allowed_actions = ("delete", "cancel", "schedule", "finish")
    export_filename = "codearena-contestlar"
    export_columns = [
        ("slug", "Slug"),
        ("title_uz", "Sarlavha"),
        ("start_time", "Boshlanish"),
        ("end_time", "Tugash"),
        ("duration_minutes", "Davomiylik"),
        ("status", "Holat"),
        ("visibility", "Korinish"),
        ("is_rated", "Reytingli"),
        ("created_by__username", "Muallif"),
    ]

    @action(detail=False, methods=["get"])
    def export(self, request):
        return self.export_csv(request)

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related("created_by")
            .annotate(
                problem_count=Count("contest_problems", distinct=True),
                participant_count=Count("participants", distinct=True),
            )
        )

    def get_serializer_class(self):
        return ContestListSerializer if self.action == "list" else ContestDetailSerializer

    # ------------------------------------------------------------- problems
    @action(detail=True, methods=["get", "post"], url_path="problems")
    def problems(self, request, pk=None):
        contest = self.get_object()
        if request.method == "GET":
            rows = contest.contest_problems.select_related("problem").order_by("order")
            return Response(ContestProblemSerializer(rows, many=True).data)

        serializer = ContestProblemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(contest=contest)
        write_audit(request, action_name="contest.add_problem", obj=contest, changes=serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"problems/(?P<cp_id>[^/.]+)")
    def remove_problem(self, request, pk=None, cp_id=None):
        contest = self.get_object()
        deleted, _ = ContestProblem.objects.filter(pk=cp_id, contest=contest).delete()
        if not deleted:
            return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        write_audit(request, action_name="contest.remove_problem", obj=contest,
                    changes={"contest_problem": cp_id})
        return Response(status=status.HTTP_204_NO_CONTENT)

    # -------------------------------------------------------- participants
    @action(detail=True, methods=["get"])
    def participants(self, request, pk=None):
        contest = self.get_object()
        rows = contest.participants.select_related("user").order_by("rank", "-score")
        page = self.paginate_queryset(rows)
        serializer = ContestParticipantSerializer(page if page is not None else rows, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    @action(detail=True, methods=["get"])
    def leaderboard(self, request, pk=None):
        contest = self.get_object()
        rows = (
            contest.participants.filter(is_disqualified=False)
            .select_related("user")
            .order_by("rank", "-score", "penalty")[:500]
        )
        return Response(
            {
                "contest": ContestListSerializer(contest).data,
                "rows": ContestParticipantSerializer(rows, many=True).data,
                "generated_at": timezone.now(),
            }
        )

    @action(detail=True, methods=["get"])
    def monitor(self, request, pk=None):
        """Jonli nazorat: kim qaysi masalada qayerda turibdi.

        Musobaqa davomida administratorga bitta so'rovda to'liq manzara
        beradi — har bir ishtirokchi × har bir masala kesimida urinishlar
        soni, holati va oxirgi yuborilgan vaqt.
        """
        from apps.judge.models import Submission, SubmissionStatus

        contest = self.get_object()
        entries = list(contest.contest_problems.select_related("problem").order_by("order"))
        problem_ids = [entry.problem_id for entry in entries]

        participants = list(
            contest.participants.select_related("user").order_by("rank", "-score", "penalty")
        )

        # Bitta so'rovda barcha submissionlarni olib, xotirada guruhlaymiz —
        # ishtirokchi × masala bo'yicha alohida so'rov yuborish sekin bo'lardi.
        cells: dict[tuple, dict] = {}
        submissions = (
            Submission.objects.filter(contest=contest, problem_id__in=problem_ids)
            .values("user_id", "problem_id", "status", "created_at")
            .order_by("created_at")
        )
        for row in submissions:
            key = (row["user_id"], row["problem_id"])
            cell = cells.setdefault(
                key, {"attempts": 0, "solved": False, "last_at": None, "first_solved_at": None}
            )
            cell["attempts"] += 1
            cell["last_at"] = row["created_at"]
            if row["status"] == SubmissionStatus.ACCEPTED and not cell["solved"]:
                cell["solved"] = True
                cell["first_solved_at"] = row["created_at"]

        now = timezone.now()
        recent = (
            Submission.objects.filter(contest=contest)
            .select_related("user", "problem")
            .order_by("-created_at")[:40]
        )

        return Response(
            {
                "contest": ContestListSerializer(contest).data,
                "state": contest.computed_status,
                "server_time": now,
                "problems": [
                    {
                        "id": str(entry.problem_id),
                        "label": entry.label or chr(65 + entry.order),
                        "title_uz": entry.problem.title_uz,
                        "slug": entry.problem.slug,
                        "points": entry.points,
                        "solved_count": sum(
                            1
                            for participant in participants
                            if cells.get((participant.user_id, entry.problem_id), {}).get("solved")
                        ),
                    }
                    for entry in entries
                ],
                "rows": [
                    {
                        "participant_id": str(participant.id),
                        "username": participant.user.username,
                        "full_name": participant.user.full_name,
                        "avatar_url": participant.user.avatar_url,
                    "user_rank": ranks.rank_info(participant.user.rating),
                        "rank": participant.rank,
                        "score": participant.score,
                        "penalty": participant.penalty,
                        "solved_count": participant.solved_count,
                        "rating_change": participant.rating_change,
                        "rating_before": participant.rating_before,
                        "rating_after": participant.rating_after,
                        "is_disqualified": participant.is_disqualified,
                        "disqualify_reason": participant.disqualify_reason,
                        "is_virtual": participant.is_virtual,
                        "started_at": participant.started_at,
                        "cells": [
                            cells.get(
                                (participant.user_id, entry.problem_id),
                                {"attempts": 0, "solved": False, "last_at": None,
                                 "first_solved_at": None},
                            )
                            for entry in entries
                        ],
                    }
                    for participant in participants
                ],
                "recent_submissions": [
                    {
                        "id": str(row.id),
                        "username": row.user.username,
                        "problem_title": row.problem.title_uz,
                        "problem_slug": row.problem.slug,
                        "language": row.language,
                        "status": row.status,
                        "created_at": row.created_at,
                    }
                    for row in recent
                ],
            }
        )

    @action(
        detail=True,
        methods=["get"],
        url_path=r"monitor/(?P<username>[^/.]+)/(?P<problem_id>[^/.]+)",
    )
    def monitor_submissions(self, request, pk=None, username=None, problem_id=None):
        """Jonli nazoratdagi bitta katak ortidagi yechimlar — kod bilan.

        Administrator ishtirokchi aynan nima yuborganini ko'rishi kerak:
        plagiat shubhasi yoki chetlatish qarori shu asosda qabul qilinadi.
        """
        from apps.judge.models import Submission

        contest = self.get_object()
        rows = (
            Submission.objects.filter(
                contest=contest, user__username__iexact=username, problem_id=problem_id
            )
            .select_related("user", "problem")
            .order_by("-created_at")[:20]
        )
        return Response(
            {
                "username": username,
                "results": [
                    {
                        "id": str(row.id),
                        "language": row.language,
                        "status": row.status,
                        "code": row.code,
                        "passed_tests": row.passed_tests,
                        "total_tests": row.total_tests,
                        "failed_test_index": row.failed_test_index,
                        "runtime_ms": row.runtime_ms,
                        "memory_kb": row.memory_kb,
                        "error_message": row.error_message,
                        "compile_output": row.compile_output,
                        "ip_address": row.ip_address,
                        "created_at": row.created_at,
                    }
                    for row in rows
                ],
            }
        )

    @action(detail=True, methods=["post"], url_path=r"participants/(?P<participant_id>[^/.]+)/disqualify")
    def disqualify(self, request, pk=None, participant_id=None):
        contest = self.get_object()
        participant = ContestParticipant.objects.filter(pk=participant_id, contest=contest).first()
        if not participant:
            return Response({"detail": "Ishtirokchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DisqualifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participant.is_disqualified = True
        participant.disqualify_reason = serializer.validated_data["reason"]
        participant.save(update_fields=["is_disqualified", "disqualify_reason"])
        write_audit(request, action_name="contest.disqualify", obj=contest,
                    changes={"user": participant.user.username, **serializer.validated_data})
        return Response(ContestParticipantSerializer(participant).data)

    @action(detail=True, methods=["post"], url_path=r"participants/(?P<participant_id>[^/.]+)/restore")
    def restore_participant(self, request, pk=None, participant_id=None):
        contest = self.get_object()
        participant = ContestParticipant.objects.filter(pk=participant_id, contest=contest).first()
        if not participant:
            return Response({"detail": "Ishtirokchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        participant.is_disqualified = False
        participant.disqualify_reason = ""
        participant.save(update_fields=["is_disqualified", "disqualify_reason"])
        return Response(ContestParticipantSerializer(participant).data)

    # ------------------------------------------------------------- amallar
    @action(detail=True, methods=["post"], url_path="recalculate")
    def recalculate(self, request, pk=None):
        from .tasks import recalculate_standings

        contest = self.get_object()
        recalculate_standings.delay(str(contest.id))
        write_audit(request, action_name="contest.recalculate", obj=contest)
        return Response({"detail": "Natijalar qayta hisoblanmoqda."})

    @action(detail=True, methods=["post"], url_path="apply-ratings")
    def apply_ratings(self, request, pk=None):
        from .tasks import apply_contest_ratings

        contest = self.get_object()
        if contest.computed_status != ContestStatus.FINISHED:
            return Response({"detail": "Contest hali tugamagan."}, status=status.HTTP_400_BAD_REQUEST)
        if contest.ratings_applied_at:
            return Response({"detail": "Reyting allaqachon qo'llangan."}, status=status.HTTP_400_BAD_REQUEST)
        result = apply_contest_ratings.delay(str(contest.id))
        write_audit(request, action_name="contest.apply_ratings", obj=contest)
        return Response({"detail": "Reyting hisoblanmoqda.", "task": str(result)})

    @action(detail=True, methods=["post"], url_path="scan-plagiarism")
    def scan_plagiarism(self, request, pk=None):
        from apps.moderation.tasks import scan_contest_plagiarism

        contest = self.get_object()
        scan_contest_plagiarism.delay(str(contest.id))
        write_audit(request, action_name="contest.scan_plagiarism", obj=contest)
        return Response({"detail": "Anti-plagiat tekshiruvi boshlandi (13-bo'lim)."})

    def handle_bulk_action(self, request, action_name, queryset, payload):
        mapping = {
            "cancel": ContestStatus.CANCELLED,
            "schedule": ContestStatus.SCHEDULED,
            "finish": ContestStatus.FINISHED,
        }
        if action_name in mapping:
            return {"affected": queryset.update(status=mapping[action_name])}
        return {"affected": 0}

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = Contest.objects.all()
        now = timezone.now()
        return Response(
            {
                "total": qs.count(),
                "upcoming": qs.filter(start_time__gt=now).exclude(status=ContestStatus.DRAFT).count(),
                "running": qs.filter(start_time__lte=now, end_time__gte=now).count(),
                "finished": qs.filter(end_time__lt=now).count(),
                "draft": qs.filter(status=ContestStatus.DRAFT).count(),
                "total_participants": ContestParticipant.objects.count(),
            }
        )


class AdminContestParticipantViewSet(AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet):
    queryset = ContestParticipant.objects.select_related("user", "contest")
    serializer_class = ContestParticipantSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "contests"
    filterset_fields = ["contest", "user", "is_virtual", "is_disqualified"]
    search_fields = ["user__username", "contest__title_uz"]
    ordering_fields = ["rank", "score", "rating_change", "created_at"]
    ordering = ["contest", "rank"]
    audit_label = "contest_participant"
    bulk_allowed_actions = ("delete", "disqualify", "restore")

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "disqualify":
            return {"affected": queryset.update(
                is_disqualified=True,
                disqualify_reason=payload.get("reason") or "Bulk diskvalifikatsiya",
            )}
        if action_name == "restore":
            return {"affected": queryset.update(is_disqualified=False, disqualify_reason="")}
        return {"affected": 0}
