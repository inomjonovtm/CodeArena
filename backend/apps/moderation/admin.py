"""Plagiat, audit, sayt sozlamalari va e'lonlar — boshqaruv paneli.

Sayt sozlamalari shu yerda: judge manzili, limitlar, ro'yxatdan o'tish
qoidalari. Ular kod emas, MA'LUMOT — shuning uchun deploy qilmasdan
o'zgartiriladi.
"""
from __future__ import annotations

from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import (
    BooleanRadioFilter,
    ChoicesDropdownFilter,
    RangeDateFilter,
    RangeNumericFilter,
    RelatedDropdownFilter,
)
from unfold.decorators import action, display

from apps.core.admin_utils import titled

from .models import (
    Announcement,
    AuditLog,
    BackupRecord,
    LegalDocument,
    PlagiarismPair,
    PlagiarismStatus,
    SiteSetting,
)


@admin.register(PlagiarismPair)
class PlagiarismPairAdmin(ModelAdmin):
    list_display = ("created_at", "pair_cell", "problem", "similarity_cell",
                    "signals_cell", "status_badge")
    list_filter = (
        ("status", titled(ChoicesDropdownFilter, "Qaror")),
        ("same_ip", titled(BooleanRadioFilter, "Bir xil IP")),
        ("similarity", titled(RangeNumericFilter, "O'xshashlik")),
        ("contest", titled(RelatedDropdownFilter, "Olimpiada")),
        ("created_at", titled(RangeDateFilter, "Sana")),
    )
    search_fields = ("user_a__username", "user_b__username", "problem__title_uz")
    autocomplete_fields = ("contest", "problem", "user_a", "user_b", "reviewed_by")
    # Eng o'xshash juftlik tepada — moderator shu tartibda ko'rib chiqadi.
    ordering = ("status", "-similarity")
    actions = ("mark_confirmed", "mark_rejected")
    readonly_fields = ("similarity", "matched_lines", "time_delta_seconds", "same_ip",
                       "submission_a", "submission_b", "created_at")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "user_a", "user_b", "problem", "contest"
        )

    @display(description="Juftlik")
    def pair_cell(self, obj: PlagiarismPair):
        return format_html(
            '<span class="font-medium">{}</span> ↔ <span class="font-medium">{}</span>',
            obj.user_a, obj.user_b,
        )

    @display(description="O'xshashlik", ordering="similarity")
    def similarity_cell(self, obj: PlagiarismPair):
        percent = round((obj.similarity or 0) * 100)
        tone = "text-red-600" if percent >= 90 else "text-amber-600"
        return format_html('<span class="font-mono {}">{}%</span>', tone, percent)

    @display(description="Belgilar")
    def signals_cell(self, obj: PlagiarismPair) -> str:
        """Qo'shimcha dalillar — bir xil IP va yaqin vaqt shubhani kuchaytiradi."""
        signals = []
        if obj.same_ip:
            signals.append("bir xil IP")
        if obj.time_delta_seconds is not None and abs(obj.time_delta_seconds) < 300:
            signals.append(f"{abs(obj.time_delta_seconds)}s farq")
        if obj.language:
            signals.append(obj.language)
        return " · ".join(signals) or "—"

    @display(
        description="Qaror",
        label={"confirmed": "danger", "rejected": "success", "pending": "warning"},
        ordering="status",
    )
    def status_badge(self, obj: PlagiarismPair):
        return obj.status, obj.get_status_display()

    @action(description="Tasdiqlash (plagiat)")
    def mark_confirmed(self, request, queryset):
        count = queryset.update(
            status=PlagiarismStatus.CONFIRMED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        messages.success(request, f"{count} ta juftlik plagiat deb belgilandi.")

    @action(description="Rad etish (plagiat emas)")
    def mark_rejected(self, request, queryset):
        count = queryset.update(
            status=PlagiarismStatus.REJECTED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        messages.success(request, f"{count} ta juftlik rad etildi.")


@admin.register(AuditLog)
class AuditLogAdmin(ModelAdmin):
    """Kim nima qilgani. Faqat o'qish uchun — audit tahrirlansa ma'nosini
    yo'qotadi."""

    list_display = ("created_at", "actor", "action", "target_repr", "ip_address")
    list_filter = (
        ("created_at", RangeDateFilter),
        ("actor", RelatedDropdownFilter),
        "target_type",
    )
    search_fields = ("action", "target_repr", "actor__username", "ip_address")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_per_page = 60
    readonly_fields = tuple(f.name for f in AuditLog._meta.fields)

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        # Audit yozuvini o'chirish — izni yo'qotish. Faqat superuser.
        return request.user.is_superuser


@admin.register(SiteSetting)
class SiteSettingAdmin(ModelAdmin):
    list_display = ("key", "group", "value_preview", "value_type", "is_public", "updated_at")
    list_filter = (
        ("group", titled(ChoicesDropdownFilter, "Bo'lim")),
        ("value_type", titled(ChoicesDropdownFilter, "Qiymat turi")),
        ("is_public", titled(BooleanRadioFilter, "Ommaviy")),
    )
    search_fields = ("key", "label_uz", "label_en", "description")
    ordering = ("group", "key")
    list_per_page = 60
    readonly_fields = ("updated_at", "updated_by")

    fieldsets = (
        (None, {"fields": ("key", "group", "value_type", "value")}),
        ("Tavsif", {"fields": ("label_uz", "label_en", "description", "is_public")}),
        ("Texnik", {"classes": ("collapse",), "fields": ("updated_by", "updated_at")}),
    )

    @display(description="Qiymat")
    def value_preview(self, obj: SiteSetting) -> str:
        return str(obj.value)[:70]

    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(LegalDocument)
class LegalDocumentAdmin(ModelAdmin):
    """Maxfiylik, shartlar va shu kabi sahifalar — matni shu yerda tahrirlanadi."""

    list_display = ("title_uz", "slug", "version", "effective_from", "is_published", "updated_at")
    list_filter = (("is_published", titled(BooleanRadioFilter, "Chop etilgan")),)
    search_fields = ("title_uz", "summary_uz", "body_md")
    ordering = ("slug",)
    readonly_fields = ("updated_at", "updated_by")

    fieldsets = (
        (None, {"fields": ("slug", "title_uz", "summary_uz", "is_published")}),
        ("Matn", {
            "fields": ("body_md",),
            "description": "Markdown qo'llab-quvvatlanadi: <code>## sarlavha</code>, "
                           "<code>- ro'yxat</code>, <code>**qalin**</code>, havolalar.",
        }),
        ("Tahrir belgisi", {
            "fields": ("version", "effective_from"),
            "description": "Sahifa pastida «1.2-tahrir, 1-yanvardan kuchga kirgan» "
                           "ko'rinishida ko'rsatiladi.",
        }),
        ("Texnik", {"classes": ("collapse",), "fields": ("updated_by", "updated_at")}),
    )

    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Announcement)
class AnnouncementAdmin(ModelAdmin):
    list_display = ("title_uz", "level_badge", "audience", "is_active", "is_pinned",
                    "starts_at", "ends_at")
    list_filter = (
        ("is_active", titled(BooleanRadioFilter, "Faol")),
        ("level", titled(ChoicesDropdownFilter, "Daraja")),
        ("audience", titled(ChoicesDropdownFilter, "Kimga")),
        ("starts_at", titled(RangeDateFilter, "Boshlanish sanasi")),
    )
    search_fields = ("title_uz", "body_uz")
    autocomplete_fields = ("target_contest", "target_group")
    ordering = ("-is_pinned", "-starts_at")
    readonly_fields = ("email_sent_at", "email_recipients", "created_at", "updated_at")

    fieldsets = (
        (None, {"fields": ("title_uz", "title_en", "body_uz", "body_en", "level")}),
        ("Kimga va qachon", {
            "fields": (
                "audience", "target_contest", "target_group",
                "is_active", "is_pinned", "is_dismissible", "starts_at", "ends_at",
            ),
        }),
        ("Harakat tugmasi", {
            "classes": ("collapse",),
            "fields": ("action_url", "action_label_uz", "action_label_en"),
        }),
        ("Yuborish", {
            "description": "Email va push YUBORILGACH qaytarib bo'lmaydi — avval matnni tekshiring.",
            "fields": ("send_email", "send_notification", "send_push",
                       "email_sent_at", "email_recipients"),
        }),
    )

    @display(
        description="Daraja",
        label={"danger": "danger", "warning": "warning", "success": "success", "info": "info"},
    )
    def level_badge(self, obj: Announcement):
        return obj.level, obj.get_level_display()


@admin.register(BackupRecord)
class BackupRecordAdmin(ModelAdmin):
    list_display = [f.name for f in BackupRecord._meta.fields][:6]
    ordering = ("-id",)
    readonly_fields = tuple(f.name for f in BackupRecord._meta.fields)

    def has_add_permission(self, request) -> bool:
        return False
