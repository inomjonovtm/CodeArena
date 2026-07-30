from django.urls import path

from . import realtime, views

urlpatterns = [
    path("dashboard/stats/", views.stats, name="admin-dashboard-stats"),
    path("dashboard/charts/", views.charts, name="admin-dashboard-charts"),
    path("dashboard/activity/", views.activity, name="admin-dashboard-activity"),
    path("dashboard/health/", views.system_health, name="admin-dashboard-health"),
    path("search/", views.global_search, name="admin-global-search"),
    path("stream/", realtime.stream, name="admin-stream"),
]
