from django.urls import path

from . import social_views, views

urlpatterns = [
    path("leaderboard/", views.leaderboard, name="public-leaderboard"),
    path("leaderboard/me/", views.my_rank, name="public-leaderboard-me"),
    # Obuna (follow)
    path("users/suggested/", social_views.suggested_users, name="public-suggested-users"),
    path("users/<str:username>/follow/", social_views.follow_user, name="public-follow"),
    path("users/<str:username>/followers/", social_views.followers, name="public-followers"),
    path("users/<str:username>/following/", social_views.following, name="public-following"),
    # `<username>` eng oxirida — yuqoridagi aniqroq yo'llarni yutib yubormasligi uchun
    path("users/<str:username>/", views.public_profile, name="public-profile"),
]
