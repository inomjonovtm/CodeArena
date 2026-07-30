"""`/api/notifications/` — foydalanuvchining sayt ichi bildirishnomalari."""
from __future__ import annotations

from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["kind", "is_read"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related("actor")

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread": count})

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_read(self, request):
        affected = Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({"detail": f"{affected} ta bildirishnoma o'qilgan deb belgilandi.", "affected": affected})

    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request):
        affected, _ = Notification.objects.filter(recipient=request.user, is_read=True).delete()
        return Response({"detail": "O'qilganlar tozalandi.", "affected": affected})
