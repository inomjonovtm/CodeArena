"""Musobaqa jonli natijalari — Server-Sent Events.

`GET /api/contests/<slug>/stream/` → `text/event-stream`.

Nima uchun SSE, WebSocket emas: oqim bir tomonlama (server → brauzer), oddiy
HTTP ustida ishlaydi, nginx va Next proksisidan qo'shimcha sozlashsiz o'tadi va
brauzer uzilganda `EventSource` o'zi qayta ulanadi. Musobaqa jadvali uchun shu
yetarli.

Ulanish `STREAM_SECONDS` dan keyin ataylab yopiladi — brauzer darhol qayta
ulanadi. Bu "osilib qolgan" ulanishlarni yig'ilib ketishidan saqlaydi va
proksilarning o'z timeout'iga urilmaslikni ta'minlaydi.

Produksiyada ASGI (uvicorn/daphne) tavsiya etiladi: sinxron gunicorn'da har bir
ochiq oqim bitta ishchi jarayonni band qilib turadi.
"""
from __future__ import annotations

import json
import time

from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from apps.core.renderers import EventStreamRenderer

from .models import Contest, ContestStatus
from .serializers import ContestParticipantSerializer
from .standings import refresh_if_stale

# Bitta ulanish qancha yashaydi
STREAM_SECONDS = 55
# Ikki tekshiruv orasidagi pauza
TICK_SECONDS = 3
# Oqimda nechta o'rin yuboriladi (to'liq ro'yxat oddiy endpointda qoladi)
TOP_LIMIT = 50


def _snapshot(contest: Contest, user) -> dict:
    """Jadvalning joriy holati. `server_time` alohida qo'shiladi — u har safar
    o'zgaradi va o'zgarishni aniqlashga xalaqit berardi."""
    rows = (
        contest.participants.filter(is_disqualified=False)
        .select_related("user")
        .order_by("rank", "-score", "penalty")[:TOP_LIMIT]
    )
    payload = {
        "state": contest.computed_status,
        "results": ContestParticipantSerializer(rows, many=True).data,
        "me": None,
        "participant_count": contest.participants.filter(is_disqualified=False).count(),
    }

    if user is not None:
        mine = contest.participants.filter(user=user).select_related("user").first()
        if mine is not None:
            payload["me"] = ContestParticipantSerializer(mine).data

    return payload


def _frame(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"


@api_view(["GET"])
@permission_classes([AllowAny])
# `EventSource` `Accept: text/event-stream` yuboradi — mos renderer bo'lmasa
# DRF 406 qaytaradi. `JSONRenderer` birinchi turadi, shunda oddiy so'rovlar
# (va xato javoblari) JSON oladi.
@renderer_classes([JSONRenderer, EventStreamRenderer])
def contest_stream(request, slug: str):
    contest = (
        Contest.objects.exclude(status__in=[ContestStatus.DRAFT, ContestStatus.CANCELLED])
        .filter(slug=slug)
        .first()
    )
    if contest is None:
        return Response({"detail": "Musobaqa topilmadi."}, status=404)

    # Generator javob qaytarilgandan **keyin** ishlaydi, shuning uchun so'rovga
    # bog'liq narsalar (foydalanuvchi) shu yerda olib qo'yiladi.
    user = request.user if request.user.is_authenticated else None
    contest_id = contest.pk

    def events():
        started = time.monotonic()
        previous: str | None = None
        yield "retry: 3000\n\n"

        while time.monotonic() - started < STREAM_SECONDS:
            try:
                current = Contest.objects.filter(pk=contest_id).first()
                if current is None:
                    break

                state = current.computed_status
                if state == ContestStatus.RUNNING:
                    refresh_if_stale(current)

                snapshot = _snapshot(current, user)
            except Exception:  # noqa: BLE001 — oqim xato tufayli uzilib qolmasin
                break

            serialized = json.dumps(snapshot, ensure_ascii=False, default=str, sort_keys=True)
            if serialized != previous:
                yield _frame(
                    "standings",
                    {**snapshot, "server_time": timezone.now(), "end_time": current.end_time},
                )
                previous = serialized
            else:
                yield ": ping\n\n"

            # Musobaqa tugagan (yoki hali boshlanmagan) bo'lsa jonli oqim
            # keraksiz: bir marta holatni yuborib, ulanishni yopamiz. Brauzer
            # `closed` ni ko'rib qayta ulanmaydi.
            if state != ContestStatus.RUNNING:
                yield _frame("closed", {"state": state})
                return

            time.sleep(TICK_SECONDS)

        yield _frame("reconnect", {})

    response = StreamingHttpResponse(events(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache, no-transform"
    response["X-Accel-Buffering"] = "no"  # nginx buferlamasin
    # `Connection` ataylab qo'yilmaydi: u hop-by-hop sarlavha va uni ilova
    # emas, server boshqaradi. WSGI buni taqiqlaydi — `wsgiref` (dev server)
    # butun javobni 500 bilan uzib qo'yardi.
    return response
