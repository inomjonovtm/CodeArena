from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core import ranks
from apps.core.middleware import get_client_ip
from apps.core.mixins import write_audit

from .authentication import clear_auth_cookies, set_auth_cookies
from .models import AdminSession, User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    MeSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
)
from .sessions import SESSION_CLAIM, is_revoked, record_session, revoke


def _issue_tokens(user: User, session=None) -> tuple[str, str]:
    """Access + refresh juftligi. Sessiya berilsa — tokenlar shu qurilmaga bog'lanadi.

    `RefreshToken` ga qo'yilgan maxsus da'volar `access_token` ga ham ko'chiriladi,
    shuning uchun `sid` ikkalasida ham bo'ladi va sessiya yopilishi bilan har
    ikkalasi ham kuchini yo'qotadi (`accounts.sessions` ga qarang).
    """
    refresh = RefreshToken.for_user(user)
    refresh["username"] = user.username
    refresh["role"] = user.role
    if session is not None:
        refresh[SESSION_CLAIM] = str(session.id)
    return str(refresh.access_token), str(refresh)


class AuthThrottle(ScopedRateThrottle):
    scope = "auth"


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user: User = serializer.validated_data["user"]

        # 2FA yoqilgan bo'lsa — kod talab qilinadi
        if user.is_2fa_enabled:
            code = (request.data.get("totp_code") or "").strip()
            if not code:
                return Response(
                    {"detail": "Ikki bosqichli tasdiqlash kodi kerak.", "code": "totp_required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            from .totp import verify as verify_totp

            if not verify_totp(user.totp_secret, code):
                return Response(
                    {"detail": "Tasdiqlash kodi noto'g'ri.", "code": "totp_invalid"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        user.last_login = timezone.now()
        user.last_login_ip = get_client_ip(request) or None
        user.save(update_fields=["last_login", "last_login_ip"])

        session = record_session(request, user)

        access, refresh = _issue_tokens(user, session)
        payload = {
            "user": MeSerializer(user).data,
            "access": access,
            "refresh": refresh,
        }
        response = Response(payload, status=status.HTTP_200_OK)
        set_auth_cookies(response, access, refresh)

        if user.is_staff_member:
            write_audit(request, action_name="auth.admin_login", obj=user)
        return response


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # 9-bo'lim: email tasdiqlash havolasi yuboriladi
        from .emails import send_verification_email

        send_verification_email(user)

        # Ro'yxatdan o'tish ham kirish — qurilma sessiyalar ro'yxatida ko'rinsin
        access, refresh = _issue_tokens(user, record_session(request, user))
        response = Response(
            {
                "user": MeSerializer(user).data,
                "access": access,
                "refresh": refresh,
                "verification_email_sent": True,
            },
            status=status.HTTP_201_CREATED,
        )
        return set_auth_cookies(response, access, refresh)


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.data.get("refresh") or request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if not raw:
            return Response({"detail": "Refresh token topilmadi."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(raw)
        except TokenError:
            response = Response({"detail": "Sessiya muddati tugagan, qayta kiring."},
                                status=status.HTTP_401_UNAUTHORIZED)
            return clear_auth_cookies(response)

        # Qurilma sessiyasi yopilgan bo'lsa — refresh ham ishlamasin, aks holda
        # yopilgan qurilma tokenini cheksiz yangilab, ichkarida qolaverardi.
        sid = str(refresh.payload.get(SESSION_CLAIM) or "")
        if sid and is_revoked(sid):
            response = Response(
                {"detail": "Bu qurilmadagi sessiya yopilgan. Qaytadan kiring.",
                 "code": "session_revoked"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            return clear_auth_cookies(response)

        access = str(refresh.access_token)
        new_refresh = None
        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS"):
            try:
                refresh.blacklist()
            except AttributeError:
                pass
            user = User.objects.filter(pk=refresh.payload.get("user_id")).first()
            if user:
                session = (
                    AdminSession.objects.filter(pk=sid, user=user, revoked_at__isnull=True).first()
                    if sid
                    else None
                )
                # `sid` yo'q — token bu o'zgarishdan oldin berilgan. Shu yerda
                # qurilmaga bog'laymiz, shunda sessiyani yopish kuchga kiradi.
                access, new_refresh = _issue_tokens(user, session or record_session(request, user))

        response = Response({"access": access, "refresh": new_refresh or raw})
        return set_auth_cookies(response, access, new_refresh)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.data.get("refresh") or request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if raw:
            try:
                token = RefreshToken(raw)
                # Qurilma sessiyasini ham yopamiz — aks holda chiqib ketilgan
                # qurilma "faol qurilmalar" ro'yxatida abadiy osilib qolardi.
                sid = str(token.payload.get(SESSION_CLAIM) or "")
                if sid:
                    session = AdminSession.objects.filter(pk=sid).first()
                    if session:
                        revoke(session)
                token.blacklist()
            except (TokenError, AttributeError, ValidationError, ValueError):
                pass
        response = Response({"detail": "Tizimdan chiqdingiz."})
        return clear_auth_cookies(response)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        write_audit(request, action_name="auth.password_change", obj=request.user)
        return Response({"detail": "Parol yangilandi."})


@api_view(["GET"])
@permission_classes([AllowAny])
def public_profile(request, username: str):
    """`GET /api/users/:username` — ommaviy profil (user qismi uchun).

    Profil sahifasi uchun zarur hamma narsa bitta so'rovda keladi: raqamlar,
    qiyinlik bo'yicha taqsimot, oxirgi yechimlar va bir yillik faollik kalendari.
    """
    from django.db.models.functions import TruncDate

    from apps.problems.models import SolvedProblem

    user = User.objects.filter(username__iexact=username, is_active=True).first()
    if not user:
        return Response({"detail": "Foydalanuvchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)

    stats = user.submissions.aggregate(
        total=Count("id"),
        accepted=Count("id", filter=Q(status="ACCEPTED")),
    )

    # Qiyinlik bo'yicha yechilganlar + platformadagi umumiy son
    from apps.problems.models import Problem, ProblemStatus

    solved_rows = (
        SolvedProblem.objects.filter(user=user)
        .values("problem__difficulty")
        .annotate(count=Count("id"))
    )
    solved_by_difficulty = {row["problem__difficulty"]: row["count"] for row in solved_rows}
    total_rows = (
        Problem.objects.filter(status=ProblemStatus.PUBLISHED, is_contest_only=False)
        .values("difficulty")
        .annotate(count=Count("id"))
    )
    totals_by_difficulty = {row["difficulty"]: row["count"] for row in total_rows}

    # Reyting ro'yxatidagi o'rni (ball bo'yicha)
    global_rank = (
        User.objects.filter(is_active=True, is_banned=False, total_points__gt=user.total_points).count()
        + 1
    )

    recent_solved = [
        {
            "slug": row.problem.slug,
            "title_uz": row.problem.title_uz,
            "title_en": row.problem.title_en,
            "difficulty": row.problem.difficulty,
            "points": row.points_awarded,
            "solved_at": row.first_solved_at,
        }
        for row in SolvedProblem.objects.filter(user=user)
        .select_related("problem")
        .order_by("-first_solved_at")[:10]
    ]

    # Faollik kalendari (oxirgi 365 kun)
    since = timezone.now() - timezone.timedelta(days=365)
    activity_rows = (
        user.submissions.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"), accepted=Count("id", filter=Q(status="ACCEPTED")))
        .order_by("day")
    )
    activity = [
        {"date": str(row["day"]), "count": row["count"], "accepted": row["accepted"]}
        for row in activity_rows
        if row["day"]
    ]

    languages = list(
        user.submissions.values("language").annotate(count=Count("id")).order_by("-count")[:5]
    )

    from .models import Follow

    viewer = request.user if request.user.is_authenticated else None
    is_following = bool(
        viewer and viewer.pk != user.pk
        and Follow.objects.filter(follower=viewer, following=user).exists()
    )

    return Response(
        {
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "country": user.country,
            "github_url": user.github_url,
            "website_url": user.website_url,
            "region": user.region,
            "district": user.district,
            "education_place": user.education_place,
            "rating": user.rating,
            "max_rating": user.max_rating,
            "rank": ranks.rank_info(user.rating),
            "max_rank": ranks.rank_info(user.max_rating),
            "global_rank": global_rank,
            "total_points": user.total_points,
            "problems_solved": user.problems_solved,
            "contests_participated": user.contests_participated,
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
            "submissions": stats["total"],
            "accepted_submissions": stats["accepted"],
            "solved_by_difficulty": solved_by_difficulty,
            "totals_by_difficulty": totals_by_difficulty,
            "recent_solved": recent_solved,
            "activity": activity,
            "languages": languages,
            "joined_at": user.created_at,
            "is_me": bool(viewer and viewer.pk == user.pk),
            "followers_count": user.followers_count,
            "following_count": user.following_count,
            "is_following": is_following,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def leaderboard(request):
    """`GET /api/leaderboard` — global reyting (16-bo'lim).

    Sahifalanadi: reytingda minglab foydalanuvchi bo'lishi mumkin, hammasini
    bitta javobda yuborish ham serverni, ham brauzerni ortiqcha yuklaydi.
    `rank` global o'rin — sahifa ichidagi indeks emas, shuning uchun 3-sahifada
    ham raqamlar to'g'ri davom etadi.
    """
    sort = request.query_params.get("sort", "points")
    period = request.query_params.get("period", "all")
    query = (request.query_params.get("q") or "").strip()

    try:
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
    except ValueError:
        page, page_size = 1, 20

    queryset = User.objects.filter(is_active=True, is_banned=False)
    if query:
        queryset = queryset.filter(
            Q(username__icontains=query) | Q(full_name__icontains=query)
        )
    if period == "week":
        since = timezone.now() - timezone.timedelta(days=7)
        queryset = queryset.filter(submissions__created_at__gte=since).distinct()
    elif period == "month":
        since = timezone.now() - timezone.timedelta(days=30)
        queryset = queryset.filter(submissions__created_at__gte=since).distinct()

    order = "-rating" if sort == "rating" else "-total_points"
    queryset = queryset.order_by(order, "-problems_solved", "username")

    total = queryset.count()
    offset = (page - 1) * page_size
    rows = list(queryset[offset : offset + page_size])

    # Qidiruvda sahifadagi indeks global o'rinni bermaydi (ro'yxat filtrlangan),
    # shuning uchun har bir qator uchun haqiqiy o'rin alohida hisoblanadi.
    global_base = User.objects.filter(is_active=True, is_banned=False)

    def position_of(user: User, index: int) -> int:
        if not query:
            return offset + index + 1
        if sort == "rating":
            return global_base.filter(rating__gt=user.rating).count() + 1
        return global_base.filter(total_points__gt=user.total_points).count() + 1

    return Response(
        {
            "count": total,
            "page": page,
            "page_size": page_size,
            "query": query,
            "total_pages": max(1, (total + page_size - 1) // page_size),
            "has_next": offset + page_size < total,
            "has_previous": page > 1,
            "results": [
                {
                    "position": position_of(u, index),
                    "username": u.username,
                    "full_name": u.full_name,
                    "avatar_url": u.avatar_url,
                    "country": u.country,
                    "rating": u.rating,
                    "rank": ranks.rank_info(u.rating),
                    "total_points": u.total_points,
                    "problems_solved": u.problems_solved,
                }
                for index, u in enumerate(rows)
            ],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_rank(request):
    """`GET /api/leaderboard/me` — joriy foydalanuvchining reytingdagi o'rni."""
    user = request.user
    sort = request.query_params.get("sort", "points")
    base = User.objects.filter(is_active=True, is_banned=False)

    if sort == "rating":
        position = base.filter(rating__gt=user.rating).count() + 1
    else:
        position = base.filter(total_points__gt=user.total_points).count() + 1

    return Response(
        {
            "position": position,
            "total": base.count(),
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "country": user.country,
            "rating": user.rating,
            "rank": ranks.rank_info(user.rating),
            "total_points": user.total_points,
            "problems_solved": user.problems_solved,
        }
    )
