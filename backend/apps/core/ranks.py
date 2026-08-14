"""Reyting darajalari — nomli ranklar (Bronza → Afsona).

Nega raqamli daraja emas: «7-daraja» hech narsa anglatmaydi, «Oltin I» esa
darhol tushunarli va maqtangulik. Har rank uchta bo'linmaga (III → II → I)
ega, shuning uchun bir rankni tugatish uchun ham progress ko'rinib turadi.

Har rankning ikkita rangi bor: `color` — matn/nishon uchun, `color_soft` —
avatar ramkasidagi gradientning ikkinchi to'xtash nuqtasi. Ramka saytda ham,
admin panelda ham shu ikki rangdan yasaladi, shuning uchun bir xil chiqadi.

RANGLAR — BITTA YASHIL OILADAN. Sayt dizayn tizimida faqat ikki rang bor:
oq va yashil. Ilgari bu jadvalda oltita turli tus (bronza jigarrangi, oltin
sarig'i, olmos ko'ki, afsona qizili) yozilgan edi va ular sahifada
palitradan tashqarida turgan yagona joy edi.

Endi zina bitta yashilning pog'onalari bo'ylab ko'tariladi: pastki ranklar
BO'G'IQ sabzavot-yashil, o'rtadagilar TO'YINGAN zumrad, yuqoridagilar esa
CHUQUR o'rmon-yashil. Ya'ni farq tusda emas, TO'YINGANLIK va QUYUQLIKDA.

`color` qiymatlarining HAMMASI oq fonda WCAG AA (4.9:1 dan yuqori) beradi —
frontend uni to'g'ridan-to'g'ri matn rangi sifatida ishlatadi
(`components/site/rank.tsx`), shuning uchun bu shart buzilmasligi kerak.
`color_soft` faqat gradient/ramka uchun, matn ostiga tushmaydi, shuning
uchun u ancha yorug' bo'lishi mumkin.

Rank nomi ("Oltin I") baribir yozuv bilan ko'rsatiladi, ya'ni ma'no rangga
bog'liq emas — dalton foydalanuvchi ham darajani o'qiy oladi.

Chegaralar admin paneldan (`rank_thresholds` sozlamasi) o'zgartiriladi.
"""
from __future__ import annotations

from apps.core import site_settings

# code, name_uz, name_en, division, color, color_soft
LADDER: list[tuple[str, str, str, str, str, str]] = [
    ("bronze_3",  "Bronza",   "Bronze",      "III", "#4c7565", "#8fb3a2"),
    ("bronze_2",  "Bronza",   "Bronze",      "II",  "#4c7565", "#8fb3a2"),
    ("bronze_1",  "Bronza",   "Bronze",      "I",   "#4c7565", "#8fb3a2"),
    ("silver_3",  "Kumush",   "Silver",      "III", "#37795c", "#7fb69c"),
    ("silver_2",  "Kumush",   "Silver",      "II",  "#37795c", "#7fb69c"),
    ("silver_1",  "Kumush",   "Silver",      "I",   "#37795c", "#7fb69c"),
    ("gold_3",    "Oltin",    "Gold",        "III", "#1a7d54", "#57c391"),
    ("gold_2",    "Oltin",    "Gold",        "II",  "#1a7d54", "#57c391"),
    ("gold_1",    "Oltin",    "Gold",        "I",   "#1a7d54", "#57c391"),
    ("platinum_3", "Platina", "Platinum",    "III", "#00814e", "#3fc98a"),
    ("platinum_2", "Platina", "Platinum",    "II",  "#00814e", "#3fc98a"),
    ("platinum_1", "Platina", "Platinum",    "I",   "#00814e", "#3fc98a"),
    ("diamond_3", "Olmos",    "Diamond",     "III", "#007546", "#16b673"),
    ("diamond_2", "Olmos",    "Diamond",     "II",  "#007546", "#16b673"),
    ("diamond_1", "Olmos",    "Diamond",     "I",   "#007546", "#16b673"),
    ("master",    "Usta",     "Master",      "",    "#00693f", "#00a862"),
    ("grandmaster", "Buyuk usta", "Grandmaster", "", "#005b36", "#009455"),
    ("legend",    "Afsona",   "Legend",      "",    "#004d2e", "#35d693"),
]

MAX_TIER = len(LADDER)  # 18

# 2..18 pog'onalarning eng past reytingi (1-pog'ona — shundan pasti).
#
# ZINA YANGI SHKALAGA MOSLANDI. Yangi hisob 800 dan — «Bronza III» dan —
# boshlaydi va har bir pog'ona yechilgan masalalar bilan qo'lga kiritiladi.
# Ilgari boshlang'ich 1500 edi va odam hech narsa qilmasdan turib
# «Kumush I» bo'lib turardi: daraja qo'lga kiritilmagani uchun uning
# qiymati ham yo'q edi.
#
# Oraliqlar pastda TOR (birinchi pog'onalar tez o'tiladi — yangi odam
# harakati darhol natija beradi), yuqorida esa KENG (usta darajasi uzoq
# mehnat talab qiladi).
DEFAULT_THRESHOLDS = [
    900, 1000,                # bronza II, I
    1100, 1200, 1300,         # kumush III, II, I
    1400, 1500, 1600,         # oltin III, II, I
    1700, 1800, 1900,         # platina III, II, I
    2000, 2150, 2300,         # olmos III, II, I
    2450, 2600, 2800,         # usta, buyuk usta, afsona
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
