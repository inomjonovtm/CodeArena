"""Public submission endpointlari — 17-bo'lim."""
from __future__ import annotations

import logging

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.problems.models import Problem

from . import engine
from .models import Submission
from .serializers import (
    PublicSubmissionDetailSerializer,
    PublicSubmissionListSerializer,
    RunSerializer,
    SubmissionCreateSerializer,
    SubmissionStatusSerializer,
)

logger = logging.getLogger(__name__)

MAX_RUN_TESTS = 5


@api_view(["GET"])
@permission_classes([AllowAny])
def judge_status(request):
    """Kod muharriri uchun: judge ishlayaptimi va qaysi tillar mavjud.

    Frontend shu javob asosida ishlamaydigan tillarni tanlash ro'yxatida
    o'chirib qo'yadi — foydalanuvchi "til o'rnatilmagan" xatosiga urilmaydi.
    """
    languages = engine.supported_languages()
    return Response(
        {
            "available": bool(languages),
            "backend": engine.active_backend(),
            "languages": languages,
        }
    )


class SubmissionViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin,
                        mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "submission"  # 12-bo'lim: 10 submission/daqiqa
    filterset_fields = ["status", "language", "problem", "contest"]
    ordering_fields = ["created_at", "runtime_ms", "score"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = (
            Submission.objects.filter(user=self.request.user)
            .select_related("problem", "contest")
        )
        slug = self.request.query_params.get("problem_slug")
        if slug:
            queryset = queryset.filter(problem__slug=slug)
        if self.request.query_params.get("accepted_only") in {"1", "true"}:
            queryset = queryset.filter(status="ACCEPTED")
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return SubmissionCreateSerializer
        if self.action == "list":
            return PublicSubmissionListSerializer
        if self.action == "retrieve":
            # Polling paytida yengil javob kerak; `?full=1` bilan kod ham keladi
            if self.request.query_params.get("full") in {"1", "true"}:
                return PublicSubmissionDetailSerializer
            return SubmissionStatusSerializer
        return SubmissionStatusSerializer

    def get_throttles(self):
        if self.action not in {"create", "run"}:
            return []
        return super().get_throttles()

    @action(detail=False, methods=["post"], url_path="run")
    def run(self, request):
        """Kodni faqat namuna testlarda sinab ko'radi — natija saqlanmaydi.

        "Run" tugmasi shu yerga uradi: ball berilmaydi, statistika o'zgarmaydi,
        foydalanuvchi chiqishni to'liq ko'radi (namuna testlar ochiq bo'lgani uchun).
        """
        serializer = RunSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        problem = Problem.objects.filter(slug=data["problem_slug"]).first()
        if not problem:
            return Response({"detail": "Masala topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        custom_stdin = (data.get("stdin") or "").strip()
        if custom_stdin:
            # Maxsus kirishda kutilgan javob yo'q — `None` solishtirishni o'chiradi
            cases = [{"input": data["stdin"], "expected_output": None, "custom": True}]
        else:
            cases = [
                {"input": tc.input, "expected_output": tc.expected_output, "custom": False}
                for tc in problem.test_cases.filter(is_sample=True).order_by("order")[:MAX_RUN_TESTS]
            ]
            if not cases:
                return Response(
                    {"detail": "Bu masalada ochiq namuna test yo'q. To'g'ridan-to'g'ri yuboring."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            backend, parsed_results = engine.execute(
                language=data["language"],
                code=data["code"],
                cases=cases,
                time_limit_ms=problem.time_limit_ms,
                memory_limit_kb=problem.memory_limit_kb,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Run bajarilmadi: %s", exc)
            return Response(
                {"detail": "Judge xizmatiga ulanib bo'lmadi. Keyinroq urinib ko'ring.",
                 "code": "judge_unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if backend == engine.BACKEND_NONE:
            return Response(
                {"detail": engine.NO_BACKEND_MESSAGE, "code": "judge_unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        results = []
        passed = 0
        for index, (case, parsed) in enumerate(zip(cases, parsed_results), start=1):
            row_status = parsed.status
            if case["custom"] and row_status == "ACCEPTED":
                # Maxsus kirishda "to'g'ri/noto'g'ri" tushunchasi yo'q — kod bajarildi
                row_status = "EXECUTED"
            elif row_status == "ACCEPTED":
                passed += 1
            results.append(
                {
                    "order": index,
                    "status": row_status,
                    "input": case["input"],
                    "expected_output": case["expected_output"],
                    "stdout": parsed.stdout[:4000],
                    "stderr": parsed.stderr[:2000],
                    "compile_output": parsed.compile_output[:4000],
                    "runtime_ms": parsed.runtime_ms,
                    "memory_kb": parsed.memory_kb,
                    "is_custom": case["custom"],
                }
            )

        return Response(
            {
                "results": results,
                "passed": passed,
                "total": len(results),
                "all_passed": passed == len(results) and not custom_stdin,
                "backend": backend,
            }
        )
