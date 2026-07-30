import uuid

from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    class Meta:
        abstract = True


# ------------------------------------------------------------ soft delete
class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        """Bulk `delete()` ham savatchaga tushiradi."""
        return self.update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)

    def restore(self):
        return self.update(deleted_at=None, deleted_by=None)


class SoftDeleteManager(models.Manager):
    """Standart menejer — o'chirilganlarni yashiradi."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager):
    """O'chirilganlar bilan birga (savatcha sahifasi uchun)."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    """
    `delete()` yozuvni o'chirmaydi — `deleted_at` ni belgilaydi.
    Savatchadan tiklash yoki butunlay o'chirish mumkin.
    """

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def delete(self, using=None, keep_parents=False, actor=None):
        self.deleted_at = timezone.now()
        if actor is not None and getattr(actor, "is_authenticated", False):
            self.deleted_by = actor
        self.save(update_fields=["deleted_at", "deleted_by"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=["deleted_at", "deleted_by"])


class TranslationCache(models.Model):
    """Avtomatik tarjimalar ombori.

    Har bir matn bir marta tarjima qilinadi va shu yerda qoladi: bepul
    xizmatlarning kunlik chegarasi bor, bir xil yorliqni har safar qayta
    so'rash uni bir necha daqiqada tugatardi.

    Kalit — `sha256(source|target|text)` ning birinchi 40 belgisi: matnning
    o'zi indekslanmaydi (u uzun bo'lishi mumkin), lekin qidiruv tez qoladi.
    """

    key = models.CharField(max_length=40, primary_key=True)
    source_lang = models.CharField(max_length=8, default="uz")
    target_lang = models.CharField(max_length=8, default="en", db_index=True)
    # Diagnostika uchun asl matn ham saqlanadi (kesilgan holda)
    source_text = models.TextField(blank=True)
    translated_text = models.TextField()
    provider = models.CharField(max_length=24, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "translation_cache"
        indexes = [models.Index(fields=["target_lang", "created_at"])]

    def __str__(self) -> str:
        return f"{self.source_lang}→{self.target_lang}: {self.source_text[:40]}"
