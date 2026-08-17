"""Hisoblar bo'yicha fon vazifalari."""
from __future__ import annotations

from celery import shared_task
from django.utils import timezone


@shared_task(name="apps.accounts.tasks.clear_expired_bans")
def clear_expired_bans() -> str:
    """Muddati o'tgan vaqtinchalik banlarni olib tashlaydi.

    `ban_is_active` muddatni to'g'ri tekshiradi, lekin leaderboard va
    e'lonlar `is_banned` bayrog'i bo'yicha filtrlaydi. Bayroq o'z-o'zidan
    tozalanmasa, 24 soatlik ban foydalanuvchini ro'yxatlardan ABADIY
    chiqarib yuborardi (admin qo'lda bosmaguncha).
    """
    from .models import User

    cleared = User.objects.filter(
        is_banned=True, banned_until__isnull=False, banned_until__lt=timezone.now()
    ).update(is_banned=False, ban_reason="", banned_until=None, banned_by=None)
    return f"cleared:{cleared}"
