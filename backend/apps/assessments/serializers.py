"""Test savollari va sinovlari uchun serializerlar."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.utils import unique_slug

from .models import (
    Question,
    QuestionFolder,
    QuestionKind,
    Quiz,
    QuizAttempt,
    QuizItem,
)


class QuestionFolderSerializer(serializers.ModelSerializer):
    path = serializers.CharField(read_only=True)
    question_count = serializers.IntegerField(read_only=True, default=0)
    owner_username = serializers.CharField(source="owner.username", read_only=True, default=None)

    class Meta:
        model = QuestionFolder
        fields = (
            "id", "name", "parent", "owner_username", "order", "is_shared",
            "path", "question_count", "created_at", "updated_at",
        )
        read_only_fields = ("id", "owner_username", "path", "question_count",
                            "created_at", "updated_at")

    def validate_parent(self, value):
        """Papka o'z avlodiga ko'chib o'tmasin — daraxt halqaga aylanadi."""
        if value is None:
            return value
        if self.instance and value.pk == self.instance.pk:
            raise serializers.ValidationError("Papka o'zining ichiga joylashtirilmaydi.")
        node, guard = value, 0
        while node is not None and guard < 20:
            if self.instance and node.pk == self.instance.pk:
                raise serializers.ValidationError("Papkani o'z ichidagi papkaga ko'chirib bo'lmaydi.")
            node = node.parent
            guard += 1
        return value


class QuestionSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)
    correct_rate = serializers.FloatField(read_only=True)
    folder_path = serializers.CharField(source="folder.path", read_only=True, default="")

    class Meta:
        model = Question
        fields = (
            "id", "folder", "folder_path", "kind", "body_md", "options", "answers",
            "number_tolerance", "explanation_md", "difficulty", "points", "tags",
            "author_username", "times_answered", "times_correct", "correct_rate",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "folder_path", "author_username", "times_answered", "times_correct",
            "correct_rate", "created_at", "updated_at",
        )

    def validate_body_md(self, value: str) -> str:
        if not (value or "").strip():
            raise serializers.ValidationError("Savol matni bo'sh bo'lmasligi kerak.")
        return value

    def validate(self, attrs):
        """Savol turi bo'yicha javoblar to'g'ri to'ldirilganini tekshiradi.

        Bu tekshiruv formada emas, shu yerda: noto'g'ri sozlangan savol
        sinov o'tkazilayotgan paytda emas, YARATILAYOTGANDA aniqlanishi
        kerak — aks holda yuzlab ishtirokchi javobsiz savolga urilardi.
        """
        kind = attrs.get("kind", getattr(self.instance, "kind", QuestionKind.SINGLE))
        options = attrs.get("options", getattr(self.instance, "options", []) or [])
        answers = attrs.get("answers", getattr(self.instance, "answers", []) or [])

        if kind in {QuestionKind.SINGLE, QuestionKind.MULTI, QuestionKind.TRUE_FALSE}:
            if len(options) < 2:
                raise serializers.ValidationError(
                    {"options": "Kamida ikkita variant kerak."}
                )
            correct = [
                index for index, option in enumerate(options)
                if isinstance(option, dict) and option.get("is_correct")
            ]
            if not correct:
                raise serializers.ValidationError(
                    {"options": "Kamida bitta to'g'ri variant belgilang."}
                )
            if kind in {QuestionKind.SINGLE, QuestionKind.TRUE_FALSE} and len(correct) > 1:
                raise serializers.ValidationError(
                    {"options": "Bu turda faqat BITTA to'g'ri variant bo'ladi."}
                )
        elif not answers:
            raise serializers.ValidationError(
                {"answers": "Qabul qilinadigan javoblarni yozing."}
            )

        return attrs


class QuizItemSerializer(serializers.ModelSerializer):
    question_body = serializers.CharField(source="question.body_md", read_only=True)
    question_kind = serializers.CharField(source="question.kind", read_only=True)
    question_difficulty = serializers.CharField(source="question.difficulty", read_only=True)

    class Meta:
        model = QuizItem
        fields = (
            "id", "quiz", "question", "order", "points",
            "question_body", "question_kind", "question_difficulty",
        )
        read_only_fields = ("id", "question_body", "question_kind", "question_difficulty")


class QuizListSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)
    question_count = serializers.IntegerField(read_only=True, default=0)
    attempt_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Quiz
        fields = (
            "id", "slug", "title_uz", "status", "time_limit_min", "attempts_allowed",
            "pass_score_percent", "starts_at", "ends_at", "author_username",
            "question_count", "attempt_count", "created_at", "updated_at",
        )
        read_only_fields = fields


class QuizDetailSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)
    items = QuizItemSerializer(many=True, read_only=True)
    total_points = serializers.IntegerField(read_only=True)
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Quiz
        fields = (
            "id", "slug", "title_uz", "description_md", "status",
            "time_limit_min", "attempts_allowed", "pass_score_percent",
            "shuffle_questions", "shuffle_options", "show_answers",
            "starts_at", "ends_at", "access_password",
            "author_username", "items", "total_points",
            "published_at", "created_at", "updated_at",
        )
        read_only_fields = ("id", "author_username", "items", "total_points",
                            "published_at", "created_at", "updated_at")

    def validate(self, attrs):
        starts = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts and ends and ends <= starts:
            raise serializers.ValidationError(
                {"ends_at": "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak."}
            )
        return attrs

    def create(self, validated_data):
        if not validated_data.get("slug"):
            validated_data["slug"] = unique_slug(Quiz, validated_data["title_uz"], max_length=120)
        return super().create(validated_data)


class QuizAttemptSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True, default="")
    quiz_title = serializers.CharField(source="quiz.title_uz", read_only=True)
    percent = serializers.FloatField(read_only=True)

    class Meta:
        model = QuizAttempt
        fields = (
            "id", "quiz", "quiz_title", "username", "full_name", "score", "max_score",
            "percent", "correct_count", "total_count", "is_passed",
            "started_at", "submitted_at", "created_at",
        )
        read_only_fields = fields
