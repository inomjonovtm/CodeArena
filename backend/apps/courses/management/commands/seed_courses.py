"""`python manage.py seed_courses` — tayyor kurslarni bazaga yozadi.

Buyruq **idempotent**: bir necha marta ishga tushirilsa ham nusxa
yaratmaydi. Yozuvlar slug bo'yicha topiladi va yangilanadi, mavzu ichidagi
misol / test / topshiriqlar esa har safar qaytadan yoziladi — ular
kontentning ajralmas qismi va qo'lda tahrirlanmaydi degan taxminga
asoslanadi.

    python manage.py seed_courses                 # hammasini
    python manage.py seed_courses --only python-asoslari
    python manage.py seed_courses --reset         # avval o'chirib, keyin

`--reset` faqat SEED kurslarini o'chiradi (slug bo'yicha), qo'lda
yaratilgan kurslarga tegmaydi.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.courses.models import (
    Course,
    Example,
    Exercise,
    ExerciseTest,
    Lesson,
    Module,
    PublishStatus,
    QuizQuestion,
)
from apps.courses.seed_data import COURSES


class Command(BaseCommand):
    help = "Tayyor kurslarni (Python, JavaScript, C++) bazaga yozadi"

    def add_arguments(self, parser):
        parser.add_argument("--only", help="Faqat shu slug bo'yicha kursni yozadi")
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Kursni avval butunlay o'chirib, qaytadan yaratadi",
        )
        parser.add_argument(
            "--draft",
            action="store_true",
            help="Kurslarni qoralama holatida yaratadi (sayt katalogida ko'rinmaydi)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        only = options.get("only")
        reset = options.get("reset")
        status = PublishStatus.DRAFT if options.get("draft") else PublishStatus.PUBLISHED

        payloads = [course for course in COURSES if not only or course["slug"] == only]
        if not payloads:
            self.stderr.write(self.style.ERROR(f"«{only}» slug bo'yicha kurs topilmadi."))
            return

        totals = {"courses": 0, "modules": 0, "lessons": 0, "exercises": 0, "questions": 0}

        for payload in payloads:
            if reset:
                Course.all_objects.filter(slug=payload["slug"]).delete()

            course = self._write_course(payload, status)
            counts = self._write_modules(course, payload["modules"])

            totals["courses"] += 1
            totals["modules"] += counts["modules"]
            totals["lessons"] += counts["lessons"]
            totals["exercises"] += counts["exercises"]
            totals["questions"] += counts["questions"]

            # Chiqishda faqat ASCII: Windows konsoli sukut bo'yicha cp1252
            # kodlashda ishlaydi va "✓" kabi belgi butun buyruqni
            # UnicodeEncodeError bilan uzib qo'yadi.
            self.stdout.write(
                self.style.SUCCESS(
                    f"  [+] {course.title_uz}: {counts['modules']} bo'lim, "
                    f"{counts['lessons']} mavzu, {counts['exercises']} topshiriq"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nTayyor: {totals['courses']} kurs, {totals['lessons']} mavzu, "
                f"{totals['exercises']} topshiriq, {totals['questions']} test savoli."
            )
        )

    # ------------------------------------------------------------------ yozish

    def _write_course(self, payload: dict, status: str) -> Course:
        course, _ = Course.all_objects.update_or_create(
            slug=payload["slug"],
            defaults={
                "title_uz": payload["title_uz"],
                "subtitle_uz": payload.get("subtitle_uz", ""),
                "description_uz": payload.get("description_uz", ""),
                "language": payload["language"],
                "level": payload.get("level", "beginner"),
                "badge": payload.get("badge", ""),
                "accent_color": payload.get("accent_color", ""),
                "estimated_hours": payload.get("estimated_hours", 0),
                "order": payload.get("order", 0),
                "is_featured": payload.get("is_featured", False),
                "status": status,
                "published_at": timezone.now() if status == PublishStatus.PUBLISHED else None,
                # Seed qayta ishga tushsa, avval savatchaga tushgan kurs tiklanadi
                "deleted_at": None,
                "deleted_by": None,
            },
        )
        return course

    def _write_modules(self, course: Course, modules: list[dict]) -> dict:
        counts = {"modules": 0, "lessons": 0, "exercises": 0, "questions": 0}
        seen_modules = []

        for index, payload in enumerate(modules):
            module, _ = Module.objects.update_or_create(
                course=course,
                slug=payload["slug"],
                defaults={
                    "title_uz": payload["title_uz"],
                    "summary_uz": payload.get("summary_uz", ""),
                    "order": index,
                },
            )
            seen_modules.append(module.id)
            counts["modules"] += 1

            lesson_counts = self._write_lessons(course, module, payload["lessons"])
            counts["lessons"] += lesson_counts["lessons"]
            counts["exercises"] += lesson_counts["exercises"]
            counts["questions"] += lesson_counts["questions"]

        # Kontentdan olib tashlangan bo'limlar bazada qolib ketmasin
        Module.objects.filter(course=course).exclude(id__in=seen_modules).delete()
        return counts

    def _write_lessons(self, course: Course, module: Module, lessons: list[dict]) -> dict:
        counts = {"lessons": 0, "exercises": 0, "questions": 0}
        seen_lessons = []

        for index, payload in enumerate(lessons):
            lesson, _ = Lesson.objects.update_or_create(
                course=course,
                slug=payload["slug"],
                defaults={
                    "module": module,
                    "title_uz": payload["title_uz"],
                    "summary_uz": payload.get("summary_uz", ""),
                    "content_md": payload.get("content_md", ""),
                    "order": index,
                    "status": PublishStatus.PUBLISHED,
                    "points": payload.get("points", 10),
                    "estimated_minutes": payload.get("estimated_minutes", 10),
                },
            )
            seen_lessons.append(lesson.id)
            counts["lessons"] += 1

            # Ichki kontent har safar qaytadan yoziladi: tartib va sonlar
            # o'zgarganda «eski qoldiq» qolib ketmasligi uchun.
            lesson.examples.all().delete()
            for order, example in enumerate(payload.get("examples", [])):
                Example.objects.create(
                    lesson=lesson,
                    title_uz=example.get("title_uz", ""),
                    language=example.get("language", course.language),
                    code=example["code"],
                    expected_output=example.get("expected_output", ""),
                    explanation_uz=example.get("explanation_uz", ""),
                    is_runnable=example.get("is_runnable", True),
                    order=order,
                )

            lesson.quiz_questions.all().delete()
            for order, question in enumerate(payload.get("quiz", [])):
                QuizQuestion.objects.create(
                    lesson=lesson,
                    question_uz=question["question_uz"],
                    options=question["options"],
                    correct_index=question["correct_index"],
                    explanation_uz=question.get("explanation_uz", ""),
                    order=order,
                )
                counts["questions"] += 1

            # Topshiriqlar slug o'rniga tartib bo'yicha emas, NOMI bo'yicha
            # emas — ular butunlay qayta yoziladi. Urinishlar (`attempts`)
            # ham shu bilan o'chadi, shuning uchun seed faqat kontent
            # yangilashda ishlatiladi, ishlab turgan bazada ehtiyot bilan.
            lesson.exercises.all().delete()
            for order, exercise_payload in enumerate(payload.get("exercises", [])):
                exercise = Exercise.objects.create(
                    lesson=lesson,
                    title_uz=exercise_payload["title_uz"],
                    prompt_md=exercise_payload["prompt_md"],
                    language=exercise_payload.get("language", course.language),
                    starter_code=exercise_payload.get("starter_code", ""),
                    solution_code=exercise_payload.get("solution_code", ""),
                    hint_uz=exercise_payload.get("hint_uz", ""),
                    points=exercise_payload.get("points", 5),
                    order=order,
                )
                counts["exercises"] += 1

                for test_order, test in enumerate(exercise_payload.get("tests", [])):
                    ExerciseTest.objects.create(
                        exercise=exercise,
                        input=test.get("input", ""),
                        expected_output=test.get("expected_output", ""),
                        is_sample=test.get("is_sample", True),
                        explanation_uz=test.get("explanation_uz", ""),
                        order=test_order,
                    )

        Lesson.objects.filter(module=module).exclude(id__in=seen_lessons).delete()
        return counts
