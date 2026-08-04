"""Zaxira nusxa olish — bitta joyda.

Ilgari zaxira faqat admin paneldagi tugma orqali olinardi, ya'ni kimdir
esiga tushirmaguncha umuman olinmasdi. Endi shu modul uch joydan chaqiriladi:
admin paneldan, `manage.py backup_db` buyrug'idan va celery beat jadvalidan
(kuniga bir marta).

Ikki usul qo'llanadi:

* **pg_dump** — asosiysi. Oqim bilan ishlaydi (baza hajmi qancha bo'lsa ham
  xotira yemaydi), sxemani ham saqlaydi va `pg_restore` bilan aynan qaytadi.
* **dumpdata** — `pg_dump` topilmasa. U butun bazani xotiraga yig'adi,
  shuning uchun faqat zaxira variant sifatida qoldirilgan.

Fayl serverning o'zida qoladi — bu disk yonsa yordam bermaydi. Shuning uchun
`BACKUP_S3_BUCKET` berilgan bo'lsa nusxa obyekt xotirasiga ham yuklanadi.
"""
from __future__ import annotations

import gzip
import io
import logging
import os
import shutil
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.utils import timezone

logger = logging.getLogger(__name__)

# Zaxiraga tushmaydigan jadvallar (sessiya, token, log) — faqat dumpdata uchun.
EXCLUDED_APPS = [
    "contenttypes",
    "auth.Permission",
    "sessions",
    "token_blacklist",
    "moderation.AuditLog",
]


class BackupError(RuntimeError):
    pass


def pg_dump_path() -> str | None:
    """`pg_dump` ning to'liq yo'li, topilmasa None.

    Konteynerda u PATH'da bo'ladi (Dockerfile `postgresql-client` o'rnatadi).
    Lekin Windowsdagi rasmiy o'rnatuvchi va ba'zi serverlar uni PATH'ga
    qo'shmaydi — o'sha holatda zaxira jimgina `dumpdata` ga tushib qolardi
    va katta bazada xotira yetmasdi. Shuning uchun standart joylar ham
    tekshiriladi; aniq yo'lni `PG_BIN_DIR` bilan ham berish mumkin.
    """
    from glob import glob

    found = shutil.which("pg_dump")
    if found:
        return found

    candidates: list[str] = []
    configured = getattr(settings, "PG_BIN_DIR", "")
    if configured:
        candidates.append(str(Path(configured) / "pg_dump"))
    candidates += sorted(glob("C:/Program Files/PostgreSQL/*/bin/pg_dump.exe"), reverse=True)
    candidates += sorted(glob("/usr/lib/postgresql/*/bin/pg_dump"), reverse=True)
    candidates.append("/usr/local/bin/pg_dump")

    for candidate in candidates:
        resolved = shutil.which(candidate) or (candidate if Path(candidate).is_file() else None)
        if resolved:
            return resolved
    return None


def pg_dump_available() -> bool:
    return pg_dump_path() is not None


def _db_env_and_args() -> tuple[dict[str, str], list[str]]:
    db = settings.DATABASES["default"]
    env = {**os.environ, "PGPASSWORD": str(db.get("PASSWORD") or "")}
    args = [
        "--host", str(db.get("HOST") or "localhost"),
        "--port", str(db.get("PORT") or "5432"),
        "--username", str(db.get("USER") or ""),
        "--dbname", str(db.get("NAME") or ""),
    ]
    return env, args


def _run_pg_dump(path: Path) -> None:
    binary = pg_dump_path()
    if not binary:
        raise BackupError("pg_dump topilmadi.")

    env, args = _db_env_and_args()
    # `-Fc` — siqilgan ikkilik format; `pg_restore` uni tanlab tiklay oladi
    # (masalan faqat bitta jadvalni). `--no-owner` boshqa foydalanuvchi
    # ostida tiklashda xato bermasligi uchun.
    command = [binary, *args, "--format=custom", "--no-owner", "--file", str(path)]
    result = subprocess.run(  # noqa: S603 — argumentlar sozlamalardan
        command, env=env, capture_output=True, text=True, timeout=3600
    )
    if result.returncode != 0:
        path.unlink(missing_ok=True)
        raise BackupError(f"pg_dump xato bilan tugadi: {result.stderr.strip()[:500]}")


def _run_dumpdata(path: Path) -> None:
    buffer = io.StringIO()
    call_command(
        "dumpdata",
        *[f"--exclude={item}" for item in EXCLUDED_APPS],
        "--natural-foreign",
        "--natural-primary",
        indent=None,
        stdout=buffer,
    )
    with gzip.open(path, "wt", encoding="utf-8") as handle:
        handle.write(buffer.getvalue())


def _upload_offsite(path: Path) -> str | None:
    """Nusxani S3-mos xotiraga yuklaydi. Sozlanmagan bo'lsa — None."""
    bucket = getattr(settings, "BACKUP_S3_BUCKET", "")
    if not bucket:
        return None

    try:
        import boto3
    except ImportError:  # pragma: no cover
        logger.warning("BACKUP_S3_BUCKET berilgan, lekin boto3 o'rnatilmagan.")
        return None

    prefix = getattr(settings, "BACKUP_S3_PREFIX", "backups").strip("/")
    key = f"{prefix}/{path.name}" if prefix else path.name

    client = boto3.client(
        "s3",
        endpoint_url=getattr(settings, "BACKUP_S3_ENDPOINT_URL", "") or None,
        region_name=getattr(settings, "BACKUP_S3_REGION", "") or None,
        aws_access_key_id=getattr(settings, "BACKUP_S3_ACCESS_KEY", "") or None,
        aws_secret_access_key=getattr(settings, "BACKUP_S3_SECRET_KEY", "") or None,
    )
    client.upload_file(str(path), bucket, key)
    logger.info("Zaxira tashqi xotiraga yuklandi", extra={"bucket": bucket, "key": key})
    return key


def prune(keep: int | None = None) -> int:
    """Eski nusxalarni o'chiradi, o'chirilganlar sonini qaytaradi."""
    from .models import BackupRecord

    keep = settings.BACKUP_KEEP if keep is None else keep
    removed = 0
    for old in BackupRecord.objects.order_by("-created_at")[keep:]:
        old_path = settings.BACKUP_DIR / old.filename
        if old_path.exists():
            old_path.unlink()
        old.delete()
        removed += 1
    return removed


def create_backup(*, automatic: bool = False, note: str = "", created_by=None):
    """Zaxira yaratadi va `BackupRecord` qaytaradi.

    Xatolik bo'lsa `BackupError` ko'tariladi — chaqiruvchi uni foydalanuvchiga
    ko'rsatadi yoki logga yozadi.
    """
    from .models import BackupRecord

    settings.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = timezone.localtime().strftime("%Y%m%d-%H%M%S")

    if pg_dump_available():
        # pg_dump sxemani ham oladi — bu «to'liq» zaxira.
        filename = f"codearena-{stamp}.dump"
        kind = "full"
        path = settings.BACKUP_DIR / filename
        _run_pg_dump(path)
    else:
        filename = f"codearena-{stamp}.json.gz"
        kind = "data"
        path = settings.BACKUP_DIR / filename
        try:
            _run_dumpdata(path)
        except Exception as exc:
            path.unlink(missing_ok=True)
            raise BackupError(f"Zaxira yaratilmadi: {exc}") from exc

    record = BackupRecord.objects.create(
        filename=filename,
        size_bytes=path.stat().st_size,
        kind=kind,
        is_automatic=automatic,
        note=note[:255],
        created_by=created_by,
    )

    try:
        _upload_offsite(path)
    except Exception as exc:  # noqa: BLE001
        # Tashqi nusxa chiqmasa ham lokal zaxira qoladi — jarayonni
        # to'xtatmaymiz, lekin bu jimgina o'tib ketmasligi kerak.
        logger.error("Zaxirani tashqi xotiraga yuklab bo'lmadi: %s", exc)

    prune()
    return record


def restore_hint(filename: str = "") -> str:
    """Foydalanuvchiga ko'rsatiladigan tiklash buyrug'i.

    Fayl nomi berilmasa (hali bitta ham zaxira yo'q), buyruq HOZIR
    ishlatiladigan usulga qarab tanlanadi — aks holda panel `pg_restore`
    ni ko'rsatib turardi-yu, aslida `dumpdata` fayli olinardi.
    """
    if not filename:
        filename = "codearena.dump" if pg_dump_available() else "codearena.json.gz"

    if filename.endswith(".dump"):
        return (
            "pg_restore --clean --if-exists --no-owner "
            f"-h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB backups/{filename}"
        )
    return f"gzip -dc backups/{filename} | python manage.py loaddata --format=json -"
