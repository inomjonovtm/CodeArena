"""Rate limit sinflari.

DRF'ning `ScopedRateThrottle` si ko'rinishdagi `throttle_scope` atributiga
tayanadi. Funksiya-ko'rinishlarda (`@api_view`) bu atribut ishlamaydi:
`api_view` faqat belgilangan bir nechta atributni ko'chiradi va
`throttle_scope` ular orasida yo'q — ya'ni scope jimgina yo'qoladi va
cheklov umuman qo'llanmaydi. Shuning uchun bu yerdagi sinflarda scope
sinfning o'zida qat'iy belgilangan.

Ikkinchi masala — **nishon bo'yicha** cheklash. IP bo'yicha cheklov parolni
tiklash uchun yetarli emas: hujumchi bitta manzilga xat yog'dirmoqchi bo'lsa
IP'ni almashtiraveradi va qurbonning pochtasi ko'milib qoladi.
`TargetThrottle` so'rov tanasidagi email bo'yicha cheklaydi va IP cheklovi
bilan BIRGA ishlatiladi.
"""
from __future__ import annotations

import hashlib

from rest_framework.throttling import SimpleRateThrottle


class IpThrottle(SimpleRateThrottle):
    """IP bo'yicha, scope sinfda qat'iy belgilangan holda."""

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class UserThrottle(SimpleRateThrottle):
    """Hisob bo'yicha (kirgan foydalanuvchi uchun), aks holda IP bo'yicha."""

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = str(request.user.pk)
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class TargetThrottle(SimpleRateThrottle):
    """So'rov tanasidagi maydon (odatda email) bo'yicha cheklaydi."""

    field = "email"

    def get_cache_key(self, request, view):
        raw = request.data.get(self.field) if hasattr(request, "data") else None
        target = str(raw or "").strip().lower()
        if not target:
            # Maydonsiz so'rov cheklovni chetlab o'tmasin.
            return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
        # Xom email keshda ochiq yotmasin.
        digest = hashlib.sha256(target.encode("utf-8")).hexdigest()[:32]
        return self.cache_format % {"scope": self.scope, "ident": digest}


# --- parolni tiklash: IP va nishon bo'yicha ikki tomonlama cheklov
class PasswordResetIpThrottle(IpThrottle):
    scope = "password_reset"


class PasswordResetTargetThrottle(TargetThrottle):
    scope = "password_reset_target"


# --- xat yuborish (tasdiqlash xatini qayta so'rash)
class EmailSendThrottle(UserThrottle):
    scope = "email_send"


# --- ijtimoiy kirish: token tekshiruvi tashqi so'rov qiladi, arzon emas
class SocialAuthThrottle(IpThrottle):
    scope = "social_auth"


# --- kontent yaratish (muhokama, izoh, shikoyat, murojaat)
class ContentWriteThrottle(UserThrottle):
    scope = "content_write"


class WriteThrottleMixin:
    """ViewSet'ning YOZISH amallariga qo'shimcha cheklov qo'yadi.

    O'qish (GET) umumiy `user`/`anon` tomi bilan cheklanadi — u bemalol.
    Yozish esa spam yo'li, shuning uchun alohida va ancha tor.
    """

    def get_throttles(self):
        throttles = list(super().get_throttles())
        if self.request.method not in ("GET", "HEAD", "OPTIONS"):
            throttles.append(ContentWriteThrottle())
        return throttles
