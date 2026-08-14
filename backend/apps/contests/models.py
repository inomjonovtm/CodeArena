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


class ScoringRule(models.TextChoices):
    """Natijalar qanday hisoblanadi."""

    ICPC = "icpc", "ICPC — yechilgan masala soni va jarima vaqti"
    IOI = "ioi", "IOI — har bir masaladan qisman ball"


class ParticipationMode(models.TextChoices):
    NORMAL = "normal", "Hamma uchun bir vaqtda boshlanadi"
    WINDOW = "window", "Har kim o'zi tanlagan vaqtda boshlaydi"


class TeamMode(models.TextChoices):
    SOLO = "solo", "Yakka"
    TEAM = "team", "Jamoa"


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

    # --- format
    scoring = models.CharField(
        max_length=8, choices=ScoringRule.choices, default=ScoringRule.ICPC
    )
    participation = models.CharField(
        max_length=8, choices=ParticipationMode.choices, default=ParticipationMode.NORMAL
    )
    team_mode = models.CharField(max_length=8, choices=TeamMode.choices, default=TeamMode.SOLO)
    allowed_languages = models.JSONField(
        default=list, blank=True,
        help_text="Ruxsat etilgan tillar ro'yxati. Bo'sh bo'lsa — hammasi.",
    )
    editorial_uz = models.TextField(blank=True, help_text="Tahlil — musobaqa tugagach ochiladi")
    registration_ends_at = models.DateTimeField(null=True, blank=True)

    # --- kirish shartlari
    min_rating = models.IntegerField(null=True, blank=True, help_text="Shu reytingdan pastlar kira olmaydi")
    max_rating = models.IntegerField(null=True, blank=True, help_text="Shu reytingdan yuqorilar kira olmaydi")
    rules_url = models.URLField(blank=True, help_text="Qoidalar sahifasi")

    # --- ko'rinish sozlamalari (musobaqa DAVOMIDA nima yashiriladi)
    hide_authors = models.BooleanField(default=False, help_text="Masala mualliflarini yashirish")
    hide_results = models.BooleanField(default=False, help_text="Natijalar jadvalini yashirish")
    hide_submissions = models.BooleanField(default=False, help_text="Urinishlar ro'yxatini yashirish")
    public_scoreboard = models.BooleanField(
        default=True, help_text="Natijalar jadvali ishtirokchi bo'lmaganlarga ham ochiq"
    )
    open_registration = models.BooleanField(default=True, help_text="Ochiq ro'yxatdan o'tish")
    keep_problems_public = models.BooleanField(
        default=True, help_text="Musobaqa tugagach masalalar ochiq qoladimi"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="created_contests",
    )

    class Meta:
        db_table = "contests"
        verbose_name = "Olimpiada"
        verbose_name_plural = "Olimpiadalar"
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
        verbose_name = "Olimpiada masalasi"
        verbose_name_plural = "Olimpiada masalalari"
        ordering = ["order"]
        unique_together = [("contest", "problem")]

    def __str__(self) -> str:
        return f"{self.contest} / {self.label or self.order}"


class ContestStaff(TimeStampedModel):
    """Olimpiada mas'ullari — hakam, muallif, kuzatuvchi.

    Musobaqani bitta odam tayyorlamaydi: kimdir masala yozadi, kimdir
    savollarga javob beradi, kimdir faqat kuzatadi. Rol shu farqni saqlaydi,
    shuning uchun kuzatuvchiga tasodifan tahrir huquqi tegib ketmaydi.
    """

    class Role(models.TextChoices):
        OWNER = "owner", "Mas'ul (to'liq huquq)"
        JUDGE = "judge", "Hakam — savollarga javob, diskvalifikatsiya"
        AUTHOR = "author", "Muallif — masala tayyorlaydi"
        OBSERVER = "observer", "Kuzatuvchi — faqat ko'radi"

    contest = models.ForeignKey(Contest, on_delete=models.CASCADE, related_name="staff")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contest_staff_roles"
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.JUDGE)
    note = models.CharField(max_length=200, blank=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="contest_staff_added",
    )

    class Meta:
        db_table = "contest_staff"
        verbose_name = "Mas'ul"
        verbose_name_plural = "Mas'ullar"
        unique_together = [("contest", "user")]
        ordering = ["role", "created_at"]

    def __str__(self) -> str:
        return f"{self.user} — {self.get_role_display()}"

    @property
    def can_edit(self) -> bool:
        return self.role in {self.Role.OWNER, self.Role.AUTHOR}


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
        verbose_name = "Ishtirokchi"
        verbose_name_plural = "Ishtirokchilar"
        unique_together = [("contest", "user")]
        ordering = ["rank", "-score", "penalty"]

    def __str__(self) -> str:
        return f"{self.user} @ {self.contest}"
