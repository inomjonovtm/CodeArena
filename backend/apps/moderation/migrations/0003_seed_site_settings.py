"""Registrda e'lon qilingan sozlamalarni bazaga tushiradi.

Ilgari sozlamalar faqat `seed_demo` orqali paydo bo'lardi — demo ma'lumotsiz
o'rnatilgan saytda «Sozlamalar» bo'limi bo'sh qolardi.
"""
from django.db import migrations

from apps.core.site_settings import SETTING_DEFS


def create_settings(apps, schema_editor):
    SiteSetting = apps.get_model("moderation", "SiteSetting")
    existing = set(SiteSetting.objects.values_list("key", flat=True))
    rows = [
        SiteSetting(
            key=key, value=value, value_type=value_type, group=group,
            label_uz=label_uz, label_en=label_en, description=description,
            is_public=is_public,
        )
        for key, value, value_type, group, label_uz, label_en, description, is_public
        in SETTING_DEFS
        if key not in existing
    ]
    SiteSetting.objects.bulk_create(rows)


def noop(apps, schema_editor):
    """Sozlamalar foydali ma'lumot — orqaga qaytishda o'chirilmaydi."""


class Migration(migrations.Migration):

    dependencies = [
        ("moderation", "0002_judgelanguage_announcement_audience_and_more"),
    ]

    operations = [migrations.RunPython(create_settings, noop)]
