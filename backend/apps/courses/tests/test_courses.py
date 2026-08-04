"""Kurslar API'si va progress mantiqi.

Bu yerdagi testlarning ko'pi FUNKSIYANI emas, CHEGARANI tekshiradi:
to'g'ri javob va namuna yechim vaqtidan oldin ochilib ketmasligi,
qoralama kurs katalogda ko'rinmasligi va mavzu barcha shartlar
bajarilmaguncha «tugallandi» bo'lib qolmasligi.
"""
from __future__ import annotations

from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.courses import progress as progress_service
from apps.courses.models import (
    Course,
    Enrollment,
    Example,
    Exercise,
    ExerciseAttempt,
    ExerciseTest,
    Lesson,
    LessonProgress,
    Module,
    PublishStatus,
    QuizQuestion,
)


def build_course(*, status_value: str = PublishStatus.PUBLISHED) -> tuple[Course, Lesson]:
    course = Course.objects.create(
        slug="test-kurs", title_uz="Test kurs", language="python", status=status_value
    )
    module = Module.objects.create(course=course, slug="bolim", title_uz="Bo'lim", order=0)
    lesson = Lesson.objects.create(
        module=module, slug="mavzu", title_uz="Mavzu", content_md="Matn", order=0, points=10
    )
    Example.objects.create(lesson=lesson, code="print(1)", expected_output="1", order=0)
    return course, lesson


class CatalogTests(APITestCase):
    def test_published_course_is_listed(self):
        build_course()
        response = self.client.get("/api/courses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["slug"], "test-kurs")

    def test_draft_course_is_hidden(self):
        build_course(status_value=PublishStatus.DRAFT)
        response = self.client.get("/api/courses/")
        self.assertEqual(response.data, [])

    def test_draft_course_detail_returns_404(self):
        build_course(status_value=PublishStatus.DRAFT)
        response = self.client.get("/api/courses/test-kurs/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_can_read_lesson(self):
        """O'quv materiali ro'yxatdan o'tishni talab qilmaydi."""
        build_course()
        response = self.client.get("/api/courses/test-kurs/lessons/mavzu/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content_md"], "Matn")
        self.assertEqual(len(response.data["examples"]), 1)


class QuizTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.course, self.lesson = build_course()
        self.question = QuizQuestion.objects.create(
            lesson=self.lesson,
            question_uz="2 + 2 = ?",
            options=["3", "4", "5"],
            correct_index=1,
            explanation_uz="Ikki qo'shuv ikki — to'rt.",
            order=0,
        )
        self.user = User.objects.create_user(
            username="oquvchi", email="o@example.com", password="TogriParol2026!"
        )

    def test_correct_answer_is_not_exposed_in_lesson(self):
        response = self.client.get("/api/courses/test-kurs/lessons/mavzu/")
        payload = response.data["quiz_questions"][0]
        self.assertNotIn("correct_index", payload)
        self.assertNotIn("explanation_uz", payload)

    def test_quiz_requires_authentication(self):
        response = self.client.post(
            "/api/courses/test-kurs/lessons/mavzu/quiz/",
            {"answers": {str(self.question.id): 1}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_passing_quiz_records_progress(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/courses/test-kurs/lessons/mavzu/quiz/",
            {"answers": {str(self.question.id): 1}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["score"], 1)
        self.assertTrue(response.data["is_passed"])
        # To'g'ri javob endi — javobdan KEYIN — ochiladi
        self.assertEqual(response.data["results"][0]["correct_index"], 1)

        row = LessonProgress.objects.get(user=self.user, lesson=self.lesson)
        self.assertIsNotNone(row.quiz_passed_at)

    def test_wrong_answer_does_not_pass(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/courses/test-kurs/lessons/mavzu/quiz/",
            {"answers": {str(self.question.id): 0}},
            format="json",
        )
        self.assertFalse(response.data["is_passed"])
        row = LessonProgress.objects.get(user=self.user, lesson=self.lesson)
        self.assertIsNone(row.quiz_passed_at)


class ExerciseVisibilityTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.course, self.lesson = build_course()
        self.exercise = Exercise.objects.create(
            lesson=self.lesson,
            title_uz="Topshiriq",
            prompt_md="Yig'indini chiqaring",
            language="python",
            starter_code="",
            solution_code="print(3)",
            order=0,
        )
        ExerciseTest.objects.create(
            exercise=self.exercise, input="", expected_output="3", is_sample=True, order=0
        )
        ExerciseTest.objects.create(
            exercise=self.exercise, input="", expected_output="3", is_sample=False, order=1
        )
        self.user = User.objects.create_user(
            username="oquvchi", email="o@example.com", password="TogriParol2026!"
        )

    def test_solution_hidden_until_solved(self):
        response = self.client.get("/api/courses/test-kurs/lessons/mavzu/")
        payload = response.data["exercises"][0]
        self.assertEqual(payload["solution_code"], "")
        # Yopiq test ham berilmaydi
        self.assertEqual(len(payload["sample_tests"]), 1)

    def test_solution_visible_after_correct_attempt(self):
        ExerciseAttempt.objects.create(
            user=self.user, exercise=self.exercise, language="python",
            code="print(3)", status="ACCEPTED", is_correct=True,
            passed_tests=2, total_tests=2,
        )
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/courses/test-kurs/lessons/mavzu/")
        payload = response.data["exercises"][0]
        self.assertTrue(payload["is_solved"])
        self.assertEqual(payload["solution_code"], "print(3)")

    def test_run_requires_authentication(self):
        response = self.client.post(
            f"/api/courses/exercises/{self.exercise.id}/run/", {"code": "print(3)"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProgressTests(APITestCase):
    """Mavzu «tugallandi» bo'lishi uchun BARCHA shart bajarilishi kerak."""

    def setUp(self):
        super().setUp()
        self.course, self.lesson = build_course()
        self.user = User.objects.create_user(
            username="oquvchi", email="o@example.com", password="TogriParol2026!"
        )

    def test_reading_completes_lesson_without_quiz_or_exercise(self):
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/courses/test-kurs/lessons/mavzu/read/")
        self.assertTrue(response.data["is_completed"])

    def test_unsolved_exercise_blocks_completion(self):
        exercise = Exercise.objects.create(
            lesson=self.lesson, title_uz="T", prompt_md="P", language="python", order=0
        )
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/courses/test-kurs/lessons/mavzu/read/")
        self.assertFalse(response.data["is_completed"])

        ExerciseAttempt.objects.create(
            user=self.user, exercise=exercise, language="python", code="x",
            status="ACCEPTED", is_correct=True, passed_tests=1, total_tests=1,
        )
        row = progress_service.sync_lesson(self.user, self.lesson)
        self.assertIsNotNone(row.completed_at)

    def test_unpassed_quiz_blocks_completion(self):
        QuizQuestion.objects.create(
            lesson=self.lesson, question_uz="?", options=["a", "b"], correct_index=0, order=0
        )
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/courses/test-kurs/lessons/mavzu/read/")
        self.assertFalse(response.data["is_completed"])

    def test_opening_lesson_creates_enrollment(self):
        self.client.force_authenticate(self.user)
        self.client.get("/api/courses/test-kurs/lessons/mavzu/")
        enrollment = Enrollment.objects.get(user=self.user, course=self.course)
        self.assertEqual(enrollment.last_lesson_id, self.lesson.id)

    def test_completed_lesson_awards_course_points(self):
        self.client.force_authenticate(self.user)
        self.client.post("/api/courses/test-kurs/lessons/mavzu/read/")
        enrollment = Enrollment.objects.get(user=self.user, course=self.course)
        self.assertEqual(enrollment.points_earned, 10)
        self.assertIsNotNone(enrollment.completed_at)


class JudgeAvailabilityTests(APITestCase):
    """Serverda yo'q til uchun tushunarli xabar qaytishi kerak."""

    def test_unavailable_language_raises_with_reason(self):
        from unittest.mock import patch

        from apps.courses import grading

        with patch.object(grading.engine, "supported_languages", return_value={"python": True}):
            with self.assertRaises(grading.JudgeUnavailable) as ctx:
                grading.run_snippet(language="cpp", code="int main(){}")

        # Xabarda AYNAN qaysi til ekani turishi kerak — «tizim xatosi» emas
        self.assertIn("C++", str(ctx.exception))

    def test_no_backend_at_all(self):
        from unittest.mock import patch

        from apps.courses import grading

        with patch.object(grading.engine, "supported_languages", return_value={}):
            with self.assertRaises(grading.JudgeUnavailable):
                grading.run_snippet(language="python", code="print(1)")


class LessonModelTests(APITestCase):
    def test_lesson_course_follows_module(self):
        """`Lesson.course` bo'limdan olinadi — qo'lda berilgani e'tiborga olinmaydi."""
        first, _ = build_course()
        second = Course.objects.create(slug="ikkinchi", title_uz="Ikkinchi", language="python")
        module = Module.objects.create(course=second, slug="b", title_uz="B", order=0)

        lesson = Lesson.objects.create(module=module, slug="m", title_uz="M", course=first)
        lesson.refresh_from_db()
        self.assertEqual(lesson.course_id, second.id)
