"""7-bo'lim: Elo asosidagi (Codeforces uslubi) reyting hisoblash."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RatingRow:
    user_id: str
    rating_before: int
    actual_rank: int
    contests_played: int


def expected_score(rating_a: int, rating_b: int) -> float:
    return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))


def k_factor(contests_played: int, k_new: int = 40, k_experienced: int = 20) -> int:
    """Yangi foydalanuvchilar uchun K kattaroq — reyting tezroq barqarorlashadi."""
    if contests_played < 6:
        return k_new
    if contests_played < 20:
        return (k_new + k_experienced) // 2
    return k_experienced


def compute_rating_changes(rows: list[RatingRow], *, k_new: int = 40,
                           k_experienced: int = 20) -> dict[str, int]:
    """Har bir ishtirokchi uchun reyting o'zgarishini qaytaradi.

    Kutilgan o'rin — boshqa ishtirokchilarga nisbatan Elo ehtimoli yig'indisi;
    haqiqiy o'rin — contest natijasidagi rank.
    """
    n = len(rows)
    if n < 2:
        return {row.user_id: 0 for row in rows}

    changes: dict[str, int] = {}
    for row in rows:
        expected_rank = 1.0
        for other in rows:
            if other.user_id == row.user_id:
                continue
            # `other` yuqoriroq o'rin egallash ehtimoli
            expected_rank += expected_score(other.rating_before, row.rating_before)

        # Normallashtirilgan natija: 1.0 = birinchi o'rin, 0.0 = oxirgi
        actual_score = (n - row.actual_rank) / (n - 1)
        expected_score_value = (n - expected_rank) / (n - 1)

        k = k_factor(row.contests_played, k_new, k_experienced)
        delta = round(k * (actual_score - expected_score_value) * 2)
        changes[row.user_id] = int(delta)

    return changes
