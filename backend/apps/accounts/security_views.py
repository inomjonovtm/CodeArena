"""Xavfsizlik: aktiv sessiyalar, 2FA, granular ruxsatlar."""
from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.mixins import write_audit
from apps.core.permissions import HasResourcePerm, IsStaff, require

from . import totp
from .models import (
    ALL_PERMISSIONS,
    PERMISSION_CATALOG,
    ROLE_PERMISSIONS,
    AdminSession,
    Role,
    User,
)

# Sessiya mantig'i `accounts.sessions` da — token bilan bog'lash va keshni
# bekor qilish bir joyda turishi uchun. Bu yerdagi nomlar eski importlar
# ishlashda davom etishi uchun qoldirilgan.
from .sessions import current_sid, parse_user_agent, record_session, revoke, revoke_queryset

__all__ = ["parse_user_agent", "record_session"]


# ------------------------------------------------------------- sessiyalar
class AdminSessionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = AdminSession
        fields = (
            "id", "user", "username", "ip_address", "browser", "device",
            "location", "is_active", "is_current", "revoked_at",
            "last_seen_at", "created_at",
        )
        read_only_fields = fields


class AdminSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """`/api/admin/sessions/` — aktiv sessiyalar va ularni yopish."""

    queryset = AdminSession.objects.select_related("user")
    serializer_class = AdminSessionSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "sessions"
    perm_actions = {"revoke": "revoke", "revoke_all": "revoke"}
    filterset_fields = ["user"]
    search_fields = ["user__username", "ip_address", "browser"]
    ordering_fields = ["last_seen_at", "created_at"]
    ordering = ["-last_seen_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Moderator faqat o'z sessiyalarini ko'radi
        if self.request.user.role != Role.ADMIN:
            queryset = queryset.filter(user=self.request.user)
        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Joriy sessiya tokendagi `sid` orqali aniq topiladi. IP va User-Agent
        # bo'yicha taxmin qilish ishonchsiz edi: bir xil brauzerdan kirilgan
        # ikkita sessiya ham "joriy" ko'rinardi.
        sid = current_sid(request)
        rows = response.data.get("results", response.data)
        if isinstance(rows, list):
            for row in rows:
                row["is_current"] = bool(sid) and str(row.get("id")) == sid
        return response

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        session = self.get_object()
        revoke(session)
        write_audit(request, action_name="session.revoke", obj=session)
        return Response({"detail": "Sessiya yopildi."})

    @action(detail=False, methods=["post"], url_path="revoke-all")
    def revoke_all(self, request):
        """O'z hisobingizning boshqa barcha sessiyalarini yopadi."""
        target_id = request.data.get("user")
        if target_id and request.user.role == Role.ADMIN:
            queryset = AdminSession.objects.filter(user_id=target_id)
        else:
            queryset = AdminSession.objects.filter(user=request.user)

        sid = current_sid(request)
        if sid:
            queryset = queryset.exclude(pk=sid)
        affected = revoke_queryset(queryset)
        write_audit(
            request, action_name="session.revoke_all",
            target_type="AdminSession", target_repr=f"{affected} ta",
        )
        return Response({"detail": f"{affected} ta sessiya yopildi.", "affected": affected})


# -------------------------------------------------------------------- 2FA
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def totp_setup(request):
    """Yangi sir yaratadi va `otpauth://` havolasini qaytaradi."""
    user = request.user
    if user.is_2fa_enabled:
        return Response({"detail": "2FA allaqachon yoqilgan."}, status=status.HTTP_400_BAD_REQUEST)

    secret = totp.generate_secret()
    user.totp_secret = secret
    user.save(update_fields=["totp_secret"])

    return Response(
        {
            "secret": secret,
            "otpauth_url": totp.provisioning_uri(secret, user.email or user.username),
            "digits": totp.DIGITS,
            "period": totp.PERIOD,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def totp_enable(request):
    """Authenticator'dagi kodni tekshirib, 2FA ni yoqadi."""
    user = request.user
    code = request.data.get("code", "")

    if not user.totp_secret:
        return Response({"detail": "Avval sozlashni boshlang."}, status=status.HTTP_400_BAD_REQUEST)
    if not totp.verify(user.totp_secret, code):
        return Response({"detail": "Kod noto'g'ri yoki muddati o'tgan."},
                        status=status.HTTP_400_BAD_REQUEST)

    user.is_2fa_enabled = True
    user.totp_confirmed_at = timezone.now()
    user.save(update_fields=["is_2fa_enabled", "totp_confirmed_at"])
    write_audit(request, action_name="security.2fa_enable", obj=user)

    return Response(
        {"detail": "2FA yoqildi.", "recovery_codes": totp.generate_recovery_codes()}
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def totp_disable(request):
    """Parol tasdiqlab, 2FA ni o'chiradi."""
    user = request.user
    if not user.check_password(request.data.get("password", "")):
        return Response({"detail": "Parol noto'g'ri."}, status=status.HTTP_400_BAD_REQUEST)

    user.is_2fa_enabled = False
    user.totp_secret = ""
    user.totp_confirmed_at = None
    user.save(update_fields=["is_2fa_enabled", "totp_secret", "totp_confirmed_at"])
    write_audit(request, action_name="security.2fa_disable", obj=user)
    return Response({"detail": "2FA o'chirildi."})


# --------------------------------------------------------------- ruxsatlar
@api_view(["GET"])
@permission_classes([IsStaff])
def permission_catalog(request):
    """Barcha mavjud ruxsatlar (izohlari bilan) va rol bo'yicha standart to'plamlar."""
    return Response(
        {
            "groups": [
                {
                    "key": group["key"],
                    "label": group["label"],
                    "permissions": [
                        {"code": code, "label": label} for code, label in group["codes"]
                    ],
                }
                for group in PERMISSION_CATALOG
            ],
            "all": ALL_PERMISSIONS,
            "roles": {role: sorted(perms) for role, perms in ROLE_PERMISSIONS.items()},
        }
    )


@api_view(["POST"])
@permission_classes([require("users.permissions")])
def set_user_permissions(request, user_id):
    """Foydalanuvchiga rol ustidan qo'shimcha ruxsat berish / olib tashlash."""
    user = User.objects.filter(pk=user_id).first()
    if not user:
        return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)

    extra = [p for p in (request.data.get("extra") or []) if p in ALL_PERMISSIONS]
    denied = [p for p in (request.data.get("denied") or []) if p in ALL_PERMISSIONS]

    before = {"extra": user.extra_permissions, "denied": user.denied_permissions}
    user.extra_permissions = extra
    user.denied_permissions = denied
    user.save(update_fields=["extra_permissions", "denied_permissions"])

    write_audit(
        request, action_name="user.set_permissions", obj=user,
        changes={"before": before, "after": {"extra": extra, "denied": denied}},
    )
    return Response(
        {
            "detail": "Ruxsatlar yangilandi.",
            "extra_permissions": extra,
            "denied_permissions": denied,
            "effective": sorted(user.permissions),
        }
    )
