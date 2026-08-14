"""Rol → boshqaruv paneliga kirish huquqi.

Bu yerdagi tekshiruvlar bitta savolga javob beradi: «rol o'zgarganda odam
to'g'ri joyga kira oladimi va kira olmaydigan joyga urilmaydimi?»
Rol bilan huquq mos kelmasa, yangi moderator panelga kira olmay qoladi
yoki aksincha — muallif sozlamalarga yetib boradi.
"""
from __future__ import annotations

from django.test import TestCase

from apps.accounts.models import Role, User
from apps.accounts.roles import MODERATOR_GROUP, SETTER_GROUP, apply_role


def make_user(username: str, role: str) -> User:
    return User.objects.create_user(
        username=username, email=f"{username}@test.uz", password="parol12345", role=role
    )


class ApplyRoleTests(TestCase):
    def test_moderator_panelga_kira_olmaydi(self):
        """Moderator `/admin/` ga KIRMAYDI — u faqat administratorniki.

        Panel bazaning to'g'ridan-to'g'ri ko'rinishi: xato darhol va
        qaytarilmas. Moderator kontentni saytning o'z interfeysidan
        boshqaradi. Guruh esa joyida qoladi — `is_staff` yo'q ekan u
        panelga yo'l ochmaydi, lekin rol qaytarilsa hammasi tiklanadi.
        """
        user = make_user("moder", Role.MODERATOR)
        apply_role(user)
        user.refresh_from_db()
        self.assertFalse(user.is_staff)
        self.assertTrue(user.groups.filter(name=MODERATOR_GROUP).exists())

    def test_administrator_panelga_kira_oladi(self):
        user = make_user("boshqaruvchi", Role.ADMIN)
        apply_role(user)
        user.refresh_from_db()
        self.assertTrue(user.is_staff)

    def test_muallif_panelga_kira_olmaydi(self):
        """Muallif Studio'da ishlaydi — boshqaruv paneli unga yopiq."""
        user = make_user("setter", Role.SETTER)
        apply_role(user)
        user.refresh_from_db()
        self.assertFalse(user.is_staff)
        self.assertTrue(user.groups.filter(name=SETTER_GROUP).exists())

    def test_oddiy_foydalanuvchi_hech_qaysi_guruhda_emas(self):
        user = make_user("oddiy", Role.USER)
        apply_role(user)
        user.refresh_from_db()
        self.assertFalse(user.is_staff)
        self.assertFalse(
            user.groups.filter(name__in=[MODERATOR_GROUP, SETTER_GROUP]).exists()
        )

    def test_roldan_tushirilganda_guruh_ham_olinadi(self):
        """Eng xavfli holat: rol pasaytirildi, lekin huquq qolib ketdi."""
        user = make_user("eski", Role.MODERATOR)
        apply_role(user)
        self.assertTrue(user.groups.filter(name=MODERATOR_GROUP).exists())

        user.role = Role.USER
        user.save(update_fields=["role"])
        apply_role(user)
        user.refresh_from_db()

        self.assertFalse(user.is_staff)
        self.assertFalse(user.groups.filter(name=MODERATOR_GROUP).exists())

    def test_qolga_berilgan_guruh_saqlanadi(self):
        """`apply_role` faqat O'ZI boshqaradigan guruhlarga tegadi."""
        from django.contrib.auth.models import Group

        custom = Group.objects.create(name="Maxsus")
        user = make_user("aralash", Role.MODERATOR)
        user.groups.add(custom)
        apply_role(user)

        self.assertTrue(user.groups.filter(name="Maxsus").exists())
        self.assertTrue(user.groups.filter(name=MODERATOR_GROUP).exists())


class ModeratorPermissionTests(TestCase):
    """Moderatorga NIMA ochiq va NIMA yopiq."""

    def setUp(self):
        self.user = make_user("moder2", Role.MODERATOR)
        apply_role(self.user)
        # Huquqlar keshlanadi — yangi obyekt olib, toza holatda tekshiramiz.
        self.user = User.objects.get(pk=self.user.pk)

    def test_kontentni_koradi_va_ozgartiradi(self):
        self.assertTrue(self.user.has_perm("problems.view_problem"))
        self.assertTrue(self.user.has_perm("problems.change_problem"))
        self.assertTrue(self.user.has_perm("content.change_discussion"))
        self.assertTrue(self.user.has_perm("contests.change_contest"))

    def test_ochira_olmaydi(self):
        """O'chirish qaytarib bo'lmaydigan amal — u administratorda qoladi."""
        self.assertFalse(self.user.has_perm("problems.delete_problem"))
        self.assertFalse(self.user.has_perm("content.delete_discussion"))
        self.assertFalse(self.user.has_perm("accounts.delete_user"))

    def test_sozlama_va_rolga_tegmaydi(self):
        self.assertFalse(self.user.has_perm("moderation.change_sitesetting"))
        self.assertFalse(self.user.has_perm("accounts.change_user"))
        self.assertFalse(self.user.has_perm("auth.change_group"))

    def test_audit_jurnalini_faqat_koradi(self):
        self.assertTrue(self.user.has_perm("moderation.view_auditlog"))
        self.assertFalse(self.user.has_perm("moderation.change_auditlog"))


class AdminPanelAccessTests(TestCase):
    """Panelning o'zi rolga qanday javob beradi.

    `/admin/` — Django paneli, bazaning to'g'ridan-to'g'ri ko'rinishi.
    Unga FAQAT administrator kiradi.
    """

    def test_administrator_bosh_sahifani_ochadi(self):
        user = make_user("boshqaruvchi3", Role.ADMIN)
        apply_role(user)
        self.client.force_login(user)
        self.assertEqual(self.client.get("/admin/").status_code, 200)

    def test_moderator_panelga_kirmaydi(self):
        user = make_user("moder3", Role.MODERATOR)
        apply_role(user)
        self.client.force_login(user)
        # `is_staff` yo'q — Django kirish sahifasiga qaytaradi.
        response = self.client.get("/admin/")
        self.assertIn(response.status_code, (302, 403))

    def test_muallif_panelga_kirmaydi(self):
        user = make_user("setter3", Role.SETTER)
        apply_role(user)
        self.client.force_login(user)
        response = self.client.get("/admin/")
        self.assertIn(response.status_code, (302, 403))

    def test_moderator_panel_sahifalarini_ocholmaydi(self):
        """Ichki sahifalar ham yopiq — nafaqat bosh sahifa.

        Bu eng xavfli bo'shliq bo'lardi: bosh sahifa yopilib, jadval
        manzili to'g'ridan-to'g'ri terilganda ochilib qolishi.
        """
        user = make_user("moder4", Role.MODERATOR)
        apply_role(user)
        self.client.force_login(user)

        for url in (
            "/admin/accounts/user/",
            "/admin/accounts/user/add/",
            "/admin/moderation/sitesetting/",
        ):
            with self.subTest(url=url):
                self.assertIn(self.client.get(url).status_code, (302, 403))


class PermissionFlagTests(TestCase):
    """`/api/auth/me/` qaytaradigan bayroqlar rolga mos kelishi."""

    def _flags(self, role: str) -> dict:
        from apps.accounts.serializers import MeSerializer

        user = make_user(f"bayroq_{role}", role)
        apply_role(user)
        user = User.objects.get(pk=user.pk)
        return MeSerializer(user).data["permissions"]

    def test_moderatorda_admin_paneli_yopiq(self):
        flags = self._flags(Role.MODERATOR)
        self.assertFalse(flags["can_access_admin"])
        # Studio ochiq qoladi va moderatsiya huquqlari saqlanadi.
        self.assertTrue(flags["can_access_studio"])
        self.assertTrue(flags["can_moderate_content"])

    def test_administratorda_ochiq(self):
        self.assertTrue(self._flags(Role.ADMIN)["can_access_admin"])

    def test_muallifda_yopiq(self):
        flags = self._flags(Role.SETTER)
        self.assertFalse(flags["can_access_admin"])
        self.assertTrue(flags["can_access_studio"])
