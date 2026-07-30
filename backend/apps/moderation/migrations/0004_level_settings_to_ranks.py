"""Daraja (1–10) sozlamalari o'rniga rank (Bronza…Afsona) sozlamalari.

Eski `level_*` qatorlari endi hech qayerda o'qilmaydi — ular o'chiriladi va
o'rniga registrdagi `rank_*` qatorlari yaratiladi.
"""
from django.db import migrations

from apps.core.site_settings import SETTING_DEFS

OLD_KEYS = ["levels_enabled", "level_thresholds"]
NEW_KEYS = ["ranks_enabled", "rank_thresholds"]


def to_ranks(apps, schema_editor):
    SiteSetting = apps.get_model("moderation", "SiteSetting")
    SiteSetting.objects.filter(key__in=OLD_KEYS).delete()

    defs = {row[0]: row for row in SETTING_DEFS}
    existing = set(SiteSetting.objects.values_list("key", flat=True))
    for key in NEW_KEYS:
        if key in existing or key not in defs:
            continue
        _, value, value_type, group, label_uz, label_en, description, is_public = defs[key]
        SiteSetting.objects.create(
            key=key, value=value, value_type=value_type, group=group,
            label_uz=label_uz, label_en=label_en, description=description,
            is_public=is_public,
        )


def to_levels(apps, schema_editor):
    """Orqaga qaytish — rank sozlamalari olib tashlanadi."""
    SiteSetting = apps.get_model("moderation", "SiteSetting")
    SiteSetting.objects.filter(key__in=NEW_KEYS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("moderation", "0003_seed_site_settings"),
    ]

    operations = [migrations.RunPython(to_ranks, to_levels)]
