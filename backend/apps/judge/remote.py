"""Runner xizmati bilan aloqa — `infra/runner` konteyneriga HTTP klient.

Bu yerda hech qanday kod BAJARILMAYDI: faqat so'rov yuboriladi va javob
`ExecutionResult` ga aylantiriladi. Bajarish o'sha konteynerning ichida,
izolyatsiyalangan holda ketadi (`infra/runner/executor.py`).
"""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from apps.core import site_settings

from .results import ExecutionResult, normalize_output

logger = logging.getLogger(__name__)


class RunnerError(RuntimeError):
    """Runner javob bermadi yoki tushunarsiz javob qaytardi."""


def _base_url() -> str:
    return (site_settings.get_str("runner_url", "") or "").rstrip("/")


def _token() -> str:
    return site_settings.get_str("runner_token", "")


def _timeout() -> float:
    return float(site_settings.get_int("runner_timeout_sec", 120) or 120)


def _request(path: str, payload: dict | None = None, *, timeout: float | None = None) -> dict:
    base = _base_url()
    if not base:
        raise RunnerError("Runner manzili sozlanmagan.")

    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(  # noqa: S310 — manzil sozlamadan, ichki tarmoq
        f"{base}{path}",
        data=data,
        method="POST" if data else "GET",
        headers={
            "Content-Type": "application/json",
            **({"X-Runner-Token": _token()} if _token() else {}),
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout or _timeout()) as response:  # noqa: S310
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("detail", "")
        except Exception:  # noqa: BLE001 — javob JSON bo'lmasligi mumkin
            detail = ""
        raise RunnerError(f"Runner {exc.code} qaytardi. {detail}".strip()) from exc
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        raise RunnerError(f"Runner bilan bog'lanib bo'lmadi: {exc}") from exc


def health(*, timeout: float = 5.0) -> dict:
    """`{"ok": bool, "languages": {...}}` yoki xato holatida bo'sh ro'yxat."""
    try:
        payload = _request("/health", timeout=timeout)
    except RunnerError as exc:
        return {"ok": False, "languages": {}, "error": str(exc)}
    return {
        "ok": bool(payload.get("ok")),
        "languages": payload.get("languages") or {},
        "error": "",
    }


def execute(
    *,
    language: str,
    code: str,
    cases: list[dict],
    time_limit_ms: int,
    memory_limit_kb: int,
) -> list[ExecutionResult]:
    """Kodni testlar ustida bajaradi va verdiktlarni qaytaradi.

    `expected_output` `None` bo'lsa solishtirish o'tkazilmaydi — dastur
    shunchaki ishga tushirilgan bo'ladi (generator, checker, qumloq).
    """
    payload = {
        "language": language,
        "code": code,
        "cases": [
            {
                "input": case.get("input") or "",
                # Har bir test o'z limitini olishi mumkin: ilgari butun
                # to'plamga eng katta limit qo'llanardi va sekin testlar
                # tezlarini ham "yumshatib" yuborardi.
                "time_limit_ms": case.get("time_limit_ms") or time_limit_ms,
                "memory_limit_kb": case.get("memory_limit_kb") or memory_limit_kb,
            }
            for case in cases
        ],
        "time_limit_ms": time_limit_ms,
        "memory_limit_kb": memory_limit_kb,
    }

    # Kutish vaqti testlar soniga bog'liq: 40 ta 2s-lik testda eng yomon
    # holat (har biri deadline'gacha boradi) sozlamadagi 120s dan oshib
    # ketishi mumkin. U holda foydalanuvchi TLE o'rniga SYSTEM_ERROR olardi
    # va sog'lik keshi hammani 30s ga bloklab qo'yardi.
    worst_case_sec = sum(
        (case.get("time_limit_ms") or time_limit_ms) / 1000 + 2.5 for case in cases
    ) + 30  # kompilyatsiya va tarmoq zaxirasi
    response = _request("/run", payload, timeout=max(_timeout(), worst_case_sec))
    rows = response.get("results")
    if not isinstance(rows, list) or len(rows) != len(cases):
        raise RunnerError(
            f"Runner {len(cases)} testdan {len(rows) if isinstance(rows, list) else 0} "
            "tasiga javob qaytardi."
        )

    results: list[ExecutionResult] = []
    for case, row in zip(cases, rows, strict=True):
        results.append(_verdict(case, row))
    return results


def _verdict(case: dict, row: dict) -> ExecutionResult:
    """Runner javobini verdiktga aylantiradi (solishtirish shu yerda)."""
    status = str(row.get("status") or "SYSTEM_ERROR")
    result = ExecutionResult(
        status=status,
        runtime_ms=row.get("runtime_ms"),
        memory_kb=row.get("memory_kb"),
        stdout=row.get("stdout") or "",
        stderr=row.get("stderr") or "",
        compile_output=row.get("compile_output") or "",
        message=row.get("message") or "",
    )

    if status != "OK":
        return result

    # Himoya qatlami: dastur muvaffaqiyatli tugagan bo'lsa ham limitdan
    # sekin ishlagan bo'lsa — TLE. Runner buni o'zi ham tekshiradi, lekin
    # eski runner yoki chegara holatlarida verdikt shu yerda yakunlanadi.
    limit_ms = case.get("time_limit_ms")
    if limit_ms and (result.runtime_ms or 0) > int(limit_ms):
        result.status = "TIME_LIMIT_EXCEEDED"
        result.message = f"Vaqt limiti ({limit_ms} ms) oshib ketdi."
        return result

    expected = case.get("expected_output")
    if expected is None:
        # Solishtiriladigan javob yo'q — dastur ishga tushgani yetarli.
        result.status = "ACCEPTED"
        return result

    matched = normalize_output(result.stdout) == normalize_output(expected)
    result.status = "ACCEPTED" if matched else "WRONG_ANSWER"
    return result
