"""Judge backend'ini tanlaydigan qatlam.

`tasks.py` va `views.py` faqat shu modul bilan ishlaydi. Tanlov tartibi:

1. **Judge0** — agar sozlangan va javob berayotgan bo'lsa (produksiya yo'li);
2. **Lokal runner** — `LOCAL_JUDGE_ENABLED` yoqilgan bo'lsa (dev / demo);
3. aks holda — `SYSTEM_ERROR` va tushunarli xabar.

Judge0 mavjudligi qisqa muddatga keshlanadi, aks holda har bir submission
uchun qo'shimcha HTTP so'rov ketardi.
"""
from __future__ import annotations

import logging

from django.core.cache import cache

from apps.core import site_settings

from . import runner
from .judge0 import Judge0Client
from .results import ExecutionResult

logger = logging.getLogger(__name__)

_HEALTH_CACHE_KEY = "judge0:available"

BACKEND_JUDGE0 = "judge0"
BACKEND_LOCAL = "local"
BACKEND_NONE = "none"

NO_BACKEND_MESSAGE = (
    "Kod bajarish xizmati sozlanmagan. Administrator Judge0 ni ishga tushirishi "
    "yoki LOCAL_JUDGE_ENABLED ni yoqishi kerak."
)


def _health_ttl() -> int:
    return max(5, site_settings.get_int("judge0_health_cache_sec", 30))


def local_allowed() -> bool:
    """Lokal runner ishlatilishi mumkinmi (sozlama + muhit)."""
    return site_settings.get_bool("judge0_local_fallback", True) and runner.is_enabled()


def judge0_available(*, refresh: bool = False) -> bool:
    if not site_settings.get_bool("judge0_enabled", True):
        return False
    if not site_settings.get_str("judge0_url"):
        return False
    if not refresh:
        cached = cache.get(_HEALTH_CACHE_KEY)
        if cached is not None:
            return bool(cached)
    available = Judge0Client().is_available()
    cache.set(_HEALTH_CACHE_KEY, available, _health_ttl())
    return available


def active_backend(*, refresh: bool = False) -> str:
    if judge0_available(refresh=refresh):
        return BACKEND_JUDGE0
    if local_allowed():
        return BACKEND_LOCAL
    return BACKEND_NONE


def supported_languages() -> dict[str, bool]:
    """Joriy backend qaysi tillarni bajara oladi."""
    if active_backend() == BACKEND_JUDGE0:
        from .judge0 import language_ids

        return dict.fromkeys(language_ids(), True)
    if local_allowed():
        return runner.available_languages()
    return {}


def execute(
    *,
    language: str,
    code: str,
    cases: list[dict],
    time_limit_ms: int,
    memory_limit_kb: int,
) -> tuple[str, list[ExecutionResult]]:
    """Test-case'larni bajaradi.

    `cases` — `{"input": str, "expected_output": str | None}` ro'yxati.
    `expected_output` `None` bo'lsa solishtirish qilinmaydi (maxsus kirish).

    Qaytadi: `(backend_nomi, natijalar)`. Natijalar ro'yxati har doim
    `cases` bilan bir xil uzunlikda bo'ladi.
    """
    backend = active_backend()

    if backend == BACKEND_JUDGE0:
        try:
            return BACKEND_JUDGE0, _execute_judge0(
                language=language, code=code, cases=cases,
                time_limit_ms=time_limit_ms, memory_limit_kb=memory_limit_kb,
            )
        except Exception as exc:  # noqa: BLE001 — Judge0 uzilib qolishi mumkin
            logger.warning("Judge0 xatosi, zaxira variantga o'tilmoqda: %s", exc)
            cache.set(_HEALTH_CACHE_KEY, False, _health_ttl())
            backend = BACKEND_LOCAL if local_allowed() else BACKEND_NONE

    if backend == BACKEND_LOCAL:
        return BACKEND_LOCAL, runner.execute_batch(
            language=language, code=code, cases=cases,
            time_limit_ms=time_limit_ms, memory_limit_kb=memory_limit_kb,
        )

    return BACKEND_NONE, [
        ExecutionResult(status="SYSTEM_ERROR", message=NO_BACKEND_MESSAGE) for _ in cases
    ]


def _execute_judge0(
    *, language: str, code: str, cases: list[dict], time_limit_ms: int, memory_limit_kb: int
) -> list[ExecutionResult]:
    client = Judge0Client()
    payloads = [
        client.build_payload(
            language=language,
            code=code,
            stdin=case.get("input") or "",
            expected_output=case.get("expected_output") or "",
            time_limit_ms=time_limit_ms,
            memory_limit_kb=memory_limit_kb,
        )
        for case in cases
    ]
    tokens = client.submit_batch(payloads)
    rows = _poll(client, tokens)
    results = [client.parse(row) for row in rows]

    # `execute` ning shartnomasi: natijalar soni testlar soniga TENG.
    # Judge0 biror natijani tushirib qoldirsa (tarmoq uzilishi, navbatdagi
    # xato), tekshirilmagan testlar jimgina «yo'q» bo'lib qolardi va
    # yechim to'liq o'tgan deb belgilanardi. Bu yerdagi xato yuqorida
    # ushlanadi va submission SYSTEM_ERROR oladi — noto'g'ri «qabul
    # qilindi» dan ko'ra ochiq xato yaxshiroq.
    if len(results) != len(cases):
        raise RuntimeError(
            f"Judge0 {len(cases)} testdan {len(results)} tasiga javob qaytardi."
        )

    # Maxsus kirishda Judge0 ham "Wrong Answer" qaytaradi (kutilgan chiqish bo'sh) —
    # solishtirish talab qilinmagan testlarni qabul qilingan deb belgilaymiz.
    for case, result in zip(cases, results, strict=True):
        if case.get("expected_output") is None and result.status == "WRONG_ANSWER":
            result.status = "ACCEPTED"
    return results


def _poll(client: Judge0Client, tokens: list[str]) -> list[dict]:
    """Natija tayyor bo'lguncha so'raydi; oraliq va urinishlar soni sozlamadan."""
    import time

    attempts, delay = client.poll_attempts, client.poll_delay
    for _ in range(attempts):
        rows = client.get_batch(tokens)
        pending = [
            row for row in rows
            if int((row.get("status") or {}).get("id", row.get("status_id", 1))) in (1, 2)
        ]
        if not pending:
            return rows
        time.sleep(delay)
    return client.get_batch(tokens)


def health(*, refresh: bool = True) -> dict:
    """Admin panel uchun judge holati."""
    judge0_ok = judge0_available(refresh=refresh)
    local_ok = local_allowed()
    backend = BACKEND_JUDGE0 if judge0_ok else (BACKEND_LOCAL if local_ok else BACKEND_NONE)
    return {
        "backend": backend,
        "available": backend != BACKEND_NONE,
        "judge0_url": site_settings.get_str("judge0_url"),
        "judge0_enabled": site_settings.get_bool("judge0_enabled", True),
        "judge0_available": judge0_ok,
        "local_enabled": local_ok,
        "local_runner_available": runner.is_enabled(),
        "local_fallback_allowed": site_settings.get_bool("judge0_local_fallback", True),
        "local_languages": runner.available_languages() if local_ok else {},
        "languages": supported_languages(),
    }
