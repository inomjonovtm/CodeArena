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

    def test_executor_reyestr_bilan_mos(self):
        """`infra/runner/executor.py` dagi LANGUAGES backend reyestri bilan bir xil.

        Bu testning BUTUN MAQSADI shu edi, lekin ilgari executor umuman
        import qilinmasdi: yangi til backendga qo'shilib, runnerda unutilsa,
        barcha testlar o'tar, foydalanuvchi esa har yuborishda SYSTEM_ERROR
        olardi.
        """
        from apps.judge.runner import _executor

        core = _executor()
        if core is None:  # produksiya image'ida infra/ katalogi bo'lmaydi
            self.skipTest("infra/runner katalogi topilmadi")
        self.assertEqual(set(core.LANGUAGES), set(languages.BY_KEY))

    def test_executor_fayl_nomlari_mos(self):
        """Runner fayl nomi bilan backend kengaytmasi mos bo'lsin (Main.java ≠ main.java)."""
        from apps.judge.runner import _executor

        core = _executor()
        if core is None:
            self.skipTest("infra/runner katalogi topilmadi")
        for key, spec in core.LANGUAGES.items():
            with self.subTest(language=key):
                item = languages.BY_KEY[key]
                self.assertTrue(
                    spec["filename"].endswith("." + item.extension),
                    f"{key}: runner fayli {spec['filename']}, backend kengaytmasi .{item.extension}",
                )
