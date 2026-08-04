"""Avtomatik tarjima — sozlanadigan provayder + doimiy kesh.

Nima uchun kerak: ilgari har bir matn (interfeys yorlig'idan tortib masala
shartigacha) ikki marta yozilardi — `_uz` va `_en`. Bu ish hech qachon oxiriga
yetmaydi: yangi yorliq qo'shilsa yoki matn o'zgarsa, inglizchasi ortda qoladi
va sayt yarim tarjima bo'lib qoladi.

Ikki qaror:

1. **Provayder almashtiriladi.** Sukut bo'yicha MyMemory — kalit talab
   qilmaydi, ya'ni loyiha hech narsa sozlamasdan ham ishlaydi. Kalit
   qo'yilsa DeepL yoki Google'ga o'tadi (sifat yaxshiroq). `none` —
   tarjima butunlay o'chadi.

2. **Har bir matn BIR MARTA tarjima qilinadi.** Natija bazada saqlanadi
   (`TranslationCache`), chunki bepul xizmatlarning kunlik chegarasi bor va
   bir xil matnni qayta-qayta so'rash uni tez tugatadi.

Xatolik hech qachon chaqiruvchini to'xtatmaydi: tarjima bo'lmasa `None`
qaytadi va interfeys asl (o'zbekcha) matnni ko'rsatadi.
"""
from __future__ import annotations

import hashlib
import json
import logging
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

# Bir so'rovdagi eng uzun matn — undan uzunlari bo'linmaydi, o'tkazib
# yuboriladi (masala sharti kabi uzun matnlar admin tomonidan tahrirlanadi)
MAX_CHARS = 4000
TIMEOUT = 12


def _provider() -> str:
    return (getattr(settings, "TRANSLATE_PROVIDER", "") or "mymemory").strip().lower()


def is_enabled() -> bool:
    return _provider() != "none"


def cache_key(text: str, source: str, target: str) -> str:
    digest = hashlib.sha256(f"{source}|{target}|{text}".encode()).hexdigest()
    return digest[:40]


def _fetch(url: str, *, data: bytes | None = None, headers: dict | None = None) -> dict | None:
    request = urllib.request.Request(url, data=data, headers=headers or {})  # noqa: S310
    if request.type not in {"http", "https"}:
        # Manzil sozlamalardan keladi (TRANSLATE_URL), lekin `file://` yoki
        # boshqa sxema kiritilsa server o'z faylini o'qib yuborardi.
        logger.warning("Tarjima manzili qo'llanmaydigan sxemada: %s", request.type)
        return None
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:  # noqa: S310
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Tarjima so'rovi muvaffaqiyatsiz: %s", exc)
        return None


def _mymemory(text: str, source: str, target: str) -> str | None:
    """Kalitsiz ishlaydigan bepul xizmat. Anonim chegara ~5000 belgi/kun."""
    params = {"q": text, "langpair": f"{source}|{target}"}
    email = getattr(settings, "TRANSLATE_EMAIL", "")
    if email:
        # Email ko'rsatilsa kunlik chegara ikki barobar oshadi
        params["de"] = email
    url = f"https://api.mymemory.translated.net/get?{urllib.parse.urlencode(params)}"
    payload = _fetch(url)
    if not payload:
        return None
    status = payload.get("responseStatus")
    if status not in (200, "200"):
        logger.warning("MyMemory rad etdi: %s", payload.get("responseDetails"))
        return None
    result = (payload.get("responseData") or {}).get("translatedText")
    return result or None


def _deepl(text: str, source: str, target: str) -> str | None:
    key = getattr(settings, "TRANSLATE_API_KEY", "")
    if not key:
        return None
    host = "api-free.deepl.com" if key.endswith(":fx") else "api.deepl.com"
    data = urllib.parse.urlencode(
        {"text": text, "source_lang": source.upper(), "target_lang": target.upper()}
    ).encode()
    payload = _fetch(
        f"https://{host}/v2/translate",
        data=data,
        headers={
            "Authorization": f"DeepL-Auth-Key {key}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    if not payload:
        return None
    rows = payload.get("translations") or []
    return rows[0].get("text") if rows else None


def _google(text: str, source: str, target: str) -> str | None:
    key = getattr(settings, "TRANSLATE_API_KEY", "")
    if not key:
        return None
    data = urllib.parse.urlencode(
        {"q": text, "source": source, "target": target, "format": "text", "key": key}
    ).encode()
    payload = _fetch(
        "https://translation.googleapis.com/language/translate/v2",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if not payload:
        return None
    rows = (payload.get("data") or {}).get("translations") or []
    return rows[0].get("translatedText") if rows else None


def _libre(text: str, source: str, target: str) -> str | None:
    """O'z serveringizdagi LibreTranslate (`TRANSLATE_URL` bilan)."""
    base = (getattr(settings, "TRANSLATE_URL", "") or "").rstrip("/")
    if not base:
        return None
    body = {"q": text, "source": source, "target": target, "format": "text"}
    key = getattr(settings, "TRANSLATE_API_KEY", "")
    if key:
        body["api_key"] = key
    payload = _fetch(
        f"{base}/translate",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    return (payload or {}).get("translatedText")


PROVIDERS = {
    "mymemory": _mymemory,
    "deepl": _deepl,
    "google": _google,
    "libre": _libre,
}


def translate_raw(text: str, *, source: str = "uz", target: str = "en") -> str | None:
    """Keshsiz, to'g'ridan-to'g'ri provayderga murojaat."""
    text = (text or "").strip()
    if not text or not is_enabled() or source == target:
        return None
    if len(text) > MAX_CHARS:
        logger.info("Matn juda uzun (%s belgi) — tarjima qilinmadi", len(text))
        return None

    handler = PROVIDERS.get(_provider())
    if handler is None:
        logger.warning("Noma'lum tarjima provayderi: %s", _provider())
        return None
    return handler(text, source, target)


def translate(text: str, *, source: str = "uz", target: str = "en", use_cache: bool = True) -> str | None:
    """Keshdan oladi, bo'lmasa tarjima qiladi va keshga yozadi."""
    from .models import TranslationCache

    text = (text or "").strip()
    if not text or source == target:
        return None

    key = cache_key(text, source, target)
    if use_cache:
        hit = TranslationCache.objects.filter(key=key).values_list("translated_text", flat=True).first()
        if hit:
            return hit

    result = translate_raw(text, source=source, target=target)
    if not result:
        return None

    TranslationCache.objects.update_or_create(
        key=key,
        defaults={
            "source_lang": source,
            "target_lang": target,
            "source_text": text[:2000],
            "translated_text": result,
            "provider": _provider(),
        },
    )
    return result


def translate_many(
    texts: list[str], *, source: str = "uz", target: str = "en"
) -> dict[str, str]:
    """Bir nechta matn — keshdagilari bitta so'rov bilan olinadi.

    Qaytadi: `{asl matn: tarjima}`. Tarjima qilinmagan matnlar umuman
    kalit sifatida ham qaytmaydi — chaqiruvchi asl matnni ishlatadi.
    """
    from .models import TranslationCache

    cleaned = [(text or "").strip() for text in texts]
    cleaned = [text for text in cleaned if text]
    if not cleaned or source == target:
        return {}

    keys = {text: cache_key(text, source, target) for text in dict.fromkeys(cleaned)}
    cached = {
        row.key: row.translated_text
        for row in TranslationCache.objects.filter(key__in=keys.values())
    }

    out: dict[str, str] = {}
    for text, key in keys.items():
        if key in cached:
            out[text] = cached[key]
            continue
        result = translate(text, source=source, target=target)
        if result:
            out[text] = result
    return out
