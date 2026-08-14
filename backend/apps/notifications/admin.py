"""Bildirishnomalar va push obunalari — boshqaruv paneli."""
from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import (
    BooleanRadioFilter,
    ChoicesDropdownFilter,
    RangeDateFilter,
    RelatedDropdownFilter,
)
from unfold.decorators import display

from apps.core.admin_utils import titled

from .models import Notification, PushSubscription


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ("created_at", "recipient", "kind", "title", "level_badge", "is_read")
    list_filter = (
        ("kind", titled(ChoicesDropdownFilter, "Turi")),
        ("level", titled(ChoicesDropdownFilter, "Daraja")),
        ("is_read", titled(BooleanRadioFilter, "O'qilgan")),
        ("created_at", titled(RangeDateFilter, "Sana")),
        ("recipient", titled(RelatedDropdownFilter, "Kimga")),
    )
    search_fields = ("title", "body", "recipient__username")
    autocomplete_fields = ("recipient", "actor")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_per_page = 50

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("recipient", "actor")

    @display(
        description="Daraja",
        label={"success": "success", "warning": "warning", "danger": "danger", "info": "info"},
    )
    def level_badge(self, obj: Notification):
        return obj.level, obj.get_level_display()


@admin.register(PushSubscription)
class PushSubscriptionAdmin(ModelAdmin):
    list_display = ("user", "browser", "device", "failure_count", "last_sent_at", "created_at")
    list_filter = (("created_at", RangeDateFilter),)
    search_fields = ("user__username", "endpoint", "user_agent")
    autocomplete_fields = ("user",)
    ordering = ("-created_at",)
    # Kalitlar (`p256dh`, `auth`) — sir: ular ko'rinmasligi kerak.
    exclude = ("p256dh", "auth")
    readonly_fields = ("endpoint", "user_agent", "last_error", "last_sent_at", "created_at")

    def has_add_permission(self, request) -> bool:
        # Obuna brauzerdan keladi — qo'lda yaratilmaydi.
        return False
