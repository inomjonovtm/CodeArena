"""Savatcha — soft-delete qilingan yozuvlarni ko'rish, tiklash, butunlay o'chirish."""
from __future__ import annotations

import datetime

from django.apps import apps
from django.utils import timezone
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.core.mixins import write_audit
from apps.core.permissions import require

# Savatchaga tushadigan modellar: kalit → (app_label.ModelName, ko'rsatiladigan nom)
TRASHABLE = {
    "problem": ("problems.Problem", "Masala"),
    "contest": ("contests.Contest", "Contest"),
    "discussion": ("content.Discussion", "Muhokama"),
    "comment": ("content.Comment", "Izoh"),
    "group": ("community.Group", "Guruh"),
}

RETENTION_DAYS = 30


def _model(kind: str):
    path = TRASHABLE[kind][0]
    return apps.get_model(path)


def _label(obj) -> str:
    for field in ("title_uz", "title", "name", "body_md", "username"):
        value = getattr(obj, field, None)
        if value:
            return str(value)[:120]
    return str(obj)[:120]


class SoftDeleteViewSetMixin:
    """ViewSet'ga savatcha mantiqini qo'shadi: `delete()` → soft, `restore` action."""

    def perform_destroy(self, instance):
        from apps.core.mixins import serialize_instance

        snapshot = serialize_instance(instance)
        instance.delete(actor=self.request.user)
        write_audit(
            self.request,
            action_name=f"{getattr(self, 'audit_label', '') or instance.__class__.__name__.lower()}.trash",
            obj=instance,
            changes={"before": snapshot, "soft": True},
        )

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        model = self.queryset.model
        instance = model.all_objects.filter(pk=pk).first()
        if instance is None:
            return Response({"detail": "Topilmadi."}, status=404)
        instance.restore()
        write_audit(request, action_name=f"{model.__name__.lower()}.restore", obj=instance)
        return Response({"detail": "Tiklandi.", "id": str(instance.pk)})


@api_view(["GET"])
@permission_classes([require("trash.view")])
def trash_list(request):
    """`GET /api/admin/trash/` — barcha modellardan o'chirilganlar."""
    kind = request.query_params.get("kind") or ""
    search = (request.query_params.get("search") or "").strip().lower()
    limit = min(int(request.query_params.get("limit", 200)), 500)

    rows = []
    kinds = [kind] if kind in TRASHABLE else list(TRASHABLE)

    for key in kinds:
        model = _model(key)
        queryset = (
            model.all_objects.filter(deleted_at__isnull=False)
            .select_related("deleted_by")
            .order_by("-deleted_at")[:limit]
        )
        for obj in queryset:
            label = _label(obj)
            if search and search not in label.lower():
                continue
            expires = obj.deleted_at + datetime.timedelta(days=RETENTION_DAYS)
            rows.append(
                {
                    "kind": key,
                    "kind_label": TRASHABLE[key][1],
                    "id": str(obj.pk),
                    "label": label,
                    "deleted_at": obj.deleted_at,
                    "deleted_by": getattr(obj.deleted_by, "username", None),
                    "expires_at": expires,
                    "days_left": max((expires - timezone.now()).days, 0),
                }
            )

    rows.sort(key=lambda row: row["deleted_at"], reverse=True)
    counts = {
        key: _model(key).all_objects.filter(deleted_at__isnull=False).count() for key in TRASHABLE
    }
    return Response(
        {
            "results": rows[:limit],
            "counts": counts,
            "total": sum(counts.values()),
            "retention_days": RETENTION_DAYS,
        }
    )


@api_view(["POST"])
@permission_classes([require("trash.restore")])
def trash_restore(request):
    """`POST /api/admin/trash/restore/`  body: {"kind": "problem", "ids": [...]}"""
    kind = request.data.get("kind")
    ids = request.data.get("ids") or []
    if kind not in TRASHABLE:
        return Response({"detail": "Noma'lum tur."}, status=400)

    model = _model(kind)
    queryset = model.all_objects.filter(pk__in=ids, deleted_at__isnull=False)
    affected = queryset.count()
    queryset.update(deleted_at=None, deleted_by=None)

    write_audit(
        request,
        action_name=f"trash.restore.{kind}",
        target_type=model.__name__,
        target_repr=f"{affected} ta",
        changes={"ids": [str(i) for i in ids]},
    )
    return Response({"detail": f"{affected} ta yozuv tiklandi.", "affected": affected})


@api_view(["POST"])
@permission_classes([require("trash.purge")])
def trash_purge(request):
    """`POST /api/admin/trash/purge/` — butunlay o'chirish (faqat admin)."""
    kind = request.data.get("kind")
    ids = request.data.get("ids") or []
    purge_all = bool(request.data.get("all"))

    if kind not in TRASHABLE:
        return Response({"detail": "Noma'lum tur."}, status=400)

    model = _model(kind)
    queryset = model.all_objects.filter(deleted_at__isnull=False)
    if not purge_all:
        queryset = queryset.filter(pk__in=ids)

    affected = queryset.count()
    queryset.hard_delete()

    write_audit(
        request,
        action_name=f"trash.purge.{kind}",
        target_type=model.__name__,
        target_repr=f"{affected} ta",
        changes={"all": purge_all, "ids": [str(i) for i in ids]},
    )
    return Response({"detail": f"{affected} ta yozuv butunlay o'chirildi.", "affected": affected})
