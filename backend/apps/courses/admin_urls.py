from rest_framework.routers import DefaultRouter

from . import admin_views

router = DefaultRouter()
router.register("courses", admin_views.AdminCourseViewSet, basename="admin-course")
router.register("course-modules", admin_views.AdminModuleViewSet, basename="admin-course-module")
router.register("course-lessons", admin_views.AdminLessonViewSet, basename="admin-course-lesson")
router.register("course-examples", admin_views.AdminExampleViewSet, basename="admin-course-example")
router.register("course-quiz", admin_views.AdminQuizQuestionViewSet, basename="admin-course-quiz")
router.register(
    "course-exercises", admin_views.AdminExerciseViewSet, basename="admin-course-exercise"
)

urlpatterns = router.urls
