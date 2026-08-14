"""Masalalar — boshqaruv paneli.

Masalaning MAZMUNI (shart, testlar, checker, generator) Studio panelida
tayyorlanadi: u yerda kod muharriri va kodni ishga tushirish bor. Bu yerda
esa masala BOSHQARILADI — ro'yxat, filtr, ommaviy amallar, chop etish va
nima yetishmayotganini bir qarashda ko'rish.
"""
from __future__ import annotations

from django.contrib import admin, messages
from django.db.models import Count, Q
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
    AuthoringRun,
    Bookmark,
    DailyChallenge,
    Problem,
    ProblemStatus,
    ReferenceSolution,
    SolvedProblem,
    Tag,
    TestCase,
    TestGenerator,
)


class TestCaseInline(TabularInline):
    model = TestCase
    extra = 0
    fields = ("order", "is_sample", "input", "expected_output", "source", "seed")
    readonly_fields = ("source", "seed")
    ordering = ("order",)
    # Yuzlab testli masalada inline butun sahifani osib qo'yadi. Bu yerda
    # faqat birinchi 20 tasi ko'rinadi; qolgani «Test-case'lar» bo'limida.
    max_num = 20
    classes = ("collapse",)


class ReferenceSolutionInline(TabularInline):
    model = ReferenceSolution
    extra = 0
    fields = ("name", "kind", "language", "is_primary", "last_verdict", "last_checked_at")
    readonly_fields = ("last_verdict", "last_checked_at")
    show_change_link = True
    classes = ("collapse",)


class TestGeneratorInline(TabularInline):
    model = TestGenerator
    extra = 0
    fields = ("name", "language", "count", "seed_start", "is_active", "last_run_at")
    readonly_fields = ("last_run_at",)
    show_change_link = True
    classes = ("collapse",)


@admin.register(Problem)
class ProblemAdmin(ModelAdmin):
    list_display = (
        "title_cell",
        "difficulty_badge",
        "checker_badge",
        "tests_cell",
        "acceptance_cell",
        "status_badge",
        "author",
        "updated_at",
    )
    list_filter = (
        ("status", titled(ChoicesDropdownFilter, "Holat")),
        ("difficulty", titled(ChoicesDropdownFilter, "Qiyinlik")),
        ("checker_type", titled(ChoicesDropdownFilter, "Tekshirish usuli")),
        ("is_premium", titled(BooleanRadioFilter, "Premium")),
        ("is_contest_only", titled(BooleanRadioFilter, "Faqat musobaqa uchun")),
        ("tags", titled(RelatedDropdownFilter, "Teg")),
        ("author", titled(RelatedDropdownFilter, "Muallif")),
        ("points", titled(RangeNumericFilter, "Ball")),
        ("created_at", titled(RangeDateFilter, "Yaratilgan sana")),
    )
    search_fields = ("title_uz", "title_en", "slug", "description_uz")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_per_page = 30
    prepopulated_fields = {"slug": ("title_uz",)}
    autocomplete_fields = ("author",)
    filter_horizontal = ("tags",)
    inlines = (TestCaseInline, ReferenceSolutionInline, TestGeneratorInline)
    actions = ("publish", "unpublish", "archive", "mark_contest_only", "unmark_contest_only")
    readonly_fields = (
        "total_submissions", "accepted_submissions", "created_at", "updated_at",
        "studio_link",
    )

    fieldsets = (
        (None, {
            "fields": ("title_uz", "title_en", "slug", "status", "studio_link"),
        }),
        ("Shart", {
            "fields": ("description_uz", "constraints_uz", "hint_uz", "editorial_uz"),
        }),
        ("Baholash", {
            "fields": (
                "difficulty", "points", "tags",
                "time_limit_ms", "memory_limit_kb",
            ),
        }),
        ("Javobni tekshirish", {
            "description": (
                "Checker kodi Studio panelida yoziladi — u yerda muharrir va "
                "sinov maydoni bor. Bu yerda faqat usulni ko'rish/almashtirish."
            ),
            "classes": ("collapse",),
            "fields": (
                "checker_type", "float_epsilon",
                "checker_language", "checker_code",
                "validator_language", "validator_code",
            ),
        }),
        ("Ko'rinish", {
            "classes": ("collapse",),
            "fields": ("is_premium", "is_contest_only", "cover_image_url", "publish_at"),
        }),
        ("Statistika", {
            "classes": ("collapse",),
            "fields": (
                "author", "total_submissions", "accepted_submissions",
                "published_at", "created_at", "updated_at",
            ),
        }),
    )

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related("author")
            .annotate(
                _tests=Count("test_cases", distinct=True),
                _samples=Count("test_cases", filter=Q(test_cases__is_sample=True), distinct=True),
                _solutions=Count("solutions", distinct=True),
            )
        )

    # --------------------------------------------------------------- ustunlar
    @display(description="Masala", ordering="title_uz")
    def title_cell(self, obj: Problem):
        return format_html(
            '<div class="font-medium">{}</div>'
            '<div class="text-xs text-base-500 font-mono">{}</div>',
            obj.title_uz,
            obj.slug,
        )

    @display(
        description="Qiyinlik",
        label={"easy": "success", "medium": "warning", "hard": "danger"},
        ordering="difficulty",
    )
    def difficulty_badge(self, obj: Problem):
        return obj.difficulty, obj.get_difficulty_display()

    @display(description="Checker", label={"custom": "info", "float": "warning"})
    def checker_badge(self, obj: Problem):
        return obj.checker_type, obj.get_checker_type_display()

    @display(description="Testlar", ordering="_tests")
    def tests_cell(self, obj: Problem):
        """Testlar va etalon yechim — chop etish uchun ikkalasi ham shart."""
        tests = getattr(obj, "_tests", 0)
        samples = getattr(obj, "_samples", 0)
        solutions = getattr(obj, "_solutions", 0)
        if not tests:
            return format_html('<span class="text-red-600 font-medium">test yo\'q</span>')
        if not solutions:
            return format_html(
                '<span class="font-mono">{}</span> '
                '<span class="text-red-600 text-xs">etalon yo\'q</span>',
                tests,
            )
        return format_html(
            '<span class="font-mono">{}</span> '
            '<span class="text-xs text-base-500">({} namuna)</span>',
            tests, samples,
        )

    @display(description="Qabul", ordering="total_submissions")
    def acceptance_cell(self, obj: Problem):
        if not obj.total_submissions:
            return format_html('<span class="text-base-500">—</span>')
        return format_html(
            '<span class="font-mono">{}%</span> '
            '<span class="text-xs text-base-500">/ {}</span>',
            obj.acceptance_rate, obj.total_submissions,
        )

    @display(
        description="Holat",
        label={"published": "success", "draft": "warning", "archived": ""},
        ordering="status",
    )
    def status_badge(self, obj: Problem):
        return obj.status, obj.get_status_display()

    @display(description="Studio")
    def studio_link(self, obj: Problem):
        if not obj.pk:
            return "—"
        return format_html(
            '<a class="text-primary-600 font-medium" href="/studio/problems/{}" target="_blank">'
            "Studio'da ochish (testlar, checker, generator) →</a>",
            obj.pk,
        )

    # ---------------------------------------------------------------- amallar
    @action(description="Chop etish")
    def publish(self, request, queryset):
        """Testsiz masala chop etilmaydi — aks holda foydalanuvchi
        yechib bo'lmaydigan masalaga urilardi."""
        blocked = queryset.annotate(tc=Count("test_cases")).filter(
            Q(tc=0) | Q(description_uz="")
        )
        blocked_count = blocked.count()
        ready = queryset.exclude(pk__in=blocked.values("pk"))
        count = ready.update(status=ProblemStatus.PUBLISHED, published_at=timezone.now())
        messages.success(request, f"{count} ta masala chop etildi.")
        if blocked_count:
            messages.warning(
                request,
                f"{blocked_count} tasi o'tkazib yuborildi — testi yoki sharti yo'q.",
            )

    @action(description="Qoralamaga qaytarish")
    def unpublish(self, request, queryset):
        count = queryset.update(status=ProblemStatus.DRAFT)
        messages.success(request, f"{count} ta masala qoralamaga o'tdi.")

    @action(description="Arxivlash")
    def archive(self, request, queryset):
        count = queryset.update(status=ProblemStatus.ARCHIVED)
        messages.success(request, f"{count} ta masala arxivlandi.")

    @action(description="Faqat musobaqa uchun deb belgilash")
    def mark_contest_only(self, request, queryset):
        count = queryset.update(is_contest_only=True)
        messages.success(request, f"{count} ta masala ommaviy ro'yxatdan yashirildi.")

    @action(description="Ommaviy ro'yxatga qaytarish")
    def unmark_contest_only(self, request, queryset):
        count = queryset.update(is_contest_only=False)
        messages.success(request, f"{count} ta masala ommaviy ro'yxatga qaytdi.")


@admin.register(TestCase)
class TestCaseAdmin(ModelAdmin):
    list_display = ("problem", "order", "kind_badge", "input_preview", "output_preview", "seed")
    list_filter = (
        ("is_sample", titled(BooleanRadioFilter, "Namuna test")),
        ("source", titled(ChoicesDropdownFilter, "Kelib chiqishi")),
        ("problem", titled(RelatedDropdownFilter, "Masala")),
    )
    search_fields = ("problem__title_uz", "input", "expected_output")
    ordering = ("problem", "order")
    autocomplete_fields = ("problem",)
    list_per_page = 50
    readonly_fields = ("source", "generator", "seed")

    @display(description="Turi", label={True: "info"})
    def kind_badge(self, obj: TestCase):
        return obj.is_sample, "namuna" if obj.is_sample else "yashirin"

    @display(description="Kirish")
    def input_preview(self, obj: TestCase) -> str:
        return (obj.input or "").strip().replace("\n", " ⏎ ")[:60] or "—"

    @display(description="Kutilgan chiqish")
    def output_preview(self, obj: TestCase) -> str:
        return (obj.expected_output or "").strip().replace("\n", " ⏎ ")[:40] or "—"


@admin.register(ReferenceSolution)
class ReferenceSolutionAdmin(ModelAdmin):
    list_display = ("name", "problem", "kind_badge", "language", "is_primary", "verdict_badge",
                    "last_checked_at")
    list_filter = (
        ("kind", titled(ChoicesDropdownFilter, "Yechim turi")),
        ("language", titled(ChoicesDropdownFilter, "Til")),
        ("is_primary", titled(BooleanRadioFilter, "Asosiy etalon")),
        ("problem", titled(RelatedDropdownFilter, "Masala")),
    )
    search_fields = ("name", "problem__title_uz", "code")
    autocomplete_fields = ("problem", "author")
    ordering = ("-is_primary", "kind")
    readonly_fields = ("last_verdict", "last_checked_at", "last_runtime_ms", "last_message")

    @display(description="Turi", label={"model": "success", "wrong": "danger", "slow": "warning"})
    def kind_badge(self, obj: ReferenceSolution):
        return obj.kind, obj.get_kind_display()

    @display(description="Oxirgi natija", label={"ACCEPTED": "success"})
    def verdict_badge(self, obj: ReferenceSolution):
        return obj.last_verdict or "", obj.last_verdict or "sinalmagan"


@admin.register(TestGenerator)
class TestGeneratorAdmin(ModelAdmin):
    list_display = ("name", "problem", "language", "count", "seed_start", "is_active", "last_run_at")
    list_filter = (
        ("language", titled(ChoicesDropdownFilter, "Til")),
        ("is_active", titled(BooleanRadioFilter, "Faol")),
        ("problem", titled(RelatedDropdownFilter, "Masala")),
    )
    search_fields = ("name", "problem__title_uz", "code")
    autocomplete_fields = ("problem",)
    readonly_fields = ("last_run_at", "last_message")


@admin.register(AuthoringRun)
class AuthoringRunAdmin(ModelAdmin):
    """Studio'da bajarilgan amallar jurnali — faqat o'qish uchun."""

    list_display = ("created_at", "problem", "kind_badge", "status_badge", "summary",
                    "duration_ms", "created_by")
    list_filter = (
        ("kind", titled(ChoicesDropdownFilter, "Amal turi")),
        ("status", titled(ChoicesDropdownFilter, "Natija")),
        ("created_at", titled(RangeDateFilter, "Sana")),
    )
    search_fields = ("problem__title_uz", "summary")
    ordering = ("-created_at",)
    autocomplete_fields = ("problem",)
    readonly_fields = tuple(f.name for f in AuthoringRun._meta.fields)

    @display(description="Amal")
    def kind_badge(self, obj: AuthoringRun) -> str:
        return obj.get_kind_display()

    @display(description="Natija", label={"ok": "success", "failed": "danger"})
    def status_badge(self, obj: AuthoringRun):
        return obj.status, obj.get_status_display()

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False


@admin.register(Tag)
class TagAdmin(ModelAdmin):
    list_display = ("name_uz", "name_en", "slug", "color_chip", "problem_count")
    search_fields = ("name_uz", "name_en", "slug")
    prepopulated_fields = {"slug": ("name_en",)}
    ordering = ("name_en",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_problems=Count("problems"))

    @display(description="Rang")
    def color_chip(self, obj: Tag):
        return format_html(
            '<span style="display:inline-block;width:14px;height:14px;border-radius:4px;'
            'background:{}"></span> <span class="font-mono text-xs">{}</span>',
            obj.color, obj.color,
        )

    @display(description="Masalalar", ordering="_problems")
    def problem_count(self, obj: Tag) -> int:
        return getattr(obj, "_problems", 0)


@admin.register(DailyChallenge)
class DailyChallengeAdmin(ModelAdmin):
    list_display = ("date", "problem", "bonus_points", "note_uz")
    list_filter = (("date", RangeDateFilter),)
    search_fields = ("problem__title_uz", "note_uz")
    autocomplete_fields = ("problem",)
    ordering = ("-date",)
    date_hierarchy = "date"


@admin.register(Bookmark)
class BookmarkAdmin(ModelAdmin):
    list_display = ("user", "problem", "created_at")
    search_fields = ("user__username", "problem__title_uz")
    autocomplete_fields = ("user", "problem")
    list_filter = (("created_at", RangeDateFilter),)
    ordering = ("-created_at",)


@admin.register(SolvedProblem)
class SolvedProblemAdmin(ModelAdmin):
    list_display = ("user", "problem", "points_awarded", "first_solved_at")
    search_fields = ("user__username", "problem__title_uz")
    autocomplete_fields = ("user", "problem")
    list_filter = (("first_solved_at", RangeDateFilter),)
    ordering = ("-first_solved_at",)

    def has_add_permission(self, request) -> bool:
        # Yechim faktini qo'lda yaratish statistikani buzadi.
        return False
