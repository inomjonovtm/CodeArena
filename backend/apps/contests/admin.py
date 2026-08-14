"""Olimpiadalar — boshqaruv paneli.

Musobaqani TAYYORLASH (masala biriktirish, hakam qo'yish) Studio'da qulayroq;
bu yerda esa boshqaruv: ro'yxat, holat, kirish shartlari, ishtirokchilarni
diskvalifikatsiya qilish va reytingni qo'llash.
"""
from __future__ import annotations

from django.contrib import admin, messages
from django.db.models import Count
from django.utils import timezone
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

from .models import (
    Contest,
    ContestParticipant,
    ContestProblem,
    ContestStaff,
    ContestStatus,
)


class ContestProblemInline(TabularInline):
    model = ContestProblem
    extra = 0
    fields = ("order", "label", "problem", "points")
    autocomplete_fields = ("problem",)
    ordering = ("order",)


class ContestStaffInline(TabularInline):
    model = ContestStaff
    extra = 0
    fields = ("user", "role", "note")
    autocomplete_fields = ("user",)
    fk_name = "contest"


@admin.register(Contest)
class ContestAdmin(ModelAdmin):
    list_display = (
        "title_cell",
        "state_badge",
        "when_cell",
        "problem_count",
        "participant_count",
        "scoring",
        "rated_badge",
    )
    list_filter = (
        ("status", titled(ChoicesDropdownFilter, "Holat")),
        ("visibility", titled(ChoicesDropdownFilter, "Turi")),
        ("scoring", titled(ChoicesDropdownFilter, "Qoidalar")),
        ("is_rated", titled(BooleanRadioFilter, "Reytingli")),
        ("start_time", titled(RangeDateFilter, "Boshlanish sanasi")),
        ("created_by", titled(RelatedDropdownFilter, "Yaratgan")),
    )
    search_fields = ("title_uz", "title_en", "slug", "description_uz")
    ordering = ("-start_time",)
    date_hierarchy = "start_time"
    prepopulated_fields = {"slug": ("title_uz",)}
    autocomplete_fields = ("created_by",)
    inlines = (ContestProblemInline, ContestStaffInline)
    actions = ("schedule", "finish", "cancel", "apply_ratings", "scan_plagiarism")
    readonly_fields = (
        "ratings_applied_at", "plagiarism_checked_at", "reminder_sent_at",
        "created_at", "updated_at", "studio_link",
    )

    fieldsets = (
        (None, {"fields": ("title_uz", "title_en", "slug", "status", "studio_link")}),
        ("Matn", {"fields": ("description_uz", "editorial_uz", "rules_url")}),
        ("Vaqt", {
            "fields": (
                "start_time", "end_time", "duration_minutes", "registration_ends_at",
            ),
        }),
        ("Format", {
            "fields": (
                "scoring", "participation", "team_mode", "allowed_languages",
                "is_rated", "is_virtual_allowed",
            ),
        }),
        ("Kirish sharti", {
            "fields": (
                "visibility", "access_password", "open_registration",
                "min_rating", "max_rating", "max_participants",
            ),
        }),
        ("Musobaqa davomida ko'rinish", {
            "classes": ("collapse",),
            "fields": (
                "hide_authors", "hide_results", "hide_submissions",
                "public_scoreboard", "keep_problems_public",
            ),
        }),
        ("Reyting", {
            "classes": ("collapse",),
            "fields": ("rating_k_new", "rating_k_experienced", "ratings_applied_at"),
        }),
        ("Texnik", {
            "classes": ("collapse",),
            "fields": ("created_by", "plagiarism_checked_at", "reminder_sent_at",
                       "created_at", "updated_at"),
        }),
    )

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related("created_by")
            .annotate(
                _problems=Count("contest_problems", distinct=True),
                _participants=Count("participants", distinct=True),
            )
        )

    # --------------------------------------------------------------- ustunlar
    @display(description="Olimpiada", ordering="title_uz")
    def title_cell(self, obj: Contest):
        return format_html(
            '<div class="font-medium">{}</div>'
            '<div class="text-xs text-base-500 font-mono">{}</div>',
            obj.title_uz, obj.slug,
        )

    @display(
        description="Holat",
        label={
            "running": "warning",
            "finished": "success",
            "scheduled": "info",
            "draft": "",
            "cancelled": "danger",
        },
    )
    def state_badge(self, obj: Contest):
        state = obj.computed_status
        return state, dict(ContestStatus.choices).get(state, state)

    @display(description="Vaqti", ordering="start_time")
    def when_cell(self, obj: Contest):
        # `format_html` argumentlarni `SafeString` ga o'raydi, shuning uchun
        # `{:02d}` kabi son formatlari UNDA ishlamaydi — raqamlar oldindan
        # matnga aylantiriladi.
        hours, minutes = divmod(obj.duration_minutes, 60)
        return format_html(
            '<div>{}</div><div class="text-xs text-base-500">{} davom etadi</div>',
            timezone.localtime(obj.start_time).strftime("%d.%m.%Y %H:%M"),
            f"{hours:02d}:{minutes:02d}",
        )

    @display(description="Masala", ordering="_problems")
    def problem_count(self, obj: Contest) -> int:
        return getattr(obj, "_problems", 0)

    @display(description="Ishtirokchi", ordering="_participants")
    def participant_count(self, obj: Contest) -> int:
        return getattr(obj, "_participants", 0)

    @display(description="Reyting", boolean=True, ordering="is_rated")
    def rated_badge(self, obj: Contest) -> bool:
        return obj.is_rated

    @display(description="Studio")
    def studio_link(self, obj: Contest):
        if not obj.pk:
            return "—"
        return format_html(
            '<a class="text-primary-600 font-medium" href="/studio/contests/{}" target="_blank">'
            "Studio'da ochish (masalalar, hakamlar, natijalar) →</a>",
            obj.pk,
        )

    # ---------------------------------------------------------------- amallar
    @action(description="Rejalashtirilgan deb belgilash")
    def schedule(self, request, queryset):
        count = queryset.update(status=ContestStatus.SCHEDULED)
        messages.success(request, f"{count} ta olimpiada rejalashtirildi.")

    @action(description="Tugatilgan deb belgilash")
    def finish(self, request, queryset):
        count = queryset.update(status=ContestStatus.FINISHED)
        messages.success(request, f"{count} ta olimpiada tugatildi.")

    @action(description="Bekor qilish")
    def cancel(self, request, queryset):
        count = queryset.update(status=ContestStatus.CANCELLED)
        messages.success(request, f"{count} ta olimpiada bekor qilindi.")

    @action(description="Reytingni qo'llash")
    def apply_ratings(self, request, queryset):
        """Elo reyting bir marta qo'llanadi — takrorlansa natija buziladi."""
        from .tasks import apply_contest_ratings

        now = timezone.now()
        queued = skipped = 0
        for contest in queryset:
            if contest.end_time > now or contest.ratings_applied_at:
                skipped += 1
                continue
            apply_contest_ratings.delay(str(contest.pk))
            queued += 1
        if queued:
            messages.success(request, f"{queued} ta olimpiada reytingi hisoblanmoqda.")
        if skipped:
            messages.warning(
                request,
                f"{skipped} tasi o'tkazib yuborildi — tugamagan yoki reyting allaqachon qo'llangan.",
            )

    @action(description="Anti-plagiat tekshiruvini boshlash")
    def scan_plagiarism(self, request, queryset):
        from apps.moderation.tasks import scan_contest_plagiarism

        for contest in queryset:
            scan_contest_plagiarism.delay(str(contest.pk))
        messages.success(request, f"{queryset.count()} ta olimpiada tekshiruvga qo'yildi.")


@admin.register(ContestStaff)
class ContestStaffAdmin(ModelAdmin):
    list_display = ("contest", "user", "role_badge", "note", "added_by", "created_at")
    list_filter = (
        ("role", titled(ChoicesDropdownFilter, "Roli")),
        ("contest", titled(RelatedDropdownFilter, "Olimpiada")),
    )
    search_fields = ("contest__title_uz", "user__username", "user__full_name")
    autocomplete_fields = ("contest", "user", "added_by")
    ordering = ("contest", "role")

    @display(description="Roli", label={"owner": "danger", "judge": "warning", "author": "info"})
    def role_badge(self, obj: ContestStaff):
        return obj.role, obj.get_role_display()


@admin.register(ContestProblem)
class ContestProblemAdmin(ModelAdmin):
    list_display = ("contest", "label", "order", "problem", "points")
    list_filter = (("contest", RelatedDropdownFilter),)
    search_fields = ("contest__title_uz", "problem__title_uz")
    autocomplete_fields = ("contest", "problem")
    ordering = ("contest", "order")


@admin.register(ContestParticipant)
class ContestParticipantAdmin(ModelAdmin):
    list_display = (
        "contest", "user", "rank", "score", "solved_count", "penalty",
        "rating_change_cell", "state_badge",
    )
    list_filter = (
        ("is_disqualified", titled(BooleanRadioFilter, "Diskvalifikatsiya")),
        ("is_virtual", titled(BooleanRadioFilter, "Virtual ishtirok")),
        ("contest", titled(RelatedDropdownFilter, "Olimpiada")),
        ("score", titled(RangeNumericFilter, "Ball")),
    )
    search_fields = ("user__username", "user__full_name", "contest__title_uz")
    autocomplete_fields = ("contest", "user")
    ordering = ("contest", "rank")
    list_per_page = 50
    actions = ("disqualify", "restore")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "contest")

    @display(description="Reyting", ordering="rating_change")
    def rating_change_cell(self, obj: ContestParticipant):
        if obj.rating_before is None or obj.rating_after is None:
            return format_html('<span class="text-base-500">—</span>')
        sign = "+" if obj.rating_change > 0 else ""
        return format_html(
            '<span class="font-mono">{} → {}</span> '
            '<span class="text-xs text-base-500">({}{})</span>',
            obj.rating_before, obj.rating_after, sign, obj.rating_change,
        )

    @display(description="Holat", label={True: "danger", False: "success"})
    def state_badge(self, obj: ContestParticipant):
        return obj.is_disqualified, "Diskvalifikatsiya" if obj.is_disqualified else "Ishtirokchi"

    @action(description="Diskvalifikatsiya qilish")
    def disqualify(self, request, queryset):
        count = queryset.update(
            is_disqualified=True,
            disqualify_reason=f"Admin paneldan ({request.user.username})",
        )
        messages.success(request, f"{count} ta ishtirokchi diskvalifikatsiya qilindi.")

    @action(description="Tiklash")
    def restore(self, request, queryset):
        count = queryset.update(is_disqualified=False, disqualify_reason="")
        messages.success(request, f"{count} ta ishtirokchi tiklandi.")
