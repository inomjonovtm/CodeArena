"""Test savollari bankasi va test sinovlari.

Savol MUSTAQIL obyekt: papkada saqlanadi, bir nechta sinovda qayta
ishlatiladi va o'z statistikasiga ega (necha marta javob berilgan, necha
foizi to'g'ri). Shu tufayli sinov tuzish savol yozishdan ajralgan: bir
marta yozilgan savol yillar davomida turli sinovlarda ishlaydi.
"""
from __future__ import annotations

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import BaseModel, SoftDeleteModel


class QuestionKind(models.TextChoices):
    SINGLE = "single", "Bitta to'g'ri javob"
    MULTI = "multi", "Bir nechta to'g'ri javob"
    TRUE_FALSE = "boolean", "To'g'ri / Noto'g'ri"
    SHORT = "short", "Qisqa matnli javob"
    NUMBER = "number", "Sonli javob"


class QuestionDifficulty(models.TextChoices):
    EASY = "easy", "Oson"
    MEDIUM = "medium", "O'rta"
    HARD = "hard", "Qiyin"


class ShowAnswers(models.TextChoices):
    NEVER = "never", "Hech qachon"
    AFTER_ATTEMPT = "after_attempt", "Urinish tugagach"
    AFTER_CLOSE = "after_close", "Sinov yopilgach"


class QuestionFolder(BaseModel):
    """Savollar daraxti. Har bir muallifning o'z ildiz papkasi bo'ladi."""

    name = models.CharField(max_length=120)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="question_folders",
    )
    order = models.PositiveIntegerField(default=0)
    is_shared = models.BooleanField(
        default=False, help_text="Boshqa mualliflar ham savollardan foydalana oladi"
    )

    class Meta:
        db_table = "question_folders"
        verbose_name = "Savollar papkasi"
        verbose_name_plural = "Savollar papkalari"
        ordering = ["order", "name"]
        indexes = [models.Index(fields=["owner", "parent"])]

    def __str__(self) -> str:
        return self.name

    @property
    def path(self) -> str:
        """«Ildiz / Bo'lim / Papka» ko'rinishidagi to'liq yo'l."""
        names, node, guard = [], self, 0
        # Halqa (parent zanjiri o'ziga qaytishi) sahifani abadiy osib
        # qo'ymasin — chuqurlik cheklangan.
        while node is not None and guard < 12:
            names.append(node.name)
            node = node.parent
            guard += 1
        return " / ".join(reversed(names))


class Question(SoftDeleteModel, BaseModel):
    """Bitta test savoli."""

    folder = models.ForeignKey(
        QuestionFolder, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="questions",
    )
    kind = models.CharField(max_length=10, choices=QuestionKind.choices, default=QuestionKind.SINGLE)
    body_md = models.TextField(help_text="Savol matni — Markdown")
    # `[{"text": "...", "is_correct": true}]` — variantlar tartibi saqlanadi,
    # chunki aralashtirish sinov sozlamasi bilan boshqariladi.
    options = models.JSONField(default=list, blank=True)
    # SHORT va NUMBER uchun: qabul qilinadigan javoblar ro'yxati.
    answers = models.JSONField(default=list, blank=True)
    number_tolerance = models.FloatField(
        default=0.0, help_text="NUMBER turi uchun ruxsat etilgan xatolik"
    )

    explanation_md = models.TextField(blank=True, help_text="Javobdan keyin ko'rinadigan izoh")
    difficulty = models.CharField(
        max_length=8, choices=QuestionDifficulty.choices, default=QuestionDifficulty.MEDIUM
    )
    points = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    tags = models.ManyToManyField("problems.Tag", blank=True, related_name="questions")

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="authored_questions",
    )

    # Statistika — savolning sifatini ko'rsatadi: hech kim topa olmasa yoki
    # hamma topsa, savol foydasiz.
    times_answered = models.PositiveIntegerField(default=0)
    times_correct = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "questions"
        verbose_name = "Savol"
        verbose_name_plural = "Savollar"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["folder", "kind"]),
            models.Index(fields=["difficulty"]),
        ]

    def __str__(self) -> str:
        return (self.body_md or "")[:60]

    @property
    def correct_rate(self) -> float:
        if not self.times_answered:
            return 0.0
        return round(self.times_correct / self.times_answered * 100, 1)

    @property
    def correct_indexes(self) -> list[int]:
        return [
            index for index, option in enumerate(self.options or [])
            if isinstance(option, dict) and option.get("is_correct")
        ]

    def check_answer(self, given) -> bool:
        """Berilgan javob to'g'rimi. Sinov natijasini hisoblashda ishlatiladi."""
        if self.kind in {QuestionKind.SINGLE, QuestionKind.TRUE_FALSE}:
            correct = self.correct_indexes
            return len(correct) == 1 and given == correct[0]

        if self.kind == QuestionKind.MULTI:
            # Qisman javob ball bermaydi: to'plam AYNAN mos kelishi kerak.
            if not isinstance(given, (list, tuple)):
                return False
            return sorted(int(x) for x in given) == sorted(self.correct_indexes)

        if self.kind == QuestionKind.SHORT:
            text = str(given or "").strip().casefold()
            return any(text == str(a).strip().casefold() for a in (self.answers or []))

        if self.kind == QuestionKind.NUMBER:
            try:
                value = float(str(given).replace(",", "."))
            except (TypeError, ValueError):
                return False
            tolerance = abs(self.number_tolerance or 0.0)
            for answer in self.answers or []:
                try:
                    target = float(str(answer).replace(",", "."))
                except (TypeError, ValueError):
                    continue
                if abs(value - target) <= tolerance:
                    return True
            return False

        return False


class Quiz(SoftDeleteModel, BaseModel):
    """Test sinovi — savollardan yig'ilgan, vaqti cheklangan to'plam."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Qoralama"
        PUBLISHED = "published", "Chop etilgan"
        CLOSED = "closed", "Yopilgan"

    slug = models.SlugField(max_length=120, unique=True)
    title_uz = models.CharField(max_length=180)
    description_md = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, db_index=True)

    time_limit_min = models.PositiveIntegerField(default=0, help_text="0 — vaqt cheklanmagan")
    attempts_allowed = models.PositiveIntegerField(default=1, help_text="0 — cheksiz")
    pass_score_percent = models.PositiveIntegerField(
        default=60, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    shuffle_questions = models.BooleanField(default=True)
    shuffle_options = models.BooleanField(default=True)
    show_answers = models.CharField(
        max_length=14, choices=ShowAnswers.choices, default=ShowAnswers.AFTER_ATTEMPT
    )

    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    access_password = models.CharField(max_length=64, blank=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="authored_quizzes",
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "quizzes"
        verbose_name = "Test sinovi"
        verbose_name_plural = "Test sinovlari"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title_uz

    @property
    def total_points(self) -> int:
        return sum(item.points for item in self.items.all())


class QuizItem(BaseModel):
    """Sinovdagi savol. Ball sinovga xos — bir savol turli sinovda turlicha
    baholanishi mumkin."""

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="items")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="quiz_items")
    order = models.PositiveIntegerField(default=0)
    points = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        db_table = "quiz_items"
        verbose_name = "Sinov savoli"
        verbose_name_plural = "Sinov savollari"
        ordering = ["order"]
        unique_together = [("quiz", "question")]

    def __str__(self) -> str:
        return f"{self.quiz} #{self.order}"


class QuizAttempt(BaseModel):
    """Foydalanuvchining bitta urinishi."""

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_runs"
    )
    # `{"<question_id>": <javob>}` — savol o'chirilsa ham urinish saqlanadi.
    answers = models.JSONField(default=dict, blank=True)
    score = models.PositiveIntegerField(default=0)
    max_score = models.PositiveIntegerField(default=0)
    correct_count = models.PositiveIntegerField(default=0)
    total_count = models.PositiveIntegerField(default=0)
    is_passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "quiz_attempts"
        verbose_name = "Sinov urinishi"
        verbose_name_plural = "Sinov urinishlari"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["quiz", "user"])]

    def __str__(self) -> str:
        return f"{self.user} → {self.quiz} ({self.score}/{self.max_score})"

    @property
    def percent(self) -> float:
        if not self.max_score:
            return 0.0
        return round(self.score / self.max_score * 100, 1)
