"""Yangiliklar bo'limi olib tashlangach qolgan sozlama qatorlarini tozalaydi.

`site_settings.sync_defaults()` faqat yetishmayotgan qatorlarni yaratadi —
registrdan olib tashlangan kalit bazada o'z-o'zidan yo'qolmaydi va admin
panelidagi «Kontent» guruhida egasiz maydon bo'lib turaverardi.
"""
from django.db import migrations

KEYS = ["news_enabled", "news_per_page"]


def remove_news_settings(apps, schema_editor):
    SiteSetting = apps.get_model("moderation", "SiteSetting")
    SiteSetting.objects.filter(key__in=KEYS).delete()


def noop(apps, schema_editor):
    """Orqaga qaytarish — qatorlarni tiklamaymiz: registrda ular endi yo'q."""


class Migration(migrations.Migration):

    dependencies = [
        ("moderation", "0006_alter_sitesetting_group"),
    ]

    operations = [
        migrations.RunPython(remove_news_settings, noop),
    ]
