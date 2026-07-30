from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import (
    AdminDailyChallengeViewSet,
    AdminProblemViewSet,
    AdminTagViewSet,
    AdminTestCaseViewSet,
)
from .import_views import import_problems, import_template, import_test_cases

router = DefaultRouter()
router.register("problems", AdminProblemViewSet, basename="admin-problem")
router.register("test-cases", AdminTestCaseViewSet, basename="admin-testcase")
router.register("tags", AdminTagViewSet, basename="admin-tag")
router.register("daily-challenges", AdminDailyChallengeViewSet, basename="admin-daily")

urlpatterns = [
    path("problems/import/", import_problems, name="admin-problem-import"),
    path("problems/import/template/", import_template, name="admin-problem-import-template"),
    path(
        "problems/<uuid:problem_id>/test-cases/import/",
        import_test_cases,
        name="admin-testcase-import",
    ),
    *router.urls,
]
