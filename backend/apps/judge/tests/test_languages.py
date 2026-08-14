"""Til reyestri va model tanlovlari bir-biriga mos bo'lishi kerak."""
from django.test import SimpleTestCase

from apps.judge import languages
from apps.problems.models import Language


class LanguageRegistryTests(SimpleTestCase):
    def test_model_choices_reyestr_bilan_mos(self):
        """`Problem.language` tanlovlari reyestrdagi kalitlar bilan bir xil.

        Ikkalasi ikki joyda yozilgan (biri migratsiyalar uchun, ikkinchisi
        interfeys metama'lumoti uchun) — mos kelmasa foydalanuvchi tanlagan
        til bajarilmay qolardi.
        """
        self.assertEqual(
            {value for value, _label in Language.choices},
            set(languages.BY_KEY),
        )

    def test_har_bir_tilda_shablon_bor(self):
        for item in languages.LANGUAGES:
            with self.subTest(language=item.key):
                self.assertTrue(item.starter.strip(), "boshlang'ich shablon bo'sh")
                self.assertTrue(item.extension)
                self.assertTrue(item.monaco)

    def test_payload_tartiblangan(self):
        rows = languages.as_payload()
        self.assertEqual(len(rows), len(languages.LANGUAGES))
        self.assertEqual(rows[0]["key"], "python")

    def test_eski_kalitlar_hali_mavjud(self):
        """`starter_code_*` ustunlari shu uchta til uchun — ular yo'qolmasin."""
        for key in languages.LEGACY_KEYS:
            self.assertIn(key, languages.BY_KEY)
