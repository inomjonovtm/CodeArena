"""Tarjima endpointlari.

Ikki xil ehtiyoj, ikki xil chegara:

* `/api/i18n/translate/` — INTERFEYS yorliqlari. Ochiq, lekin ehtiyotkor:
  bir so'rovda faqat sanoqli yangi matn tarjima qilinadi, qolgani keshdan
  keladi. Bepul xizmatning kunlik chegarasi bitta foydalanuvchi tomonidan
  bir zumda tugab qolmasligi kerak. Tarjimasi tayyor bo'lmagan yorliq
  javobda umuman qaytmaydi — interfeys o'zbekcha matnni ko'rsatadi.

* `/api/admin/translate/` — KONTENT maydonlari (masala sharti, yangilik,
  e'lon). Faqat xodimlar uchun, hajmi katta, darhol tarjima qilinadi.
"""
from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .permissions import IsStaff
from .translate import is_enabled, translate, translate_many

# Bir so'rovda qabul qilinadigan eng ko'p matn
MAX_TEXTS = 1500

# Bir so'rovda YANGI (keshda yo'q) matnlardan nechtasi tarjima qilinadi.
#
# Raqam ataylab kichik: har bir yangi matn tashqi xizmatga alohida HTTP
# so'rov (~0.5 s). 25 ta bo'lsa javob 12 soniya kutilardi va sahifa
# "osilib" qolardi. Kichik bo'lak + frontenddagi takror so'rov ancha
# yaxshiroq: keshdagi yorliqlar darhol keladi, yangilari asta to'ladi.
NEW_PER_REQUEST = 8
NEW_PER_REQUEST_STAFF = 30


class TranslateThrottle(ScopedRateThrottle):
    scope = "translate"


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([TranslateThrottle])
def ui_translate(request):
    """Interfeys yorliqlarini tarjima qiladi (keshdan + bir oz yangisini).

    So'rov: `{"texts": ["Masalalar", ...], "target": "en"}`
    Javob:  `{"enabled": true, "translations": {"Masalalar": "Problems"},
              "pending": 12}`

    `pending` — hali tarjima qilinmagan yorliqlar soni. Frontend keyingi
    sahifada qayta so'raydi va lug'at asta-sekin to'ladi.
    """
    target = (request.data.get("target") or "en").strip().lower()
    texts = request.data.get("texts") or []

    if not isinstance(texts, list):
        return Response({"detail": "`texts` ro'yxat bo'lishi kerak."}, status=400)
    if not is_enabled() or target == "uz":
        return Response({"enabled": False, "translations": {}, "pending": 0})

    # Faqat satrlar, takrorlarsiz, chegara ichida
    cleaned = list(
        dict.fromkeys(
            text.strip() for text in texts if isinstance(text, str) and text.strip()
        )
    )[:MAX_TEXTS]

    from .models import TranslationCache
    from .translate import cache_key

    keys = {text: cache_key(text, "uz", target) for text in cleaned}
    cached = dict(
        TranslationCache.objects.filter(key__in=keys.values()).values_list(
            "key", "translated_text"
        )
    )

    translations: dict[str, str] = {}
    missing: list[str] = []
    for text, key in keys.items():
        if key in cached:
            translations[text] = cached[key]
        else:
            missing.append(text)

    # Yangi matnlar — cheklangan miqdorda. Xodimga kengroq chegara:
    # panelga kirgan admin lug'atni bir necha yangilashda to'ldirib qo'yadi.
    limit = NEW_PER_REQUEST_STAFF if getattr(request.user, "is_staff_member", False) else NEW_PER_REQUEST
    for text in missing[:limit]:
        result = translate(text, source="uz", target=target)
        if result:
            translations[text] = result

    pending = max(0, len(missing) - limit)
    return Response({"enabled": True, "translations": translations, "pending": pending})


@api_view(["GET", "PATCH"])
@permission_classes([IsStaff])
def translation_cache(request):
    """Keshdagi tarjimalarni ko'rish va TUZATISH.

    Mashina tarjimasi ba'zan yanglishadi (ayniqsa kontekstsiz bitta so'zda:
    "Reyting" → "Note"). Bunday holatda butun lug'atni qo'lda yozishga
    qaytish shart emas — noto'g'ri qatorni bir marta tuzatib qo'yiladi va
    u shu holicha qoladi: kesh keyingi safar provayderga umuman bormaydi.
    """
    from .models import TranslationCache
    from .translate import cache_key

    if request.method == "GET":
        target = (request.query_params.get("target") or "en").lower()
        search = (request.query_params.get("q") or "").strip()
        rows = TranslationCache.objects.filter(target_lang=target)
        if search:
            rows = rows.filter(source_text__icontains=search)
        rows = rows.order_by("source_text")[:500]
        return Response(
            {
                "count": rows.count() if search else TranslationCache.objects.filter(target_lang=target).count(),
                "results": [
                    {
                        "key": row.key,
                        "source_text": row.source_text,
                        "translated_text": row.translated_text,
                        "provider": row.provider,
                        "updated_at": row.updated_at,
                    }
                    for row in rows
                ],
            }
        )

    # PATCH: `{"overrides": {"Reyting": "Rating", ...}, "target": "en"}`
    overrides = request.data.get("overrides") or {}
    target = (request.data.get("target") or "en").strip().lower()
    if not isinstance(overrides, dict):
        return Response({"detail": "`overrides` obyekt bo'lishi kerak."}, status=400)

    saved = 0
    for source_text, translated in list(overrides.items())[:500]:
        if not isinstance(source_text, str) or not isinstance(translated, str):
            continue
        source_text = source_text.strip()
        translated = translated.strip()
        if not source_text or not translated:
            continue
        TranslationCache.objects.update_or_create(
            key=cache_key(source_text, "uz", target),
            defaults={
                "source_lang": "uz",
                "target_lang": target,
                "source_text": source_text[:2000],
                "translated_text": translated,
                "provider": "manual",
            },
        )
        saved += 1

    return Response({"detail": f"{saved} ta tarjima saqlandi.", "saved": saved})


@api_view(["POST"])
@permission_classes([IsStaff])
def admin_translate(request):
    """Kontent maydonlarini tarjima qiladi — admin formasidagi tugma uchun.

    So'rov: `{"texts": ["...", "..."], "source": "uz", "target": "en"}`
    Javob:  `{"translations": {"asl": "tarjima"}, "enabled": true}`
    """
    source = (request.data.get("source") or "uz").strip().lower()
    target = (request.data.get("target") or "en").strip().lower()
    texts = request.data.get("texts") or []

    if isinstance(texts, str):
        texts = [texts]
    if not isinstance(texts, list):
        return Response({"detail": "`texts` ro'yxat bo'lishi kerak."}, status=400)
    if not is_enabled():
        return Response(
            {
                "enabled": False,
                "translations": {},
                "detail": "Tarjima xizmati o'chirilgan (TRANSLATE_PROVIDER=none).",
            }
        )

    # Kontent maydonlari uzun bo'ladi — soni kam, hajmi katta
    rows = [text for text in texts if isinstance(text, str) and text.strip()][:20]
    translations = translate_many(rows, source=source, target=target)

    return Response(
        {
            "enabled": True,
            "translations": translations,
            "failed": [text for text in rows if text.strip() not in translations],
        }
    )
