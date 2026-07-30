from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel, SoftDeleteModel, TimeStampedModel
from apps.problems.models import Problem


class PublishStatus(models.TextChoices):
    DRAFT = "draft", "Qoralama"
    PUBLISHED = "published", "Chop etilgan"
    ARCHIVED = "archived", "Arxivlangan"


class ModerationStatus(models.TextChoices):
    VISIBLE = "visible", "Ko'rinadi"
    HIDDEN = "hidden", "Yashirilgan"
    FLAGGED = "flagged", "Shikoyat qilingan"
    DELETED = "deleted", "O'chirilgan"


class Discussion(SoftDeleteModel, BaseModel):
    """Umumiy muhokama mavzusi.

    Ilgari muhokama masalaga bog'lanardi va masala sahifasida ham shu ro'yxat
    chiqardi. Natijada bitta joyda ikki xil suhbat aralashib ketardi: masala
    haqida qisqa savol berish uchun ham «mavzu ochish» kerak bo'lardi.
    Endi masala ostida oddiy izohlar turadi (`Comment.problem`), muhokamalar
    esa mustaqil bo'lim.
    """

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="discussions"
    )
    title = models.CharField(max_length=200)
    body_md = models.TextField()
    status = models.CharField(
        max_length=10, choices=ModerationStatus.choices, default=ModerationStatus.VISIBLE, db_index=True
    )
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    upvotes = models.IntegerField(default=0)
    views = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    flagged_count = models.PositiveIntegerField(default=0)

    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="moderated_discussions",
    )
    moderation_note = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "discussions"
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self) -> str:
        return self.title


class Comment(SoftDeleteModel, BaseModel):
    """Izoh — muhokama mavzusiga YOKI masalaga tegishli.

    Alohida `ProblemComment` modeli yasalmadi: ovoz berish (`ContentVote`),
    shikoyat (`ContentReport`), moderatsiya va tarmoqli javoblar bir xil
    ishlaydi. Ikki model bo'lsa, shularning hammasi ikki nusxada yozilardi.
    """

    discussion = models.ForeignKey(
        Discussion, null=True, blank=True, on_delete=models.CASCADE, related_name="comments"
    )
    problem = models.ForeignKey(
        Problem, null=True, blank=True, on_delete=models.CASCADE, related_name="comments"
    )
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="comments"
    )
    body_md = models.TextField()
    status = models.CharField(
        max_length=10, choices=ModerationStatus.choices, default=ModerationStatus.VISIBLE, db_index=True
    )
    upvotes = models.IntegerField(default=0)
    flagged_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "comments"
        ordering = ["created_at"]
        indexes = [models.Index(fields=["problem", "status", "created_at"])]
        constraints = [
            # Egasiz yoki ikki egali izoh bo'lmasin — aks holda u hech qaysi
            # sahifada ko'rinmay qolardi yoki ikkalasida takrorlanardi.
            models.CheckConstraint(
                name="comment_belongs_to_one_target",
                condition=(
                    models.Q(discussion__isnull=False, problem__isnull=True)
                    | models.Q(discussion__isnull=True, problem__isnull=False)
                ),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.author} — {self.body_md[:40]}"


class ContentVote(TimeStampedModel):
    """Muhokama va izohlar uchun ovoz — bir foydalanuvchi bir marta ovoz beradi."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="content_votes"
    )
    discussion = models.ForeignKey(
        Discussion, null=True, blank=True, on_delete=models.CASCADE, related_name="votes"
    )
    comment = models.ForeignKey(
        Comment, null=True, blank=True, on_delete=models.CASCADE, related_name="votes"
    )
    value = models.SmallIntegerField(default=1, help_text="+1 yoki -1")

    class Meta:
        db_table = "content_votes"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "discussion"], name="uniq_vote_discussion",
                condition=models.Q(discussion__isnull=False),
            ),
            models.UniqueConstraint(
                fields=["user", "comment"], name="uniq_vote_comment",
                condition=models.Q(comment__isnull=False),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} {self.value:+d}"


class ContentReport(TimeStampedModel):
    """Foydalanuvchi shikoyatlari — moderatsiya navbati."""

    REASONS = [
        ("spam", "Spam"),
        ("abuse", "Haqorat"),
        ("solution_leak", "Yechim tarqatish"),
        ("offtopic", "Mavzudan tashqari"),
        ("other", "Boshqa"),
    ]

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="reports_made"
    )
    discussion = models.ForeignKey(
        Discussion, null=True, blank=True, on_delete=models.CASCADE, related_name="reports"
    )
    comment = models.ForeignKey(
        Comment, null=True, blank=True, on_delete=models.CASCADE, related_name="reports"
    )
    reason = models.CharField(max_length=20, choices=REASONS, default="other")
    note = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="reports_resolved",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "content_reports"
        ordering = ["is_resolved", "-created_at"]

    def __str__(self) -> str:
        return f"{self.get_reason_display()} — {self.reporter}"


class ContactMessage(TimeStampedModel):
    """«Bog'lanish» formasidan kelgan xabar.

    Ro'yxatdan o'tmagan mehmon ham yozishi mumkin, shuning uchun `user`
    ixtiyoriy va ism/email alohida saqlanadi.
    """

    TOPICS = [
        ("general", "Umumiy savol"),
        ("bug", "Xatolik haqida"),
        ("problem", "Masala bo'yicha"),
        ("partnership", "Hamkorlik"),
        ("other", "Boshqa"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="contact_messages",
    )
    name = models.CharField(max_length=120)
    email = models.EmailField()
    topic = models.CharField(max_length=20, choices=TOPICS, default="general")
    subject = models.CharField(max_length=200)
    body = models.TextField()

    is_read = models.BooleanField(default=False, db_index=True)
    is_resolved = models.BooleanField(default=False, db_index=True)
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="contact_answers",
    )
    answer = models.TextField(blank=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "contact_messages"
        ordering = ["is_resolved", "-created_at"]
        indexes = [models.Index(fields=["is_resolved", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.subject} — {self.name}"
