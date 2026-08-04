"""
CodeArena — Django sozlamalari.

MUHIM: `django.contrib.admin` ATAYLAB o'chirilgan. Loyiha texnik
spetsifikatsiyasiga ko'ra admin panel Next.js frontendida maxsus qurilgan
sahifalar (`/admin/...`) va DRF API endpointlari orqali ishlaydi.
"""
from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    return env(key, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    return [item.strip() for item in env(key, default).split(",") if item.strip()]


# ---------------------------------------------------------------- asosiy
SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0")

INSTALLED_APPS = [
    # django.contrib.admin ATAYLAB yo'q — 3-bo'limdagi izohga qarang
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # uchinchi tomon
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # loyiha ilovalari
    "apps.core",
    "apps.accounts",
    "apps.problems",
    "apps.judge",
    "apps.contests",
    "apps.courses",
    "apps.content",
    "apps.community",
    "apps.moderation",
    "apps.dashboard",
    "apps.notifications",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.RequestContextMiddleware",
    "apps.core.middleware.SecurityHeadersMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# API uchun `APPEND_SLASH` xavfli: slashsiz so'rovga Django **301** qaytaradi,
# brauzer esa 301 ni doimiy keshlaydi. Frontend proksisi bilan birga bu
# cheksiz redirect siklini keltirib chiqargan edi. Endi noto'g'ri manzil
# darhol 404 beradi — bu keshlanmaydi va xatoni yashirmaydi.
APPEND_SLASH = False

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------- baza
#
# Loyiha faqat PostgreSQL bilan ishlaydi. Ilgari SQLite zaxira variant
# sifatida turardi va lokalda uni ishga tushirish osonroq edi — lekin ikki
# xil baza ikki xil xatti-harakat degani: SQLite tranzaksiyalarni,
# bir vaqtda yozishni va tip tekshiruvini boshqacha bajaradi, shu sababli
# lokalda o'tgan kod produksiyada uzilib qolishi mumkin edi. Endi ishlab
# chiqish ham, produksiya ham bitta bazada ketadi.
#
# Ikki xil sozlash qo'llanadi:
#   * `DATABASE_URL` — boshqariladigan bazalar va hosting platformalari
#     odatda shu bitta o'zgaruvchini beradi;
#   * `POSTGRES_*` — docker-compose va lokal ish uchun.
# Ikkalasi ham bo'lsa, `DATABASE_URL` ustun turadi.
_DB_OPTIONS: dict[str, object] = {
    "connect_timeout": int(env("POSTGRES_CONNECT_TIMEOUT", "10")),
}


def _database_from_url(url: str) -> dict[str, object] | None:
    """`postgres://user:parol@host:port/nom?sslmode=require` ni ajratadi.

    Tashqi kutubxona (`dj-database-url`) qo'shilmadi: kerak bo'ladigan
    narsa shu bir nechta qatordan iborat va bitta bog'liqlikni saqlab
    yurishdan arzonroq.
    """
    from urllib.parse import parse_qsl, unquote, urlparse

    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql", "pgsql"}:
        raise RuntimeError(
            f"DATABASE_URL sxemasi qo'llanmaydi: {parsed.scheme!r}. "
            "Faqat PostgreSQL (postgres:// yoki postgresql://)."
        )

    options = dict(_DB_OPTIONS)
    # Boshqariladigan bazalar ko'pincha `?sslmode=require` talab qiladi —
    # uni yo'qotib qo'ysak, ulanish rad etilardi.
    options.update(dict(parse_qsl(parsed.query)))

    return {
        "NAME": unquote(parsed.path).lstrip("/") or "codearena",
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or 5432),
        "OPTIONS": options,
    }


_db_url = env("DATABASE_URL")
_db = _database_from_url(_db_url) if _db_url else {
    "NAME": env("POSTGRES_DB", "codearena"),
    "USER": env("POSTGRES_USER", "codearena"),
    "PASSWORD": env("POSTGRES_PASSWORD", "codearena"),
    "HOST": env("POSTGRES_HOST", "localhost"),
    "PORT": env("POSTGRES_PORT", "5432"),
    "OPTIONS": _DB_OPTIONS,
}

DB_PASSWORD = str(_db["PASSWORD"])

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        # Ulanishni qayta ishlatish — har so'rovda yangi TCP ulanish ochilmaydi.
        "CONN_MAX_AGE": int(env("POSTGRES_CONN_MAX_AGE", "60")),
        # Qayta ishlatishdan oldin ulanish tirikligini tekshiradi: baza
        # qayta ishga tushganda birinchi so'rov 500 bermasligi uchun.
        "CONN_HEALTH_CHECKS": True,
        **_db,
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------- i18n
LANGUAGE_CODE = "uz"
TIME_ZONE = env("TIME_ZONE", "Asia/Tashkent")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- media fayllarni qayerda saqlash
#
# Sukut — konteyner diski. Bu bitta serverda ishlaydi, lekin ikkita
# muammosi bor: (1) backend nusxasini ko'paytirsangiz avatarlar faqat bitta
# nusxada bo'ladi, (2) volume ulanmagan holda konteyner qayta qurilsa
# fayllar yo'qoladi. `MEDIA_STORAGE=s3` uni obyekt xotirasiga o'tkazadi
# (AWS S3, Cloudflare R2, Backblaze B2, MinIO — hammasi bir xil API).
MEDIA_STORAGE = env("MEDIA_STORAGE", "local").strip().lower()

if MEDIA_STORAGE == "s3":
    _s3_endpoint = env("AWS_S3_ENDPOINT_URL", "")  # R2/MinIO uchun; AWS'da bo'sh
    _default_storage = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": env("AWS_STORAGE_BUCKET_NAME"),
            "region_name": env("AWS_S3_REGION_NAME", "auto"),
            "access_key": env("AWS_ACCESS_KEY_ID"),
            "secret_key": env("AWS_SECRET_ACCESS_KEY"),
            "endpoint_url": _s3_endpoint or None,
            # Fayllar ochiq o'qiladi (avatar, masala rasmlari), shuning
            # uchun imzolangan URL kerak emas — u har safar yangi manzil
            # yasab, brauzer keshini butunlay buzardi.
            "querystring_auth": False,
            "default_acl": None,
            "file_overwrite": False,
            "object_parameters": {"CacheControl": "public, max-age=604800"},
        },
    }
    if env("AWS_S3_CUSTOM_DOMAIN"):
        _default_storage["OPTIONS"]["custom_domain"] = env("AWS_S3_CUSTOM_DOMAIN")
        MEDIA_URL = f"https://{env('AWS_S3_CUSTOM_DOMAIN')}/"
else:
    _default_storage = {"BACKEND": "django.core.files.storage.FileSystemStorage"}

STORAGES = {
    "default": _default_storage,
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# ---------------------------------------------------------------- DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.accounts.authentication.CookieJWTAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # `anon`/`user` — BARCHA endpointlarga qo'llanadigan umumiy tom.
    # Ilgari faqat scoped cheklovlar bor edi, ya'ni qidiruv, izoh yozish,
    # murojaat yuborish kabi endpointlar cheklovsiz qolgan edi.
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        # Umumiy tom — oddiy foydalanish uchun bemalol yetadi, lekin
        # skript bilan bazani "so'rib olish"ni sekinlashtiradi.
        "anon": env("ANON_RATE", "90/min"),
        "user": env("USER_RATE", "600/min"),
        "submission": env("SUBMISSION_RATE", "10/min"),
        "auth": env("AUTH_RATE", "20/min"),
        # Parolni tiklash: IP bo'yicha va nishon email bo'yicha alohida.
        # Nishon bo'yicha cheklov IP almashtirib xat yog'dirishni to'sadi.
        "password_reset": env("PASSWORD_RESET_RATE", "5/hour"),
        "password_reset_target": env("PASSWORD_RESET_TARGET_RATE", "3/hour"),
        # Tasdiqlash xatini qayta so'rash — hisob bo'yicha.
        "email_send": env("EMAIL_SEND_RATE", "5/hour"),
        # Google token tekshiruvi tashqi HTTP so'rov qiladi.
        "social_auth": env("SOCIAL_AUTH_RATE", "20/min"),
        # Muhokama/izoh/shikoyat yaratish — spamga qarshi.
        "content_write": env("CONTENT_WRITE_RATE", "30/min"),
        # Brauzerdan keladigan xato hisobotlari: buzuq reliz butun logni
        # ko'mib tashlamasligi uchun.
        "client_error": env("CLIENT_ERROR_RATE", "20/hour"),
        # Interfeys lug'ati: brauzer uni bir marta yuklab localStorage'ga
        # yozadi, shuning uchun tez-tez so'rash kerak emas
        "translate": env("TRANSLATE_RATE", "30/min"),
        # Kurs misoli va topshirig'ini bajarish. Masala yuborishdan
        # (`submission`) yumshoqroq: o'quv jarayonida kod ko'p marta
        # ishga tushiriladi — bu odatiy holat, suiiste'mol emas.
        "course_run": env("COURSE_RUN_RATE", "40/min"),
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "CodeArena API",
    "DESCRIPTION": "CodeArena — masalalar, judge, contest va admin panel API",
    "VERSION": "2.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(env("JWT_ACCESS_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(env("JWT_REFRESH_DAYS", "14"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# JWT'ni HttpOnly cookie'da saqlash (12-bo'lim: xavfsizlik)
AUTH_COOKIE_ACCESS = "ca_access"
AUTH_COOKIE_REFRESH = "ca_refresh"
AUTH_COOKIE_SECURE = env_bool("AUTH_COOKIE_SECURE", not DEBUG)
AUTH_COOKIE_SAMESITE = env("AUTH_COOKIE_SAMESITE", "Lax")
AUTH_COOKIE_DOMAIN = env("AUTH_COOKIE_DOMAIN") or None

# ---------------------------------------------------------------- CORS
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)

# ---------------------------------------------------------------- Celery
CELERY_BROKER_URL = env("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", "redis://localhost:6379/1")
CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", DEBUG)
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = TIME_ZONE

CACHES = {
    "default": (
        {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": env("REDIS_URL", "redis://localhost:6379/2"),
        }
        if env("REDIS_URL")
        else {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    )
}

# ---------------------------------------------------------------- Judge0
JUDGE0_URL = env("JUDGE0_URL", "http://localhost:2358")
JUDGE0_TOKEN = env("JUDGE0_TOKEN", "")
JUDGE0_CALLBACK_URL = env("JUDGE0_CALLBACK_URL", "")

# Lokal judge — Judge0 ishlamayotganda kodni shu serverda bajaradi.
# Bu TO'LIQ SANDBOX EMAS (apps/judge/runner.py dagi izohga qarang), shuning
# uchun sukut bo'yicha faqat DEBUG rejimida yoqiladi. Produksiyada ishonchsiz
# foydalanuvchilar kodi uchun Judge0 (Docker izolyatsiyasi) ishlatilsin.
LOCAL_JUDGE_ENABLED = env_bool("LOCAL_JUDGE_ENABLED", DEBUG)

# Lokal judge dasturlarni qidiradigan QO'SHIMCHA kataloglar (`;` yoki `:` bilan).
# Kompilyator tizim PATH'ida bo'lmasa kerak bo'ladi — masalan Windowsda
# MinGW: `C:/Users/<siz>/msys64/ucrt64/bin`. Bo'sh bo'lsa faqat PATH ishlatiladi.
JUDGE_BIN_DIRS = env("JUDGE_BIN_DIRS", "")

DEFAULT_TIME_LIMIT_MS = int(env("DEFAULT_TIME_LIMIT_MS", "2000"))
DEFAULT_MEMORY_LIMIT_KB = int(env("DEFAULT_MEMORY_LIMIT_KB", "262144"))
PLAGIARISM_THRESHOLD = float(env("PLAGIARISM_THRESHOLD", "0.85"))

FRONTEND_URL = env("FRONTEND_URL", "http://localhost:3000")

# ---------------------------------------------------------- Avtomatik tarjima
# Sayt hozir FAQAT o'zbek tilida ishlaydi, shuning uchun tarjima sukut
# bo'yicha O'CHIQ (`none`) — hech qanday tashqi so'rov ketmaydi.
#
# Ingliz tili keyinchalik qo'shilganda shu yerni o'zgartirish yetadi
# (`apps/core/translate.py` va `TranslationCache` tayyor turadi):
#
#   deepl     — sifat eng yaxshi, TRANSLATE_API_KEY kerak (tavsiya)
#   google    — TRANSLATE_API_KEY kerak
#   libre     — o'z serveringiz, TRANSLATE_URL kerak
#   mymemory  — kalitsiz, lekin qisqa yorliqlarda sifat past
#               ("Saqlash" → "Quarantine" kabi xatolar chiqadi)
TRANSLATE_PROVIDER = env("TRANSLATE_PROVIDER", "none")
TRANSLATE_API_KEY = env("TRANSLATE_API_KEY", "")
TRANSLATE_URL = env("TRANSLATE_URL", "")
TRANSLATE_EMAIL = env("TRANSLATE_EMAIL", "")

# ------------------------------------------------------- Web Push (VAPID)
# Kalitlar bo'sh bo'lsa brauzer bildirishnomalari butunlay o'chadi va
# interfeys obuna tugmasini ko'rsatmaydi (`apps/notifications/push.py`).
# Kalit yaratish: python manage.py vapid_keys
VAPID_PUBLIC_KEY = env("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = env("VAPID_PRIVATE_KEY", "")
# RFC 8292: push xizmati muammo chiqsa bog'lanadigan manzil
VAPID_SUBJECT = env("VAPID_SUBJECT", "mailto:admin@codearena.uz")
# Obuna shuncha marta ketma-ket xato bersa — o'chiriladi
PUSH_MAX_FAILURES = int(env("PUSH_MAX_FAILURES", "5"))

# Musobaqa boshlanishidan necha daqiqa oldin eslatma yuboriladi
CONTEST_REMINDER_MINUTES = int(env("CONTEST_REMINDER_MINUTES", "30"))

# Google orqali kirish (bo'sh bo'lsa — tugma frontendda ko'rinmaydi)
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", "")

# ---------------------------------------------------------------- email
# Ishlab chiqishda xatlar konsolga chiqadi — SMTP sozlanishi shart emas.
if env("EMAIL_HOST"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = env("EMAIL_HOST")
    EMAIL_PORT = int(env("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = env("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "CodeArena <no-reply@codearena.uz>")

# ------------------------------------------------------- fayl yuklash
MAX_UPLOAD_SIZE_MB = int(env("MAX_UPLOAD_SIZE_MB", "5"))
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = DATA_UPLOAD_MAX_MEMORY_SIZE

# --------------------------------------------------- savatcha va zaxira
TRASH_RETENTION_DAYS = int(env("TRASH_RETENTION_DAYS", "30"))
BACKUP_DIR = BASE_DIR / "backups"
BACKUP_KEEP = int(env("BACKUP_KEEP", "10"))

# Kuniga bir marta avtomatik zaxira (celery beat). Produksiyada YOQILISHI
# shart: aks holda zaxira faqat kimdir admin paneldan tugma bosganda olinadi.
BACKUP_SCHEDULE_ENABLED = env_bool("BACKUP_SCHEDULE_ENABLED", not DEBUG)
BACKUP_SCHEDULE_HOUR = int(env("BACKUP_SCHEDULE_HOUR", "3"))
BACKUP_SCHEDULE_MINUTE = int(env("BACKUP_SCHEDULE_MINUTE", "30"))
# `pg_dump` PATH'da bo'lmasa uning katalogi (masalan Windowsda
# `C:/Program Files/PostgreSQL/17/bin`). Bo'sh bo'lsa standart joylar
# avtomatik tekshiriladi.
PG_BIN_DIR = env("PG_BIN_DIR", "")

# Tashqi nusxa. Zaxira serverning o'zida yotsa, disk yoki server yo'qolganda
# u ham birga ketadi — shuning uchun obyekt xotirasiga ko'chiriladi.
# Bo'sh bo'lsa yuklash o'chadi (lokal nusxa baribir qoladi).
BACKUP_S3_BUCKET = env("BACKUP_S3_BUCKET", "")
BACKUP_S3_PREFIX = env("BACKUP_S3_PREFIX", "backups")
BACKUP_S3_ENDPOINT_URL = env("BACKUP_S3_ENDPOINT_URL", "")
BACKUP_S3_REGION = env("BACKUP_S3_REGION", "")
BACKUP_S3_ACCESS_KEY = env("BACKUP_S3_ACCESS_KEY", "") or env("AWS_ACCESS_KEY_ID", "")
BACKUP_S3_SECRET_KEY = env("BACKUP_S3_SECRET_KEY", "") or env("AWS_SECRET_ACCESS_KEY", "")

# ---------------------------------------------------------------- log
#
# `LOG_FORMAT=json` — produksiya uchun: har bir yozuv bitta JSON obyekti,
# log yig'uvchi (Loki, CloudWatch, Datadog) uni darajasi va `request_id`
# bo'yicha filtrlay oladi. Sukut — odam o'qiydigan matn.
LOG_FORMAT = env("LOG_FORMAT", "json" if not DEBUG else "simple")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {"()": "apps.core.logging.RequestIdFilter"},
    },
    "formatters": {
        "simple": {
            "format": "[{levelname}] {asctime} {name} [{request_id}]: {message}",
            "style": "{",
        },
        "json": {"()": "apps.core.logging.JsonFormatter"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if LOG_FORMAT == "json" else "simple",
            "filters": ["request_id"],
        }
    },
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO")},
    "loggers": {
        # So'rov xatolari (500) alohida ko'rinsin va Sentry'ga ham tushsin.
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        # Har bir SQL so'rovni chiqarish DEBUG'da ham juda shovqinli.
        "django.db.backends": {"level": "WARNING"},
    },
}

if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # Preload ro'yxatiga qo'shilish uchun. Domen HTTPS'da to'liq ishlashiga
    # ishonch hosil qilmaguningizcha `SECURE_HSTS_PRELOAD=False` qoldiring:
    # preload ro'yxatidan chiqish oylab davom etadi.
    SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", True)
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

    # Produksiyada zaif yoki standart sir bilan ishga tushib ketmasin
    if SECRET_KEY == "dev-only-insecure-key-change-me" or len(SECRET_KEY) < 32:  # noqa: S105 — bu solishtirish, sir emas
        raise RuntimeError(
            "DJANGO_SECRET_KEY yetarlicha kuchli emas (kamida 32 belgi kerak). "
            "Yangi kalit: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
        )

    # Baza paroli ham xuddi shunday: `.env.example` dagi standart qiymat
    # produksiyaga o'tib ketishi eng ko'p uchraydigan xatolardan biri.
    if DB_PASSWORD in {"", "codearena", "postgres", "change-me"}:
        raise RuntimeError(
            "POSTGRES_PASSWORD standart yoki bo'sh qiymatda. Produksiya uchun "
            "kuchli parol qo'ying: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )

# ------------------------------------------------------------- Sentry
#
# DSN bo'sh bo'lsa Sentry BUTUNLAY o'chadi — hech qanday tashqi so'rov
# ketmaydi va loyihani hisobsiz ham ishga tushirish mumkin.
#
# Nima uchun kerak: bularsiz produksiyadagi 500 xatosi faqat konteyner
# logida qoladi va uni kimdir qo'lda ko'rmaguncha hech kim bilmaydi.
SENTRY_DSN = env("SENTRY_DSN", "")

if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
    except ImportError:  # pragma: no cover
        import warnings

        warnings.warn(
            "SENTRY_DSN berilgan, lekin sentry-sdk o'rnatilmagan: "
            "pip install -r requirements.txt",
            RuntimeWarning,
            stacklevel=1,
        )
    else:
        def _scrub(event, _hint):
            """Xatoga ilashib ketgan sirlarni Sentry'ga yubormaslik.

            `send_default_pii=False` foydalanuvchi ma'lumotini to'sadi, lekin
            so'rov tanasidagi `password` kabi maydonlar baribir o'tib ketishi
            mumkin — ular shu yerda kesiladi.
            """
            sensitive = ("password", "token", "secret", "authorization", "cookie",
                         "csrf", "api_key", "refresh")

            def clean(node):
                if isinstance(node, dict):
                    return {
                        k: ("[kesildi]" if any(s in str(k).lower() for s in sensitive)
                            else clean(v))
                        for k, v in node.items()
                    }
                if isinstance(node, list):
                    return [clean(item) for item in node]
                return node

            if "request" in event:
                event["request"] = clean(event["request"])
            if "extra" in event:
                event["extra"] = clean(event["extra"])
            return event

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            environment=env("SENTRY_ENVIRONMENT", "production" if not DEBUG else "development"),
            release=env("SENTRY_RELEASE", "") or None,
            integrations=[
                DjangoIntegration(),
                CeleryIntegration(),
                # WARNING va yuqorisi "nafas" (breadcrumb) sifatida,
                # ERROR — alohida hodisa sifatida ketadi.
                LoggingIntegration(level=None, event_level="ERROR"),
            ],
            # Foydalanuvchi ma'lumotlari (IP, cookie, tana) yuborilmaydi.
            send_default_pii=False,
            traces_sample_rate=float(env("SENTRY_TRACES_SAMPLE_RATE", "0.05")),
            profiles_sample_rate=float(env("SENTRY_PROFILES_SAMPLE_RATE", "0")),
            before_send=_scrub,
        )
