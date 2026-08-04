"""Qidiruv uchun trigram indekslar.

Sayt qidiruvi `icontains` ishlatadi — SQL'da bu `ILIKE '%so'z%'`. Oddiy
b-tree indeks bunday shablonga yaramaydi (u faqat boshidan mos kelishga
ishlaydi), shuning uchun har bir qidiruv butun jadvalni ketma-ket o'qib
chiqardi. Bir necha ming masala/foydalanuvchida bu sezilarli sekinlik.

`pg_trgm` kengaytmasi + GIN indeks bu shablonni indeksga tushiradi va so'rov
kodini o'zgartirish kerak emas — Postgres rejalashtiruvchisi indeksni o'zi
tanlaydi.

Kengaytma yaratish uchun ruxsat yetmasligi mumkin (ba'zi boshqariladigan
bazalarda). Shu sababli migratsiya **yiqilmaydi**: kengaytma bo'lmasa
ogohlantirish yoziladi va indekslar tashlab ketiladi — sayt avvalgidek
ishlashda davom etadi.
"""
from __future__ import annotations

import logging

from django.db import migrations

logger = logging.getLogger(__name__)

# (indeks nomi, jadval, ustunlar)
INDEXES = [
    ("problems_title_uz_trgm", "problems", ["title_uz"]),
    ("problems_title_en_trgm", "problems", ["title_en"]),
    ("problems_slug_trgm", "problems", ["slug"]),
    ("users_username_trgm", "users", ["username"]),
    ("users_full_name_trgm", "users", ["full_name"]),
    ("contests_title_uz_trgm", "contests", ["title_uz"]),
    ("contests_title_en_trgm", "contests", ["title_en"]),
    ("discussions_title_trgm", "discussions", ["title"]),
    ("tags_name_uz_trgm", "tags", ["name_uz"]),
]


def _extension_available(cursor) -> bool:
    cursor.execute("SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'")
    return cursor.fetchone() is not None


def create(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "pg_trgm kengaytmasini yaratib bo'lmadi (%s). Trigram indekslar "
                "tashlab ketildi — qidiruv ishlaydi, lekin sekinroq. Bazada "
                "superuser huquqi bilan `CREATE EXTENSION pg_trgm;` bajaring.",
                exc,
            )
            return

        if not _extension_available(cursor):
            return

        for name, table, columns in INDEXES:
            cols = ", ".join(f'"{col}" gin_trgm_ops' for col in columns)
            cursor.execute(
                f'CREATE INDEX IF NOT EXISTS "{name}" ON "{table}" USING gin ({cols})'
            )


def drop(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        for name, _table, _columns in INDEXES:
            cursor.execute(f'DROP INDEX IF EXISTS "{name}"')


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_translationcache"),
        # Indekslar shu ilovalarning jadvallariga qo'yiladi — ular
        # yaratilgan bo'lishi kerak.
        ("problems", "0001_initial"),
        ("accounts", "0001_initial"),
        ("contests", "0001_initial"),
        ("content", "0001_initial"),
    ]

    operations = [migrations.RunPython(create, drop)]
