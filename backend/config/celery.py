import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("codearena")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
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
