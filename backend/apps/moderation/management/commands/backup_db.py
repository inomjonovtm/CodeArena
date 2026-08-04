"""`python manage.py backup_db` — bazani zaxiralaydi.

Celery ishlatilmaydigan o'rnatishlarda tizim cron'idan chaqirish uchun:

    0 3 * * *  cd /srv/codearena && docker compose -f docker-compose.prod.yml \\
                 exec -T backend python manage.py backup_db --auto
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from apps.moderation import backups


class Command(BaseCommand):
    help = "Ma'lumotlar bazasining zaxira nusxasini yaratadi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--note", default="", help="Zaxiraga izoh (admin panelda ko'rinadi)."
        )
        parser.add_argument(
            "--auto",
            action="store_true",
            help="«Avtomatik» deb belgilanadi (cron yoki celery chaqirganda).",
        )

    def handle(self, *args, **options):
        if not backups.pg_dump_available():
            self.stdout.write(
                self.style.WARNING(
                    "pg_dump topilmadi — `dumpdata` ishlatiladi. U butun bazani "
                    "xotiraga yig'adi va katta bazada muammo bo'ladi. "
                    "Tavsiya: konteynerga postgresql-client o'rnating."
                )
            )

        try:
            record = backups.create_backup(
                automatic=options["auto"], note=options["note"]
            )
        except backups.BackupError as exc:
            raise CommandError(str(exc)) from exc

        size_mb = record.size_bytes / (1024 * 1024)
        self.stdout.write(
            self.style.SUCCESS(f"Zaxira tayyor: {record.filename} ({size_mb:.1f} MB)")
        )
        self.stdout.write(f"Tiklash: {backups.restore_hint(record.filename)}")
