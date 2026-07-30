from __future__ import annotations

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.core.models import BaseModel, SoftDeleteModel, TimeStampedModel


class Difficulty(models.TextChoices):
    EASY = "easy", "Oson"
    MEDIUM = "medium", "O'rta"
    HARD = "hard", "Qiyin"


DEFAULT_POINTS = {Difficulty.EASY: 10, Difficulty.MEDIUM: 30, Difficulty.HARD: 50}


class ProblemStatus(models.TextChoices):
    DRAFT = "draft", "Qoralama"
    PUBLISHED = "published", "Chop etilgan"
    ARCHIVED = "archived", "Arxivlangan"


class Language(models.TextChoices):
    PYTHON = "python", "Python"
    JAVASCRIPT = "javascript", "JavaScript"
    CPP = "cpp", "C++"


class Tag(TimeStampedModel):
    name_uz = models.CharField(max_length=60)
    name_en = models.CharField(max_length=60)
    slug = models.SlugField(max_length=70, unique=True)
    color = models.CharField(max_length=7, default="#10b981", help_text="HEX rang")
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "tags"
        ordering = ["name_en"]

    def __str__(self) -> str:
        return self.name_en


class Problem(SoftDeleteModel, BaseModel):
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    title_uz = models.CharField(max_length=160)
    # 15-bo'lim: avval o'zbekcha, inglizcha tarjima bosqichma-bosqich qo'shiladi
    title_en = models.CharField(max_length=160, blank=True)

    difficulty = models.CharField(
        max_length=8, choices=Difficulty.choices, default=Difficulty.EASY, db_index=True
    )
    points = models.PositiveIntegerField(default=10, validators=[MinValueValidator(1)])
    status = models.CharField(
        max_length=12, choices=ProblemStatus.choices, default=ProblemStatus.DRAFT, db_index=True
    )

    description_uz = models.TextField(help_text="Markdown")
    description_en = models.TextField(blank=True, help_text="Markdown")
    constraints_uz = models.TextField(blank=True)
    constraints_en = models.TextField(blank=True)
    hint_uz = models.TextField(blank=True)
    hint_en = models.TextField(blank=True)
    editorial_uz = models.TextField(blank=True)
    editorial_en = models.TextField(blank=True)

    tags = models.ManyToManyField(Tag, blank=True, related_name="problems")

    starter_code_python = models.TextField(blank=True)
    starter_code_javascript = models.TextField(blank=True)
    starter_code_cpp = models.TextField(blank=True)
    solution_code_python = models.TextField(blank=True, help_text="Ichki foydalanish uchun etalon yechim")

    time_limit_ms = models.PositiveIntegerField(default=2000)
    memory_limit_kb = models.PositiveIntegerField(default=262144)

    is_premium = models.BooleanField(default=False)
    is_contest_only = models.BooleanField(
        default=False, help_text="Contest tugagunga qadar ommaviy ro'yxatda ko'rinmaydi (11-bo'lim)"
    )

    total_submissions = models.PositiveIntegerField(default=0)
    accepted_submissions = models.PositiveIntegerField(default=0)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="authored_problems",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    publish_at = models.DateTimeField(
        null=True, blank=True, db_index=True,
        help_text="Belgilangan vaqtda avtomatik chop etiladi",
    )
    cover_image_url = models.URLField(blank=True)

    class Meta:
        db_table = "problems"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "difficulty"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self) -> str:
        return self.title_en or self.title_uz

    @property
    def acceptance_rate(self) -> float:
        if not self.total_submissions:
            return 0.0
        return round(self.accepted_submissions / self.total_submissions * 100, 1)

    def title(self, locale: str = "uz") -> str:
        return (self.title_en if locale == "en" else self.title_uz) or self.title_uz


class TestCase(TimeStampedModel):
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="test_cases")
    order = models.PositiveIntegerField(default=0)
    input = models.TextField(blank=True)
    expected_output = models.TextField(blank=True)
    is_sample = models.BooleanField(default=False, help_text="Ochiq (namuna) test — foydalanuvchiga ko'rinadi")
    explanation_uz = models.TextField(blank=True)
    explanation_en = models.TextField(blank=True)
    time_limit_ms = models.PositiveIntegerField(null=True, blank=True, help_text="Bo'sh bo'lsa masala limiti")
    memory_limit_kb = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        db_table = "test_cases"
        ordering = ["order", "created_at"]
        indexes = [models.Index(fields=["problem", "is_sample"])]

    def __str__(self) -> str:
        kind = "sample" if self.is_sample else "hidden"
        return f"#{self.order} ({kind})"

    @property
    def effective_time_limit(self) -> int:
        return self.time_limit_ms or self.problem.time_limit_ms

    @property
    def effective_memory_limit(self) -> int:
        return self.memory_limit_kb or self.problem.memory_limit_kb


class DailyChallenge(TimeStampedModel):
    """16-bo'lim: kunlik masala."""

    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="daily_challenges")
    date = models.DateField(unique=True, db_index=True)
    bonus_points = models.PositiveIntegerField(default=5)
    note_uz = models.CharField(max_length=200, blank=True)
    note_en = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "daily_challenges"
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.date} — {self.problem}"


class Bookmark(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookmarks")
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="bookmarks")
    note = models.TextField(blank=True, help_text="Shaxsiy izoh")

    class Meta:
        db_table = "bookmarks"
        unique_together = [("user", "problem")]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user} → {self.problem}"


class SolvedProblem(TimeStampedModel):
    """Foydalanuvchi qaysi masalani yechganini kuzatish (ball takrorlanmasligi uchun)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="solved_problems")
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="solvers")
    first_solved_at = models.DateTimeField(auto_now_add=True)
    points_awarded = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "solved_problems"
        unique_together = [("user", "problem")]
        ordering = ["-first_solved_at"]

    def __str__(self) -> str:
        return f"{self.user} ✓ {self.problem}"
