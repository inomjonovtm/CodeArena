"""Rol va aniq huquq kodlari asosidagi ruxsatlar — admin panel API uchun.

Ilgari bu yerda faqat `IsAdminOrModerator` bor edi va deyarli barcha admin
viewsetlar shuni ishlatardi. Natijada `ROLE_PERMISSIONS` jadvali (modelda
mavjud bo'lsa ham) hech qayerda tekshirilmasdi va moderator amalda
administrator bilan bir xil huquqqa ega bo'lib qolgandi.

Endi har bir viewset o'zining resursini e'lon qiladi:

    class AdminProblemViewSet(...):
        permission_classes = [IsStaff, HasResourcePerm]
        perm_resource = "problems"
        perm_actions = {"publish": "publish", "summary": "view"}

`HasResourcePerm` amal (`action`) ni huquq kodiga aylantiradi
(`list` → `problems.view`, `destroy` → `problems.delete`) va uni
`user.permissions` to'plamiga solishtiradi. To'plam esa rol huquqlari +
foydalanuvchiga alohida berilganlar − olib tashlanganlardan iborat.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

# Standart DRF amallari → huquq qo'shimchasi
ACTION_SUFFIX = {
    "list": "view",
    "retrieve": "view",
    "metadata": "view",
    "summary": "view",
    "export": "view",
    "stats": "view",
    "create": "edit",
    "update": "edit",
    "partial_update": "edit",
    "destroy": "delete",
    "bulk": "delete",
}


def _user(request):
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None
    return user


def _role(request) -> str:
    user = _user(request)
    return getattr(user, "role", "") or "" if user else ""


class IsStaff(BasePermission):
    """Admin panelga umumiy kirish: rol admin yoki moderator."""

    message = "Bu bo'limga faqat administrator yoki moderator kira oladi."

    def has_permission(self, request, view):
        return _role(request) in {"admin", "moderator"}


class IsAdmin(BasePermission):
    """Faqat `role=admin`."""

    message = "Bu amal uchun administrator huquqi talab qilinadi."

    def has_permission(self, request, view):
        return _role(request) == "admin"


class IsAdminOrModerator(IsStaff):
    """Eski nom — yangi kodda `IsStaff` ishlatilsin."""


class IsAdminOrModeratorReadOnly(BasePermission):
    """Moderator ko'ra oladi, faqat admin o'zgartira oladi."""

    message = "O'zgartirish uchun administrator huquqi talab qilinadi."

    def has_permission(self, request, view):
        role = _role(request)
        if role == "admin":
            return True
        return role == "moderator" and request.method in SAFE_METHODS


class HasResourcePerm(BasePermission):
    """Viewsetdagi `perm_resource` + amal nomi bo'yicha huquq kodini tekshiradi.

    Viewset atributlari:
      * `perm_resource` — resurs nomi (`"problems"`). Bo'sh bo'lsa tekshirilmaydi.
      * `perm_actions`  — `{"publish": "publish"}` yoki to'liq kod
        (`{"sync": "settings.edit"}`). `"*"` — huquq talab qilinmaydi.
    """

    message = "Bu amal uchun sizda ruxsat yo'q."

    def has_permission(self, request, view):
        user = _user(request)
        if user is None:
            return False

        resource = getattr(view, "perm_resource", "") or ""
        if not resource:
            return True

        action = getattr(view, "action", None) or ""
        overrides = getattr(view, "perm_actions", None) or {}

        suffix = overrides.get(action)
        if suffix is None:
            suffix = ACTION_SUFFIX.get(action)
        if suffix is None:
            # Ro'yxatda yo'q maxsus amal: o'qish so'rovi — `view`, aks holda `edit`.
            # Ya'ni noma'lum amal xavfsiz tomonga — kuchliroq huquq talab qiladi.
            suffix = "view" if request.method in SAFE_METHODS else "edit"

        if suffix == "*":
            return True

        code = suffix if "." in suffix else f"{resource}.{suffix}"
        self.message = f"«{code}» huquqi yo'q — administratorga murojaat qiling."
        return user.has_perm_code(code)


def require(code: str):
    """`@api_view` uchun huquq klassi yasaydi: `permission_classes([require("settings.edit")])`."""

    class _RequirePerm(BasePermission):
        message = f"«{code}» huquqi talab qilinadi."

        def has_permission(self, request, view):
            user = _user(request)
            return bool(user and user.has_perm_code(code))

    _RequirePerm.__name__ = f"Require_{code.replace('.', '_')}"
    return _RequirePerm


class IsOwnerOrStaff(BasePermission):
    """Obyekt egasi yoki admin/moderator."""

    def has_object_permission(self, request, view, obj):
        if _role(request) in {"admin", "moderator"}:
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "author", None) or getattr(obj, "owner", None)
        return owner == request.user
