"""Masala chop etish shartlari va egalik chegaralari.

2026-08 auditida topilgan teshiklar uchun regressiya testlari: PATCH orqali
shartlarni chetlab chop etish, boshqa muallifning testlarini ko'rish,
unpublish'dan keyin avto-qayta chop etilish va slug to'qnashuvi.
"""
from __future__ import annotations

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.core.utils import unique_slug
from apps.problems.models import Problem, ProblemStatus, TestCase as ProblemTestCase


def make_user(username: str, role: str = Role.USER) -> User:
    return User.objects.create_user(
        username=username, email=f"{username}@test.uz", password="Parol12345!", role=role
    )


def make_problem(author: User, **extra) -> Problem:
    defaults = dict(
        title_uz="Yig'indi",
        slug=unique_slug(Problem, "yigindi", max_length=120),
        description_uz="Ikkita son yig'indisini toping.",
        difficulty="easy",
        author=author,
    )
    defaults.update(extra)
    return Problem.objects.create(**defaults)


def add_test(problem: Problem, *, is_sample: bool = True, expected: str = "3\n") -> ProblemTestCase:
    return ProblemTestCase.objects.create(
        problem=problem,
        order=problem.test_cases.count() + 1,
        input="1 2\n",
        expected_output=expected,
        is_sample=is_sample,
    )


class PublishGuardTests(TestCase):
    def setUp(self) -> None:
        self.admin = make_user("boshqaruvchi", Role.ADMIN)
        self.setter = make_user("muallif", Role.SETTER)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_testsiz_masala_publish_bolmaydi(self):
        problem = make_problem(self.admin)
        response = self.client.post(f"/api/admin/problems/{problem.pk}/publish/")
        self.assertEqual(response.status_code, 400)

    def test_namunasiz_masala_publish_bolmaydi(self):
        problem = make_problem(self.admin)
        add_test(problem, is_sample=False)
        response = self.client.post(f"/api/admin/problems/{problem.pk}/publish/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("namunaviy", str(response.data))

    def test_bosh_javobli_test_publish_tosadi(self):
        problem = make_problem(self.admin)
        add_test(problem, expected="")
        response = self.client.post(f"/api/admin/problems/{problem.pk}/publish/")
        self.assertEqual(response.status_code, 400)

    def test_custom_checker_kodsiz_tosadi(self):
        problem = make_problem(self.admin, checker_type="custom", checker_code="")
        add_test(problem)
        response = self.client.post(f"/api/admin/problems/{problem.pk}/publish/")
        self.assertEqual(response.status_code, 400)

    def test_togri_masala_publish_boladi(self):
        problem = make_problem(self.admin)
        add_test(problem)
        response = self.client.post(f"/api/admin/problems/{problem.pk}/publish/")
        self.assertEqual(response.status_code, 200, response.data)
        problem.refresh_from_db()
        self.assertEqual(problem.status, ProblemStatus.PUBLISHED)

    def test_patch_orqali_shartsiz_publish_bolmaydi(self):
        """PATCH `status=published` ham `publish` amali bilan bir xil talab qo'yadi."""
        problem = make_problem(self.admin)  # testsiz
        response = self.client.patch(
            f"/api/admin/problems/{problem.pk}/", {"status": "published"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        problem.refresh_from_db()
        self.assertEqual(problem.status, ProblemStatus.DRAFT)

    def test_setter_patch_bilan_publish_qilolmaydi(self):
        """Setterda `problems.publish` huquqi yo'q — PATCH ham o'tmasin."""
        problem = make_problem(self.setter)
        add_test(problem)
        client = APIClient()
        client.force_authenticate(self.setter)
        response = client.patch(
            f"/api/admin/problems/{problem.pk}/", {"status": "published"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        problem.refresh_from_db()
        self.assertEqual(problem.status, ProblemStatus.DRAFT)

    def test_unpublish_rejani_ham_tozalaydi(self):
        """`publish_at` qolsa, beat vazifasi masalani qayta chop etib yuborardi."""
        problem = make_problem(self.admin, status=ProblemStatus.PUBLISHED)
        add_test(problem)
        problem.publish_at = timezone.now() - timezone.timedelta(hours=1)
        problem.save(update_fields=["publish_at"])

        response = self.client.post(f"/api/admin/problems/{problem.pk}/unpublish/")
        self.assertEqual(response.status_code, 200)
        problem.refresh_from_db()
        self.assertEqual(problem.status, ProblemStatus.DRAFT)
        self.assertIsNone(problem.publish_at)

    def test_duplicate_rejasiz_nusxa_yaratadi(self):
        problem = make_problem(self.admin, publish_at=timezone.now())
        add_test(problem)
        response = self.client.post(f"/api/admin/problems/{problem.pk}/duplicate/")
        self.assertEqual(response.status_code, 201)
        clone = Problem.objects.get(pk=response.data["id"])
        self.assertIsNone(clone.publish_at)
        self.assertEqual(clone.status, ProblemStatus.DRAFT)


class OwnershipTests(TestCase):
    def setUp(self) -> None:
        self.setter = make_user("muallif1", Role.SETTER)
        self.other = make_user("muallif2", Role.SETTER)
        self.mine = make_problem(self.setter)
        self.theirs = make_problem(self.other, slug="begona-masala")
        add_test(self.theirs)

        self.client = APIClient()
        self.client.force_authenticate(self.setter)

    def test_setter_begona_testlarni_kormaydi(self):
        """Yashirin testlar va javoblar boshqa muallifga ochilmasin."""
        response = self.client.get(f"/api/admin/test-cases/?problem={self.theirs.pk}")
        self.assertEqual(response.status_code, 200)
        rows = response.data.get("results", response.data)
        self.assertEqual(len(rows), 0)

    def test_setter_begona_masalaga_test_qosholmaydi(self):
        response = self.client.post(
            "/api/admin/test-cases/",
            {"problem": str(self.theirs.pk), "input": "5\n", "expected_output": "5\n"},
            format="json",
        )
        self.assertIn(response.status_code, (403, 404))


class SlugReuseTests(TestCase):
    def test_savatdagi_slug_bilan_toqnashmaydi(self):
        """Soft-delete qilingan masala slugi hali bazada — yangi nom unga
        urilmasdan `-2` qo'shib olishi kerak (ilgari IntegrityError 500)."""
        admin = make_user("boshqaruvchi2", Role.ADMIN)
        problem = make_problem(admin, slug="takror")
        problem.delete()  # soft-delete — qatordagi UNIQUE slug saqlanib qoladi

        candidate = unique_slug(Problem, "takror", max_length=120)
        self.assertNotEqual(candidate, "takror")
        # Yangi slug bilan yaratish xatosiz o'tadi
        make_problem(admin, slug=candidate, title_uz="Takror")
