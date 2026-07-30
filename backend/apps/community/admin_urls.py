from rest_framework.routers import DefaultRouter

from .admin_views import AdminGroupMemberViewSet, AdminGroupViewSet

router = DefaultRouter()
router.register("groups", AdminGroupViewSet, basename="admin-group")
router.register("group-members", AdminGroupMemberViewSet, basename="admin-group-member")

urlpatterns = router.urls
