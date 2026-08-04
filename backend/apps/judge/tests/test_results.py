"""Judge natijasini solishtirish.

`normalize_output` — butun tekshiruv tizimidagi eng nozik funksiya: u
haddan tashqari qattiq bo'lsa to'g'ri yechim «Wrong Answer» oladi
(foydalanuvchi sababini tushunmaydi va ketadi), haddan tashqari yumshoq
bo'lsa noto'g'ri yechim o'tib ketadi.
"""
from __future__ import annotations

from django.test import SimpleTestCase

from apps.judge.results import ExecutionResult, normalize_output


class NormalizeOutputTests(SimpleTestCase):
    def test_bosh_qiymatlar(self):
        self.assertEqual(normalize_output(None), "")
        self.assertEqual(normalize_output(""), "")

    def test_oxirgi_qator_ozgarishi_ahamiyatsiz(self):
        """`print()` oxiriga `\\n` qo'shadi — bu xato bo'lmasligi kerak."""
        self.assertEqual(normalize_output("42\n"), normalize_output("42"))

    def test_bir_nechta_oxirgi_qator(self):
        self.assertEqual(normalize_output("42\n\n\n"), "42")

    def test_qator_oxiridagi_boshliqlar(self):
        self.assertEqual(normalize_output("1 2 3   \n4 5\t"), "1 2 3\n4 5")

    def test_windows_qator_ajratgichi(self):
        """C++ Windowsda `\\r\\n` chiqaradi — bu farq hisobga olinmasligi kerak."""
        self.assertEqual(normalize_output("a\r\nb\r\n"), "a\nb")

    def test_eski_mac_qator_ajratgichi(self):
        self.assertEqual(normalize_output("a\rb"), "a\nb")

    def test_ichki_bosh_qatorlar_saqlanadi(self):
        """Javob ichidagi bo'sh qator MA'NOLI bo'lishi mumkin."""
        self.assertEqual(normalize_output("a\n\nb"), "a\n\nb")

    def test_boshidagi_boshliq_saqlanadi(self):
        """Chapdagi bo'shliq ba'zi masalalarda (masalan piramida chizish)
        javobning bir qismi — uni kesib tashlash xato bo'lardi."""
        self.assertEqual(normalize_output("  a"), "  a")

    def test_hech_narsa_yozmaslik_bilan_bosh_qator_teng(self):
        self.assertEqual(normalize_output("\n"), normalize_output(""))

    def test_turli_javoblar_teng_bolmaydi(self):
        self.assertNotEqual(normalize_output("42"), normalize_output("43"))
        self.assertNotEqual(normalize_output("1 2"), normalize_output("12"))

    def test_idempotent(self):
        """Ikki marta qo'llash natijani o'zgartirmasligi kerak."""
        for value in ("a\r\nb  \n\n", "  x", "1\n2\n3"):
            once = normalize_output(value)
            self.assertEqual(normalize_output(once), once)


class ExecutionResultTests(SimpleTestCase):
    def test_sukut_qiymatlar(self):
        result = ExecutionResult(status="ACCEPTED")
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.meta, {})
        self.assertIsNone(result.runtime_ms)

    def test_meta_nusxalari_ajratilgan(self):
        """`field(default_factory=dict)` bo'lmasa barcha natijalar bitta
        lug'atni bo'lishardi va bir submissionning ma'lumoti boshqasiga
        oqib o'tardi."""
        first = ExecutionResult(status="ACCEPTED")
        second = ExecutionResult(status="WRONG_ANSWER")
        first.meta["token"] = "abc"
        self.assertEqual(second.meta, {})
