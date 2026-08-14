"""Izolyatsiyalangan kod bajaruvchi — CodeArena runner xizmatining yadrosi.

BU FAYL DJANGO'GA BOG'LIQ EMAS: u alohida konteynerda, alohida jarayonda
ishlaydi va faqat standart kutubxonadan foydalanadi.

XAVFSIZLIK QATLAMLARI (chuqurlikda himoya — biri buzilsa keyingisi ushlab
qoladi):

  1. KONTEYNER. Runner alohida image'da, `read_only` fayl tizimi bilan,
     `cap_drop: ALL` va `no-new-privileges` bayrog'i ostida, root emas
     foydalanuvchi nomidan ishga tushadi. Unda na baza paroli, na sayt
     kodi, na maxfiy kalit bor — o'g'irlaydigan narsaning o'zi yo'q.

  2. TARMOQ. Konteyner faqat ichki (`internal`) tarmoqda: internetga
     umuman chiqa olmaydi. Bundan tashqari har bir bajarilish O'Z tarmoq
     fazosida ishga tushadi (`unshare --net`), ya'ni unda `lo` dan boshqa
     interfeys yo'q — hatto backendga ham ulana olmaydi.

  3. NAMESPACE. `unshare --user --map-root-user --net --pid --mount-proc`
     bola jarayonga alohida foydalanuvchi, tarmoq va PID fazosini beradi.
     Buning uchun privileged rejim KERAK EMAS: yadroning imtiyozsiz user
     namespace imkoniyati yetarli. Mavjud bo'lmasa (eski yadro), ijro
     davom etadi — u holda konteyner darajasidagi izolyatsiya ishlaydi.

  4. RESURS LIMITLARI. Har bir jarayonga `setrlimit` orqali CPU vaqti,
     manzil fazosi (xotira), fayl hajmi, jarayonlar soni va ochiq fayl
     deskriptorlari cheklanadi; core-dump butunlay o'chiriladi.

  5. VAQT. Devor soati bo'yicha qattiq chegara: muddat tugasa BUTUN
     jarayonlar guruhi (`killpg`) o'ldiriladi — bola tug'dirgan jarayonlar
     ham qolib ketmaydi.

  6. CHIQISH HAJMI. stdout/stderr oqim BO'YICHA cheklanadi: chegaradan
     oshgan zahoti jarayon to'xtatiladi, ya'ni gigabayt chiqaruvchi dastur
     serverning xotirasini to'ldira olmaydi.
"""
from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time

# Python uchun ayni shu interpretator ishlatiladi. Windows'da `python3` nomi
# Microsoft Store'ning bo'sh yorlig'iga olib boradi va "Python topilmadi"
# degan chalg'ituvchi xato beradi; konteynerda esa ikkalasi bir xil fayl.
PYTHON_BIN = sys.executable or shutil.which("python3") or "python3"

# CPU vaqti limiti bo'yicha o'ldirilgan jarayonning chiqish kodlari.
# `SIGXCPU` faqat POSIX'da bor, shuning uchun ro'yxat shartli quriladi.
_CPU_SIGNALS: tuple[int, ...] = (
    (-signal.SIGXCPU, 128 + int(signal.SIGXCPU)) if hasattr(signal, "SIGXCPU") else ()
)

MAX_OUTPUT_BYTES = 64_000
COMPILE_TIMEOUT_SEC = 20
COMPILE_MEMORY_KB = 1_024 * 1024  # 1 GB — kompilyator o'zi ko'p xotira oladi
MIN_TIME_LIMIT_MS = 100
MIN_MEMORY_KB = 8 * 1024

# --------------------------------------------------------------------- tillar
# `{src}` — manba fayl yo'li, `{exe}` — kompilyatsiya natijasi, `{dir}` — ish
# katalogi. `probe` — shu dastur PATH da bo'lmasa til o'chiq deb qaraladi.
LANGUAGES: dict[str, dict] = {
    "python": {
        "label": "Python 3",
        "filename": "main.py",
        "run": [PYTHON_BIN, "-I", "-B", "{src}"],
        "check": [PYTHON_BIN, "-I", "-B", "-m", "py_compile", "{src}"],
        "probe": PYTHON_BIN,
    },
    "cpp": {
        "label": "C++ 17 (GCC)",
        "filename": "main.cpp",
        "compile": ["g++", "-O2", "-std=c++17", "-w", "-o", "{exe}", "{src}"],
        "run": ["{exe}"],
        "probe": "g++",
    },
    "c": {
        "label": "C 17 (GCC)",
        "filename": "main.c",
        "compile": ["gcc", "-O2", "-std=c17", "-w", "-o", "{exe}", "{src}", "-lm"],
        "run": ["{exe}"],
        "probe": "gcc",
    },
    "javascript": {
        "label": "JavaScript (Node)",
        "filename": "main.js",
        "run": ["node", "--no-warnings", "{src}"],
        "check": ["node", "--no-warnings", "--check", "{src}"],
        "probe": "node",
    },
    "typescript": {
        "label": "TypeScript",
        "filename": "main.ts",
        # `--transpile-only` ataylab: tur tekshiruvi musobaqada keraksiz
        # sekinlik beradi, xatolar esa baribir ishga tushganda ko'rinadi.
        "run": ["npx", "--no-install", "tsx", "{src}"],
        "probe": "npx",
    },
    "java": {
        "label": "Java 17",
        "filename": "Main.java",
        "compile": ["javac", "-nowarn", "-d", "{dir}", "{src}"],
        "run": ["java", "-XX:+UseSerialGC", "-Xss64m", "-cp", "{dir}", "Main"],
        "probe": "javac",
    },
    "go": {
        "label": "Go",
        "filename": "main.go",
        "compile": ["go", "build", "-o", "{exe}", "{src}"],
        "run": ["{exe}"],
        "probe": "go",
    },
    "rust": {
        "label": "Rust",
        "filename": "main.rs",
        "compile": ["rustc", "-O", "--edition", "2021", "-o", "{exe}", "{src}"],
        "run": ["{exe}"],
        "probe": "rustc",
    },
    "csharp": {
        "label": "C#",
        "filename": "Main.cs",
        "compile": ["mcs", "-out:{exe}", "{src}"],
        "run": ["mono", "{exe}"],
        "probe": "mcs",
    },
    "php": {
        "label": "PHP",
        "filename": "main.php",
        "run": ["php", "-d", "error_reporting=E_ALL & ~E_DEPRECATED", "{src}"],
        "check": ["php", "-l", "{src}"],
        "probe": "php",
    },
    "ruby": {
        "label": "Ruby",
        "filename": "main.rb",
        "run": ["ruby", "{src}"],
        "check": ["ruby", "-c", "{src}"],
        "probe": "ruby",
    },
    "kotlin": {
        "label": "Kotlin",
        "filename": "Main.kt",
        "compile": ["kotlinc", "-include-runtime", "-d", "{exe}.jar", "{src}"],
        "run": ["java", "-XX:+UseSerialGC", "-jar", "{exe}.jar"],
        "probe": "kotlinc",
    },
}


def available_languages() -> dict[str, bool]:
    """Qaysi tillar shu konteynerda haqiqatan ishlaydi."""
    return {key: shutil.which(spec["probe"]) is not None for key, spec in LANGUAGES.items()}


# ------------------------------------------------------------------ namespace

def _userns_works() -> bool:
    """Imtiyozsiz user namespace ishlaydimi — bir marta tekshirib keshlanadi."""
    global _USERNS_CACHE
    if _USERNS_CACHE is None:
        _USERNS_CACHE = False
        if os.name == "posix" and shutil.which("unshare"):
            try:
                probe = subprocess.run(
                    ["unshare", "--user", "--map-root-user", "--net", "true"],
                    capture_output=True, timeout=5,
                )
                _USERNS_CACHE = probe.returncode == 0
            except (OSError, subprocess.SubprocessError):
                _USERNS_CACHE = False
    return _USERNS_CACHE


_USERNS_CACHE: bool | None = None


def _wrap(command: list[str], *, isolate_network: bool) -> list[str]:
    """Buyruqni namespace qobig'iga o'raydi (imkon bo'lsa)."""
    if not isolate_network or not _userns_works():
        return command
    return [
        "unshare",
        "--user",           # alohida foydalanuvchi fazosi (root emas)
        "--map-root-user",
        "--net",            # tarmoqsiz: faqat `lo`
        "--pid",            # boshqa jarayonlar ko'rinmaydi
        "--fork",
        "--mount-proc",
        "--",
        *command,
    ]


def _child_env() -> dict[str, str]:
    """Bolaga beriladigan muhit — faqat zarur o'zgaruvchilar.

    `SYSTEMROOT` va qo'shnilari Windows uchun SHART: usiz Node ham, boshqa
    ko'p dastur ham ishga tushmasdan yiqiladi. Linux konteynerida ular
    baribir yo'q, shuning uchun ro'yxatga qo'shib qo'yish zararsiz.
    """
    keep = (
        "PATH", "LANG", "LC_ALL", "HOME", "TMPDIR",
        "JAVA_HOME", "GOCACHE", "GOPATH",
        "SYSTEMROOT", "COMSPEC", "TEMP", "TMP", "WINDIR", "PATHEXT",
    )
    env = {name: os.environ[name] for name in keep if name in os.environ}
    env.setdefault("PATH", "/usr/local/bin:/usr/bin:/bin")
    env.setdefault("LANG", "C.UTF-8")
    env["HOME"] = env.get("TMPDIR", "/tmp")
    env["PYTHONIOENCODING"] = "utf-8"
    env["NODE_OPTIONS"] = ""
    return env


def _limits(memory_kb: int, cpu_seconds: int):
    """Bola jarayonga qattiq resurs chegaralarini o'rnatadi (faqat POSIX)."""
    if os.name != "posix":
        return None

    import resource

    def apply() -> None:
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
        address_space = max(memory_kb, MIN_MEMORY_KB) * 1024
        resource.setrlimit(resource.RLIMIT_AS, (address_space, address_space))
        resource.setrlimit(resource.RLIMIT_FSIZE, (16 * 1024 * 1024, 16 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_NPROC, (128, 128))
        resource.setrlimit(resource.RLIMIT_NOFILE, (256, 256))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        # O'z guruhini yaratadi: vaqt tugaganda butun daraxtni o'ldiramiz.
        os.setsid()

    return apply


def _reader(stream, sink: list[bytes], limit: int, overflow: threading.Event) -> None:
    """Oqimni bo'lak-bo'lak o'qiydi va chegaradan oshsa belgi qo'yadi."""
    total = 0
    try:
        while True:
            chunk = stream.read(8192)
            if not chunk:
                break
            total += len(chunk)
            if total <= limit:
                sink.append(chunk)
            else:
                sink.append(chunk[: max(0, limit - (total - len(chunk)))])
                overflow.set()
                break
    except (OSError, ValueError):
        pass
    finally:
        try:
            stream.close()
        except OSError:
            pass


def _decode(chunks: list[bytes]) -> str:
    return b"".join(chunks).decode("utf-8", "replace")


class Execution:
    """Bitta manba kodi — bir marta kompilyatsiya, ko'p marta ishga tushirish."""

    def __init__(self, language: str, code: str, *, isolate_network: bool = True) -> None:
        self.spec = LANGUAGES[language]
        self.code = code
        self.isolate_network = isolate_network
        self.workdir = ""
        self.src = ""
        self.exe = ""
        self.setup_error = ""
        self.compile_error = ""

    def __enter__(self) -> "Execution":
        self.workdir = tempfile.mkdtemp(prefix="ca-run-")
        os.chmod(self.workdir, 0o700)
        self._prepare()
        return self

    def __exit__(self, *_exc) -> None:
        if self.workdir:
            shutil.rmtree(self.workdir, ignore_errors=True)
            self.workdir = ""

    # ------------------------------------------------------------- tayyorlash
    def _resolve(self, command: list[str]) -> list[str]:
        return [
            part.replace("{src}", self.src).replace("{exe}", self.exe).replace("{dir}", self.workdir)
            for part in command
        ]

    def _prepare(self) -> None:
        if shutil.which(self.spec["probe"]) is None:
            self.setup_error = f"{self.spec['label']} bu serverda o'rnatilmagan."
            return

        self.src = os.path.join(self.workdir, self.spec["filename"])
        self.exe = os.path.join(self.workdir, "program")
        with open(self.src, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(self.code or "")

        command = self.spec.get("compile") or self.spec.get("check")
        if not command:
            return

        try:
            # Kompilyatsiya tarmoqsiz ham bajariladi: hech bir til uchun
            # tashqi paket yuklab olish kerak emas (va kerak bo'lmasligi ham
            # kerak — aks holda bu tarmoq teshigi bo'lardi).
            proc = subprocess.run(
                _wrap(self._resolve(command), isolate_network=self.isolate_network),
                cwd=self.workdir,
                env=_child_env(),
                capture_output=True,
                timeout=COMPILE_TIMEOUT_SEC,
                preexec_fn=_limits(COMPILE_MEMORY_KB, COMPILE_TIMEOUT_SEC),
            )
        except subprocess.TimeoutExpired:
            self.compile_error = "Kompilyatsiya juda uzoq davom etdi."
            return
        except OSError as exc:
            self.setup_error = f"Kompilyatorni ishga tushirib bo'lmadi: {exc}"
            return

        if proc.returncode != 0:
            raw = (proc.stderr or proc.stdout or b"")[:MAX_OUTPUT_BYTES]
            self.compile_error = self._scrub(raw.decode("utf-8", "replace")) or "Kompilyatsiya xatosi."

    def _scrub(self, text: str) -> str:
        """Server yo'llarini xato matnidan olib tashlaydi."""
        cleaned = text.replace(self.workdir + os.sep, "").replace(self.workdir, "")
        return cleaned.replace(self.src, self.spec["filename"]).strip()

    # ----------------------------------------------------------- ishga tushish
    def run(self, stdin: str, *, time_limit_ms: int, memory_limit_kb: int) -> dict:
        if self.setup_error:
            return {"status": "SYSTEM_ERROR", "message": self.setup_error}
        if self.compile_error:
            return {"status": "COMPILE_ERROR", "compile_output": self.compile_error}

        time_limit_ms = max(MIN_TIME_LIMIT_MS, int(time_limit_ms))
        memory_limit_kb = max(MIN_MEMORY_KB, int(memory_limit_kb))
        wall_timeout = time_limit_ms / 1000 + 2.0
        cpu_seconds = max(1, int(time_limit_ms / 1000) + 1)

        try:
            proc = subprocess.Popen(
                _wrap(self._resolve(self.spec["run"]), isolate_network=self.isolate_network),
                cwd=self.workdir,
                env=_child_env(),
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=_limits(memory_limit_kb, cpu_seconds),
            )
        except OSError as exc:
            return {"status": "SYSTEM_ERROR", "message": str(exc)}

        out_chunks: list[bytes] = []
        err_chunks: list[bytes] = []
        overflow = threading.Event()
        threads = [
            threading.Thread(target=_reader, args=(proc.stdout, out_chunks, MAX_OUTPUT_BYTES, overflow)),
            threading.Thread(target=_reader, args=(proc.stderr, err_chunks, MAX_OUTPUT_BYTES, overflow)),
        ]
        for thread in threads:
            thread.daemon = True
            thread.start()

        started = time.perf_counter()
        try:
            proc.stdin.write((stdin or "").encode("utf-8"))
        except (BrokenPipeError, OSError):
            pass
        finally:
            try:
                proc.stdin.close()
            except OSError:
                pass

        timed_out = False
        peak_kb = None
        try:
            # `os.wait4` — chiqish kodi BILAN BIRGA resurs sarfini beradi,
            # shuning uchun xotira "stderr da memory so'zi bormi" degan
            # taxmin emas, o'lchangan qiymat bo'ladi.
            deadline = started + wall_timeout
            while True:
                if os.name == "posix":
                    pid, status, usage = os.wait4(proc.pid, os.WNOHANG)
                    if pid:
                        proc.returncode = os.waitstatus_to_exitcode(status)
                        peak_kb = int(usage.ru_maxrss)
                        break
                elif proc.poll() is not None:
                    break

                if overflow.is_set():
                    break
                if time.perf_counter() > deadline:
                    timed_out = True
                    break
                time.sleep(0.005)
        except (ChildProcessError, OSError):
            pass

        runtime_ms = int((time.perf_counter() - started) * 1000)

        if timed_out or overflow.is_set():
            self._kill(proc)

        for thread in threads:
            thread.join(timeout=1.0)

        stdout = _decode(out_chunks)
        stderr = self._scrub(_decode(err_chunks))

        if timed_out:
            return {
                "status": "TIME_LIMIT_EXCEEDED",
                "runtime_ms": time_limit_ms,
                "memory_kb": peak_kb,
                "stdout": stdout,
                "message": f"Vaqt limiti ({time_limit_ms} ms) oshib ketdi.",
            }

        if overflow.is_set():
            return {
                "status": "RUNTIME_ERROR",
                "runtime_ms": runtime_ms,
                "memory_kb": peak_kb,
                "stdout": stdout,
                "stderr": stderr,
                "message": "Dastur juda ko'p ma'lumot chiqardi.",
            }

        code = proc.returncode if proc.returncode is not None else -1
        if runtime_ms > time_limit_ms and code != 0:
            return {
                "status": "TIME_LIMIT_EXCEEDED",
                "runtime_ms": runtime_ms,
                "memory_kb": peak_kb,
                "stdout": stdout,
            }

        if code != 0:
            status = "RUNTIME_ERROR"
            # Xotira chegarasiga yaqin to'xtagan jarayon — bu OOM. Bu yerda
            # taxmin emas, O'LCHANGAN qiymat ishlatiladi: ilgari verdikt
            # stderr matnida "memory" so'zi bor-yo'qligiga qarab qo'yilardi
            # va uni yechim o'zi yozib chiqarishi mumkin edi.
            if peak_kb and peak_kb >= memory_limit_kb * 0.95:
                status = "MEMORY_LIMIT_EXCEEDED"
            elif code in _CPU_SIGNALS:
                status = "TIME_LIMIT_EXCEEDED"
            return {
                "status": status,
                "runtime_ms": runtime_ms,
                "memory_kb": peak_kb,
                "stdout": stdout,
                "stderr": stderr,
                "message": f"Jarayon {code} kodi bilan tugadi.",
            }

        return {
            "status": "OK",
            "runtime_ms": runtime_ms,
            "memory_kb": peak_kb,
            "stdout": stdout,
            "stderr": stderr,
        }

    @staticmethod
    def _kill(proc: subprocess.Popen) -> None:
        """Butun jarayonlar guruhini o'ldiradi — nabiralar ham qolmaydi."""
        try:
            if os.name == "posix":
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            else:
                proc.kill()
        except (ProcessLookupError, PermissionError, OSError):
            try:
                proc.kill()
            except OSError:
                pass
        try:
            proc.wait(timeout=2)
        except (subprocess.TimeoutExpired, OSError):
            pass


def execute_batch(
    *,
    language: str,
    code: str,
    cases: list[dict],
    time_limit_ms: int,
    memory_limit_kb: int,
    isolate_network: bool = True,
) -> list[dict]:
    """Bitta kodni bir nechta kirish ustida ketma-ket bajaradi.

    Natijalar soni HAR DOIM `cases` soniga teng: chaqiruvchi tomon uni
    testlar bilan juftlab ishlatadi.
    """
    if language not in LANGUAGES:
        return [{"status": "SYSTEM_ERROR", "message": f"Noma'lum til: {language}"} for _ in cases]

    results: list[dict] = []
    with Execution(language, code, isolate_network=isolate_network) as run:
        for case in cases:
            results.append(
                run.run(
                    case.get("input") or "",
                    time_limit_ms=case.get("time_limit_ms") or time_limit_ms,
                    memory_limit_kb=case.get("memory_limit_kb") or memory_limit_kb,
                )
            )
    return results
