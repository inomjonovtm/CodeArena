"""CodeArena runner — kod bajarish xizmati.

Nega alohida xizmat: ishonchsiz kod Django jarayonining yonida emas, o'z
konteynerida bajarilishi kerak. Bu konteynerda baza paroli ham, sayt kodi
ham, maxfiy kalit ham yo'q — undan o'g'irlaydigan narsaning o'zi yo'q.

API (faqat ichki tarmoqda ochiladi):

    GET  /health      → {"ok": true, "languages": {...}}
    POST /run         → {"results": [...]}

`/run` tanasi:
    {"language": "python", "code": "...", "cases": [{"input": "..."}],
     "time_limit_ms": 2000, "memory_limit_kb": 262144}

Xizmat oddiy `ThreadingHTTPServer` da ishlaydi: qo'shimcha kutubxona kerak
emas, ya'ni image kichik va yangilanish maydoni tor bo'ladi.
"""
from __future__ import annotations

import hmac
import json
import logging
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import executor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("runner")

MAX_BODY_BYTES = 4 * 1024 * 1024
MAX_CASES = 400
TOKEN = os.environ.get("RUNNER_TOKEN", "")
ISOLATE_NETWORK = os.environ.get("RUNNER_ISOLATE_NETWORK", "1") not in ("0", "false", "no")

# Bir vaqtda bajariladigan so'rovlar soni. Konteynerdagi protsessor sonidan
# oshib ketsa hamma so'rov sekinlashadi va vaqt limitlari yolg'on ishlaydi.
CONCURRENCY = int(os.environ.get("RUNNER_CONCURRENCY", "4") or 4)
_slots = threading.BoundedSemaphore(CONCURRENCY)


class Handler(BaseHTTPRequestHandler):
    server_version = "codearena-runner"
    protocol_version = "HTTP/1.1"

    # Har bir so'rovni stderr ga yozish shovqinli — faqat xatolar qoladi.
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        pass

    # ------------------------------------------------------------- yordamchi
    def _send(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _drain_body(self) -> None:
        """So'rov tanasini o'qib tashlaydi.

        Keep-alive ulanishda erta javob qaytarilsa-yu, tana o'qilmasa,
        qolgan baytlar KEYINGI so'rov sifatida talqin qilinib, tushunarsiz
        400 lar paydo bo'lardi.
        """
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        remaining = min(length, MAX_BODY_BYTES)
        while remaining > 0:
            chunk = self.rfile.read(min(remaining, 65536))
            if not chunk:
                break
            remaining -= len(chunk)

    def _authorized(self) -> bool:
        if not TOKEN:
            return True
        # Doimiy vaqtli solishtirish — oddiy `==` token uzunligi/mazmunini
        # vaqt farqidan bilib olishga yo'l qo'yardi.
        return hmac.compare_digest(self.headers.get("X-Runner-Token", ""), TOKEN)

    # ----------------------------------------------------------------- routes
    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/") in ("/health", ""):
            self._send(200, {"ok": True, "languages": executor.available_languages()})
            return
        self._send(404, {"detail": "Topilmadi."})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/run":
            self._drain_body()
            self._send(404, {"detail": "Topilmadi."})
            return
        if not self._authorized():
            self._drain_body()
            self._send(401, {"detail": "Token noto'g'ri."})
            return

        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            self._send(400, {"detail": "Content-Length noto'g'ri."})
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self._drain_body()
            self._send(413, {"detail": "So'rov hajmi chegaradan oshdi."})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self._send(400, {"detail": "JSON o'qib bo'lmadi."})
            return

        language = str(payload.get("language") or "")
        code = payload.get("code") or ""
        cases = payload.get("cases") or []

        if language not in executor.LANGUAGES:
            self._send(400, {"detail": f"Noma'lum til: {language}"})
            return
        if not isinstance(cases, list) or not cases:
            self._send(400, {"detail": "`cases` bo'sh bo'lmasligi kerak."})
            return
        if len(cases) > MAX_CASES:
            self._send(413, {"detail": f"Testlar soni {MAX_CASES} dan oshmasin."})
            return
        if not all(isinstance(case, dict) for case in cases):
            # Tekshirilmasa noto'g'ri element butun batchni 500 ga yiqitardi.
            self._send(400, {"detail": "`cases` elementlari obyekt bo'lishi kerak."})
            return

        with _slots:
            try:
                results = executor.execute_batch(
                    language=language,
                    code=code,
                    cases=cases,
                    time_limit_ms=int(payload.get("time_limit_ms") or 2000),
                    memory_limit_kb=int(payload.get("memory_limit_kb") or 262144),
                    isolate_network=ISOLATE_NETWORK,
                )
            except Exception as exc:  # noqa: BLE001 — xizmat yiqilmasligi kerak
                logger.exception("Bajarishda kutilmagan xato: %s", exc)
                self._send(500, {"detail": "Bajarishda ichki xato."})
                return

        self._send(200, {"results": results})


def main() -> None:
    host = os.environ.get("RUNNER_HOST", "0.0.0.0")  # noqa: S104 — ichki tarmoq
    port = int(os.environ.get("RUNNER_PORT", "2400"))

    if not TOKEN:
        logger.warning(
            "RUNNER_TOKEN o'rnatilmagan — autentifikatsiya O'CHIQ. Bu faqat "
            "yopiq (internal) tarmoqda xavfsiz; prodda token qo'ying."
        )

    languages = executor.available_languages()
    logger.info(
        "Runner tayyor: %s:%s | tillar: %s | tarmoq izolyatsiyasi: %s",
        host, port,
        ", ".join(sorted(k for k, ok in languages.items() if ok)) or "yo'q",
        "yoqilgan" if ISOLATE_NETWORK and executor._userns_works() else "konteyner darajasida",
    )

    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == "__main__":
    main()
