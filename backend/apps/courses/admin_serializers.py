"""Admin panel serializerlari — kurs muharriri uchun.

Ochiq API'dan farqi: bu yerda hech narsa yashirilmaydi (to'g'ri javob,
namuna yechim, yopiq testlar hammasi ko'rinadi) va topshiriq testlari
bevosita topshiriq ichida tahrirlanadi — muharrirda ular bitta jadval
sifatida turadi, alohida sahifada emas.
"""
from __future__ import annotations

from django.db import transaction
from rest_framework import serializers

from .models import (
    Course,
    Example,
    Exercise,
    ExerciseTest,
    Lesson,
    Module,
    QuizQuestion,
)


class AdminCourseSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    module_count = serializers.IntegerField(read_only=True, default=0)
    lesson_count = serializers.IntegerField(read_only=True, default=0)
    exercise_count = serializers.IntegerField(read_only=True, default=0)
    enrollment_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Course
        fields = [
            "id", "slug", "title_uz", "subtitle_uz", "description_uz",
            "language", "level", "status", "badge", "accent_color",
            "order", "is_featured", "estimated_hours",
            "author", "author_username", "published_at",
            "module_count", "lesson_count", "exercise_count", "enrollment_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["author", "published_at", "created_at", "updated_at"]


class AdminModuleSerializer(serializers.ModelSerializer):
    lesson_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Module
        fields = [
            "id", "course", "title_uz", "slug", "summary_uz", "order",
            "lesson_count", "created_at", "updated_at",
        ]


class AdminExampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Example
        fields = [
            "id", "lesson", "title_uz", "language", "code", "expected_output",
            "explanation_uz", "is_runnable", "order",
        ]


class AdminQuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = [
            "id", "lesson", "question_uz", "options", "correct_index",
            "explanation_uz", "order",
        ]

    def validate(self, attrs):
        options = attrs.get("options", getattr(self.instance, "options", []) or [])
        correct = attrs.get("correct_index", getattr(self.instance, "correct_index", 0))
        if len(options) < 2:
            raise serializers.ValidationError({"options": "Kamida ikkita variant kerak."})
        if not 0 <= correct < len(options):
            raise serializers.ValidationError(
                {"correct_index": "To'g'ri javob variantlar orasida bo'lishi kerak."}
            )
        return attrs


class AdminExerciseTestSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ExerciseTest
        fields = ["id", "input", "expected_output", "is_sample", "explanation_uz", "order"]


class AdminExerciseSerializer(serializers.ModelSerializer):
    """Testlar topshiriq bilan BIRGA yoziladi.

    Alohida endpoint qoldirilsa, muharrirda topshiriqni saqlash uchun bir
    necha so'rov ketardi va yarim saqlangan holat (topshiriq bor, testlari
    yo'q) yuzaga kelishi mumkin edi. Bu yerda hammasi bitta tranzaksiyada.
    """

    tests = AdminExerciseTestSerializer(many=True, required=False)

    class Meta:
        model = Exercise
        fields = [
            "id", "lesson", "title_uz", "prompt_md", "language",
            "starter_code", "solution_code", "hint_uz",
            "points", "order", "time_limit_ms", "memory_limit_kb", "tests",
        ]

    @transaction.atomic
    def create(self, validated_data):
        tests = validated_data.pop("tests", [])
        exercise = Exercise.objects.create(**validated_data)
        self._write_tests(exercise, tests)
        return exercise

    @transaction.atomic
    def update(self, instance, validated_data):
        tests = validated_data.pop("tests", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if tests is not None:
            self._write_tests(instance, tests, replace=True)
        return instance

    @staticmethod
    def _write_tests(exercise: Exercise, rows: list[dict], replace: bool = False) -> None:
        if replace:
            # Ro'yxat to'liq almashtiriladi: muharrirda test o'chirilsa, u
            # bazada ham qolmasligi kerak.
            exercise.tests.all().delete()
        for index, row in enumerate(rows):
            row.pop("id", None)
            row.setdefault("order", index)
            ExerciseTest.objects.create(exercise=exercise, **row)


class AdminLessonSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title_uz", read_only=True)
    course_slug = serializers.CharField(source="course.slug", read_only=True)
    module_title = serializers.CharField(source="module.title_uz", read_only=True)
    example_count = serializers.IntegerField(read_only=True, default=0)
    quiz_count = serializers.IntegerField(read_only=True, default=0)
    exercise_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Lesson
        fields = [
            "id", "course", "course_title", "course_slug", "module", "module_title",
            "title_uz", "slug", "summary_uz", "content_md", "order", "status",
            "points", "estimated_minutes",
            "example_count", "quiz_count", "exercise_count",
            "created_at", "updated_at",
        ]
        # Kurs bo'limdan olinadi (`Lesson.save`) — qo'lda yuborilsa, ikki
        # manba paydo bo'lardi.
        read_only_fields = ["course", "created_at", "updated_at"]


class AdminLessonDetailSerializer(AdminLessonSerializer):
    """Muharrir uchun to'liq mavzu — misollar, test va topshiriqlar bilan."""

    examples = AdminExampleSerializer(many=True, read_only=True)
    quiz_questions = AdminQuizQuestionSerializer(many=True, read_only=True)
    exercises = AdminExerciseSerializer(many=True, read_only=True)

    class Meta(AdminLessonSerializer.Meta):
        fields = [*AdminLessonSerializer.Meta.fields, "examples", "quiz_questions", "exercises"]


class CourseTreeLessonSerializer(serializers.ModelSerializer):
    example_count = serializers.IntegerField(read_only=True, default=0)
    quiz_count = serializers.IntegerField(read_only=True, default=0)
    exercise_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Lesson
        fields = [
            "id", "title_uz", "slug", "order", "status", "points",
            "estimated_minutes", "example_count", "quiz_count", "exercise_count",
        ]


class CourseTreeModuleSerializer(serializers.ModelSerializer):
    lessons = CourseTreeLessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ["id", "title_uz", "slug", "summary_uz", "order", "lessons"]
