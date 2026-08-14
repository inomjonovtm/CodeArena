"""Reyting dvigateli — masala yechish orqali o'sadigan ko'rsatkich.

NEGA QAYTA YOZILDI. Ilgari reyting FAQAT olimpiadalarda o'zgarardi. Ammo
platformada odam vaqtining 95 foizini amaliyotda o'tkazadi: yuzta masala
yechgan foydalanuvchining reytingi ham, hech narsa qilmagan odamniki ham
bir xil 1500 bo'lib turardi. Ya'ni ko'rsatkich odamning haqiqiy darajasini
emas, faqat «olimpiadaga kirdimi» degan savolga javob berardi.

YANGI QOIDA — bitta jumla:

    Har bir masalaning o'z qiyinlik reytingi bor. O'zingizdan KUCHLIROQ
    masalani yechsangiz reyting o'sadi; o'zingizdan oson masala uni
    deyarli qimirlatmaydi.

Matematikasi Elo bilan bir xil, faqat raqib — odam emas, MASALA:

    kutilgan = 1 / (1 + 10 ^ ((masala − siz) / 400))
    o'zgarish = K × (1 − kutilgan)

Bundan uchta xossa kelib chiqadi va ular tizimni o'z-o'zidan muvozanatlaydi:

  · Osonni yechish deyarli hech narsa bermaydi (kutilgan ≈ 1 → o'zgarish ≈ 0),
    shuning uchun bir xil darajadagi masalalarni ming marta yechib reyting
    to'plab bo'lmaydi.
  · Qiyinni yechish ko'p beradi — aynan shu o'sish yo'li.
  · Reyting tabiiy ravishda «qanday masalani yecha olasiz» degan darajaga
    yaqinlashadi va o'sha yerda to'xtaydi.

JAZO YO'Q. Noto'g'ri urinish uchun reyting kamaymaydi: mashq qilishdan
qo'rqitadigan tizim mashq platformasiga to'g'ri kelmaydi. Reyting faqat
olimpiadada — boshqa odamlarga nisbatan yomon chiqish qilinganda — pasayadi.

Olimpiada reytingi (`apps.contests.rating`) o'zgarmadi: u ham SHU ustunga
yoziladi, ya'ni foydalanuvchida bitta ko'rsatkich bo'ladi, ikkitasi emas.
"""
from __future__ import annotations

from dataclasses import dataclass

#: Yangi hisob shu qiymatdan boshlaydi — zinaning eng pastidan.
#: Ilgari 1500 edi, ya'ni odam hech narsa qilmasdan turib o'rtada turardi.
START_RATING = 800

#: Reyting shu qiymatdan pastga tushmaydi.
FLOOR_RATING = 400

#: Bitta masala uchun maksimal o'zgarish (K koeffitsiyenti).
#: Tajriba ortgani sayin kamayadi: birinchi masalalar darajani tez topadi,
#: keyin esa reyting barqarorlashadi.
K_NEW = 48
K_LEARNING = 32
K_STABLE = 20


def k_factor(solved_count: int) -> int:
    if solved_count < 10:
        return K_NEW
    if solved_count < 50:
        return K_LEARNING
    return K_STABLE


def expected_score(user_rating: int, problem_rating: int) -> float:
    """Foydalanuvchi shu masalani yecha olish ehtimoli (0..1)."""
    return 1.0 / (1.0 + 10 ** ((problem_rating - user_rating) / 400.0))


def solve_delta(user_rating: int, problem_rating: int, solved_count: int) -> int:
    """Masala BIRINCHI marta yechilganda reyting qancha o'sadi.

    Natija hech qachon manfiy emas: yechish jazolanmaydi.
    """
    k = k_factor(solved_count)
    raw = k * (1.0 - expected_score(user_rating, problem_rating))
    return max(0, round(raw))


@dataclass
class RatingUpdate:
    before: int
    after: int
    delta: int
    reason: str


def apply_solve(user, problem) -> RatingUpdate | None:
    """Yechilgan masala uchun reytingni yangilaydi va tarixga yozadi.

    `None` qaytsa — o'zgarish bo'lmadi (masala juda oson edi), demak
    tarixga ham yozilmaydi: nol qatorlar grafikni ifloslantiradi.
    """
    from .models import RatingChange

    before = user.rating
    delta = solve_delta(before, problem_rating(problem), user.problems_solved)
    if delta <= 0:
        return None

    after = before + delta
    user.rating = after
    user.max_rating = max(user.max_rating, after)
    user.save(update_fields=["rating", "max_rating", "updated_at"])

    RatingChange.objects.create(
        user=user,
        kind=RatingChange.Kind.SOLVE,
        rating_before=before,
        rating_after=after,
        delta=delta,
        problem=problem,
        note=problem.title_uz[:160],
    )
    return RatingUpdate(before, after, delta, "solve")


def problem_rating(problem) -> int:
    """Masalaning qiyinlik reytingi.

    Muallif uni Studio'da qo'lda qo'yishi mumkin; qo'yilmagan bo'lsa
    qiyinlik darajasidan olinadi, ya'ni eski masalalar ham ishlaydi.
    """
    explicit = getattr(problem, "rating", 0) or 0
    if explicit > 0:
        return int(explicit)
    return DIFFICULTY_RATING.get(getattr(problem, "difficulty", ""), 1200)


#: Qiyinlik → taxminiy reyting. Muallif aniqroq qiymat qo'ysa, o'sha ustun.
DIFFICULTY_RATING = {
    "easy": 900,
    "medium": 1400,
    "hard": 1900,
}


def apply_contest(user, *, before: int, delta: int, contest, rank: int | None = None) -> int:
    """Olimpiada natijasini reytingga qo'llaydi va tarixga yozadi."""
    from .models import RatingChange

    after = max(FLOOR_RATING, before + delta)
    user.rating = after
    user.max_rating = max(user.max_rating, after)
    user.save(update_fields=["rating", "max_rating", "updated_at"])

    RatingChange.objects.create(
        user=user,
        kind=RatingChange.Kind.CONTEST,
        rating_before=before,
        rating_after=after,
        delta=after - before,
        contest=contest,
        note=f"{rank}-o'rin" if rank else contest.title_uz[:160],
    )
    return after
