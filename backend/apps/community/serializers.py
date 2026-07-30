from __future__ import annotations

from rest_framework import serializers

from apps.core.utils import unique_slug
from apps.core.serializer_fields import RankField

from .models import Group, GroupMember


class GroupMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    avatar_url = serializers.CharField(source="user.avatar_url", read_only=True)
    total_points = serializers.IntegerField(source="user.total_points", read_only=True)
    rating = serializers.IntegerField(source="user.rating", read_only=True)
    problems_solved = serializers.IntegerField(source="user.problems_solved", read_only=True)
    # `position` — guruh ichidagi o'rin, `user_rank` — rank pog'onasi
    user_rank = RankField("user.rating")

    class Meta:
        model = GroupMember
        fields = (
            "id", "group", "user", "username", "full_name", "avatar_url", "user_rank",
            "role", "total_points", "rating", "problems_solved", "joined_at",
        )
        read_only_fields = ("id", "joined_at")


class GroupSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True, default=None)
    live_member_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Group
        fields = (
            "id", "name", "slug", "description", "avatar_url", "owner", "owner_username",
            "invite_code", "is_private", "is_verified", "member_count",
            "live_member_count", "max_members", "created_at", "updated_at",
        )
        read_only_fields = ("id", "member_count", "created_at", "updated_at")
        extra_kwargs = {"slug": {"required": False, "allow_blank": True},
                        "invite_code": {"required": False}}

    def validate(self, attrs):
        if not attrs.get("slug") and not (self.instance and self.instance.slug):
            attrs["slug"] = unique_slug(Group, attrs.get("name", ""), instance=self.instance, max_length=90)
        elif attrs.get("slug"):
            attrs["slug"] = unique_slug(Group, attrs["slug"], instance=self.instance, max_length=90)
        return attrs
