"""`JUDGE_BIN_DIRS` — PATH'da bo'lmagan kompilyatorni topish.

Bu sozlama bo'lmasa, MinGW kabi alohida katalogga o'rnatilgan toolchain
jimgina «o'rnatilmagan» deb hisoblanardi va C++ topshiriqlari izohsiz
`SYSTEM_ERROR` qaytarardi. Shu sababli uning ishlashi testda qadalgan.

Sozlama faqat LOKAL ijro yo'liga tegishli (ishlab chiqish muhiti):
produksiyada kompilyatorlar runner konteynerining o'z `PATH` ida turadi.
"""
from __future__ import annotations

import os
import shutil
import stat
import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings

from apps.judge import runner


class SearchPathTests(SimpleTestCase):
    def setUp(self) -> None:
        # Testlar `os.environ["PATH"]` ni o'zgartiradi — asl qiymat qaytariladi.
        self._path = os.environ.get("PATH", "")
        self.addCleanup(lambda: os.environ.__setitem__("PATH", self._path))

    @override_settings(JUDGE_BIN_DIRS="")
    def test_bosh_sozlama_pathni_ozgartirmaydi(self):
        self.assertEqual(runner._extra_bin_dirs(), [])
        runner._apply_bin_dirs()
        self.assertEqual(os.environ.get("PATH", ""), self._path)

    @override_settings(JUDGE_BIN_DIRS="C:/toolchain/bin")
    def test_katalog_path_boshiga_qoshiladi(self):
        """Qo'shimcha katalog OLDINDA turishi kerak — tizimdagi eski
        nusxa emas, aynan sozlamada ko'rsatilgani ishlatilsin."""
        self.assertEqual(runner._extra_bin_dirs(), ["C:/toolchain/bin"])
        runner._apply_bin_dirs()
        self.assertTrue(os.environ["PATH"].startswith("C:/toolchain/bin"))

    @override_settings(JUDGE_BIN_DIRS="C:/toolchain/bin")
    def test_takroran_chaqirilsa_path_shishmaydi(self):
        runner._apply_bin_dirs()
        first = os.environ["PATH"]
        runner._apply_bin_dirs()
        self.assertEqual(os.environ["PATH"], first)

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
            self.assertIsNone(shutil.which(probe))

            with override_settings(JUDGE_BIN_DIRS=folder):
                runner._apply_bin_dirs()
                self.assertIsNotNone(shutil.which(probe))
