"""Judge0 (self-hosted) bilan ishlash klienti — 3-bo'lim.

Barcha parametrlar admin paneldagi «Judge» sozlamalari guruhidan olinadi
(`apps.core.site_settings`). `.env` faqat boshlang'ich qiymat beradi: server
qayta ishga tushirilmasdan manzil, token, limit va taymautlarni o'zgartirish
mumkin bo'lishi kerak.
"""
from __future__ import annotations

import base64
import logging

import requests

from apps.core import site_settings

from .results import ExecutionResult

logger = logging.getLogger(__name__)

# Standart Judge0 image'idagi til ID'lari — panelda «Judge tillari» bo'limi
# to'ldirilmagan bo'lsa shular ishlatiladi.
FALLBACK_LANGUAGE_IDS = {
    "python": 71,      # Python 3.8.1
    "javascript": 63,  # Node.js 12.14.0
    "cpp": 54,         # C++ (GCC 9.2.0)
}

# Judge0 status id → CodeArena status (8-bo'lim)
JUDGE0_STATUS_MAP = {
    1: "JUDGING",              # In Queue
    2: "JUDGING",              # Processing
    3: "ACCEPTED",             # Accepted
    4: "WRONG_ANSWER",         # Wrong Answer
    5: "TIME_LIMIT_EXCEEDED",  # Time Limit Exceeded
    6: "COMPILE_ERROR",        # Compilation Error
    7: "RUNTIME_ERROR",        # SIGSEGV
    8: "RUNTIME_ERROR",        # SIGXFSZ
    9: "RUNTIME_ERROR",        # SIGFPE
    10: "RUNTIME_ERROR",       # SIGABRT
    11: "RUNTIME_ERROR",       # NZEC
    12: "RUNTIME_ERROR",       # Other
    13: "SYSTEM_ERROR",        # Internal Error
    14: "SYSTEM_ERROR",        # Exec Format Error
}


# Judge0 ham lokal runner ham bir xil natija shaklini qaytaradi
Judge0Result = ExecutionResult


def language_ids() -> dict[str, int]:
    """Paneldagi «Judge tillari» jadvali; bo'sh bo'lsa — standart ro'yxat."""
    try:
        from apps.moderation.models import JudgeLanguage

        rows = dict(
            JudgeLanguage.objects.filter(is_active=True).values_list("key", "judge0_id")
        )
    except Exception:  # noqa: BLE001 — migratsiyagacha jadval bo'lmasligi mumkin
        rows = {}
    return rows or dict(FALLBACK_LANGUAGE_IDS)


def _b64(value: str | None) -> str:
    return base64.b64encode((value or "").encode("utf-8")).decode("ascii")


def _unb64(value: str | None) -> str:
    if not value:
        return ""
    try:
        return base64.b64decode(value).decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return str(value)


class Judge0Client:
    def __init__(self, base_url: str | None = None, token: str | None = None,
                 timeout: int | None = None):
        self.base_url = (base_url or site_settings.get_str("judge0_url")).rstrip("/")
        self.token = token if token is not None else site_settings.get_str("judge0_token")
        self.timeout = timeout or site_settings.get_int("judge0_timeout_sec", 30)

    # ------------------------------------------------------------- sozlama
    @property
    def batch_size(self) -> int:
        return max(1, site_settings.get_int("judge0_batch_size", 20))

    @property
    def poll_delay(self) -> float:
        return max(0.05, site_settings.get_int("judge0_poll_interval_ms", 400) / 1000)

    @property
    def poll_attempts(self) -> int:
        return max(1, site_settings.get_int("judge0_max_poll_attempts", 60))

    @property
    def headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["X-Auth-Token"] = self.token
        return headers

    # --------------------------------------------------------------- API
    def is_available(self) -> bool:
        if not self.base_url or not site_settings.get_bool("judge0_enabled", True):
            return False
        try:
            response = requests.get(f"{self.base_url}/about", headers=self.headers, timeout=5)
            return response.ok
        except requests.RequestException:
            return False

    def about(self) -> dict:
        """`/about` javobi — panelda ulanishni sinash uchun."""
        response = requests.get(f"{self.base_url}/about", headers=self.headers, timeout=8)
        response.raise_for_status()
        return response.json()

    def languages(self) -> list[dict]:
        response = requests.get(f"{self.base_url}/languages", headers=self.headers, timeout=10)
        response.raise_for_status()
        return response.json()

    def submit_batch(self, submissions: list[dict]) -> list[str]:
        """Test-case'larni yuboradi, tokenlar ro'yxatini qaytaradi.

        Ro'yxat sozlamadagi `judge0_batch_size` bo'yicha bo'laklarga bo'linadi:
        yuzlab testli masalada bitta ulkan so'rov Judge0 ni bo'g'ib qo'yardi.
        """
        tokens: list[str] = []
        size = self.batch_size
        for start in range(0, len(submissions), size):
            chunk = submissions[start : start + size]
            response = requests.post(
                f"{self.base_url}/submissions/batch?base64_encoded=true",
                json={"submissions": chunk},
                headers=self.headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            tokens.extend(row.get("token", "") for row in response.json())
        return tokens

    def get_batch(self, tokens: list[str]) -> list[dict]:
        fields = "status_id,stdout,stderr,compile_output,message,time,memory,token"
        rows: list[dict] = []
        size = self.batch_size
        for start in range(0, len(tokens), size):
            chunk = tokens[start : start + size]
            response = requests.get(
                f"{self.base_url}/submissions/batch",
                params={"tokens": ",".join(chunk), "base64_encoded": "true", "fields": fields},
                headers=self.headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            rows.extend(response.json().get("submissions", []))
        return rows

    @staticmethod
    def build_payload(*, language: str, code: str, stdin: str, expected_output: str,
                      time_limit_ms: int, memory_limit_kb: int) -> dict:
        ids = language_ids()
        payload = {
            "language_id": ids.get(language) or next(iter(ids.values())),
            "source_code": _b64(code),
            "stdin": _b64(stdin),
            "expected_output": _b64(expected_output),
            "cpu_time_limit": round(time_limit_ms / 1000, 3),
            "cpu_extra_time": site_settings.get_float("judge0_cpu_extra_time_sec", 1.0),
            "memory_limit": memory_limit_kb,
            "wall_time_limit": round(
                time_limit_ms / 1000 + site_settings.get_float("judge0_wall_time_extra_sec", 3.0), 3
            ),
            "enable_network": site_settings.get_bool("judge0_enable_network", False),
            "redirect_stderr_to_stdout": site_settings.get_bool("judge0_redirect_stderr", False),
        }

        # 0 qiymat «Judge0 standartini ishlat» degani — bunday maydonlar
        # umuman yuborilmaydi, aks holda konteyner cheklovi buzilardi.
        stack = site_settings.get_int("judge0_stack_limit_kb", 0)
        if stack > 0:
            payload["stack_limit"] = stack
        processes = site_settings.get_int("judge0_max_processes", 0)
        if processes > 0:
            payload["max_processes_and_or_threads"] = processes
        file_size = site_settings.get_int("judge0_max_file_size_kb", 0)
        if file_size > 0:
            payload["max_file_size"] = file_size

        return payload

    @staticmethod
    def parse(row: dict) -> ExecutionResult:
        status_id = (row.get("status") or {}).get("id") or row.get("status_id") or 13
        stderr = _unb64(row.get("stderr"))
        message = _unb64(row.get("message"))
        status = JUDGE0_STATUS_MAP.get(int(status_id), "SYSTEM_ERROR")

        # Judge0 xotira limitini alohida status sifatida qaytarmaydi
        if status == "RUNTIME_ERROR" and "memory" in (message + stderr).lower():
            status = "MEMORY_LIMIT_EXCEEDED"

        time_value = row.get("time")
        return ExecutionResult(
            status=status,
            runtime_ms=int(float(time_value) * 1000) if time_value else None,
            memory_kb=int(row["memory"]) if row.get("memory") else None,
            stdout=_unb64(row.get("stdout")),
            stderr=stderr,
            compile_output=_unb64(row.get("compile_output")),
            message=message,
        )
