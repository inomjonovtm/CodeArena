from __future__ import annotations

import django_filters as filters
from django.db.models import Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.exports import ExportMixin
from apps.core.mixins import AuditLogMixin, BulkActionMixin, write_audit
from apps.core.trash import SoftDeleteViewSetMixin
from apps.core.permissions import HasResourcePerm, IsStaff

from .models import (
    Comment,
    ContactMessage,
    ContentReport,
    Discussion,
    ModerationStatus,
)
from .serializers import (
    CommentSerializer,
    ContactMessageSerializer,
    ContentReportSerializer,
    DiscussionSerializer,
)


class AdminDiscussionViewSet(
    SoftDeleteViewSetMixin, AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet
):
    """`/api/admin/discussions/` — muhokamalarni moderatsiya qilish."""

    queryset = Discussion.objects.all()
    serializer_class = DiscussionSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "content"
    perm_actions = {"comments": "view"}
    filterset_fields = ["status", "problem", "author", "is_pinned", "is_locked"]
    search_fields = ["title", "body_md", "author__username"]
    ordering_fields = ["created_at", "upvotes", "comment_count", "flagged_count", "views"]
    ordering = ["-created_at"]
    audit_label = "discussion"
    bulk_allowed_actions = ("delete", "hide", "show", "lock", "unlock", "pin", "unpin")

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related("author", "problem")
            .annotate(live_comment_count=Count("comments", distinct=True))
        )

    def perform_update(self, serializer):
        serializer.save(moderated_by=self.request.user)
        return super().perform_update(serializer)

    def handle_bulk_action(self, request, action_name, queryset, payload):
        mapping = {
            "hide": {"status": ModerationStatus.HIDDEN},
            "show": {"status": ModerationStatus.VISIBLE},
            "lock": {"is_locked": True},
            "unlock": {"is_locked": False},
            "pin": {"is_pinned": True},
            "unpin": {"is_pinned": False},
        }
        if action_name in mapping:
            return {"affected": queryset.update(**mapping[action_name], moderated_by=request.user)}
        return {"affected": 0}

    @action(detail=True, methods=["get"])
    def comments(self, request, pk=None):
        discussion = self.get_object()
        rows = discussion.comments.select_related("author").order_by("created_at")
        return Response(CommentSerializer(rows, many=True).data)


class AdminCommentViewSet(
    SoftDeleteViewSetMixin, AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet
):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "content"
    filterset_fields = ["status", "discussion", "author"]
    search_fields = ["body_md", "author__username"]
    ordering_fields = ["created_at", "upvotes", "flagged_count"]
    ordering = ["-created_at"]
    audit_label = "comment"
    bulk_allowed_actions = ("delete", "hide", "show")

    def get_queryset(self):
        return super().get_queryset().select_related("author", "discussion")

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "hide":
            return {"affected": queryset.update(status=ModerationStatus.HIDDEN)}
        if action_name == "show":
            return {"affected": queryset.update(status=ModerationStatus.VISIBLE)}
        return {"affected": 0}


class AdminContentReportViewSet(AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet):
    queryset = ContentReport.objects.all()
    serializer_class = ContentReportSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "content"
    perm_actions = {"resolve": "moderate"}
    filterset_fields = ["is_resolved", "reason"]
    search_fields = ["note", "reporter__username"]
    ordering_fields = ["created_at", "is_resolved"]
    ordering = ["is_resolved", "-created_at"]
    audit_label = "content_report"
    bulk_allowed_actions = ("delete", "resolve")

    def get_queryset(self):
        return super().get_queryset().select_related("reporter", "discussion", "comment")

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        report = self.get_object()
        report.is_resolved = True
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save(update_fields=["is_resolved", "resolved_by", "resolved_at"])
        write_audit(request, action_name="content_report.resolve", obj=report)
        return Response(self.get_serializer(report).data)

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "resolve":
            return {"affected": queryset.update(
                is_resolved=True, resolved_by=request.user, resolved_at=timezone.now()
            )}
        return {"affected": 0}


class ContactMessageFilter(filters.FilterSet):
    topic = filters.MultipleChoiceFilter(choices=ContactMessage.TOPICS)

    class Meta:
        model = ContactMessage
        fields = ["topic", "is_read", "is_resolved"]


class AdminContactMessageViewSet(
    ExportMixin, BulkActionMixin, viewsets.ReadOnlyModelViewSet, viewsets.GenericViewSet
):
    """`/api/admin/contact-messages/` — «Bog'lanish» formasidan kelgan xabarlar."""

    queryset = ContactMessage.objects.select_related("user", "answered_by")
    serializer_class = ContactMessageSerializer
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "content"
    perm_actions = {"reply": "moderate", "summary": "view", "export": "view"}
    filterset_class = ContactMessageFilter
    search_fields = ["name", "email", "subject", "body"]
    ordering_fields = ["created_at", "is_resolved"]
    ordering = ["is_resolved", "-created_at"]
    audit_label = "contact_message"
    bulk_allowed_actions = ("delete", "mark_read", "resolve", "unresolve")
    export_filename = "codearena-xabarlar"
    export_columns = [
        ("created_at", "Vaqt"),
        ("name", "Ism"),
        ("email", "Email"),
        ("topic", "Mavzu"),
        ("subject", "Sarlavha"),
        ("is_resolved", "Hal qilingan"),
    ]

    @action(detail=False, methods=["get"])
    def export(self, request):
        return self.export_csv(request)

    def retrieve(self, request, *args, **kwargs):
        """Ochilgan xabar avtomatik "o'qilgan" deb belgilanadi."""
        response = super().retrieve(request, *args, **kwargs)
        ContactMessage.objects.filter(pk=kwargs.get("pk"), is_read=False).update(is_read=True)
        return response

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        """Javob matnini saqlaydi va foydalanuvchiga email yuboradi."""
        message = self.get_object()
        answer = (request.data.get("answer") or "").strip()
        if len(answer) < 5:
            return Response(
                {"detail": "Javob matni juda qisqa."}, status=status.HTTP_400_BAD_REQUEST
            )

        message.answer = answer
        message.answered_by = request.user
        message.answered_at = timezone.now()
        message.is_read = True
        message.is_resolved = True
        message.save(
            update_fields=["answer", "answered_by", "answered_at", "is_read", "is_resolved"]
        )

        from apps.accounts.emails import send_plain_email

        sent = send_plain_email(
            message.email,
            subject=f"CodeArena: {message.subject}",
            body=f"Assalomu alaykum, {message.name}!\n\n{answer}\n\n— CodeArena jamoasi",
        )
        write_audit(request, action_name="contact.reply", obj=message)
        return Response({"detail": "Javob saqlandi.", "email_sent": sent})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = ContactMessage.objects.all()
        return Response(
            {
                "total": queryset.count(),
                "unread": queryset.filter(is_read=False).count(),
                "open": queryset.filter(is_resolved=False).count(),
                "by_topic": list(
                    queryset.values("topic").annotate(count=Count("id")).order_by("-count")
                ),
            }
        )

    def handle_bulk_action(self, request, action_name, queryset, payload):
        if action_name == "mark_read":
            return {"affected": queryset.update(is_read=True)}
        if action_name == "resolve":
            return {"affected": queryset.update(is_resolved=True, is_read=True)}
        if action_name == "unresolve":
            return {"affected": queryset.update(is_resolved=False)}
        return {"affected": 0}
