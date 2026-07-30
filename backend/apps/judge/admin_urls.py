from rest_framework.routers import DefaultRouter

from .admin_views import AdminSubmissionViewSet

router = DefaultRouter()
router.register("submissions", AdminSubmissionViewSet, basename="admin-submission")

urlpatterns = router.urls
