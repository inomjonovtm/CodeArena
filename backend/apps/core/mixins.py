"""Admin ViewSet'lar uchun umumiy mixinlar: audit log + bulk amallar."""
from __future__ import annotations

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response


def write_audit(request, *, action_name: str, obj=None, target_type: str = "",
                target_id: str = "", target_repr: str = "", changes: dict | None = None):
    """Audit yozuvini yaratadi. Import sikllardan qochish uchun ichkarida import qilinadi."""
    from apps.moderation.models import AuditLog

    if obj is not None:
        target_type = target_type or obj.__class__.__name__
        target_id = target_id or str(getattr(obj, "pk", ""))
        target_repr = target_repr or str(obj)[:255]

    actor = getattr(request, "user", None)
    if actor is not None and not getattr(actor, "is_authenticated", False):
        actor = None

    return AuditLog.objects.create(
        actor=actor,
        action=action_name,
        target_type=target_type,
        target_id=str(target_id),
        target_repr=target_repr,
        changes=changes or {},
        ip_address=getattr(request, "client_ip", "") or None,
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:255] if hasattr(request, "META") else "",
    )


def serialize_instance(instance) -> dict:
    """Modelni audit uchun sodda dict ko'rinishiga o'tkazadi."""
    data = {}
    for field in instance._meta.fields:
        if field.name in {"password", "password_hash"}:
            continue
        value = getattr(instance, field.attname, None)
        data[field.name] = str(value) if value is not None else None
    return data


def diff(before: dict, after: dict) -> dict:
    return {
        key: {"before": before.get(key), "after": after.get(key)}
        for key in after
        if before.get(key) != after.get(key)
    }


class AuditLogMixin:
    """CRUD amallarini avtomatik audit logga yozadi."""

    audit_label: str = ""

    def _label(self) -> str:
        return self.audit_label or self.queryset.model.__name__.lower()

    def perform_create(self, serializer):
        instance = serializer.save()
        write_audit(
            self.request,
            action_name=f"{self._label()}.create",
            obj=instance,
            changes={"after": serialize_instance(instance)},
        )
        return instance

    def perform_update(self, serializer):
        before = serialize_instance(serializer.instance)
        instance = serializer.save()
        after = serialize_instance(instance)
        write_audit(
            self.request,
            action_name=f"{self._label()}.update",
            obj=instance,
            changes=diff(before, after),
        )
        return instance

    def perform_destroy(self, instance):
        snapshot = serialize_instance(instance)
        repr_ = str(instance)[:255]
        pk = str(instance.pk)
        model_name = instance.__class__.__name__
        instance.delete()
        write_audit(
            self.request,
            action_name=f"{self._label()}.delete",
            target_type=model_name,
            target_id=pk,
            target_repr=repr_,
            changes={"before": snapshot},
        )


class BulkActionMixin:
    """`POST /bulk/` — bir nechta obyekt ustida amal bajarish.

    Body: {"ids": [...], "action": "delete" | "<custom>", "payload": {...}}
    """

    bulk_allowed_actions: tuple[str, ...] = ("delete",)

    def get_bulk_queryset(self, ids):
        return self.filter_queryset(self.get_queryset()).filter(pk__in=ids)

    def handle_bulk_action(self, request, action_name: str, queryset, payload: dict):
        """Ilova o'zining maxsus bulk amallarini shu yerda qo'shadi."""
        raise NotImplementedError

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        ids = request.data.get("ids") or []
        action_name = (request.data.get("action") or "").strip()
        payload = request.data.get("payload") or {}

        if not isinstance(ids, list) or not ids:
            return Response({"detail": "`ids` bo'sh bo'lmasligi kerak."},
                            status=status.HTTP_400_BAD_REQUEST)
        if action_name not in self.bulk_allowed_actions:
            return Response(
                {"detail": f"`{action_name}` amali qo'llab-quvvatlanmaydi.",
                 "errors": {"action": list(self.bulk_allowed_actions)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_bulk_queryset(ids)
        affected = queryset.count()
        if affected == 0:
            return Response({"detail": "Mos obyekt topilmadi.", "affected": 0},
                            status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            if action_name == "delete":
                targets = [(str(o.pk), str(o)[:255]) for o in queryset]
                queryset.delete()
                for pk, repr_ in targets:
                    write_audit(
                        request,
                        action_name=f"{getattr(self, 'audit_label', '') or self.queryset.model.__name__.lower()}.delete",
                        target_type=self.queryset.model.__name__,
                        target_id=pk,
                        target_repr=repr_,
                        changes={"bulk": True},
                    )
                result = {"affected": affected}
            else:
                result = self.handle_bulk_action(request, action_name, queryset, payload) or {}
                result.setdefault("affected", affected)
                write_audit(
                    request,
                    action_name=f"{getattr(self, 'audit_label', '') or self.queryset.model.__name__.lower()}.bulk.{action_name}",
                    target_type=self.queryset.model.__name__,
                    target_id="",
                    target_repr=f"{affected} ta obyekt",
                    changes={"ids": [str(i) for i in ids], "payload": payload},
                )

        result.setdefault("detail", f"{result.get('affected', affected)} ta yozuv yangilandi.")
        return Response(result, status=status.HTTP_200_OK)
