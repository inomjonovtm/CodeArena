from __future__ import annotations

from rest_framework import serializers

from apps.core.serializer_fields import RankField
from .models import Notification, PushSubscription


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default=None)
    actor_avatar = serializers.CharField(source="actor.avatar_url", read_only=True, default=None)
    actor_rank = RankField("actor.rating")

    class Meta:
        model = Notification
        fields = (
            "id", "kind", "level", "title", "body", "url", "payload",
            "is_read", "read_at", "actor_username", "actor_avatar", "actor_rank", "created_at",
        )
        read_only_fields = fields


class PushSubscribeSerializer(serializers.Serializer):
    """Brauzerning `PushSubscription.toJSON()` natijasini qabul qiladi."""

    endpoint = serializers.URLField(max_length=500)
    keys = serializers.DictField(child=serializers.CharField(), write_only=True)

    def validate_keys(self, value: dict) -> dict:
        missing = [name for name in ("p256dh", "auth") if not value.get(name)]
        if missing:
            raise serializers.ValidationError(
                f"Shifrlash kalitlari yetishmayapti: {', '.join(missing)}."
            )
        return value


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ("id", "browser", "device", "last_sent_at", "created_at")
        read_only_fields = fields
