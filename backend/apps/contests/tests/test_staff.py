"""Musobaqa xodimlari (hakamlar) — regressiya.

2026-08 auditida `_sync_problems`/`create`/`update` metodlari noto'g'ri
klassga (ContestStaffSerializer) kirib qolgani topildi: xodim biriktirish
`Contest.objects.create(contest=...)` deb 500 berardi, masalali musobaqa
saqlash esa DRF nested-write assert'ida yiqilardi.
"""
from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.contests.models import Contest, ContestStaff
from apps.problems.models import Problem


def make_user(username: str, role: str = Role.USER) -> User:
    return User.objects.create_user(
        username=username, email=f"{username}@test.uz", password="Parol12345!", role=role
    )


class ContestStaffTests(TestCase):
    def setUp(self) -> None:
        self.admin = make_user("boshqaruvchi", Role.ADMIN)
        self.judge = make_user("hakam", Role.SETTER)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

        now = timezone.now()
        self.contest = Contest.objects.create(
            title_uz="Sinov musobaqasi",
            slug="sinov",
            start_time=now + timedelta(hours=1),
            end_time=now + timedelta(hours=3),
            created_by=self.admin,
        )

    def test_xodim_biriktirish_ishlaydi(self):
        response = self.client.post(
            "/api/admin/contest-staff/",
            {"contest": str(self.contest.pk), "user": str(self.judge.pk), "role": "judge"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(
            ContestStaff.objects.filter(contest=self.contest, user=self.judge).exists()
        )

    def test_takror_biriktirish_400(self):
        ContestStaff.objects.create(contest=self.contest, user=self.judge, role="judge")
        response = self.client.post(
            "/api/admin/contest-staff/",
            {"contest": str(self.contest.pk), "user": str(self.judge.pk), "role": "judge"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_masalali_musobaqa_saqlanadi(self):
        """Nested `contest_problems` bilan PATCH — endi DRF assert'ga urilmaydi."""
        problem = Problem.objects.create(
            title_uz="Masala", slug="staff-masala", description_uz="x",
            author=self.admin, is_contest_only=True,
        )
        response = self.client.patch(
            f"/api/admin/contests/{self.contest.pk}/",
            {"contest_problems": [{"problem": str(problem.pk), "points": 100}]},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.contest.contest_problems.count(), 1)
        problem.refresh_from_db()
        self.assertTrue(problem.is_contest_only)
