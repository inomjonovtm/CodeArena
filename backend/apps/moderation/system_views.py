"""Tizim bo'limi: zaxira nusxalar va Judge0 tillari."""
from __future__ import annotations

import gzip
import io
import os
import shutil

from django.conf import settings
from django.core.management import call_command
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.mixins import AuditLogMixin, write_audit
from apps.core.permissions import HasResourcePerm, IsStaff

from .models import BackupRecord, JudgeLanguage

# Zaxiraga tushmaydigan jadvallar (sessiya, token, log)
EXCLUDED_APPS = [
    "contenttypes",
    "auth.Permission",
    "sessions",
    "token_blacklist",
    "moderation.AuditLog",
]


# ------------------------------------------------------------- zaxira
class BackupRecordSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, default=None
    )
    size_mb = serializers.SerializerMethodField()
    exists = serializers.SerializerMethodField()

    class Meta:
        model = BackupRecord
        fields = (
            "id", "filename", "size_bytes", "size_mb", "kind",
            "note", "created_by_username", "exists", "created_at",
        )
        read_only_fields = fields

    def get_size_mb(self, obj) -> float:
        return round(obj.size_bytes / (1024 * 1024), 2)

    def get_exists(self, obj) -> bool:
        return (settings.BACKUP_DIR / obj.filename).exists()


class BackupViewSet(viewsets.ReadOnlyModelViewSet):
    """`/api/admin/backups/` — zaxira yaratish, yuklab olish, o'chirish."""

    queryset = BackupRecord.objects.select_related("created_by")
    serializer_class = BackupRecordSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "settings"
    perm_actions = {
        "create_backup": "backup", "download": "backup",
        "destroy": "backup", "summary": "backup",
    }
    ordering = ["-created_at"]

    @action(detail=False, methods=["post"])
    def create_backup(self, request):
        """Ma'lumotlar bazasini JSON.GZ ko'rinishida saqlaydi."""
        settings.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        stamp = timezone.localtime().strftime("%Y%m%d-%H%M%S")
        filename = f"codearena-{stamp}.json.gz"
        path = settings.BACKUP_DIR / filename

        buffer = io.StringIO()
        try:
            call_command(
                "dumpdata",
                *[f"--exclude={item}" for item in EXCLUDED_APPS],
                "--natural-foreign",
                "--natural-primary",
                indent=None,
                stdout=buffer,
            )
        except Exception as exc:  # noqa: BLE001
            return Response(
                {"detail": f"Zaxira yaratilmadi: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        with gzip.open(path, "wt", encoding="utf-8") as handle:
            handle.write(buffer.getvalue())

        record = BackupRecord.objects.create(
            filename=filename,
            size_bytes=path.stat().st_size,
            kind="data",
            note=request.data.get("note", "")[:255],
            created_by=request.user,
        )

        # Eski nusxalarni tozalash
        extra = BackupRecord.objects.order_by("-created_at")[settings.BACKUP_KEEP:]
        for old in extra:
            old_path = settings.BACKUP_DIR / old.filename
            if old_path.exists():
                old_path.unlink()
            old.delete()

        write_audit(request, action_name="backup.create", obj=record)
        return Response(
            BackupRecordSerializer(record).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        record = self.get_object()
        path = settings.BACKUP_DIR / record.filename
        if not path.exists():
            raise Http404("Zaxira fayli topilmadi.")
        write_audit(request, action_name="backup.download", obj=record)
        return FileResponse(
            open(path, "rb"), as_attachment=True, filename=record.filename
        )

    def destroy(self, request, *args, **kwargs):
        record = self.get_object()
        path = settings.BACKUP_DIR / record.filename
        if path.exists():
            path.unlink()
        write_audit(request, action_name="backup.delete", obj=record)
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        total, used, free = shutil.disk_usage(settings.BASE_DIR)
        records = BackupRecord.objects.all()
        return Response(
            {
                "count": records.count(),
                "total_size_mb": round(
                    sum(records.values_list("size_bytes", flat=True)) / (1024 * 1024), 2
                ),
                "keep_limit": settings.BACKUP_KEEP,
                "backup_dir": str(settings.BACKUP_DIR),
                "disk_free_gb": round(free / (1024**3), 1),
                "restore_command": (
                    "gzip -dc backups/<fayl>.json.gz | python manage.py loaddata --format=json -"
                ),
            }
        )


# --------------------------------------------------------- judge tillari
class JudgeLanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = JudgeLanguage
        fields = (
            "id", "key", "label", "judge0_id", "version", "monaco_id",
            "file_extension", "starter_template", "is_active", "order",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class JudgeLanguageViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """`/api/admin/judge-languages/` — tillarni kodga tegmasdan boshqarish."""

    queryset = JudgeLanguage.objects.all()
    serializer_class = JudgeLanguageSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "judge"
    perm_actions = {"sync": "edit"}
    filterset_fields = ["is_active"]
    search_fields = ["key", "label"]
    ordering = ["order", "label"]
    pagination_class = None
    audit_label = "judge_language"

    @action(detail=False, methods=["post"])
    def sync(self, request):
        """Judge0'dagi mavjud tillar ro'yxatini olib keladi."""
        import requests

        from apps.judge.judge0 import Judge0Client

        client = Judge0Client()
        try:
            response = requests.get(
                f"{client.base_url}/languages", headers=client.headers, timeout=10
            )
            response.raise_for_status()
            rows = response.json()
        except Exception as exc:  # noqa: BLE001
            return Response(
                {"detail": f"Judge0 ga ulanib bo'lmadi: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        available = [
            {"judge0_id": row.get("id"), "name": row.get("name", "")} for row in rows
        ]
        known = set(JudgeLanguage.objects.values_list("judge0_id", flat=True))
        write_audit(
            request,
            action_name="judge_language.sync",
            target_type="JudgeLanguage",
            target_repr=f"{len(available)} ta til",
        )
        return Response(
            {
                "available": available,
                "configured_ids": sorted(known),
                "detail": f"Judge0 da {len(available)} ta til mavjud.",
            }
        )
