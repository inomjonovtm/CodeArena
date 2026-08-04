from __future__ import annotations

from rest_framework import serializers

from .models import Announcement, AuditLog, PlagiarismPair, SiteSetting


class PlagiarismPairListSerializer(serializers.ModelSerializer):
    user_a_username = serializers.CharField(source="user_a.username", read_only=True, default=None)
    user_b_username = serializers.CharField(source="user_b.username", read_only=True, default=None)
    problem_title = serializers.CharField(source="problem.title_uz", read_only=True)
    problem_slug = serializers.CharField(source="problem.slug", read_only=True)
    contest_title = serializers.CharField(source="contest.title_uz", read_only=True, default=None)
    reviewed_by_username = serializers.CharField(source="reviewed_by.username", read_only=True, default=None)

    class Meta:
        model = PlagiarismPair
        fields = (
            "id", "contest", "contest_title", "problem", "problem_title", "problem_slug",
            "submission_a", "submission_b", "user_a", "user_a_username",
            "user_b", "user_b_username", "similarity", "language", "same_ip",
            "time_delta_seconds", "status", "reviewed_by_username", "reviewed_at",
            "review_note", "created_at",
        )


class PlagiarismPairDetailSerializer(PlagiarismPairListSerializer):
    code_a = serializers.CharField(source="submission_a.code", read_only=True)
    code_b = serializers.CharField(source="submission_b.code", read_only=True)
    submitted_a_at = serializers.DateTimeField(source="submission_a.created_at", read_only=True)
    submitted_b_at = serializers.DateTimeField(source="submission_b.created_at", read_only=True)
    ip_a = serializers.CharField(source="submission_a.ip_address", read_only=True, default=None)
    ip_b = serializers.CharField(source="submission_b.ip_address", read_only=True, default=None)

    class Meta(PlagiarismPairListSerializer.Meta):
        fields = (
            *PlagiarismPairListSerializer.Meta.fields,
            "matched_lines", "code_a", "code_b",
            "submitted_a_at", "submitted_b_at", "ip_a", "ip_b",
        )


class PlagiarismReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["cleared", "confirmed"])
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    disqualify = serializers.BooleanField(default=False)


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default=None)
    actor_role = serializers.CharField(source="actor.role", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = (
            "id", "actor", "actor_username", "actor_role", "action", "target_type",
            "target_id", "target_repr", "changes", "ip_address", "user_agent", "created_at",
        )
        read_only_fields = fields


class SiteSettingSerializer(serializers.ModelSerializer):
    updated_by_username = serializers.CharField(source="updated_by.username", read_only=True, default=None)

    class Meta:
        model = SiteSetting
        fields = (
            "id", "key", "value", "value_type", "group", "label_uz", "label_en",
            "description", "is_public", "updated_by_username", "updated_at",
        )
        read_only_fields = ("id", "updated_at")


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)
    target_contest_title = serializers.CharField(
        source="target_contest.title_uz", read_only=True, default=None
    )
    target_group_name = serializers.CharField(source="target_group.name", read_only=True, default=None)
    is_live = serializers.BooleanField(read_only=True)
    audience_size = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        # Auditoriya, maqsadli obyektlar va yetkazish maydonlari modelda
        # ancha oldin bor edi, lekin serializerda ochilmagani uchun panelda
        # umuman ko'rinmasdi — ya'ni funksiya yozilgan, ammo ishlatib
        # bo'lmasdi.
        fields = (
            "id", "title_uz", "title_en", "body_uz", "body_en", "level",
            "is_active", "is_pinned", "is_dismissible", "is_live",
            "starts_at", "ends_at",
            "audience", "target_contest", "target_contest_title",
            "target_group", "target_group_name", "audience_size",
            "action_url", "action_label_uz", "action_label_en",
            "send_email", "email_sent_at", "email_recipients",
            "send_notification", "send_push", "notified_at", "notified_recipients",
            "created_by_username", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "created_at", "updated_at", "is_live",
            "email_sent_at", "email_recipients", "notified_at", "notified_recipients",
        )

    def get_audience_size(self, obj) -> int:
        """Nechta kishiga tegishli — yuborishdan oldin ko'rinadi."""
        try:
            return obj.recipients().count()
        except Exception:  # noqa: BLE001
            return 0

    def validate(self, attrs):
        audience = attrs.get("audience", getattr(self.instance, "audience", "all"))
        contest = attrs.get("target_contest", getattr(self.instance, "target_contest", None))
        group = attrs.get("target_group", getattr(self.instance, "target_group", None))

        if audience == "contest" and not contest:
            raise serializers.ValidationError({"target_contest": "Musobaqani tanlang."})
        if audience == "group" and not group:
            raise serializers.ValidationError({"target_group": "Guruhni tanlang."})

        starts = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts and ends and ends <= starts:
            raise serializers.ValidationError({"ends_at": "Tugash vaqti boshlanishdan keyin bo'lsin."})

        url = attrs.get("action_url", getattr(self.instance, "action_url", "") or "")
        label = attrs.get("action_label_uz", getattr(self.instance, "action_label_uz", "") or "")
        if url and not label:
            raise serializers.ValidationError({"action_label_uz": "Tugma matnini yozing."})
        if url and not (url.startswith("/") or url.startswith("http://") or url.startswith("https://")):
            raise serializers.ValidationError(
                {"action_url": "Manzil `/` bilan yoki `http(s)://` bilan boshlansin."}
            )
        return attrs
