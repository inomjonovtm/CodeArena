"""Kurs progressini hisoblash.

Progress UCHTA shartdan yig'iladi va shartlar mavzuda mavjud bo'lsagina
talab qilinadi:

  1. nazariya o'qilgan (`read_at`);
  2. test topshirilgan va o'tgan (savollar bo'lsa);
  3. barcha topshiriqlar yechilgan (topshiriqlar bo'lsa).

Nega denormalizatsiya (`exercises_solved`, `points_earned`) kerak: kurs
sahifasi o'nlab mavzuni bir zumda ko'rsatadi. Har bir mavzu uchun
urinishlarni qaytadan sanash ro'yxatni N+1 so'rovga aylantirardi —
shuning uchun natija yozib qo'yiladi va faqat holat o'zgarganda
qayta hisoblanadi.
"""
from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from .models import (
    Course,
    Enrollment,
    Exercise,
    ExerciseAttempt,
    Lesson,
    LessonProgress,
    PublishStatus,
    QuizQuestion,
)

# Testdan o'tish chegarasi — foizda. 70% : bitta tasodifiy xato mavzuni
# qaytadan o'qishga majburlamaydi, lekin taxmin bilan o'tib bo'lmaydi.
QUIZ_PASS_PERCENT = 70


def quiz_passed(score: int, total: int) -> bool:
    if total <= 0:
        return True
    return (score / total) * 100 >= QUIZ_PASS_PERCENT


def published_lessons(course: Course):
    return course.lessons.filter(status=PublishStatus.PUBLISHED)


# ------------------------------------------------------------------ yozilish


def get_enrollment(user, course: Course) -> Enrollment | None:
    if not user or not user.is_authenticated:
        return None
    return Enrollment.objects.filter(user=user, course=course).first()


def enroll(user, course: Course, lesson: Lesson | None = None) -> Enrollment:
    """Kursga yozadi (yozilgan bo'lsa — qaytaradi) va oxirgi mavzuni belgilaydi.

    Alohida «Yozilish» tugmasini bosish shart emas: birinchi mavzu ochilishi
    ham yozilish hisoblanadi. Aks holda foydalanuvchi o'qib chiqadi-yu,
    progressi hech qayerda saqlanmasdi.
    """
    enrollment, _ = Enrollment.objects.get_or_create(user=user, course=course)
    if lesson is not None and enrollment.last_lesson_id != lesson.id:
        enrollment.last_lesson = lesson
        enrollment.save(update_fields=["last_lesson", "updated_at"])
    return enrollment


# ------------------------------------------------------------------- mavzu


def get_progress(user, lesson: Lesson) -> LessonProgress | None:
    if not user or not user.is_authenticated:
        return None
    return LessonProgress.objects.filter(user=user, lesson=lesson).first()


def ensure_progress(user, lesson: Lesson) -> LessonProgress:
    progress, _ = LessonProgress.objects.get_or_create(user=user, lesson=lesson)
    return progress


@transaction.atomic
def sync_lesson(user, lesson: Lesson) -> LessonProgress:
    """Mavzu holatini qaytadan hisoblaydi va kurs yig'indisini yangilaydi."""
    progress = ensure_progress(user, lesson)

    exercise_ids = set(Exercise.objects.filter(lesson=lesson).values_list("id", flat=True))
    solved_ids = set(
        ExerciseAttempt.objects.filter(
            user=user, exercise_id__in=exercise_ids, is_correct=True
        ).values_list("exercise_id", flat=True)
    )
    question_count = QuizQuestion.objects.filter(lesson=lesson).count()

    progress.exercises_solved = len(solved_ids)

    done = (
        progress.read_at is not None
        and (question_count == 0 or progress.quiz_passed_at is not None)
        and solved_ids >= exercise_ids
    )
    if done and progress.completed_at is None:
        progress.completed_at = timezone.now()
    elif not done:
        progress.completed_at = None

    progress.save(update_fields=["exercises_solved", "completed_at", "updated_at"])
    sync_enrollment(user, lesson.course)
    return progress


@transaction.atomic
def sync_enrollment(user, course: Course) -> Enrollment:
    """Kurs bo'yicha ball va tugallanganlik holatini qaytadan yig'adi."""
    enrollment, _ = Enrollment.objects.get_or_create(user=user, course=course)

    lesson_ids = list(published_lessons(course).values_list("id", flat=True))
    completed = list(
        LessonProgress.objects.filter(
            user=user, lesson_id__in=lesson_ids, completed_at__isnull=False
        ).values_list("lesson_id", flat=True)
    )

    points = sum(
        Lesson.objects.filter(id__in=completed).values_list("points", flat=True)
    )
    points += sum(
        Exercise.objects.filter(
            lesson_id__in=lesson_ids,
            attempts__user=user,
            attempts__is_correct=True,
        )
        .distinct()
        .values_list("points", flat=True)
    )

    enrollment.points_earned = points
    all_done = bool(lesson_ids) and len(completed) == len(lesson_ids)
    if all_done and enrollment.completed_at is None:
        enrollment.completed_at = timezone.now()
    elif not all_done:
        enrollment.completed_at = None

    enrollment.save(update_fields=["points_earned", "completed_at", "updated_at"])
    return enrollment


# --------------------------------------------------------------- yig'indilar


def course_stats(course: Course) -> dict:
    """Kurs kartasi uchun sonlar — bitta so'rovda."""
    row = course.lessons.filter(status=PublishStatus.PUBLISHED).aggregate(
        lesson_count=Count("id", distinct=True),
        exercise_count=Count("exercises", distinct=True),
    )
    return {
        "module_count": course.modules.count(),
        "lesson_count": row["lesson_count"] or 0,
        "exercise_count": row["exercise_count"] or 0,
    }


def progress_for_courses(user, courses) -> dict:
    """`{course_id: {...}}` — katalog sahifasi uchun bitta so'rovda.

    Har bir kurs uchun alohida so'rov yubormaslik muhim: katalogda o'nlab
    kurs bo'lishi mumkin va ularning har biri ikki-uchta so'rov qilsa,
    sahifa sekinlashadi.
    """
    if not user or not user.is_authenticated:
        return {}

    course_ids = [course.id for course in courses]
    enrollments = {
        row.course_id: row
        for row in Enrollment.objects.filter(user=user, course_id__in=course_ids).select_related(
            "last_lesson"
        )
    }

    completed_counts = dict(
        LessonProgress.objects.filter(
            user=user,
            completed_at__isnull=False,
            lesson__course_id__in=course_ids,
            lesson__status=PublishStatus.PUBLISHED,
        )
        .values_list("lesson__course_id")
        .annotate(total=Count("id"))
    )

    result = {}
    for course in courses:
        enrollment = enrollments.get(course.id)
        if enrollment is None:
            continue
        result[course.id] = {
            "is_enrolled": True,
            "completed_lessons": completed_counts.get(course.id, 0),
            "points_earned": enrollment.points_earned,
            "completed_at": enrollment.completed_at,
            "last_lesson_slug": (
                enrollment.last_lesson.slug if enrollment.last_lesson_id else None
            ),
        }
    return result


def lesson_state_map(user, course: Course) -> dict:
    """`{lesson_id: {...}}` — kurs sahifasidagi mavzular daraxti uchun."""
    if not user or not user.is_authenticated:
        return {}

    rows = LessonProgress.objects.filter(user=user, lesson__course=course)
    return {
        row.lesson_id: {
            "is_read": row.read_at is not None,
            "is_completed": row.completed_at is not None,
            "quiz_best_score": row.quiz_best_score,
            "quiz_total": row.quiz_total,
            "quiz_passed": row.quiz_passed_at is not None,
            "exercises_solved": row.exercises_solved,
        }
        for row in rows
    }


def solved_exercise_ids(user, lesson: Lesson) -> set:
    if not user or not user.is_authenticated:
        return set()
    return set(
        ExerciseAttempt.objects.filter(
            user=user, exercise__lesson=lesson, is_correct=True
        ).values_list("exercise_id", flat=True)
    )


def last_attempts(user, lesson: Lesson) -> dict:
    """`{exercise_id: attempt}` — muharrirga oxirgi yozilgan kodni qaytarish uchun."""
    if not user or not user.is_authenticated:
        return {}
    attempts = {}
    rows = ExerciseAttempt.objects.filter(user=user, exercise__lesson=lesson).order_by("created_at")
    for row in rows:
        attempts[row.exercise_id] = row
    return attempts


def neighbours(lesson: Lesson) -> tuple[Lesson | None, Lesson | None]:
    """Kurs bo'ylab tekis oqimdagi oldingi va keyingi mavzu.

    Tartib bo'lim tartibi + mavzu tartibi bo'yicha, ya'ni «Keyingi mavzu»
    tugmasi bo'lim chegarasida to'xtamaydi.
    """
    ordered = list(
        Lesson.objects.filter(course_id=lesson.course_id, status=PublishStatus.PUBLISHED)
        .select_related("module")
        .order_by("module__order", "module__created_at", "order", "created_at")
    )
    index = next((i for i, row in enumerate(ordered) if row.id == lesson.id), None)
    if index is None:
        return None, None
    previous = ordered[index - 1] if index > 0 else None
    following = ordered[index + 1] if index + 1 < len(ordered) else None
    return previous, following


def course_queryset_with_counts():
    """Katalog uchun: mavzu va topshiriq sonlari bitta so'rovda."""
    return Course.objects.filter(status=PublishStatus.PUBLISHED).annotate(
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
