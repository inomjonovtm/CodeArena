"""Judge backend'lari uchun umumiy natija shakli.

Judge0 ham, lokal runner ham shu dataclass'ni qaytaradi — shuning uchun
`tasks.py` va `views.py` qaysi backend ishlaganini bilishi shart emas.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ExecutionResult:
    """Bitta test-case bo'yicha bajarilish natijasi."""

    status: str
    runtime_ms: int | None = None
    memory_kb: int | None = None
    stdout: str = ""
    stderr: str = ""
    compile_output: str = ""
    message: str = ""
    meta: dict = field(default_factory=dict)


def normalize_output(text: str | None) -> str:
    """Chiqishni solishtirishdan oldin normallashtiradi.

    Qator oxiridagi bo'shliqlar va fayl oxiridagi bo'sh qatorlar e'tiborga
    olinmaydi — aks holda `print()` dan keyingi `\\n` tufayli to'g'ri yechim
    ham "Wrong Answer" bo'lib qolardi.
    """
    if not text:
        return ""
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(line.rstrip() for line in lines).rstrip("\n")
