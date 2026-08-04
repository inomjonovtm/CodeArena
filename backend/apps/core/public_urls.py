from django.urls import path

from . import public_views

urlpatterns = [
    path("site/stats/", public_views.site_stats, name="site-stats"),
    path("site/announcements/", public_views.active_announcements, name="site-announcements"),
    path("site/settings/", public_views.public_settings, name="site-settings"),
    path("geo/regions/", public_views.geo_regions, name="geo-regions"),
    path("ranks/", public_views.rank_table, name="site-ranks"),
    path("search/", public_views.public_search, name="site-search"),
    # Brauzerdagi xatolarni serverga yetkazish (frontend/src/lib/report-error.ts)
    path("client-errors/", public_views.client_error, name="client-errors"),
]
