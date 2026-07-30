from django.urls import path
from rest_framework.routers import DefaultRouter

from .media import MediaFileViewSet
from .translate_views import admin_translate, translation_cache
from .trash import trash_list, trash_purge, trash_restore

router = DefaultRouter()
router.register("media", MediaFileViewSet, basename="admin-media")

urlpatterns = [
    # Kontent maydonlarini avtomatik tarjima qilish (uz → en)
    path("translate/", admin_translate, name="admin-translate"),
    # Keshdagi tarjimalarni ko'rish va noto'g'risini tuzatish
    path("translate/cache/", translation_cache, name="admin-translate-cache"),
    path("trash/", trash_list, name="admin-trash"),
    path("trash/restore/", trash_restore, name="admin-trash-restore"),
    path("trash/purge/", trash_purge, name="admin-trash-purge"),
    *router.urls,
]
