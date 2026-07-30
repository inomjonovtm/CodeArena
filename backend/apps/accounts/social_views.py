"""Obuna (follow) va avatar — foydalanuvchi profilining ijtimoiy qismi.

Bu yerdagi endpointlar `/api/...` ildizida turadi va admin paneldan mustaqil.
"""
from __future__ import annotations

import hashlib
import os

from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.core import ranks
from apps.core.media import ALLOWED_TYPES, MAX_SIZE_MB, MediaFile
from apps.core.pagination import StandardPagination

from .models import Follow, User
from .serializers import MeSerializer

# Avatar sifatida SVG qabul qilinmaydi: SVG ichida skript bo'lishi mumkin va u
# boshqa foydalanuvchilarning sahifasida ko'rsatiladi (saqlangan XSS xavfi).
AVATAR_TYPES = {mime: ext for mime, ext in ALLOWED_TYPES.items() if mime != "image/svg+xml"}
AVATAR_MAX_MB = 2


def user_card(user: User, *, viewer: User | None = None) -> dict:
    """Ro'yxatlarda ko'rsatiladigan qisqa foydalanuvchi kartasi."""
    return {
        "username": user.username,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "country": user.country,
        "rating": user.rating,
        "rank": ranks.rank_info(user.rating),
        "total_points": user.total_points,
        "problems_solved": user.problems_solved,
        "followers_count": user.followers_count,
        "is_following": bool(
            viewer
            and viewer.is_authenticated
            and Follow.objects.filter(follower=viewer, following=user).exists()
        ),
        "is_me": bool(viewer and viewer.is_authenticated and viewer.pk == user.pk),
    }


def _get_target(username: str) -> User | None:
    return User.objects.filter(username__iexact=username, is_active=True).first()


# ================================================================== obuna
@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def follow_user(request, username: str):
    """`POST/DELETE /api/users/<username>/follow/` — obuna bo'lish / bekor qilish."""
    target = _get_target(username)
    if target is None:
        return Response({"detail": "Foydalanuvchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)
    if target.pk == request.user.pk:
        return Response(
            {"detail": "O'zingizga obuna bo'la olmaysiz."}, status=status.HTTP_400_BAD_REQUEST
        )
    if target.is_banned:
        return Response(
            {"detail": "Bloklangan foydalanuvchiga obuna bo'lib bo'lmaydi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "DELETE":
        deleted, _ = Follow.objects.filter(follower=request.user, following=target).delete()
        if deleted:
            _sync_counts(request.user, target)
        return Response(_follow_state(request.user, target, following=False))

    try:
        with transaction.atomic():
            _, created = Follow.objects.get_or_create(follower=request.user, following=target)
    except IntegrityError:
        created = False

    if created:
        _sync_counts(request.user, target)
        _notify_new_follower(request.user, target)

    return Response(
        _follow_state(request.user, target, following=True),
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


def _sync_counts(follower: User, following: User) -> None:
    """Hisoblagichlarni haqiqiy qatorlar soniga tenglashtiradi.

    `F()+1` o'rniga qayta hisoblash — takroriy so'rovda ham son to'g'ri qoladi.
    """
    User.objects.filter(pk=follower.pk).update(
        following_count=Follow.objects.filter(follower=follower).count()
    )
    User.objects.filter(pk=following.pk).update(
        followers_count=Follow.objects.filter(following=following).count()
    )
    follower.refresh_from_db(fields=["following_count"])
    following.refresh_from_db(fields=["followers_count"])


def _follow_state(viewer: User, target: User, *, following: bool) -> dict:
    return {
        "username": target.username,
        "is_following": following,
        "followers_count": target.followers_count,
        "following_count": target.following_count,
    }


def _notify_new_follower(follower: User, target: User) -> None:
    if not target.notify_follower:
        return
    from apps.notifications.models import NotificationKind
    from apps.notifications.services import notify

    notify(
        target,
        kind=NotificationKind.ACCOUNT,
        level="info",
        title="Yangi obunachi",
        body=f"@{follower.username} sizga obuna bo'ldi.",
        url=f"/u/{follower.username}",
        payload={"follower": follower.username},
    )


def _paginated_users(request, queryset):
    paginator = StandardPagination()
    page = paginator.paginate_queryset(queryset, request)
    viewer = request.user if request.user.is_authenticated else None
    return paginator.get_paginated_response([user_card(user, viewer=viewer) for user in page])


@api_view(["GET"])
@permission_classes([AllowAny])
def followers(request, username: str):
    """`GET /api/users/<username>/followers/` — kim obuna bo'lgan."""
    target = _get_target(username)
    if target is None:
        return Response({"detail": "Foydalanuvchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)
    queryset = User.objects.filter(
        following_links__following=target, is_active=True
    ).order_by("-following_links__created_at")
    return _paginated_users(request, queryset)


@api_view(["GET"])
@permission_classes([AllowAny])
def following(request, username: str):
    """`GET /api/users/<username>/following/` — kimga obuna bo'lgan."""
    target = _get_target(username)
    if target is None:
        return Response({"detail": "Foydalanuvchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)
    queryset = User.objects.filter(
        follower_links__follower=target, is_active=True
    ).order_by("-follower_links__created_at")
    return _paginated_users(request, queryset)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def suggested_users(request):
    """`GET /api/users/suggested/` — obuna bo'lish uchun tavsiyalar.

    Hali obuna bo'lmagan, so'nggi paytda faol bo'lgan kuchli foydalanuvchilar.
    """
    already = Follow.objects.filter(follower=request.user).values_list("following_id", flat=True)
    rows = (
        User.objects.filter(is_active=True, is_banned=False)
        .exclude(pk=request.user.pk)
        .exclude(pk__in=already)
        .order_by("-total_points", "-problems_solved")[:8]
    )
    return Response([user_card(user, viewer=request.user) for user in rows])


# ================================================================= avatar
@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def my_avatar(request):
    """`POST/DELETE /api/auth/me/avatar/` — profil rasmini yuklash / o'chirish."""
    user = request.user

    if request.method == "DELETE":
        user.avatar_url = ""
        user.save(update_fields=["avatar_url"])
        return Response(MeSerializer(user).data)

    upload = request.FILES.get("file") or request.FILES.get("avatar")
    if upload is None:
        return Response({"detail": "Rasm yuborilmadi."}, status=status.HTTP_400_BAD_REQUEST)
    if upload.content_type not in AVATAR_TYPES:
        return Response(
            {"detail": "Faqat JPG, PNG, WebP yoki GIF rasm yuklash mumkin."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if upload.size > AVATAR_MAX_MB * 1024 * 1024:
        return Response(
            {"detail": f"Rasm juda katta ({upload.size // 1024} KB). Limit: {AVATAR_MAX_MB} MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    digest = hashlib.sha256()
    for chunk in upload.chunks():
        digest.update(chunk)
    checksum = digest.hexdigest()
    upload.seek(0)

    media = MediaFile.objects.filter(checksum=checksum, kind="avatar").first()
    if media is None:
        extension = AVATAR_TYPES[upload.content_type]
        base = os.path.splitext(upload.name)[0][:40] or "avatar"
        upload.name = f"{base}-{checksum[:8]}{extension}"
        media = MediaFile.objects.create(
            file=upload,
            original_name=upload.name,
            content_type=upload.content_type,
            size_bytes=upload.size,
            checksum=checksum,
            kind="avatar",
            uploaded_by=user,
        )

    user.avatar_url = media.url
    user.save(update_fields=["avatar_url"])
    return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)
