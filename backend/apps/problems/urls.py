from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("problems", views.PublicProblemViewSet, basename="problem")
router.register("bookmarks", views.BookmarkViewSet, basename="bookmark")

urlpatterns = [
    path("daily-challenge/", views.daily_challenge, name="daily-challenge"),
    path("tags/", views.problem_tags, name="tags"),
    path("progress/", views.my_progress, name="my-progress"),
    path("", include(router.urls)),
]
