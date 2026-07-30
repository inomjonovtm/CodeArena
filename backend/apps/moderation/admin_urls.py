from rest_framework.routers import DefaultRouter

from .admin_views import (
    AdminAnnouncementViewSet,
    AdminAuditLogViewSet,
    AdminPlagiarismViewSet,
    AdminSiteSettingViewSet,
)
from .system_views import BackupViewSet, JudgeLanguageViewSet

router = DefaultRouter()
router.register("plagiarism", AdminPlagiarismViewSet, basename="admin-plagiarism")
router.register("audit-log", AdminAuditLogViewSet, basename="admin-audit-log")
router.register("settings", AdminSiteSettingViewSet, basename="admin-setting")
router.register("announcements", AdminAnnouncementViewSet, basename="admin-announcement")
router.register("backups", BackupViewSet, basename="admin-backup")
router.register("judge-languages", JudgeLanguageViewSet, basename="admin-judge-language")

urlpatterns = router.urls
