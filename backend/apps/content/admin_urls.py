from rest_framework.routers import DefaultRouter

from .admin_views import (
    AdminCommentViewSet,
    AdminContactMessageViewSet,
    AdminContentReportViewSet,
    AdminDiscussionViewSet,
)

router = DefaultRouter()
router.register("discussions", AdminDiscussionViewSet, basename="admin-discussion")
router.register("comments", AdminCommentViewSet, basename="admin-comment")
router.register("reports", AdminContentReportViewSet, basename="admin-report")
router.register("contact-messages", AdminContactMessageViewSet, basename="admin-contact-message")

urlpatterns = router.urls
