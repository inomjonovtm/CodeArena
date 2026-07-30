"""So'rov konteksti — audit log uchun IP va User-Agent'ni saqlaydi."""
import threading

_local = threading.local()


def get_client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""


def current_request():
    return getattr(_local, "request", None)


class RequestContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.request = request
        request.client_ip = get_client_ip(request)
        try:
            return self.get_response(request)
        finally:
            _local.request = None
