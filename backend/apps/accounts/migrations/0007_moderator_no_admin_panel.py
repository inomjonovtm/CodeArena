"""Moderatordan boshqaruv paneliga kirish huquqini olib tashlaydi.

Qoida o'zgardi: `/admin/` — Django paneli — endi FAQAT administratorga
ochiq (`apps.accounts.roles.apply_role`). Yangi qoida o'zi yangi va rol
o'zgargan foydalanuvchilarga qo'llanadi, lekin bazada ALLAQACHON
`is_staff=True` bilan yozilgan moderatorlar qolib ketardi — ular uchun
hech narsa o'zgarmasdi va nosozlik sezilmasdan davom etardi.

Shuning uchun mavjud yozuvlar shu yerda to'g'rilanadi.

Orqaga qaytarish (`reverse`) ataylab moderatorlarga `is_staff` ni
QAYTARADI: migratsiya orqaga o'ralganda kod ham eski holatga qaytadi,
ya'ni o'sha kod kutgan holat tiklanishi kerak.
"""
from __future__ import annotations

from django.db import migrations


def revoke(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    # `is_superuser` tekshirilmaydi: superuser rolidan qat'i nazar panelga
    # kiradi va uni bu yerda o'chirish tizimga kirishning yagona yo'lini
    # yopib qo'yishi mumkin.
    User.objects.filter(role="moderator", is_staff=True, is_superuser=False).update(
        is_staff=False
    )


def restore(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(role="moderator", is_staff=False).update(is_staff=True)


class Migration(migrations.Migration):
    dependencies = [("accounts", "0006_alter_user_options")]

    operations = [migrations.RunPython(revoke, restore)]
