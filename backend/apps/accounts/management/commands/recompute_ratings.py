"""Reytinglarni noldan qayta hisoblaydi.

NEGA KERAK. Reyting endi yechilgan masalalar qiyinligidan o'sadi
(`apps.accounts.rating`). Eski hisoblarda esa u faqat olimpiadalarda
o'zgargan yoki umuman qimirlamagan — ya'ni yuzta masala yechgan odam ham
hech narsa qilmagan odam bilan bir xil qiymatda turibdi.

Buyruq har bir foydalanuvchining yechilgan masalalarini XRONOLOGIK
tartibda qayta o'tkazadi va reytingni qaytadan quradi. Olimpiada
natijalari tegilmaydi: ular allaqachon tarixda va qayta hisoblash
o'sha paytdagi raqiblar tarkibini tiklashni talab qilardi.

    python manage.py recompute_ratings
    python manage.py recompute_ratings --dry-run
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts import rating as rating_engine
from apps.accounts.models import RatingChange, User
from apps.problems.models import SolvedProblem


class Command(BaseCommand):
    help = "Yechilgan masalalar asosida foydalanuvchi reytinglarini qayta hisoblaydi."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Faqat ko'rsatadi, saqlamaydi.")
        parser.add_argument("--user", help="Faqat bitta username uchun.")

    def handle(self, *args, **options):
        dry = options["dry_run"]
        users = User.objects.all().order_by("username")
        if options.get("user"):
            users = users.filter(username=options["user"])

        changed = 0
        for user in users:
            solves = (
                SolvedProblem.objects.filter(user=user)
                .select_related("problem")
                .order_by("created_at")
            )

            rating = rating_engine.START_RATING
            solved_count = 0
            rows: list[RatingChange] = []

            for solve in solves:
                delta = rating_engine.solve_delta(
                    rating, rating_engine.problem_rating(solve.problem), solved_count
                )
                solved_count += 1
                if delta <= 0:
                    continue
                rows.append(
                    RatingChange(
                        user=user,
                        kind=RatingChange.Kind.SOLVE,
                        rating_before=rating,
                        rating_after=rating + delta,
                        delta=delta,
                        problem=solve.problem,
                        note=solve.problem.title_uz[:160],
                        created_at=solve.created_at,
                    )
                )
                rating += delta

            if rating == user.rating and not rows:
                continue

            changed += 1
            self.stdout.write(
                f"  {user.username:<20} {user.rating} -> {rating} "
                f"({solved_count} masala, {len(rows)} o'zgarish)"
            )

            if dry:
                continue

            with transaction.atomic():
                # Faqat masala uchun berilgan yozuvlar tozalanadi —
                # olimpiada tarixi joyida qoladi.
                RatingChange.objects.filter(user=user, kind=RatingChange.Kind.SOLVE).delete()
                RatingChange.objects.bulk_create(rows)
                user.rating = rating
                user.max_rating = max(rating, user.max_rating if rows else rating)
                user.save(update_fields=["rating", "max_rating"])

        verb = "hisoblanadi" if dry else "yangilandi"
        self.stdout.write(self.style.SUCCESS(f"{changed} ta foydalanuvchi {verb}."))
