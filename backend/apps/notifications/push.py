"""Web Push (VAPID) — brauzer bildirishnomalarini yuborish.

Oqim: brauzer service worker orqali obuna bo'ladi → `endpoint` va shifrlash
kalitlarini serverga yuboradi (`PushSubscription`) → server push xizmatiga
(FCM / Mozilla / WNS) shifrlangan xabar yuboradi → xizmat uni brauzerga
yetkazadi, sayt yopiq bo'lsa ham.

**Kalitlar sozlanmagan bo'lsa modul jimgina o'chadi.** `VAPID_PUBLIC_KEY` /
`VAPID_PRIVATE_KEY` bo'sh bo'lsa `is_enabled()` `False` qaytaradi, obuna
endpointi buni ochiq aytadi va frontend tugmani ko'rsatmaydi. Shu tufayli
loyihani kalitlarsiz ham ishga tushirish mumkin — judge0 bilan bir xil yondashuv.

Kalit yaratish:  `python manage.py vapid_keys`
"""
from __future__ import annotations

import json
import logging

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

try:  # pywebpush ixtiyoriy — o'rnatilmagan bo'lsa push shunchaki o'chadi
    from pywebpush import WebPushException, webpush
except ImportError:  # pragma: no cover
    webpush = None

    class WebPushException(Exception):  # type: ignore[no-redef]
        response = None


# Push xizmati javobini qancha kutamiz
TIMEOUT_SECONDS = 8
# Xabar push xizmatida qancha saqlanadi (qurilma oflayn bo'lsa)
TTL_SECONDS = 60 * 60 * 12


def is_enabled() -> bool:
    return bool(
        webpush is not None
        and getattr(settings, "VAPID_PUBLIC_KEY", "")
        and getattr(settings, "VAPID_PRIVATE_KEY", "")
    )


def public_key() -> str:
    """Frontend obuna bo'lishda ishlatadigan ochiq kalit."""
    return getattr(settings, "VAPID_PUBLIC_KEY", "")


def _vapid_claims() -> dict:
    # `sub` — push xizmati muammo chiqsa bog'lanadigan manzil (RFC 8292)
    subject = getattr(settings, "VAPID_SUBJECT", "") or "mailto:admin@codearena.uz"
    return {"sub": subject}


def _drop(subscription, reason: str) -> None:
    logger.info("Push obunasi o'chirildi (%s): %s", reason, subscription.endpoint[:60])
    subscription.delete()


def _register_failure(subscription, error: str) -> None:
    """Xatoni yozadi va chegaraga yetganda obunani o'chiradi."""
    limit = int(getattr(settings, "PUSH_MAX_FAILURES", 5))
    subscription.failure_count += 1
    subscription.last_error = error[:200]
    if subscription.failure_count >= limit:
        _drop(subscription, f"{limit} marta xato")
        return
    subscription.save(update_fields=["failure_count", "last_error"])


def send_to_subscription(subscription, payload: dict) -> bool:
    """Bitta qurilmaga yuboradi. Muvaffaqiyatli bo'lsa `True`."""
    if not is_enabled():
        return False

    try:
        webpush(
            subscription_info=subscription.subscription_info,
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims=_vapid_claims(),
            ttl=TTL_SECONDS,
            timeout=TIMEOUT_SECONDS,
        )
    except WebPushException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        # 404/410 — obuna endi mavjud emas (brauzer tozalangan, ruxsat olib
        # tashlangan). Qayta urinishning ma'nosi yo'q, darhol o'chiramiz.
        if status in {404, 410}:
            _drop(subscription, f"HTTP {status}")
        else:
            _register_failure(subscription, f"HTTP {status}: {exc}")
        return False
    except Exception as exc:  # noqa: BLE001 — tarmoq xatosi bildirishnomani to'xtatmasin
        _register_failure(subscription, str(exc))
        return False

    subscription.failure_count = 0
    subscription.last_error = ""
    subscription.last_sent_at = timezone.now()
    subscription.save(update_fields=["failure_count", "last_error", "last_sent_at"])
    return True


def send_to_user(user_id, payload: dict) -> int:
    """Foydalanuvchining barcha qurilmalariga yuboradi, yetkazilgan sonini qaytaradi."""
    if not is_enabled():
        return 0

    from .models import PushSubscription

    sent = 0
    for subscription in PushSubscription.objects.filter(user_id=user_id):
        if send_to_subscription(subscription, payload):
            sent += 1
    return sent


def payload_from_notification(notification) -> dict:
    """`Notification` yozuvidan brauzerga yuboriladigan xabar yasaydi.

    `tag` — bir xil turdagi xabarlar bir-birining ustiga tushishi uchun: masalan
    ketma-ket kelgan ikkita "yechim tekshirildi" xabari bitta bildirishnomaga
    aylanadi va foydalanuvchi ekranini to'ldirmaydi.
    """
    return {
        "title": notification.title,
        "body": notification.body,
        "url": notification.url or "/notifications",
        "kind": notification.kind,
        "level": notification.level,
        "tag": f"{notification.kind}:{notification.recipient_id}",
        "id": str(notification.id),
    }
