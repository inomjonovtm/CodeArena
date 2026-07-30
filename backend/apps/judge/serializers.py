from __future__ import annotations

from rest_framework import serializers

from apps.problems.models import Language, Problem, ProblemStatus

from .models import Submission, SubmissionStatus, SubmissionTestResult


class SubmissionTestResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionTestResult
        fields = ("id", "order", "status", "runtime_ms", "memory_kb", "stdout", "stderr", "is_sample")


class AdminSubmissionListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    problem_title = serializers.CharField(source="problem.title_uz", read_only=True)
    problem_slug = serializers.CharField(source="problem.slug", read_only=True)
    problem_difficulty = serializers.CharField(source="problem.difficulty", read_only=True)
    contest_title = serializers.CharField(source="contest.title_uz", read_only=True, default=None)

    class Meta:
        model = Submission
        fields = (
            "id", "username", "user_id", "problem", "problem_title", "problem_slug",
            "problem_difficulty", "contest", "contest_title", "language", "status",
            "runtime_ms", "memory_kb", "score", "passed_tests", "total_tests",
            "failed_test_index", "code_length", "is_practice", "is_first_accepted",
            "ip_address", "created_at", "judged_at",
        )


class AdminSubmissionDetailSerializer(AdminSubmissionListSerializer):
    test_results = SubmissionTestResultSerializer(many=True, read_only=True)

    class Meta(AdminSubmissionListSerializer.Meta):
        fields = AdminSubmissionListSerializer.Meta.fields + (
            "code", "error_message", "compile_output", "judge_tokens", "test_results",
        )


class SubmissionCreateSerializer(serializers.ModelSerializer):
    """`POST /api/submissions` — foydalanuvchi kod yuboradi."""

    problem_slug = serializers.SlugField(write_only=True)

    class Meta:
        model = Submission
        fields = ("id", "problem_slug", "language", "code", "contest", "status", "created_at")
        read_only_fields = ("id", "status", "created_at")

    def validate_language(self, value):
        if value not in dict(Language.choices):
            raise serializers.ValidationError("Bu til qo'llab-quvvatlanmaydi.")
        return value

    def validate_code(self, value):
        if not value.strip():
            raise serializers.ValidationError("Kod bo'sh bo'lmasligi kerak.")
        if len(value) > 64_000:
            raise serializers.ValidationError("Kod juda uzun (64KB limit).")
        return value

    def validate(self, attrs):
        slug = attrs.pop("problem_slug")
        problem = Problem.objects.filter(slug=slug).first()
        if not problem:
            raise serializers.ValidationError({"problem_slug": "Masala topilmadi."})

        contest = attrs.get("contest")
        if contest is None:
            # Amaliyot rejimi: faqat chop etilgan va contestga tegishli bo'lmagan masala
            if problem.status != ProblemStatus.PUBLISHED:
                raise serializers.ValidationError({"problem_slug": "Masala hozircha mavjud emas."})
            if problem.is_contest_only:
                raise serializers.ValidationError(
                    {"problem_slug": "Bu masala faqat musobaqa doirasida yechiladi."}
                )
        else:
            self._validate_contest_entry(contest, problem)

        attrs["problem"] = problem
        return attrs

    def _validate_contest_entry(self, contest, problem) -> None:
        """Contest submissioni haqiqiy ekanini tekshiradi.

        Bularsiz foydalanuvchi istalgan `contest` id sini yuborib, o'zi
        qatnashmagan musobaqaga ball yozdirishi mumkin edi.
        """
        from apps.contests.models import ContestParticipant, ContestStatus

        request = self.context["request"]

        if not contest.contest_problems.filter(problem=problem).exists():
            raise serializers.ValidationError(
                {"contest": "Bu masala ushbu musobaqaga kirmaydi."}
            )

        participation = ContestParticipant.objects.filter(
            contest=contest, user=request.user
        ).first()
        if participation is None:
            raise serializers.ValidationError({"contest": "Siz bu musobaqada qatnashmayapsiz."})
        if participation.is_disqualified:
            raise serializers.ValidationError({"contest": "Siz musobaqadan chetlashtirilgansiz."})

        state = contest.computed_status
        if state == ContestStatus.SCHEDULED:
            raise serializers.ValidationError({"contest": "Musobaqa hali boshlanmagan."})
        if state in {ContestStatus.DRAFT, ContestStatus.CANCELLED}:
            raise serializers.ValidationError({"contest": "Musobaqa mavjud emas."})
        # Tugagan musobaqaga faqat virtual ishtirokchi yuborishi mumkin
        if state == ContestStatus.FINISHED and not participation.is_virtual:
            raise serializers.ValidationError({"contest": "Musobaqa tugagan."})

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["user"] = request.user
        validated_data["ip_address"] = getattr(request, "client_ip", None) or None
        validated_data["is_practice"] = validated_data.get("contest") is None
        submission = Submission.objects.create(**validated_data)

        from .tasks import judge_submission

        judge_submission.delay(str(submission.id))
        return submission


class SubmissionStatusSerializer(serializers.ModelSerializer):
    """`GET /api/submissions/:id` — polling uchun yengil javob."""

    sample_results = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = (
            "id", "status", "runtime_ms", "memory_kb", "passed_tests", "total_tests",
            "failed_test_index", "error_message", "compile_output", "score",
            "created_at", "judged_at", "sample_results",
        )

    def get_sample_results(self, obj):
        rows = obj.test_results.filter(is_sample=True).order_by("order")
        return SubmissionTestResultSerializer(rows, many=True).data


class PublicSubmissionListSerializer(serializers.ModelSerializer):
    """`GET /api/submissions/` — foydalanuvchining yechimlar tarixi."""

    problem_title_uz = serializers.CharField(source="problem.title_uz", read_only=True)
    problem_title_en = serializers.CharField(source="problem.title_en", read_only=True)
    problem_slug = serializers.CharField(source="problem.slug", read_only=True)
    problem_difficulty = serializers.CharField(source="problem.difficulty", read_only=True)
    contest_slug = serializers.CharField(source="contest.slug", read_only=True, default=None)
    contest_title = serializers.CharField(source="contest.title_uz", read_only=True, default=None)

    class Meta:
        model = Submission
        fields = (
            "id", "problem_slug", "problem_title_uz", "problem_title_en", "problem_difficulty",
            "contest_slug", "contest_title", "language", "status", "runtime_ms", "memory_kb",
            "score", "passed_tests", "total_tests", "failed_test_index", "code_length",
            "is_practice", "is_first_accepted", "created_at", "judged_at",
        )
        read_only_fields = fields


class PublicSubmissionDetailSerializer(PublicSubmissionListSerializer):
    """O'z yechimining to'liq ko'rinishi — kod va namuna test natijalari bilan."""

    sample_results = serializers.SerializerMethodField()

    class Meta(PublicSubmissionListSerializer.Meta):
        fields = PublicSubmissionListSerializer.Meta.fields + (
            "code", "error_message", "compile_output", "sample_results",
        )
        read_only_fields = fields

    def get_sample_results(self, obj):
        rows = obj.test_results.filter(is_sample=True).order_by("order")
        return SubmissionTestResultSerializer(rows, many=True).data


class RunSerializer(serializers.Serializer):
    """`POST /api/submissions/run/` — namuna testlarda sinab ko'rish (ball berilmaydi)."""

    problem_slug = serializers.SlugField()
    language = serializers.ChoiceField(choices=Language.choices)
    code = serializers.CharField(max_length=64_000)
    stdin = serializers.CharField(required=False, allow_blank=True, max_length=10_000)

    def validate_code(self, value):
        if not value.strip():
            raise serializers.ValidationError("Kod bo'sh bo'lmasligi kerak.")
        return value


class RejudgeSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    problem = serializers.UUIDField(required=False)
    contest = serializers.UUIDField(required=False)
    status = serializers.ChoiceField(choices=SubmissionStatus.choices, required=False)

    def validate(self, attrs):
        if not any(attrs.get(k) for k in ("ids", "problem", "contest", "status")):
            raise serializers.ValidationError("Kamida bitta filtr ko'rsating.")
        return attrs
