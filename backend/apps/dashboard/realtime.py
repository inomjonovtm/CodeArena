"""Server-Sent Events — jonli yangilanishlar (judge navbati, moderatsiya)."""
from __future__ import annotations

import json
import time

from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.renderers import JSONRenderer

from apps.core.permissions import require
from apps.core.renderers import EventStreamRenderer

# Bitta ulanish qancha yashaydi (keyin brauzer avtomatik qayta ulanadi)
STREAM_SECONDS = 55
TICK_SECONDS = 3


def _snapshot() -> dict:
    from apps.content.models import ContentReport
    from apps.judge.models import Submission, SubmissionStatus
    from apps.moderation.models import PlagiarismPair, PlagiarismStatus

    submissions = Submission.objects.all()
    return {
        "queue": {
            "pending": submissions.filter(status=SubmissionStatus.PENDING).count(),
            "judging": submissions.filter(status=SubmissionStatus.JUDGING).count(),
        },
        "submissions_today": submissions.filter(created_at__date=timezone.localdate()).count(),
        "plagiarism_pending": PlagiarismPair.objects.filter(
            status=PlagiarismStatus.PENDING
        ).count(),
        "reports_open": ContentReport.objects.filter(is_resolved=False).count(),
        "at": timezone.now().isoformat(),
    }


@api_view(["GET"])
@permission_classes([require("dashboard.view")])
# `EventSource` `Accept: text/event-stream` yuboradi — mos renderer bo'lmasa
# DRF 406 qaytaradi va oqim ochilmaydi
@renderer_classes([JSONRenderer, EventStreamRenderer])
def stream(request):
    """
    `GET /api/admin/stream/` — `text/event-stream`.

    Faqat o'zgargan paytda `data:` yuboradi, aks holda kommentariy bilan
    ulanishni tirik ushlab turadi. Produksiyada ASGI (uvicorn/daphne) tavsiya etiladi.
    """

    def events():
        started = time.monotonic()
        previous: dict | None = None
        yield "retry: 3000\n\n"

        while time.monotonic() - started < STREAM_SECONDS:
            try:
                current = _snapshot()
            except Exception:  # noqa: BLE001 — oqim uzilib qolmasin
                break

            if current != previous:
                payload = json.dumps(current, ensure_ascii=False)
                yield f"event: metrics\ndata: {payload}\n\n"
                previous = current
            else:
                yield ": ping\n\n"

            time.sleep(TICK_SECONDS)

        yield "event: reconnect\ndata: {}\n\n"

    response = StreamingHttpResponse(events(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache, no-transform"
    response["X-Accel-Buffering"] = "no"  # nginx buferlamasin
    # `Connection` — hop-by-hop sarlavha, uni WSGI ilovasi yubora olmaydi
    # (dev serverda javob 500 bilan uzilardi). Ulanishni server o'zi boshqaradi.
    return response
