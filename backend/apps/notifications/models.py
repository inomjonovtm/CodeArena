from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class NotificationKind(models.TextChoices):
    """Sayt ichidagi bildirishnoma turlari."""

    COMMENT_REPLY = "comment_reply", "Izohga javob"
    DISCUSSION_COMMENT = "discussion_comment", "Muhokamangizga izoh"
    SUBMISSION_RESULT = "submission_result", "Yechim natijasi"
    CONTEST_SOON = "contest_soon", "Musobaqa yaqinlashdi"
    CONTEST_RESULT = "contest_result", "Musobaqa natijasi"
    ACHIEVEMENT = "achievement", "Yutuq"
    GROUP_INVITE = "group_invite", "Guruhga qo'shildingiz"
    MODERATION = "moderation", "Moderatsiya qarori"
    ACCOUNT = "account", "Hisob"
    ANNOUNCEMENT = "announcement", "E'lon"


LEVELS = [
    ("info", "Ma'lumot"),
    ("success", "Muvaffaqiyat"),
    ("warning", "Ogohlantirish"),
    ("danger", "Muhim"),
]


class Notification(BaseModel):
    """
    Sayt ichi bildirishnoma.

    Email yuborish `accounts.emails` orqali alohida ketadi — bu model faqat
    interfeysdagi qo'ng'iroq (bell) uchun. Har bir yozuv bitta foydalanuvchiga
    tegishli; ommaviy e'lon yuborilganda har bir qabul qiluvchiga nusxa yoziladi.
    """

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="notifications_sent",
        help_text="Harakatni bajargan foydalanuvchi (bo'lsa)",
    )

    kind = models.CharField(
        max_length=24, choices=NotificationKind.choices,
        default=NotificationKind.ACCOUNT, db_index=True,
    )
    level = models.CharField(max_length=8, choices=LEVELS, default="info")

    title = models.CharField(max_length=160)
    body = models.CharField(max_length=400, blank=True)
    url = models.CharField(max_length=255, blank=True, help_text="Frontend ichidagi nisbiy havola")
    payload = models.JSONField(default=dict, blank=True)

    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.recipient} · {self.title}"


class PushSubscription(BaseModel):
    """Brauzer push obunasi (Web Push API).

    Bitta foydalanuvchida bir nechta yozuv bo'lishi mumkin — har bir brauzer
    (va har bir qurilma) o'zining `endpoint` ini beradi. `endpoint` push
    xizmatining (FCM, Mozilla, WNS) manzili va global unikal, shuning uchun
    qayta obuna bo'lishda yangi qator yaratilmaydi, borisi yangilanadi.

    `p256dh` va `auth` — brauzer bergan shifrlash kalitlari. Ularsiz xabar
    yuborib bo'lmaydi va ular faqat shu brauzerda ochiladi: server yuborgan
    matnni push xizmati o'qiy olmaydi.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions"
    )
    endpoint = models.URLField(max_length=500, unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)

    user_agent = models.CharField(max_length=255, blank=True)
    browser = models.CharField(max_length=60, blank=True)
    device = models.CharField(max_length=80, blank=True)

    # Push xizmati xato qaytarganda oshadi; chegaraga yetganda obuna o'chiriladi.
    # 404/410 (obuna butunlay yo'q) kelsa — darhol o'chiriladi.
    failure_count = models.PositiveSmallIntegerField(default=0)
    last_error = models.CharField(max_length=200, blank=True)
    last_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "push_subscriptions"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.user} · {self.browser or 'brauzer'}"

    @property
    def subscription_info(self) -> dict:
        """`pywebpush` kutadigan ko'rinish."""
        return {
            "endpoint": self.endpoint,
            "keys": {"p256dh": self.p256dh, "auth": self.auth},
        }
