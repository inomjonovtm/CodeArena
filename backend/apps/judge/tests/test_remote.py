"""Runner javobini verdiktga aylantirish — solishtirish mantig'i.

Kod bajarish xizmati faqat «dastur ishladimi va nima chiqardi» degan
ma'lumotni qaytaradi. TO'G'RI/NOTO'G'RI qarorini backend chiqaradi —
shu funksiya. Uni alohida sinash muhim: xizmat ishga tushmasa ham
verdikt mantig'i tekshirilishi kerak.
"""
from django.test import SimpleTestCase

from apps.judge.remote import _verdict


class VerdictTests(SimpleTestCase):
    def test_javob_mos_kelsa_qabul(self):
        result = _verdict({"expected_output": "5\n"}, {"status": "OK", "stdout": "5\n"})
        self.assertEqual(result.status, "ACCEPTED")

    def test_ortiqcha_boshliq_ahamiyatsiz(self):
        """Oxiridagi bo'sh qator va `\r\n` farq hisoblanmaydi."""
        result = _verdict({"expected_output": "5"}, {"status": "OK", "stdout": "5\r\n\n"})
        self.assertEqual(result.status, "ACCEPTED")

    def test_javob_mos_kelmasa_notogri(self):
        result = _verdict({"expected_output": "5"}, {"status": "OK", "stdout": "6"})
        self.assertEqual(result.status, "WRONG_ANSWER")

    def test_kutilgan_javob_yoq_bolsa_solishtirilmaydi(self):
        """Generator va checker uchun: dastur ishga tushgani yetarli."""
        result = _verdict({"expected_output": None}, {"status": "OK", "stdout": "nimadir"})
        self.assertEqual(result.status, "ACCEPTED")

    def test_xato_holat_ozgarmaydi(self):
        for status in ("TIME_LIMIT_EXCEEDED", "RUNTIME_ERROR", "COMPILE_ERROR",
                       "MEMORY_LIMIT_EXCEEDED", "SYSTEM_ERROR"):
            with self.subTest(status=status):
                result = _verdict({"expected_output": "5"}, {"status": status, "stdout": "5"})
                self.assertEqual(result.status, status)

    def test_olchovlar_kochiriladi(self):
        result = _verdict(
            {"expected_output": "5"},
            {"status": "OK", "stdout": "5", "runtime_ms": 42, "memory_kb": 1024},
        )
        self.assertEqual(result.runtime_ms, 42)
        self.assertEqual(result.memory_kb, 1024)
