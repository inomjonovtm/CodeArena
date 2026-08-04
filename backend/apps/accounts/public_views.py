"""Foydalanuvchi hisobi bilan bog'liq ochiq oqimlar.

Bu yerda: email tasdiqlash, parolni tiklash, Google orqali kirish va
foydalanuvchining o'z sessiyalarini boshqarishi. Admin panel uchun mo'ljallangan
`security_views` dagi 2FA funksiyalari `urls.py` da shu yerdagi manzillarga ham
ulanadi — foydalanuvchi profilida ham 2FA sozlanishi kerak.
"""
from __future__ import annotations

import logging
import re
import secrets

import requests
from django.conf import settings
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.core.mixins import write_audit
from apps.core.throttling import (
    EmailSendThrottle,
    PasswordResetIpThrottle,
    PasswordResetTargetThrottle,
    SocialAuthThrottle,
)

from .authentication import set_auth_cookies
from .models import AdminSession, EmailVerification, Locale, User
from .serializers import MeSerializer
from .sessions import current_sid, record_session, revoke, revoke_queryset

logger = logging.getLogger(__name__)

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


def _issue(user: User, session=None):
    from .views import _issue_tokens

    return _issue_tokens(user, session)


@api_view(["GET"])
@permission_classes([AllowAny])
def auth_config(request):
    """`GET /api/auth/config/` — frontend qaysi kirish usullarini ko'rsatishini aytadi."""
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    return Response(
        {
            "google_enabled": bool(client_id),
            "google_client_id": client_id,
            "email_verification_required": False,
        }
    )


# ============================================================ email tasdiqlash
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetIpThrottle])
def verify_email(request):
    """`POST /api/auth/verify-email/` — xatdagi token bilan emailni tasdiqlaydi."""
    token = (request.data.get("token") or "").strip()
    if not token:
        return Response({"detail": "Token ko'rsatilmagan."}, status=status.HTTP_400_BAD_REQUEST)

    record = EmailVerification.objects.select_related("user").filter(
        token=token, purpose="verify"
    ).first()
    if not record:
        return Response(
            {"detail": "Havola noto'g'ri yoki allaqachon ishlatilgan.", "code": "invalid_token"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if record.user.is_email_verified:
        return Response({"detail": "Email allaqachon tasdiqlangan.", "already": True})
    if not record.is_valid:
        return Response(
            {"detail": "Havola muddati tugagan. Yangi xat so'rang.", "code": "expired"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        record.used_at = timezone.now()
        record.save(update_fields=["used_at"])
        user = record.user
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

    from apps.notifications.models import NotificationKind
    from apps.notifications.services import notify

    notify(
        user,
        kind=NotificationKind.ACCOUNT,
        level="success",
        title="Email tasdiqlandi",
        body="Hisobingiz to'liq faollashtirildi. Endi barcha imkoniyatlar ochiq.",
        url="/problems",
    )
    return Response({"detail": "Email muvaffaqiyatli tasdiqlandi.", "username": user.username})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([EmailSendThrottle])
def resend_verification(request):
    """`POST /api/auth/resend-verification/` — tasdiqlash xatini qayta yuboradi."""
    user = request.user
    if user.is_email_verified:
        return Response({"detail": "Email allaqachon tasdiqlangan."}, status=status.HTTP_400_BAD_REQUEST)

    recent = EmailVerification.objects.filter(
        user=user, purpose="verify", created_at__gte=timezone.now() - timezone.timedelta(minutes=2)
    ).exists()
    if recent:
        return Response(
            {"detail": "Xat yaqinda yuborildi. 2 daqiqadan so'ng qayta urinib ko'ring."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    from .emails import send_verification_email

    sent = send_verification_email(user)
    return Response({"detail": "Tasdiqlash xati yuborildi." if sent else "Xat yuborilmadi.", "sent": sent})


# ============================================================== parolni tiklash
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetIpThrottle, PasswordResetTargetThrottle])
def forgot_password(request):
    """`POST /api/auth/forgot-password/` — tiklash havolasini yuboradi.

    Xavfsizlik uchun email bazada bor-yo'qligi oshkor qilinmaydi — javob doim bir xil.

    Cheklov ikki tomonlama: IP bo'yicha va SO'RALGAN EMAIL bo'yicha. Faqat IP
    bo'yicha cheklansa, hujumchi IP almashtirib bitta manzilga xat yog'dira
    olardi; faqat email bo'yicha cheklansa — turli manzillarni sinab
    ko'rishga yo'l ochiq qolardi.
    """
    email = (request.data.get("email") or "").strip().lower()
    if not email:
        return Response({"detail": "Email ko'rsatilmagan."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user:
        recent = EmailVerification.objects.filter(
            user=user, purpose="reset",
            created_at__gte=timezone.now() - timezone.timedelta(minutes=2),
        ).exists()
        if not recent:
            from .emails import send_password_reset_email

            send_password_reset_email(user)

    return Response(
        {"detail": "Agar bunday email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi."}
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetIpThrottle])
def reset_password(request):
    """`POST /api/auth/reset-password/` — token bilan yangi parol o'rnatadi.

    Cheklovsiz qolganda tokenni tanlab olishga urinish mumkin edi.
    """
    token = (request.data.get("token") or "").strip()
    new_password = request.data.get("new_password") or ""

    if not token or not new_password:
        return Response(
            {"detail": "Token va yangi parol majburiy."}, status=status.HTTP_400_BAD_REQUEST
        )

    record = EmailVerification.objects.select_related("user").filter(
        token=token, purpose="reset"
    ).first()
    if not record or not record.is_valid:
        return Response(
            {"detail": "Havola noto'g'ri yoki muddati tugagan.", "code": "invalid_token"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        password_validation.validate_password(new_password, record.user)
    except DjangoValidationError as exc:
        return Response(
            {"detail": exc.messages[0], "errors": {"new_password": list(exc.messages)}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        user = record.user
        user.set_password(new_password)
        user.save(update_fields=["password"])
        record.used_at = timezone.now()
        record.save(update_fields=["used_at"])
        # Parol tiklangach barcha eski sessiyalar yopiladi (12-bo'lim)
        AdminSession.objects.filter(user=user, revoked_at__isnull=True).update(
            revoked_at=timezone.now()
        )

    from apps.notifications.models import NotificationKind
    from apps.notifications.services import notify

    notify(
        user,
        kind=NotificationKind.ACCOUNT,
        level="warning",
        title="Parol o'zgartirildi",
        body="Hisobingiz paroli tiklandi. Bu siz bo'lmasangiz — darhol qo'llab-quvvatlashga yozing.",
        url="/settings",
    )
    return Response({"detail": "Parol yangilandi. Endi yangi parol bilan kiring."})


# =============================================================== Google orqali
def _unique_username(base: str) -> str:
    candidate = re.sub(r"[^a-zA-Z0-9_]", "", (base or "").replace(".", "_"))[:24] or "user"
    if len(candidate) < 3:
        candidate = f"{candidate}user"[:24]
    if not User.objects.filter(username__iexact=candidate).exists():
        return candidate
    while True:
        suffix = secrets.randbelow(9000) + 1000
        attempt = f"{candidate[:27]}_{suffix}"
        if not User.objects.filter(username__iexact=attempt).exists():
            return attempt


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([SocialAuthThrottle])
def google_auth(request):
    """`POST /api/auth/google/` — Google Identity Services `credential` tokeni bilan kirish.

    Frontend Google tugmasi qaytargan ID tokenni yuboradi; token Google'ning
    `tokeninfo` endpointida tekshiriladi va `aud` sozlamadagi client ID ga
    mos kelishi shart.
    """
    credential = (request.data.get("credential") or "").strip()
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")

    if not client_id:
        return Response(
            {"detail": "Google orqali kirish sozlanmagan.", "code": "google_disabled"},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )
    if not credential:
        return Response({"detail": "Google tokeni yuborilmadi."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        response = requests.get(GOOGLE_TOKENINFO_URL, params={"id_token": credential}, timeout=10)
    except requests.RequestException as exc:
        logger.warning("Google tokenini tekshirib bo'lmadi: %s", exc)
        return Response(
            {"detail": "Google bilan bog'lanib bo'lmadi. Keyinroq urinib ko'ring."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if not response.ok:
        return Response({"detail": "Google tokeni yaroqsiz."}, status=status.HTTP_401_UNAUTHORIZED)

    info = response.json()
    if info.get("aud") != client_id:
        return Response({"detail": "Token boshqa ilova uchun berilgan."}, status=status.HTTP_401_UNAUTHORIZED)
    if info.get("email_verified") in {"false", False}:
        return Response({"detail": "Google hisobingiz emaili tasdiqlanmagan."},
                        status=status.HTTP_400_BAD_REQUEST)

    google_id = info.get("sub") or ""
    email = (info.get("email") or "").lower()
    if not google_id or not email:
        return Response({"detail": "Google javobida email topilmadi."},
                        status=status.HTTP_400_BAD_REQUEST)

    created = False
    user = User.objects.filter(oauth_google_id=google_id).first()
    if user is None:
        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            user.oauth_google_id = google_id
            if not user.is_email_verified:
                user.is_email_verified = True
            user.save(update_fields=["oauth_google_id", "is_email_verified"])

    if user is None:
        created = True
        user = User.objects.create_user(
            username=_unique_username(email.split("@")[0]),
            email=email,
            password=None,
            full_name=(info.get("name") or "")[:120],
            avatar_url=info.get("picture") or "",
            locale=Locale.UZ,
            is_email_verified=True,
        )
        user.set_unusable_password()
        user.oauth_google_id = google_id
        user.save(update_fields=["password", "oauth_google_id"])

    if user.ban_is_active:
        return Response(
            {"detail": f"Hisob bloklangan. Sabab: {user.ban_reason or 'ko‘rsatilmagan'}"},
            status=status.HTTP_403_FORBIDDEN,
        )
    if not user.is_active:
        return Response({"detail": "Hisob faolsizlantirilgan."}, status=status.HTTP_403_FORBIDDEN)

    user.last_login = timezone.now()
    user.last_login_ip = getattr(request, "client_ip", "") or None
    user.save(update_fields=["last_login", "last_login_ip"])

    access, refresh = _issue(user, record_session(request, user))
    payload = {
        "user": MeSerializer(user).data,
        "access": access,
        "refresh": refresh,
        "created": created,
    }
    result = Response(payload, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    return set_auth_cookies(result, access, refresh)


# ========================================================== o'z sessiyalarim
def _session_row(session: AdminSession, *, sid: str, current_ip: str, current_agent: str) -> dict:
    # Joriy qurilma tokendagi `sid` orqali aniqlanadi. `sid` bo'lmasa (token bu
    # imkoniyat qo'shilishidan oldin berilgan) — eski taxminiy usulga qaytamiz.
    if sid:
        is_current = str(session.id) == sid
    else:
        is_current = bool(
            session.ip_address == current_ip and session.user_agent == current_agent
        )
    return {
        "id": str(session.id),
        "ip_address": session.ip_address,
        "browser": session.browser,
        "device": session.device,
        "location": session.location,
        "is_current": is_current,
        "is_active": session.revoked_at is None,
        "last_seen_at": session.last_seen_at,
        "created_at": session.created_at,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_sessions(request):
    """`GET /api/auth/sessions/` — qaysi qurilmalardan kirilgan."""
    sid = current_sid(request)
    current_ip = getattr(request, "client_ip", "") or None
    current_agent = request.META.get("HTTP_USER_AGENT", "")[:255]
    rows = AdminSession.objects.filter(user=request.user).order_by("-last_seen_at")[:50]
    return Response(
        [
            _session_row(row, sid=sid, current_ip=current_ip, current_agent=current_agent)
            for row in rows
        ]
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def revoke_my_session(request, session_id):
    """`POST /api/auth/sessions/<id>/revoke/` — bitta sessiyani yopadi."""
    session = AdminSession.objects.filter(pk=session_id, user=request.user).first()
    if not session:
        return Response({"detail": "Sessiya topilmadi."}, status=status.HTTP_404_NOT_FOUND)
    revoke(session)
    return Response({"detail": "Sessiya yopildi."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def revoke_other_sessions(request):
    """`POST /api/auth/sessions/revoke-others/` — joriydan boshqa hammasini yopadi."""
    sid = current_sid(request)
    queryset = AdminSession.objects.filter(user=request.user, revoked_at__isnull=True)
    if sid:
        queryset = queryset.exclude(pk=sid)
    else:
        current_ip = getattr(request, "client_ip", "") or None
        current_agent = request.META.get("HTTP_USER_AGENT", "")[:255]
        queryset = queryset.exclude(ip_address=current_ip, user_agent=current_agent)

    affected = revoke_queryset(queryset)
    write_audit(request, action_name="session.revoke_others", obj=request.user)
    return Response({"detail": f"{affected} ta sessiya yopildi.", "affected": affected})


# ============================================================== hisobni o'chirish
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def deactivate_account(request):
    """`POST /api/auth/deactivate/` — parol tasdiqlab hisobni faolsizlantiradi."""
    user = request.user
    if user.is_staff_member:
        return Response(
            {"detail": "Admin va moderator hisoblari bu yerdan o'chirilmaydi."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if not user.check_password(request.data.get("password", "")):
        return Response({"detail": "Parol noto'g'ri."}, status=status.HTTP_400_BAD_REQUEST)

    user.is_active = False
    user.save(update_fields=["is_active"])
    revoke_queryset(AdminSession.objects.filter(user=user))
    write_audit(request, action_name="account.deactivate", obj=user)

    from .authentication import clear_auth_cookies

    return clear_auth_cookies(Response({"detail": "Hisobingiz faolsizlantirildi."}))
