"""Reyting darajalari — nomli ranklar (Bronza → Afsona).

Nega raqamli daraja emas: «7-daraja» hech narsa anglatmaydi, «Oltin I» esa
darhol tushunarli va maqtangulik. Har rank uchta bo'linmaga (III → II → I)
ega, shuning uchun bir rankni tugatish uchun ham progress ko'rinib turadi.

Har rankning ikkita rangi bor: `color` — matn/nishon uchun, `color_soft` —
avatar ramkasidagi gradientning ikkinchi to'xtash nuqtasi. Ramka saytda ham,
admin panelda ham shu ikki rangdan yasaladi, shuning uchun bir xil chiqadi.

Chegaralar admin paneldan (`rank_thresholds` sozlamasi) o'zgartiriladi.
"""
from __future__ import annotations

from apps.core import site_settings

# code, name_uz, name_en, division, color, color_soft
LADDER: list[tuple[str, str, str, str, str, str]] = [
    ("bronze_3",  "Bronza",   "Bronze",      "III", "#c1783f", "#8a4f22"),
    ("bronze_2",  "Bronza",   "Bronze",      "II",  "#c1783f", "#8a4f22"),
    ("bronze_1",  "Bronza",   "Bronze",      "I",   "#c1783f", "#8a4f22"),
    ("silver_3",  "Kumush",   "Silver",      "III", "#b6c2cf", "#7d8b99"),
    ("silver_2",  "Kumush",   "Silver",      "II",  "#b6c2cf", "#7d8b99"),
    ("silver_1",  "Kumush",   "Silver",      "I",   "#b6c2cf", "#7d8b99"),
    ("gold_3",    "Oltin",    "Gold",        "III", "#f0c04a", "#c2901a"),
    ("gold_2",    "Oltin",    "Gold",        "II",  "#f0c04a", "#c2901a"),
    ("gold_1",    "Oltin",    "Gold",        "I",   "#f0c04a", "#c2901a"),
    ("platinum_3", "Platina", "Platinum",    "III", "#57cfc6", "#218f87"),
    ("platinum_2", "Platina", "Platinum",    "II",  "#57cfc6", "#218f87"),
    ("platinum_1", "Platina", "Platinum",    "I",   "#57cfc6", "#218f87"),
    ("diamond_3", "Olmos",    "Diamond",     "III", "#7db4ff", "#3a72cf"),
    ("diamond_2", "Olmos",    "Diamond",     "II",  "#7db4ff", "#3a72cf"),
    ("diamond_1", "Olmos",    "Diamond",     "I",   "#7db4ff", "#3a72cf"),
    ("master",    "Usta",     "Master",      "",    "#b07cff", "#6f34cf"),
    ("grandmaster", "Buyuk usta", "Grandmaster", "", "#ff7f5c", "#d1421c"),
    ("legend",    "Afsona",   "Legend",      "",    "#ff4d6d", "#ffd166"),
]

MAX_TIER = len(LADDER)  # 18

# 2..18 pog'onalarning eng past reytingi (1-pog'ona — shundan pasti).
# Standart reyting 1500 → «Kumush I»: yangi hisob o'rtadan boshlaydi va
# yuqoriga ham, pastga ham yo'l bor. «Afsona» uchun 3000 kerak.
DEFAULT_THRESHOLDS = [
    1000, 1150,               # bronza II, I
    1300, 1400, 1500,         # kumush III, II, I
    1600, 1700, 1800,         # oltin III, II, I
    1900, 2000, 2100,         # platina III, II, I
    2250, 2400, 2550,         # olmos III, II, I
    2700, 2850, 3000,         # usta, buyuk usta, afsona
]


def thresholds() -> list[int]:
    """Sozlamadagi chegaralar; noto'g'ri bo'lsa standartga qaytadi."""
    raw = site_settings.get_list("rank_thresholds", DEFAULT_THRESHOLDS)
    try:
        values = [int(item) for item in raw]
    except (TypeError, ValueError):
        return list(DEFAULT_THRESHOLDS)

    # Ro'yxat to'liq va qat'iy o'suvchi bo'lishi shart — aks holda pog'ona
    # hisoblanishi buziladi (past rank yuqoridan chiqib qolardi).
    if len(values) != MAX_TIER - 1 or any(
        values[index] >= values[index + 1] for index in range(len(values) - 1)
    ):
        return list(DEFAULT_THRESHOLDS)
    return values


def tier_for(rating: int) -> int:
    """Reytingga mos pog'ona (1..18)."""
    tier = 1
    for bound in thresholds():
        if rating >= bound:
            tier += 1
        else:
            break
    return min(tier, MAX_TIER)


def _row(tier: int) -> dict:
    code, name_uz, name_en, division, color, color_soft = LADDER[tier - 1]
    return {
        "tier": tier,
        "code": code,
        "group": code.split("_")[0],
        "name_uz": f"{name_uz} {division}".strip(),
        "name_en": f"{name_en} {division}".strip(),
        "base_uz": name_uz,
        "base_en": name_en,
        "division": division,
        "color": color,
        "color_soft": color_soft,
    }


def rank_info(rating: int) -> dict:
    """Profil, reyting va avatar ramkasi uchun to'liq rank ma'lumoti."""
    bounds = thresholds()
    tier = tier_for(rating)
    index = tier - 1

    floor = bounds[index - 1] if index > 0 else 0
    ceiling = bounds[index] if index < len(bounds) else None

    if ceiling is None:
        progress, remaining = 100, 0
    else:
        span = max(1, ceiling - floor)
        progress = max(0, min(100, round((rating - floor) / span * 100)))
        remaining = max(0, ceiling - rating)

    return {
        **_row(tier),
        "min_rating": floor,
        "next_rating": ceiling,
        "next_name_uz": _row(tier + 1)["name_uz"] if ceiling is not None else None,
        "progress": progress,
        "to_next": remaining,
        "is_max": ceiling is None,
    }


def rank_table() -> list[dict]:
    """Barcha pog'onalar jadvali — «rank qanday olinadi» bo'limi uchun."""
    bounds = thresholds()
    rows = []
    for tier in range(1, MAX_TIER + 1):
        index = tier - 1
        floor = bounds[index - 1] if index > 0 else 0
        ceiling = bounds[index] if index < len(bounds) else None
        rows.append(
            {
                **_row(tier),
                "min_rating": floor,
                "max_rating": (ceiling - 1) if ceiling else None,
            }
        )
    return rows


def rating_range(tier: int) -> tuple[int, int | None]:
    """Pog'ona uchun reyting oralig'i — admin paneldagi filtr shu orqali."""
    bounds = thresholds()
    tier = max(1, min(MAX_TIER, tier))
    index = tier - 1
    low = bounds[index - 1] if index > 0 else 0
    high = (bounds[index] - 1) if index < len(bounds) else None
    return low, high


def group_range(group: str) -> tuple[int, int | None] | None:
    """Butun rank guruhi (masalan barcha «oltin») uchun reyting oralig'i."""
    tiers = [tier for tier in range(1, MAX_TIER + 1) if _row(tier)["group"] == group]
    if not tiers:
        return None
    low, _ = rating_range(min(tiers))
    _, high = rating_range(max(tiers))
    return low, high


GROUPS: list[dict] = [
    {
        "key": group,
        "name_uz": next(row for row in map(_row, range(1, MAX_TIER + 1)) if row["group"] == group)["base_uz"],
        "name_en": next(row for row in map(_row, range(1, MAX_TIER + 1)) if row["group"] == group)["base_en"],
        "color": next(row for row in map(_row, range(1, MAX_TIER + 1)) if row["group"] == group)["color"],
        "color_soft": next(row for row in map(_row, range(1, MAX_TIER + 1)) if row["group"] == group)["color_soft"],
    }
    for group in dict.fromkeys(code.split("_")[0] for code, *_ in LADDER)
]
