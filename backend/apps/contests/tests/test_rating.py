"""Elo reyting hisobi.

Bu modul pul emas-u, foydalanuvchi uchun eng "og'riqli" raqamni chiqaradi:
reyting noto'g'ri hisoblansa, ishonch bir zumda yo'qoladi va uni orqaga
qaytarib bo'lmaydi (musobaqa qayta o'tkazilmaydi). Shu sababli bu yerdagi
testlar formulaning o'zini emas, uning INVARIANTLARINI tekshiradi —
formula kelajakda o'zgarsa ham quyidagilar buzilmasligi kerak.

Bazaga tegilmaydi: hisob toza funksiyalarda.
"""
from __future__ import annotations

from django.test import SimpleTestCase

from apps.contests.rating import (
    RatingRow,
    compute_rating_changes,
    expected_score,
    k_factor,
)


class ExpectedScoreTests(SimpleTestCase):
    def test_teng_reyting_yarim_ehtimol(self):
        self.assertAlmostEqual(expected_score(1500, 1500), 0.5)

    def test_kuchli_oyinchi_kop_ehtimol(self):
        self.assertGreater(expected_score(1900, 1500), 0.9)

    def test_zaif_oyinchi_kam_ehtimol(self):
        self.assertLess(expected_score(1500, 1900), 0.1)

    def test_simmetriya(self):
        """Ikki ehtimol yig'indisi doim 1 — aks holda reyting «yaratilardi»."""
        for a, b in [(1200, 1800), (1500, 1500), (2400, 900)]:
            self.assertAlmostEqual(expected_score(a, b) + expected_score(b, a), 1.0)


class KFactorTests(SimpleTestCase):
    def test_yangi_ishtirokchi_eng_katta_k(self):
        self.assertEqual(k_factor(0), 40)
        self.assertEqual(k_factor(5), 40)

    def test_orta_bosqich(self):
        self.assertEqual(k_factor(6), 30)
        self.assertEqual(k_factor(19), 30)

    def test_tajribali_ishtirokchi_eng_kichik_k(self):
        self.assertEqual(k_factor(20), 20)
        self.assertEqual(k_factor(500), 20)

    def test_k_kamayib_boradi(self):
        """Tajriba ortgani sari reyting kamroq tebranishi kerak."""
        values = [k_factor(n) for n in (0, 6, 20)]
        self.assertEqual(values, sorted(values, reverse=True))


class ComputeRatingChangesTests(SimpleTestCase):
    @staticmethod
    def _row(uid: str, rating: int, rank: int, played: int = 10) -> RatingRow:
        return RatingRow(
            user_id=uid, rating_before=rating, actual_rank=rank, contests_played=played
        )

    def test_bitta_ishtirokchi_ozgarmaydi(self):
        """Raqibsiz musobaqada reyting o'sib ketmasligi kerak."""
        rows = [self._row("a", 1500, 1)]
        self.assertEqual(compute_rating_changes(rows), {"a": 0})

    def test_bosh_royxat(self):
        self.assertEqual(compute_rating_changes([]), {})

    def test_kutilmagan_galaba_reytingni_oshiradi(self):
        """Zaif ishtirokchi kuchlini yutsa — musbat o'zgarish."""
        rows = [
            self._row("zaif", 1200, 1),
            self._row("kuchli", 2000, 2),
        ]
        changes = compute_rating_changes(rows)
        self.assertGreater(changes["zaif"], 0)
        self.assertLess(changes["kuchli"], 0)

    def test_kutilgan_galaba_kam_beradi(self):
        """Kuchli ishtirokchi zaifni yutsa — o'zgarish kichik bo'ladi.

        Aks holda reytingni faqat zaif raqiblar bilan o'ynab ko'tarish
        mumkin bo'lardi.
        """
        kutilgan = compute_rating_changes([
            self._row("kuchli", 2000, 1),
            self._row("zaif", 1200, 2),
        ])
        kutilmagan = compute_rating_changes([
            self._row("zaif", 1200, 1),
            self._row("kuchli", 2000, 2),
        ])
        self.assertLess(kutilgan["kuchli"], kutilmagan["zaif"])

    def test_yigindisi_nolga_yaqin(self):
        """Reyting tizimdan «yaratilmasligi» yoki yo'qolmasligi kerak.

        Yaxlitlash tufayli aniq 0 bo'lmaydi, lekin farq ishtirokchilar
        soniga nisbatan kichik qolishi shart.
        """
        rows = [
            self._row("a", 1500, 1),
            self._row("b", 1600, 2),
            self._row("c", 1400, 3),
            self._row("d", 1700, 4),
            self._row("e", 1300, 5),
        ]
        total = sum(compute_rating_changes(rows).values())
        self.assertLessEqual(abs(total), len(rows))

    def test_yuqori_orin_har_doim_kop_oladi(self):
        """Bir xil reytingdagilar orasida o'rin tartibi saqlanishi shart."""
        rows = [self._row(f"u{i}", 1500, i + 1) for i in range(6)]
        changes = compute_rating_changes(rows)
        deltas = [changes[f"u{i}"] for i in range(6)]
        self.assertEqual(deltas, sorted(deltas, reverse=True))

    def test_birinchi_orin_musbat_oxirgi_manfiy(self):
        rows = [self._row(f"u{i}", 1500, i + 1) for i in range(4)]
        changes = compute_rating_changes(rows)
        self.assertGreater(changes["u0"], 0)
        self.assertLess(changes["u3"], 0)

    def test_yangi_ishtirokchi_kop_tebranadi(self):
        """K koeffitsienti haqiqatda qo'llanayotganini tekshiradi."""
        yangi = compute_rating_changes([
            self._row("yangi", 1500, 1, played=0),
            self._row("raqib", 1500, 2, played=0),
        ])
        tajribali = compute_rating_changes([
            self._row("tajribali", 1500, 1, played=50),
            self._row("raqib", 1500, 2, played=50),
        ])
        self.assertGreater(yangi["yangi"], tajribali["tajribali"])
