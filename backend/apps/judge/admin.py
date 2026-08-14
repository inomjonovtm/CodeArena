"""Yuborishlar (submission) — boshqaruv paneli.

Submission qo'lda YARATILMAYDI va TAHRIRLANMAYDI: u foydalanuvchi yuborgan
faktning yozuvi. Uni tahrirlash reyting va statistikani jimgina buzadi.
Shu sababli bu yerda faqat ko'rish, filtrlash va QAYTA TEKSHIRISH bor —
oxirgisi masala testlari o'zgargandan keyin kerak bo'ladi.
"""
from __future__ import annotations

from django.contrib import admin, messages
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline
from unfold.contrib.filters.admin import (
    BooleanRadioFilter,
    ChoicesDropdownFilter,
    RangeDateFilter,
    RangeNumericFilter,
    RelatedDropdownFilter,
)
from unfold.decorators import action, display

from apps.core.admin_utils import titled

from .models import Submission, SubmissionStatus, SubmissionTestResult

# Verdikt → nishon rangi. Faqat `ACCEPTED` yashil: qolgan barcha holat
# muallif yoki foydalanuvchidan e'tibor talab qiladi.
VERDICT_LABELS = {
    SubmissionStatus.ACCEPTED: "success",
    SubmissionStatus.WRONG_ANSWER: "danger",
    SubmissionStatus.TIME_LIMIT_EXCEEDED: "warning",
    SubmissionStatus.MEMORY_LIMIT_EXCEEDED: "warning",
    SubmissionStatus.RUNTIME_ERROR: "danger",
    SubmissionStatus.COMPILE_ERROR: "warning",
    SubmissionStatus.SYSTEM_ERROR: "danger",
    SubmissionStatus.PENDING: "info",
    SubmissionStatus.JUDGING: "info",
}


class TestResultInline(TabularInline):
    model = SubmissionTestResult
    extra = 0
    fields = ("order", "status", "runtime_ms", "memory_kb", "is_sample", "stdout", "stderr")
    readonly_fields = fields
    can_delete = False
    ordering = ("order",)

    def has_add_permission(self, request, obj=None) -> bool:
        return False


@admin.register(Submission)
class SubmissionAdmin(ModelAdmin):
    list_display = (
        "created_at",
        "user",
        "problem",
        "language",
        "verdict_badge",
        "tests_cell",
        "runtime_cell",
        "contest",
    )
    list_filter = (
        ("status", titled(ChoicesDropdownFilter, "Verdikt")),
        ("language", titled(ChoicesDropdownFilter, "Til")),
        ("is_practice", titled(BooleanRadioFilter, "Amaliyot")),
        ("problem", titled(RelatedDropdownFilter, "Masala")),
        ("contest", titled(RelatedDropdownFilter, "Olimpiada")),
        ("runtime_ms", titled(RangeNumericFilter, "Bajarilish vaqti")),
        ("created_at", titled(RangeDateFilter, "Yuborilgan sana")),
    )
    search_fields = ("user__username", "problem__title_uz", "problem__slug", "ip_address")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_per_page = 50
    autocomplete_fields = ("user", "problem", "contest")
    inlines = (TestResultInline,)
    actions = ("rejudge",)

    readonly_fields = (
        *(field.name for field in Submission._meta.fields),
        "code_block",
    )

    fieldsets = (
        (None, {"fields": ("user", "problem", "contest", "language", "status")}),
        ("Kod", {"fields": ("code_block",)}),
        ("Natija", {
            "fields": (
                "passed_tests", "total_tests", "failed_test_index", "score",
                "runtime_ms", "memory_kb", "error_message", "compile_output",
            ),
        }),
        ("Texnik", {
            "classes": ("collapse",),
            "fields": (
                "is_practice", "is_first_accepted", "is_counted",
                "judge_tokens", "ip_address", "judged_at", "created_at",
            ),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "problem", "contest")

    # --------------------------------------------------------------- ustunlar
    @display(description="Verdikt", label=VERDICT_LABELS, ordering="status")
    def verdict_badge(self, obj: Submission):
        return obj.status, obj.get_status_display()

    @display(description="Testlar")
    def tests_cell(self, obj: Submission):
        if not obj.total_tests:
            return format_html('<span class="text-base-500">—</span>')
        return format_html(
            '<span class="font-mono">{}/{}</span>{}',
            obj.passed_tests,
            obj.total_tests,
            format_html(
                ' <span class="text-xs text-red-600">#{} da</span>', obj.failed_test_index
            ) if obj.failed_test_index else "",
        )

    @display(description="Vaqt / xotira", ordering="runtime_ms")
    def runtime_cell(self, obj: Submission) -> str:
        parts = []
        if obj.runtime_ms is not None:
            parts.append(f"{obj.runtime_ms} ms")
        if obj.memory_kb is not None:
            parts.append(f"{round(obj.memory_kb / 1024)} MB")
        return " · ".join(parts) or "—"

    @display(description="Yuborilgan kod")
    def code_block(self, obj: Submission):
        return format_html(
            '<pre style="max-height:28rem;overflow:auto;white-space:pre;'
            'font-family:ui-monospace,monospace;font-size:12.5px;line-height:1.6">{}</pre>',
            obj.code or "",
        )

    # ---------------------------------------------------------------- amallar
    @action(description="Qayta tekshirish (rejudge)", permissions=["rejudge"])
    def rejudge(self, request, queryset):
        from .tasks import rejudge_submissions

        ids = [str(pk) for pk in queryset.values_list("pk", flat=True)]
        if not ids:
            messages.warning(request, "Hech narsa tanlanmadi.")
            return
        rejudge_submissions.delay(ids)
        messages.success(
            request,
            f"{len(ids)} ta yechim navbatga qo'yildi. Natija bir necha soniyada yangilanadi.",
        )

    def has_rejudge_permission(self, request) -> bool:
        """Qayta tekshirish alohida huquq: u serverga real yuk beradi."""
        return request.user.has_perm("judge.change_submission")

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        # Faqat ko'rish. Amallar (rejudge) baribir ishlaydi.
        return False


@admin.register(SubmissionTestResult)
class SubmissionTestResultAdmin(ModelAdmin):
    list_display = ("submission", "order", "status", "runtime_ms", "memory_kb", "is_sample")
    list_filter = (
        ("status", titled(ChoicesDropdownFilter, "Verdikt")),
        ("is_sample", titled(BooleanRadioFilter, "Namuna test")),
    )
    search_fields = ("submission__user__username", "submission__problem__title_uz")
    ordering = ("submission", "order")

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False
