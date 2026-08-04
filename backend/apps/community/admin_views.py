from __future__ import annotations

from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.mixins import AuditLogMixin, BulkActionMixin, write_audit
from apps.core.permissions import HasResourcePerm, IsStaff
from apps.core.trash import SoftDeleteViewSetMixin
from apps.core.utils import invite_code

from .models import Group, GroupMember
from .serializers import GroupMemberSerializer, GroupSerializer


class AdminGroupViewSet(
    SoftDeleteViewSetMixin, AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet
):
    """`/api/admin/groups/` — guruhlar (private leaderboard) boshqaruvi."""

    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "groups"
    perm_actions = {"members": "view", "leaderboard": "view", "regenerate_invite": "edit"}
    filterset_fields = ["is_private", "is_verified", "owner"]
    search_fields = ["name", "slug", "invite_code", "owner__username"]
    ordering_fields = ["created_at", "name", "member_count"]
    ordering = ["-created_at"]
    audit_label = "group"
    bulk_allowed_actions = ("delete", "verify", "unverify")

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related("owner")
            .annotate(live_member_count=Count("members", distinct=True))
        )

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        group = self.get_object()
        rows = group.members.select_related("user").order_by("-user__total_points")
        return Response(GroupMemberSerializer(rows, many=True).data)

    @action(detail=True, methods=["get"])
    def leaderboard(self, request, pk=None):
        group = self.get_object()
        rows = group.members.select_related("user").order_by("-user__total_points", "-user__rating")
        data = GroupMemberSerializer(rows, many=True).data
        for index, row in enumerate(data, start=1):
            row["position"] = index
        return Response(data)

    @action(detail=True, methods=["post"], url_path="regenerate-invite")
    def regenerate_invite(self, request, pk=None):
        group = self.get_object()
        group.invite_code = invite_code()
        group.save(update_fields=["invite_code", "updated_at"])
        write_audit(request, action_name="group.regenerate_invite", obj=group)
        return Response(self.get_serializer(group).data)

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "verify":
            return {"affected": queryset.update(is_verified=True)}
        if action_name == "unverify":
            return {"affected": queryset.update(is_verified=False)}
        return {"affected": 0}


class AdminGroupMemberViewSet(AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet):
    queryset = GroupMember.objects.select_related("user", "group")
    serializer_class = GroupMemberSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "groups"
    filterset_fields = ["group", "user", "role"]
    search_fields = ["user__username", "group__name"]
    ordering_fields = ["joined_at", "role"]
    ordering = ["-joined_at"]
    audit_label = "group_member"
    bulk_allowed_actions = ("delete",)
