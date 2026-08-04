"""MOSS uslubidagi kod o'xshashligini aniqlash (13-bo'lim).

`copydetect` kabi tashqi kutubxonalarga bog'liq bo'lmaslik uchun winnowing
algoritmining yengil implementatsiyasi: kodni normallashtirish → k-gramm →
rolling hash → winnowing fingerprint → Jaccard o'xshashligi.
"""
from __future__ import annotations

import re

K_GRAM = 25
WINDOW = 8

COMMENT_PATTERNS = [
    re.compile(r"#.*?$", re.MULTILINE),          # python
    re.compile(r"//.*?$", re.MULTILINE),          # js / cpp
    re.compile(r"/\*.*?\*/", re.DOTALL),          # blok
    re.compile(r'"""(.*?)"""', re.DOTALL),        # python docstring
    re.compile(r"'''(.*?)'''", re.DOTALL),
]


def normalize(code: str) -> str:
    """Izohlar, bo'shliqlar va o'zgaruvchi nomlarining farqini yo'q qiladi."""
    text = code or ""
    for pattern in COMMENT_PATTERNS:
        text = pattern.sub(" ", text)
    text = text.lower()
    # identifikatorlarni bir xil belgiga almashtirish (o'zgaruvchi nomini o'zgartirib "aldash"ni oldini oladi)
    keywords = {
        "if", "else", "elif", "for", "while", "return", "def", "class", "import",
        "from", "int", "float", "double", "char", "bool", "void", "const", "let",
        "var", "function", "true", "false", "none", "null", "in", "and", "or", "not",
        "print", "cout", "cin", "vector", "string", "include", "using", "namespace", "std",
    }
    tokens = re.findall(r"[a-z_][a-z0-9_]*|\d+|[^\sa-z0-9_]", text)
    normalized = []
    for token in tokens:
        if token in keywords:
            normalized.append(token)
        elif token.isdigit():
            normalized.append("0")
        elif re.match(r"^[a-z_]", token):
            normalized.append("v")
        else:
            normalized.append(token)
    return "".join(normalized)


def _stable_hash(text: str) -> int:
    """Jarayonlar orasida BIR XIL qiymat qaytaradigan hash.

    O'rnatilgan `hash()` satrlar uchun har bir jarayonda boshqacha natija
    beradi (PYTHONHASHSEED tasodifiy). Bir xil kod ikkita celery ishchisida
    turlicha barmoq izi olishi mumkin edi — natija takrorlanmas bo'lib
    qolardi. `blake2b` arzon va deterministik.
    """
    import hashlib

    return int.from_bytes(hashlib.blake2b(text.encode("utf-8"), digest_size=8).digest(), "big")


def _hashes(text: str, k: int = K_GRAM) -> list[int]:
    if len(text) < k:
        return [_stable_hash(text)] if text else []
    base, mod = 257, (1 << 61) - 1
    high = pow(base, k - 1, mod)
    result = []
    current = 0
    for index, char in enumerate(text):
        if index < k:
            current = (current * base + ord(char)) % mod
            if index == k - 1:
                result.append(current)
        else:
            current = ((current - ord(text[index - k]) * high) * base + ord(char)) % mod
            result.append(current)
    return result


def fingerprint(code: str, k: int = K_GRAM, window: int = WINDOW) -> set[int]:
    """Winnowing: har bir oynadan minimal hashni tanlaydi."""
    text = normalize(code)
    hashes = _hashes(text, k)
    if not hashes:
        return set()
    if len(hashes) <= window:
        return {min(hashes)}

    selected: set[int] = set()
    previous_index = -1
    for start in range(len(hashes) - window + 1):
        chunk = hashes[start:start + window]
        min_value = min(chunk)
        min_index = start + chunk.index(min_value)
        if min_index != previous_index:
            selected.add(min_value)
            previous_index = min_index
    return selected


def similarity(code_a: str, code_b: str) -> float:
    """0..1 oralig'idagi o'xshashlik koeffitsienti (Jaccard)."""
    fa, fb = fingerprint(code_a), fingerprint(code_b)
    if not fa or not fb:
        return 0.0
    intersection = len(fa & fb)
    union = len(fa | fb)
    return round(intersection / union, 4) if union else 0.0


def matched_lines(code_a: str, code_b: str, min_length: int = 20) -> list[dict]:
    """Yonma-yon solishtirish uchun mos keladigan qatorlarni topadi."""
    lines_a = [(i, line.strip()) for i, line in enumerate(code_a.splitlines(), 1) if line.strip()]
    lines_b = [(i, line.strip()) for i, line in enumerate(code_b.splitlines(), 1) if line.strip()]
    index_b: dict[str, list[int]] = {}
    for number, line in lines_b:
        index_b.setdefault(normalize(line), []).append(number)

    matches = []
    for number, line in lines_a:
        key = normalize(line)
        if len(key) < min_length:
            continue
        for other in index_b.get(key, []):
            matches.append({"line_a": number, "line_b": other, "text": line[:160]})
            break
    return matches[:200]
