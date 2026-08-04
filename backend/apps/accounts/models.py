from __future__ import annotations

import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class Role(models.TextChoices):
    USER = "user", "Foydalanuvchi"
    MODERATOR = "moderator", "Moderator"
    ADMIN = "admin", "Administrator"


class Locale(models.TextChoices):
    UZ = "uz", "O'zbekcha"
    EN = "en", "English"


username_validator = RegexValidator(
    r"^[a-zA-Z0-9_]{3,32}$",
    "Username 3–32 belgidan iborat bo'lib, faqat harf, raqam va _ dan tashkil topsin.",
)


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, username, email, password, **extra):
        if not username:
            raise ValueError("Username majburiy.")
        if not email:
            raise ValueError("Email majburiy.")
        email = self.normalize_email(email).lower()
        user = self.model(username=username.strip(), email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email, password=None, **extra):
        extra.setdefault("role", Role.USER)
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(username, email, password, **extra)

    def create_superuser(self, username, email, password=None, **extra):
        extra.setdefault("role", Role.ADMIN)
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("is_email_verified", True)
        if extra.get("role") != Role.ADMIN:
            raise ValueError("Superuser roli `admin` bo'lishi shart.")
        return self._create_user(username, email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """CodeArena foydalanuvchisi (6-bo'lim: `users` jadvali)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    username = models.CharField(max_length=32, unique=True, validators=[username_validator], db_index=True)
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True, max_length=500)
    # Tashqi havola (Google rasmi) ham, saytga yuklangan faylning nisbiy
    # yo'li (`/media/...`) ham saqlanadi — shuning uchun URLField emas.
    avatar_url = models.CharField(max_length=500, blank=True)
    country = models.CharField(max_length=2, blank=True, help_text="ISO 3166-1 alpha-2")
    github_url = models.URLField(blank=True)
    website_url = models.URLField(blank=True)

    # Ro'yxatdan o'tishda so'raladi: viloyat/tuman ro'yxatdan tanlanadi
    # (`apps.accounts.regions`), ta'lim maskani esa qo'lda yoziladi — maktab,
    # litsey, kollej va universitet nomlarini oldindan ro'yxatlab bo'lmaydi.
    region = models.CharField(max_length=64, blank=True, db_index=True, help_text="Viloyat")
    district = models.CharField(max_length=64, blank=True, help_text="Tuman / shahar")
    education_place = models.CharField(max_length=160, blank=True, help_text="Ta'lim maskani")

    oauth_google_id = models.CharField(max_length=64, blank=True, null=True, unique=True)

    # progress / reyting (7-bo'lim)
    rating = models.IntegerField(default=1500, db_index=True)
    max_rating = models.IntegerField(default=1500)
    total_points = models.IntegerField(default=0, db_index=True)
    problems_solved = models.IntegerField(default=0)
    submissions_count = models.IntegerField(default=0)
    contests_participated = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_solved_date = models.DateField(null=True, blank=True)

    # Obuna (follow) hisoblagichlari — profil sahifasida har safar COUNT(*)
    # qilmaslik uchun denormallashtirilgan; `Follow` saqlanganda yangilanadi.
    followers_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)

    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER, db_index=True)
    locale = models.CharField(max_length=2, choices=Locale.choices, default=Locale.UZ)

    is_active = models.BooleanField(default=True)
    is_email_verified = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False, db_index=True)
    ban_reason = models.TextField(blank=True)
    banned_until = models.DateTimeField(null=True, blank=True)
    banned_by = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="banned_users"
    )

    # Django ichki mexanizmlari uchun (Django admin panel ISHLATILMAYDI)
    is_staff = models.BooleanField(default=False)

    notify_email = models.BooleanField(default=True)
    notify_contest = models.BooleanField(default=True)
    notify_follower = models.BooleanField(default=True, help_text="Yangi obunachi haqida xabar")

    # --- 2FA (TOTP)
    totp_secret = models.CharField(max_length=32, blank=True)
    is_2fa_enabled = models.BooleanField(default=False)
    totp_confirmed_at = models.DateTimeField(null=True, blank=True)

    # --- rol ustidan qo'shimcha/olib tashlangan ruxsatlar (granular)
    extra_permissions = models.JSONField(
        default=list, blank=True,
        help_text="Rolga qo'shimcha beriladigan ruxsatlar, masalan ['problems.delete']",
    )
    denied_permissions = models.JSONField(
        default=list, blank=True,
        help_text="Roldan olib tashlanadigan ruxsatlar",
    )

    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-total_points"]),
            models.Index(fields=["-rating"]),
            models.Index(fields=["role", "is_banned"]),
        ]

    def __str__(self) -> str:
        return self.username

    # --------------------------------------------------------- yordamchi
    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN

    @property
    def is_moderator(self) -> bool:
        return self.role == Role.MODERATOR

    @property
    def is_staff_member(self) -> bool:
        return self.role in {Role.ADMIN, Role.MODERATOR}

    @property
    def ban_is_active(self) -> bool:
        if not self.is_banned:
            return False
        if self.banned_until and self.banned_until < timezone.now():
            return False
        return True

    @property
    def display_name(self) -> str:
        return self.full_name or self.username

    @property
    def permissions(self) -> set[str]:
        """Rol + qo'shimcha ruxsatlar − olib tashlanganlar."""
        base = set(ROLE_PERMISSIONS.get(self.role, set()))
        base |= set(self.extra_permissions or [])
        base -= set(self.denied_permissions or [])
        return base

    def has_perm_code(self, code: str) -> bool:
        return code in self.permissions

    def register_solve(self, points: int, solved_on=None) -> None:
        """Masala birinchi marta yechilganda ball va streak'ni yangilaydi."""
        solved_on = solved_on or timezone.localdate()
        self.total_points += points
        self.problems_solved += 1
        if self.last_solved_date == solved_on:
            pass
        elif self.last_solved_date and (solved_on - self.last_solved_date).days == 1:
            self.current_streak += 1
        else:
            self.current_streak = 1
        self.longest_streak = max(self.longest_streak, self.current_streak)
        self.last_solved_date = solved_on
        self.save(update_fields=[
            "total_points", "problems_solved", "current_streak",
            "longest_streak", "last_solved_date", "updated_at",
        ])


# ------------------------------------------------------------------ huquqlar
# Katalog admin paneldagi bo'limlar bilan bir xil tartibda: har bir qator
# `/admin/...` sahifasiga to'g'ri keladi, shuning uchun huquqni yoqib-o'chirish
# natijasi darhol ko'rinadi (menyudan bo'lim yo'qoladi, API 403 qaytaradi).
PERMISSION_CATALOG: list[dict] = [
    {"key": "dashboard", "label": "Boshqaruv paneli", "codes": [
        ("dashboard.view", "Ko'rish"),
    ]},
    {"key": "problems", "label": "Masalalar", "codes": [
        ("problems.view", "Ko'rish"),
        ("problems.edit", "Qo'shish va tahrirlash"),
        ("problems.publish", "Chop etish"),
        ("problems.import", "Import / eksport"),
        ("problems.delete", "O'chirish"),
    ]},
    {"key": "testcases", "label": "Test-case'lar", "codes": [
        ("testcases.view", "Ko'rish"),
        ("testcases.edit", "Tahrirlash"),
        ("testcases.delete", "O'chirish"),
    ]},
    {"key": "tags", "label": "Teglar", "codes": [
        ("tags.view", "Ko'rish"),
        ("tags.edit", "Tahrirlash"),
        ("tags.delete", "O'chirish"),
    ]},
    {"key": "courses", "label": "Kurslar", "codes": [
        ("courses.view", "Ko'rish"),
        ("courses.edit", "Qo'shish va tahrirlash"),
        ("courses.publish", "Chop etish"),
        ("courses.delete", "O'chirish"),
    ]},
    {"key": "contests", "label": "Musobaqalar", "codes": [
        ("contests.view", "Ko'rish"),
        ("contests.edit", "Tahrirlash"),
        ("contests.ratings", "Reyting hisoblash"),
        ("contests.delete", "O'chirish"),
    ]},
    {"key": "submissions", "label": "Yuborishlar", "codes": [
        ("submissions.view", "Ko'rish"),
        ("submissions.rejudge", "Qayta tekshirish"),
        ("submissions.delete", "O'chirish"),
    ]},
    {"key": "judge", "label": "Judge0 va tillar", "codes": [
        ("judge.view", "Ko'rish"),
        ("judge.edit", "Sozlash"),
    ]},
    {"key": "users", "label": "Foydalanuvchilar", "codes": [
        ("users.view", "Ko'rish"),
        ("users.edit", "Tahrirlash"),
        ("users.ban", "Bloklash"),
        ("users.role", "Rolni o'zgartirish"),
        ("users.permissions", "Huquqlarni boshqarish"),
        ("users.delete", "O'chirish"),
    ]},
    {"key": "groups", "label": "Guruhlar", "codes": [
        ("groups.view", "Ko'rish"),
        ("groups.edit", "Tahrirlash"),
        ("groups.delete", "O'chirish"),
    ]},
    {"key": "content", "label": "Muhokama, izoh, shikoyat", "codes": [
        ("content.view", "Ko'rish"),
        ("content.edit", "Tahrirlash"),
        ("content.moderate", "Moderatsiya"),
        ("content.delete", "O'chirish"),
    ]},
    {"key": "moderation", "label": "Plagiat", "codes": [
        ("moderation.view", "Ko'rish"),
        ("moderation.review", "Qaror qabul qilish"),
    ]},
    {"key": "announcements", "label": "E'lonlar", "codes": [
        ("announcements.view", "Ko'rish"),
        ("announcements.edit", "Tahrirlash"),
        ("announcements.delete", "O'chirish"),
    ]},
    {"key": "audit", "label": "Audit jurnali", "codes": [
        ("audit.view", "Ko'rish"),
        ("audit.revert", "O'zgarishni qaytarish"),
    ]},
    {"key": "trash", "label": "Savat", "codes": [
        ("trash.view", "Ko'rish"),
        ("trash.restore", "Tiklash"),
        ("trash.purge", "Butunlay o'chirish"),
    ]},
    {"key": "sessions", "label": "Sessiyalar", "codes": [
        ("sessions.view", "Ko'rish"),
        ("sessions.revoke", "Yopish"),
    ]},
    {"key": "settings", "label": "Sozlamalar", "codes": [
        ("settings.view", "Ko'rish"),
        ("settings.edit", "O'zgartirish"),
        ("settings.backup", "Zaxira nusxa"),
    ]},
]

ALL_PERMISSIONS: list[str] = [
    code for group in PERMISSION_CATALOG for code, _label in group["codes"]
]

# Moderator: kontent bilan ishlaydi va moderatsiya qiladi, lekin hech narsani
# o'chira olmaydi, sozlamalarga va rol/huquq boshqaruviga tegmaydi.
MODERATOR_PERMISSIONS: set[str] = {
    "dashboard.view",
    "problems.view", "problems.edit", "problems.publish",
    "testcases.view", "testcases.edit",
    "tags.view", "tags.edit",
    "courses.view", "courses.edit", "courses.publish",
    "contests.view", "contests.edit",
    "submissions.view", "submissions.rejudge",
    "judge.view",
    "users.view", "users.ban",
    "groups.view", "groups.edit",
    "content.view", "content.edit", "content.moderate",
    "moderation.view", "moderation.review",
    "announcements.view", "announcements.edit",
    "audit.view",
    "trash.view", "trash.restore",
    "sessions.view",
}

ROLE_PERMISSIONS: dict[str, set[str]] = {
    Role.ADMIN: set(ALL_PERMISSIONS),
    Role.MODERATOR: MODERATOR_PERMISSIONS,
    Role.USER: set(),
}


class Follow(models.Model):
    """Obuna: `follower` foydalanuvchisi `following` ni kuzatadi.

    Obuna nima beradi: kuzatilayotgan odam masala yechganda yoki maqola
    chop etganda u `/feed` sahifasida ko'rinadi va profilida obunachilar
    soni ko'rsatiladi.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following_links")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="follower_links")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "follows"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["follower", "following"], name="uniq_follow_pair"),
            models.CheckConstraint(
                condition=~models.Q(follower=models.F("following")),
                name="no_self_follow",
            ),
        ]
        indexes = [
            models.Index(fields=["following", "-created_at"]),
            models.Index(fields=["follower", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.follower} → {self.following}"


class AdminSession(models.Model):
    """Aktiv sessiyalar — qurilma, IP va oxirgi faollik."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="sessions")
    jti = models.CharField(max_length=64, db_index=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    device = models.CharField(max_length=80, blank=True)
    browser = models.CharField(max_length=60, blank=True)
    location = models.CharField(max_length=80, blank=True)
    is_current = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "admin_sessions"
        ordering = ["-last_seen_at"]

    def __str__(self) -> str:
        return f"{self.user} · {self.browser} ({self.ip_address})"

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None


class EmailVerification(models.Model):
    """Ro'yxatdan o'tishda email tasdiqlash tokeni (9-bo'lim: onboarding)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_tokens")
    token = models.CharField(max_length=64, unique=True)
    purpose = models.CharField(
        max_length=20,
        choices=[("verify", "Email tasdiqlash"), ("reset", "Parolni tiklash")],
        default="verify",
    )
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "email_verifications"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.username} — {self.purpose}"

    @property
    def is_valid(self) -> bool:
        return self.used_at is None and self.expires_at > timezone.now()
