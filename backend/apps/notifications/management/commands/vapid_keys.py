"""VAPID kalit juftligini yaratadi (Web Push uchun).

Foydalanish:

    python manage.py vapid_keys

Chiqqan ikki qatorni `backend/.env` ga qo'ying. Kalitlar **bir marta**
yaratiladi: ularni almashtirsangiz mavjud barcha brauzer obunalari kuchini
yo'qotadi va foydalanuvchilar qaytadan ruxsat berishiga to'g'ri keladi.
"""
from __future__ import annotations

import base64

from django.core.management.base import BaseCommand


def _b64(raw: bytes) -> str:
    """Web Push base64url'ni to'ldiruvchi `=` belgilarisiz kutadi."""
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


class Command(BaseCommand):
    help = "Web Push uchun VAPID ochiq/yopiq kalit juftligini yaratadi"

    def handle(self, *args, **options):
        try:
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.primitives.asymmetric import ec
        except ImportError:
            self.stderr.write(
                self.style.ERROR(
                    "`cryptography` o'rnatilmagan. Avval: pip install -r requirements.txt"
                )
            )
            return

        private_key = ec.generate_private_key(ec.SECP256R1())

        # Yopiq kalit — 32 baytlik xom son; ochiq kalit — 65 baytlik
        # siqilmagan nuqta (0x04 + X + Y). Brauzerning `applicationServerKey`
        # aynan shu ko'rinishni kutadi.
        private_raw = private_key.private_numbers().private_value.to_bytes(32, "big")
        public_raw = private_key.public_key().public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint,
        )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("VAPID kalitlari yaratildi. `.env` ga qo'shing:"))
        self.stdout.write("")
        self.stdout.write(f"VAPID_PUBLIC_KEY={_b64(public_raw)}")
        self.stdout.write(f"VAPID_PRIVATE_KEY={_b64(private_raw)}")
        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING(
                "Yopiq kalitni hech kimga bermang va git'ga qo'shmang. "
                "Kalit almashtirilsa barcha mavjud obunalar kuchini yo'qotadi."
            )
        )
