from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("discussions", views.DiscussionViewSet, basename="discussion")
router.register("comments", views.CommentViewSet, basename="comment")
router.register("reports", views.ReportViewSet, basename="report")

urlpatterns = [
    path("discussions/problem/<uuid:problem_id>/", views.problem_discussions, name="problem-discussions"),
    path("contact/", views.contact_submit, name="contact-submit"),
    path("", include(router.urls)),
]
