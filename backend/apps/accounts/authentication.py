"""JWT'ni HttpOnly cookie'dan o'qiydigan autentifikatsiya klassi."""
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .sessions import SESSION_CLAIM, is_revoked, touch


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            result = super().authenticate(request)
        else:
            raw_token = request.COOKIES.get(settings.AUTH_COOKIE_ACCESS)
            if not raw_token:
                return None
            validated_token = self.get_validated_token(raw_token)
            result = (self.get_user(validated_token), validated_token)

        if result is None:
            return None

        _, token = result
        enforce_session(token)
        return result


def enforce_session(token) -> None:
    """Token bog'langan sessiya yopilgan bo'lsa — kirishni rad etadi.

    `sid` da'vosi yo'q tokenlar bu o'zgarishdan oldin berilgan: ular muddati
    tugaguncha ishlaydi, lekin birinchi `refresh` da sessiyaga bog'lanadi
    (`RefreshView` ga qarang).
    """
    sid = token.get(SESSION_CLAIM) if token is not None else None
    if not sid:
        return
    if is_revoked(str(sid)):
        raise AuthenticationFailed(
            {"detail": "Bu qurilmadagi sessiya yopilgan. Qaytadan kiring.",
             "code": "session_revoked"},
            code="session_revoked",
        )
    touch(str(sid))


def set_auth_cookies(response, access: str, refresh: str | None = None):
    common = {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "domain": settings.AUTH_COOKIE_DOMAIN,
        "path": "/",
    }
    response.set_cookie(
        settings.AUTH_COOKIE_ACCESS,
        access,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        **common,
    )
    if refresh:
        response.set_cookie(
            settings.AUTH_COOKIE_REFRESH,
            refresh,
            max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
            **common,
        )
    return response


def clear_auth_cookies(response):
    for name in (settings.AUTH_COOKIE_ACCESS, settings.AUTH_COOKIE_REFRESH):
        response.delete_cookie(name, path="/", domain=settings.AUTH_COOKIE_DOMAIN)
    return response
