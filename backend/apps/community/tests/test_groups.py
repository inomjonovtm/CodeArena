"""Guruhlar: qo'shilish, rollar, chetlatish va ichki reyting.

Bu qismda avval umuman test yo'q edi, holbuki unda huquq tekshiruvlari
ko'p: kim kimni chiqara oladi, kim kodni yangilaydi, chetlatilgan odam
qaytib kira oladimi. Aynan shular sinaladi.
"""
from __future__ import annotations

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.community.models import Group, GroupBan, GroupJoinRequest, GroupMember


def make_user(username: str, **extra) -> User:
    return User.objects.create_user(
        username=username, email=f"{username}@test.uz", password="Parol12345!", **extra
    )


class GroupBaseTest(TestCase):
    def setUp(self) -> None:
        self.owner = make_user("egasi")
        self.member = make_user("azo")
        self.outsider = make_user("begona")

        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        response = self.client.post("/api/groups/", {"name": "Test guruh"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.group = Group.objects.get(slug=response.data["slug"])

    def as_user(self, user) -> APIClient:
        client = APIClient()
        client.force_authenticate(user)
        return client


class JoinTests(GroupBaseTest):
    def test_yaratuvchi_egasi_boladi(self):
        row = self.group.members.get(user=self.owner)
        self.assertEqual(row.role, GroupMember.Role.OWNER)
        self.assertEqual(self.group.member_count, 1)

    def test_kod_bilan_qoshilish(self):
        client = self.as_user(self.member)
        response = client.post(
            "/api/groups/join/", {"invite_code": self.group.invite_code}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["joined"])
        self.group.refresh_from_db()
        self.assertEqual(self.group.member_count, 2)

    def test_notogri_kod(self):
        response = self.as_user(self.member).post(
            "/api/groups/join/", {"invite_code": "YOQKOD00"}, format="json"
        )
        self.assertEqual(response.status_code, 404)

    def test_qoshilganda_boshlangich_nuqta_saqlanadi(self):
        """Ichki reyting a'zo kirgandan keyingi ballarni hisoblaydi."""
        self.member.total_points = 500
        self.member.problems_solved = 20
        self.member.save(update_fields=["total_points", "problems_solved"])

        self.as_user(self.member).post(
            "/api/groups/join/", {"invite_code": self.group.invite_code}, format="json"
        )
        row = self.group.members.get(user=self.member)
        self.assertEqual(row.points_at_join, 500)
        self.assertEqual(row.solved_at_join, 20)

    def test_ochiq_guruhga_kodsiz_qoshilish(self):
        self.group.privacy = Group.Privacy.OPEN
        self.group.save(update_fields=["privacy"])
        response = self.as_user(self.member).post(f"/api/groups/{self.group.slug}/join-open/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.group.members.filter(user=self.member).exists())

    def test_yopiq_guruhga_kodsiz_qoshilib_bolmaydi(self):
        response = self.as_user(self.member).post(f"/api/groups/{self.group.slug}/join-open/")
        self.assertEqual(response.status_code, 404)  # yopiq guruh ko'rinmaydi

    def test_sorov_bilan_qoshilish_va_tasdiq(self):
        self.group.privacy = Group.Privacy.REQUEST
        self.group.save(update_fields=["privacy"])

        response = self.as_user(self.member).post(
            f"/api/groups/{self.group.slug}/request-join/", {"message": "qo'shsangiz"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        row = GroupJoinRequest.objects.get(group=self.group, user=self.member)
        self.assertEqual(row.status, GroupJoinRequest.Status.PENDING)

        approve = self.client.post(
            f"/api/groups/{self.group.slug}/requests/",
            {"id": row.pk, "decision": "approve"}, format="json",
        )
        self.assertEqual(approve.status_code, 200)
        self.assertTrue(self.group.members.filter(user=self.member).exists())

    def test_sorovlarni_faqat_boshqaruvchi_koradi(self):
        response = self.as_user(self.outsider).get(f"/api/groups/{self.group.slug}/requests/")
        self.assertIn(response.status_code, (403, 404))


class MembershipTests(GroupBaseTest):
    def setUp(self) -> None:
        super().setUp()
        self.as_user(self.member).post(
            "/api/groups/join/", {"invite_code": self.group.invite_code}, format="json"
        )
        self.row = self.group.members.get(user=self.member)

    def test_azo_boshqa_azoni_chiqara_olmaydi(self):
        response = self.as_user(self.member).post(
            f"/api/groups/{self.group.slug}/members/{self.row.pk}/remove/"
        )
        self.assertEqual(response.status_code, 403)

    def test_egasi_azoni_chiqaradi(self):
        response = self.client.post(
            f"/api/groups/{self.group.slug}/members/{self.row.pk}/remove/"
        )
        self.assertEqual(response.status_code, 200)
        self.group.refresh_from_db()
        self.assertEqual(self.group.member_count, 1)

    def test_chetlatilgan_odam_qaytib_kira_olmaydi(self):
        self.client.post(
            f"/api/groups/{self.group.slug}/members/{self.row.pk}/remove/",
            {"ban": "1", "reason": "qoida buzdi"}, format="json",
        )
        self.assertTrue(GroupBan.objects.filter(group=self.group, user=self.member).exists())

        again = self.as_user(self.member).post(
            "/api/groups/join/", {"invite_code": self.group.invite_code}, format="json"
        )
        self.assertEqual(again.status_code, 403)

    def test_moderator_tayinlash(self):
        response = self.client.post(
            f"/api/groups/{self.group.slug}/members/{self.row.pk}/role/",
            {"role": "moderator"}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.row.refresh_from_db()
        self.assertEqual(self.row.role, GroupMember.Role.MODERATOR)

    def test_moderator_azoni_chiqara_oladi(self):
        self.client.post(
            f"/api/groups/{self.group.slug}/members/{self.row.pk}/role/",
            {"role": "moderator"}, format="json",
        )
        third = make_user("uchinchi")
        self.as_user(third).post(
            "/api/groups/join/", {"invite_code": self.group.invite_code}, format="json"
        )
        third_row = self.group.members.get(user=third)

        response = self.as_user(self.member).post(
            f"/api/groups/{self.group.slug}/members/{third_row.pk}/remove/"
        )
        self.assertEqual(response.status_code, 200)

    def test_rolni_faqat_egasi_ozgartiradi(self):
        response = self.as_user(self.member).post(
            f"/api/groups/{self.group.slug}/members/{self.row.pk}/role/",
            {"role": "moderator"}, format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_egalikni_otkazish(self):
        response = self.client.post(
            f"/api/groups/{self.group.slug}/transfer/", {"username": "azo"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.group.refresh_from_db()
        self.assertEqual(self.group.owner_id, self.member.pk)
        self.assertEqual(self.group.members.get(user=self.member).role, GroupMember.Role.OWNER)
        self.assertEqual(self.group.members.get(user=self.owner).role, GroupMember.Role.MODERATOR)

    def test_egasi_chiqa_olmaydi(self):
        response = self.client.post(f"/api/groups/{self.group.slug}/leave/")
        self.assertEqual(response.status_code, 400)


class VisibilityTests(GroupBaseTest):
    def test_taklif_kodi_begonaga_korinmaydi(self):
        self.group.privacy = Group.Privacy.OPEN
        self.group.save(update_fields=["privacy"])
        response = self.as_user(self.outsider).get(f"/api/groups/{self.group.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["invite_code"], "")

    def test_azo_kodni_koradi(self):
        response = self.client.get(f"/api/groups/{self.group.slug}/")
        self.assertTrue(response.data["invite_code"])

    def test_kod_mijoz_tomonidan_tanlanmaydi(self):
        response = self.client.post(
            "/api/groups/", {"name": "Ikkinchi", "invite_code": "MENIMKOD"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotEqual(response.data["invite_code"], "MENIMKOD")

    def test_ochiq_guruh_royxatda_korinadi(self):
        self.group.privacy = Group.Privacy.OPEN
        self.group.save(update_fields=["privacy"])
        response = self.as_user(self.outsider).get("/api/groups/?discover=1")
        slugs = [row["slug"] for row in response.data["results"]]
        self.assertIn(self.group.slug, slugs)

    def test_yopiq_guruh_royxatda_korinmaydi(self):
        response = self.as_user(self.outsider).get("/api/groups/?discover=1")
        slugs = [row["slug"] for row in response.data["results"]]
        self.assertNotIn(self.group.slug, slugs)

    def test_azolar_chegarasi_500_dan_oshmaydi(self):
        response = self.client.patch(
            f"/api/groups/{self.group.slug}/", {"max_members": 100000}, format="json"
        )
        self.assertEqual(response.status_code, 400)


class LeaderboardTests(GroupBaseTest):
    def test_ichki_reyting_qoshilgandan_keyingi_ballni_hisoblaydi(self):
        """Eski hisob bilan kirgan odam avtomatik birinchi bo'lib qolmaydi."""
        self.member.total_points = 1000
        self.member.save(update_fields=["total_points"])
        self.as_user(self.member).post(
            "/api/groups/join/", {"invite_code": self.group.invite_code}, format="json"
        )

        # Egasi guruhda 50 ball to'pladi, a'zo esa hech narsa qilmadi.
        self.owner.total_points = 50
        self.owner.save(update_fields=["total_points"])

        response = self.client.get(f"/api/groups/{self.group.slug}/leaderboard/")
        self.assertEqual(response.data[0]["username"], "egasi")
        self.assertEqual(response.data[0]["group_points"], 50)
        self.assertEqual(response.data[1]["group_points"], 0)

    def test_umumiy_davr_umrbod_ballni_oladi(self):
        self.member.total_points = 1000
        self.member.save(update_fields=["total_points"])
        self.as_user(self.member).post(
            "/api/groups/join/", {"invite_code": self.group.invite_code}, format="json"
        )

        response = self.client.get(f"/api/groups/{self.group.slug}/leaderboard/?period=all")
        self.assertEqual(response.data[0]["username"], "azo")

    def test_statistika(self):
        response = self.client.get(f"/api/groups/{self.group.slug}/stats/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["members"], 1)
        self.assertIn("avg_rating", response.data)

    def test_faollik_tasmasi(self):
        response = self.client.get(f"/api/groups/{self.group.slug}/activity/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(row["kind"] == "joined" for row in response.data))


class UnbanTests(GroupBaseTest):
    """Chetlatishni bekor qilish — 2026-08 auditigacha bu YO'L UMUMAN YO'Q edi
    (bitta noto'g'ri bosish o'quvchini guruhdan abadiy chiqarib yuborardi)."""

    def setUp(self) -> None:
        super().setUp()
        self.as_user(self.member).post(
            "/api/groups/join/", {"invite_code": self.group.invite_code}, format="json"
        )
        row = self.group.members.get(user=self.member)
        self.client.post(
            f"/api/groups/{self.group.slug}/members/{row.pk}/remove/",
            {"ban": "1", "reason": "sinov"}, format="json",
        )
        self.ban = GroupBan.objects.get(group=self.group, user=self.member)

    def test_banlar_royxati(self):
        response = self.client.get(f"/api/groups/{self.group.slug}/bans/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["username"], "azo")

    def test_unban_qaytadan_kirishga_yol_ochadi(self):
        response = self.client.post(
            f"/api/groups/{self.group.slug}/bans/{self.ban.pk}/remove/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(GroupBan.objects.filter(pk=self.ban.pk).exists())

        again = self.as_user(self.member).post(
            "/api/groups/join/", {"invite_code": self.group.invite_code}, format="json"
        )
        self.assertEqual(again.status_code, 201)

    def test_oddiy_azo_unban_qilolmaydi(self):
        response = self.as_user(self.outsider).post(
            f"/api/groups/{self.group.slug}/bans/{self.ban.pk}/remove/"
        )
        self.assertIn(response.status_code, (403, 404))


class ApproveIdempotencyTests(GroupBaseTest):
    """Qo'shilish so'rovi bir marta hal qilinadi — takror bosish 404."""

    def setUp(self) -> None:
        super().setUp()
        self.group.privacy = Group.Privacy.REQUEST
        self.group.save(update_fields=["privacy"])
        self.as_user(self.member).post(
            f"/api/groups/{self.group.slug}/request-join/", {}, format="json"
        )
        self.request_row = GroupJoinRequest.objects.get(group=self.group, user=self.member)

    def test_takror_approve_404(self):
        first = self.client.post(
            f"/api/groups/{self.group.slug}/requests/",
            {"id": self.request_row.pk, "decision": "approve"}, format="json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertTrue(self.group.members.filter(user=self.member).exists())

        second = self.client.post(
            f"/api/groups/{self.group.slug}/requests/",
            {"id": self.request_row.pk, "decision": "approve"}, format="json",
        )
        self.assertEqual(second.status_code, 404)

    def test_notogri_id_500_bermaydi(self):
        response = self.client.post(
            f"/api/groups/{self.group.slug}/requests/",
            {"id": "abc", "decision": "approve"}, format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_tolgan_guruhda_approve_sorovni_buzmaydi(self):
        """Guruh to'lgan bo'lsa so'rov PENDING holicha qoladi (avval
        «tasdiqlangan-u a'zo qo'shilmagan» qorishiq holat qolardi)."""
        self.group.max_members = 1
        self.group.save(update_fields=["max_members"])
        response = self.client.post(
            f"/api/groups/{self.group.slug}/requests/",
            {"id": self.request_row.pk, "decision": "approve"}, format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.request_row.refresh_from_db()
        self.assertEqual(self.request_row.status, GroupJoinRequest.Status.PENDING)
