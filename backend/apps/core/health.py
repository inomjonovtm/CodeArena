"""Sog'liq tekshiruvi.

Ikkita alohida endpoint bor va ular ATAYLAB har xil ishlaydi:

* `/health/` — **liveness**. Jarayon tirikmi, shu xolos. Docker
  `HEALTHCHECK` va platformaning "konteyner o'ldimi" tekshiruvi shuni
  so'raydi. Bu yerda bazaga tegilmaydi: baza yiqilganda konteynerni qayta
  ishga tushirish muammoni hal qilmaydi, faqat saytni butunlay o'chiradi.

* `/health/ready/` — **readiness**. Baza, kesh, qo'llanmagan migratsiya va
  judge tekshiriladi. Biror kritik bog'liqlik ishlamasa **503** qaytadi.
  Deploy'dan keyingi tekshiruv va tashqi monitoring shuni so'rashi kerak.

Ilgari `/health/` shunchaki `{"status": "ok"}` qaytarardi — ya'ni baza
butunlay o'lgan holatda ham deploy "muvaffaqiyatli" deb belgilanardi.
"""
from __future__ import annotations

import logging
import time

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache

logger = logging.getLogger(__name__)

VERSION = "2.0.0"

# Readiness natijasi shuncha soniyaga keshlanadi. Monitoring har 10 soniyada
# so'rasa ham baza har safar bezovta qilinmaydi.
_CACHE_KEY = "health:ready"
_CACHE_TTL = 5


def _timed(fn) -> tuple[bool, str | None, float]:
    started = time.monotonic()
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 — sabab javobga chiqadi
        return False, f"{type(exc).__name__}: {exc}"[:200], time.monotonic() - started
    return True, None, time.monotonic() - started


def _check_database() -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()


def _check_cache() -> None:
    key = "health:cache-probe"
    cache.set(key, "1", 10)
    if cache.get(key) != "1":
        raise RuntimeError("kesh yozildi-yu, qaytib o'qilmadi")


def _pending_migrations() -> list[str]:
    """Qo'llanmagan migratsiyalar ro'yxati.

    Deploy paytida `migrate` xizmati alohida ketadi; u tushib qolsa backend
    eski sxema ustida ishlab, tushunarsiz 500'lar bera boshlaydi. Shuning
    uchun bu holat readiness'da ochiq ko'rsatiladi.
    """
    from django.db.migrations.executor import MigrationExecutor

    executor = MigrationExecutor(connection)
    targets = executor.loader.graph.leaf_nodes()
    return [f"{app}.{name}" for app, name in executor.migration_plan(targets)]


def _collect() -> tuple[dict, bool]:
    checks: dict[str, dict] = {}
    healthy = True

    ok, error, took = _timed(_check_database)
    checks["database"] = {"ok": ok, "ms": round(took * 1000, 1), "error": error}
    healthy &= ok

    ok, error, took = _timed(_check_cache)
    checks["cache"] = {"ok": ok, "ms": round(took * 1000, 1), "error": error}
    healthy &= ok

    # Migratsiyani faqat baza tirik bo'lsa tekshiramiz — aks holda xato
    # ikki marta takrorlanadi va sabab chalkashadi.
    if checks["database"]["ok"]:
        try:
            pending = _pending_migrations()
        except Exception as exc:  # noqa: BLE001
            checks["migrations"] = {"ok": False, "error": str(exc)[:200]}
            healthy = False
        else:
            checks["migrations"] = {"ok": not pending, "pending": pending}
            if pending:
                healthy = False

    # Judge — KRITIK EMAS. U yiqilsa sayt ishlashda davom etadi, faqat
    # submissionlar navbatda qoladi; shuning uchun umumiy holatni buzmaydi.
    try:
        from apps.judge import engine

        backend = engine.active_backend()
        checks["judge"] = {"ok": backend != engine.BACKEND_NONE, "backend": backend,
                           "critical": False}
    except Exception as exc:  # noqa: BLE001
        checks["judge"] = {"ok": False, "error": str(exc)[:200], "critical": False}

    return checks, healthy


@never_cache
def liveness(_request):
    """Jarayon tirik. Hech qanday tashqi bog'liqlikka tegmaydi."""
    return JsonResponse({"status": "ok", "service": "codearena-api", "version": VERSION})


@never_cache
def readiness(request):
    """To'liq tekshiruv. Kritik bog'liqlik ishlamasa 503."""
    cached = cache.get(_CACHE_KEY) if not request.GET.get("refresh") else None
    if cached is None:
        checks, healthy = _collect()
        cached = {"status": "ok" if healthy else "degraded", "checks": checks}
        try:
            cache.set(_CACHE_KEY, cached, _CACHE_TTL)
        except Exception as exc:  # noqa: BLE001 — kesh o'zi yiqilgan bo'lishi mumkin
            logger.debug("Readiness natijasini keshlab bo'lmadi: %s", exc)
        if not healthy:
            logger.warning("Readiness tekshiruvi muvaffaqiyatsiz: %s", checks)

    body = {"service": "codearena-api", "version": VERSION, "debug": settings.DEBUG, **cached}
    status = 200 if cached["status"] == "ok" else 503
    return JsonResponse(body, status=status)
