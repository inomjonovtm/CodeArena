"""Kurslarning ochiq (foydalanuvchi) API serializerlari.

Ikkita qoida butun faylni boshqaradi:

  * javob NIMA KERAK bo'lsa shuni beradi — test savolining to'g'ri javobi
    va topshiriqning namuna yechimi shart bo'lmaguncha yuborilmaydi;
  * progress serializer ichida so'rov qilmaydi — u tayyor holda
    `context` orqali keladi (`progress.py`), aks holda mavzular ro'yxati
    N+1 so'rovga aylanardi.
"""
from __future__ import annotations

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

# ------------------------------------------------------------------- katalog


class CourseCardSerializer(serializers.ModelSerializer):
    lesson_count = serializers.IntegerField(read_only=True, default=0)
    module_count = serializers.IntegerField(read_only=True, default=0)
    exercise_count = serializers.IntegerField(read_only=True, default=0)
    my_progress = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id", "slug", "title_uz", "subtitle_uz", "language", "level",
            "badge", "accent_color", "estimated_hours", "is_featured",
            "lesson_count", "module_count", "exercise_count", "my_progress",
        ]

    def get_my_progress(self, obj) -> dict | None:
        return (self.context.get("progress_map") or {}).get(obj.id)


class LessonNodeSerializer(serializers.ModelSerializer):
    """Kurs sahifasidagi mavzular daraxtining bitta qatori."""

    exercise_count = serializers.IntegerField(read_only=True, default=0)
    quiz_count = serializers.IntegerField(read_only=True, default=0)
    my_state = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "slug", "title_uz", "summary_uz", "order",
            "points", "estimated_minutes", "exercise_count", "quiz_count", "my_state",
        ]

    def get_my_state(self, obj) -> dict | None:
        return (self.context.get("lesson_states") or {}).get(obj.id)


class ModuleNodeSerializer(serializers.ModelSerializer):
    lessons = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ["id", "slug", "title_uz", "summary_uz", "order", "lessons"]

    def get_lessons(self, obj) -> list:
        # `prefetch_related` bilan kelgan ro'yxat — bu yerda yangi so'rov yo'q
        rows = [lesson for lesson in obj.lessons.all() if lesson.status == "published"]
        return LessonNodeSerializer(rows, many=True, context=self.context).data


class CourseDetailSerializer(CourseCardSerializer):
    modules = serializers.SerializerMethodField()
    total_points = serializers.SerializerMethodField()

    class Meta(CourseCardSerializer.Meta):
        fields = [
            *CourseCardSerializer.Meta.fields,
            "description_uz", "modules", "total_points",
        ]

    def get_modules(self, obj) -> list:
        return ModuleNodeSerializer(obj.modules.all(), many=True, context=self.context).data

    def get_total_points(self, obj) -> int:
        lessons = [lesson for lesson in obj.lessons.all() if lesson.status == "published"]
        points = sum(lesson.points for lesson in lessons)
        points += sum(
            exercise.points for lesson in lessons for exercise in lesson.exercises.all()
        )
        return points


# --------------------------------------------------------------------- mavzu


class ExampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Example
        fields = [
            "id", "title_uz", "language", "code", "expected_output",
            "explanation_uz", "is_runnable", "order",
        ]


class ExerciseTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseTest
        fields = ["input", "expected_output", "explanation_uz", "order"]


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Savol — TO'G'RI JAVOBSIZ.

    Javob faqat `POST .../quiz/` javobida qaytadi. Aks holda javoblarni
    tarmoq panelidan ko'rib olish mumkin bo'lardi va test ma'nosini
    yo'qotardi.
    """

    class Meta:
        model = QuizQuestion
        fields = ["id", "question_uz", "options", "order"]


class ExerciseSerializer(serializers.ModelSerializer):
    sample_tests = serializers.SerializerMethodField()
    is_solved = serializers.SerializerMethodField()
    my_code = serializers.SerializerMethodField()
    solution_code = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            "id", "title_uz", "prompt_md", "language", "starter_code",
            "hint_uz", "points", "order", "sample_tests",
            "is_solved", "my_code", "solution_code",
        ]

    def get_sample_tests(self, obj) -> list:
        rows = [test for test in obj.tests.all() if test.is_sample]
        return ExerciseTestSerializer(rows, many=True).data

    def get_is_solved(self, obj) -> bool:
        return obj.id in (self.context.get("solved_exercises") or set())

    def get_my_code(self, obj) -> str:
        attempt = (self.context.get("last_attempts") or {}).get(obj.id)
        return attempt.code if attempt else ""

    def get_solution_code(self, obj) -> str:
        """Namuna yechim faqat topshiriq bajarilgach ochiladi."""
        if obj.id in (self.context.get("solved_exercises") or set()):
            return obj.solution_code
        return ""


class LessonNavSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ["slug", "title_uz"]


class LessonDetailSerializer(serializers.ModelSerializer):
    course_slug = serializers.CharField(source="course.slug", read_only=True)
    course_title = serializers.CharField(source="course.title_uz", read_only=True)
    course_language = serializers.CharField(source="course.language", read_only=True)
    module_title = serializers.CharField(source="module.title_uz", read_only=True)

    examples = ExampleSerializer(many=True, read_only=True)
    quiz_questions = QuizQuestionSerializer(many=True, read_only=True)
    exercises = serializers.SerializerMethodField()

    my_state = serializers.SerializerMethodField()
    previous = serializers.SerializerMethodField()
    next = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "slug", "title_uz", "summary_uz", "content_md", "order",
            "points", "estimated_minutes",
            "course_slug", "course_title", "course_language", "module_title",
            "examples", "quiz_questions", "exercises",
            "my_state", "previous", "next",
        ]

    def get_exercises(self, obj) -> list:
        return ExerciseSerializer(obj.exercises.all(), many=True, context=self.context).data

    def get_my_state(self, obj) -> dict | None:
        return self.context.get("my_state")

    def get_previous(self, obj) -> dict | None:
        row = self.context.get("previous")
        return LessonNavSerializer(row).data if row else None

    def get_next(self, obj) -> dict | None:
        row = self.context.get("next")
        return LessonNavSerializer(row).data if row else None


# ------------------------------------------------------------- kiruvchi ma'lumot


class SnippetRunSerializer(serializers.Serializer):
    """«Sinab ko'rish» — ixtiyoriy kodni bajarish."""

    language = serializers.ChoiceField(choices=["python", "javascript", "cpp"])
    code = serializers.CharField(max_length=20000)
    stdin = serializers.CharField(required=False, allow_blank=True, max_length=4000)


class ExerciseRunSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20000)
    language = serializers.ChoiceField(
        choices=["python", "javascript", "cpp"], required=False
    )


class QuizSubmitSerializer(serializers.Serializer):
    """`{"answers": {"12": 0, "13": 2}}` — savol id → tanlangan variant."""

    answers = serializers.DictField(child=serializers.IntegerField(min_value=0), allow_empty=False)


# ------------------------------------------------------- «mening kurslarim»


class MyCourseRowSerializer(serializers.Serializer):
    slug = serializers.CharField()
    title_uz = serializers.CharField()
    language = serializers.CharField()
    badge = serializers.CharField()
    accent_color = serializers.CharField()
    lesson_count = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    points_earned = serializers.IntegerField()
    completed_at = serializers.DateTimeField(allow_null=True)
    last_lesson_slug = serializers.CharField(allow_null=True)
    last_lesson_title = serializers.CharField(allow_null=True)
    updated_at = serializers.DateTimeField()
