"""Rol guruhlarini yaratadi va foydalanuvchilarga qo'llaydi.

Har bir deploydan keyin ishga tushiriladi: yangi model qo'shilsa, moderator
uni ko'ra olishi uchun guruhga huquq QO'SHILISHI kerak. Buyruq idempotent —
necha marta ishga tushirilsa ham natija bir xil.

    python manage.py sync_roles
    python manage.py sync_roles --dry-run
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Role, User
from apps.accounts.roles import apply_role, ensure_groups


class Command(BaseCommand):
    help = "Rol guruhlarini (Moderatorlar, Mualliflar) yaratadi va foydalanuvchilarga biriktiradi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Hech narsani o'zgartirmasdan, nima bo'lishini ko'rsatadi.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("SINOV REJIMI — hech narsa saqlanmaydi.\n"))

        with transaction.atomic():
            groups = ensure_groups()
            for name, group in groups.items():
                self.stdout.write(
                    f"{name:<16} {group.permissions.count()} ta huquq"
                )

            counts = {role: 0 for role, _ in Role.choices}
            staff_fixed = 0

            for user in User.objects.all().only("id", "role", "is_staff"):
                before = user.is_staff
                apply_role(user, save=not dry_run)
                counts[user.role] = counts.get(user.role, 0) + 1
                if user.is_staff != before:
                    staff_fixed += 1

            self.stdout.write("")
            for role, label in Role.choices:
                self.stdout.write(f"{label:<16} {counts.get(role, 0)} ta")

            if staff_fixed:
                self.stdout.write(
                    self.style.WARNING(
                        f"\n{staff_fixed} ta foydalanuvchining panelga kirish huquqi to'g'irlandi."
                    )
                )

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS("\nTayyor."))
