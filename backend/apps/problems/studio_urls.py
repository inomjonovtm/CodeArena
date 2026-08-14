"""Studio panel marshrutlari — `/api/studio/...`."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .studio_views import (
    StudioGeneratorViewSet,
    StudioRunViewSet,
    StudioSolutionViewSet,
    StudioToolsViewSet,
    studio_overview,
    studio_sandbox,
    studio_templates,
)

router = DefaultRouter()
router.register("solutions", StudioSolutionViewSet, basename="studio-solution")
router.register("generators", StudioGeneratorViewSet, basename="studio-generator")
router.register("runs", StudioRunViewSet, basename="studio-run")
router.register("problems", StudioToolsViewSet, basename="studio-tools")

urlpatterns = [
    path("overview/", studio_overview, name="studio-overview"),
    path("templates/", studio_templates, name="studio-templates"),
    path("sandbox/", studio_sandbox, name="studio-sandbox"),
    *router.urls,
]
