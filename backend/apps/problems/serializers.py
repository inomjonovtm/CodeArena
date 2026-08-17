from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.core.utils import unique_slug

from .authoring import MAX_TEST_CHARS
from .models import (
    Bookmark,
    DailyChallenge,
    Difficulty,
    Problem,
    ProblemStatus,
    Tag,
    TestCase,
)

# Bitta masaladagi testlarning yuqori chegarasi — bitta saqlash so'rovi
# minglab qator yaratib yubormasin (GET tomonda 2000 himoya chegarasi bor).
MAX_TEST_CASES = 1000


def publish_blockers(*, description_uz: str, test_cases, checker_type: str, checker_code: str) -> list[str]:
    """Masalani chop etishga to'sqinlik qiladigan sabablar ro'yxati.

    Bitta joyda turadi, chunki chop etish uch yo'ldan bo'lishi mumkin:
    `publish` amali, bulk amal va oddiy PATCH (`status=published`). Ilgari
    faqat birinchisi tekshirardi va qolgan ikkitasi testsiz masalani ham
    saytga chiqarib yuborardi.

    `test_cases` — dict yoki TestCase obyektlari ro'yxati.
    """
    problems: list[str] = []
    if not (description_uz or "").strip():
        problems.append("Tavsif (uz) bo'sh — chop etib bo'lmaydi.")

    rows = list(test_cases)
    if not rows:
        problems.append("Kamida bitta test-case qo'shing.")
    else:
        def _get(row, key, default=""):
            return row.get(key, default) if isinstance(row, dict) else getattr(row, key, default)

        if not any(_get(row, "is_sample", False) for row in rows):
            problems.append("Kamida bitta namunaviy (sample) test kerak — u masala sahifasida ko'rinadi.")
        empty = sum(1 for row in rows if not str(_get(row, "expected_output", "") or "").strip())
        if empty:
            problems.append(
                f"{empty} ta testda kutilgan chiqish bo'sh — bunday test bo'sh javobni ham qabul qiladi."
            )

    if (checker_type or "exact") == "custom" and not (checker_code or "").strip():
        problems.append("Checker turi «custom», lekin checker kodi yozilmagan.")
    return problems


class TagSerializer(serializers.ModelSerializer):
    problem_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Tag
        fields = ("id", "name_uz", "name_en", "slug", "color", "description", "problem_count", "created_at")
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        if not attrs.get("slug"):
            source = attrs.get("name_en") or attrs.get("name_uz") or ""
            attrs["slug"] = unique_slug(Tag, source, instance=self.instance)
        return attrs


class TestCaseSerializer(serializers.ModelSerializer):
    # Bitta test uchun hajm chegarasi — generator yo'lidagi bilan bir xil.
    # Busiz qo'lda yoki API orqali cheksiz katta matn saqlash mumkin edi.
    input = serializers.CharField(required=False, allow_blank=True, max_length=MAX_TEST_CHARS)
    expected_output = serializers.CharField(required=False, allow_blank=True, max_length=MAX_TEST_CHARS)

    class Meta:
        model = TestCase
        fields = (
            "id", "problem", "order", "input", "expected_output", "is_sample",
            "explanation_uz", "explanation_en", "time_limit_ms", "memory_limit_kb",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class TestCaseNestedSerializer(serializers.ModelSerializer):
    """Masala formasi ichida test-case'larni bir vaqtda saqlash uchun."""

    id = serializers.IntegerField(required=False)
    input = serializers.CharField(required=False, allow_blank=True, max_length=MAX_TEST_CHARS)
    expected_output = serializers.CharField(required=False, allow_blank=True, max_length=MAX_TEST_CHARS)

    class Meta:
        model = TestCase
        fields = (
            "id", "order", "input", "expected_output", "is_sample",
            "explanation_uz", "explanation_en", "time_limit_ms", "memory_limit_kb",
            # Generator izlari faqat O'QISH uchun: qaysi test qo'lda yozilgani
            # va qaysisi qaysi urug'dan yasalgani Studio'da ko'rinadi.
            "source", "generator", "seed",
        )
        read_only_fields = ("source", "generator", "seed")


class ProblemListSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    acceptance_rate = serializers.FloatField(read_only=True)
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)
    test_case_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Problem
        fields = (
            "id", "slug", "title_uz", "title_en", "difficulty", "points", "status",
            "tags", "is_premium", "is_contest_only", "total_submissions",
            "accepted_submissions", "acceptance_rate", "test_case_count",
            # Limitlar ro'yxatda ham kerak: Studio jadvalida ular ustun bo'lib
            # turadi va har bir masalani ochib ko'rish shart bo'lmaydi.
            "time_limit_ms", "memory_limit_kb", "checker_type",
            "author_username", "published_at", "publish_at", "created_at", "updated_at",
        )


class ProblemDetailSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Tag.objects.all(), source="tags", write_only=True, required=False
    )
    test_cases = TestCaseNestedSerializer(many=True, required=False)
    acceptance_rate = serializers.FloatField(read_only=True)
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)

    class Meta:
        model = Problem
        fields = (
            "id", "slug", "title_uz", "title_en", "difficulty", "points", "rating", "status",
            "description_uz", "description_en", "constraints_uz", "constraints_en",
            "hint_uz", "hint_en", "editorial_uz", "editorial_en",
            "tags", "tag_ids",
            "starter_code_python", "starter_code_javascript", "starter_code_cpp", "starter_code",
            "solution_code_python", "time_limit_ms", "memory_limit_kb",
            "is_premium", "is_contest_only", "total_submissions", "accepted_submissions",
            "acceptance_rate", "author_username", "published_at", "publish_at",
            "cover_image_url", "created_at", "updated_at", "test_cases",
            # --- javobni tekshirish (Studio «Checker» tabi)
            "checker_type", "checker_language", "checker_code", "float_epsilon",
            "validator_language", "validator_code",
        )
        read_only_fields = (
            "id", "total_submissions", "accepted_submissions", "acceptance_rate",
            "author_username", "created_at", "updated_at",
        )
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate_starter_code(self, value):
        """`{"til": "kod"}` ko'rinishidagi lug'at — boshqa shakl jimgina
        saqlanib, keyin frontendda indekslashda sinardi."""
        if value in (None, ""):
            return {}
        if not isinstance(value, dict) or not all(
            isinstance(k, str) and isinstance(v, str) for k, v in value.items()
        ):
            raise serializers.ValidationError(
                "starter_code {\"til\": \"kod\"} ko'rinishidagi lug'at bo'lishi kerak."
            )
        return value

    def validate(self, attrs):
        if not attrs.get("slug") and not (self.instance and self.instance.slug):
            source = attrs.get("title_en") or attrs.get("title_uz") or ""
            attrs["slug"] = unique_slug(Problem, source, instance=self.instance, max_length=120)
        elif attrs.get("slug"):
            attrs["slug"] = unique_slug(Problem, attrs["slug"], instance=self.instance, max_length=120)

        if attrs.get("test_cases") is not None and len(attrs["test_cases"]) > MAX_TEST_CASES:
            raise serializers.ValidationError(
                {"test_cases": f"Bitta masalada ko'pi bilan {MAX_TEST_CASES} ta test bo'lishi mumkin."}
            )

        status_value = attrs.get("status", getattr(self.instance, "status", ProblemStatus.DRAFT))
        was_published = bool(self.instance and self.instance.status == ProblemStatus.PUBLISHED)
        if status_value == ProblemStatus.PUBLISHED:
            # Chop etish shartlari `publish` amalida ham, oddiy PATCH orqali
            # `status` o'zgartirilganda ham BIR XIL tekshiriladi — ilgari
            # PATCH yo'li ularni chetlab o'tib, testsiz masala chiqarardi.
            if not was_published:
                request = self.context.get("request")
                user = getattr(request, "user", None)
                if user is not None and hasattr(user, "has_perm_code") and not user.has_perm_code("problems.publish"):
                    raise serializers.ValidationError(
                        {"status": "Chop etish uchun sizda huquq yo'q — moderatorga murojaat qiling."}
                    )
            if attrs.get("test_cases") is not None:
                tests = attrs["test_cases"]
            elif self.instance is not None:
                tests = list(self.instance.test_cases.all())
            else:
                tests = []
            blockers = publish_blockers(
                description_uz=attrs.get(
                    "description_uz", getattr(self.instance, "description_uz", "")
                ),
                test_cases=tests,
                checker_type=attrs.get(
                    "checker_type", getattr(self.instance, "checker_type", "exact")
                ),
                checker_code=attrs.get(
                    "checker_code", getattr(self.instance, "checker_code", "")
                ),
            )
            if blockers:
                raise serializers.ValidationError({"status": blockers})
        return attrs

    def validate_points(self, value):
        return value or 10

    def _sync_test_cases(self, problem: Problem, rows: list[dict]):
        # Atomik: o'rtada xato chiqsa, yarmi o'chirilgan/yarmi yangilangan
        # holat qolmasin. `update()` `auto_now` ni ishlatmaydi — vaqtni qo'lda
        # yozamiz, aks holda «oxirgi o'zgarish» ustuni yolg'on gapirardi.
        now = timezone.now()
        with transaction.atomic():
            keep_ids = []
            for index, row in enumerate(rows):
                row = dict(row)
                row.setdefault("order", index)
                tc_id = row.pop("id", None)
                if tc_id:
                    TestCase.objects.filter(pk=tc_id, problem=problem).update(**row, updated_at=now)
                    keep_ids.append(tc_id)
                else:
                    created = TestCase.objects.create(problem=problem, **row)
                    keep_ids.append(created.pk)
            problem.test_cases.exclude(pk__in=keep_ids).delete()

    def create(self, validated_data):
        test_cases = validated_data.pop("test_cases", None)
        tags = validated_data.pop("tags", [])
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data.setdefault("author", request.user)
        if validated_data.get("status") == ProblemStatus.PUBLISHED:
            validated_data.setdefault("published_at", timezone.now())

        problem = Problem.objects.create(**validated_data)
        problem.tags.set(tags)
        if test_cases:
            self._sync_test_cases(problem, test_cases)
        return problem

    def update(self, instance, validated_data):
        test_cases = validated_data.pop("test_cases", None)
        tags = validated_data.pop("tags", None)

        if validated_data.get("status") == ProblemStatus.PUBLISHED and not instance.published_at:
            validated_data["published_at"] = timezone.now()

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if tags is not None:
            instance.tags.set(tags)
        if test_cases is not None:
            self._sync_test_cases(instance, test_cases)
        return instance


class UserStateMixin(serializers.Serializer):
    """`annotate_user_state()` qo'shgan maydonlar — anonim uchun doim `false`."""

    is_solved = serializers.BooleanField(read_only=True, default=False)
    is_attempted = serializers.BooleanField(read_only=True, default=False)
    is_bookmarked = serializers.BooleanField(read_only=True, default=False)


class PublicProblemListSerializer(UserStateMixin, serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    acceptance_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = Problem
        fields = (
            "id", "slug", "title_uz", "title_en", "difficulty", "points",
            "tags", "is_premium", "acceptance_rate", "total_submissions",
            "is_solved", "is_attempted", "is_bookmarked",
        )


class PublicProblemDetailSerializer(UserStateMixin, serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    sample_test_cases = serializers.SerializerMethodField()
    acceptance_rate = serializers.FloatField(read_only=True)
    editorial_uz = serializers.SerializerMethodField()
    editorial_en = serializers.SerializerMethodField()
    # Tahlil mavjudmi va u yopiqmi — frontend "yechgandan keyin ochiladi"
    # deb ko'rsatishi uchun. Ilgari tab shunchaki yo'qolib qolardi va
    # foydalanuvchi tahlil borligini umuman bilmasdi.
    has_editorial = serializers.SerializerMethodField()
    editorial_locked = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = (
            "id", "slug", "title_uz", "title_en", "difficulty", "points",
            "description_uz", "description_en", "constraints_uz", "constraints_en",
            "hint_uz", "hint_en", "editorial_uz", "editorial_en",
            "has_editorial", "editorial_locked", "tags",
            "starter_code_python", "starter_code_javascript", "starter_code_cpp", "starter_code",
            "time_limit_ms", "memory_limit_kb", "acceptance_rate",
            "total_submissions", "accepted_submissions", "sample_test_cases",
            "is_solved", "is_attempted", "is_bookmarked",
            # Javob QANDAY tekshirilishi — foydalanuvchiga ham kerak.
            # «Istalgan to'g'ri javob qabul qilinadi» degan bilim yechim
            # yozish usulini butunlay o'zgartiradi: odam etalon javobni
            # taxmin qilishga urinmaydi.
            "checker_type", "float_epsilon",
        )

    def get_sample_test_cases(self, obj):
        rows = obj.test_cases.filter(is_sample=True).order_by("order")
        return [
            {
                "input": tc.input,
                "expected_output": tc.expected_output,
                "explanation_uz": tc.explanation_uz,
                "explanation_en": tc.explanation_en,
            }
            for tc in rows
        ]

    # Tahlil (editorial) faqat masalani yechganlarga ochiladi — spoylerni oldini oladi
    def _may_see_editorial(self, obj) -> bool:
        """Tahlil FAQAT masalani yechganlarga ochiladi.

        Admin/moderator uchun ham istisno yo'q: sayt qismi hamma uchun bir xil
        ko'rinishi kerak, aks holda administrator o'z saytini sinab ko'rganda
        qulf ishlamayotgandek tuyuladi. Xodimlar tahlil matnini admin
        panelidagi masala tahrirlash sahifasida ko'radi.
        """
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            return False
        if getattr(obj, "is_solved", False):
            return True
        from .models import SolvedProblem

        return SolvedProblem.objects.filter(user=user, problem=obj).exists()

    def get_editorial_uz(self, obj) -> str:
        return obj.editorial_uz if self._may_see_editorial(obj) else ""

    def get_editorial_en(self, obj) -> str:
        return obj.editorial_en if self._may_see_editorial(obj) else ""

    def get_has_editorial(self, obj) -> bool:
        return bool((obj.editorial_uz or "").strip() or (obj.editorial_en or "").strip())

    def get_editorial_locked(self, obj) -> bool:
        return self.get_has_editorial(obj) and not self._may_see_editorial(obj)


class DailyChallengeSerializer(serializers.ModelSerializer):
    problem_title = serializers.CharField(source="problem.title_uz", read_only=True)
    problem_slug = serializers.CharField(source="problem.slug", read_only=True)
    problem_difficulty = serializers.CharField(source="problem.difficulty", read_only=True)

    class Meta:
        model = DailyChallenge
        fields = (
            "id", "problem", "problem_title", "problem_slug", "problem_difficulty",
            "date", "bonus_points", "note_uz", "note_en", "created_at",
        )

    def validate_problem(self, value):
        if value.status != ProblemStatus.PUBLISHED:
            raise serializers.ValidationError("Faqat chop etilgan masalani kunlik masala qilish mumkin.")
        return value


class BookmarkSerializer(serializers.ModelSerializer):
    problem_title = serializers.CharField(source="problem.title_uz", read_only=True)
    problem_slug = serializers.CharField(source="problem.slug", read_only=True)

    class Meta:
        model = Bookmark
        fields = ("id", "problem", "problem_title", "problem_slug", "note", "created_at")
        read_only_fields = ("id", "created_at")


class DifficultyChoiceSerializer(serializers.Serializer):
    value = serializers.ChoiceField(choices=Difficulty.choices)
