"""Aktiv sessiyalar — tokenni qurilmaga bog'lash va bekor qilishni kuchga kiritish.

Kirish paytida `AdminSession` yozuvi yaratiladi va uning `id` si berilgan
tokenlarga **`sid` da'vosi** sifatida yoziladi (`RefreshToken` ga qo'yilgan
maxsus da'volar `access_token` ga ham ko'chiriladi). Har bir so'rovda
autentifikatsiya shu `sid` ni tekshiradi.

Shu bog'lanishsiz "Sessiyani yopish" tugmasi faqat ko'rinishda ishlagan bo'lardi:
yozuvga `revoked_at` qo'yilardi, lekin o'sha qurilmadagi JWT amal qilishda davom
etardi va refresh orqali cheksiz yangilanardi.

Kesh haqida: har so'rovda bazaga bormaslik uchun natija keshlanadi. Bekor qilish
uzoq muddatga keshlanadi (holat ortga qaytmaydi), "aktiv" javobi esa atigi
`ACTIVE_TTL` soniyaga — LocMemCache'da (Redis yo'q bo'lganda) kesh har bir
jarayonda alohida bo'lgani uchun bekor qilish eng ko'pi bilan shuncha soniya
kechikib kuchga kiradi. Redis ulangan bo'lsa — bir zumda.
"""
from __future__ import annotations

import re

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import AdminSession

# Tokendagi da'vo nomi — sessiya identifikatori
SESSION_CLAIM = "sid"

REVOKED_TTL = 60 * 60 * 24 * 30  # bekor qilingani — uzoq eslab qolinadi
ACTIVE_TTL = 30  # aktiv ekani — qisqa muddat
TOUCH_EVERY = 120  # `last_seen_at` ni shuncha soniyada bir marta yangilash


def _revoked_key(sid: str) -> str:
    return f"auth:sid:revoked:{sid}"


def _touch_key(sid: str) -> str:
    return f"auth:sid:seen:{sid}"


# ------------------------------------------------------------------ yaratish
def parse_user_agent(ua: str) -> tuple[str, str]:
    """Oddiy User-Agent tahlili — brauzer va qurilma."""
    ua = ua or ""
    browser = "Noma'lum"
    for name, pattern in [
        ("Edge", r"Edg/"), ("Chrome", r"Chrome/"), ("Firefox", r"Firefox/"),
        ("Safari", r"Safari/"), ("Opera", r"OPR/"),
    ]:
        if re.search(pattern, ua):
            browser = name
            break
    device = "Kompyuter"
    if re.search(r"Android", ua):
        device = "Android"
    elif re.search(r"iPhone|iPad|iOS", ua):
        device = "iOS"
    elif re.search(r"Mobile", ua):
        device = "Mobil"
    elif re.search(r"Windows", ua):
        device = "Windows"
    elif re.search(r"Mac OS", ua):
        device = "macOS"
    elif re.search(r"Linux", ua):
        device = "Linux"
    return browser, device


def record_session(request, user, jti: str = "") -> AdminSession:
    """Kirish paytida sessiyani yozib qo'yadi (bir xil qurilma qayta ishlatiladi)."""
    ua = request.META.get("HTTP_USER_AGENT", "")[:255]
    browser, device = parse_user_agent(ua)
    ip = getattr(request, "client_ip", "") or None

    session = AdminSession.objects.filter(
        user=user, ip_address=ip, user_agent=ua, revoked_at__isnull=True
    ).first()
    if session:
        if jti and session.jti != jti:
            session.jti = jti
        session.save(update_fields=["jti", "last_seen_at"])
        return session

    return AdminSession.objects.create(
        user=user, jti=jti, ip_address=ip, user_agent=ua, browser=browser, device=device
    )


# ------------------------------------------------------------------ tekshirish
def is_revoked(sid: str) -> bool:
    """Sessiya bekor qilinganmi? Yo'q bo'lib ketgan yozuv ham bekor hisoblanadi."""
    if not sid:
        return False

    key = _revoked_key(sid)
    cached = cache.get(key)
    if cached is not None:
        return bool(cached)

    try:
        row = AdminSession.objects.filter(pk=sid).values("revoked_at").first()
    except (ValidationError, ValueError, TypeError):
        # `sid` UUID emas — soxta yoki buzilgan token
        return True

    revoked = row is None or row["revoked_at"] is not None
    cache.set(key, revoked, REVOKED_TTL if revoked else ACTIVE_TTL)
    return revoked


def touch(sid: str) -> None:
    """Faollik vaqtini yangilaydi — har so'rovda emas, `TOUCH_EVERY` da bir marta.

    `update()` `auto_now` ni ishga tushirmaydi, shuning uchun vaqt aniq beriladi.
    """
    if not sid:
        return
    key = _touch_key(sid)
    if cache.get(key):
        return
    cache.set(key, 1, TOUCH_EVERY)
    try:
        AdminSession.objects.filter(pk=sid, revoked_at__isnull=True).update(
            last_seen_at=timezone.now()
        )
    except (ValidationError, ValueError, TypeError):
        pass


# ---------------------------------------------------------------- bekor qilish
def forget(sid: str) -> None:
    """Keshdagi 'aktiv' javobini darhol bekor qilingan holatga o'tkazadi."""
    if sid:
        cache.set(_revoked_key(str(sid)), True, REVOKED_TTL)


def revoke(session: AdminSession) -> bool:
    """Bitta sessiyani yopadi. Allaqachon yopilgan bo'lsa `False` qaytaradi."""
    forget(str(session.pk))
    if session.revoked_at is not None:
        return False
    session.revoked_at = timezone.now()
    session.save(update_fields=["revoked_at"])
    return True


def revoke_queryset(queryset) -> int:
    """Bir nechta sessiyani yopadi va har birini keshdan chiqaradi."""
    ids = list(queryset.filter(revoked_at__isnull=True).values_list("id", flat=True))
    if not ids:
        return 0
    AdminSession.objects.filter(id__in=ids).update(revoked_at=timezone.now())
    for sid in ids:
        forget(str(sid))
    return len(ids)


def current_sid(request) -> str:
    """Joriy so'rov tokenidagi sessiya identifikatori (bo'lmasa — bo'sh satr)."""
    token = getattr(request, "auth", None)
    if token is None:
        return ""
    try:
        return str(token.get(SESSION_CLAIM) or "")
    except (AttributeError, TypeError):
        return ""
