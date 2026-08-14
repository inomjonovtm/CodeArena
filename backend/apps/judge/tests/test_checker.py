"""Javobni tekshirish usullari.

Bu modul «to'g'ri yechim rad etildi» va «noto'g'ri yechim qabul qilindi»
degan ikki eng qimmat xatoning oldini oladi, shuning uchun har bir usul
ikkala tomondan ham qadalgan.
"""
from __future__ import annotations

from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.judge import checker


def problem(**kwargs):
    """Baza tegmasdan checker uchun yetarli «masala»."""
    return SimpleNamespace(
        checker_type=kwargs.get("checker_type", "exact"),
        checker_language=kwargs.get("checker_language", "python"),
        checker_code=kwargs.get("checker_code", ""),
        float_epsilon=kwargs.get("float_epsilon", 1e-6),
    )


class ExactTests(SimpleTestCase):
    def test_qator_oxiridagi_boshliq_kechiriladi(self):
        self.assertTrue(checker.check_exact("5\n", "5   \n\n").ok)

    def test_qator_ichidagi_farq_kechirilmaydi(self):
        self.assertFalse(checker.check_exact("1 2", "1  2").ok)


class TokenTests(SimpleTestCase):
    def test_boshliq_va_qator_farqi_kechiriladi(self):
        self.assertTrue(checker.check_token("1 2 3", "1\n2\n  3\n").ok)

    def test_sozlar_soni_farq_qilsa_xabar_aniq(self):
        result = checker.check_token("1 2", "1 2 3")
        self.assertFalse(result.ok)
        self.assertIn("2 kutilgan", result.message)

    def test_notogri_soz_orni_korsatiladi(self):
        result = checker.check_token("a b c", "a x c")
        self.assertFalse(result.ok)
        self.assertIn("2-so'z", result.message)


class FloatTests(SimpleTestCase):
    def test_kichik_xatolik_kechiriladi(self):
        self.assertTrue(checker.check_float("0.3333333", "0.33333334", 1e-6).ok)

    def test_katta_xatolik_rad_etiladi(self):
        self.assertFalse(checker.check_float("1.0", "1.5", 1e-6).ok)

    def test_nisbiy_xatolik_katta_sonlarda_ishlaydi(self):
        """1e9 atrofidagi sonlarda absolyut epsilon amalda bajarilmas talab —
        nisbiy xatolik bo'lmasa, to'g'ri yechim ham yiqilardi."""
        self.assertTrue(checker.check_float("1000000000.0", "1000000000.0000001", 1e-9).ok)

    def test_son_bolmagan_soz_aynan_solishtiriladi(self):
        self.assertTrue(checker.check_float("YES 1.0", "YES 1.0000001", 1e-6).ok)
        self.assertFalse(checker.check_float("YES 1.0", "NO 1.0", 1e-6).ok)


class PayloadTests(SimpleTestCase):
    def test_bolim_uzunligi_qatorlar_soniga_teng(self):
        payload = checker.build_payload("3\n1 2 3\n", "6\n", "6\n")
        self.assertEqual(payload.split("\n")[:3], ["2", "3", "1 2 3"])

    def test_bosh_matn_nol_qator_beradi(self):
        self.assertTrue(checker.build_payload("", "", "").startswith("0\n0\n0"))

    def test_ajratgichga_oxshash_matn_buzmaydi(self):
        """Uzunlik oldindan berilgani uchun matn ichidagi istalgan qator
        xavfsiz — ajratgich izlanmaydi."""
        payload = checker.build_payload("OK\nWA\n", "3\n", "3\n")
        self.assertEqual(payload.split("\n")[:3], ["2", "OK", "WA"])


class VerdictTests(SimpleTestCase):
    def test_ok_qabul_qilinadi(self):
        self.assertTrue(checker.parse_verdict("OK").ok)
        self.assertTrue(checker.parse_verdict("ok juftlik to'g'ri").ok)

    def test_izoh_ajratib_olinadi(self):
        result = checker.parse_verdict("WA 3-sonda xatolik")
        self.assertFalse(result.ok)
        self.assertEqual(result.message, "3-sonda xatolik")

    def test_bosh_chiqish_tizim_xatosi(self):
        """Checker jim qolsa — bu masalaning nuqsoni, foydalanuvchi xatosi
        emas. Aks holda to'g'ri yechim aybsiz WA olardi."""
        result = checker.parse_verdict("   ")
        self.assertFalse(result.ok)
        self.assertTrue(result.system_error)


class DispatchTests(SimpleTestCase):
    def test_sukut_boyicha_exact(self):
        self.assertFalse(checker.check_many(problem(), [
            {"input": "", "expected": "1 2", "actual": "1  2"},
        ])[0].ok)

    def test_token_tanlansa_boshliq_kechiriladi(self):
        self.assertTrue(checker.check_many(problem(checker_type="token"), [
            {"input": "", "expected": "1 2", "actual": "1  2"},
        ])[0].ok)

    def test_bosh_royxat_bosh_natija(self):
        self.assertEqual(checker.check_many(problem(), []), [])

    def test_custom_checker_kodsiz_tizim_xatosi(self):
        result = checker.check_many(problem(checker_type="custom"), [
            {"input": "", "expected": "", "actual": ""},
        ])[0]
        self.assertTrue(result.system_error)

    def test_needs_program(self):
        self.assertFalse(checker.needs_program(problem()))
        self.assertTrue(checker.needs_program(problem(checker_type="custom")))
