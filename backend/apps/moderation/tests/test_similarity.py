"""Anti-plagiat algoritmi.

Bu yerdagi natija asosida foydalanuvchi musobaqadan chetlashtiriladi —
noto'g'ri ishlashi odamning mehnatini bekor qiladi. Shuning uchun ikki
tomon ham tekshiriladi: haqiqiy nusxa ANIQLANISHI va mustaqil yechim
ayblanmasligi.
"""
from __future__ import annotations

from django.test import SimpleTestCase

from apps.moderation.similarity import (
    _stable_hash,
    fingerprint,
    matched_lines,
    normalize,
    similarity,
)

ORIGINAL = """
def solve(numbers):
    total = 0
    for value in numbers:
        if value % 2 == 0:
            total += value * 2
        else:
            total -= value
    return total


def main():
    data = [int(x) for x in input().split()]
    print(solve(data))


main()
"""

# Aynan o'sha kod: nomlar o'zgartirilgan, izohlar qo'shilgan.
RENAMED = """
# mening yechimim
def hisobla(sonlar):
    yigindi = 0  # boshlang'ich qiymat
    for son in sonlar:
        if son % 2 == 0:
            yigindi += son * 2
        else:
            yigindi -= son
    return yigindi


def asosiy():
    malumot = [int(k) for k in input().split()]
    print(hisobla(malumot))


asosiy()
"""

# Boshqacha yondashuv — mustaqil yozilgan yechim.
DIFFERENT = """
import sys


def main():
    values = list(map(int, sys.stdin.readline().split()))
    result = sum(v * 2 if v % 2 == 0 else -v for v in values)
    sys.stdout.write(str(result))


if __name__ == "__main__":
    main()
"""


class NormalizeTests(SimpleTestCase):
    def test_izohlar_olib_tashlanadi(self):
        with_comment = normalize("x = 1  # bu izoh")
        without = normalize("x = 1")
        self.assertEqual(with_comment, without)

    def test_blok_izoh_olib_tashlanadi(self):
        self.assertEqual(normalize("int a = 1; /* izoh */"), normalize("int a = 1;"))

    def test_ozgaruvchi_nomi_ahamiyatsiz(self):
        """Nom o'zgartirib «aldash» ishlamasligi kerak — asosiy talab."""
        self.assertEqual(normalize("total = count + 1"), normalize("yigindi = soni + 1"))

    def test_sonlar_bir_xillashtiriladi(self):
        self.assertEqual(normalize("x = 42"), normalize("y = 7"))

    def test_kalit_sozlar_saqlanadi(self):
        """`for` va `while` bir xil ko'rinmasligi kerak."""
        self.assertNotEqual(normalize("for x in y: pass"), normalize("while x: pass"))

    def test_bosh_kod(self):
        self.assertEqual(normalize(""), "")


class FingerprintTests(SimpleTestCase):
    def test_bosh_kod_bosh_barmoq_izi(self):
        self.assertEqual(fingerprint(""), set())

    def test_bir_xil_kod_bir_xil_iz(self):
        self.assertEqual(fingerprint(ORIGINAL), fingerprint(ORIGINAL))

    def test_qisqa_kod_ham_iz_beradi(self):
        self.assertTrue(fingerprint("x=1"))

    def test_hash_deterministik(self):
        """Bir xil matn — bir xil son.

        `hash()` satrlar uchun har jarayonda boshqacha qiymat berardi, ya'ni
        ikkita celery ishchisi bir xil kodni turlicha baholashi mumkin edi.
        """
        self.assertEqual(_stable_hash("salom"), _stable_hash("salom"))
        self.assertNotEqual(_stable_hash("salom"), _stable_hash("xayr"))


class SimilarityTests(SimpleTestCase):
    def test_ozi_bilan_ozi_toliq_mos(self):
        self.assertEqual(similarity(ORIGINAL, ORIGINAL), 1.0)

    def test_nom_ozgartirilgan_nusxa_aniqlanadi(self):
        """Eng ko'p uchraydigan «aldash» usuli — nomlarni almashtirish."""
        score = similarity(ORIGINAL, RENAMED)
        self.assertGreater(
            score, 0.85, f"Nom o'zgartirilgan nusxa aniqlanmadi (o'xshashlik {score})"
        )

    def test_mustaqil_yechim_ayblanmaydi(self):
        """Yolg'on signal — eng zararli xato: aybsiz odam jazolanadi."""
        score = similarity(ORIGINAL, DIFFERENT)
        self.assertLess(
            score, 0.5, f"Mustaqil yechim nusxa deb topildi (o'xshashlik {score})"
        )

    def test_bosh_kod_bilan_nol(self):
        self.assertEqual(similarity(ORIGINAL, ""), 0.0)
        self.assertEqual(similarity("", ""), 0.0)

    def test_simmetrik(self):
        self.assertEqual(similarity(ORIGINAL, RENAMED), similarity(RENAMED, ORIGINAL))

    def test_natija_oraliqda(self):
        for a, b in [(ORIGINAL, RENAMED), (ORIGINAL, DIFFERENT), ("x=1", "y=2")]:
            score = similarity(a, b)
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 1.0)


class MatchedLinesTests(SimpleTestCase):
    def test_mos_qatorlar_topiladi(self):
        matches = matched_lines(ORIGINAL, RENAMED)
        self.assertTrue(matches, "Nusxada mos qatorlar topilishi kerak")
        for row in matches:
            self.assertIn("line_a", row)
            self.assertIn("line_b", row)
            self.assertIn("text", row)

    def test_qisqa_qatorlar_hisobga_olinmaydi(self):
        """`return` yoki `}` kabi qatorlar hamma joyda bir xil — ular
        o'xshashlik dalili emas."""
        matches = matched_lines("return\n}", "return\n}")
        self.assertEqual(matches, [])

    def test_natija_cheklangan(self):
        big = "\n".join(f"some_long_variable_name_{i} = compute_value({i})" for i in range(500))
        self.assertLessEqual(len(matched_lines(big, big)), 200)
