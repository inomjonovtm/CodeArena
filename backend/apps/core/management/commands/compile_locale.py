"""`.po` fayllarni `.mo` ga aylantiradi — GNU gettext'siz.

Django'ning `compilemessages` buyrug'i `msgfmt` dasturini chaqiradi. U
Linuxda odatda bor, Windowsda esa yo'q — natijada tarjima jimgina
qo'llanmay qolardi va buni faqat sahifani ochganda sezish mumkin edi.

MO formati sodda va qat'iy hujjatlashtirilgan, shuning uchun uni shu
yerda o'zimiz yasaymiz: tashqi bog'liqlik ham, platformaga bog'liqlik
ham qolmaydi.

    python manage.py compile_locale
"""
from __future__ import annotations

import re
import struct
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

# `msgid "..."` / `msgstr "..."` va ularning davomi bo'lgan `"..."` qatorlari.
_ENTRY = re.compile(r'^(msgid|msgstr)\s+"(.*)"$')
_CONT = re.compile(r'^"(.*)"$')

_ESCAPES = {"n": "\n", "t": "\t", "r": "\r", '"': '"', "\\": "\\"}


def _unescape(text: str) -> str:
    out, index = [], 0
    while index < len(text):
        char = text[index]
        if char == "\\" and index + 1 < len(text):
            out.append(_ESCAPES.get(text[index + 1], text[index + 1]))
            index += 2
        else:
            out.append(char)
            index += 1
    return "".join(out)


def parse_po(path: Path) -> dict[str, str]:
    """`.po` faylini `{msgid: msgstr}` lug'atiga aylantiradi.

    Izohlar, `#~` bilan boshlanuvchi eskirgan yozuvlar va bo'sh tarjimalar
    tashlab yuboriladi — bo'sh `msgstr` «tarjima yo'q» degani, uni katalogga
    qo'shsak asl matn o'rniga bo'sh satr chiqib qolardi.
    """
    entries: dict[str, str] = {}
    key = value = None
    current = None

    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        match = _ENTRY.match(line)
        if match:
            kind, text = match.group(1), _unescape(match.group(2))
            if kind == "msgid":
                # Oldingi juftlikni yozib qo'yamiz
                if key is not None and value:
                    entries[key] = value
                key, value, current = text, "", "msgid"
            else:
                value, current = text, "msgstr"
            continue

        cont = _CONT.match(line)
        if cont and current:
            piece = _unescape(cont.group(1))
            if current == "msgid":
                key = (key or "") + piece
            else:
                value = (value or "") + piece

    if key is not None and value:
        entries[key] = value
    return entries


def write_mo(entries: dict[str, str], path: Path) -> None:
    """GNU MO faylini yozadi (little-endian, hash jadvalisiz).

    Hash jadvali IXTIYORIY: Python'ning `gettext` moduli uni ishlatmaydi,
    kalitlarni ikkilik qidiruv bilan topadi. Shuning uchun jadval o'lchami
    0 qilib qoldiriladi — fayl kichikroq va kod ancha sodda.
    """
    # Kalitlar SARALANGAN bo'lishi shart — o'quvchi ikkilik qidiruv qiladi.
    items = sorted(entries.items())
    ids = b"\x00".join(k.encode("utf-8") for k, _ in items) + b"\x00" if items else b""
    strs = b"\x00".join(v.encode("utf-8") for _, v in items) + b"\x00" if items else b""

    count = len(items)
    header = 7 * 4
    ids_table = header
    strs_table = ids_table + count * 8
    ids_start = strs_table + count * 8
    strs_start = ids_start + len(ids)

    id_offsets, str_offsets = [], []
    offset = 0
    for key, _ in items:
        length = len(key.encode("utf-8"))
        id_offsets.append((length, ids_start + offset))
        offset += length + 1
    offset = 0
    for _, value in items:
        length = len(value.encode("utf-8"))
        str_offsets.append((length, strs_start + offset))
        offset += length + 1

    out = bytearray()
    out += struct.pack(
        "<7I",
        0x950412DE,  # sehrli son
        0,           # revision
        count,
        ids_table,
        strs_table,
        0,           # hash jadvali o'lchami
        0,           # hash jadvali o'rni
    )
    for length, position in id_offsets:
        out += struct.pack("<2I", length, position)
    for length, position in str_offsets:
        out += struct.pack("<2I", length, position)
    out += ids
    out += strs

    path.write_bytes(bytes(out))


class Command(BaseCommand):
    help = "locale/*/LC_MESSAGES/*.po fayllarini .mo ga kompilyatsiya qiladi."

    def handle(self, *args, **options):
        roots = list(getattr(settings, "LOCALE_PATHS", [])) or [settings.BASE_DIR / "locale"]
        total = 0

        for root in roots:
            for po in Path(root).glob("*/LC_MESSAGES/*.po"):
                entries = parse_po(po)
                # Sarlavha yozuvi (bo'sh `msgid`) katalogda bo'lishi kerak:
                # `gettext` undan kodlash va ko'plik qoidalarini oladi.
                entries.setdefault(
                    "", "Content-Type: text/plain; charset=UTF-8\nLanguage: uz\n"
                )
                mo = po.with_suffix(".mo")
                write_mo(entries, mo)
                total += 1
                # Konsol kodlashi (Windowsda cp1252) Unicode strelkani
                # ko'tara olmaydi — ASCII bilan yozamiz.
                self.stdout.write(f"{po.relative_to(root)} -> {mo.name}  ({len(entries)} ta satr)")

        if not total:
            self.stdout.write(self.style.WARNING("`.po` fayl topilmadi."))
            return
        self.stdout.write(self.style.SUCCESS(f"\n{total} ta katalog kompilyatsiya qilindi."))
