"""Savol javobini tekshirish mantig'i.

Sinov natijasi shu funksiyaga tayanadi: u xato ishlasa, ishtirokchi bahosi
noto'g'ri chiqadi va buni hech kim sezmaydi — shuning uchun har bir tur
ikkala tomondan ham qadalgan.
"""
from __future__ import annotations

from django.test import SimpleTestCase

from apps.assessments.models import Question, QuestionKind


def question(kind: str, **kwargs) -> Question:
    """Bazaga yozmasdan savol yasaydi — `check_answer` sof mantiq."""
    return Question(kind=kind, body_md="?", **kwargs)


class SingleChoiceTests(SimpleTestCase):
    def setUp(self):
        self.q = question(
            QuestionKind.SINGLE,
            options=[
                {"text": "a", "is_correct": False},
                {"text": "b", "is_correct": True},
                {"text": "c", "is_correct": False},
            ],
        )

    def test_togri_variant_qabul_qilinadi(self):
        self.assertTrue(self.q.check_answer(1))

    def test_notogri_variant_rad_etiladi(self):
        self.assertFalse(self.q.check_answer(0))

    def test_javobsiz_rad_etiladi(self):
        self.assertFalse(self.q.check_answer(None))


class MultiChoiceTests(SimpleTestCase):
    def setUp(self):
        self.q = question(
            QuestionKind.MULTI,
            options=[
                {"text": "a", "is_correct": True},
                {"text": "b", "is_correct": False},
                {"text": "c", "is_correct": True},
            ],
        )

    def test_toplam_aynan_mos_kelishi_kerak(self):
        self.assertTrue(self.q.check_answer([0, 2]))
        self.assertTrue(self.q.check_answer([2, 0]))

    def test_qisman_javob_ball_bermaydi(self):
        """Bittasini topib qolganini tashlab ketish «to'g'ri» emas — aks
        holda hamma variantni belgilash eng foydali strategiya bo'lardi."""
        self.assertFalse(self.q.check_answer([0]))
        self.assertFalse(self.q.check_answer([0, 1, 2]))

    def test_royxat_bolmagan_javob_rad_etiladi(self):
        self.assertFalse(self.q.check_answer(0))


class ShortAnswerTests(SimpleTestCase):
    def setUp(self):
        self.q = question(QuestionKind.SHORT, answers=["Python", "python3"])

    def test_katta_kichik_harf_farqi_kechiriladi(self):
        self.assertTrue(self.q.check_answer("PYTHON"))
        self.assertTrue(self.q.check_answer("  python  "))

    def test_muqobil_javob_ham_qabul_qilinadi(self):
        self.assertTrue(self.q.check_answer("python3"))

    def test_boshqa_matn_rad_etiladi(self):
        self.assertFalse(self.q.check_answer("java"))


class NumberAnswerTests(SimpleTestCase):
    def test_aniq_son(self):
        q = question(QuestionKind.NUMBER, answers=["42"])
        self.assertTrue(q.check_answer("42"))
        self.assertFalse(q.check_answer("43"))

    def test_xatolik_doirasi(self):
        q = question(QuestionKind.NUMBER, answers=["3.14159"], number_tolerance=0.01)
        self.assertTrue(q.check_answer("3.14"))
        self.assertFalse(q.check_answer("3.2"))

    def test_verguldan_nuqtaga(self):
        """O'zbek klaviaturasida kasr ko'pincha vergul bilan yoziladi —
        buning uchun javobni rad etish foydalanuvchini adashtiradi."""
        q = question(QuestionKind.NUMBER, answers=["1.5"])
        self.assertTrue(q.check_answer("1,5"))

    def test_son_bolmagan_javob(self):
        q = question(QuestionKind.NUMBER, answers=["10"])
        self.assertFalse(q.check_answer("o'n"))


class CorrectIndexTests(SimpleTestCase):
    def test_bosh_variantlar(self):
        self.assertEqual(question(QuestionKind.SINGLE, options=[]).correct_indexes, [])

    def test_correct_rate_nolga_bolinmaydi(self):
        self.assertEqual(question(QuestionKind.SINGLE).correct_rate, 0.0)
