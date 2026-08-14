"""Muhokama, izoh, shikoyat va murojaatlar — moderatsiya paneli.

Moderatorning kunlik ishi shu yerda: shikoyatni ko'rish, kontentni yashirish
yoki tiklash. Shuning uchun ro'yxatlar SHIKOYAT SONI bo'yicha ham saralanadi
va ochiq shikoyatlar sukut bo'yicha tepada turadi.
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
    RelatedDropdownFilter,
)
from unfold.decorators import action, display

from apps.core.admin_utils import titled

from .models import (
    Comment,
    ContactMessage,
    ContentReport,
    ContentVote,
    Discussion,
    ModerationStatus,
)

STATUS_LABELS = {
    ModerationStatus.VISIBLE: "success",
    ModerationStatus.HIDDEN: "warning",
    ModerationStatus.FLAGGED: "danger",
    ModerationStatus.DELETED: "",
}


class ModerationActionsMixin:
    """Yashirish / ko'rsatish / belgilash — uchala ro'yxatda bir xil."""

    @action(description="Yashirish")
    def hide(self, request, queryset):
        count = queryset.update(
            status=ModerationStatus.HIDDEN,
            moderated_by=request.user,
            moderation_note=f"Admin paneldan yashirildi ({request.user.username})",
        )
        messages.success(request, f"{count} ta yozuv yashirildi.")

    @action(description="Ko'rsatish")
    def show(self, request, queryset):
        count = queryset.update(
            status=ModerationStatus.VISIBLE,
            moderated_by=request.user,
            moderation_note="",
        )
        messages.success(request, f"{count} ta yozuv qayta ochildi.")


@admin.register(Discussion)
class DiscussionAdmin(ModerationActionsMixin, ModelAdmin):
    list_display = ("title", "author", "status_badge", "comment_count", "upvotes",
                    "flag_cell", "is_pinned", "created_at")
    list_filter = (
        ("status", titled(ChoicesDropdownFilter, "Holat")),
        ("is_pinned", titled(BooleanRadioFilter, "Qadalgan")),
        ("is_locked", titled(BooleanRadioFilter, "Yopilgan")),
        ("created_at", titled(RangeDateFilter, "Sana")),
        ("author", titled(RelatedDropdownFilter, "Muallif")),
    )
    search_fields = ("title", "body_md", "author__username")
    autocomplete_fields = ("author", "moderated_by")
    ordering = ("-flagged_count", "-created_at")
    date_hierarchy = "created_at"
    actions = ("hide", "show", "pin", "unpin", "lock", "unlock")
    readonly_fields = ("upvotes", "views", "comment_count", "flagged_count",
                       "created_at", "updated_at")

    @display(description="Holat", label=STATUS_LABELS, ordering="status")
    def status_badge(self, obj: Discussion):
        return obj.status, obj.get_status_display()

    @display(description="Shikoyat", ordering="flagged_count")
    def flag_cell(self, obj: Discussion):
        if not obj.flagged_count:
            return format_html('<span class="text-base-500">—</span>')
        return format_html('<span class="text-red-600 font-medium">{}</span>', obj.flagged_count)

    @action(description="Tepaga qadash")
    def pin(self, request, queryset):
        messages.success(request, f"{queryset.update(is_pinned=True)} ta mavzu qadaldi.")

    @action(description="Qadashni olib tashlash")
    def unpin(self, request, queryset):
        messages.success(request, f"{queryset.update(is_pinned=False)} ta mavzu bo'shatildi.")

    @action(description="Yopish (izoh yozib bo'lmaydi)")
    def lock(self, request, queryset):
        messages.success(request, f"{queryset.update(is_locked=True)} ta mavzu yopildi.")

    @action(description="Ochish")
    def unlock(self, request, queryset):
        messages.success(request, f"{queryset.update(is_locked=False)} ta mavzu ochildi.")


@admin.register(Comment)
class CommentAdmin(ModerationActionsMixin, ModelAdmin):
    list_display = ("body_preview", "author", "target_cell", "status_badge",
                    "upvotes", "flag_cell", "created_at")
    list_filter = (
        ("status", ChoicesDropdownFilter),
        ("created_at", RangeDateFilter),
        ("author", RelatedDropdownFilter),
    )
    search_fields = ("body_md", "author__username")
    autocomplete_fields = ("author", "discussion", "problem", "parent")
    ordering = ("-flagged_count", "-created_at")
    actions = ("hide", "show")
    readonly_fields = ("upvotes", "flagged_count", "created_at", "updated_at")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("author", "discussion", "problem")

    @display(description="Izoh")
    def body_preview(self, obj: Comment) -> str:
        return (obj.body_md or "").strip().replace("\n", " ")[:70] or "—"

    @display(description="Qayerda")
    def target_cell(self, obj: Comment) -> str:
        if obj.discussion_id:
            return f"Muhokama: {obj.discussion}"
        if obj.problem_id:
            return f"Masala: {obj.problem}"
        return "—"

    @display(description="Holat", label=STATUS_LABELS, ordering="status")
    def status_badge(self, obj: Comment):
        return obj.status, obj.get_status_display()

    @display(description="Shikoyat", ordering="flagged_count")
    def flag_cell(self, obj: Comment):
        if not obj.flagged_count:
            return format_html('<span class="text-base-500">—</span>')
        return format_html('<span class="text-red-600 font-medium">{}</span>', obj.flagged_count)


@admin.register(ContentReport)
class ContentReportAdmin(ModelAdmin):
    list_display = ("created_at", "reporter", "target_cell", "reason", "note_preview",
                    "state_badge")
    list_filter = (
        ("is_resolved", titled(BooleanRadioFilter, "Hal qilingan")),
        ("reason", titled(ChoicesDropdownFilter, "Sabab")),
        ("created_at", titled(RangeDateFilter, "Sana")),
    )
    search_fields = ("reporter__username", "note")
    autocomplete_fields = ("reporter", "discussion", "comment", "resolved_by")
    # Hal qilinmagan shikoyat tepada: navbat shu tartibda ishlanadi.
    ordering = ("is_resolved", "-created_at")
    date_hierarchy = "created_at"
    actions = ("resolve", "reopen")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "reporter", "discussion", "comment"
        )

    @display(description="Nima ustidan")
    def target_cell(self, obj: ContentReport) -> str:
        if obj.discussion_id:
            return f"Muhokama: {obj.discussion}"
        if obj.comment_id:
            return f"Izoh: {obj.comment}"
        return "—"

    @display(description="Izoh")
    def note_preview(self, obj: ContentReport) -> str:
        return (obj.note or "").strip()[:60] or "—"

    @display(description="Holat", label={True: "success", False: "danger"})
    def state_badge(self, obj: ContentReport):
        return obj.is_resolved, "Hal qilindi" if obj.is_resolved else "Ochiq"

    @action(description="Hal qilindi deb belgilash")
    def resolve(self, request, queryset):
        count = queryset.update(
            is_resolved=True, resolved_by=request.user, resolved_at=timezone.now()
        )
        messages.success(request, f"{count} ta shikoyat yopildi.")

    @action(description="Qayta ochish")
    def reopen(self, request, queryset):
        count = queryset.update(is_resolved=False, resolved_by=None, resolved_at=None)
        messages.success(request, f"{count} ta shikoyat qayta ochildi.")


@admin.register(ContactMessage)
class ContactMessageAdmin(ModelAdmin):
    list_display = ("created_at", "subject", "name", "email", "topic", "state_badge")
    list_filter = (
        ("is_resolved", titled(BooleanRadioFilter, "Javob berilgan")),
        ("is_read", titled(BooleanRadioFilter, "O'qilgan")),
        ("topic", titled(ChoicesDropdownFilter, "Mavzu")),
        ("created_at", titled(RangeDateFilter, "Sana")),
    )
    search_fields = ("name", "email", "subject", "body")
    autocomplete_fields = ("user", "answered_by")
    ordering = ("is_resolved", "-created_at")
    date_hierarchy = "created_at"
    actions = ("mark_read", "mark_resolved")
    readonly_fields = ("created_at",)

    @display(description="Holat", label={True: "success", False: "warning"})
    def state_badge(self, obj: ContactMessage):
        if obj.is_resolved:
            return True, "Javob berilgan"
        return False, "O'qilgan" if obj.is_read else "Yangi"

    @action(description="O'qilgan deb belgilash")
    def mark_read(self, request, queryset):
        messages.success(request, f"{queryset.update(is_read=True)} ta xabar o'qilgan.")

    @action(description="Javob berilgan deb belgilash")
    def mark_resolved(self, request, queryset):
        count = queryset.update(is_resolved=True, is_read=True, answered_by=request.user)
        messages.success(request, f"{count} ta murojaat yopildi.")


@admin.register(ContentVote)
class ContentVoteAdmin(ModelAdmin):
    list_display = ("user", "discussion", "comment", "value", "created_at")
    list_filter = (("created_at", RangeDateFilter),)
    search_fields = ("user__username",)
    autocomplete_fields = ("user", "discussion", "comment")
    ordering = ("-created_at",)

    def has_add_permission(self, request) -> bool:
        return False
