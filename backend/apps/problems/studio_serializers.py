"""Studio panel serializerlari — etalon yechim, generator, amal jurnali."""
from __future__ import annotations

from rest_framework import serializers

from .models import AuthoringRun, ReferenceSolution, TestGenerator


class ReferenceSolutionSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)
    code_length = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceSolution
        fields = (
            "id", "problem", "name", "kind", "language", "code", "is_primary", "note",
            "last_verdict", "last_checked_at", "last_runtime_ms", "last_message",
            "author_username", "code_length", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "last_verdict", "last_checked_at", "last_runtime_ms", "last_message",
            "author_username", "code_length", "created_at", "updated_at",
        )

    def get_code_length(self, obj: ReferenceSolution) -> int:
        return len(obj.code or "")

    def validate_code(self, value: str) -> str:
        if not (value or "").strip():
            raise serializers.ValidationError("Kod bo'sh bo'lmasligi kerak.")
        return value


class TestGeneratorSerializer(serializers.ModelSerializer):
    generated_count = serializers.SerializerMethodField()

    class Meta:
        model = TestGenerator
        fields = (
            "id", "problem", "name", "language", "code", "count", "seed_start",
            "make_sample", "is_active", "order", "last_run_at", "last_message",
            "generated_count", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "last_run_at", "last_message", "generated_count", "created_at", "updated_at",
        )

    def get_generated_count(self, obj: TestGenerator) -> int:
        # `annotate` bilan kelgan qiymat bo'lsa — qo'shimcha so'rov qilinmaydi.
        cached = getattr(obj, "generated_count_annotated", None)
        return cached if cached is not None else obj.test_cases.count()

    def validate_count(self, value: int) -> int:
        from .authoring import MAX_GENERATE

        if value > MAX_GENERATE:
            raise serializers.ValidationError(
                f"Bir chaqiruvda ko'pi bilan {MAX_GENERATE} ta test yasaladi."
            )
        return value

    def validate_code(self, value: str) -> str:
        if not (value or "").strip():
            raise serializers.ValidationError("Generator kodi bo'sh bo'lmasligi kerak.")
        return value


class AuthoringRunSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, default=None
    )

    class Meta:
        model = AuthoringRun
        fields = (
            "id", "problem", "kind", "status", "summary", "detail",
            "duration_ms", "created_by_username", "created_at",
        )
        read_only_fields = fields


# --------------------------------------------------------------- amal so'rovlari
class GenerateTestsSerializer(serializers.Serializer):
    generator = serializers.UUIDField()
    count = serializers.IntegerField(required=False, min_value=1)
    seed_start = serializers.IntegerField(required=False, min_value=0)
    replace = serializers.BooleanField(default=True)


class FillExpectedSerializer(serializers.Serializer):
    only_empty = serializers.BooleanField(default=False)


class ValidateSerializer(serializers.Serializer):
    solutions = serializers.ListField(child=serializers.UUIDField(), required=False)


class StressSerializer(serializers.Serializer):
    generator = serializers.UUIDField()
    model = serializers.UUIDField()
    brute = serializers.UUIDField()
    iterations = serializers.IntegerField(required=False, min_value=1)
    seed_start = serializers.IntegerField(required=False, min_value=0)
    save_counterexample = serializers.BooleanField(default=False)


class CheckerTestSerializer(serializers.Serializer):
    input = serializers.CharField(allow_blank=True, trim_whitespace=False)
    user_output = serializers.CharField(allow_blank=True, trim_whitespace=False)
    jury_output = serializers.CharField(allow_blank=True, trim_whitespace=False)
