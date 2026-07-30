from django.urls import path
from rest_framework.routers import DefaultRouter

from . import realtime
from .views import PublicContestViewSet

router = DefaultRouter()
router.register("contests", PublicContestViewSet, basename="contest")

urlpatterns = [
    # Router yaratadigan `contests/<slug>/` marshrutidan oldin turadi
    path("contests/<slug:slug>/stream/", realtime.contest_stream, name="contest-stream"),
    *router.urls,
]
