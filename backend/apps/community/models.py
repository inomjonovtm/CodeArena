from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel, SoftDeleteModel, TimeStampedModel
from apps.core.utils import invite_code


class Group(SoftDeleteModel, BaseModel):
    """16-bo'lim: guruhlar (private leaderboard)."""

    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=90, unique=True)
    description = models.TextField(blank=True, max_length=500)
    avatar_url = models.URLField(blank=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="owned_groups"
    )
    invite_code = models.CharField(max_length=16, unique=True, default=invite_code)
    is_private = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False, help_text="Admin tomonidan tasdiqlangan (masalan, universitet)")
    member_count = models.PositiveIntegerField(default=0)
    max_members = models.PositiveIntegerField(default=200)

    class Meta:
        db_table = "groups_custom"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class GroupMember(TimeStampedModel):
    ROLES = [("owner", "Egasi"), ("moderator", "Moderator"), ("member", "A'zo")]

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_memberships")
    role = models.CharField(max_length=12, choices=ROLES, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_members"
        unique_together = [("group", "user")]
        ordering = ["-joined_at"]

    def __str__(self) -> str:
        return f"{self.user} @ {self.group}"
