from __future__ import annotations

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.core.models import BaseModel, SoftDeleteModel, TimeStampedModel


class Difficulty(models.TextChoices):
    EASY = "easy", "Oson"
    MEDIUM = "medium", "O'rta"
    HARD = "hard", "Qiyin"


DEFAULT_POINTS = {Difficulty.EASY: 10, Difficulty.MEDIUM: 30, Difficulty.HARD: 50}


class ProblemStatus(models.TextChoices):
    DRAFT = "draft", "Qoralama"
    PUBLISHED = "published", "Chop etilgan"
    ARCHIVED = "archived", "Arxivlangan"


class Language(models.TextChoices):
    """Yechim yozish mumkin bo'lgan tillar.

    Ro'yxat `apps.judge.languages` reyestri bilan bir xil bo'lishi shart —
    buni `apps/judge/tests/test_languages.py` tekshiradi. Migratsiyalar shu
    sinfga tayangani uchun u ataylab aniq yozilgan, generatsiya qilinmagan.
    """

    PYTHON = "python", "Python 3"
    CPP = "cpp", "C++ 17"
    C = "c", "C 17"
    JAVA = "java", "Java 17"
    JAVASCRIPT = "javascript", "JavaScript"
    TYPESCRIPT = "typescript", "TypeScript"
    GO = "go", "Go"
    RUST = "rust", "Rust"
    KOTLIN = "kotlin", "Kotlin"
    CSHARP = "csharp", "C#"
    PHP = "php", "PHP"
    RUBY = "ruby", "Ruby"


class CheckerType(models.TextChoices):
    """Foydalanuvchi chiqishi etalon javob bilan QANDAY solishtiriladi.

    `EXACT` — eski (va sukut bo'yicha) xatti-harakat: qator oxiridagi
    bo'shliqlar va fayl oxiridagi bo'sh qatorlar tashlanadi, qolgani
    belgima-belgi mos kelishi kerak.
    """

    EXACT = "exact", "Aynan mos"
    TOKEN = "token", "So'zma-so'z (bo'shliqqa befarq)"
    FLOAT = "float", "Haqiqiy son (epsilon bilan)"
    CUSTOM = "custom", "Maxsus checker (istalgan to'g'ri javob)"


class SolutionKind(models.TextChoices):
    """Muallif yozadigan yechim turlari va ulardan kutiladigan natija."""

    MODEL = "model", "Etalon yechim"
    BRUTE = "brute", "Sodda yechim (stress uchun)"
    SLOW = "slow", "Sekin yechim (TLE kutiladi)"
    WRONG = "wrong", "Ataylab noto'g'ri (o'tmasligi kerak)"


class Tag(TimeStampedModel):
    name_uz = models.CharField(max_length=60)
    name_en = models.CharField(max_length=60)
    slug = models.SlugField(max_length=70, unique=True)
    color = models.CharField(max_length=7, default="#10b981", help_text="HEX rang")
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "tags"
        verbose_name = "Teg"
        verbose_name_plural = "Teglar"
        ordering = ["name_en"]

    def __str__(self) -> str:
        return self.name_en


class Problem(SoftDeleteModel, BaseModel):
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    title_uz = models.CharField(max_length=160)
    # 15-bo'lim: avval o'zbekcha, inglizcha tarjima bosqichma-bosqich qo'shiladi
    title_en = models.CharField(max_length=160, blank=True)

    difficulty = models.CharField(
        max_length=8, choices=Difficulty.choices, default=Difficulty.EASY, db_index=True
    )
    points = models.PositiveIntegerField(default=10, validators=[MinValueValidator(1)])
    # Masalaning QIYINLIK REYTINGI — foydalanuvchi reytingi bilan bir
    # shkalada (`apps.accounts.rating`). Foydalanuvchi o'zidan kuchliroq
    # masalani yechganda reytingi o'sadi, oson masala esa deyarli hech
    # narsa bermaydi. 0 qoldirilsa qiyinlik darajasidan taxminan olinadi,
    # ya'ni eski masalalar ham to'g'ri ishlaydi.
    rating = models.PositiveIntegerField(
        default=0,
        help_text="Qiyinlik reytingi (masalan 1200). 0 — qiyinlik darajasidan avtomatik.",
    )
    status = models.CharField(
        max_length=12, choices=ProblemStatus.choices, default=ProblemStatus.DRAFT, db_index=True
    )

    description_uz = models.TextField(help_text="Markdown")
    description_en = models.TextField(blank=True, help_text="Markdown")
    constraints_uz = models.TextField(blank=True)
    constraints_en = models.TextField(blank=True)
    hint_uz = models.TextField(blank=True)
    hint_en = models.TextField(blank=True)
    editorial_uz = models.TextField(blank=True)
    editorial_en = models.TextField(blank=True)

    tags = models.ManyToManyField(Tag, blank=True, related_name="problems")

    # Eskidan qolgan uchta ustun — mavjud masalalar va importlar shularga
    # tayanadi. Yangi tillar `starter_code` (JSON) ichida saqlanadi:
    # `{"go": "package main ...", "rust": "fn main() ..."}`.
    starter_code_python = models.TextField(blank=True)
    starter_code_javascript = models.TextField(blank=True)
    starter_code_cpp = models.TextField(blank=True)
    starter_code = models.JSONField(
        default=dict, blank=True,
        help_text="Til kaliti → boshlang'ich kod. Bo'sh qolgan til uchun umumiy shablon beriladi.",
    )
    solution_code_python = models.TextField(blank=True, help_text="Ichki foydalanish uchun etalon yechim")

    time_limit_ms = models.PositiveIntegerField(default=2000)
    memory_limit_kb = models.PositiveIntegerField(default=262144)

    # --- javobni tekshirish usuli (Studio)
    # Bir nechta to'g'ri javobi bor masalalar («istalgan javobni chiqaring»)
    # `CUSTOM` bilan tekshiriladi: checker dasturi kirish, ishtirokchi javobi
    # va etalon javobni oladi va o'zi qaror qiladi.
    checker_type = models.CharField(
        max_length=8, choices=CheckerType.choices, default=CheckerType.EXACT
    )
    checker_language = models.CharField(
        max_length=16, choices=Language.choices, default=Language.PYTHON
    )
    checker_code = models.TextField(blank=True, help_text="Faqat checker_type=custom uchun")
    float_epsilon = models.FloatField(
        default=1e-6, help_text="checker_type=float uchun ruxsat etilgan xatolik"
    )

    # Validator — test KIRISHINI tekshiruvchi dastur. Checker javobni,
    # validator esa masalaning o'z testlarini nazorat qiladi: generator
    # shartlarni buzgan kirish yasab qo'ysa (n chegaradan katta, graf bog'liq
    # emas), buni chop etishdan OLDIN topadi.
    validator_language = models.CharField(
        max_length=16, choices=Language.choices, default=Language.PYTHON
    )
    validator_code = models.TextField(blank=True, help_text="Bo'sh bo'lsa kirish tekshirilmaydi")

    is_premium = models.BooleanField(default=False)
    is_contest_only = models.BooleanField(
        default=False, help_text="Contest tugagunga qadar ommaviy ro'yxatda ko'rinmaydi (11-bo'lim)"
    )

    total_submissions = models.PositiveIntegerField(default=0)
    accepted_submissions = models.PositiveIntegerField(default=0)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="authored_problems",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    publish_at = models.DateTimeField(
        null=True, blank=True, db_index=True,
        help_text="Belgilangan vaqtda avtomatik chop etiladi",
    )
    cover_image_url = models.URLField(blank=True)

    class Meta:
        db_table = "problems"
        verbose_name = "Masala"
        verbose_name_plural = "Masalalar"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "difficulty"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self) -> str:
        return self.title_en or self.title_uz

    @property
    def acceptance_rate(self) -> float:
        if not self.total_submissions:
            return 0.0
        return round(self.accepted_submissions / self.total_submissions * 100, 1)

    def title(self, locale: str = "uz") -> str:
        return (self.title_en if locale == "en" else self.title_uz) or self.title_uz


class TestCase(TimeStampedModel):
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="test_cases")
    order = models.PositiveIntegerField(default=0)
    input = models.TextField(blank=True)
    expected_output = models.TextField(blank=True)
    is_sample = models.BooleanField(default=False, help_text="Ochiq (namuna) test — foydalanuvchiga ko'rinadi")
    explanation_uz = models.TextField(blank=True)
    explanation_en = models.TextField(blank=True)
    time_limit_ms = models.PositiveIntegerField(null=True, blank=True, help_text="Bo'sh bo'lsa masala limiti")
    memory_limit_kb = models.PositiveIntegerField(null=True, blank=True)

    # --- kelib chiqishi (Studio generatori uchun)
    source = models.CharField(
        max_length=10,
        choices=[("manual", "Qo'lda"), ("generated", "Generator")],
        default="manual",
        db_index=True,
    )
    generator = models.ForeignKey(
        "problems.TestGenerator", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="test_cases",
    )
    seed = models.PositiveIntegerField(null=True, blank=True, help_text="Generatorga berilgan urug'")

    class Meta:
        db_table = "test_cases"
        verbose_name = "Test-case"
        verbose_name_plural = "Test-case'lar"
        ordering = ["order", "created_at"]
        indexes = [models.Index(fields=["problem", "is_sample"])]

    def __str__(self) -> str:
        kind = "sample" if self.is_sample else "hidden"
        return f"#{self.order} ({kind})"

    @property
    def effective_time_limit(self) -> int:
        return self.time_limit_ms or self.problem.time_limit_ms

    @property
    def effective_memory_limit(self) -> int:
        return self.memory_limit_kb or self.problem.memory_limit_kb


class ReferenceSolution(BaseModel):
    """Muallif yozadigan yechim: etalon, sodda (brute), sekin yoki noto'g'ri.

    ETALON YECHIM — butun tekshiruv tizimining asosi. Test-case'ning kutilgan
    chiqishi qo'lda yozilmaydi: generator kirishni yasaydi, etalon yechim
    o'sha kirishda ishlatiladi va uning chiqishi kutilgan javob bo'lib
    saqlanadi. Ya'ni «masala tuzuvchi to'g'ri kod yozadi, ikkalasiga ham bir
    xil test yuboriladi va natijalar solishtiriladi» degani.

    Qolgan turlar sifat nazorati uchun: `BRUTE` — stress-testda etalonga
    qarshi qo'yiladi, `WRONG` va `SLOW` esa testlar to'plami yetarli
    kuchli ekanini isbotlaydi (ular O'TMASLIGI kerak).
    """

    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="solutions")
    name = models.CharField(max_length=80, default="Etalon")
    kind = models.CharField(max_length=8, choices=SolutionKind.choices, default=SolutionKind.MODEL)
    language = models.CharField(max_length=16, choices=Language.choices, default=Language.PYTHON)
    code = models.TextField()
    is_primary = models.BooleanField(
        default=False, help_text="Kutilgan chiqishni shu yechim hisoblaydi"
    )
    note = models.CharField(max_length=200, blank=True)

    # Oxirgi tekshiruv izlari — Studio ro'yxatida darhol ko'rinadi
    last_verdict = models.CharField(max_length=24, blank=True)
    last_checked_at = models.DateTimeField(null=True, blank=True)
    last_runtime_ms = models.PositiveIntegerField(null=True, blank=True)
    last_message = models.TextField(blank=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="reference_solutions",
    )

    class Meta:
        db_table = "problem_solutions"
        verbose_name = "Etalon yechim"
        verbose_name_plural = "Etalon yechimlar"
        ordering = ["-is_primary", "kind", "created_at"]
        indexes = [models.Index(fields=["problem", "kind"])]

    def __str__(self) -> str:
        return f"{self.problem_id} · {self.name} ({self.kind})"


class TestGenerator(BaseModel):
    """Test kirishlarini yasaydigan dastur.

    SHARTNOMA (ikkala tilda ham bir xil): generator `stdin` dan BITTA
    butun son — urug' (seed) — o'qiydi va `stdout` ga tayyor test kirishini
    chiqaradi. Bir xil urug' har doim bir xil kirishni bersin, aks holda
    testlarni qayta yasash natijani o'zgartirib yuboradi.
    """

    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="generators")
    name = models.CharField(max_length=80, default="Generator")
    language = models.CharField(max_length=16, choices=Language.choices, default=Language.PYTHON)
    code = models.TextField()
    count = models.PositiveIntegerField(default=10, help_text="Nechta test yasalsin")
    seed_start = models.PositiveIntegerField(default=1)
    make_sample = models.BooleanField(default=False, help_text="Yasalgan testlar namuna bo'lsinmi")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    last_run_at = models.DateTimeField(null=True, blank=True)
    last_message = models.TextField(blank=True)

    class Meta:
        db_table = "test_generators"
        verbose_name = "Generator"
        verbose_name_plural = "Generatorlar"
        ordering = ["order", "created_at"]

    def __str__(self) -> str:
        return f"{self.name} ×{self.count}"


class AuthoringRun(BaseModel):
    """Studio'da bajarilgan amal jurnali: generatsiya, tekshiruv, stress.

    Muallif «nima bo'ldi» degan savolga javobni sahifani yangilagandan keyin
    ham topa olishi kerak — natija shu yerda saqlanadi.
    """

    class Kind(models.TextChoices):
        GENERATE = "generate", "Test generatsiyasi"
        VALIDATE = "validate", "Yechimlarni tekshirish"
        STRESS = "stress", "Stress-test"
        CHECKER = "checker", "Checker sinovi"

    class Status(models.TextChoices):
        OK = "ok", "Muvaffaqiyatli"
        FAILED = "failed", "Xatolik"

    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="authoring_runs")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    status = models.CharField(max_length=8, choices=Status.choices)
    summary = models.CharField(max_length=200, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    duration_ms = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="authoring_runs",
    )

    class Meta:
        db_table = "authoring_runs"
        verbose_name = "Studio amali"
        verbose_name_plural = "Studio amallari"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["problem", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.kind}: {self.status}"


class DailyChallenge(TimeStampedModel):
    """16-bo'lim: kunlik masala."""

    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="daily_challenges")
    date = models.DateField(unique=True, db_index=True)
    bonus_points = models.PositiveIntegerField(default=5)
    note_uz = models.CharField(max_length=200, blank=True)
    note_en = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "daily_challenges"
        verbose_name = "Kunlik masala"
        verbose_name_plural = "Kunlik masalalar"
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.date} — {self.problem}"


class Bookmark(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookmarks")
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="bookmarks")
    note = models.TextField(blank=True, help_text="Shaxsiy izoh")

    class Meta:
        db_table = "bookmarks"
        verbose_name = "Xatcho'p"
        verbose_name_plural = "Xatcho'plar"
        unique_together = [("user", "problem")]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user} → {self.problem}"


class SolvedProblem(TimeStampedModel):
    """Foydalanuvchi qaysi masalani yechganini kuzatish (ball takrorlanmasligi uchun)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="solved_problems")
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="solvers")
    first_solved_at = models.DateTimeField(auto_now_add=True)
    points_awarded = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "solved_problems"
        verbose_name = "Yechilgan masala"
        verbose_name_plural = "Yechilgan masalalar"
        unique_together = [("user", "problem")]
        ordering = ["-first_solved_at"]

    def __str__(self) -> str:
        return f"{self.user} ✓ {self.problem}"
