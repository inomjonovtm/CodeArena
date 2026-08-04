import os
from pathlib import Path

from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# `.env` shu yerda ham o'qiladi: `config_from_object` Django sozlamalarini
# DANGASA (lazy) yuklaydi, ya'ni quyidagi jadval qurilayotgan paytda `.env`
# hali o'qilmagan bo'lishi mumkin edi. `load_dotenv` mavjud muhit
# o'zgaruvchilarini bosib ketmaydi, shuning uchun ikki marta chaqirish xavfsiz.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = Celery("codearena")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


def _env_int(key: str, default: int) -> int:
    """Jadval vaqti muhitdan o'qiladi.

    Bu modul `config/__init__.py` orqali Django to'liq ko'tarilishidan oldin
    import qilinadi, shuning uchun bu yerda `django.conf.settings` ga
    tegilmaydi — o'zgaruvchilar to'g'ridan-to'g'ri muhitdan olinadi.
    """
    try:
        return int(os.environ.get(key, "") or default)
    except ValueError:
        return default


app.conf.beat_schedule = {
    "daily-backup": {
        # Kunlik zaxira. Task o'zi `BACKUP_SCHEDULE_ENABLED` ni tekshiradi,
        # shuning uchun jadval doim turadi-yu, o'chirilgan holatda hech
        # narsa qilmaydi.
        "task": "apps.moderation.tasks.scheduled_backup",
        "schedule": crontab(
            hour=_env_int("BACKUP_SCHEDULE_HOUR", 3),
            minute=_env_int("BACKUP_SCHEDULE_MINUTE", 30),
        ),
    },
    "rotate-daily-challenge": {
        "task": "apps.problems.tasks.rotate_daily_challenge",
        "schedule": 60 * 60,  # har soatda tekshiradi, kun almashganda yangilaydi
    },
    "refresh-contest-statuses": {
        "task": "apps.contests.tasks.refresh_contest_statuses",
        "schedule": 60,
    },
    "send-contest-reminders": {
        # Boshlanishiga oz qolgan musobaqalar uchun eslatma (sayt ichi + push)
        "task": "apps.contests.tasks.send_contest_reminders",
        "schedule": 60,
    },
    "purge-stale-push-subscriptions": {
        # Ishlamay qolgan brauzer obunalarini tozalash — kuniga bir marta
        "task": "apps.notifications.tasks.purge_stale_subscriptions",
        "schedule": 60 * 60 * 24,
    },
    "publish-scheduled": {
        # Rejalashtirilgan masala/maqolalarni chop etish
        "task": "apps.problems.tasks.publish_scheduled",
        "schedule": 60,
    },
    "purge-trash": {
        # Savatchani tozalash — kuniga bir marta
        "task": "apps.problems.tasks.purge_trash",
        "schedule": 60 * 60 * 24,
    },
}
