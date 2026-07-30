from rest_framework.routers import DefaultRouter

from .admin_views import AdminContestParticipantViewSet, AdminContestViewSet

router = DefaultRouter()
router.register("contests", AdminContestViewSet, basename="admin-contest")
router.register("contest-participants", AdminContestParticipantViewSet, basename="admin-contest-participant")

urlpatterns = router.urls
