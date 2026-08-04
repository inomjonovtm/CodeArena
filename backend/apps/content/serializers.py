from __future__ import annotations

from rest_framework import serializers

from apps.core.serializer_fields import RankField

from .models import Comment, ContactMessage, ContentReport, Discussion


class DiscussionSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)

    class Meta:
        model = Discussion
        fields = (
            "id", "author", "author_username",
            "title", "body_md", "status", "is_pinned", "is_locked", "upvotes", "views",
            "comment_count", "flagged_count", "moderation_note", "created_at", "updated_at",
        )
        read_only_fields = ("id", "author", "upvotes", "views", "comment_count",
                           "flagged_count", "created_at", "updated_at")


class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)
    discussion_title = serializers.CharField(source="discussion.title", read_only=True, default=None)
    problem_title = serializers.CharField(source="problem.title_uz", read_only=True, default=None)
    problem_slug = serializers.CharField(source="problem.slug", read_only=True, default=None)

    class Meta:
        model = Comment
        fields = (
            "id", "discussion", "discussion_title", "problem", "problem_title", "problem_slug",
            "parent", "author", "author_username",
            "body_md", "status", "upvotes", "flagged_count", "created_at", "updated_at",
        )
        read_only_fields = ("id", "author", "upvotes", "flagged_count", "created_at", "updated_at")


class ContentReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source="reporter.username", read_only=True, default=None)
    discussion_title = serializers.CharField(source="discussion.title", read_only=True, default=None)
    comment_excerpt = serializers.SerializerMethodField()

    class Meta:
        model = ContentReport
        fields = (
            "id", "reporter", "reporter_username", "discussion", "discussion_title",
            "comment", "comment_excerpt", "reason", "note", "is_resolved",
            "resolved_by", "resolved_at", "created_at",
        )
        read_only_fields = ("id", "created_at", "resolved_by", "resolved_at")

    def get_comment_excerpt(self, obj):
        return obj.comment.body_md[:120] if obj.comment else None


class PublicDiscussionSerializer(serializers.ModelSerializer):
    """Sayt tomonidagi muhokama — moderatsiya maydonlarisiz."""

    author_username = serializers.CharField(source="author.username", read_only=True, default=None)
    author_avatar = serializers.CharField(source="author.avatar_url", read_only=True, default=None)
    author_rank = RankField("author.rating")
    my_vote = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Discussion
        fields = (
            "id", "author_username", "author_avatar", "author_rank",
            "title", "body_md", "is_pinned", "is_locked", "upvotes", "views",
            "comment_count", "my_vote", "is_mine", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "upvotes", "views", "comment_count", "is_pinned", "is_locked",
            "created_at", "updated_at",
        )

    def _user(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return user if (user and user.is_authenticated) else None

    def get_my_vote(self, obj) -> int:
        user = self._user()
        if not user:
            return 0
        vote = obj.votes.filter(user=user).first()
        return vote.value if vote else 0

    def get_is_mine(self, obj) -> bool:
        user = self._user()
        return bool(user and obj.author_id == user.pk)

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError("Sarlavha kamida 5 ta belgidan iborat bo'lsin.")
        return value

    def validate_body_md(self, value: str) -> str:
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError("Matn kamida 10 ta belgidan iborat bo'lsin.")
        return value


class PublicCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)
    author_avatar = serializers.CharField(source="author.avatar_url", read_only=True, default=None)
    author_rank = RankField("author.rating")
    my_vote = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            "id", "discussion", "problem", "parent",
            "author_username", "author_avatar", "author_rank",
            "body_md", "upvotes", "my_vote", "is_mine", "created_at", "updated_at",
        )
        read_only_fields = ("id", "upvotes", "created_at", "updated_at")

    def _user(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return user if (user and user.is_authenticated) else None

    def get_my_vote(self, obj) -> int:
        user = self._user()
        if not user:
            return 0
        vote = obj.votes.filter(user=user).first()
        return vote.value if vote else 0

    def get_is_mine(self, obj) -> bool:
        user = self._user()
        return bool(user and obj.author_id == user.pk)

    def validate(self, attrs):
        """Izoh aynan bitta obyektga tegishli bo'lsin — mavzuga yoki masalaga.

        Bazada ham `CheckConstraint` bor, lekin u faqat IntegrityError beradi
        (500). Bu yerda tekshirish tushunarli 400 qaytaradi.
        """
        if self.instance is None:
            parent = attrs.get("parent")
            if parent is not None:
                # Javob doim ota-izoh bilan bir joyda turadi. Aks holda javob
                # boshqa sahifada paydo bo'lib qolardi.
                attrs["discussion"] = parent.discussion
                attrs["problem"] = parent.problem

            has_discussion = attrs.get("discussion") is not None
            has_problem = attrs.get("problem") is not None
            if has_discussion == has_problem:
                raise serializers.ValidationError(
                    "Izoh mavzuga yoki masalaga tegishli bo'lishi kerak — aynan bittasiga."
                )
        return attrs

    def validate_body_md(self, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Izoh juda qisqa.")
        if len(value) > 5000:
            raise serializers.ValidationError("Izoh 5000 belgidan oshmasin.")
        return value


class PublicReportSerializer(serializers.ModelSerializer):
    """Foydalanuvchi shikoyati — moderatsiya navbatiga tushadi."""

    class Meta:
        model = ContentReport
        fields = ("id", "discussion", "comment", "reason", "note", "created_at")
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        if not attrs.get("discussion") and not attrs.get("comment"):
            raise serializers.ValidationError("Muhokama yoki izoh ko'rsatilishi kerak.")
        return attrs


class ContactMessageSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True, default=None)
    answered_by_username = serializers.CharField(
        source="answered_by.username", read_only=True, default=None
    )
    topic_display = serializers.CharField(source="get_topic_display", read_only=True)

    class Meta:
        model = ContactMessage
        fields = (
            "id", "name", "email", "topic", "topic_display", "subject", "body",
            "is_read", "is_resolved", "answer", "answered_at", "answered_by_username",
            "user_username", "ip_address", "created_at",
        )
        read_only_fields = (
            "id", "name", "email", "topic", "topic_display", "subject", "body",
            "answered_at", "answered_by_username", "user_username", "ip_address", "created_at",
        )
