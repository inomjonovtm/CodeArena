from django.urls import path

from . import views

# Tartib muhim: `mine/`, `run/` va `exercises/...` slug qoidasidan OLDIN
# turadi, aks holda ular kurs slug'i deb talqin qilinardi.
urlpatterns = [
    path("courses/", views.course_list, name="course-list"),
    path("courses/mine/", views.my_courses, name="course-mine"),
    path("courses/run/", views.snippet_run, name="course-run"),
    path("courses/exercises/<uuid:pk>/run/", views.exercise_run, name="course-exercise-run"),
    path("courses/exercises/<uuid:pk>/submit/", views.exercise_submit, name="course-exercise-submit"),
    path("courses/<slug:slug>/", views.course_detail, name="course-detail"),
    path("courses/<slug:slug>/enroll/", views.course_enroll, name="course-enroll"),
    path(
        "courses/<slug:slug>/lessons/<slug:lesson_slug>/",
        views.lesson_detail,
        name="course-lesson-detail",
    ),
    path(
        "courses/<slug:slug>/lessons/<slug:lesson_slug>/read/",
        views.lesson_read,
        name="course-lesson-read",
    ),
    path(
        "courses/<slug:slug>/lessons/<slug:lesson_slug>/quiz/",
        views.lesson_quiz_submit,
        name="course-lesson-quiz",
    ),
]
