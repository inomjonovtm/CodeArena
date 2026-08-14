from rest_framework.routers import DefaultRouter

from .admin_views import (
    AdminQuestionFolderViewSet,
    AdminQuestionViewSet,
    AdminQuizAttemptViewSet,
    AdminQuizViewSet,
)

router = DefaultRouter()
router.register("question-folders", AdminQuestionFolderViewSet, basename="admin-question-folder")
router.register("questions", AdminQuestionViewSet, basename="admin-question")
router.register("quizzes", AdminQuizViewSet, basename="admin-quiz")
router.register("quiz-attempts", AdminQuizAttemptViewSet, basename="admin-quiz-attempt")

urlpatterns = router.urls
