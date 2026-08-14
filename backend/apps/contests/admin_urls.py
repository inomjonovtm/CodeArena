from rest_framework.routers import DefaultRouter

from .admin_views import (
    AdminContestParticipantViewSet,
    AdminContestStaffViewSet,
    AdminContestViewSet,
)

router = DefaultRouter()
router.register("contests", AdminContestViewSet, basename="admin-contest")
router.register("contest-staff", AdminContestStaffViewSet, basename="admin-contest-staff")
router.register("contest-participants", AdminContestParticipantViewSet, basename="admin-contest-participant")

urlpatterns = router.urls
