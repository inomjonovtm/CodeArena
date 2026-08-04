"""Kurslar — dasturlash tillarini bosqichma-bosqich o'rgatuvchi bo'lim.

Tuzilma to'rt pog'onali va W3Schools ohangida qurilgan:

    Kurs (Course)          — bitta til: Python, JavaScript, C++
      └ Bo'lim (Module)    — mavzular guruhi: «Asoslar», «Sikllar»
          └ Mavzu (Lesson) — bitta o'quv birligi: nazariya + misollar
              ├ Misol (Example)      — tayyor kod + chiqishi («Sinab ko'rish»)
              ├ Savol (QuizQuestion) — mavzu oxiridagi test
              └ Topshiriq (Exercise) — kod yozib yechiladigan mashq

Nega masalalar (`apps.problems`) qayta ishlatilmadi: masala mustaqil
birlik — reyting, musobaqa, plagiat tekshiruvi, xatcho'p va muhokamaga
ulangan. Kurs topshirig'i esa mavzuga bog'langan mashq: u global reytingga
ta'sir qilmasligi, tayyor kod (starter) bilan ochilishi va faqat shu
mavzu ichida ma'no kasb etishi kerak. Ikkalasini bitta modelga tiqish
`Problem` ni ikki xil hayotga majburlardi.

Kod bajarish esa TO'LIQ qayta ishlatiladi: `apps.judge.engine` ham
masalada, ham topshiriqda bir xil ishlaydi (`grading.py` ga qarang).
"""
from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel, SoftDeleteModel, TimeStampedModel


class CourseLanguage(models.TextChoices):
    """Judge qo'llab-quvvatlaydigan tillar bilan bir xil ro'yxat.

    Kursda o'rgatiladigan til bevosita kod bajaruvchiga uzatiladi, shuning
    uchun bu yerga judge bilmaydigan tilni qo'shib bo'lmaydi — aks holda
    topshiriq ochiladi-yu, «Ishga tushirish» tugmasi hech qachon ishlamaydi.
    """

    PYTHON = "python", "Python"
    JAVASCRIPT = "javascript", "JavaScript"
    CPP = "cpp", "C++"


class CourseLevel(models.TextChoices):
    BEGINNER = "beginner", "Boshlang'ich"
    INTERMEDIATE = "intermediate", "O'rta"
    ADVANCED = "advanced", "Yuqori"


class PublishStatus(models.TextChoices):
    DRAFT = "draft", "Qoralama"
    PUBLISHED = "published", "Chop etilgan"
    ARCHIVED = "archived", "Arxivlangan"


# ============================================================== o'quv kontenti


class Course(SoftDeleteModel, BaseModel):
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    title_uz = models.CharField(max_length=160)
    subtitle_uz = models.CharField(
        max_length=220, blank=True, help_text="Katalogdagi bir qatorli izoh"
    )
    description_uz = models.TextField(blank=True, help_text="Markdown — kurs sahifasidagi tavsif")

    language = models.CharField(
        max_length=16, choices=CourseLanguage.choices, default=CourseLanguage.PYTHON, db_index=True
    )
    level = models.CharField(
        max_length=14, choices=CourseLevel.choices, default=CourseLevel.BEGINNER, db_index=True
    )
    status = models.CharField(
        max_length=12, choices=PublishStatus.choices, default=PublishStatus.DRAFT, db_index=True
    )

    # Katalogdagi karta uchun: qisqa belgi (`Py`, `JS`, `C++`) va urg'u rangi.
    # Rasm emas — kartalar bir xil o'lchamda qoladi va yuklanishni kutmaydi.
    badge = models.CharField(max_length=6, blank=True, help_text="Kartadagi qisqa belgi: Py, JS, C++")
    accent_color = models.CharField(max_length=7, blank=True, help_text="HEX rang, masalan #1e5eff")

    order = models.PositiveIntegerField(default=0, help_text="Katalogdagi tartib")
    is_featured = models.BooleanField(default=False, help_text="Katalog tepasida ajratib ko'rsatiladi")
    estimated_hours = models.PositiveIntegerField(default=0, help_text="Taxminiy o'quv soati")

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="authored_courses",
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "courses"
        ordering = ["order", "title_uz"]
        indexes = [
            models.Index(fields=["status", "language"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self) -> str:
        return self.title_uz

    @property
    def is_published(self) -> bool:
        return self.status == PublishStatus.PUBLISHED


class Module(BaseModel):
    """Bo'lim — mavzularni ma'no bo'yicha guruhlaydi."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    title_uz = models.CharField(max_length=160)
    slug = models.SlugField(max_length=140)
    summary_uz = models.CharField(max_length=300, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_modules"
        ordering = ["order", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["course", "slug"], name="uniq_module_slug_per_course"),
        ]

    def __str__(self) -> str:
        return f"{self.course.title_uz} — {self.title_uz}"


class Lesson(BaseModel):
    """Mavzu — nazariya matni va uning ostidagi mashqlar.

    `course` maydoni bo'limdan NUSXALANADI (`save()` da). Sabab: manzil
    `/courses/<kurs>/<mavzu>` ko'rinishida va slug faqat kurs ichida noyob
    bo'lishi kerak. Django bir nechta jadval orqali o'tuvchi (`module__course`)
    unique constraint yasay olmaydi, shuning uchun kurs bevosita shu yerda
    turadi va constraint oddiy ikki maydonga qo'yiladi.
    """

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="lessons")

    title_uz = models.CharField(max_length=180)
    slug = models.SlugField(max_length=160)
    summary_uz = models.CharField(max_length=300, blank=True)
    content_md = models.TextField(blank=True, help_text="Nazariya — Markdown")
    order = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=12, choices=PublishStatus.choices, default=PublishStatus.PUBLISHED, db_index=True
    )
    points = models.PositiveIntegerField(default=10, help_text="Mavzu yakunlanganda beriladigan ball")
    estimated_minutes = models.PositiveIntegerField(default=10)

    class Meta:
        db_table = "course_lessons"
        ordering = ["order", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["course", "slug"], name="uniq_lesson_slug_per_course"),
        ]
        indexes = [models.Index(fields=["course", "status"])]

    def __str__(self) -> str:
        return self.title_uz

    def save(self, *args, **kwargs):
        # Bo'lim ko'chirilsa mavzu ham yangi kursga o'tadi — ikkita manba
        # bo'lib qolmasligi uchun kurs har safar bo'limdan olinadi.
        if self.module_id:
            self.course_id = self.module.course_id
        super().save(*args, **kwargs)


class Example(TimeStampedModel):
    """Kod misoli — «Misol» bloki va uning «Sinab ko'rish» muharriri.

    Chiqish (`expected_output`) qo'lda yoziladi: sahifa ochilishida kod
    bajarilmaydi (har bir tashrif uchun judge chaqirish qimmat va sekin),
    foydalanuvchi tugmani bosganda esa haqiqiy natija shu yerdagi matn
    ostida ko'rsatiladi.
    """

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="examples")
    title_uz = models.CharField(max_length=180, blank=True)
    language = models.CharField(
        max_length=16, choices=CourseLanguage.choices, default=CourseLanguage.PYTHON
    )
    code = models.TextField()
    expected_output = models.TextField(blank=True, help_text="Kod nima chiqarishi kutiladi")
    explanation_uz = models.TextField(blank=True, help_text="Misol ostidagi izoh — Markdown")
    is_runnable = models.BooleanField(default=True, help_text="«Sinab ko'rish» tugmasi ko'rinadi")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_examples"
        ordering = ["order", "created_at"]
        indexes = [models.Index(fields=["lesson", "order"])]

    def __str__(self) -> str:
        return self.title_uz or f"Misol #{self.order}"


class QuizQuestion(TimeStampedModel):
    """Mavzu oxiridagi test savoli — bitta to'g'ri javobli."""

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="quiz_questions")
    question_uz = models.TextField()
    # Variantlar ro'yxati: ["1", "2", "3"]. Alohida jadval yasalmadi —
    # variantlar hech qachon savoldan mustaqil ishlatilmaydi va ular ustida
    # qidiruv/filtr qilinmaydi.
    options = models.JSONField(default=list, help_text="Variantlar ro'yxati (matn massivi)")
    correct_index = models.PositiveIntegerField(default=0, help_text="To'g'ri variant tartibi (0 dan)")
    explanation_uz = models.TextField(blank=True, help_text="Javobdan keyin ko'rinadigan izoh")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_quiz_questions"
        ordering = ["order", "created_at"]
        indexes = [models.Index(fields=["lesson", "order"])]

    def __str__(self) -> str:
        return self.question_uz[:60]

    @property
    def correct_answer(self) -> str:
        options = self.options or []
        if 0 <= self.correct_index < len(options):
            return str(options[self.correct_index])
        return ""


class Exercise(BaseModel):
    """Topshiriq — mavzu ostida kod yozib bajariladigan mashq.

    Tekshirish masalalardagidek: dastur stdin'dan o'qiydi, stdout'ga
    yozadi, natija kutilgan chiqish bilan solishtiriladi. Kirish talab
    qilmaydigan topshiriqda test bitta bo'ladi va `input` bo'sh qoladi.
    """

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="exercises")
    title_uz = models.CharField(max_length=180)
    prompt_md = models.TextField(help_text="Topshiriq sharti — Markdown")
    language = models.CharField(
        max_length=16, choices=CourseLanguage.choices, default=CourseLanguage.PYTHON
    )
    starter_code = models.TextField(blank=True, help_text="Muharrirda ochiladigan boshlang'ich kod")
    solution_code = models.TextField(blank=True, help_text="Namuna yechim — mashq bajarilgach ochiladi")
    hint_uz = models.TextField(blank=True, help_text="Yordam — foydalanuvchi so'raganda ochiladi")

    points = models.PositiveIntegerField(default=5)
    order = models.PositiveIntegerField(default=0)
    time_limit_ms = models.PositiveIntegerField(default=5000)
    memory_limit_kb = models.PositiveIntegerField(default=262144)

    class Meta:
        db_table = "course_exercises"
        ordering = ["order", "created_at"]
        indexes = [models.Index(fields=["lesson", "order"])]

    def __str__(self) -> str:
        return self.title_uz


class ExerciseTest(TimeStampedModel):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="tests")
    input = models.TextField(blank=True)
    expected_output = models.TextField(blank=True)
    is_sample = models.BooleanField(
        default=True, help_text="Ochiq test — foydalanuvchiga ko'rinadi va «Ishga tushirish»da ishlatiladi"
    )
    explanation_uz = models.CharField(max_length=300, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_exercise_tests"
        ordering = ["order", "created_at"]
        indexes = [models.Index(fields=["exercise", "is_sample"])]

    def __str__(self) -> str:
        return f"#{self.order} ({'ochiq' if self.is_sample else 'yopiq'})"


# =================================================================== progress


class Enrollment(TimeStampedModel):
    """Kursga yozilish — foydalanuvchining kursdagi umumiy holati."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_enrollments"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    last_lesson = models.ForeignKey(
        Lesson, null=True, blank=True, on_delete=models.SET_NULL, related_name="+",
        help_text="«Davom etish» tugmasi shu mavzuga qaytaradi",
    )
    points_earned = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "course_enrollments"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="uniq_enrollment_per_course"),
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.course}"


class LessonProgress(TimeStampedModel):
    """Bitta mavzu bo'yicha holat.

    Uch shart alohida saqlanadi (o'qildi / test / topshiriqlar), chunki
    interfeys foydalanuvchiga aynan NIMA qolganini ko'rsatishi kerak —
    bitta «tugallandi» bayrog'i buni ayta olmaydi.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lesson_progress"
    )
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="progress_rows")

    read_at = models.DateTimeField(null=True, blank=True)
    quiz_best_score = models.PositiveIntegerField(default=0)
    quiz_total = models.PositiveIntegerField(default=0)
    quiz_passed_at = models.DateTimeField(null=True, blank=True)
    exercises_solved = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "course_lesson_progress"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "lesson"], name="uniq_progress_per_lesson"),
        ]
        indexes = [models.Index(fields=["user", "lesson"])]

    def __str__(self) -> str:
        return f"{self.user} — {self.lesson}"


class ExerciseAttempt(BaseModel):
    """Topshiriqqa yuborilgan urinish.

    `Submission` dan farqi: bu yozuv reytingga, plagiat tekshiruviga va
    musobaqa jadvaliga tegmaydi — u faqat mavzu progressini hisoblash va
    foydalanuvchiga oxirgi kodini qaytarish uchun kerak.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="exercise_attempts"
    )
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="attempts")
    language = models.CharField(max_length=16, choices=CourseLanguage.choices)
    code = models.TextField()
    status = models.CharField(max_length=24, default="PENDING")
    is_correct = models.BooleanField(default=False, db_index=True)
    passed_tests = models.PositiveIntegerField(default=0)
    total_tests = models.PositiveIntegerField(default=0)
    runtime_ms = models.PositiveIntegerField(null=True, blank=True)
    error_output = models.TextField(blank=True)

    class Meta:
        db_table = "course_exercise_attempts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "exercise", "-created_at"]),
            models.Index(fields=["exercise", "is_correct"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.exercise} ({self.status})"


class QuizAttempt(TimeStampedModel):
    """Mavzu testining bitta topshirilishi — javoblari bilan birga."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_attempts"
    )
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="quiz_attempts")
    # {"<savol_id>": <tanlangan_variant>} — savol o'chirilsa ham urinish tarixi buzilmaydi
    answers = models.JSONField(default=dict)
    score = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    is_passed = models.BooleanField(default=False)

    class Meta:
        db_table = "course_quiz_attempts"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "lesson", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.user} — {self.lesson} ({self.score}/{self.total})"
