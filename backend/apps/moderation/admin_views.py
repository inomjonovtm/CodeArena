from __future__ import annotations

import django_filters as filters
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core import site_settings
from apps.core.mixins import AuditLogMixin, BulkActionMixin, write_audit
from apps.core.permissions import HasResourcePerm, IsStaff

from .models import Announcement, AuditLog, PlagiarismPair, PlagiarismStatus, SiteSetting
from .serializers import (
    AnnouncementSerializer,
    AuditLogSerializer,
    PlagiarismPairDetailSerializer,
    PlagiarismPairListSerializer,
    PlagiarismReviewSerializer,
    SiteSettingSerializer,
)


class PlagiarismFilter(filters.FilterSet):
    status = filters.MultipleChoiceFilter(choices=PlagiarismStatus.choices)
    similarity_min = filters.NumberFilter(field_name="similarity", lookup_expr="gte")
    same_ip = filters.BooleanFilter()

    class Meta:
        model = PlagiarismPair
        fields = ["status", "contest", "problem", "language", "same_ip"]


class AdminPlagiarismViewSet(
    BulkActionMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """`/api/admin/plagiarism/` — shubhali juftliklar (13-bo'lim)."""

    queryset = PlagiarismPair.objects.all()
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "moderation"
    perm_actions = {"review": "review", "scan": "review", "summary": "view"}
    filterset_class = PlagiarismFilter
    search_fields = ["user_a__username", "user_b__username", "problem__title_uz"]
    ordering_fields = ["similarity", "created_at", "time_delta_seconds"]
    ordering = ["-similarity"]
    audit_label = "plagiarism"
    bulk_allowed_actions = ("delete", "clear", "confirm")

    def get_queryset(self):
        return super().get_queryset().select_related(
            "problem", "contest", "user_a", "user_b", "submission_a", "submission_b", "reviewed_by"
        )

    def get_serializer_class(self):
        return PlagiarismPairDetailSerializer if self.action == "retrieve" else PlagiarismPairListSerializer

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        pair = self.get_object()
        serializer = PlagiarismReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        pair.status = data["status"]
        pair.review_note = data.get("note", "")
        pair.reviewed_by = request.user
        pair.reviewed_at = timezone.now()
        pair.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at"])

        disqualified = []
        if data["status"] == PlagiarismStatus.CONFIRMED and data.get("disqualify") and pair.contest:
            from apps.contests.models import ContestParticipant

            reason = f"Plagiat tasdiqlandi ({pair.similarity:.0%} o'xshashlik)"
            for user in (pair.user_a, pair.user_b):
                if not user:
                    continue
                updated = ContestParticipant.objects.filter(contest=pair.contest, user=user).update(
                    is_disqualified=True, disqualify_reason=reason
                )
                if updated:
                    disqualified.append(user.username)

        write_audit(request, action_name=f"plagiarism.{data['status']}", obj=pair,
                    changes={**data, "disqualified": disqualified})
        return Response(
            {
                **PlagiarismPairDetailSerializer(pair, context=self.get_serializer_context()).data,
                "disqualified": disqualified,
            }
        )

    @action(detail=False, methods=["post"], url_path="scan")
    def scan(self, request):
        from .tasks import scan_contest_plagiarism, scan_problem_plagiarism

        contest_id = request.data.get("contest")
        problem_id = request.data.get("problem")
        threshold = request.data.get("threshold")

        if contest_id:
            scan_contest_plagiarism.delay(str(contest_id), threshold)
            target = f"contest:{contest_id}"
        elif problem_id:
            scan_problem_plagiarism.delay(str(problem_id), threshold)
            target = f"problem:{problem_id}"
        else:
            return Response({"detail": "`contest` yoki `problem` ko'rsating."},
                            status=status.HTTP_400_BAD_REQUEST)

        write_audit(request, action_name="plagiarism.scan", target_type="PlagiarismPair",
                    target_repr=target, changes={"threshold": threshold})
        return Response({"detail": "Tekshiruv navbatga qo'yildi.", "target": target})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = PlagiarismPair.objects.all()
        return Response(
            {
                "total": qs.count(),
                "pending": qs.filter(status=PlagiarismStatus.PENDING).count(),
                "confirmed": qs.filter(status=PlagiarismStatus.CONFIRMED).count(),
                "cleared": qs.filter(status=PlagiarismStatus.CLEARED).count(),
                "same_ip": qs.filter(same_ip=True).count(),
                "avg_similarity": qs.aggregate(v=Avg("similarity"))["v"],
                "by_language": list(qs.values("language").annotate(count=Count("id"))),
            }
        )

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name in {"clear", "confirm"}:
            mapped = PlagiarismStatus.CLEARED if action_name == "clear" else PlagiarismStatus.CONFIRMED
            return {"affected": queryset.update(
                status=mapped, reviewed_by=request.user, reviewed_at=timezone.now(),
                review_note=payload.get("note", ""),
            )}
        return {"affected": 0}


class AuditLogFilter(filters.FilterSet):
    action = filters.CharFilter(lookup_expr="icontains")
    actor_username = filters.CharFilter(field_name="actor__username", lookup_expr="iexact")
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = AuditLog
        fields = ["action", "target_type", "actor"]


class AdminAuditLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """`/api/admin/audit-log/` — admin amallari tarixi (faqat o'qish)."""

    queryset = AuditLog.objects.select_related("actor")
    serializer_class = AuditLogSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "audit"
    perm_actions = {"actions": "view", "revert": "revert"}
    filterset_class = AuditLogFilter
    search_fields = ["action", "target_repr", "target_type", "actor__username"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    @action(detail=False, methods=["get"])
    def actions(self, request):
        rows = AuditLog.objects.values("action").annotate(count=Count("id")).order_by("-count")[:100]
        return Response(list(rows))

    @action(detail=True, methods=["post"])
    def revert(self, request, pk=None):
        """`changes` ichidagi `before` qiymatlarni obyektga qaytaradi."""
        from django.apps import apps as django_apps

        entry = self.get_object()
        changes = entry.changes or {}

        # Faqat `update` turidagi yozuvlarni qaytarish mumkin
        field_diffs = {
            key: value
            for key, value in changes.items()
            if isinstance(value, dict) and "before" in value and "after" in value
        }
        if not field_diffs:
            return Response(
                {"detail": "Bu yozuvni avtomatik qaytarib bo'lmaydi "
                           "(o'zgargan maydonlar saqlanmagan)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        model = None
        for config in django_apps.get_app_configs():
            try:
                model = config.get_model(entry.target_type)
                break
            except LookupError:
                continue
        if model is None:
            return Response({"detail": f"`{entry.target_type}` modeli topilmadi."},
                            status=status.HTTP_400_BAD_REQUEST)

        manager = getattr(model, "all_objects", model.objects)
        instance = manager.filter(pk=entry.target_id).first()
        if instance is None:
            return Response({"detail": "Obyekt topilmadi (o'chirilgan bo'lishi mumkin)."},
                            status=status.HTTP_404_NOT_FOUND)

        editable = {f.name for f in model._meta.fields} - {"id", "created_at", "updated_at"}
        restored = {}
        for field, diff in field_diffs.items():
            if field not in editable:
                continue
            value = diff.get("before")
            if value in ("None", ""):
                value = None
            setattr(instance, field, value)
            restored[field] = value

        if not restored:
            return Response({"detail": "Qaytariladigan maydon topilmadi."},
                            status=status.HTTP_400_BAD_REQUEST)

        instance.save()
        write_audit(
            request, action_name="audit.revert", obj=instance,
            changes={"reverted_entry": entry.id, "restored": restored},
        )
        return Response({"detail": f"{len(restored)} ta maydon qaytarildi.", "restored": restored})


class AdminSiteSettingViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """`/api/admin/settings/` — sayt sozlamalari."""

    queryset = SiteSetting.objects.select_related("updated_by")
    serializer_class = SiteSettingSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "settings"
    perm_actions = {
        "bulk_update": "edit",
        "sync_defaults": "edit",
        # Judge0 sahifasi alohida huquqlar bilan ishlaydi
        "judge_config": "judge.view",
        "judge_config_save": "judge.edit",
        "judge0_test": "judge.view",
    }
    filterset_fields = ["group", "is_public"]
    search_fields = ["key", "label_uz", "label_en", "description"]
    ordering = ["group", "key"]
    pagination_class = None
    lookup_field = "key"
    lookup_value_regex = "[^/]+"
    audit_label = "setting"

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)
        return super().perform_create(serializer)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
        return super().perform_update(serializer)

    @action(detail=False, methods=["post"], url_path="bulk-update")
    def bulk_update(self, request):
        """Bir nechta sozlamani bir vaqtda saqlash: `{"values": {"key": value, ...}}`."""
        values = request.data.get("values") or {}
        if not isinstance(values, dict):
            return Response({"detail": "`values` obyekt bo'lishi kerak."},
                            status=status.HTTP_400_BAD_REQUEST)

        updated = []
        for key, value in values.items():
            setting = SiteSetting.objects.filter(key=key).first()
            if not setting:
                continue
            setting.value = value
            setting.updated_by = request.user
            setting.save(update_fields=["value", "updated_by", "updated_at"])
            updated.append(key)

        # Kesh tozalanmasa yangi qiymat 30 soniyagacha ishlamay turardi
        site_settings.invalidate()
        write_audit(request, action_name="setting.bulk_update", target_type="SiteSetting",
                    target_repr=f"{len(updated)} ta", changes={"keys": updated})
        return Response({"detail": f"{len(updated)} ta sozlama yangilandi.", "updated": updated})

    @action(detail=False, methods=["post"], url_path="sync-defaults")
    def sync_defaults(self, request):
        """Kodda e'lon qilingan, bazada yo'q sozlamalarni yaratadi.

        Yangi imkoniyat qo'shilganda (masalan Judge0 parametrlari) eski bazada
        u yo'q bo'lardi — panelda tugma bosilishi bilan hammasi paydo bo'ladi.
        """
        created = site_settings.sync_defaults()
        write_audit(request, action_name="setting.sync_defaults", target_type="SiteSetting",
                    target_repr=f"{created} ta")
        return Response({"detail": f"{created} ta yangi sozlama qo'shildi.", "created": created})

    @action(detail=False, methods=["get"], url_path="judge-config")
    def judge_config(self, request):
        """Judge0 sahifasi uchun faqat «judge» guruhidagi sozlamalar.

        Alohida endpoint kerak, chunki u `judge.view` huquqi bilan ochiladi —
        `settings.view` esa butun sozlamalar bo'limini ochib yuborardi.
        """
        rows = SiteSetting.objects.filter(group="judge").order_by("key")
        return Response(SiteSettingSerializer(rows, many=True).data)

    @action(detail=False, methods=["post"], url_path="judge-config-save")
    def judge_config_save(self, request):
        """`judge.edit` huquqi bilan faqat Judge0 parametrlarini saqlaydi."""
        values = request.data.get("values") or {}
        if not isinstance(values, dict):
            return Response({"detail": "`values` obyekt bo'lishi kerak."},
                            status=status.HTTP_400_BAD_REQUEST)

        updated = []
        for key, value in values.items():
            setting = SiteSetting.objects.filter(key=key, group="judge").first()
            if not setting:
                continue
            setting.value = value
            setting.updated_by = request.user
            setting.save(update_fields=["value", "updated_by", "updated_at"])
            updated.append(key)

        site_settings.invalidate()
        write_audit(request, action_name="judge.config_update", target_type="SiteSetting",
                    target_repr=f"{len(updated)} ta", changes={"keys": updated})
        return Response({"detail": f"{len(updated)} ta sozlama yangilandi.", "updated": updated})

    @action(detail=False, methods=["get", "post"], url_path="judge0-test")
    def judge0_test(self, request):
        """Joriy sozlamalar bilan Judge0 ga ulanishni sinaydi."""
        from apps.judge.engine import health
        from apps.judge.judge0 import Judge0Client

        client = Judge0Client()
        payload = {"url": client.base_url, "token_set": bool(client.token)}
        try:
            about = client.about()
            languages = client.languages()
            payload.update(
                {
                    "ok": True,
                    "version": about.get("version", ""),
                    "homepage": about.get("homepage", ""),
                    "language_count": len(languages),
                    "languages": [
                        {"id": row.get("id"), "name": row.get("name", "")} for row in languages
                    ],
                }
            )
        except Exception as exc:  # noqa: BLE001 — tashqi xizmat
            payload.update({"ok": False, "error": str(exc)})

        payload["health"] = health(refresh=True)
        return Response(payload)


class AdminAnnouncementViewSet(AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet):
    queryset = Announcement.objects.select_related("created_by")
    serializer_class = AnnouncementSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "announcements"
    perm_actions = {
        "send_email": "edit",
        "send_notification": "edit",
        "audience_preview": "view",
    }
    filterset_fields = ["is_active", "level", "audience"]
    search_fields = ["title_uz", "title_en", "body_uz"]
    ordering_fields = ["created_at", "starts_at"]
    ordering = ["-created_at"]
    audit_label = "announcement"
    bulk_allowed_actions = ("delete", "activate", "deactivate", "pin", "unpin")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        return super().perform_create(serializer)

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "activate":
            return {"affected": queryset.update(is_active=True)}
        if action_name == "deactivate":
            return {"affected": queryset.update(is_active=False)}
        if action_name == "pin":
            return {"affected": queryset.update(is_pinned=True)}
        if action_name == "unpin":
            return {"affected": queryset.update(is_pinned=False)}
        return {"affected": 0}

    @action(detail=True, methods=["post"], url_path="send-email")
    def send_email(self, request, pk=None):
        """E'lonni tanlangan auditoriyaga email qilib yuboradi."""
        from apps.accounts.emails import send_announcement_email

        announcement = self.get_object()
        # Qabul qiluvchilar modeldagi yagona manbadan; bu yerda faqat
        # email ruxsatini qo'shimcha filtrlaymiz
        recipients = announcement.recipients().filter(notify_email=True)

        sent = 0
        for user in recipients[:2000]:
            if send_announcement_email(user, announcement.title_uz, announcement.body_uz):
                sent += 1

        announcement.email_sent_at = timezone.now()
        announcement.email_recipients = sent
        announcement.save(update_fields=["email_sent_at", "email_recipients"])

        write_audit(request, action_name="announcement.send_email", obj=announcement,
                    changes={"recipients": sent, "audience": announcement.audience})
        return Response({"detail": f"{sent} ta foydalanuvchiga yuborildi.", "sent": sent})

    @action(detail=True, methods=["post"], url_path="send-notification")
    def send_notification(self, request, pk=None):
        """E'lonni sayt ichidagi qo'ng'iroqqa (va push'ga) yuboradi.

        Banner faqat sahifani ochgan odamga ko'rinadi va yopilgach yo'qoladi.
        Bildirishnoma esa qoladi — foydalanuvchi keyin qaytib o'qiy oladi va
        e'londagi havolaga o'sha yerdan o'tadi.
        """
        from apps.notifications.models import NotificationKind
        from apps.notifications.services import notify_many

        announcement = self.get_object()
        recipients = list(announcement.recipients()[:5000])

        count = notify_many(
            recipients,
            kind=NotificationKind.ANNOUNCEMENT,
            level=announcement.level,
            title=announcement.title_uz,
            body=announcement.body_uz,
            url=announcement.action_url or "",
            payload={"announcement_id": str(announcement.id)},
            push=announcement.send_push,
        )

        announcement.notified_at = timezone.now()
        announcement.notified_recipients = count
        announcement.save(update_fields=["notified_at", "notified_recipients"])

        write_audit(request, action_name="announcement.send_notification", obj=announcement,
                    changes={"recipients": count, "audience": announcement.audience,
                             "push": announcement.send_push})
        return Response({"detail": f"{count} ta foydalanuvchiga yuborildi.", "sent": count})

    @action(detail=True, methods=["get"], url_path="audience")
    def audience_preview(self, request, pk=None):
        """Yuborishdan OLDIN: nechta odamga tegadi va kimlarga (namuna)."""
        announcement = self.get_object()
        queryset = announcement.recipients()
        sample = list(queryset.values_list("username", flat=True)[:8])
        return Response(
            {
                "total": queryset.count(),
                "email_ready": queryset.filter(notify_email=True).count(),
                "sample": sample,
            }
        )
