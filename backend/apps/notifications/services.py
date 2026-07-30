"""Bildirishnoma yaratish yordamchilari.

Ilovalarning boshqa qismlari shu funksiyalarni chaqiradi — `Notification`
modeliga to'g'ridan-to'g'ri murojaat qilinmaydi, shunda takrorlanish va
o'z-o'ziga xabar yuborish nazorati bitta joyda qoladi.
"""
from __future__ import annotations

import logging

from .models import Notification, NotificationKind

logger = logging.getLogger(__name__)


def notify(
    recipient,
    *,
    kind: str = NotificationKind.ACCOUNT,
    title: str,
    body: str = "",
    url: str = "",
    level: str = "info",
    actor=None,
    payload: dict | None = None,
    push: bool = True,
) -> Notification | None:
    """Bitta foydalanuvchiga bildirishnoma yozadi.

    O'z harakatidan o'ziga xabar bormaydi. Xatolik yuz bersa — asosiy amal
    to'xtab qolmasligi uchun faqat log yoziladi.

    `push=True` bo'lsa, obuna bo'lgan qurilmalarga brauzer bildirishnomasi ham
    ketadi. Ruxsat sozlamalari chaqiruvchi tomonda tekshiriladi (masalan
    obunachi xabari `notify_follower` ga qarab yuboriladi).
    """
    if recipient is None or not getattr(recipient, "pk", None):
        return None
    if actor is not None and getattr(actor, "pk", None) == recipient.pk:
        return None

    try:
        notification = Notification.objects.create(
            recipient=recipient,
            actor=actor if getattr(actor, "pk", None) else None,
            kind=kind,
            level=level,
            title=title[:160],
            body=(body or "")[:400],
            url=(url or "")[:255],
            payload=payload or {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Bildirishnoma yozilmadi: %s", exc)
        return None

    if push:
        queue_push(notification)
    return notification


def queue_push(notification: Notification) -> None:
    """Brauzer push xabarini fon navbatiga qo'yadi.

    Sayt ichidagi bildirishnoma allaqachon yozilgan, shuning uchun bu yerdagi
    har qanday muammo (kalitlar sozlanmagan, Celery yo'q) faqat logga tushadi.
    """
    from . import push as push_module

    if not push_module.is_enabled():
        return
    try:
        from .tasks import send_push

        send_push.delay(
            str(notification.recipient_id), push_module.payload_from_notification(notification)
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Push navbatga qo'yilmadi: %s", exc)


def notify_many(recipients, **kwargs) -> int:
    """Ko'p foydalanuvchiga bitta xabarni bulk yozadi."""
    actor = kwargs.get("actor")
    actor_id = getattr(actor, "pk", None)
    rows = [
        Notification(
            recipient=user,
            actor=actor if actor_id else None,
            kind=kwargs.get("kind", NotificationKind.ANNOUNCEMENT),
            level=kwargs.get("level", "info"),
            title=(kwargs.get("title") or "")[:160],
            body=(kwargs.get("body") or "")[:400],
            url=(kwargs.get("url") or "")[:255],
            payload=kwargs.get("payload") or {},
        )
        for user in recipients
        if getattr(user, "pk", None) and user.pk != actor_id
    ]
    if not rows:
        return 0
    try:
        Notification.objects.bulk_create(rows, batch_size=500)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Ommaviy bildirishnoma yozilmadi: %s", exc)
        return 0

    if kwargs.get("push", True):
        _queue_push_bulk(rows)
    return len(rows)


def _queue_push_bulk(rows: list[Notification]) -> None:
    """Ommaviy xabar uchun bitta fon vazifasi — har bir qabul qiluvchiga emas.

    Matn hammada bir xil, shuning uchun payload birinchi yozuvdan olinadi va
    qabul qiluvchilar ro'yxati bilan birga uzatiladi.
    """
    from . import push as push_module

    if not rows or not push_module.is_enabled():
        return
    try:
        from .tasks import send_push_bulk

        payload = push_module.payload_from_notification(rows[0])
        # `tag` da qabul qiluvchi id si bor — ommaviy xabarda u umumiy bo'lsin
        payload["tag"] = f"{rows[0].kind}:broadcast"
        send_push_bulk.delay([str(row.recipient_id) for row in rows], payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Ommaviy push navbatga qo'yilmadi: %s", exc)
