"""Push xabarlarini fonda yuborish.

Yuborish tarmoq amali: har bir qurilma uchun push xizmatiga alohida HTTP
so'rov ketadi. Uni so'rov ichida bajarish foydalanuvchini kutdirib qo'yardi
(masalan, izoh yozgan odam javob kelishini push yuborilguncha kutardi), shuning
uchun Celery'ga uzatiladi. `CELERY_TASK_ALWAYS_EAGER` yoqilgan bo'lsa (DEBUG)
o'sha joyda bajariladi.
"""
from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.notifications.tasks.send_push")
def send_push(user_id: str, payload: dict) -> int:
    from . import push

    return push.send_to_user(user_id, payload)


@shared_task(name="apps.notifications.tasks.send_push_bulk")
def send_push_bulk(user_ids: list[str], payload: dict) -> int:
    from . import push

    return sum(push.send_to_user(user_id, payload) for user_id in user_ids)


@shared_task(name="apps.notifications.tasks.purge_stale_subscriptions")
def purge_stale_subscriptions() -> str:
    """Uzoq vaqt xato berayotgan obunalarni tozalaydi.

    Odatda obunalar 404/410 kelganda darhol o'chadi. Bu vazifa faqat
    "osilib qolgan" holatlar uchun — masalan push xizmati uzoq vaqt 5xx
    qaytargan bo'lsa.
    """
    from django.conf import settings

    from .models import PushSubscription

    limit = int(getattr(settings, "PUSH_MAX_FAILURES", 5))
    deleted, _ = PushSubscription.objects.filter(failure_count__gte=limit).delete()
    return f"deleted={deleted}"
