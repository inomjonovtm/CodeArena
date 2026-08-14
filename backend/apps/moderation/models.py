from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel, TimeStampedModel


class PlagiarismStatus(models.TextChoices):
    PENDING = "pending", "Ko'rib chiqilmagan"
    CLEARED = "cleared", "Tozalangan (yolg'on signal)"
    CONFIRMED = "confirmed", "Tasdiqlangan"


class PlagiarismPair(BaseModel):
    """13-bo'lim: shubhali juftlik — avtomatik diskvalifikatsiya EMAS, admin uchun signal."""

    contest = models.ForeignKey(
        "contests.Contest", null=True, blank=True, on_delete=models.CASCADE, related_name="plagiarism_pairs"
    )
    problem = models.ForeignKey("problems.Problem", on_delete=models.CASCADE, related_name="plagiarism_pairs")

    submission_a = models.ForeignKey(
        "judge.Submission", on_delete=models.CASCADE, related_name="plagiarism_as_a"
    )
    submission_b = models.ForeignKey(
        "judge.Submission", on_delete=models.CASCADE, related_name="plagiarism_as_b"
    )
    user_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="plagiarism_as_a"
    )
    user_b = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="plagiarism_as_b"
    )

    similarity = models.FloatField(default=0.0, help_text="0..1")
    language = models.CharField(max_length=16, blank=True)
    same_ip = models.BooleanField(default=False)
    time_delta_seconds = models.IntegerField(null=True, blank=True)
    matched_lines = models.JSONField(default=list, blank=True)

    status = models.CharField(
        max_length=12, choices=PlagiarismStatus.choices, default=PlagiarismStatus.PENDING, db_index=True
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="plagiarism_reviews",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)

    class Meta:
        db_table = "plagiarism_pairs"
        verbose_name = "Plagiat juftligi"
        verbose_name_plural = "Plagiat juftliklari"
        ordering = ["-similarity", "-created_at"]
        unique_together = [("submission_a", "submission_b")]

    def __str__(self) -> str:
        return f"{self.user_a} ↔ {self.user_b} ({self.similarity:.0%})"


class AuditLog(models.Model):
    """Admin panelidagi har bir o'zgarish yozib boriladi."""

    id = models.BigAutoField(primary_key=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="audit_logs",
    )
    action = models.CharField(max_length=80, db_index=True)
    target_type = models.CharField(max_length=60, blank=True, db_index=True)
    target_id = models.CharField(max_length=64, blank=True)
    target_repr = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_logs"
        verbose_name = "Audit yozuvi"
        verbose_name_plural = "Audit jurnali"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["actor", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.actor} · {self.action}"


class SiteSetting(TimeStampedModel):
    """Admin paneldan boshqariladigan sozlamalar (key/value)."""

    GROUPS = [
        ("general", "Umumiy"),
        ("social", "Ijtimoiy tarmoqlar"),
        ("judge", "Judge"),
        ("security", "Xavfsizlik"),
        ("content", "Kontent"),
        ("rating", "Reyting"),
    ]
    VALUE_TYPES = [
        ("string", "Matn"), ("number", "Raqam"), ("boolean", "Ha/Yo'q"),
        ("json", "JSON"), ("text", "Uzun matn"),
    ]

    key = models.CharField(max_length=80, unique=True, db_index=True)
    value = models.JSONField(default=dict, blank=True)
    value_type = models.CharField(max_length=10, choices=VALUE_TYPES, default="string")
    group = models.CharField(max_length=20, choices=GROUPS, default="general", db_index=True)
    label_uz = models.CharField(max_length=120, blank=True)
    label_en = models.CharField(max_length=120, blank=True)
    description = models.CharField(max_length=255, blank=True)
    is_public = models.BooleanField(default=False, help_text="Frontendga ochiq beriladimi")
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="setting_updates",
    )

    class Meta:
        db_table = "site_settings"
        verbose_name = "Sayt sozlamasi"
        verbose_name_plural = "Sayt sozlamalari"
        ordering = ["group", "key"]

    def __str__(self) -> str:
        return self.key

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Kod sozlamalarni keshdan o'qiydi — saqlangach kesh yangilanishi shart
        from apps.core import site_settings

        site_settings.invalidate()

    def delete(self, *args, **kwargs):
        result = super().delete(*args, **kwargs)
        from apps.core import site_settings

        site_settings.invalidate()
        return result


class Announcement(BaseModel):
    """Saytdagi e'lonlar (banner) — admin paneldan boshqariladi."""

    LEVELS = [("info", "Ma'lumot"), ("success", "Muvaffaqiyat"), ("warning", "Ogohlantirish"), ("danger", "Muhim")]
    AUDIENCES = [
        ("all", "Hamma"),
        ("users", "Faqat foydalanuvchilar"),
        ("staff", "Admin va moderatorlar"),
        ("contest", "Contest ishtirokchilari"),
        ("group", "Guruh a'zolari"),
    ]

    title_uz = models.CharField(max_length=160)
    title_en = models.CharField(max_length=160, blank=True)
    body_uz = models.TextField(blank=True)
    body_en = models.TextField(blank=True)
    level = models.CharField(max_length=10, choices=LEVELS, default="info")
    is_active = models.BooleanField(default=True, db_index=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    # --- maqsadli yuborish
    audience = models.CharField(max_length=10, choices=AUDIENCES, default="all", db_index=True)
    target_contest = models.ForeignKey(
        "contests.Contest", null=True, blank=True, on_delete=models.SET_NULL, related_name="announcements"
    )
    target_group = models.ForeignKey(
        "community.Group", null=True, blank=True, on_delete=models.SET_NULL, related_name="announcements"
    )
    # --- amal tugmasi
    # E'lon faqat xabar bermasligi kerak: "musobaqa boshlandi" degan bannerdan
    # to'g'ridan-to'g'ri musobaqaga o'tib bo'lmasa, foydalanuvchi uni o'zi
    # qidiradi va ko'pchilik umuman o'tmaydi.
    action_url = models.CharField(
        max_length=300, blank=True,
        help_text="Tugma manzili: sayt ichida `/contests/bahor-kubogi` yoki to'liq `https://...`",
    )
    action_label_uz = models.CharField(max_length=60, blank=True)
    action_label_en = models.CharField(max_length=60, blank=True)

    # --- ko'rinish
    is_dismissible = models.BooleanField(
        default=True, help_text="Foydalanuvchi bannerni yopa oladimi (texnik ishlar uchun — yo'q)"
    )
    is_pinned = models.BooleanField(default=False, help_text="Ro'yxatning eng tepasida tursin")

    # --- yetkazish kanallari
    send_email = models.BooleanField(default=False, help_text="Banner bilan birga email ham yuborilsin")
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_recipients = models.PositiveIntegerField(default=0)

    send_notification = models.BooleanField(
        default=False, help_text="Sayt ichidagi qo'ng'iroqqa ham yozilsin"
    )
    send_push = models.BooleanField(
        default=False, help_text="Obuna bo'lgan qurilmalarga brauzer xabari ham ketsin"
    )
    notified_at = models.DateTimeField(null=True, blank=True)
    notified_recipients = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="announcements",
    )

    class Meta:
        db_table = "announcements"
        verbose_name = "E'lon"
        verbose_name_plural = "E'lonlar"
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self) -> str:
        return self.title_uz

    def recipients(self):
        """E'lon kimga tegishli — email va bildirishnoma UCHUN BITTA manba.

        Ilgari qabul qiluvchilar faqat email yuborish view'ida hisoblanardi;
        yangi kanal qo'shilganda mantiq ikkinchi marta yozilishi va ikkalasi
        vaqt o'tib bir-biridan farq qilib qolishi mumkin edi.
        """
        from apps.accounts.models import Role, User

        queryset = User.objects.filter(is_active=True, is_banned=False)

        if self.audience == "users":
            queryset = queryset.filter(role=Role.USER)
        elif self.audience == "staff":
            queryset = queryset.filter(role__in=[Role.ADMIN, Role.MODERATOR])
        elif self.audience == "contest" and self.target_contest_id:
            queryset = queryset.filter(contest_entries__contest_id=self.target_contest_id)
        elif self.audience == "group" and self.target_group_id:
            queryset = queryset.filter(group_memberships__group_id=self.target_group_id)

        return queryset.distinct()

    @property
    def is_live(self) -> bool:
        """Hozir ko'rinadimi — admin ro'yxatida holatni bir qarashda ko'rsatadi."""
        from django.utils import timezone

        if not self.is_active:
            return False
        now = timezone.now()
        if self.starts_at and self.starts_at > now:
            return False
        if self.ends_at and self.ends_at < now:
            return False
        return True


class LegalDocument(TimeStampedModel):
    """Maxfiylik siyosati, foydalanish shartlari va shunga o'xshash sahifalar.

    NEGA BAZADA. Bu matnlar huquqiy hujjat: ular qonun o'zgarganda yoki
    kompaniya ma'lumoti yangilanganda tahrirlanadi. Kodda saqlansa har bir
    kichik tuzatish uchun dasturchi, commit va deploy kerak bo'lardi —
    natijada sahifalar eskirib qolardi. Endi ular admin panelda,
    Markdown ko'rinishida tahrirlanadi va darhol saytda ko'rinadi.

    VERSIYA VA SANA alohida maydonlar: foydalanuvchi «qaysi tahrirni qabul
    qilgani» huquqiy jihatdan muhim, shuning uchun ular matn ichida emas,
    ustunda turadi va sahifada avtomatik ko'rsatiladi.
    """

    SLUGS = [
        ("privacy", "Maxfiylik siyosati"),
        ("terms", "Foydalanish shartlari"),
        ("rules", "Sayt qoidalari"),
        ("about", "Biz haqimizda"),
    ]

    slug = models.SlugField(max_length=32, unique=True, choices=SLUGS, db_index=True)
    title_uz = models.CharField(max_length=160)
    summary_uz = models.CharField(
        max_length=300, blank=True,
        help_text="Sarlavha ostidagi bir jumlalik izoh (ixtiyoriy).",
    )
    body_md = models.TextField(help_text="Markdown: ## sarlavha, - ro'yxat, **qalin**.")
    version = models.CharField(max_length=20, blank=True, help_text="Masalan: 1.2")
    effective_from = models.DateField(
        null=True, blank=True, help_text="Ushbu tahrir kuchga kirgan sana.",
    )
    is_published = models.BooleanField(
        default=True, help_text="O'chirilsa sahifa o'rniga 404 qaytadi.",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="legal_updates",
    )

    class Meta:
        db_table = "legal_documents"
        verbose_name = "Huquqiy hujjat"
        verbose_name_plural = "Huquqiy hujjatlar"
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.get_slug_display()


class BackupRecord(TimeStampedModel):
    """Yaratilgan zaxira nusxalar ro'yxati."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=255)
    size_bytes = models.PositiveBigIntegerField(default=0)
    kind = models.CharField(
        max_length=12,
        choices=[("full", "To'liq"), ("data", "Faqat ma'lumot")],
        default="data",
    )
    # Rejaga ko'ra (celery beat) olinganmi yoki admin tugma bosganmi.
    # Tungi zaxira uzilib qolganini ro'yxatga qarab darrov ko'rish uchun.
    is_automatic = models.BooleanField(default=False)
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="backups",
    )

    class Meta:
        db_table = "backup_records"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.filename
