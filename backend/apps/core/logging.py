"""Log formatlash: odam uchun matn yoki mashina uchun JSON.

Produksiyada loglar odatda yig'uvchiga (Loki, CloudWatch, Datadog) tushadi va
u yerda `[INFO] 2026-01-01 apps.judge: ...` ko'rinishidagi qator qidiruvga
yaroqsiz: darajani ham, so'rov identifikatorini ham ajratib bo'lmaydi.
`LOG_FORMAT=json` bo'lganda har bir yozuv bitta JSON obyekti bo'ladi.

Har bir yozuvga `request_id` qo'shiladi — bitta so'rov bo'yicha barcha
qatorlarni (shu jumladan celery taskdagi xatoni ham) bir joyga yig'ish uchun.
"""
from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from .middleware import current_request_id

# Log yozuvining standart maydonlari — JSON'ga `extra` sifatida kelganlarini
# ajratish uchun kerak.
_RESERVED = {
    "args", "asctime", "created", "exc_info", "exc_text", "filename", "funcName",
    "levelname", "levelno", "lineno", "module", "msecs", "message", "msg", "name",
    "pathname", "process", "processName", "relativeCreated", "stack_info",
    "thread", "threadName", "taskName",
}


class RequestIdFilter(logging.Filter):
    """Har bir yozuvga joriy so'rovning identifikatorini qo'shadi."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = current_request_id() or "-"
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)

        # `logger.info("...", extra={"submission_id": 5})` kabi qo'shimcha
        # maydonlar ham chiqsin — qidiruvda eng foydalisi shular.
        for key, value in record.__dict__.items():
            if key not in _RESERVED and key not in payload and not key.startswith("_"):
                try:
                    json.dumps(value)
                except (TypeError, ValueError):
                    value = repr(value)
                payload[key] = value

        return json.dumps(payload, ensure_ascii=False)
