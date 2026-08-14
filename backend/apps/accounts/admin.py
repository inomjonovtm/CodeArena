"""Foydalanuvchilar va huquqlar — boshqaruv paneli.

Bu ilovaning admin qismi eng nozigi: shu yerdan rol beriladi, blok qo'yiladi
va Studio huquqlari taqsimlanadi. Shuning uchun har bir xavfli amal ATAYLAB
ko'rinadigan qilingan — parol maydoni tahrirlanmaydi, rol o'zgarishi audit
jurnaliga tushadi, o'zini o'zi bloklash esa umuman mumkin emas.
"""
from __future__ import annotations

from django.contrib import admin, messages
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.models import Group
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import (
    BooleanRadioFilter,
    ChoicesDropdownFilter,
    RangeDateFilter,
    RangeNumericFilter,
)
from unfold.decorators import action, display

from apps.core.admin_utils import titled
from apps.core.ranks import rank_info

from .models import (
    ALL_PERMISSIONS,
    AdminSession,
    EmailVerification,
    Follow,
    Role,
    User,
)
from .roles import apply_role

# Django o'zining `Group` modelini o'z admini bilan ro'yxatdan o'tkazadi.
# Bizga u kerak (rol huquqlari shu orqali beriladi), lekin unfold uslubida
# ko'rinishi uchun qayta ro'yxatdan o'tkazamiz.
admin.site.unregister(Group)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    """Huquq guruhi — moderatorga nimalarga ruxsat berilishini shu yerda tanlanadi."""

    list_display = ("name", "permission_count", "member_count")
    search_fields = ("name",)

    @display(description="Huquqlar")
    def permission_count(self, obj: Group) -> int:
        return obj.permissions.count()

    @display(description="A'zolar")
    def member_count(self, obj: Group) -> int:
        return obj.user_set.count()


@admin.register(User)
class UserAdmin(ModelAdmin):
    list_display = (
        "username_cell",
        "role_badge",
        "rating_cell",
        "problems_solved",
        "state_badge",
        "created_at",
    )
    list_filter = (
        ("role", titled(ChoicesDropdownFilter, "Rol")),
        ("is_banned", titled(BooleanRadioFilter, "Bloklangan")),
        ("is_active", titled(BooleanRadioFilter, "Faol")),
        ("is_email_verified", titled(BooleanRadioFilter, "Email tasdiqlangan")),
        ("rating", titled(RangeNumericFilter, "Reyting")),
        ("created_at", titled(RangeDateFilter, "Ro'yxatdan o'tgan sana")),
        "region",
    )
    search_fields = ("username", "email", "full_name", "education_place")
    ordering = ("-created_at",)
    list_per_page = 40
    date_hierarchy = "created_at"
    autocomplete_fields = ("banned_by", "groups")
    filter_horizontal = ("groups", "user_permissions")
    actions = ("make_moderator", "make_setter", "make_user", "unban_users", "verify_email")

    readonly_fields = (
        "password",
        "last_login",
        "last_login_ip",
        "created_at",
        "updated_at",
        "rank_preview",
        "permission_preview",
    )

    fieldsets = (
        ("Hisob", {
            "fields": ("username", "email", "full_name", "password", "is_email_verified"),
        }),
        ("Rol va huquqlar", {
            "description": (
                "Rol asosiy huquqlar to'plamini beradi. Guruh — Django modellariga "
                "kirish (bu panel). «Qo'shimcha/olib tashlangan ruxsatlar» esa "
                "Studio panelidagi nozik sozlash uchun."
            ),
            "fields": (
                "role", "is_active", "is_staff", "is_superuser",
                "groups", "user_permissions",
                "extra_permissions", "denied_permissions", "permission_preview",
            ),
        }),
        ("Blok", {
            "classes": ("collapse",),
            "fields": ("is_banned", "ban_reason", "banned_until", "banned_by"),
        }),
        ("Profil", {
            "classes": ("collapse",),
            "fields": (
                "avatar_url", "bio", "country", "region", "district", "education_place",
                "github_url", "website_url", "locale",
            ),
        }),
        ("Natijalar", {
            "classes": ("collapse",),
            "fields": (
                "rank_preview", "rating", "max_rating", "total_points", "problems_solved",
                "submissions_count", "contests_participated",
                "current_streak", "longest_streak", "last_solved_date",
            ),
        }),
        ("Xavfsizlik", {
            "classes": ("collapse",),
            "fields": ("is_2fa_enabled", "last_login", "last_login_ip", "created_at", "updated_at"),
        }),
    )

    # --------------------------------------------------------------- ustunlar
    @display(description="Foydalanuvchi", ordering="username")
    def username_cell(self, obj: User):
        return format_html(
            '<div class="font-medium">{}</div><div class="text-xs text-base-500">@{}</div>',
            obj.full_name or obj.username,
            obj.username,
        )

    @display(
        description="Rol",
        label={
            Role.ADMIN: "danger",
            Role.MODERATOR: "warning",
            Role.SETTER: "info",
            Role.USER: "",
        },
        ordering="role",
    )
    def role_badge(self, obj: User):
        return obj.role, obj.get_role_display()

    @display(description="Reyting", ordering="rating")
    def rating_cell(self, obj: User):
        info = rank_info(obj.rating)
        return format_html(
            '<span class="font-mono">{}</span> <span class="text-xs text-base-500">{}</span>',
            obj.rating,
            info.get("name_uz", ""),
        )

    @display(description="Holat", label=True)
    def state_badge(self, obj: User):
        if obj.ban_is_active:
            return "danger", "Bloklangan"
        if not obj.is_active:
            return "warning", "O'chirilgan"
        if not obj.is_email_verified:
            return "info", "Email tasdiqlanmagan"
        return "success", "Faol"

    @display(description="Rank")
    def rank_preview(self, obj: User) -> str:
        info = rank_info(obj.rating)
        return f"{info.get('name_uz', '—')} ({info.get('code', '')})"

    @display(description="Amaldagi Studio huquqlari")
    def permission_preview(self, obj: User):
        """Rol + qo'shimcha − olib tashlangan: yakuniy natija.

        Uch manbadan yig'iladigan to'plamni bosh ko'z bilan hisoblash oson
        emas — natijani shu yerda ko'rsatish xatoni oldini oladi.
        """
        if not obj.pk:
            return "—"
        codes = sorted(obj.permissions)
        if not codes:
            return format_html('<span class="text-base-500">Hech qanday huquq yo\'q</span>')
        return format_html(
            '<div class="flex flex-wrap gap-1">{}</div>',
            format_html("".join(
                f'<span class="bg-base-100 dark:bg-base-800 rounded px-1.5 py-0.5 '
                f'text-xs font-mono">{code}</span>' for code in codes
            )),
        )

    # ---------------------------------------------------------------- amallar
    def _set_role(self, request, queryset, role: str, label: str):
        # O'z rolini pasaytirish — panelga kirishni yo'qotishning eng tez yo'li.
        protected = queryset.filter(pk=request.user.pk).exists()
        queryset = queryset.exclude(pk=request.user.pk)

        count = 0
        for user in queryset:
            user.role = role
            user.save(update_fields=["role"])
            # Guruh va `is_staff` rolga ergashadi — aks holda yangi moderator
            # panelga kira olmasdi.
            apply_role(user)
            count += 1

        messages.success(request, f"{count} ta foydalanuvchi {label} bo'ldi.")
        if protected:
            messages.warning(request, "O'z rolingiz o'zgartirilmadi.")

    @action(description="Moderator qilish")
    def make_moderator(self, request, queryset):
        self._set_role(request, queryset, Role.MODERATOR, "moderator")

    @action(description="Muallif (setter) qilish")
    def make_setter(self, request, queryset):
        self._set_role(request, queryset, Role.SETTER, "muallif")

    @action(description="Oddiy foydalanuvchi qilish")
    def make_user(self, request, queryset):
        self._set_role(request, queryset, Role.USER, "oddiy foydalanuvchi")

    @action(description="Blokdan chiqarish")
    def unban_users(self, request, queryset):
        count = queryset.update(is_banned=False, ban_reason="", banned_until=None, banned_by=None)
        messages.success(request, f"{count} ta foydalanuvchi blokdan chiqarildi.")

    @action(description="Emailni tasdiqlangan deb belgilash")
    def verify_email(self, request, queryset):
        count = queryset.update(is_email_verified=True)
        messages.success(request, f"{count} ta email tasdiqlandi.")

    # ------------------------------------------------------------- himoyalar
    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        # Faqat superuser boshqa odamga superuser huquqini bera oladi —
        # aks holda moderator o'zini ko'tarib olishi mumkin bo'lardi.
        if not request.user.is_superuser:
            fields += ["is_superuser", "user_permissions"]
        # O'zini o'zi bloklab qo'yish yoki roldan tushirish — qaytarib
        # bo'lmaydigan xato: odam panelga qayta kira olmaydi.
        if obj is not None and obj.pk == request.user.pk:
            fields += ["role", "is_active", "is_banned", "is_staff"]
        return tuple(dict.fromkeys(fields))

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Rol qo'lda o'zgartirilgan bo'lishi mumkin — guruh va `is_staff` ni
        # darhol moslaymiz, keyingi `sync_roles` ni kutmasdan.
        apply_role(obj)

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        """Huquq kodlari maydonlariga ro'yxatni izoh sifatida qo'shadi."""
        formfield = super().formfield_for_dbfield(db_field, request, **kwargs)
        if db_field.name in {"extra_permissions", "denied_permissions"} and formfield:
            formfield.help_text = (
                "JSON ro'yxat. Mavjud kodlar: " + ", ".join(ALL_PERMISSIONS)
            )
        return formfield


@admin.register(Follow)
class FollowAdmin(ModelAdmin):
    list_display = ("follower", "following", "created_at")
    search_fields = ("follower__username", "following__username")
    autocomplete_fields = ("follower", "following")
    list_filter = (("created_at", RangeDateFilter),)
    ordering = ("-created_at",)


@admin.register(AdminSession)
class AdminSessionAdmin(ModelAdmin):
    """Faol sessiyalar — shubhali kirishni shu yerdan uzish mumkin."""

    list_display = ("user", "ip_address", "device", "browser", "last_seen_at", "state_badge")
    list_filter = (("last_seen_at", RangeDateFilter),)
    search_fields = ("user__username", "ip_address", "user_agent")
    ordering = ("-last_seen_at",)
    readonly_fields = tuple(
        field.name for field in AdminSession._meta.fields if field.name != "id"
    )

    @display(description="Holat", label=True)
    def state_badge(self, obj):
        """Sessiya tirikmi — oxirgi bir soat ichida faollik bo'lganmi."""
        if obj.revoked_at:
            return "danger", "Yopilgan"
        stale = timezone.now() - timezone.timedelta(hours=1)
        if obj.last_seen_at and obj.last_seen_at >= stale:
            return "success", "Faol"
        return "", "Nofaol"

    def has_add_permission(self, request) -> bool:
        # Sessiya kirish paytida yaratiladi — qo'lda qo'shish ma'nosiz.
        return False


@admin.register(EmailVerification)
class EmailVerificationAdmin(ModelAdmin):
    list_display = ("user", "purpose", "used_at", "expires_at", "created_at")
    list_filter = ("purpose", ("created_at", RangeDateFilter))
    search_fields = ("user__username", "user__email")
    ordering = ("-created_at",)
    autocomplete_fields = ("user",)

    def has_add_permission(self, request) -> bool:
        return False
