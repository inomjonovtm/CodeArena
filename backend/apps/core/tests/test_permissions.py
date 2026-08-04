"""Ruxsat tekshiruvining mantiqi.

Bu qatlam buzilsa moderator administrator huquqlarini oladi yoki oddiy
foydalanuvchi admin API'siga kiradi. Testlar bazasiz ishlaydi: sinflar
faqat `request.user` ning bir nechta atributiga tayanadi, shuning uchun
soxta obyekt yetarli.
"""
from __future__ import annotations

from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.core.permissions import (
    ACTION_SUFFIX,
    HasResourcePerm,
    IsAdmin,
    IsAdminOrModeratorReadOnly,
    IsOwnerOrStaff,
    IsStaff,
    require,
)

_next_id = iter(range(1, 10_000))


def fake_user(role: str = "user", codes: set[str] | None = None):
    codes = codes or set()
    # `SimpleNamespace` QIYMAT bo'yicha solishtiriladi, shuning uchun har
    # bir soxta foydalanuvchiga alohida `pk` beriladi — aks holda ikkita
    # boshqa-boshqa foydalanuvchi «teng» chiqib, egalik testi yolg'ondan
    # o'tib ketardi.
    return SimpleNamespace(
        pk=next(_next_id),
        is_authenticated=True,
        role=role,
        permissions=codes,
        has_perm_code=lambda code: code in codes,
    )


ANONYMOUS = SimpleNamespace(is_authenticated=False, role="", permissions=set())


def fake_request(user=None, method: str = "GET"):
    return SimpleNamespace(user=user, method=method)


def fake_view(*, resource: str = "", action: str = "list", overrides: dict | None = None):
    view = SimpleNamespace(action=action)
    if resource:
        view.perm_resource = resource
    if overrides is not None:
        view.perm_actions = overrides
    return view


class IsStaffTests(SimpleTestCase):
    def test_admin_va_moderator_kiradi(self):
        for role in ("admin", "moderator"):
            self.assertTrue(IsStaff().has_permission(fake_request(fake_user(role)), None))

    def test_oddiy_foydalanuvchi_kirmaydi(self):
        self.assertFalse(IsStaff().has_permission(fake_request(fake_user("user")), None))

    def test_mehmon_kirmaydi(self):
        self.assertFalse(IsStaff().has_permission(fake_request(ANONYMOUS), None))

    def test_user_yoq(self):
        self.assertFalse(IsStaff().has_permission(fake_request(None), None))


class IsAdminTests(SimpleTestCase):
    def test_faqat_admin(self):
        self.assertTrue(IsAdmin().has_permission(fake_request(fake_user("admin")), None))
        self.assertFalse(IsAdmin().has_permission(fake_request(fake_user("moderator")), None))


class ReadOnlyForModeratorTests(SimpleTestCase):
    def test_moderator_faqat_oqiydi(self):
        perm = IsAdminOrModeratorReadOnly()
        moderator = fake_user("moderator")
        self.assertTrue(perm.has_permission(fake_request(moderator, "GET"), None))
        self.assertFalse(perm.has_permission(fake_request(moderator, "POST"), None))
        self.assertFalse(perm.has_permission(fake_request(moderator, "DELETE"), None))

    def test_admin_hammasini_qiladi(self):
        perm = IsAdminOrModeratorReadOnly()
        admin = fake_user("admin")
        for method in ("GET", "POST", "PATCH", "DELETE"):
            self.assertTrue(perm.has_permission(fake_request(admin, method), None))


class HasResourcePermTests(SimpleTestCase):
    def test_resurs_korsatilmasa_otkaziladi(self):
        perm = HasResourcePerm()
        self.assertTrue(perm.has_permission(fake_request(fake_user()), fake_view()))

    def test_mehmon_otmaydi(self):
        perm = HasResourcePerm()
        view = fake_view(resource="problems")
        self.assertFalse(perm.has_permission(fake_request(ANONYMOUS), view))

    def test_amal_huquq_kodiga_aylanadi(self):
        perm = HasResourcePerm()
        user = fake_user("moderator", {"problems.view"})
        self.assertTrue(
            perm.has_permission(fake_request(user), fake_view(resource="problems", action="list"))
        )
        # `destroy` → `problems.delete`, bu huquq berilmagan
        self.assertFalse(
            perm.has_permission(
                fake_request(user, "DELETE"), fake_view(resource="problems", action="destroy")
            )
        )

    def test_override_ishlaydi(self):
        perm = HasResourcePerm()
        user = fake_user("admin", {"problems.publish"})
        view = fake_view(resource="problems", action="publish", overrides={"publish": "publish"})
        self.assertTrue(perm.has_permission(fake_request(user, "POST"), view))

    def test_toliq_kod_override(self):
        perm = HasResourcePerm()
        user = fake_user("admin", {"settings.edit"})
        view = fake_view(resource="judge", action="sync", overrides={"sync": "settings.edit"})
        self.assertTrue(perm.has_permission(fake_request(user, "POST"), view))

    def test_yulduzcha_huquq_talab_qilmaydi(self):
        perm = HasResourcePerm()
        view = fake_view(resource="problems", action="ping", overrides={"ping": "*"})
        self.assertTrue(perm.has_permission(fake_request(fake_user()), view))

    def test_nomalum_amal_yozish_uchun_edit_talab_qiladi(self):
        """Ro'yxatda yo'q amal xavfsiz tomonga og'ishi shart.

        Aks holda viewsetga yangi `@action` qo'shilganda u JIMGINA
        himoyasiz qolardi — eng xavfli xato turi.
        """
        perm = HasResourcePerm()
        faqat_view = fake_user("moderator", {"problems.view"})
        view = fake_view(resource="problems", action="qandaydir_yangi_amal")

        self.assertTrue(perm.has_permission(fake_request(faqat_view, "GET"), view))
        self.assertFalse(perm.has_permission(fake_request(faqat_view, "POST"), view))

        edit_bor = fake_user("moderator", {"problems.view", "problems.edit"})
        self.assertTrue(perm.has_permission(fake_request(edit_bor, "POST"), view))

    def test_barcha_standart_amallar_qoplangan(self):
        """CRUD amallarining har biri huquq kodiga bog'langan bo'lishi kerak."""
        for action in ("list", "retrieve", "create", "update", "partial_update", "destroy"):
            self.assertIn(action, ACTION_SUFFIX)


class RequireTests(SimpleTestCase):
    def test_kod_bor_yoq(self):
        perm_class = require("settings.edit")
        self.assertTrue(
            perm_class().has_permission(fake_request(fake_user("admin", {"settings.edit"})), None)
        )
        self.assertFalse(
            perm_class().has_permission(fake_request(fake_user("admin", {"settings.view"})), None)
        )
        self.assertFalse(perm_class().has_permission(fake_request(ANONYMOUS), None))


class IsOwnerOrStaffTests(SimpleTestCase):
    def test_ega_ruxsat_oladi(self):
        user = fake_user()
        obj = SimpleNamespace(user=user)
        self.assertTrue(
            IsOwnerOrStaff().has_object_permission(fake_request(user), None, obj)
        )

    def test_begona_ruxsat_olmaydi(self):
        obj = SimpleNamespace(user=fake_user())
        self.assertFalse(
            IsOwnerOrStaff().has_object_permission(fake_request(fake_user()), None, obj)
        )

    def test_moderator_har_qanday_obyektga(self):
        obj = SimpleNamespace(user=fake_user())
        self.assertTrue(
            IsOwnerOrStaff().has_object_permission(
                fake_request(fake_user("moderator")), None, obj
            )
        )

    def test_author_maydoni_ham_hisobga_olinadi(self):
        user = fake_user()
        obj = SimpleNamespace(author=user)
        self.assertTrue(
            IsOwnerOrStaff().has_object_permission(fake_request(user), None, obj)
        )
