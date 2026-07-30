from django.urls import path
from rest_framework.routers import DefaultRouter

from . import push_views
from .views import NotificationViewSet

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    # --- brauzer push obunasi
    path("push/config/", push_views.push_config, name="push-config"),
    path("push/devices/", push_views.push_devices, name="push-devices"),
    path("push/subscribe/", push_views.push_subscribe, name="push-subscribe"),
    path("push/unsubscribe/", push_views.push_unsubscribe, name="push-unsubscribe"),
    path("push/test/", push_views.push_test, name="push-test"),
    *router.urls,
]
