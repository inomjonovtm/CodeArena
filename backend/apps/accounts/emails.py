"""Email yuborish — tasdiqlash, parol tiklash, xush kelibsiz (9-bo'lim: onboarding)."""
from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

logger = logging.getLogger(__name__)

BRAND = "CodeArena"


def _wrap(title: str, body_html: str, cta_label: str = "", cta_url: str = "") -> str:
    button = (
        f'<a href="{cta_url}" style="display:inline-block;background:#10b981;color:#ffffff;'
        f'text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600;'
        f'font-size:14px;margin:20px 0">{cta_label}</a>'
        if cta_url
        else ""
    )
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f8f7;font-family:-apple-system,Segoe UI,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f7;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;
        border:1px solid #e3e7e4;border-radius:16px;overflow:hidden">
        <tr><td style="background:#0b0f0d;padding:20px 28px">
          <span style="color:#ffffff;font-size:18px;font-weight:700">Code</span><span
            style="color:#10b981;font-size:18px;font-weight:700">Arena</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#0b0f0d">{title}</h1>
          <div style="font-size:14px;line-height:1.7;color:#5b6560">{body_html}</div>
          {button}
          <p style="margin:20px 0 0;font-size:12px;color:#8a938e">
            Agar bu xatni siz so'ramagan bo'lsangiz, e'tiborsiz qoldiring.
          </p>
        </td></tr>
        <tr><td style="background:#f7f8f7;padding:16px 28px;font-size:11px;color:#8a938e">
          © {timezone.now().year} {BRAND}. Barcha huquqlar himoyalangan.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def _send(to: str, subject: str, text: str, html: str) -> bool:
    try:
        message = EmailMultiAlternatives(
            subject=f"{BRAND} — {subject}",
            body=text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to],
        )
        message.attach_alternative(html, "text/html")
        message.send(fail_silently=False)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Email yuborilmadi (%s): %s", to, exc)
        return False


def _issue_token(user, purpose: str, hours: int) -> str:
    from .models import EmailVerification

    token = secrets.token_urlsafe(32)
    EmailVerification.objects.create(
        user=user,
        token=token,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(hours=hours),
    )
    return token


def send_verification_email(user) -> bool:
    token = _issue_token(user, "verify", hours=48)
    url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    text = (
        f"Salom, {user.display_name}!\n\n"
        f"Emailingizni tasdiqlash uchun havolaga o'ting:\n{url}\n\n"
        "Havola 48 soat amal qiladi."
    )
    html = _wrap(
        "Emailingizni tasdiqlang",
        f"Salom, <b>{user.display_name}</b>! {BRAND} ga xush kelibsiz. "
        "Hisobingizni faollashtirish uchun quyidagi tugmani bosing.",
        "Emailni tasdiqlash",
        url,
    )
    return _send(user.email, "Emailni tasdiqlash", text, html)


def send_password_reset_email(user) -> bool:
    token = _issue_token(user, "reset", hours=2)
    url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    text = (
        f"Salom, {user.display_name}!\n\n"
        f"Parolni tiklash havolasi:\n{url}\n\nHavola 2 soat amal qiladi."
    )
    html = _wrap(
        "Parolni tiklash",
        f"Salom, <b>{user.display_name}</b>! Parolni tiklash so'rovi qabul qilindi. "
        "Yangi parol o'rnatish uchun tugmani bosing. Havola 2 soat amal qiladi.",
        "Parolni tiklash",
        url,
    )
    return _send(user.email, "Parolni tiklash", text, html)


def send_ban_email(user, reason: str, until=None) -> bool:
    period = f"{until:%Y-%m-%d %H:%M} gacha" if until else "muddatsiz"
    text = f"Salom, {user.display_name}!\n\nHisobingiz bloklandi ({period}).\nSabab: {reason}"
    html = _wrap(
        "Hisobingiz bloklandi",
        f"Salom, <b>{user.display_name}</b>! Hisobingiz <b>{period}</b> bloklandi.<br><br>"
        f"<b>Sabab:</b> {reason}<br><br>Savollaringiz bo'lsa, qo'llab-quvvatlash xizmatiga yozing.",
    )
    return _send(user.email, "Hisob bloklandi", text, html)


def send_announcement_email(user, title: str, body: str) -> bool:
    html = _wrap(title, body.replace("\n", "<br>"))
    return _send(user.email, title, body, html)


def send_plain_email(to: str, *, subject: str, body: str) -> bool:
    """Ixtiyoriy manzilga oddiy xat (masalan «Bog'lanish» formasiga javob).

    Boshqa yordamchilardan farqi: qabul qiluvchi ro'yxatdan o'tgan
    foydalanuvchi bo'lishi shart emas.
    """
    html = _wrap(subject, "<br>".join(line for line in body.splitlines()))
    return _send(to, subject, body, html)
