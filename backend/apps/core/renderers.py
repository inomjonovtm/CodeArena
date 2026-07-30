"""DRF renderer'lari."""
from __future__ import annotations

import json

from rest_framework.renderers import BaseRenderer


class EventStreamRenderer(BaseRenderer):
    """`text/event-stream` — Server-Sent Events endpointlari uchun.

    Brauzerning `EventSource` obyekti so'rovni `Accept: text/event-stream`
    bilan yuboradi. DRF kontent muzokarasi bu turni qo'llab-quvvatlaydigan
    renderer topmasa **406 Not Acceptable** qaytaradi va oqim umuman
    ochilmaydi — shuning uchun bu klass kerak.

    Oqimning o'zi `StreamingHttpResponse` orqali ketadi va bu yerdan
    o'tmaydi. `render()` faqat xato javoblari uchun ishlaydi (masalan
    "musobaqa topilmadi"), shuning uchun ularni o'qilarli JSON'ga aylantiradi.
    """

    media_type = "text/event-stream"
    format = "event-stream"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b""
        if isinstance(data, (bytes, str)):
            return data
        return json.dumps(data, ensure_ascii=False, default=str)
