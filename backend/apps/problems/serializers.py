from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from apps.core.utils import unique_slug

from .models import (
    Bookmark,
    DailyChallenge,
    Difficulty,
    Problem,
    ProblemStatus,
    Tag,
    TestCase,
)


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
    class Meta:
        model = TestCase
        fields = (
            "id", "problem", "order", "input", "expected_output", "is_sample",
            "explanation_uz", "explanation_en", "time_limit_ms", "memory_limit_kb",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {"problem": {"required": False}}


class TestCaseNestedSerializer(serializers.ModelSerializer):
    """Masala formasi ichida test-case'larni bir vaqtda saqlash uchun."""

    id = serializers.IntegerField(required=False)

    class Meta:
        model = TestCase
        fields = (
            "id", "order", "input", "expected_output", "is_sample",
            "explanation_uz", "explanation_en", "time_limit_ms", "memory_limit_kb",
        )


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
            "id", "slug", "title_uz", "title_en", "difficulty", "points", "status",
            "description_uz", "description_en", "constraints_uz", "constraints_en",
            "hint_uz", "hint_en", "editorial_uz", "editorial_en",
            "tags", "tag_ids",
            "starter_code_python", "starter_code_javascript", "starter_code_cpp",
            "solution_code_python", "time_limit_ms", "memory_limit_kb",
            "is_premium", "is_contest_only", "total_submissions", "accepted_submissions",
            "acceptance_rate", "author_username", "published_at", "publish_at",
            "cover_image_url", "created_at", "updated_at", "test_cases",
        )
        read_only_fields = (
            "id", "total_submissions", "accepted_submissions", "acceptance_rate",
            "author_username", "created_at", "updated_at",
        )
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        if not attrs.get("slug") and not (self.instance and self.instance.slug):
            source = attrs.get("title_en") or attrs.get("title_uz") or ""
            attrs["slug"] = unique_slug(Problem, source, instance=self.instance, max_length=120)
        elif attrs.get("slug"):
            attrs["slug"] = unique_slug(Problem, attrs["slug"], instance=self.instance, max_length=120)

        status_value = attrs.get("status", getattr(self.instance, "status", ProblemStatus.DRAFT))
        if status_value == ProblemStatus.PUBLISHED:
            description = attrs.get("description_uz", getattr(self.instance, "description_uz", ""))
            if not description.strip():
                raise serializers.ValidationError(
                    {"description_uz": "Chop etish uchun o'zbekcha tavsif to'ldirilishi shart."}
                )
        return attrs

    def validate_points(self, value):
        return value or 10

    def _sync_test_cases(self, problem: Problem, rows: list[dict]):
        keep_ids = []
        for index, row in enumerate(rows):
            row = dict(row)
            row.setdefault("order", index)
            tc_id = row.pop("id", None)
            if tc_id:
                TestCase.objects.filter(pk=tc_id, problem=problem).update(**row)
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
            "starter_code_python", "starter_code_javascript", "starter_code_cpp",
            "time_limit_ms", "memory_limit_kb", "acceptance_rate",
            "total_submissions", "accepted_submissions", "sample_test_cases",
            "is_solved", "is_attempted", "is_bookmarked",
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
