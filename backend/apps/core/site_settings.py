"""Sayt sozlamalari registri — bitta joyda e'lon qilinadi, paneldan boshqariladi.

Nega registr kerak: ilgari sozlamalar faqat `seed_demo` ichida ro'yxat sifatida
bor edi, ya'ni yangi o'rnatilgan bazada ular umuman yo'q edi va kod ularni
o'qimasdi ham (xizmat manzili `.env` dan olinardi). Endi:

* `SETTING_DEFS` — barcha sozlamalarning yagona manbasi (kalit, tip, guruh, izoh);
* `sync_defaults()` — bazada yo'q qatorlarni yaratadi (migratsiya va admin API);
* `get_*()` — kod shu yerdan o'qiydi, qiymat bazada bo'lmasa standart qaytadi.

Qiymatlar qisqa muddatga keshlanadi: har bir submission uchun `SiteSetting`
jadvalini o'qish ortiqcha yuk bo'lardi.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from django.core.cache import cache

CACHE_KEY = "site_settings:values"
CACHE_TTL = 30


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


# key, default, value_type, group, label_uz, label_en, description, is_public
SETTING_DEFS: list[tuple[str, Any, str, str, str, str, str, bool]] = [
    # ------------------------------------------------------------ umumiy
    ("site_name", "CodeArena", "string", "general",
     "Sayt nomi", "Site name", "Brauzer sarlavhasi va xatlarda ishlatiladi", True),
    ("site_description", "Dasturchilar uchun algoritmik masalalar platformasi", "text", "general",
     "Sayt tavsifi", "Site description", "SEO tavsifi va bosh sahifa matni", True),
    ("site_email", "support@codearena.uz", "string", "general",
     "Aloqa emaili", "Contact email", "«Bog'lanish» sahifasida ko'rsatiladi", True),
    ("default_locale", "uz", "string", "general",
     "Standart til", "Default locale", "uz yoki en", True),
    ("registration_open", True, "boolean", "general",
     "Ro'yxatdan o'tish ochiq", "Registration open",
     "O'chirilsa yangi hisob yaratib bo'lmaydi", True),
    ("maintenance_mode", False, "boolean", "general",
     "Texnik ishlar rejimi", "Maintenance mode",
     "Sayt vaqtincha yopiladi (adminlar kira oladi)", True),
    ("maintenance_message", "Sayt texnik ishlar sababli vaqtincha yopiq.", "text", "general",
     "Texnik ishlar matni", "Maintenance message", "", True),

    # --------------------------------------------------- ijtimoiy tarmoqlar
    # Bo'sh qoldirilgan havola futerda umuman ko'rsatilmaydi — shu tufayli
    # ro'yxat doim to'liq e'lon qilinadi, admin faqat kerakligini to'ldiradi.
    ("social_telegram", "", "string", "social",
     "Telegram", "Telegram", "To'liq havola: https://t.me/...", True),
    ("social_instagram", "", "string", "social",
     "Instagram", "Instagram", "To'liq havola: https://instagram.com/...", True),
    ("social_youtube", "", "string", "social",
     "YouTube", "YouTube", "To'liq havola: https://youtube.com/@...", True),
    ("social_github", "", "string", "social",
     "GitHub", "GitHub", "To'liq havola: https://github.com/...", True),
    ("social_linkedin", "", "string", "social",
     "LinkedIn", "LinkedIn", "To'liq havola: https://linkedin.com/company/...", True),
    ("social_facebook", "", "string", "social",
     "Facebook", "Facebook", "To'liq havola: https://facebook.com/...", True),
    ("social_x", "", "string", "social",
     "X (Twitter)", "X (Twitter)", "To'liq havola: https://x.com/...", True),

    # -------------------------------------------------------------- runner
    # Kod bajarish xizmati (`infra/runner`) — ishonchsiz kod o'sha yerda,
    # alohida konteynerda va tarmoqsiz muhitda ishlaydi.
    ("runner_enabled", True, "boolean", "judge",
     "Kod bajarish yoqilgan", "Runner enabled",
     "O'chirilsa yechim yuborib bo'lmaydi", False),
    ("runner_url", _env("RUNNER_URL", "http://localhost:2400"), "string", "judge",
     "Runner manzili", "Runner URL", "Masalan: http://runner:2400", False),
    ("runner_token", _env("RUNNER_TOKEN", ""), "string", "judge",
     "Runner tokeni", "Runner token", "X-Runner-Token sarlavhasi (bo'sh bo'lishi mumkin)", False),
    ("runner_timeout_sec", 120, "number", "judge",
     "So'rov taymauti (s)", "Request timeout (s)",
     "Butun to'plamni bajarish uchun kutish vaqti", False),
    ("runner_health_cache_sec", 30, "number", "judge",
     "Holat keshi (s)", "Health cache (s)", "Tirikligini qayta tekshirish oralig'i", False),
    ("runner_local_fallback", True, "boolean", "judge",
     "Lokal ijro zaxira sifatida", "Local execution fallback",
     "Runner ishlamasa kod shu serverda bajariladi — PRODUKSIYADA O'CHIRING", False),
    ("default_time_limit_ms", 2000, "number", "judge",
     "Standart vaqt limiti (ms)", "Default time limit (ms)", "", False),
    ("default_memory_limit_kb", 262144, "number", "judge",
     "Standart xotira limiti (KB)", "Default memory limit (KB)", "", False),

    # -------------------------------------------------------- xavfsizlik
    ("submission_rate_limit", 10, "number", "security",
     "Daqiqada submission limiti", "Submissions per minute", "", False),
    ("plagiarism_threshold", 0.85, "number", "security",
     "Plagiat chegarasi", "Plagiarism threshold", "0..1 oralig'ida", False),
    ("require_email_verification", False, "boolean", "security",
     "Email tasdiqlash majburiy", "Require email verification",
     "Yoqilsa tasdiqlanmagan hisob yechim yubora olmaydi", True),
    ("max_login_attempts", 10, "number", "security",
     "Kirish urinishlari limiti", "Max login attempts", "Daqiqadagi urinishlar soni", False),

    # ------------------------------------------------------------ kontent
    ("daily_challenge_bonus", 5, "number", "content",
     "Kunlik masala bonusi", "Daily challenge bonus", "", False),
    ("discussions_enabled", True, "boolean", "content",
     "Muhokamalar yoqilgan", "Discussions enabled", "", True),
    ("comments_enabled", True, "boolean", "content",
     "Izohlar yoqilgan", "Comments enabled", "", True),
    ("groups_enabled", True, "boolean", "content",
     "Guruhlar yoqilgan", "Groups enabled", "", True),

    # ------------------------------------------------------------ reyting
    ("points_easy", 10, "number", "rating", "Oson masala balli", "Easy points", "", False),
    ("points_medium", 30, "number", "rating", "O'rta masala balli", "Medium points", "", False),
    ("points_hard", 50, "number", "rating", "Qiyin masala balli", "Hard points", "", False),
    ("starting_rating", 1500, "number", "rating",
     "Boshlang'ich reyting", "Starting rating", "Yangi hisob shu reyting bilan boshlaydi", False),
    ("rating_k_new", 40, "number", "rating",
     "K koeffitsiyenti (yangi)", "K factor (new)", "6 tadan kam musobaqa uchun", False),
    ("rating_k_experienced", 20, "number", "rating",
     "K koeffitsiyenti (tajribali)", "K factor (experienced)", "20+ musobaqa uchun", False),
    ("ranks_enabled", True, "boolean", "rating",
     "Rank tizimi yoqilgan", "Rank system enabled",
     "Profil va reytingda rank (Bronza…Afsona) ko'rsatiladi", True),
    ("rank_thresholds",
     [1000, 1150, 1300, 1400, 1500, 1600, 1700, 1800,
      1900, 2000, 2100, 2250, 2400, 2550, 2700, 2850, 3000],
     "json", "rating",
     "Rank chegaralari", "Rank thresholds",
     "2–18 pog'onalarning eng past reytingi (17 ta o'suvchi son)", True),
]

DEFAULTS: dict[str, Any] = {row[0]: row[1] for row in SETTING_DEFS}
TYPES: dict[str, str] = {row[0]: row[2] for row in SETTING_DEFS}


# --------------------------------------------------------------------- o'qish
def invalidate() -> None:
    cache.delete(CACHE_KEY)


def all_values() -> dict[str, Any]:
    """Standart qiymatlar ustiga bazadagilar qo'yilgan to'liq lug'at."""
    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    values = dict(DEFAULTS)
    try:
        from apps.moderation.models import SiteSetting

        for key, value in SiteSetting.objects.values_list("key", "value"):
            values[key] = value
    except Exception as exc:  # noqa: BLE001 — migratsiyagacha jadval bo'lmasligi mumkin
        logging.getLogger(__name__).debug("Sozlamalarni bazadan o'qib bo'lmadi: %s", exc)

    cache.set(CACHE_KEY, values, CACHE_TTL)
    return values


def get(key: str, default: Any = None) -> Any:
    value = all_values().get(key, DEFAULTS.get(key, default))
    return default if value is None and default is not None else value


def get_str(key: str, default: str = "") -> str:
    value = get(key, default)
    return str(value) if value is not None else default


def get_bool(key: str, default: bool = False) -> bool:
    value = get(key, default)
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on", "ha"}
    return bool(value)


def get_int(key: str, default: int = 0) -> int:
    try:
        return int(float(get(key, default)))
    except (TypeError, ValueError):
        return default


def get_float(key: str, default: float = 0.0) -> float:
    try:
        return float(get(key, default))
    except (TypeError, ValueError):
        return default


def get_list(key: str, default: list | None = None) -> list:
    value = get(key, default)
    return list(value) if isinstance(value, (list, tuple)) else list(default or [])


# --------------------------------------------------------------------- yozish
def sync_defaults() -> int:
    """Registrda bor, bazada yo'q sozlamalarni yaratadi. Yaratilgan sonini qaytaradi."""
    from apps.moderation.models import SiteSetting

    existing = set(SiteSetting.objects.values_list("key", flat=True))
    created = 0
    for key, value, value_type, group, label_uz, label_en, description, is_public in SETTING_DEFS:
        if key in existing:
            continue
        SiteSetting.objects.create(
            key=key, value=value, value_type=value_type, group=group,
            label_uz=label_uz, label_en=label_en, description=description,
            is_public=is_public,
        )
        created += 1
    if created:
        invalidate()
    return created
