"""Sog'liq tekshiruvi.

Bu endpointlar deploy'ning muvaffaqiyat mezoni sifatida ishlatiladi, ya'ni
ular «yashil» desa, jarayon davom etadi. Shuning uchun ular O'ZI to'g'ri
ishlashi va nosozlikda ROSTDAN ham 503 qaytarishi tekshiriladi.
"""
from __future__ import annotations

from unittest import mock

from django.test import TestCase

from apps.core import health


class LivenessTests(TestCase):
    def test_javob_beradi(self):
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_bazaga_tegmaydi(self):
        """Liveness baza yiqilganda ham 200 berishi kerak.

        Aks holda baza uzilganda Docker butun backend konteynerini qayta
        ishga tushirib, vaziyatni yomonlashtirardi.
        """
        with mock.patch.object(health, "_check_database", side_effect=RuntimeError("baza yo'q")):
            response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)


class ReadinessTests(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()

    def test_hammasi_joyida(self):
        response = self.client.get("/health/ready/")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertTrue(body["checks"]["database"]["ok"])
        self.assertTrue(body["checks"]["cache"]["ok"])

    def test_baza_yiqilsa_503(self):
        with mock.patch.object(health, "_check_database", side_effect=RuntimeError("uzildi")):
            response = self.client.get("/health/ready/?refresh=1")
        self.assertEqual(response.status_code, 503)
        body = response.json()
        self.assertEqual(body["status"], "degraded")
        self.assertFalse(body["checks"]["database"]["ok"])
        self.assertIn("uzildi", body["checks"]["database"]["error"])

    def test_kesh_yiqilsa_503(self):
        with mock.patch.object(health, "_check_cache", side_effect=RuntimeError("kesh yo'q")):
            response = self.client.get("/health/ready/?refresh=1")
        self.assertEqual(response.status_code, 503)

    def test_qollanmagan_migratsiya_503(self):
        """`migrate` xizmati tushib qolsa, backend eski sxemada ishlab
        tushunarsiz 500'lar berardi — bu holat ochiq ko'rinishi kerak."""
        with mock.patch.object(health, "_pending_migrations", return_value=["problems.0009_x"]):
            response = self.client.get("/health/ready/?refresh=1")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json()["checks"]["migrations"]["pending"], ["problems.0009_x"]
        )

    def test_judge_yiqilsa_ham_tayyor(self):
        """Judge kritik emas: u ishlamasa submissionlar navbatda qoladi,
        lekin saytning qolgan qismi ishlaydi."""
        with mock.patch("apps.judge.engine.active_backend", return_value="none"):
            response = self.client.get("/health/ready/?refresh=1")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["checks"]["judge"]["ok"])

    def test_natija_keshlanadi(self):
        """Monitoring har 10 soniyada so'rasa ham baza bezovta qilinmasin."""
        self.client.get("/health/ready/")
        with mock.patch.object(health, "_collect") as collect:
            self.client.get("/health/ready/")
        collect.assert_not_called()

    def test_refresh_keshni_chetlab_otadi(self):
        self.client.get("/health/ready/")
        with mock.patch.object(health, "_collect", return_value=({}, True)) as collect:
            self.client.get("/health/ready/?refresh=1")
        collect.assert_called_once()
