"""Fayl yuklash — avatar, masala rasmi, yangilik muqovasi uchun."""
from __future__ import annotations

import hashlib
import os
import uuid

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import models
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.core.models import TimeStampedModel
from apps.core.permissions import IsStaff

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
}
MAX_SIZE_MB = 5


class MediaFile(TimeStampedModel):
    """Yuklangan fayl haqidagi metama'lumot."""

    KINDS = [
        ("avatar", "Avatar"),
        ("cover", "Muqova"),
        ("logo", "Logo"),
        ("attachment", "Ilova"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to="uploads/%Y/%m/")
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=80)
    size_bytes = models.PositiveIntegerField(default=0)
    checksum = models.CharField(max_length=64, blank=True, db_index=True)
    kind = models.CharField(max_length=20, choices=KINDS, default="attachment")
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="uploads"
    )

    class Meta:
        db_table = "media_files"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.original_name

    @property
    def url(self) -> str:
        try:
            return self.file.url
        except ValueError:
            return ""


class MediaFileSerializer(serializers.ModelSerializer):
    url = serializers.CharField(read_only=True)
    uploaded_by_username = serializers.CharField(
        source="uploaded_by.username", read_only=True, default=None
    )

    class Meta:
        model = MediaFile
        fields = (
            "id", "url", "original_name", "content_type", "size_bytes",
            "kind", "width", "height", "uploaded_by_username", "created_at",
        )
        read_only_fields = fields


class MediaFileViewSet(viewsets.ModelViewSet):
    """`/api/admin/media/` — fayl yuklash va kutubxona."""

    queryset = MediaFile.objects.select_related("uploaded_by")
    serializer_class = MediaFileSerializer
    permission_classes = [IsStaff]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ["kind"]
    search_fields = ["original_name"]
    ordering = ["-created_at"]

    def create(self, request, *args, **kwargs):
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "Fayl yuborilmadi."}, status=status.HTTP_400_BAD_REQUEST)

        if upload.content_type not in ALLOWED_TYPES:
            return Response(
                {"detail": f"Bu format qo'llab-quvvatlanmaydi ({upload.content_type}). "
                           f"Ruxsat: JPG, PNG, WebP, GIF, SVG."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > MAX_SIZE_MB * 1024 * 1024:
            return Response(
                {"detail": f"Fayl juda katta ({upload.size // 1024} KB). Limit: {MAX_SIZE_MB} MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        digest = hashlib.sha256()
        for chunk in upload.chunks():
            digest.update(chunk)
        checksum = digest.hexdigest()
        upload.seek(0)

        # Bir xil fayl allaqachon yuklangan bo'lsa — qayta saqlamaymiz
        existing = MediaFile.objects.filter(checksum=checksum).first()
        if existing:
            return Response(self.get_serializer(existing).data, status=status.HTTP_200_OK)

        extension = ALLOWED_TYPES[upload.content_type]
        base = os.path.splitext(upload.name)[0][:60] or "file"
        upload.name = f"{base}-{checksum[:8]}{extension}"

        media = MediaFile.objects.create(
            file=upload,
            original_name=upload.name,
            content_type=upload.content_type,
            size_bytes=upload.size,
            checksum=checksum,
            kind=request.data.get("kind", "attachment"),
            uploaded_by=request.user if request.user.is_authenticated else None,
        )
        return Response(self.get_serializer(media).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        # Diskdagi faylni ham tozalaymiz
        if instance.file and default_storage.exists(instance.file.name):
            default_storage.delete(instance.file.name)
        instance.delete()
