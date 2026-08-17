"""Guruhlar (jamoa) — boshqaruv paneli."""
from __future__ import annotations

from django.contrib import admin, messages
from unfold.admin import ModelAdmin, TabularInline
from unfold.contrib.filters.admin import (
    BooleanRadioFilter,
    ChoicesDropdownFilter,
    RangeDateFilter,
    RelatedDropdownFilter,
)
from unfold.decorators import action, display

from .models import Group, GroupBan, GroupJoinRequest, GroupMember


class GroupMemberInline(TabularInline):
    model = GroupMember
    extra = 0
    fields = ("user", "role", "joined_at")
    readonly_fields = ("joined_at",)
    autocomplete_fields = ("user",)


@admin.register(Group)
class GroupAdmin(ModelAdmin):
    list_display = ("name", "owner", "member_count", "privacy", "verified_badge", "created_at")
    list_filter = (
        ("privacy", ChoicesDropdownFilter),
        ("is_verified", BooleanRadioFilter),
        ("created_at", RangeDateFilter),
    )
    search_fields = ("name", "slug", "description", "owner__username")
    prepopulated_fields = {"slug": ("name",)}
    autocomplete_fields = ("owner",)
    inlines = (GroupMemberInline,)
    ordering = ("-created_at",)
    actions = ("verify", "unverify")
    readonly_fields = ("invite_code", "member_count", "created_at", "updated_at")

    @display(description="Tasdiqlangan", label={True: "success", False: ""})
    def verified_badge(self, obj: Group):
        return obj.is_verified, "Tasdiqlangan" if obj.is_verified else "—"

    @action(description="Tasdiqlash")
    def verify(self, request, queryset):
        messages.success(request, f"{queryset.update(is_verified=True)} ta guruh tasdiqlandi.")

    @action(description="Tasdiqni olib tashlash")
    def unverify(self, request, queryset):
        messages.success(request, f"{queryset.update(is_verified=False)} ta guruh bo'shatildi.")


@admin.register(GroupMember)
class GroupMemberAdmin(ModelAdmin):
    list_display = ("group", "user", "role", "joined_at")
    list_filter = ("role", ("group", RelatedDropdownFilter))
    search_fields = ("group__name", "user__username")
    autocomplete_fields = ("group", "user")
    ordering = ("group", "role")


@admin.register(GroupBan)
class GroupBanAdmin(ModelAdmin):
    """Chetlatishlar — sayt UI'dan tashqari, favqulodda tuzatish uchun ham."""

    list_display = ("group", "user", "reason", "created_by", "created_at")
    list_filter = (("group", RelatedDropdownFilter), ("created_at", RangeDateFilter))
    search_fields = ("group__name", "user__username", "reason")
    autocomplete_fields = ("group", "user", "created_by")
    ordering = ("-created_at",)


@admin.register(GroupJoinRequest)
class GroupJoinRequestAdmin(ModelAdmin):
    list_display = ("group", "user", "status", "decided_by", "decided_at", "created_at")
    list_filter = (("group", RelatedDropdownFilter), ("created_at", RangeDateFilter))
    search_fields = ("group__name", "user__username", "message")
    autocomplete_fields = ("group", "user", "decided_by")
    ordering = ("-created_at",)
