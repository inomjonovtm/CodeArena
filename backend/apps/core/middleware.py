"""So'rov konteksti va xavfsizlik headerlari."""
from __future__ import annotations

import threading
import uuid

_local = threading.local()

# Proksi bergan so'rov identifikatori shu sarlavhalarda kelishi mumkin.
_REQUEST_ID_HEADERS = ("HTTP_X_REQUEST_ID", "HTTP_X_CORRELATION_ID")


def get_client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""


def current_request():
    return getattr(_local, "request", None)


def current_request_id() -> str | None:
    return getattr(_local, "request_id", None)


class RequestContextMiddleware:
    """Audit log uchun IP/User-Agent va loglar uchun `request_id`."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = ""
        for header in _REQUEST_ID_HEADERS:
            value = request.META.get(header, "").strip()
            if value:
                # Tashqaridan kelgan qiymat logga tushadi — uzunligini
                # cheklaymiz va faqat xavfsiz belgilarni qoldiramiz.
                request_id = "".join(c for c in value if c.isalnum() or c in "-_")[:64]
                break
        if not request_id:
            request_id = uuid.uuid4().hex[:16]

        _local.request = request
        _local.request_id = request_id
        request.request_id = request_id
        request.client_ip = get_client_ip(request)
        try:
            response = self.get_response(request)
        finally:
            _local.request = None
            _local.request_id = None
        # Foydalanuvchi xato haqida xabar berganda aynan qaysi so'rov
        # ekanini topish uchun javobda ham qaytariladi.
        response["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware:
    """Django'ning `SecurityMiddleware` qamramagan headerlar.

    `SecurityMiddleware` HSTS, nosniff, Referrer-Policy va X-Frame-Options ni
    qo'yadi, lekin CSP va Permissions-Policy uni qiziqtirmaydi. API javoblari
    JSON bo'lgani uchun ular uchun eng tor siyosat qo'yiladi: sahifa sifatida
    ochilsa ham hech narsa yuklanmaydi va ishga tushmaydi.

    Sayt sahifalarining CSP'si bu yerdan EMAS, Next.js tomonidan qo'yiladi
    (`frontend/next.config.mjs`) — u o'z skriptlari va Monaco muharriri
    haqida biladi.
    """

    API_CSP = (
        "default-src 'none'; "
        "frame-ancestors 'none'; "
        "base-uri 'none'; "
        "form-action 'none'"
    )
    # Swagger UI o'z stil va skriptlarini static'dan oladi, lekin inline
    # ishlatadi — hujjat sahifasiga alohida, yumshoqroq siyosat.
    DOCS_CSP = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "frame-ancestors 'none'; "
        "base-uri 'none'"
    )
    PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if "Content-Security-Policy" not in response:
            path = request.path
            if path.startswith("/api/docs") or path.startswith("/api/schema"):
                response["Content-Security-Policy"] = self.DOCS_CSP
            else:
                response["Content-Security-Policy"] = self.API_CSP

        response.setdefault("Permissions-Policy", self.PERMISSIONS_POLICY)
        # Boshqa sayt bu javobni <img>/<script> sifatida yuklab, o'lchami
        # orqali ma'lumot chiqarib olmasin.
        response.setdefault("Cross-Origin-Resource-Policy", "same-site")
        # DEBUG'da media fayllarni Django o'zi beradi — yuklangan fayl
        # brauzerda boshqa turdagi kontent sifatida talqin qilinmasin.
        response.setdefault("X-Content-Type-Options", "nosniff")

        return response
