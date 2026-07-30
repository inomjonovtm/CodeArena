from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def healthcheck(_request):
    return JsonResponse({"status": "ok", "service": "codearena-api", "version": "2.0.0"})


urlpatterns = [
    path("health/", healthcheck),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
    # --- autentifikatsiya
    path("api/auth/", include("apps.accounts.urls")),
    # --- public (user qismi) API
    path("api/", include("apps.accounts.public_urls")),
    path("api/", include("apps.problems.urls")),
    path("api/", include("apps.judge.urls")),
    path("api/", include("apps.contests.urls")),
    path("api/", include("apps.content.urls")),
    path("api/", include("apps.community.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.core.public_urls")),
    # --- admin panel API (rol: admin/moderator)
    path("api/admin/", include("apps.core.admin_urls")),
    path("api/admin/", include("apps.dashboard.urls")),
    path("api/admin/", include("apps.accounts.admin_urls")),
    path("api/admin/", include("apps.problems.admin_urls")),
    path("api/admin/", include("apps.judge.admin_urls")),
    path("api/admin/", include("apps.contests.admin_urls")),
    path("api/admin/", include("apps.content.admin_urls")),
    path("api/admin/", include("apps.community.admin_urls")),
    path("api/admin/", include("apps.moderation.admin_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
