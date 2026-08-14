from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import (
    AdminAnnouncementViewSet,
    AdminAuditLogViewSet,
    AdminLegalDocumentViewSet,
    AdminPlagiarismViewSet,
    AdminSiteSettingViewSet,
)
from .system_views import BackupViewSet, judge_languages

router = DefaultRouter()
router.register("plagiarism", AdminPlagiarismViewSet, basename="admin-plagiarism")
router.register("audit-log", AdminAuditLogViewSet, basename="admin-audit-log")
router.register("settings", AdminSiteSettingViewSet, basename="admin-setting")
router.register("announcements", AdminAnnouncementViewSet, basename="admin-announcement")
router.register("legal-documents", AdminLegalDocumentViewSet, basename="admin-legal-document")
router.register("backups", BackupViewSet, basename="admin-backup")

urlpatterns = [
    path("judge-languages/", judge_languages, name="admin-judge-languages"),
    *router.urls,
]
