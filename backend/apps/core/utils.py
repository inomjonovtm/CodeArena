import re
import secrets
import unicodedata

TRANSLIT = {
    "‘": "", "’": "", "ʻ": "", "ʼ": "", "'": "", "`": "",
    "ў": "u", "қ": "q", "ғ": "g", "ҳ": "h",
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "j", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "",
    "ы": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def slugify(value: str, max_length: int = 80) -> str:
    """O'zbek (lotin/kirill) matnidan URL-friendly slug hosil qiladi."""
    value = (value or "").strip().lower()
    value = "".join(TRANSLIT.get(ch, ch) for ch in value)
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:max_length] or secrets.token_hex(4)


def unique_slug(model, value: str, *, field: str = "slug", instance=None, max_length: int = 80) -> str:
    base = slugify(value, max_length=max_length - 6)
    candidate = base
    counter = 2
    # Savatdagi (soft-delete) yozuvlar standart menejerda ko'rinmaydi, lekin
    # bazadagi UNIQUE cheklov ularni ham hisobga oladi — shuning uchun bor
    # bo'lsa `all_objects` bilan tekshiramiz, aks holda IntegrityError bo'lardi.
    manager = getattr(model, "all_objects", model._default_manager)
    queryset = manager.all()
    if instance is not None and instance.pk:
        queryset = queryset.exclude(pk=instance.pk)
    while queryset.filter(**{field: candidate}).exists():
        candidate = f"{base}-{counter}"
        counter += 1
    return candidate


def invite_code(length: int = 8) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def to_int(value, default: int, *, low: int | None = None, high: int | None = None) -> int:
    """So'rov parametridan xavfsiz butun son.

    Foydalanuvchi kiritgan `?limit=abc` kabi qiymat 500 emas, standart
    qiymat bilan davom etishi kerak. Chegaralar berilsa, natija ularga
    qisib qo'yiladi.
    """
    try:
        result = int(value)
    except (TypeError, ValueError):
        result = default
    if low is not None:
        result = max(result, low)
    if high is not None:
        result = min(result, high)
    return result
