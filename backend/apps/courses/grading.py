"""Kurs kodini bajarish — judge dvigatelining ustidagi yupqa qatlam.

Bu yerda o'z runneri YO'Q: `apps.judge.engine` ham masalada, ham kursda
bir xil ishlaydi, ya'ni Judge0 sozlanganda kurs topshiriqlari ham
avtomatik o'sha izolyatsiyalangan konteynerlarda bajariladi.

Modul uchta ishni bajaradi:

* `run_snippet`  — «Sinab ko'rish»: kodni bajarib, chiqishini qaytaradi;
* `run_tests`    — topshiriqni testlar bo'yicha tekshiradi;
* natijani interfeys kutgan shaklga keltiradi (kesilgan chiqish, status).
"""
from __future__ import annotations

import logging

from apps.judge import engine

logger = logging.getLogger(__name__)

MAX_STDOUT_CHARS = 4000
MAX_STDERR_CHARS = 2000

LANGUAGE_LABEL = {"python": "Python", "javascript": "JavaScript", "cpp": "C++"}


# Judge xizmati javob bermaganda foydalanuvchiga qaytadigan ma'no.
# `views.py` shu istisnoni ushlab 503 qaytaradi — kutilmagan 500 emas.
class JudgeUnavailable(RuntimeError):
    pass


def _fail_if_no_backend(backend: str) -> None:
    if backend == engine.BACKEND_NONE:
        raise JudgeUnavailable(engine.NO_BACKEND_MESSAGE)


def _require_language(language: str) -> None:
    """Til joriy backendda bajarilishini oldindan tekshiradi.

    Bu bo'lmasa, o'rnatilmagan til (masalan `g++` yo'q mashinada C++)
    izohsiz `SYSTEM_ERROR` qaytarardi va o'quvchi «tizim xatosi» degan
    yozuvni ko'rib, aybni o'z kodidan qidirardi. Endi sabab aniq aytiladi.
    """
    languages = engine.supported_languages()
    if not languages:
        raise JudgeUnavailable(engine.NO_BACKEND_MESSAGE)
    if not languages.get(language):
        label = LANGUAGE_LABEL.get(language, language)
        raise JudgeUnavailable(
            f"{label} hozircha bajarilmaydi: serverda bu til uchun muhit sozlanmagan. "
            "Administrator Judge0 ni ishga tushirishi yoki kerakli kompilyatorni "
            "o'rnatishi kerak."
        )


def run_snippet(*, language: str, code: str, stdin: str = "", time_limit_ms: int = 5000,
                memory_limit_kb: int = 262144) -> dict:
    """Kodni bir marta bajaradi va chiqishini qaytaradi.

    Kutilgan javob berilmaydi (`expected_output=None`), ya'ni «to'g'ri /
    noto'g'ri» hukmi yo'q — bu misolni sinab ko'rish, imtihon emas.
    """
    _require_language(language)
    try:
        backend, results = engine.execute(
            language=language,
            code=code,
            cases=[{"input": stdin or "", "expected_output": None}],
            time_limit_ms=time_limit_ms,
            memory_limit_kb=memory_limit_kb,
        )
    except JudgeUnavailable:
        raise
    except Exception as exc:
        logger.warning("Kurs misolini bajarib bo'lmadi: %s", exc)
        raise JudgeUnavailable("Judge xizmatiga ulanib bo'lmadi.") from exc

    _fail_if_no_backend(backend)
    result = results[0]

    return {
        "status": "EXECUTED" if result.status == "ACCEPTED" else result.status,
        "stdout": result.stdout[:MAX_STDOUT_CHARS],
        "stderr": result.stderr[:MAX_STDERR_CHARS],
        "compile_output": result.compile_output[:MAX_STDOUT_CHARS],
        "runtime_ms": result.runtime_ms,
        "backend": backend,
    }


def run_tests(*, exercise, code: str, language: str | None = None, sample_only: bool = False) -> dict:
    """Topshiriqni testlar bo'yicha bajaradi.

    `sample_only=True` — «Ishga tushirish» tugmasi: faqat ochiq testlar
    ishlaydi va kirish/chiqish to'liq ko'rsatiladi. Yopiq testlar esa
    faqat «Topshirish»da qatnashadi va ularning kirishi qaytarilmaydi —
    aks holda javobni testdan ko'chirib olish mumkin bo'lardi.
    """
    _require_language(language or exercise.language)

    queryset = exercise.tests.all()
    if sample_only:
        queryset = queryset.filter(is_sample=True)
    tests = list(queryset)

    if not tests:
        # Testsiz topshiriqni tekshirib bo'lmaydi — kodni shunchaki bajarib,
        # chiqishini ko'rsatamiz (chala sozlangan topshiriq foydalanuvchini
        # «yechim noto'g'ri» degan yolg'on xabar bilan to'xtatmasin).
        snippet = run_snippet(
            language=language or exercise.language,
            code=code,
            time_limit_ms=exercise.time_limit_ms,
            memory_limit_kb=exercise.memory_limit_kb,
        )
        return {
            "results": [
                {
                    "order": 1,
                    "status": snippet["status"],
                    "input": "",
                    "expected_output": None,
                    "stdout": snippet["stdout"],
                    "stderr": snippet["stderr"],
                    "compile_output": snippet["compile_output"],
                    "runtime_ms": snippet["runtime_ms"],
                    "is_hidden": False,
                }
            ],
            "passed": 0,
            "total": 0,
            "all_passed": False,
            "status": snippet["status"],
            "runtime_ms": snippet["runtime_ms"],
            "backend": snippet["backend"],
        }

    cases = [{"input": test.input, "expected_output": test.expected_output} for test in tests]

    try:
        backend, parsed = engine.execute(
            language=language or exercise.language,
            code=code,
            cases=cases,
            time_limit_ms=exercise.time_limit_ms,
            memory_limit_kb=exercise.memory_limit_kb,
        )
    except Exception as exc:
        logger.warning("Kurs topshirig'ini bajarib bo'lmadi: %s", exc)
        raise JudgeUnavailable("Judge xizmatiga ulanib bo'lmadi.") from exc

    _fail_if_no_backend(backend)

    rows = []
    passed = 0
    runtime = 0
    first_failure = ""

    for index, (test, result) in enumerate(zip(tests, parsed, strict=True), start=1):
        ok = result.status == "ACCEPTED"
        if ok:
            passed += 1
        elif not first_failure:
            first_failure = result.status
        runtime = max(runtime, result.runtime_ms or 0)

        hidden = not test.is_sample
        rows.append(
            {
                "order": index,
                "status": result.status,
                # Yopiq testning kirishi va kutilgan javobi berilmaydi
                "input": "" if hidden else test.input,
                "expected_output": None if hidden else test.expected_output,
                "stdout": "" if hidden else result.stdout[:MAX_STDOUT_CHARS],
                "stderr": result.stderr[:MAX_STDERR_CHARS],
                "compile_output": result.compile_output[:MAX_STDOUT_CHARS],
                "runtime_ms": result.runtime_ms,
                "explanation_uz": "" if hidden else test.explanation_uz,
                "is_hidden": hidden,
            }
        )

    all_passed = passed == len(rows)
    return {
        "results": rows,
        "passed": passed,
        "total": len(rows),
        "all_passed": all_passed,
        "status": "ACCEPTED" if all_passed else (first_failure or "WRONG_ANSWER"),
        "runtime_ms": runtime or None,
        "backend": backend,
    }
