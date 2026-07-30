from __future__ import annotations

from django.contrib.auth import authenticate, password_validation
from django.utils import timezone
from rest_framework import serializers

from apps.core import ranks

from .models import Locale, Role, User
from .regions import is_valid as region_is_valid


class MeSerializer(serializers.ModelSerializer):
    """Joriy foydalanuvchi — frontend auth konteksti uchun."""

    permissions = serializers.SerializerMethodField()
    rank = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "full_name", "avatar_url", "bio", "country",
            "github_url", "website_url", "region", "district", "education_place",
            "role", "locale", "rating", "max_rating", "total_points", "problems_solved",
            "current_streak", "longest_streak", "is_email_verified", "is_banned",
            "notify_email", "notify_contest", "notify_follower", "is_2fa_enabled",
            "followers_count", "following_count", "created_at", "permissions", "rank",
        )
        read_only_fields = fields

    def get_rank(self, obj: User) -> dict:
        return ranks.rank_info(obj.rating)

    def get_permissions(self, obj: User) -> dict:
        """Huquqlar rol emas, aniq kodlardan hisoblanadi.

        Ilgari bu yerdagi bayroqlar to'g'ridan-to'g'ri roldan olinardi, shuning
        uchun moderatordan huquq olib tashlansa ham interfeys uni ko'rsatishda
        davom etardi. Endi bayroq ham, menyu ham bitta manbadan — `codes`.
        """
        codes = obj.permissions
        return {
            "is_admin": obj.role == Role.ADMIN,
            "is_moderator": obj.role == Role.MODERATOR,
            "can_access_admin": obj.role in {Role.ADMIN, Role.MODERATOR} and bool(codes),
            "can_manage_users": "users.edit" in codes,
            "can_manage_problems": "problems.edit" in codes,
            "can_manage_settings": "settings.edit" in codes,
            "can_moderate_content": "content.moderate" in codes,
            "codes": sorted(codes),
        }


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField(help_text="Username yoki email")
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        login = attrs["login"].strip()
        request = self.context.get("request")

        username = login
        if "@" in login:
            user_obj = User.objects.filter(email__iexact=login).first()
            username = user_obj.username if user_obj else login

        user = authenticate(request, username=username, password=attrs["password"])
        if user is None:
            raise serializers.ValidationError({"login": "Login yoki parol noto'g'ri."})
        if not user.is_active:
            raise serializers.ValidationError({"login": "Hisob faolsizlantirilgan."})
        if user.ban_is_active:
            raise serializers.ValidationError(
                {"login": f"Hisob bloklangan. Sabab: {user.ban_reason or 'ko‘rsatilmagan'}"}
            )
        attrs["user"] = user
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})
    accept_terms = serializers.BooleanField(write_only=True)
    region = serializers.CharField(max_length=64)
    district = serializers.CharField(max_length=64)
    education_place = serializers.CharField(max_length=160)

    class Meta:
        model = User
        fields = (
            "username", "email", "full_name", "locale", "region", "district",
            "education_place", "password", "password_confirm", "accept_terms",
        )

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Bu email allaqachon ro'yxatdan o'tgan.")
        return value

    def validate_accept_terms(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError("Foydalanish shartlariga rozilik majburiy (14-bo'lim).")
        return value

    def validate_education_place(self, value: str) -> str:
        value = (value or "").strip()
        if len(value) < 3:
            raise serializers.ValidationError("Ta'lim maskani nomini to'liqroq yozing.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Parollar mos kelmadi."})
        password_validation.validate_password(attrs["password"])

        # Viloyat/tuman ro'yxatdan tanlanadi — mos kelmasa qabul qilinmaydi
        region = (attrs.get("region") or "").strip()
        district = (attrs.get("district") or "").strip()
        if not region_is_valid(region):
            raise serializers.ValidationError({"region": "Viloyatni ro'yxatdan tanlang."})
        if not region_is_valid(region, district):
            raise serializers.ValidationError({"district": "Tuman tanlangan viloyatga mos emas."})
        attrs["region"], attrs["district"] = region, district

        from apps.core import site_settings

        if not site_settings.get_bool("registration_open", True):
            raise serializers.ValidationError(
                {"detail": "Hozircha yangi hisob yaratish yopilgan."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        validated_data.pop("accept_terms")
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Joriy parol noto'g'ri.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "full_name", "bio", "avatar_url", "country", "github_url",
            "website_url", "region", "district", "education_place",
            "locale", "notify_email", "notify_contest", "notify_follower",
        )

    def validate(self, attrs):
        region = attrs.get("region", getattr(self.instance, "region", "")) or ""
        district = attrs.get("district", getattr(self.instance, "district", "")) or ""
        if region and not region_is_valid(region, district):
            raise serializers.ValidationError({"district": "Viloyat va tuman mos emas."})
        return attrs

    def validate_avatar_url(self, value: str) -> str:
        """Faqat sayt ichidagi `/media/...` yoki http(s) havolaga ruxsat.

        `javascript:` kabi sxemalar `<img src>` orqali XSS uchun ishlatilishi
        mumkin, shuning uchun ular rad etiladi.
        """
        value = (value or "").strip()
        if not value:
            return ""
        if value.startswith("/media/") or value.startswith(("http://", "https://")):
            return value[:500]
        raise serializers.ValidationError("Avatar havolasi http(s) yoki /media/ bilan boshlanishi kerak.")


# ------------------------------------------------------------------ admin
class AdminUserListSerializer(serializers.ModelSerializer):
    ban_active = serializers.BooleanField(source="ban_is_active", read_only=True)
    rank = serializers.SerializerMethodField()

    def get_rank(self, obj) -> dict:
        return ranks.rank_info(obj.rating)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "full_name", "avatar_url", "role", "locale",
            "rating", "rank", "total_points", "problems_solved", "submissions_count",
            "current_streak", "is_active", "is_banned", "ban_active",
            "is_email_verified", "country", "region", "district", "education_place",
            "created_at", "last_login",
        )


class AdminUserDetailSerializer(serializers.ModelSerializer):
    ban_active = serializers.BooleanField(source="ban_is_active", read_only=True)
    banned_by_username = serializers.CharField(source="banned_by.username", read_only=True, default=None)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    rank = serializers.SerializerMethodField()
    effective_permissions = serializers.SerializerMethodField()

    def get_rank(self, obj) -> dict:
        return ranks.rank_info(obj.rating)

    def get_effective_permissions(self, obj) -> list[str]:
        return sorted(obj.permissions)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "full_name", "bio", "avatar_url", "country",
            "region", "district", "education_place",
            "github_url", "website_url", "role", "locale", "rating", "rank", "max_rating",
            "total_points", "problems_solved", "submissions_count", "contests_participated",
            "current_streak", "longest_streak", "last_solved_date",
            "followers_count", "following_count",
            "is_active", "is_email_verified", "is_banned", "ban_active", "ban_reason",
            "banned_until", "banned_by_username", "notify_email", "notify_contest",
            "notify_follower", "is_2fa_enabled", "extra_permissions", "denied_permissions",
            "effective_permissions",
            "last_login", "last_login_ip", "created_at", "updated_at", "password",
        )
        read_only_fields = (
            "id", "max_rating", "problems_solved", "submissions_count",
            "contests_participated", "followers_count", "following_count",
            "rank", "effective_permissions",
            "last_login", "last_login_ip", "created_at", "updated_at",
        )

    def validate_role(self, value):
        request = self.context.get("request")
        if request and self.instance and self.instance == request.user and value != Role.ADMIN:
            raise serializers.ValidationError("O'z rolingizni pasaytira olmaysiz.")
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            password_validation.validate_password(password, user)
            user.set_password(password)
            user.save(update_fields=["password"])
        return user


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "full_name", "role", "locale",
            "password", "is_active", "is_email_verified", "rating", "total_points",
        )

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class BanSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500)
    until = serializers.DateTimeField(required=False, allow_null=True)

    def validate_until(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Blok tugash vaqti kelajakda bo'lishi kerak.")
        return value


class RoleChangeSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=Role.choices)


class AdjustRatingSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=0, max_value=5000)
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)


class LocaleSerializer(serializers.Serializer):
    locale = serializers.ChoiceField(choices=Locale.choices)
