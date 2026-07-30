from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import AdminUserViewSet
from .security_views import (
    AdminSessionViewSet,
    permission_catalog,
    set_user_permissions,
    totp_disable,
    totp_enable,
    totp_setup,
)

router = DefaultRouter()
router.register("users", AdminUserViewSet, basename="admin-user")
router.register("sessions", AdminSessionViewSet, basename="admin-session")

urlpatterns = [
    path("security/2fa/setup/", totp_setup, name="admin-2fa-setup"),
    path("security/2fa/enable/", totp_enable, name="admin-2fa-enable"),
    path("security/2fa/disable/", totp_disable, name="admin-2fa-disable"),
    path("security/permissions/", permission_catalog, name="admin-permission-catalog"),
    path("users/<uuid:user_id>/permissions/", set_user_permissions, name="admin-user-permissions"),
    *router.urls,
]
