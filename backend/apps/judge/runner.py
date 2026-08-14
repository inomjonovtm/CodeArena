"""Lokal ijro — FAQAT ishlab chiqish uchun zaxira yo'l.

BU SANDBOX EMAS. Kod shu serverning o'zida, Django/Celery jarayoni bilan
bir xil foydalanuvchi nomidan bajariladi. Konteyner izolyatsiyasi ham,
tarmoq to'sig'i ham yo'q. Shuning uchun u sukut bo'yicha faqat `DEBUG`
rejimida yoqiladi (`LOCAL_JUDGE_ENABLED`) va produksiyada ishlatilmasligi
kerak — u yerda `infra/runner` konteyneri bor.

NEGA ALOHIDA NUSXA YO'Q. Ijro mantig'i (limitlar, guruhni o'ldirish,
chiqishni cheklash, namespace) xavfsizlik uchun muhim, shuning uchun u
YAGONA joyda turadi: `infra/runner/executor.py`. Bu modul o'sha faylni
import qiladi. Konteynerda esa u fayl image ichida bo'ladi va bu modulga
umuman murojaat qilinmaydi.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from django.conf import settings

from .results import ExecutionResult

logger = logging.getLogger(__name__)

#: `infra/runner` katalogi — repozitoriy ildizidan.
_EXECUTOR_DIR = Path(__file__).resolve().parents[3] / "infra" / "runner"


def _executor():
    """Ijro yadrosini yuklaydi. Topilmasa `None` (produksiya image'ida shunday)."""
    global _EXECUTOR_CACHE
    if _EXECUTOR_CACHE is _UNSET:
        _EXECUTOR_CACHE = None
        if _EXECUTOR_DIR.is_dir():
            if str(_EXECUTOR_DIR) not in sys.path:
                sys.path.insert(0, str(_EXECUTOR_DIR))
            try:
                import executor  # type: ignore[import-not-found]

                _EXECUTOR_CACHE = executor
            except ImportError as exc:  # pragma: no cover — muhitga bog'liq
                logger.warning("Lokal ijro yadrosi yuklanmadi: %s", exc)
    return _EXECUTOR_CACHE


_UNSET = object()
_EXECUTOR_CACHE: object = _UNSET


def _extra_bin_dirs() -> list[str]:
    """`JUDGE_BIN_DIRS` sozlamasidagi qo'shimcha kataloglar.

    Windows'da kompilyator odatda `PATH` da bo'lmaydi; shu sozlama orqali
    uni ko'rsatib qo'yish mumkin.
    """
    raw = getattr(settings, "JUDGE_BIN_DIRS", "") or ""
    return [part.strip() for part in raw.split(os.pathsep) if part.strip()]


def _apply_bin_dirs() -> None:
    """Qo'shimcha kataloglarni jarayon `PATH` iga qo'shadi (bir marta)."""
    extra = _extra_bin_dirs()
    if not extra:
        return
    current = os.environ.get("PATH", "")
    missing = [path for path in extra if path not in current.split(os.pathsep)]
    if missing:
        os.environ["PATH"] = os.pathsep.join([*missing, current]) if current else os.pathsep.join(missing)


def is_enabled() -> bool:
    """Lokal ijro yoqilganmi va yadro mavjudmi."""
    return bool(getattr(settings, "LOCAL_JUDGE_ENABLED", False)) and _executor() is not None


def available_languages() -> dict[str, bool]:
    """Shu mashinada qaysi tillar ishlaydi."""
    core = _executor()
    if core is None:
        return {}
    _apply_bin_dirs()
    return core.available_languages()


def execute_batch(
    *,
    language: str,
    code: str,
    cases: list[dict],
    time_limit_ms: int,
    memory_limit_kb: int,
) -> list[ExecutionResult]:
    """Kodni testlar ustida bajaradi (lokal, izolyatsiyasiz)."""
    core = _executor()
    if core is None:
        return [
            ExecutionResult(status="SYSTEM_ERROR", message="Lokal ijro yadrosi topilmadi.")
            for _ in cases
        ]

    _apply_bin_dirs()
    rows = core.execute_batch(
        language=language,
        code=code,
        cases=cases,
        time_limit_ms=time_limit_ms,
        memory_limit_kb=memory_limit_kb,
        # Namespace bilan o'rash lokal muhitda ko'pincha mavjud emas va
        # kerak ham emas: bu yo'l baribir ishonchsiz kod uchun emas.
        isolate_network=False,
    )

    from .remote import _verdict  # aylanma importdan qochish uchun ichkarida

    return [_verdict(case, row) for case, row in zip(cases, rows, strict=True)]
