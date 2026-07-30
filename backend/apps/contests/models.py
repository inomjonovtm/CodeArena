from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel, SoftDeleteModel, TimeStampedModel
from apps.problems.models import Problem


class ContestStatus(models.TextChoices):
    DRAFT = "draft", "Qoralama"
    SCHEDULED = "scheduled", "Rejalashtirilgan"
    RUNNING = "running", "Davom etmoqda"
    FINISHED = "finished", "Tugagan"
    CANCELLED = "cancelled", "Bekor qilingan"


class ContestVisibility(models.TextChoices):
    PUBLIC = "public", "Ochiq"
    PRIVATE = "private", "Yopiq (parol bilan)"


class Contest(SoftDeleteModel, BaseModel):
    """11-bo'lim: contest formatlari."""

    slug = models.SlugField(max_length=120, unique=True)
    title_uz = models.CharField(max_length=160)
    title_en = models.CharField(max_length=160, blank=True)
    description_uz = models.TextField(blank=True)
    description_en = models.TextField(blank=True)

    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=120)

    status = models.CharField(
        max_length=12, choices=ContestStatus.choices, default=ContestStatus.DRAFT, db_index=True
    )
    visibility = models.CharField(
        max_length=10, choices=ContestVisibility.choices, default=ContestVisibility.PUBLIC
    )
    access_password = models.CharField(max_length=64, blank=True)

    is_rated = models.BooleanField(default=True, help_text="Reyting o'zgaradimi (7-bo'lim)")
    is_virtual_allowed = models.BooleanField(default=True)
    max_participants = models.PositiveIntegerField(null=True, blank=True)

    rating_k_new = models.PositiveIntegerField(default=40, help_text="Yangi userlar uchun K")
    rating_k_experienced = models.PositiveIntegerField(default=20)

    plagiarism_checked_at = models.DateTimeField(null=True, blank=True)
    ratings_applied_at = models.DateTimeField(null=True, blank=True)
    # Boshlanish eslatmasi yuborilgan vaqt — takroriy xabar ketmasligi uchun
    # (`tasks.send_contest_reminders` ga qarang)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="created_contests",
    )

    class Meta:
        db_table = "contests"
        ordering = ["-start_time"]

    def __str__(self) -> str:
        return self.title_uz

    @property
    def computed_status(self) -> str:
        if self.status in {ContestStatus.DRAFT, ContestStatus.CANCELLED}:
            return self.status
        now = timezone.now()
        if now < self.start_time:
            return ContestStatus.SCHEDULED
        if now <= self.end_time:
            return ContestStatus.RUNNING
        return ContestStatus.FINISHED


class ContestProblem(models.Model):
    contest = models.ForeignKey(Contest, on_delete=models.CASCADE, related_name="contest_problems")
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="contest_entries")
    order = models.PositiveIntegerField(default=0)
    label = models.CharField(max_length=4, blank=True, help_text="A, B, C ...")
    points = models.PositiveIntegerField(default=100)

    class Meta:
        db_table = "contest_problems"
        ordering = ["order"]
        unique_together = [("contest", "problem")]

    def __str__(self) -> str:
        return f"{self.contest} / {self.label or self.order}"


class ContestParticipant(TimeStampedModel):
    contest = models.ForeignKey(Contest, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contest_entries")

    rank = models.PositiveIntegerField(null=True, blank=True)
    score = models.IntegerField(default=0)
    penalty = models.IntegerField(default=0, help_text="Daqiqalarda")
    solved_count = models.PositiveIntegerField(default=0)

    rating_before = models.IntegerField(null=True, blank=True)
    rating_after = models.IntegerField(null=True, blank=True)
    rating_change = models.IntegerField(default=0)

    is_virtual = models.BooleanField(default=False)
    is_disqualified = models.BooleanField(default=False)
    disqualify_reason = models.CharField(max_length=255, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "contest_participants"
        unique_together = [("contest", "user")]
        ordering = ["rank", "-score", "penalty"]

    def __str__(self) -> str:
        return f"{self.user} @ {self.contest}"
