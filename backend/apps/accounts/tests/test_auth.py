"""Autentifikatsiya oqimi va uni himoya qiladigan cheklovlar.

Bu fayldagi testlarning yarmi funksiyani emas, HIMOYANI tekshiradi:
parolni tiklash endpointlari uzoq vaqt cheklovsiz turgan edi va ularni
qayta ochib qo'yish juda oson — masalan `@throttle_classes` ni ko'chirish
paytida tushirib qoldirish bilan.
"""
from __future__ import annotations

from django.conf import settings
from django.core import mail
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import AdminSession, EmailVerification, User

VALID_PASSWORD = "TogriParol2026!"


def make_user(username="testuser", email="test@example.com", **extra) -> User:
    return User.objects.create_user(
        username=username, email=email, password=VALID_PASSWORD, **extra
    )


class ThrottleResetMixin:
    """Har bir test toza cheklov hisobi bilan boshlansin.

    DRF cheklovni keshda saqlaydi. Kesh testlar orasida tozalanmasa, bitta
    testdagi so'rovlar keyingisini 429 ga tushirib, sinovlar tartibiga
    bog'liq «gohida yiqiladigan» testlarga aylanardi.
    """

    def setUp(self):
        super().setUp()
        cache.clear()

    def tearDown(self):
        cache.clear()
        super().tearDown()


class RegisterTests(ThrottleResetMixin, APITestCase):
    url = "/api/auth/register/"

    def payload(self, **overrides) -> dict:
        data = {
            "username": "yangi_user",
            "email": "yangi@example.com",
            "full_name": "Yangi Foydalanuvchi",
            # Viloyat/tuman `accounts/regions.py` ro'yxatidan bo'lishi shart
            "region": "Toshkent shahri",
            "district": "Chilonzor",
            "education_place": "1-son maktab",
            "password": VALID_PASSWORD,
            "password_confirm": VALID_PASSWORD,
            "accept_terms": True,
        }
        data.update(overrides)
        return data

    def test_royxatdan_otish(self):
        response = self.client.post(self.url, self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="yangi_user").exists())

    def test_cookie_httponly(self):
        """Token JavaScript'ga ko'rinmasligi kerak — XSS himoyasining asosi."""
        response = self.client.post(self.url, self.payload(), format="json")
        cookie = response.cookies.get(settings.AUTH_COOKIE_ACCESS)
        self.assertIsNotNone(cookie, "Access cookie o'rnatilmadi")
        self.assertTrue(cookie["httponly"])

    def test_shartlarsiz_royxatdan_otib_bolmaydi(self):
        response = self.client.post(self.url, self.payload(accept_terms=False), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_takroriy_email(self):
        make_user(username="bor", email="band@example.com")
        response = self.client.post(self.url, self.payload(email="band@example.com"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_takroriy_email_registri_ahamiyatsiz(self):
        make_user(username="bor", email="band@example.com")
        response = self.client.post(self.url, self.payload(email="BAND@Example.COM"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_zaif_parol_rad_etiladi(self):
        response = self.client.post(
            self.url, self.payload(password="12345678", password_confirm="12345678"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(ThrottleResetMixin, APITestCase):
    url = "/api/auth/login/"

    def setUp(self):
        super().setUp()
        self.user = make_user()

    def test_togri_parol(self):
        response = self.client.post(
            self.url, {"login": "testuser", "password": VALID_PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user", response.data)

    def test_email_bilan_kirish(self):
        response = self.client.post(
            self.url, {"login": "test@example.com", "password": VALID_PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_notogri_parol(self):
        response = self.client.post(
            self.url, {"login": "testuser", "password": "notogri"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mavjud_bolmagan_user(self):
        response = self.client.post(
            self.url, {"login": "yoq", "password": VALID_PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bloklangan_hisob_kira_olmaydi(self):
        self.user.is_banned = True
        self.user.ban_reason = "Qoidabuzarlik"
        self.user.save(update_fields=["is_banned", "ban_reason"])
        response = self.client.post(
            self.url, {"login": "testuser", "password": VALID_PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_faolsiz_hisob_kira_olmaydi(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        response = self.client.post(
            self.url, {"login": "testuser", "password": VALID_PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_cheklangan(self):
        """Parolni brute-force qilishga urinish to'silishi kerak."""
        codes = set()
        for index in range(40):
            response = self.client.post(
                self.url, {"login": "testuser", "password": f"notogri{index}"}, format="json"
            )
            codes.add(response.status_code)
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                break
        self.assertIn(
            status.HTTP_429_TOO_MANY_REQUESTS, codes,
            "Login endpointi cheklanmagan — parolni tanlashga yo'l ochiq",
        )


class MeAndLogoutTests(ThrottleResetMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.user = make_user()

    def test_me_avtorizatsiyasiz_401(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_kirgandan_keyin_me_ishlaydi(self):
        self.client.post(
            "/api/auth/login/", {"login": "testuser", "password": VALID_PASSWORD}, format="json"
        )
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")

    def test_chiqishdan_keyin_me_ishlamaydi(self):
        self.client.post(
            "/api/auth/login/", {"login": "testuser", "password": VALID_PASSWORD}, format="json"
        )
        self.client.post("/api/auth/logout/", {}, format="json")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PasswordResetTests(ThrottleResetMixin, APITestCase):
    forgot_url = "/api/auth/forgot-password/"
    reset_url = "/api/auth/reset-password/"

    def setUp(self):
        super().setUp()
        self.user = make_user()

    def test_javob_email_borligini_oshkor_qilmaydi(self):
        """Aks holda bu endpoint hisob mavjudligini tekshirish vositasiga
        aylanadi va foydalanuvchilar ro'yxatini yig'ish mumkin bo'lardi."""
        bor = self.client.post(self.forgot_url, {"email": "test@example.com"}, format="json")
        cache.clear()
        yoq = self.client.post(self.forgot_url, {"email": "yoq@example.com"}, format="json")

        self.assertEqual(bor.status_code, yoq.status_code)
        self.assertEqual(bor.data, yoq.data)

    def test_xat_yuboriladi(self):
        self.client.post(self.forgot_url, {"email": "test@example.com"}, format="json")
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(
            EmailVerification.objects.filter(user=self.user, purpose="reset").exists()
        )

    def test_email_boyicha_cheklangan(self):
        """ENG MUHIM TEST: bitta manzilga xat yog'dirib bo'lmasligi kerak.

        Faqat IP bo'yicha cheklov yetarli emas edi — hujumchi IP almashtirib
        qurbonning pochtasini ko'mib tashlashi mumkin edi.
        """
        codes = []
        for _ in range(12):
            response = self.client.post(
                self.forgot_url, {"email": "test@example.com"}, format="json"
            )
            codes.append(response.status_code)
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                break

        self.assertIn(
            status.HTTP_429_TOO_MANY_REQUESTS, codes,
            "Parol tiklash endpointi cheklanmagan — email bombardimoniga yo'l ochiq",
        )
        # Yuborilgan xatlar soni ham cheklangan bo'lishi kerak
        self.assertLess(len(mail.outbox), 12)

    def test_notogri_token_bilan_tiklab_bolmaydi(self):
        response = self.client.post(
            self.reset_url,
            {"token": "yolgon-token", "new_password": "BoshqaParol2026!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(VALID_PASSWORD))

    def test_tiklash_ishlaydi_va_sessiyalarni_yopadi(self):
        # Kirib, sessiya yaratamiz
        self.client.post(
            "/api/auth/login/", {"login": "testuser", "password": VALID_PASSWORD}, format="json"
        )
        self.assertTrue(
            AdminSession.objects.filter(user=self.user, revoked_at__isnull=True).exists()
        )

        self.client.post(self.forgot_url, {"email": "test@example.com"}, format="json")
        record = EmailVerification.objects.filter(user=self.user, purpose="reset").latest("created_at")

        yangi_parol = "MutlaqoYangi2026!"
        response = self.client.post(
            self.reset_url, {"token": record.token, "new_password": yangi_parol}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(yangi_parol))
        # Parol o'g'irlangan bo'lsa, o'g'ri ochgan sessiyalar ham yopilishi shart
        self.assertFalse(
            AdminSession.objects.filter(user=self.user, revoked_at__isnull=True).exists(),
            "Parol tiklangach eski sessiyalar yopilmadi",
        )

    def test_token_ikki_marta_ishlamaydi(self):
        self.client.post(self.forgot_url, {"email": "test@example.com"}, format="json")
        record = EmailVerification.objects.filter(user=self.user, purpose="reset").latest("created_at")

        birinchi = self.client.post(
            self.reset_url, {"token": record.token, "new_password": "BirinchiYangi2026!"},
            format="json",
        )
        self.assertEqual(birinchi.status_code, status.HTTP_200_OK)

        ikkinchi = self.client.post(
            self.reset_url, {"token": record.token, "new_password": "IkkinchiYangi2026!"},
            format="json",
        )
        self.assertEqual(ikkinchi.status_code, status.HTTP_400_BAD_REQUEST)

    def test_zaif_yangi_parol_rad_etiladi(self):
        self.client.post(self.forgot_url, {"email": "test@example.com"}, format="json")
        record = EmailVerification.objects.filter(user=self.user, purpose="reset").latest("created_at")

        response = self.client.post(
            self.reset_url, {"token": record.token, "new_password": "12345678"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SecurityHeaderTests(ThrottleResetMixin, APITestCase):
    def test_api_javobida_csp_bor(self):
        response = self.client.get("/api/site/settings/")
        self.assertIn("Content-Security-Policy", response.headers)
        self.assertIn("default-src 'none'", response.headers["Content-Security-Policy"])

    def test_request_id_qaytariladi(self):
        """Foydalanuvchi xato haqida xabar berganda so'rovni topish uchun."""
        response = self.client.get("/api/site/settings/")
        self.assertTrue(response.headers.get("X-Request-ID"))

    def test_kelgan_request_id_saqlanadi(self):
        response = self.client.get("/api/site/settings/", HTTP_X_REQUEST_ID="abc123")
        self.assertEqual(response.headers.get("X-Request-ID"), "abc123")

    def test_xavfli_request_id_tozalanadi(self):
        """Tashqaridan kelgan qiymat logga tushadi — u yerga boshqaruv
        belgilarini kiritib bo'lmasligi kerak."""
        response = self.client.get(
            "/api/site/settings/", HTTP_X_REQUEST_ID="abc\r\nInjected: yes"
        )
        self.assertNotIn("\n", response.headers.get("X-Request-ID", ""))
        self.assertNotIn("\r", response.headers.get("X-Request-ID", ""))
