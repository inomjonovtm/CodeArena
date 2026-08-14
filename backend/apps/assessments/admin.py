"""Test savollari va sinovlari — boshqaruv paneli."""
from __future__ import annotations

from django.contrib import admin, messages
from django.db.models import Count
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline
from unfold.contrib.filters.admin import (
    ChoicesDropdownFilter,
    RangeDateFilter,
    RangeNumericFilter,
    RelatedDropdownFilter,
)
from unfold.decorators import action, display

from apps.core.admin_utils import titled

from .models import Question, QuestionFolder, Quiz, QuizAttempt, QuizItem


@admin.register(QuestionFolder)
class QuestionFolderAdmin(ModelAdmin):
    list_display = ("path", "owner", "question_count", "is_shared", "order")
    list_filter = ("is_shared", ("owner", RelatedDropdownFilter))
    search_fields = ("name",)
    autocomplete_fields = ("parent", "owner")
    ordering = ("order", "name")

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related("parent", "owner")
            .annotate(_questions=Count("questions"))
        )

    @display(description="Savollar", ordering="_questions")
    def question_count(self, obj: QuestionFolder) -> int:
        return getattr(obj, "_questions", 0)


@admin.register(Question)
class QuestionAdmin(ModelAdmin):
    list_display = ("body_preview", "kind_badge", "difficulty_badge", "points",
                    "folder", "quality_cell", "author")
    list_filter = (
        ("kind", titled(ChoicesDropdownFilter, "Savol turi")),
        ("difficulty", titled(ChoicesDropdownFilter, "Qiyinlik")),
        ("folder", titled(RelatedDropdownFilter, "Papka")),
        ("tags", titled(RelatedDropdownFilter, "Teg")),
        ("created_at", titled(RangeDateFilter, "Yaratilgan sana")),
    )
    search_fields = ("body_md", "explanation_md")
    autocomplete_fields = ("folder", "author")
    filter_horizontal = ("tags",)
    ordering = ("-created_at",)
    list_per_page = 40
    readonly_fields = ("times_answered", "times_correct", "created_at", "updated_at")

    fieldsets = (
        (None, {"fields": ("body_md", "kind", "folder", "difficulty", "points", "tags")}),
        ("Javoblar", {
            "description": (
                "Variantli turlarda «options» to'ldiriladi: "
                '[{"text": "...", "is_correct": true}]. '
                "Matnli va sonli turlarda esa «answers» — qabul qilinadigan javoblar ro'yxati."
            ),
            "fields": ("options", "answers", "number_tolerance", "explanation_md"),
        }),
        ("Statistika", {
            "classes": ("collapse",),
            "fields": ("author", "times_answered", "times_correct", "created_at", "updated_at"),
        }),
    )

    @display(description="Savol")
    def body_preview(self, obj: Question) -> str:
        return (obj.body_md or "").strip().replace("\n", " ")[:80] or "—"

    @display(description="Turi")
    def kind_badge(self, obj: Question) -> str:
        return obj.get_kind_display()

    @display(
        description="Qiyinlik",
        label={"easy": "success", "medium": "warning", "hard": "danger"},
        ordering="difficulty",
    )
    def difficulty_badge(self, obj: Question):
        return obj.difficulty, obj.get_difficulty_display()

    @display(description="Sifati", ordering="times_answered")
    def quality_cell(self, obj: Question):
        """0% yoki 100% — savol sinovda hech narsani o'lchamayapti."""
        if not obj.times_answered:
            return format_html('<span class="text-base-500">yangi</span>')
        rate = obj.correct_rate
        tone = "text-red-600" if rate >= 95 or rate <= 5 else "text-base-700 dark:text-base-300"
        return format_html(
            '<span class="font-mono {}">{}%</span> '
            '<span class="text-xs text-base-500">/ {}</span>',
            tone, rate, obj.times_answered,
        )


class QuizItemInline(TabularInline):
    model = QuizItem
    extra = 0
    fields = ("order", "question", "points")
    autocomplete_fields = ("question",)
    ordering = ("order",)


@admin.register(Quiz)
class QuizAdmin(ModelAdmin):
    list_display = ("title_uz", "status_badge", "question_count", "attempt_count",
                    "time_limit_min", "pass_score_percent", "starts_at")
    list_filter = (
        ("status", titled(ChoicesDropdownFilter, "Holat")),
        ("starts_at", titled(RangeDateFilter, "Boshlanish sanasi")),
        ("author", titled(RelatedDropdownFilter, "Muallif")),
    )
    search_fields = ("title_uz", "slug", "description_md")
    prepopulated_fields = {"slug": ("title_uz",)}
    autocomplete_fields = ("author",)
    inlines = (QuizItemInline,)
    ordering = ("-created_at",)
    actions = ("publish", "close")
    readonly_fields = ("published_at", "created_at", "updated_at", "studio_link")

    fieldsets = (
        (None, {"fields": ("title_uz", "slug", "status", "description_md", "studio_link")}),
        ("Qoidalar", {
            "fields": (
                "time_limit_min", "attempts_allowed", "pass_score_percent",
                "shuffle_questions", "shuffle_options", "show_answers",
            ),
        }),
        ("Ochiq bo'lish vaqti", {
            "fields": ("starts_at", "ends_at", "access_password"),
        }),
        ("Texnik", {
            "classes": ("collapse",),
            "fields": ("author", "published_at", "created_at", "updated_at"),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _items=Count("items", distinct=True),
            _attempts=Count("attempts", distinct=True),
        )

    @display(
        description="Holat",
        label={"published": "success", "draft": "warning", "closed": ""},
        ordering="status",
    )
    def status_badge(self, obj: Quiz):
        return obj.status, obj.get_status_display()

    @display(description="Savollar", ordering="_items")
    def question_count(self, obj: Quiz) -> int:
        return getattr(obj, "_items", 0)

    @display(description="Urinishlar", ordering="_attempts")
    def attempt_count(self, obj: Quiz) -> int:
        return getattr(obj, "_attempts", 0)

    @display(description="Studio")
    def studio_link(self, obj: Quiz):
        if not obj.pk:
            return "—"
        return format_html(
            '<a class="text-primary-600 font-medium" href="/studio/quizzes/{}" target="_blank">'
            "Studio'da ochish (savollar, natijalar) →</a>",
            obj.pk,
        )

    @action(description="Chop etish")
    def publish(self, request, queryset):
        blocked = queryset.annotate(n=Count("items")).filter(n=0)
        blocked_count = blocked.count()
        ready = queryset.exclude(pk__in=blocked.values("pk"))
        count = ready.update(status=Quiz.Status.PUBLISHED, published_at=timezone.now())
        messages.success(request, f"{count} ta sinov chop etildi.")
        if blocked_count:
            messages.warning(request, f"{blocked_count} tasida savol yo'q — o'tkazib yuborildi.")

    @action(description="Yopish")
    def close(self, request, queryset):
        count = queryset.update(status=Quiz.Status.CLOSED)
        messages.success(request, f"{count} ta sinov yopildi.")


@admin.register(QuizItem)
class QuizItemAdmin(ModelAdmin):
    list_display = ("quiz", "order", "question", "points")
    list_filter = (("quiz", RelatedDropdownFilter),)
    search_fields = ("quiz__title_uz", "question__body_md")
    autocomplete_fields = ("quiz", "question")
    ordering = ("quiz", "order")


@admin.register(QuizAttempt)
class QuizAttemptAdmin(ModelAdmin):
    list_display = ("quiz", "user", "score_cell", "correct_count", "result_badge", "submitted_at")
    list_filter = (
        "is_passed",
        ("quiz", RelatedDropdownFilter),
        ("score", RangeNumericFilter),
        ("created_at", RangeDateFilter),
    )
    search_fields = ("user__username", "user__full_name", "quiz__title_uz")
    autocomplete_fields = ("quiz", "user")
    ordering = ("-created_at",)
    readonly_fields = tuple(f.name for f in QuizAttempt._meta.fields)

    @display(description="Ball", ordering="score")
    def score_cell(self, obj: QuizAttempt):
        return format_html(
            '<span class="font-mono">{}/{}</span> '
            '<span class="text-xs text-base-500">{}%</span>',
            obj.score, obj.max_score, obj.percent,
        )

    @display(description="Natija", label={True: "success", False: "danger"})
    def result_badge(self, obj: QuizAttempt):
        return obj.is_passed, "O'tdi" if obj.is_passed else "O'tmadi"

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False
