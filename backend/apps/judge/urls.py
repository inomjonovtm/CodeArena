from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import SubmissionViewSet, judge_status

router = DefaultRouter()
router.register("submissions", SubmissionViewSet, basename="submission")

urlpatterns = [
    path("judge/status/", judge_status, name="judge-status"),
    *router.urls,
]
