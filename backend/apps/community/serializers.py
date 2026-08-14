from __future__ import annotations

from rest_framework import serializers

from apps.core.serializer_fields import RankField
from apps.core.utils import unique_slug

from .models import (
    Group,
    GroupActivity,
    GroupAssignment,
    GroupJoinRequest,
    GroupMember,
)


class GroupMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    avatar_url = serializers.CharField(source="user.avatar_url", read_only=True)
    total_points = serializers.IntegerField(source="user.total_points", read_only=True)
    rating = serializers.IntegerField(source="user.rating", read_only=True)
    problems_solved = serializers.IntegerField(source="user.problems_solved", read_only=True)
    current_streak = serializers.IntegerField(source="user.current_streak", read_only=True)
    user_rank = RankField(source="user.rating", read_only=True)

    #: Guruhga qo'shilgandan BERI to'plangan — ichki reyting shu bo'yicha.
    group_points = serializers.SerializerMethodField()
    group_solved = serializers.SerializerMethodField()

    class Meta:
        model = GroupMember
        fields = (
            "id", "user", "username", "full_name", "avatar_url", "role",
            "total_points", "rating", "problems_solved", "current_streak",
            "group_points", "group_solved", "user_rank", "joined_at",
        )
        read_only_fields = fields

    def get_group_points(self, obj: GroupMember) -> int:
        return max(0, obj.user.total_points - (obj.points_at_join or 0))

    def get_group_solved(self, obj: GroupMember) -> int:
        return max(0, obj.user.problems_solved - (obj.solved_at_join or 0))


class GroupSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True, default=None)
    live_member_count = serializers.IntegerField(read_only=True, required=False)
    privacy_label = serializers.CharField(source="get_privacy_display", read_only=True)
    #: So'ragan odamning shu guruhdagi roli — interfeys tugmalarni shunga
    #: qarab ko'rsatadi (server bilan bir xil manba, taxmin qilinmaydi).
    my_role = serializers.SerializerMethodField()
    pending_requests = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = (
            "id", "name", "slug", "description", "avatar_url", "owner", "owner_username",
            "invite_code", "privacy", "privacy_label", "is_verified", "member_count",
            "live_member_count", "max_members", "my_role", "pending_requests", "created_at",
        )
        read_only_fields = (
            "id", "owner", "owner_username", "member_count", "live_member_count",
            "is_verified", "privacy_label", "my_role", "pending_requests", "created_at",
            # Taklif kodini mijoz TANLAY OLMAYDI: ilgari u yoziladigan maydon
            # edi va foydalanuvchi o'zi xohlagan (taxmin qilinadigan) kodni
            # qo'yib olardi.
            "invite_code",
        )
        extra_kwargs = {"slug": {"required": False}}

    def _viewer(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def get_my_role(self, obj: Group) -> str | None:
        return obj.role_of(self._viewer())

    def get_pending_requests(self, obj: Group) -> int:
        """Faqat boshqaruvchiga ko'rinadi — boshqalarga 0."""
        if not obj.can_manage(self._viewer()):
            return 0
        return obj.join_requests.filter(status=GroupJoinRequest.Status.PENDING).count()

    def validate_max_members(self, value: int) -> int:
        # Chegara o'zini o'zi ko'tarolmasin: ilgari egasi PATCH bilan
        # 200 limitini istalgan songa aylantira olardi.
        if value > 500:
            raise serializers.ValidationError("A'zolar chegarasi 500 dan oshmasin.")
        return value

    def validate(self, attrs):
        if not attrs.get("slug") and not (self.instance and self.instance.slug):
            attrs["slug"] = unique_slug(
                Group, attrs.get("name", ""), instance=self.instance, max_length=90
            )
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Taklif kodi — faqat a'zolarga. Ilgari u ro'yxatdagi HAR BIR
        # javobda ochiq yurardi.
        if not instance.role_of(self._viewer()):
            data["invite_code"] = ""
        return data


class GroupActivitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True, default=None)
    avatar_url = serializers.CharField(source="user.avatar_url", read_only=True, default="")
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = GroupActivity
        fields = ("id", "kind", "kind_label", "username", "avatar_url", "text", "url", "created_at")
        read_only_fields = fields


class GroupJoinRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    avatar_url = serializers.CharField(source="user.avatar_url", read_only=True)
    rating = serializers.IntegerField(source="user.rating", read_only=True)

    class Meta:
        model = GroupJoinRequest
        fields = (
            "id", "username", "full_name", "avatar_url", "rating",
            "message", "status", "created_at",
        )
        read_only_fields = fields


class AssignmentProblemSerializer(serializers.Serializer):
    """Vazifadagi bitta masala — a'zoning holati bilan."""

    slug = serializers.CharField()
    title = serializers.CharField()
    difficulty = serializers.CharField()
    rating = serializers.IntegerField()
    solved = serializers.BooleanField()


class GroupAssignmentSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, default=None
    )
    problem_count = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    #: Yozishda masalalar slug bilan beriladi — interfeysda id emas, slug bor.
    problem_slugs = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False, allow_empty=True
    )

    class Meta:
        model = GroupAssignment
        fields = (
            "id", "title", "description", "due_at", "is_published",
            "problem_count", "is_overdue", "problem_slugs",
            "created_by_username", "created_at",
        )
        read_only_fields = ("id", "problem_count", "is_overdue", "created_by_username", "created_at")

    def get_problem_count(self, obj: GroupAssignment) -> int:
        return getattr(obj, "problem_total", None) or obj.problems.count()

    def create(self, validated_data):
        slugs = validated_data.pop("problem_slugs", [])
        assignment = super().create(validated_data)
        self._set_problems(assignment, slugs)
        return assignment

    def update(self, instance, validated_data):
        slugs = validated_data.pop("problem_slugs", None)
        assignment = super().update(instance, validated_data)
        if slugs is not None:
            self._set_problems(assignment, slugs)
        return assignment

    @staticmethod
    def _set_problems(assignment: GroupAssignment, slugs: list[str]) -> None:
        from apps.problems.models import Problem, ProblemStatus

        problems = Problem.objects.filter(
            slug__in=slugs, status=ProblemStatus.PUBLISHED, is_contest_only=False
        )
        assignment.problems.set(problems)
