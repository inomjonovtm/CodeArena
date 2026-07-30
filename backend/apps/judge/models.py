from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel
from apps.problems.models import Language, Problem, TestCase


class SubmissionStatus(models.TextChoices):
    """8-bo'lim: submission holatlari."""

    PENDING = "PENDING", "Navbatda"
    JUDGING = "JUDGING", "Tekshirilmoqda"
    ACCEPTED = "ACCEPTED", "Qabul qilindi"
    WRONG_ANSWER = "WRONG_ANSWER", "Noto'g'ri javob"
    TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED", "Vaqt tugadi"
    MEMORY_LIMIT_EXCEEDED = "MEMORY_LIMIT_EXCEEDED", "Xotira yetmadi"
    RUNTIME_ERROR = "RUNTIME_ERROR", "Bajarilish xatosi"
    COMPILE_ERROR = "COMPILE_ERROR", "Kompilyatsiya xatosi"
    SYSTEM_ERROR = "SYSTEM_ERROR", "Tizim xatosi"


FINAL_STATUSES = {
    SubmissionStatus.ACCEPTED,
    SubmissionStatus.WRONG_ANSWER,
    SubmissionStatus.TIME_LIMIT_EXCEEDED,
    SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
    SubmissionStatus.RUNTIME_ERROR,
    SubmissionStatus.COMPILE_ERROR,
    SubmissionStatus.SYSTEM_ERROR,
}


class Submission(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submissions")
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="submissions")
    contest = models.ForeignKey(
        "contests.Contest", null=True, blank=True, on_delete=models.SET_NULL, related_name="submissions"
    )

    language = models.CharField(max_length=16, choices=Language.choices, db_index=True)
    code = models.TextField()
    code_length = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=24, choices=SubmissionStatus.choices,
        default=SubmissionStatus.PENDING, db_index=True,
    )
    runtime_ms = models.PositiveIntegerField(null=True, blank=True)
    memory_kb = models.PositiveIntegerField(null=True, blank=True)
    score = models.PositiveIntegerField(default=0)

    passed_tests = models.PositiveIntegerField(default=0)
    total_tests = models.PositiveIntegerField(default=0)
    failed_test_index = models.PositiveIntegerField(
        null=True, blank=True, help_text="Nechanchi testda xato (1 dan boshlab)"
    )
    error_message = models.TextField(blank=True)
    compile_output = models.TextField(blank=True)

    is_practice = models.BooleanField(default=True, help_text="Contestdan tashqari yechim")
    is_first_accepted = models.BooleanField(default=False)
    is_counted = models.BooleanField(
        default=False, help_text="Statistika hisoblagichlariga qo'shilganmi (rejudge takrorlamasligi uchun)"
    )
    judge_tokens = models.JSONField(default=list, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    judged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "submissions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["problem", "status"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.problem} [{self.status}]"

    @property
    def is_final(self) -> bool:
        return self.status in FINAL_STATUSES

    def save(self, *args, **kwargs):
        self.code_length = len(self.code or "")
        super().save(*args, **kwargs)


class SubmissionTestResult(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="test_results")
    test_case = models.ForeignKey(TestCase, null=True, on_delete=models.SET_NULL, related_name="results")
    order = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=24, choices=SubmissionStatus.choices)
    runtime_ms = models.PositiveIntegerField(null=True, blank=True)
    memory_kb = models.PositiveIntegerField(null=True, blank=True)
    stdout = models.TextField(blank=True, help_text="Faqat sample testlar uchun saqlanadi")
    stderr = models.TextField(blank=True)
    is_sample = models.BooleanField(default=False)

    class Meta:
        db_table = "submission_test_results"
        ordering = ["order"]

    def __str__(self) -> str:
        return f"#{self.order} {self.status}"
