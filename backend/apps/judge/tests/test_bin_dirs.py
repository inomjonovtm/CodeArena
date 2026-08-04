"""`JUDGE_BIN_DIRS` — PATH'da bo'lmagan kompilyatorni topish.

Bu sozlama bo'lmasa, MinGW kabi alohida katalogga o'rnatilgan toolchain
jimgina «o'rnatilmagan» deb hisoblanardi va C++ topshiriqlari izohsiz
`SYSTEM_ERROR` qaytarardi. Shu sababli uning ishlashi testda qadalgan.
"""
from __future__ import annotations

import os
import stat
import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings

from apps.judge import runner


class SearchPathTests(SimpleTestCase):
    @override_settings(JUDGE_BIN_DIRS="")
    def test_bosh_sozlama_pathni_ozgartirmaydi(self):
        self.assertEqual(runner._extra_bin_dirs(), [])
        self.assertEqual(runner._search_path(), os.environ.get("PATH", ""))

    @override_settings(JUDGE_BIN_DIRS="C:/toolchain/bin")
    def test_katalog_path_boshiga_qoshiladi(self):
        """Qo'shimcha katalog OLDINDA turishi kerak — tizimdagi eski
        nusxa emas, aynan sozlamada ko'rsatilgani ishlatilsin."""
        self.assertEqual(runner._extra_bin_dirs(), ["C:/toolchain/bin"])
        self.assertTrue(runner._search_path().startswith("C:/toolchain/bin"))

    @override_settings(JUDGE_BIN_DIRS=f"a{os.pathsep} {os.pathsep}b{os.pathsep}")
    def test_bir_nechta_katalog_va_bosh_boshliqlar(self):
        self.assertEqual(runner._extra_bin_dirs(), ["a", "b"])

    def test_dastur_qoshimcha_katalogdan_topiladi(self):
        with tempfile.TemporaryDirectory() as folder:
            name = "ca-fake-compiler.bat" if os.name == "nt" else "ca-fake-compiler"
            binary = Path(folder) / name
            binary.write_text("", encoding="utf-8")
            binary.chmod(binary.stat().st_mode | stat.S_IEXEC)

            probe = "ca-fake-compiler"
            with override_settings(JUDGE_BIN_DIRS=""):
                self.assertIsNone(runner._which(probe))
            with override_settings(JUDGE_BIN_DIRS=folder):
                self.assertIsNotNone(runner._which(probe))

    @override_settings(JUDGE_BIN_DIRS="C:/toolchain/bin")
    def test_bola_muhitida_path_kengaytiriladi(self):
        """Kompilyator kutubxonalari o'sha katalogda — bola PATH'siz ishlamaydi."""
        self.assertTrue(runner._child_env()["PATH"].startswith("C:/toolchain/bin"))
