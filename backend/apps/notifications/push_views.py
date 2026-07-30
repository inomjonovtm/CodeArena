"""`/api/push/...` — brauzer push obunasini boshqarish."""
from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.sessions import parse_user_agent

from . import push
from .models import PushSubscription
from .serializers import PushSubscribeSerializer, PushSubscriptionSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def push_config(request):
    """`GET /api/push/config/` — frontend push tugmasini ko'rsatish uchun.

    `enabled=False` bo'lsa serverda VAPID kalitlari sozlanmagan — bunday holda
    interfeys obuna tugmasini umuman ko'rsatmaydi.
    """
    return Response(
        {
            "enabled": push.is_enabled(),
            "public_key": push.public_key(),
            "devices": PushSubscription.objects.filter(user=request.user).count(),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def push_devices(request):
    """`GET /api/push/devices/` — obuna bo'lgan qurilmalar ro'yxati."""
    rows = PushSubscription.objects.filter(user=request.user)
    return Response(PushSubscriptionSerializer(rows, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def push_subscribe(request):
    """`POST /api/push/subscribe/` — brauzer bergan obunani saqlaydi.

    Bir xil `endpoint` bilan qayta kelinsa yozuv yangilanadi: brauzer obunani
    o'zi yangilab turishi mumkin va har safar yangi qator yaratish shart emas.
    Obuna boshqa hisobga tegishli bo'lsa — u shu foydalanuvchiga o'tadi
    (bitta brauzerdan boshqa hisob bilan kirilgan).
    """
    if not push.is_enabled():
        return Response(
            {"detail": "Push xabarlari serverda sozlanmagan.", "code": "push_disabled"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    serializer = PushSubscribeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    user_agent = request.META.get("HTTP_USER_AGENT", "")[:255]
    browser, device = parse_user_agent(user_agent)

    subscription, created = PushSubscription.objects.update_or_create(
        endpoint=data["endpoint"],
        defaults={
            "user": request.user,
            "p256dh": data["keys"]["p256dh"],
            "auth": data["keys"]["auth"],
            "user_agent": user_agent,
            "browser": browser,
            "device": device,
            "failure_count": 0,
            "last_error": "",
        },
    )

    return Response(
        {
            "detail": "Qurilma obuna bo'ldi." if created else "Obuna yangilandi.",
            "created": created,
            "device": PushSubscriptionSerializer(subscription).data,
        },
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def push_unsubscribe(request):
    """`POST /api/push/unsubscribe/` — shu qurilmaning obunasini o'chiradi."""
    endpoint = (request.data.get("endpoint") or "").strip()
    if not endpoint:
        return Response({"detail": "`endpoint` kerak."}, status=status.HTTP_400_BAD_REQUEST)

    deleted, _ = PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
    return Response({"detail": "Obuna bekor qilindi.", "removed": bool(deleted)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def push_test(request):
    """`POST /api/push/test/` — sozlash to'g'ri ishlayotganini tekshirish.

    Bu yerda ataylab fon vazifasi ishlatilmaydi: foydalanuvchi tugmani bosganda
    natijani (nechta qurilmaga ketdi) darhol ko'rishi kerak.
    """
    if not push.is_enabled():
        return Response(
            {"detail": "Push xabarlari serverda sozlanmagan.", "code": "push_disabled"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    sent = push.send_to_user(
        request.user.id,
        {
            "title": "CodeArena — sinov xabari",
            "body": "Push xabarlari ishlayapti. Musobaqa eslatmalari shu ko'rinishda keladi.",
            "url": "/settings",
            "kind": "account",
            "level": "success",
            "tag": "push-test",
        },
    )

    if sent == 0:
        return Response(
            {
                "detail": "Xabar yuborilmadi. Qurilma obunasi eskirgan bo'lishi mumkin — "
                "obunani o'chirib, qaytadan yoqing.",
                "sent": 0,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({"detail": f"{sent} ta qurilmaga yuborildi.", "sent": sent})
