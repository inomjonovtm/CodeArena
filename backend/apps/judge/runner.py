"""Lokal judge — Judge0 bo'lmaganda kodni shu serverda bajaradi.

MUHIM XAVFSIZLIK IZOHI
----------------------
Bu runner Judge0 ning **o'rnini bosmaydi**. U kodni Docker konteyneriga
emas, balki shu jarayonning o'zida (subprocess) bajaradi. Qo'llanadigan
himoya choralari:

* har bir bajarilish alohida vaqtinchalik katalogda ishlaydi;
* qattiq wall-clock timeout, keyin jarayon majburan o'ldiriladi;
* chiqish hajmi cheklangan (chiqishni cheksiz to'ldirib xotirani yeb
  qo'yishning oldini oladi);
* muhit o'zgaruvchilari tozalangan (sirlar kodga ko'rinmaydi);
* POSIX'da `setrlimit` orqali CPU, xotira, fayl hajmi va jarayonlar soni
  cheklanadi.

Baribir bu **to'liq sandbox emas**: tarmoqqa chiqish va fayl tizimini
o'qish bloklanmagan. Shuning uchun:

    LOCAL_JUDGE_ENABLED  →  DEBUG rejimida sukut bo'yicha yoqilgan,
                            produksiyada esa ATAYLAB o'chirilgan.

Produksiyada ishonchsiz foydalanuvchilar kodini faqat Judge0 (izolyatsiya
qilingan konteynerlar) orqali bajaring. Agar baribir yoqmoqchi bo'lsangiz,
backendni alohida, ishonchsiz mashinada ishlating.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass

from django.conf import settings

from .results import ExecutionResult, normalize_output

logger = logging.getLogger(__name__)

MAX_OUTPUT_CHARS = 64_000
COMPILE_TIMEOUT_SEC = 20


@dataclass(frozen=True)
class LanguageSpec:
    """Bitta til uchun: fayl nomi, kompilyatsiya va ishga tushirish buyrug'i."""

    key: str
    label: str
    filename: str
    # Kompilyatsiya buyrug'i (kerak bo'lsa). `{src}` va `{exe}` almashtiriladi.
    compile_cmd: list[str] | None
    run_cmd: list[str]
    # Runtime mavjudligini aniqlash uchun qidiriladigan dastur nomlari
    probes: tuple[str, ...]
    # Interpretatsiya qilinadigan tillar uchun sintaksis tekshiruvi: sintaksis
    # xatosi RUNTIME_ERROR emas, COMPILE_ERROR bo'lib ko'rinishi kerak.
    check_cmd: list[str] | None = None


def _python_executable() -> str:
    return sys.executable or "python"


LANGUAGES: dict[str, LanguageSpec] = {
    "python": LanguageSpec(
        key="python",
        label="Python 3",
        filename="main.py",
        compile_cmd=None,
        # -I: izolyatsiya rejimi (PYTHONPATH, user site-packages e'tiborsiz)
        run_cmd=[_python_executable(), "-I", "-B", "{src}"],
        probes=(),
        check_cmd=[_python_executable(), "-I", "-B", "-m", "py_compile", "{src}"],
    ),
    "javascript": LanguageSpec(
        key="javascript",
        label="Node.js",
        filename="main.js",
        compile_cmd=None,
        run_cmd=["node", "--no-warnings", "{src}"],
        probes=("node",),
        check_cmd=["node", "--no-warnings", "--check", "{src}"],
    ),
    "cpp": LanguageSpec(
        key="cpp",
        label="C++ (GCC)",
        filename="main.cpp",
        compile_cmd=["g++", "-O2", "-std=c++17", "-static-libstdc++", "-o", "{exe}", "{src}"],
        run_cmd=["{exe}"],
        probes=("g++",),
    ),
}


def _resolve(cmd: list[str], src: str, exe: str) -> list[str]:
    return [part.replace("{src}", src).replace("{exe}", exe) for part in cmd]


def _clip(text: str | None) -> str:
    text = text or ""
    if len(text) > MAX_OUTPUT_CHARS:
        return text[:MAX_OUTPUT_CHARS] + "\n… (chiqish qisqartirildi)"
    return text


def _scrub(text: str, workdir: str | None, filename: str) -> str:
    """Serverning ichki yo'llarini xato matnidan olib tashlaydi.

    Traceback'da `C:\\...\\Temp\\ca-judge-xxxx\\main.py` ko'rinishi kerak emas:
    bu foydalanuvchiga hech narsa bermaydi, lekin server tuzilishini oshkor
    qiladi. O'rniga oddiy fayl nomi qoldiriladi.
    """
    if not text or not workdir:
        return text
    for variant in {workdir, workdir.replace("\\", "/"), os.path.realpath(workdir)}:
        text = text.replace(variant + os.sep, "").replace(variant + "/", "")
        text = text.replace(variant, "")
    return text.replace(os.path.join(workdir, filename), filename)


def available_languages() -> dict[str, bool]:
    """Qaysi tillar shu mashinada ishlay oladi."""
    result = {}
    for key, spec in LANGUAGES.items():
        result[key] = all(shutil.which(probe) is not None for probe in spec.probes)
    return result


def is_enabled() -> bool:
    return bool(getattr(settings, "LOCAL_JUDGE_ENABLED", False))


def _limits_preexec(memory_limit_kb: int, time_limit_ms: int):
    """POSIX'da bola jarayonga qattiq resurs limitlarini o'rnatadi."""
    if os.name != "posix":
        return None

    import resource  # noqa: PLC0415 — faqat POSIX'da mavjud

    cpu_seconds = max(1, int(time_limit_ms / 1000) + 1)
    address_space = max(64, memory_limit_kb) * 1024

    def apply() -> None:
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
        resource.setrlimit(resource.RLIMIT_AS, (address_space, address_space))
        resource.setrlimit(resource.RLIMIT_FSIZE, (8 * 1024 * 1024, 8 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        os.setsid()

    return apply


def _child_env() -> dict[str, str]:
    """Sirlarsiz minimal muhit."""
    keep = {"PATH", "SYSTEMROOT", "COMSPEC", "TEMP", "TMP", "WINDIR", "PATHEXT", "LANG", "LC_ALL"}
    env = {key: value for key, value in os.environ.items() if key in keep}
    env.setdefault("LANG", "C.UTF-8")
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["HOME"] = env.get("TEMP", tempfile.gettempdir())
    env["NODE_OPTIONS"] = ""
    return env


class LocalRunner:
    """Kodni bir marta tayyorlab (kompilyatsiya qilib), har bir testda bajaradi."""

    def __init__(self, language: str, code: str, *, time_limit_ms: int, memory_limit_kb: int):
        self.spec = LANGUAGES.get(language) or LANGUAGES["python"]
        self.code = code
        self.time_limit_ms = max(200, int(time_limit_ms or 2000))
        self.memory_limit_kb = max(16 * 1024, int(memory_limit_kb or 262144))
        self.workdir: str | None = None
        self.compile_error: str = ""
        self.setup_error: str = ""

    # ------------------------------------------------------------ hayot sikli
    def __enter__(self) -> LocalRunner:
        self.workdir = tempfile.mkdtemp(prefix="ca-judge-")
        self._prepare()
        return self

    def __exit__(self, *_exc) -> None:
        if self.workdir:
            shutil.rmtree(self.workdir, ignore_errors=True)
            self.workdir = None

    # -------------------------------------------------------------- tayyorlash
    def _prepare(self) -> None:
        assert self.workdir
        missing = [probe for probe in self.spec.probes if shutil.which(probe) is None]
        if missing:
            self.setup_error = (
                f"{self.spec.label} bu serverda o'rnatilmagan ({', '.join(missing)})."
            )
            return

        self.src = os.path.join(self.workdir, self.spec.filename)
        self.exe = os.path.join(self.workdir, "program.exe" if os.name == "nt" else "program")
        with open(self.src, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(self.code or "")

        command = self.spec.compile_cmd or self.spec.check_cmd
        if not command:
            return

        try:
            proc = subprocess.run(  # noqa: S603
                _resolve(command, self.src, self.exe),
                cwd=self.workdir,
                env=_child_env(),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=COMPILE_TIMEOUT_SEC,
            )
        except subprocess.TimeoutExpired:
            self.compile_error = "Kompilyatsiya juda uzoq davom etdi."
            return
        except OSError as exc:
            self.setup_error = f"Kompilyatorni ishga tushirib bo'lmadi: {exc}"
            return

        if proc.returncode != 0:
            self.compile_error = self._clean(
                _clip(proc.stderr or proc.stdout or "Kompilyatsiya xatosi.")
            )

    def _clean(self, text: str) -> str:
        return _scrub(text, self.workdir, self.spec.filename)

    # ------------------------------------------------------------- bajarilish
    def run_case(self, stdin: str, expected_output: str | None) -> ExecutionResult:
        """Bitta test-case'ni bajaradi va statusni aniqlaydi."""
        if self.setup_error:
            return ExecutionResult(status="SYSTEM_ERROR", message=self.setup_error)
        if self.compile_error:
            return ExecutionResult(status="COMPILE_ERROR", compile_output=self.compile_error)

        assert self.workdir
        timeout_sec = self.time_limit_ms / 1000 + 2
        started = time.perf_counter()
        try:
            proc = subprocess.run(  # noqa: S603
                _resolve(self.spec.run_cmd, self.src, self.exe),
                input=stdin or "",
                cwd=self.workdir,
                env=_child_env(),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout_sec,
                preexec_fn=_limits_preexec(self.memory_limit_kb, self.time_limit_ms),  # noqa: PLW1509
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(
                status="TIME_LIMIT_EXCEEDED",
                runtime_ms=self.time_limit_ms,
                message=f"Vaqt limiti ({self.time_limit_ms} ms) oshib ketdi.",
            )
        except OSError as exc:
            return ExecutionResult(status="SYSTEM_ERROR", message=str(exc))

        runtime_ms = int((time.perf_counter() - started) * 1000)
        stdout = _clip(proc.stdout)
        stderr = self._clean(_clip(proc.stderr))

        if runtime_ms > self.time_limit_ms:
            return ExecutionResult(
                status="TIME_LIMIT_EXCEEDED", runtime_ms=runtime_ms,
                stdout=stdout, stderr=stderr,
            )

        if proc.returncode != 0:
            status = "RUNTIME_ERROR"
            lowered = stderr.lower()
            if "memoryerror" in lowered or "bad_alloc" in lowered or "out of memory" in lowered:
                status = "MEMORY_LIMIT_EXCEEDED"
            return ExecutionResult(
                status=status,
                runtime_ms=runtime_ms,
                stdout=stdout,
                stderr=stderr,
                message=f"Jarayon {proc.returncode} kodi bilan tugadi.",
            )

        if expected_output is None:
            # Maxsus kirish — solishtiriladigan javob yo'q
            return ExecutionResult(status="ACCEPTED", runtime_ms=runtime_ms, stdout=stdout, stderr=stderr)

        matched = normalize_output(stdout) == normalize_output(expected_output)
        return ExecutionResult(
            status="ACCEPTED" if matched else "WRONG_ANSWER",
            runtime_ms=runtime_ms,
            stdout=stdout,
            stderr=stderr,
        )


def execute_batch(
    *,
    language: str,
    code: str,
    cases: list[dict],
    time_limit_ms: int,
    memory_limit_kb: int,
) -> list[ExecutionResult]:
    """Bir necha test-case'ni ketma-ket bajaradi.

    `cases` — `{"input": str, "expected_output": str | None}` ro'yxati.
    Kompilyatsiya bir marta bajariladi; kompilyatsiya yoki sozlash xatosida
    hech qanday jarayon ishga tushmaydi va barcha testlar bir xil xatoni
    qaytaradi.
    """
    with LocalRunner(
        language, code, time_limit_ms=time_limit_ms, memory_limit_kb=memory_limit_kb
    ) as runner:
        return [
            runner.run_case(case.get("input") or "", case.get("expected_output"))
            for case in cases
        ]
