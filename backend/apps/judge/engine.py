"""Kod bajarish qatlami — barcha ijro shu moduldan o'tadi.

`tasks.py`, `views.py`, checker va muallif asboblari faqat shu bilan
ishlaydi. Tanlov tartibi:

1. **Runner xizmati** — alohida, izolyatsiyalangan konteyner
   (`infra/runner`). Produksiyada yagona to'g'ri yo'l.
2. **Lokal runner** — `LOCAL_JUDGE_ENABLED` yoqilganda, faqat ishlab
   chiqish uchun: kod Django jarayonining yonida bajariladi va bu
   sandbox EMAS.
3. Aks holda — `SYSTEM_ERROR` va tushunarli xabar.

Runner sog'ligi qisqa muddatga keshlanadi: aks holda har bir yechim uchun
qo'shimcha HTTP so'rov ketardi.
"""
from __future__ import annotations

import logging

from django.core.cache import cache

from apps.core import site_settings

from . import languages, remote, runner
from .results import ExecutionResult

logger = logging.getLogger(__name__)

_HEALTH_CACHE_KEY = "runner:health"

BACKEND_RUNNER = "runner"
BACKEND_LOCAL = "local"
BACKEND_NONE = "none"

NO_BACKEND_MESSAGE = (
    "Kod bajarish xizmati ishlamayapti. Administrator runner konteynerini "
    "ishga tushirishi kerak."
)


def _health_ttl() -> int:
    return max(5, site_settings.get_int("runner_health_cache_sec", 30))


def local_allowed() -> bool:
    """Lokal runner ishlatilishi mumkinmi (sozlama + muhit)."""
    return site_settings.get_bool("runner_local_fallback", True) and runner.is_enabled()


def runner_health(*, refresh: bool = False) -> dict:
    """Runner holati: `{"ok": bool, "languages": {...}}` (keshlanadi)."""
    if not site_settings.get_bool("runner_enabled", True):
        return {"ok": False, "languages": {}, "error": "Runner sozlamada o'chirilgan."}

    if not refresh:
        cached = cache.get(_HEALTH_CACHE_KEY)
        if cached is not None:
            return cached

    status = remote.health()
    cache.set(_HEALTH_CACHE_KEY, status, _health_ttl())
    return status


def active_backend(*, refresh: bool = False) -> str:
    if runner_health(refresh=refresh)["ok"]:
        return BACKEND_RUNNER
    if local_allowed():
        return BACKEND_LOCAL
    return BACKEND_NONE


def supported_languages(*, refresh: bool = False) -> dict[str, bool]:
    """Har bir til hozir ishlaydimi — frontend shunga qarab tanlovni bloklaydi."""
    backend = active_backend(refresh=refresh)

    if backend == BACKEND_RUNNER:
        reported = runner_health()["languages"]
    elif backend == BACKEND_LOCAL:
        reported = runner.available_languages()
    else:
        reported = {}

    # Ro'yxat HAR DOIM to'liq qaytadi: mavjud bo'lmagan til `False` bilan
    # ko'rinadi, ya'ni interfeys uni o'chirib qo'yadi-yu, yashirmaydi.
    return {item.key: bool(reported.get(item.key)) for item in languages.LANGUAGES}


def execute(
    *,
    language: str,
    code: str,
    cases: list[dict],
    time_limit_ms: int,
    memory_limit_kb: int,
) -> tuple[str, list[ExecutionResult]]:
    """Kodni testlar ustida bajaradi.

    Qaytadi: `(backend nomi, natijalar)`. Natijalar soni HAR DOIM testlar
    soniga teng — chaqiruvchi tomon ularni juftlab ishlatadi.
    """
    backend = active_backend()

    if backend == BACKEND_RUNNER:
        try:
            return BACKEND_RUNNER, remote.execute(
                language=language, code=code, cases=cases,
                time_limit_ms=time_limit_ms, memory_limit_kb=memory_limit_kb,
            )
        except remote.RunnerError as exc:
            logger.warning("Runner xatosi: %s", exc)
            # Keshni darhol "yiqilgan" holatga o'tkazamiz: keyingi so'rovlar
            # bekorga kutib turmasin.
            cache.set(_HEALTH_CACHE_KEY, {"ok": False, "languages": {}, "error": str(exc)},
                      _health_ttl())
            backend = BACKEND_LOCAL if local_allowed() else BACKEND_NONE

    if backend == BACKEND_LOCAL:
        return BACKEND_LOCAL, runner.execute_batch(
            language=language, code=code, cases=cases,
            time_limit_ms=time_limit_ms, memory_limit_kb=memory_limit_kb,
        )

    return BACKEND_NONE, [
        ExecutionResult(status="SYSTEM_ERROR", message=NO_BACKEND_MESSAGE) for _ in cases
    ]


def health(*, refresh: bool = True) -> dict:
    """Admin paneli va `/api/judge/status/` uchun umumiy holat."""
    status = runner_health(refresh=refresh)
    backend = active_backend()
    supported = supported_languages()

    return {
        "backend": backend,
        "available": backend != BACKEND_NONE,
        "runner_ok": status["ok"],
        "runner_error": status.get("error", ""),
        "local_fallback": local_allowed(),
        "languages": supported,
        "language_count": sum(1 for ok in supported.values() if ok),
    }
