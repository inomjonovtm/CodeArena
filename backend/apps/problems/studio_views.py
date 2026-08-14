"""Studio (muallif paneli) API — `/api/studio/...`.

Masala va musobaqa CRUD'i uchun mavjud `/api/admin/...` endpointlari qayta
ishlatiladi (muallif roli ularga huquq kodlari orqali kiradi). Shu faylda
esa FAQAT muallif asboblari bor: etalon yechim, generator, testlarni yasash,
tekshiruv va stress-test.
"""
from __future__ import annotations

import logging

from django.db.models import Count, Q
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from apps.core.mixins import AuditLogMixin, write_audit
from apps.core.permissions import HasResourcePerm, IsStudioStaff, require
from apps.judge import checker as checker_mod
from apps.judge import engine

from . import authoring
from .models import (
    AuthoringRun,
    Language,
    Problem,
    ProblemStatus,
    ReferenceSolution,
    SolutionKind,
    TestGenerator,
)
from .studio_serializers import (
    AuthoringRunSerializer,
    CheckerTestSerializer,
    FillExpectedSerializer,
    GenerateTestsSerializer,
    ReferenceSolutionSerializer,
    StressSerializer,
    TestGeneratorSerializer,
    ValidateSerializer,
)

logger = logging.getLogger(__name__)


class SandboxThrottle(UserRateThrottle):
    """Qumloq har bir bosishda alohida jarayon ishga tushiradi — tezligi
    cheklangan bo'lishi kerak, aks holda bitta muallif serverni band qiladi."""

    scope = "studio_sandbox"


def visible_problems(user):
    """Foydalanuvchi ishlay oladigan masalalar.

    Muallif faqat o'zinikini ko'radi; admin va moderator hammasini.
    """
    queryset = Problem.objects.all()
    if getattr(user, "role", "") == "setter":
        return queryset.filter(author=user)
    return queryset


class ProblemScopedMixin:
    """`?problem=<id>` bo'yicha filtrlanadigan, egalik tekshiriladigan ro'yxat."""

    permission_classes = [IsStudioStaff, HasResourcePerm]
    perm_resource = "authoring"
    # `authoring` da alohida `delete` huquqi yo'q — o'chirish ham tahrir
    # doirasida (etalon yechimni o'chirish uni qayta yozish bilan bir xil).
    perm_actions = {"destroy": "edit"}
    filterset_fields = ["problem"]

    def get_queryset(self):
        return super().get_queryset().filter(
            problem__in=visible_problems(self.request.user)
        )

    def _guard_problem(self, serializer):
        """Yozuv begona masalaga ulanib qolmasin."""
        problem = serializer.validated_data.get("problem")
        if problem is not None and not visible_problems(self.request.user).filter(pk=problem.pk).exists():
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Bu masala sizniki emas.")

    def perform_create(self, serializer):
        self._guard_problem(serializer)
        super().perform_create(serializer)

    def perform_update(self, serializer):
        self._guard_problem(serializer)
        super().perform_update(serializer)


class StudioSolutionViewSet(ProblemScopedMixin, AuditLogMixin, viewsets.ModelViewSet):
    """`/api/studio/solutions/` — etalon, sodda, sekin va noto'g'ri yechimlar."""

    queryset = ReferenceSolution.objects.select_related("problem", "author")
    serializer_class = ReferenceSolutionSerializer
    filterset_fields = ["problem", "kind", "language"]
    ordering_fields = ["created_at", "kind", "name"]
    ordering = ["-is_primary", "kind", "created_at"]
    audit_label = "reference_solution"

    def perform_create(self, serializer):
        self._guard_problem(serializer)
        instance = serializer.save(author=self.request.user)
        self._enforce_single_primary(instance)
        write_audit(self.request, action_name="solution.create", obj=instance)

    def perform_update(self, serializer):
        self._guard_problem(serializer)
        instance = serializer.save()
        self._enforce_single_primary(instance)

    @staticmethod
    def _enforce_single_primary(instance: ReferenceSolution) -> None:
        """Bitta masalada faqat bitta asosiy etalon bo'ladi.

        Aks holda kutilgan chiqishni qaysi yechim hisoblagani noaniq bo'lib
        qolardi — bu esa jimgina noto'g'ri testlarga olib keladi.
        """
        if not instance.is_primary:
            return
        (
            ReferenceSolution.objects
            .filter(problem=instance.problem, kind=SolutionKind.MODEL)
            .exclude(pk=instance.pk)
            .update(is_primary=False)
        )


class StudioGeneratorViewSet(ProblemScopedMixin, AuditLogMixin, viewsets.ModelViewSet):
    """`/api/studio/generators/` — test kirishlarini yasaydigan dasturlar."""

    queryset = TestGenerator.objects.select_related("problem")
    serializer_class = TestGeneratorSerializer
    filterset_fields = ["problem", "language", "is_active"]
    ordering_fields = ["order", "created_at", "name"]
    ordering = ["order", "created_at"]
    audit_label = "test_generator"

    def get_queryset(self):
        return super().get_queryset().annotate(
            generated_count_annotated=Count("test_cases", distinct=True)
        )


class StudioRunViewSet(viewsets.ReadOnlyModelViewSet):
    """`/api/studio/runs/` — bajarilgan amallar jurnali."""

    queryset = AuthoringRun.objects.select_related("created_by")
    serializer_class = AuthoringRunSerializer
    permission_classes = [IsStudioStaff, HasResourcePerm]
    perm_resource = "authoring"
    filterset_fields = ["problem", "kind", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return super().get_queryset().filter(problem__in=visible_problems(self.request.user))


class StudioToolsViewSet(viewsets.GenericViewSet):
    """`/api/studio/problems/<id>/...` — muallif asboblari.

    Barcha amallar SINXRON: javob qaytganda ish tugagan bo'ladi. Ular kod
    ishga tushiradi, shuning uchun `authoring.run` huquqi talab qilinadi.
    """

    queryset = Problem.objects.all()
    permission_classes = [IsStudioStaff, HasResourcePerm]
    perm_resource = "authoring"
    perm_actions = {
        "generate_tests": "run", "fill_expected": "run", "validate": "run",
        "stress": "run", "checker_test": "run", "health": "view", "tools": "view",
    }
    serializer_class = AuthoringRunSerializer

    def get_queryset(self):
        return visible_problems(self.request.user)

    # ------------------------------------------------------------ yordamchi
    def _run(self, request, func, *args, **kwargs) -> Response:
        """Muallif amalini bajaradi va xatolarni tushunarli javobga aylantiradi."""
        try:
            run = func(*args, **kwargs)
        except authoring.AuthoringError as exc:
            return Response(
                {"detail": str(exc), "code": "authoring_failed"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.exception("Studio amali yiqildi: %s", exc)
            return Response(
                {"detail": "Amalni bajarib bo'lmadi. Log'ni tekshiring.",
                 "code": "authoring_crashed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(AuthoringRunSerializer(run).data)

    def _object(self, id_value: str) -> Problem:
        from django.shortcuts import get_object_or_404

        problem = get_object_or_404(self.get_queryset(), pk=id_value)
        self.check_object_permissions(self.request, problem)
        return problem

    def _related(self, model, problem, value, label: str):
        instance = model.objects.filter(pk=value, problem=problem).first()
        if instance is None:
            raise authoring.AuthoringError(f"{label} topilmadi.")
        return instance

    # ------------------------------------------------------------- amallar
    @action(detail=True, methods=["post"], url_path="generate-tests")
    def generate_tests(self, request, pk=None):
        problem = self._object(pk)
        serializer = GenerateTestsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            generator = self._related(TestGenerator, problem, data["generator"], "Generator")
        except authoring.AuthoringError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response = self._run(
            request, authoring.generate_tests, problem, generator,
            count=data.get("count") or generator.count,
            seed_start=data.get("seed_start") if data.get("seed_start") is not None else generator.seed_start,
            replace=data["replace"],
            user=request.user,
        )
        if response.status_code == 200:
            write_audit(request, action_name="studio.generate_tests", obj=problem,
                        changes={"generator": generator.name, "count": data.get("count")})
        return response

    @action(detail=True, methods=["post"], url_path="fill-expected")
    def fill_expected(self, request, pk=None):
        problem = self._object(pk)
        serializer = FillExpectedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response = self._run(
            request, authoring.fill_expected, problem,
            user=request.user, only_empty=serializer.validated_data["only_empty"],
        )
        if response.status_code == 200:
            write_audit(request, action_name="studio.fill_expected", obj=problem)
        return response

    @action(detail=True, methods=["post"])
    def validate(self, request, pk=None):
        problem = self._object(pk)
        serializer = ValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._run(
            request, authoring.validate_solutions, problem,
            user=request.user,
            solution_ids=serializer.validated_data.get("solutions"),
        )

    @action(detail=True, methods=["post"])
    def stress(self, request, pk=None):
        problem = self._object(pk)
        serializer = StressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            generator = self._related(TestGenerator, problem, data["generator"], "Generator")
            model = self._related(ReferenceSolution, problem, data["model"], "Etalon yechim")
            brute = self._related(ReferenceSolution, problem, data["brute"], "Sodda yechim")
        except authoring.AuthoringError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if model.pk == brute.pk:
            return Response(
                {"detail": "Stress-test uchun ikkita HAR XIL yechim kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return self._run(
            request, authoring.stress_test, problem,
            user=request.user, generator=generator, model=model, brute=brute,
            iterations=data.get("iterations") or 20,
            seed_start=data.get("seed_start") if data.get("seed_start") is not None else 1000,
            save_counterexample=data["save_counterexample"],
        )

    @action(detail=True, methods=["post"], url_path="checker-test")
    def checker_test(self, request, pk=None):
        problem = self._object(pk)
        serializer = CheckerTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return self._run(
            request, authoring.try_checker, problem,
            user=request.user,
            test_input=data["input"],
            user_output=data["user_output"],
            jury_output=data["jury_output"],
        )

    @action(detail=True, methods=["get"])
    def health(self, request, pk=None):
        """Masalaning chop etishga tayyorlik ro'yxati.

        Har bir band «bajarildi / bajarilmadi» emas, «nima qilish kerak»
        degan javobni ham beradi — muallif ro'yxatni yopib borsa, masala
        sifatli chiqadi.
        """
        problem = self._object(pk)
        cases = problem.test_cases.all()
        total = cases.count()
        samples = cases.filter(is_sample=True).count()
        empty_expected = cases.filter(Q(expected_output="") | Q(expected_output__isnull=True)).count()

        solutions = list(problem.solutions.all())
        by_kind = {kind: [s for s in solutions if s.kind == kind] for kind, _ in SolutionKind.choices}
        model_solutions = by_kind.get(SolutionKind.MODEL, [])
        verified = [s for s in model_solutions if s.last_verdict == "ACCEPTED"]

        checks = [
            {
                "key": "statement",
                "label": "Masala sharti yozilgan",
                "ok": bool(problem.description_uz.strip()),
                "hint": "«Shart» bo'limida masalani tasvirlang.",
            },
            {
                "key": "samples",
                "label": "Namuna test bor",
                "ok": samples > 0,
                "value": samples,
                "hint": "Kamida bitta test «namuna» belgisiga ega bo'lsin.",
            },
            {
                "key": "tests",
                "label": "Yashirin testlar yetarli (≥ 5)",
                "ok": total - samples >= 5,
                "value": total,
                "hint": "Generator bilan qo'shimcha test yasang.",
            },
            {
                "key": "expected",
                "label": "Barcha testlarda javob bor",
                "ok": empty_expected == 0,
                "value": empty_expected,
                "hint": "«Javoblarni qayta hisoblash» tugmasini bosing.",
            },
            {
                "key": "model",
                "label": "Etalon yechim mavjud",
                "ok": bool(model_solutions),
                "hint": "«Yechimlar» bo'limida to'g'ri kod qo'shing.",
            },
            {
                "key": "verified",
                "label": "Etalon barcha testlardan o'tdi",
                "ok": bool(verified),
                "hint": "«Tekshirish» tugmasini bosing.",
            },
            {
                "key": "wrong",
                "label": "Ataylab noto'g'ri yechim yiqildi",
                "ok": any(
                    s.last_verdict and s.last_verdict != "ACCEPTED"
                    for s in by_kind.get(SolutionKind.WRONG, [])
                ),
                "hint": "Testlar kuchini isbotlash uchun noto'g'ri yechim qo'shib tekshiring.",
                "optional": True,
            },
            {
                "key": "checker",
                "label": "Tekshirish usuli sozlangan",
                "ok": problem.checker_type != "custom" or bool(problem.checker_code.strip()),
                "hint": "Maxsus checker tanlangan — uning kodini yozing.",
            },
            {
                "key": "tags",
                "label": "Teg biriktirilgan",
                "ok": problem.tags.exists(),
                "hint": "Masalani mavzu bo'yicha toping qilish uchun teg qo'shing.",
                "optional": True,
            },
        ]

        required = [c for c in checks if not c.get("optional")]
        return Response({
            "problem": str(problem.pk),
            "slug": problem.slug,
            "status": problem.status,
            "ready": all(c["ok"] for c in required),
            "score": round(sum(1 for c in checks if c["ok"]) / len(checks) * 100),
            "checks": checks,
            "counts": {
                "tests": total,
                "samples": samples,
                "hidden": total - samples,
                "solutions": len(solutions),
                "generators": problem.generators.count(),
            },
        })


class SandboxSerializer(serializers.Serializer):
    language = serializers.ChoiceField(choices=Language.choices)
    code = serializers.CharField(max_length=200_000)
    stdin = serializers.CharField(allow_blank=True, trim_whitespace=False, required=False)


@api_view(["POST"])
@permission_classes([require("authoring.run")])
@throttle_classes([SandboxThrottle])
def studio_sandbox(request):
    """Kodni bir marta ishga tushiradi — «Testcase Generator» qumlog'i uchun.

    Masalaga bog'lanmagan: muallif generatorni masala yaratishdan OLDIN
    sinab ko'ra oladi. Hech narsa saqlanmaydi.

    Bu endpoint IXTIYORIY kodni bajaradi, shuning uchun u `authoring.run`
    huquqi bilan chegaralangan (ya'ni admin, moderator va muallif) va
    so'rovlar soni cheklangan. Ishonchsiz foydalanuvchilar bu yerga
    umuman yeta olmaydi.
    """
    serializer = SandboxSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        backend, results = engine.execute(
            language=data["language"],
            code=data["code"],
            cases=[{"input": data.get("stdin") or "", "expected_output": None}],
            time_limit_ms=authoring.TOOL_TIME_LIMIT_MS,
            memory_limit_kb=authoring.TOOL_MEMORY_LIMIT_KB,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Sandbox bajarilmadi: %s", exc)
        return Response(
            {"detail": "Kod bajarish xizmatiga ulanib bo'lmadi.", "code": "judge_unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if backend == engine.BACKEND_NONE:
        return Response(
            {"detail": engine.NO_BACKEND_MESSAGE, "code": "judge_unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({
        "backend": backend,
        "results": [
            {
                # Solishtiriladigan javob yo'q — «bajarildi» degani yetarli.
                "status": "EXECUTED" if row.status == "ACCEPTED" else row.status,
                "stdout": row.stdout[:100_000],
                "stderr": row.stderr[:4000],
                "compile_output": row.compile_output[:4000],
                "runtime_ms": row.runtime_ms,
                "memory_kb": row.memory_kb,
            }
            for row in results
        ],
    })


@api_view(["GET"])
@permission_classes([IsStudioStaff])
def studio_templates(request):
    """Checker va generator uchun ishlaydigan namuna kodlar.

    Muharrirdagi «Namuna» tugmasi shu javobdan foydalanadi: shartnomani
    yoddan bilish shart emas.
    """
    return Response({
        "checker": checker_mod.CHECKER_TEMPLATES,
        "generator": checker_mod.GENERATOR_TEMPLATES,
        "limits": {
            "max_generate": authoring.MAX_GENERATE,
            "max_stress": authoring.MAX_STRESS,
            "max_test_chars": authoring.MAX_TEST_CHARS,
        },
        "checker_protocol": (
            "Checker stdin'dan uch bo'limni shu tartibda oladi: kirish, "
            "ishtirokchi javobi, etalon javob. Har bir bo'lim avval qatorlar "
            "sonini, keyin qatorlarni beradi. Chiqishning birinchi so'zi "
            "OK bo'lsa javob qabul qilinadi, aks holda rad etiladi."
        ),
        "generator_protocol": (
            "Generator stdin'dan bitta butun son — urug'ni o'qiydi va stdout'ga "
            "test kirishini chiqaradi. Bir xil urug' bir xil kirishni bersin."
        ),
    })


@api_view(["GET"])
@permission_classes([IsStudioStaff])
def studio_overview(request):
    """Studio bosh sahifasi: nima ishlanmoqda va nima e'tibor talab qiladi."""
    problems = visible_problems(request.user)
    counts = problems.aggregate(
        total=Count("id"),
        draft=Count("id", filter=Q(status=ProblemStatus.DRAFT)),
        published=Count("id", filter=Q(status=ProblemStatus.PUBLISHED)),
    )

    # E'tibor talab qiladiganlar: testsiz, etalonsiz yoki javobi bo'sh masalalar.
    needs_work = (
        problems.annotate(
            tc=Count("test_cases", distinct=True),
            sol=Count("solutions", distinct=True),
        )
        .filter(Q(tc=0) | Q(sol=0))
        .order_by("-updated_at")[:8]
    )

    from apps.contests.models import Contest

    contests = Contest.objects.all()
    if getattr(request.user, "role", "") == "setter":
        contests = contests.filter(created_by=request.user)

    runs = (
        AuthoringRun.objects.filter(problem__in=problems)
        .select_related("problem", "created_by")
        .order_by("-created_at")[:8]
    )

    return Response({
        "problems": counts,
        "contests": {
            "total": contests.count(),
            "upcoming": contests.filter(status="upcoming").count(),
            "running": contests.filter(status="running").count(),
        },
        "needs_work": [
            {
                "id": str(p.pk), "slug": p.slug, "title": p.title_uz,
                "status": p.status, "difficulty": p.difficulty,
                "tests": p.tc, "solutions": p.sol,
                "reason": "Test yo'q" if p.tc == 0 else "Etalon yechim yo'q",
            }
            for p in needs_work
        ],
        "recent_runs": AuthoringRunSerializer(runs, many=True).data,
        "judge": engine.health(refresh=False),
    })
