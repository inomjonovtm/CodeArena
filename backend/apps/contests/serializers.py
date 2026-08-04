from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from apps.core.serializer_fields import RankField
from apps.core.utils import unique_slug
from apps.problems.models import Problem

from .models import Contest, ContestParticipant, ContestProblem


def validate_contest_problem(problem: Problem) -> Problem:
    """Musobaqaga faqat ommaviy ro'yxatda ko'rinmaydigan masala qo'shiladi.

    Aks holda ishtirokchilar masalani musobaqadan oldin amaliyot bo'limida
    yechib olishlari mumkin bo'lardi. Shuning uchun masalada
    `is_contest_only` bayrog'i yoqilgan bo'lishi shart.
    """
    if not problem.is_contest_only:
        raise serializers.ValidationError(
            f"«{problem.title_uz}» ommaviy masala. Musobaqaga qo'shish uchun "
            "masalada «faqat musobaqa uchun» bayrog'ini yoqing."
        )
    return problem


class ContestProblemSerializer(serializers.ModelSerializer):
    problem_title = serializers.CharField(source="problem.title_uz", read_only=True)
    problem_slug = serializers.CharField(source="problem.slug", read_only=True)
    problem_difficulty = serializers.CharField(source="problem.difficulty", read_only=True)

    class Meta:
        model = ContestProblem
        fields = (
            "id",
            "contest",
            "problem",
            "problem_title",
            "problem_slug",
            "problem_difficulty",
            "order",
            "label",
            "points",
        )
        extra_kwargs = {"contest": {"required": False}}

    def validate_problem(self, value: Problem) -> Problem:
        return validate_contest_problem(value)


class ContestProblemNestedSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ContestProblem
        fields = ("id", "problem", "order", "label", "points")

    def validate_problem(self, value: Problem) -> Problem:
        return validate_contest_problem(value)


class ContestListSerializer(serializers.ModelSerializer):
    computed_status = serializers.CharField(read_only=True)
    problem_count = serializers.IntegerField(read_only=True, default=0)
    participant_count = serializers.IntegerField(read_only=True, default=0)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = Contest
        fields = (
            "id",
            "slug",
            "title_uz",
            "title_en",
            "start_time",
            "end_time",
            "duration_minutes",
            "status",
            "computed_status",
            "visibility",
            "is_rated",
            "is_virtual_allowed",
            "problem_count",
            "participant_count",
            "created_by_username",
            "ratings_applied_at",
            "plagiarism_checked_at",
            "created_at",
        )


class ContestDetailSerializer(serializers.ModelSerializer):
    computed_status = serializers.CharField(read_only=True)
    contest_problems = ContestProblemNestedSerializer(many=True, required=False)
    participant_count = serializers.IntegerField(read_only=True, default=0)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = Contest
        fields = (
            "id",
            "slug",
            "title_uz",
            "title_en",
            "description_uz",
            "description_en",
            "start_time",
            "end_time",
            "duration_minutes",
            "status",
            "computed_status",
            "visibility",
            "access_password",
            "is_rated",
            "is_virtual_allowed",
            "max_participants",
            "rating_k_new",
            "rating_k_experienced",
            "plagiarism_checked_at",
            "ratings_applied_at",
            "created_by_username",
            "participant_count",
            "contest_problems",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "plagiarism_checked_at", "ratings_applied_at")
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"end_time": "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak."})
        if start and end:
            attrs["duration_minutes"] = attrs.get("duration_minutes") or int((end - start).total_seconds() // 60)

        if not attrs.get("slug") and not (self.instance and self.instance.slug):
            source = attrs.get("title_en") or attrs.get("title_uz") or ""
            attrs["slug"] = unique_slug(Contest, source, instance=self.instance, max_length=120)
        elif attrs.get("slug"):
            attrs["slug"] = unique_slug(Contest, attrs["slug"], instance=self.instance, max_length=120)
        return attrs

    def _sync_problems(self, contest: Contest, rows: list[dict]):
        keep = []
        for index, row in enumerate(rows):
            row = dict(row)
            row.setdefault("order", index)
            row.setdefault("label", chr(65 + index) if index < 26 else str(index + 1))
            cp_id = row.pop("id", None)
            if cp_id:
                ContestProblem.objects.filter(pk=cp_id, contest=contest).update(**row)
                keep.append(cp_id)
            else:
                created = ContestProblem.objects.create(contest=contest, **row)
                keep.append(created.pk)
        contest.contest_problems.exclude(pk__in=keep).delete()
        # 11-bo'lim: contest masalalari tugagunga qadar ommaviy ro'yxatda ko'rinmaydi
        Problem.objects.filter(contest_entries__contest=contest).update(is_contest_only=True)

    def create(self, validated_data):
        problems = validated_data.pop("contest_problems", [])
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data.setdefault("created_by", request.user)
        contest = Contest.objects.create(**validated_data)
        if problems:
            self._sync_problems(contest, problems)
        return contest

    def update(self, instance, validated_data):
        problems = validated_data.pop("contest_problems", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if problems is not None:
            self._sync_problems(instance, problems)
        return instance


class ContestParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    avatar_url = serializers.CharField(source="user.avatar_url", read_only=True)
    country = serializers.CharField(source="user.country", read_only=True)
    # `rank` — musobaqadagi o'rin, `user_rank` — foydalanuvchining rank pog'onasi
    user_rank = RankField("user.rating")

    class Meta:
        model = ContestParticipant
        fields = (
            "id",
            "contest",
            "user",
            "username",
            "full_name",
            "avatar_url",
            "country",
            "user_rank",
            "rank",
            "score",
            "penalty",
            "solved_count",
            "rating_before",
            "rating_after",
            "rating_change",
            "is_virtual",
            "is_disqualified",
            "disqualify_reason",
            "started_at",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class DisqualifySerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255)


class PublicContestSerializer(serializers.ModelSerializer):
    computed_status = serializers.CharField(read_only=True)
    problem_count = serializers.IntegerField(read_only=True, default=0)
    participant_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Contest
        fields = (
            "id",
            "slug",
            "title_uz",
            "title_en",
            "description_uz",
            "description_en",
            "start_time",
            "end_time",
            "duration_minutes",
            "computed_status",
            "is_rated",
            "is_virtual_allowed",
            "problem_count",
            "participant_count",
        )


class PublicContestDetailSerializer(PublicContestSerializer):
    """Contest sahifasi uchun: qoidalar, joriy holat va foydalanuvchi ishtiroki."""

    my_participation = serializers.SerializerMethodField()
    can_see_problems = serializers.SerializerMethodField()
    server_time = serializers.SerializerMethodField()
    requires_password = serializers.SerializerMethodField()

    class Meta(PublicContestSerializer.Meta):
        fields = (
            *PublicContestSerializer.Meta.fields,
            "max_participants",
            "ratings_applied_at",
            "my_participation",
            "can_see_problems",
            "server_time",
            "requires_password",
        )

    def _user(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return user if (user and user.is_authenticated) else None

    def get_my_participation(self, obj):
        user = self._user()
        if not user:
            return None
        participant = obj.participants.filter(user=user).first()
        return ContestParticipantSerializer(participant).data if participant else None

    def get_can_see_problems(self, obj) -> bool:
        from .models import ContestStatus

        state = obj.computed_status
        if state == ContestStatus.FINISHED:
            return True
        if state != ContestStatus.RUNNING:
            return False
        user = self._user()
        return bool(user and obj.participants.filter(user=user).exists())

    def get_server_time(self, obj):
        return timezone.now()

    def get_requires_password(self, obj) -> bool:
        return obj.visibility == "private"


class ContestNowSerializer(serializers.Serializer):
    """Contest hisoblangan vaqt konteksti."""

    server_time = serializers.DateTimeField(default=timezone.now)
