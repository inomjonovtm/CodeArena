from __future__ import annotations

import django_filters as filters
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core import ranks
from apps.core.exports import ExportMixin
from apps.core.mixins import AuditLogMixin, BulkActionMixin, write_audit
from apps.core.permissions import HasResourcePerm, IsStaff

from .models import AdminSession, Role, User
from .sessions import revoke_queryset
from .serializers import (
    AdjustRatingSerializer,
    AdminUserCreateSerializer,
    AdminUserDetailSerializer,
    AdminUserListSerializer,
    BanSerializer,
    RoleChangeSerializer,
)


def _rank_breakdown(queryset) -> list[dict]:
    """Rank guruhlari (bronza, kumush...) bo'yicha nechta foydalanuvchi bor.

    Rank ustun sifatida saqlanmaydi (reytingdan hisoblanadi), shuning uchun
    `GROUP BY` o'rniga har guruh uchun oraliq bo'yicha `COUNT` qilinadi —
    bir nechta yengil so'rov, chegaralar o'zgarsa natija ham o'zi moslashadi.
    """
    rows = []
    for group in ranks.GROUPS:
        bounds = ranks.group_range(group["key"])
        if bounds is None:
            continue
        low, high = bounds
        scoped = queryset.filter(rating__gte=low)
        if high is not None:
            scoped = scoped.filter(rating__lte=high)
        rows.append({**group, "min_rating": low, "count": scoped.count()})
    return rows


class UserFilter(filters.FilterSet):
    role = filters.MultipleChoiceFilter(choices=Role.choices)
    is_banned = filters.BooleanFilter()
    is_active = filters.BooleanFilter()
    is_email_verified = filters.BooleanFilter()
    locale = filters.CharFilter()
    country = filters.CharFilter(lookup_expr="iexact")

    # --- manzil bo'yicha
    region = filters.CharFilter(lookup_expr="iexact")
    district = filters.CharFilter(lookup_expr="iexact")
    education_place = filters.CharFilter(lookup_expr="icontains")
    has_region = filters.BooleanFilter(method="filter_has_region")

    rating_min = filters.NumberFilter(field_name="rating", lookup_expr="gte")
    rating_max = filters.NumberFilter(field_name="rating", lookup_expr="lte")
    points_min = filters.NumberFilter(field_name="total_points", lookup_expr="gte")

    # --- rank bo'yicha (reyting chegaralariga aylantiriladi)
    rank = filters.CharFilter(method="filter_rank_group")
    tier = filters.NumberFilter(method="filter_tier")
    tier_min = filters.NumberFilter(method="filter_tier_min")

    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = User
        fields = [
            "role", "is_banned", "is_active", "is_email_verified",
            "locale", "country", "region", "district",
        ]

    def filter_has_region(self, queryset, name, value):
        """Manzili to'ldirilgan / to'ldirilmagan hisoblar (Google orqali kirganlar)."""
        return queryset.exclude(region="") if value else queryset.filter(region="")

    def filter_rank_group(self, queryset, name, value):
        """Butun rank guruhi — masalan barcha «oltin» pog'onalari."""
        bounds = ranks.group_range(str(value))
        if bounds is None:
            return queryset.none()
        low, high = bounds
        queryset = queryset.filter(rating__gte=low)
        return queryset.filter(rating__lte=high) if high is not None else queryset

    def filter_tier(self, queryset, name, value):
        """Aniq bir pog'ona (masalan «Oltin II»)."""
        low, high = ranks.rating_range(int(value))
        queryset = queryset.filter(rating__gte=low)
        return queryset.filter(rating__lte=high) if high is not None else queryset

    def filter_tier_min(self, queryset, name, value):
        low, _ = ranks.rating_range(int(value))
        return queryset.filter(rating__gte=low)


class AdminUserViewSet(ExportMixin, AuditLogMixin, BulkActionMixin, viewsets.ModelViewSet):
    """`/api/admin/users/` — foydalanuvchilarni to'liq boshqarish."""

    queryset = User.objects.all()
    permission_classes = [IsStaff, HasResourcePerm]
    perm_resource = "users"
    perm_actions = {
        "ban": "ban", "unban": "ban",
        "change_role": "role", "adjust_rating": "edit",
        "stats": "view", "recent_submissions": "submissions.view",
        "summary": "view", "export": "view",
    }
    filterset_class = UserFilter
    search_fields = [
        "username", "email", "full_name", "region", "district", "education_place",
    ]
    ordering_fields = [
        "created_at", "username", "rating", "total_points",
        "problems_solved", "last_login", "submissions_count",
    ]
    ordering = ["-created_at"]
    audit_label = "user"
    bulk_allowed_actions = ("delete", "ban", "unban", "activate", "deactivate", "verify_email", "set_role")
    export_filename = "codearena-userlar"
    export_columns = [
        ("username", "Username"),
        ("email", "Email"),
        ("full_name", "Toliq ism"),
        ("role", "Rol"),
        ("rating", "Reyting"),
        ("total_points", "Ballar"),
        ("problems_solved", "Yechilgan"),
        ("submissions_count", "Submissionlar"),
        ("current_streak", "Streak"),
        ("country", "Davlat"),
        ("region", "Viloyat"),
        ("district", "Tuman"),
        ("education_place", "Talim maskani"),
        ("is_active", "Faol"),
        ("is_banned", "Bloklangan"),
        ("is_email_verified", "Email tasdiqlangan"),
        ("last_login", "Oxirgi kirish"),
        ("created_at", "Royxatdan otgan"),
    ]

    @action(detail=False, methods=["get"])
    def export(self, request):
        return self.export_csv(request)

    def get_serializer_class(self):
        if self.action == "create":
            return AdminUserCreateSerializer
        if self.action in {"list"}:
            return AdminUserListSerializer
        return AdminUserDetailSerializer

    def get_queryset(self):
        return super().get_queryset().select_related("banned_by")

    def perform_destroy(self, instance):
        if instance == self.request.user:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"detail": "O'zingizni o'chira olmaysiz."})
        super().perform_destroy(instance)

    # ------------------------------------------------------------- actions
    @action(detail=True, methods=["post"])
    def ban(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            return Response({"detail": "O'zingizni bloklay olmaysiz."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = BanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.is_banned = True
        user.ban_reason = serializer.validated_data["reason"]
        user.banned_until = serializer.validated_data.get("until")
        user.banned_by = request.user
        user.save(update_fields=["is_banned", "ban_reason", "banned_until", "banned_by"])
        # Blok darhol kuchga kirsin: aks holda foydalanuvchi qo'lidagi JWT bilan
        # tokeni muddati tugaguncha (va refresh orqali undan ham uzoq) ishlayverardi.
        revoke_queryset(AdminSession.objects.filter(user=user))
        write_audit(request, action_name="user.ban", obj=user, changes=serializer.validated_data)
        return Response(AdminUserDetailSerializer(user, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def unban(self, request, pk=None):
        user = self.get_object()
        user.is_banned = False
        user.ban_reason = ""
        user.banned_until = None
        user.banned_by = None
        user.save(update_fields=["is_banned", "ban_reason", "banned_until", "banned_by"])
        write_audit(request, action_name="user.unban", obj=user)
        return Response(AdminUserDetailSerializer(user, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="change-role")
    def change_role(self, request, pk=None):
        user = self.get_object()
        serializer = RoleChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_role = serializer.validated_data["role"]
        if user == request.user and new_role != Role.ADMIN:
            return Response({"detail": "O'z rolingizni pasaytira olmaysiz."},
                            status=status.HTTP_400_BAD_REQUEST)
        old_role = user.role
        user.role = new_role
        user.is_staff = new_role == Role.ADMIN
        user.save(update_fields=["role", "is_staff"])
        write_audit(request, action_name="user.change_role", obj=user,
                    changes={"role": {"before": old_role, "after": new_role}})
        return Response(AdminUserDetailSerializer(user, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="adjust-rating")
    def adjust_rating(self, request, pk=None):
        user = self.get_object()
        serializer = AdjustRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        before = user.rating
        user.rating = serializer.validated_data["rating"]
        user.max_rating = max(user.max_rating, user.rating)
        user.save(update_fields=["rating", "max_rating"])
        write_audit(
            request, action_name="user.adjust_rating", obj=user,
            changes={"rating": {"before": before, "after": user.rating},
                     "reason": serializer.validated_data.get("reason", "")},
        )
        return Response(AdminUserDetailSerializer(user, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        user = self.get_object()
        by_status = (
            user.submissions.values("status").annotate(count=Count("id")).order_by("-count")
        )
        by_language = (
            user.submissions.values("language").annotate(count=Count("id")).order_by("-count")
        )
        solved_by_difficulty = (
            user.solved_problems.values("problem__difficulty").annotate(count=Count("id"))
        )
        return Response(
            {
                "submissions_by_status": list(by_status),
                "submissions_by_language": list(by_language),
                "solved_by_difficulty": list(solved_by_difficulty),
                "contests": user.contest_entries.count(),
                "bookmarks": user.bookmarks.count(),
                "discussions": user.discussions.count(),
            }
        )

    @action(detail=True, methods=["get"], url_path="recent-submissions")
    def recent_submissions(self, request, pk=None):
        from apps.judge.serializers import AdminSubmissionListSerializer

        user = self.get_object()
        rows = user.submissions.select_related("problem").order_by("-created_at")[:25]
        return Response(AdminSubmissionListSerializer(rows, many=True).data)

    # ------------------------------------------------------------- bulk
    def handle_bulk_action(self, request, action_name, queryset, payload):
        queryset = queryset.exclude(pk=request.user.pk)
        if action_name == "ban":
            reason = payload.get("reason") or "Bulk ban (admin panel)"
            affected = queryset.update(
                is_banned=True, ban_reason=reason, banned_by=request.user,
                banned_until=payload.get("until") or None,
            )
            return {"affected": affected}
        if action_name == "unban":
            return {"affected": queryset.update(is_banned=False, ban_reason="", banned_until=None, banned_by=None)}
        if action_name == "activate":
            return {"affected": queryset.update(is_active=True)}
        if action_name == "deactivate":
            return {"affected": queryset.update(is_active=False)}
        if action_name == "verify_email":
            return {"affected": queryset.update(is_email_verified=True)}
        if action_name == "set_role":
            role = payload.get("role")
            if role not in dict(Role.choices):
                from rest_framework.exceptions import ValidationError

                raise ValidationError({"role": "Noto'g'ri rol."})
            return {"affected": queryset.update(role=role, is_staff=role == Role.ADMIN)}
        return {"affected": 0}

    @action(detail=False, methods=["get"])
    def summary(self, request):
        now = timezone.now()
        qs = User.objects.all()
        return Response(
            {
                "total": qs.count(),
                "active": qs.filter(is_active=True, is_banned=False).count(),
                "banned": qs.filter(is_banned=True).count(),
                "admins": qs.filter(role=Role.ADMIN).count(),
                "moderators": qs.filter(role=Role.MODERATOR).count(),
                "new_today": qs.filter(created_at__date=now.date()).count(),
                "new_this_week": qs.filter(created_at__gte=now - timezone.timedelta(days=7)).count(),
                "unverified": qs.filter(is_email_verified=False).count(),
                "by_locale": list(qs.values("locale").annotate(count=Count("id"))),
                "by_role": list(qs.values("role").annotate(count=Count("id"))),
                "by_region": list(
                    qs.exclude(region="")
                    .values("region")
                    .annotate(count=Count("id"))
                    .order_by("-count")
                ),
                "without_region": qs.filter(region="").count(),
                "by_rank": _rank_breakdown(qs),
            }
        )
