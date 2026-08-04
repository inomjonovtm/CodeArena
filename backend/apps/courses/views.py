"""Kurslarning ochiq API'si.

Kontent (kurs, mavzu, misol) ro'yxatdan o'tmasdan ham ochiladi — o'quv
materialini devor ortiga yashirishning ma'nosi yo'q. Progress saqlash va
KOD BAJARISH esa hisobni talab qiladi: birinchisi kimningdir hisobiga
yozilishi kerak, ikkinchisi esa serverda jarayon ishga tushiradi va
anonim so'rovlarga ochiq qoldirilsa arzon nishonga aylanadi.
"""
from __future__ import annotations

from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from . import grading
from . import progress as progress_service
from .models import (
    Course,
    Enrollment,
    Exercise,
    ExerciseAttempt,
    Lesson,
    LessonProgress,
    Module,
    PublishStatus,
    QuizAttempt,
)
from .serializers import (
    CourseCardSerializer,
    CourseDetailSerializer,
    ExerciseRunSerializer,
    LessonDetailSerializer,
    MyCourseRowSerializer,
    QuizSubmitSerializer,
    SnippetRunSerializer,
)


class CourseRunThrottle(ScopedRateThrottle):
    scope = "course_run"


def _published_lessons_prefetch():
    """Mavzular daraxti — bitta prefetch bilan, tartibi bilan birga."""
    return Prefetch(
        "lessons",
        queryset=Lesson.objects.filter(status=PublishStatus.PUBLISHED)
        .annotate(
            exercise_count=Count("exercises", distinct=True),
            quiz_count=Count("quiz_questions", distinct=True),
        )
        .order_by("order", "created_at"),
    )


# ============================================================ katalog / kurs


@api_view(["GET"])
@permission_classes([AllowAny])
def course_list(request):
    """`GET /api/courses/` — chop etilgan kurslar katalogi."""
    queryset = progress_service.course_queryset_with_counts()

    language = request.query_params.get("language")
    if language:
        queryset = queryset.filter(language=language)

    level = request.query_params.get("level")
    if level:
        queryset = queryset.filter(level=level)

    search = (request.query_params.get("q") or "").strip()
    if search:
        queryset = queryset.filter(
            Q(title_uz__icontains=search)
            | Q(subtitle_uz__icontains=search)
            | Q(description_uz__icontains=search)
        )

    courses = list(queryset.order_by("-is_featured", "order", "title_uz"))
    context = {"progress_map": progress_service.progress_for_courses(request.user, courses)}
    return Response(CourseCardSerializer(courses, many=True, context=context).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def course_detail(request, slug: str):
    """`GET /api/courses/<slug>/` — kurs sahifasi: tavsif + mavzular daraxti."""
    course = get_object_or_404(
        Course.objects.filter(status=PublishStatus.PUBLISHED)
        .annotate(
            lesson_count=Count(
                "lessons", filter=Q(lessons__status=PublishStatus.PUBLISHED), distinct=True
            ),
            module_count=Count("modules", distinct=True),
            exercise_count=Count(
                "lessons__exercises",
                filter=Q(lessons__status=PublishStatus.PUBLISHED),
                distinct=True,
            ),
        )
        .prefetch_related(
            Prefetch(
                "modules",
                queryset=Module.objects.order_by("order", "created_at").prefetch_related(
                    _published_lessons_prefetch()
                ),
            ),
            Prefetch(
                "lessons",
                queryset=Lesson.objects.filter(status=PublishStatus.PUBLISHED).prefetch_related(
                    "exercises"
                ),
            ),
        ),
        slug=slug,
    )

    context = {
        "progress_map": progress_service.progress_for_courses(request.user, [course]),
        "lesson_states": progress_service.lesson_state_map(request.user, course),
    }
    return Response(CourseDetailSerializer(course, context=context).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def course_enroll(request, slug: str):
    """`POST /api/courses/<slug>/enroll/` — kursni «mening kurslarim»ga qo'shadi."""
    course = get_object_or_404(Course.objects.filter(status=PublishStatus.PUBLISHED), slug=slug)
    first_lesson = (
        Lesson.objects.filter(course=course, status=PublishStatus.PUBLISHED)
        .order_by("module__order", "order", "created_at")
        .first()
    )
    enrollment = progress_service.enroll(request.user, course)
    return Response(
        {
            "detail": "Kursga yozildingiz.",
            "course_slug": course.slug,
            "start_lesson_slug": (
                enrollment.last_lesson.slug
                if enrollment.last_lesson_id
                else (first_lesson.slug if first_lesson else None)
            ),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_courses(request):
    """`GET /api/courses/mine/` — yozilgan kurslar va ulardagi progress."""
    enrollments = (
        Enrollment.objects.filter(user=request.user)
        .select_related("course", "last_lesson")
        .order_by("-updated_at")
    )
    courses = [row.course for row in enrollments]
    lesson_counts = dict(
        Lesson.objects.filter(course__in=courses, status=PublishStatus.PUBLISHED)
        .values_list("course_id")
        .annotate(total=Count("id"))
    )
    completed_counts = dict(
        LessonProgress.objects.filter(
            user=request.user,
            completed_at__isnull=False,
            lesson__course__in=courses,
            lesson__status=PublishStatus.PUBLISHED,
        )
        .values_list("lesson__course_id")
        .annotate(total=Count("id"))
    )

    rows = [
        {
            "slug": row.course.slug,
            "title_uz": row.course.title_uz,
            "language": row.course.language,
            "badge": row.course.badge,
            "accent_color": row.course.accent_color,
            "lesson_count": lesson_counts.get(row.course_id, 0),
            "completed_lessons": completed_counts.get(row.course_id, 0),
            "points_earned": row.points_earned,
            "completed_at": row.completed_at,
            "last_lesson_slug": row.last_lesson.slug if row.last_lesson_id else None,
            "last_lesson_title": row.last_lesson.title_uz if row.last_lesson_id else None,
            "updated_at": row.updated_at,
        }
        for row in enrollments
    ]
    return Response(MyCourseRowSerializer(rows, many=True).data)


# =================================================================== mavzu


def _get_lesson(slug: str, lesson_slug: str) -> Lesson:
    return get_object_or_404(
        Lesson.objects.filter(status=PublishStatus.PUBLISHED)
        .select_related("course", "module")
        .prefetch_related("examples", "quiz_questions", "exercises__tests"),
        course__slug=slug,
        course__status=PublishStatus.PUBLISHED,
        slug=lesson_slug,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def lesson_detail(request, slug: str, lesson_slug: str):
    """`GET /api/courses/<slug>/lessons/<lesson_slug>/` — mavzuning to'liq matni."""
    lesson = _get_lesson(slug, lesson_slug)
    previous, following = progress_service.neighbours(lesson)

    my_state = None
    if request.user.is_authenticated:
        # Mavzuni ochish yozilish hisoblanadi: shundan keyin «Davom etish»
        # tugmasi foydalanuvchini aynan shu joyga qaytaradi.
        progress_service.enroll(request.user, lesson.course, lesson)
        row = progress_service.get_progress(request.user, lesson)
        if row is not None:
            my_state = {
                "is_read": row.read_at is not None,
                "is_completed": row.completed_at is not None,
                "quiz_best_score": row.quiz_best_score,
                "quiz_total": row.quiz_total,
                "quiz_passed": row.quiz_passed_at is not None,
                "exercises_solved": row.exercises_solved,
            }

    context = {
        "my_state": my_state,
        "previous": previous,
        "next": following,
        "solved_exercises": progress_service.solved_exercise_ids(request.user, lesson),
        "last_attempts": progress_service.last_attempts(request.user, lesson),
    }
    return Response(LessonDetailSerializer(lesson, context=context).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def lesson_read(request, slug: str, lesson_slug: str):
    """`POST .../read/` — «O'qidim» belgisi.

    Bu progressning birinchi sharti. Test va topshiriqlar ham bajarilgach
    mavzu «tugallandi» holatiga o'tadi (`progress.sync_lesson`).
    """
    lesson = _get_lesson(slug, lesson_slug)
    row = progress_service.ensure_progress(request.user, lesson)
    if row.read_at is None:
        row.read_at = timezone.now()
        row.save(update_fields=["read_at", "updated_at"])
    progress_service.enroll(request.user, lesson.course, lesson)
    row = progress_service.sync_lesson(request.user, lesson)

    return Response(
        {
            "detail": "Belgilandi.",
            "is_read": True,
            "is_completed": row.completed_at is not None,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def lesson_quiz_submit(request, slug: str, lesson_slug: str):
    """`POST .../quiz/` — testni tekshiradi va to'g'ri javoblarni qaytaradi.

    To'g'ri javoblar AYNAN shu javobda ochiladi: savol yuborilayotganda
    ular berilmagan, ya'ni foydalanuvchi avval tanlaydi, keyin ko'radi.
    """
    lesson = _get_lesson(slug, lesson_slug)
    questions = list(lesson.quiz_questions.all())
    if not questions:
        return Response({"detail": "Bu mavzuda test yo'q."}, status=status.HTTP_400_BAD_REQUEST)

    serializer = QuizSubmitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    answers = serializer.validated_data["answers"]

    rows = []
    score = 0
    for question in questions:
        given = answers.get(str(question.id))
        is_correct = given is not None and int(given) == question.correct_index
        if is_correct:
            score += 1
        rows.append(
            {
                "id": question.id,
                "given_index": given,
                "correct_index": question.correct_index,
                "is_correct": is_correct,
                "explanation_uz": question.explanation_uz,
            }
        )

    total = len(questions)
    passed = progress_service.quiz_passed(score, total)

    QuizAttempt.objects.create(
        user=request.user,
        lesson=lesson,
        answers={str(key): value for key, value in answers.items()},
        score=score,
        total=total,
        is_passed=passed,
    )

    row = progress_service.ensure_progress(request.user, lesson)
    changed = ["updated_at"]
    if score > row.quiz_best_score or row.quiz_total != total:
        row.quiz_best_score = max(row.quiz_best_score, score)
        row.quiz_total = total
        changed += ["quiz_best_score", "quiz_total"]
    if passed and row.quiz_passed_at is None:
        row.quiz_passed_at = timezone.now()
        changed.append("quiz_passed_at")
    row.save(update_fields=changed)

    row = progress_service.sync_lesson(request.user, lesson)

    return Response(
        {
            "score": score,
            "total": total,
            "percent": round(score / total * 100) if total else 0,
            "is_passed": passed,
            "pass_percent": progress_service.QUIZ_PASS_PERCENT,
            "results": rows,
            "is_completed": row.completed_at is not None,
        }
    )


# =============================================================== kod bajarish


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([CourseRunThrottle])
def snippet_run(request):
    """`POST /api/courses/run/` — «Sinab ko'rish»: misol kodini bajaradi."""
    serializer = SnippetRunSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        result = grading.run_snippet(
            language=data["language"],
            code=data["code"],
            stdin=data.get("stdin", ""),
        )
    except grading.JudgeUnavailable as exc:
        return Response(
            {"detail": str(exc), "code": "judge_unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response(result)


def _get_exercise(pk) -> Exercise:
    return get_object_or_404(
        Exercise.objects.select_related("lesson", "lesson__course").prefetch_related("tests"),
        pk=pk,
        lesson__status=PublishStatus.PUBLISHED,
        lesson__course__status=PublishStatus.PUBLISHED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([CourseRunThrottle])
def exercise_run(request, pk):
    """`POST /api/courses/exercises/<id>/run/` — faqat ochiq testlar, natija saqlanmaydi."""
    exercise = _get_exercise(pk)
    serializer = ExerciseRunSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        result = grading.run_tests(
            exercise=exercise,
            code=serializer.validated_data["code"],
            language=serializer.validated_data.get("language") or exercise.language,
            sample_only=True,
        )
    except grading.JudgeUnavailable as exc:
        return Response(
            {"detail": str(exc), "code": "judge_unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([CourseRunThrottle])
def exercise_submit(request, pk):
    """`POST /api/courses/exercises/<id>/submit/` — barcha testlar, natija saqlanadi."""
    exercise = _get_exercise(pk)
    serializer = ExerciseRunSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    code = serializer.validated_data["code"]
    language = serializer.validated_data.get("language") or exercise.language

    try:
        result = grading.run_tests(
            exercise=exercise, code=code, language=language, sample_only=False
        )
    except grading.JudgeUnavailable as exc:
        return Response(
            {"detail": str(exc), "code": "judge_unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    attempt = ExerciseAttempt.objects.create(
        user=request.user,
        exercise=exercise,
        language=language,
        code=code,
        status=result["status"],
        is_correct=result["all_passed"],
        passed_tests=result["passed"],
        total_tests=result["total"],
        runtime_ms=result["runtime_ms"],
        error_output=(result["results"][0]["stderr"] if result["results"] else "")[:2000],
    )

    lesson = exercise.lesson
    progress_service.enroll(request.user, lesson.course, lesson)
    row = progress_service.sync_lesson(request.user, lesson)

    return Response(
        {
            **result,
            "attempt_id": str(attempt.id),
            "is_solved": attempt.is_correct,
            # Yechim to'g'ri bo'lgandagina namuna kod ochiladi
            "solution_code": exercise.solution_code if attempt.is_correct else "",
            "lesson_completed": row.completed_at is not None,
            "points": exercise.points if attempt.is_correct else 0,
        }
    )
