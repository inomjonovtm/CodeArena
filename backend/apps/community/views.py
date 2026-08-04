from __future__ import annotations

from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.utils import invite_code as generate_invite_code

from .models import Group, GroupMember
from .serializers import GroupMemberSerializer, GroupSerializer


class GroupViewSet(viewsets.ModelViewSet):
    """`/api/groups/` — guruhlar (16-bo'lim).

    Foydalanuvchi faqat a'zo bo'lgan guruhlarini ko'radi; yangi guruhga
    taklif kodi orqali qo'shiladi.
    """

    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            Group.objects.filter(members__user=self.request.user)
            .annotate(live_member_count=Count("members", distinct=True))
            .distinct()
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        group = serializer.save(owner=self.request.user)
        GroupMember.objects.create(group=group, user=self.request.user, role="owner")
        group.member_count = 1
        group.save(update_fields=["member_count"])

    def perform_update(self, serializer):
        group = self.get_object()
        if not self._is_owner(group):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Guruhni faqat egasi tahrirlay oladi.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self._is_owner(instance):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Guruhni faqat egasi o'chira oladi.")
        instance.delete()

    def _is_owner(self, group) -> bool:
        return group.owner_id == self.request.user.pk

    @action(detail=False, methods=["post"])
    def join(self, request):
        code = (request.data.get("invite_code") or "").strip().upper()
        group = Group.objects.filter(invite_code=code).first()
        if not group:
            return Response({"detail": "Taklif kodi noto'g'ri."}, status=status.HTTP_404_NOT_FOUND)
        if group.members.count() >= group.max_members:
            return Response({"detail": "Guruh to'lgan."}, status=status.HTTP_400_BAD_REQUEST)

        _member, created = GroupMember.objects.get_or_create(group=group, user=request.user)
        if created:
            group.member_count = group.members.count()
            group.save(update_fields=["member_count"])

            from apps.notifications.models import NotificationKind
            from apps.notifications.services import notify

            notify(
                group.owner,
                actor=request.user,
                kind=NotificationKind.GROUP_INVITE,
                title=f"{request.user.username} guruhingizga qo'shildi",
                body=group.name,
                url=f"/groups/{group.slug}",
            )

        data = GroupSerializer(group).data
        data["joined"] = created
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def leave(self, request, slug=None):
        group = self.get_object()
        if self._is_owner(group):
            return Response(
                {"detail": "Guruh egasi chiqa olmaydi — avval guruhni o'chiring."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        GroupMember.objects.filter(group=group, user=request.user).delete()
        group.member_count = group.members.count()
        group.save(update_fields=["member_count"])
        return Response({"detail": "Guruhdan chiqdingiz."})

    @action(detail=True, methods=["post"], url_path="regenerate-code")
    def regenerate_code(self, request, slug=None):
        group = self.get_object()
        if not self._is_owner(group):
            return Response(
                {"detail": "Faqat guruh egasi kodni yangilaydi."}, status=status.HTTP_403_FORBIDDEN
            )
        group.invite_code = generate_invite_code()
        group.save(update_fields=["invite_code"])
        return Response({"invite_code": group.invite_code})

    @action(detail=True, methods=["post"], url_path="members/(?P<member_id>[^/.]+)/remove")
    def remove_member(self, request, slug=None, member_id=None):
        group = self.get_object()
        if not self._is_owner(group):
            return Response(
                {"detail": "Faqat guruh egasi a'zoni chiqara oladi."}, status=status.HTTP_403_FORBIDDEN
            )
        member = GroupMember.objects.filter(pk=member_id, group=group).first()
        if not member:
            return Response({"detail": "A'zo topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        if member.user_id == group.owner_id:
            return Response({"detail": "Egani chiqarib bo'lmaydi."}, status=status.HTTP_400_BAD_REQUEST)

        member.delete()
        group.member_count = group.members.count()
        group.save(update_fields=["member_count"])
        return Response({"detail": "A'zo guruhdan chiqarildi."})

    @action(detail=True, methods=["get"])
    def leaderboard(self, request, slug=None):
        group = self.get_object()
        rows = group.members.select_related("user").order_by("-user__total_points", "-user__rating")
        data = GroupMemberSerializer(rows, many=True).data
        for index, row in enumerate(data, start=1):
            row["position"] = index
        return Response(data)
