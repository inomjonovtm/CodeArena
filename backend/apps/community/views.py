"""Guruhlar API — ichki reyting, vazifalar va faollik.

Guruh nima uchun kerak: sinf, kurs yoki do'stlar davrasi o'z ichida
musobaqalashadi. Shu sababli bu yerdagi har bir endpoint bitta savolga
xizmat qiladi — «guruhda hozir nima bo'lyapti va men qayerdaman?».
"""
from __future__ import annotations

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from apps.core.utils import invite_code as generate_invite_code
from apps.core.utils import to_int

from .models import (
    Group,
    GroupActivity,
    GroupAssignment,
    GroupBan,
    GroupJoinRequest,
    GroupMember,
)
from .serializers import (
    GroupActivitySerializer,
    GroupAssignmentSerializer,
    GroupJoinRequestSerializer,
    GroupMemberSerializer,
    GroupSerializer,
)


class JoinThrottle(UserRateThrottle):
    """Taklif kodini terib topishga urinishni cheklaydi.

    Kod 8 belgidan iborat, lekin cheksiz urinish bilan qidirish mumkin
    edi — endi bir foydalanuvchi daqiqasiga sanoqli marta urinadi.
    """

    scope = "group_join"


def _log(group: Group, user, kind: str, text: str = "", url: str = "") -> None:
    GroupActivity.objects.create(group=group, user=user, kind=kind, text=text, url=url)


class GroupViewSet(viewsets.ModelViewSet):
    """`/api/groups/`."""

    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "slug"

    def get_queryset(self):
        """A'zo bo'lgan guruhlar; `?discover=1` bilan ochiq guruhlar ham."""
        base = Group.objects.annotate(live_member_count=Count("members", distinct=True))

        # Bu amallarda guruhni A'ZO BO'LMAGAN odam ham ko'ra olishi kerak:
        # aks holda ochiq guruhga qo'shilishning yagona yo'li kod so'rab
        # yurish bo'lardi.
        open_actions = {
            "retrieve", "update", "partial_update", "destroy",
            "join_open", "request_join",
            # O'qish uchun ochiq bo'limlar: ochiq guruh sahifasidagi tablar
            # (reyting, statistika, faollik, vazifalar) a'zo bo'lmaganga ham
            # ko'rinadi — ilgari sahifa ochilardi-yu, har bir tab 404 berardi.
            "leaderboard", "stats", "activity", "assignments", "assignment_detail",
        }
        if self.action in open_actions or self.request.query_params.get("discover") in {
            "1", "true",
        }:
            # Ochiq va so'rovli guruhlar hammaga ko'rinadi: aks holda ularni
            # topishning yagona yo'li kod so'rab yurish bo'lardi.
            visible = Q(members__user=self.request.user) | ~Q(privacy=Group.Privacy.PRIVATE)
            return base.filter(visible).distinct().order_by("-member_count", "-created_at")

        return (
            base.filter(members__user=self.request.user)
            .distinct()
            .order_by("-created_at")
        )

    def get_throttles(self):
        if self.action in {"join", "request_join"}:
            return [JoinThrottle()]
        return super().get_throttles()

    # ------------------------------------------------------------ yaratish
    def perform_create(self, serializer):
        group = serializer.save(owner=self.request.user)
        GroupMember.objects.create(
            group=group,
            user=self.request.user,
            role=GroupMember.Role.OWNER,
            points_at_join=self.request.user.total_points,
            solved_at_join=self.request.user.problems_solved,
        )
        group.recount()
        _log(group, self.request.user, GroupActivity.Kind.JOINED, "guruhni yaratdi")

    def perform_update(self, serializer):
        group = self.get_object()
        if not group.can_manage(self.request.user):
            raise PermissionDenied("Guruh sozlamalarini egasi va moderatorlar tahrirlaydi.")
        # Maxfiylik, manzil (slug) va sig'im — tuzilmaviy qarorlar, ularni
        # faqat egasi o'zgartiradi. Aks holda moderator yopiq sinf guruhini
        # «ochiq» qilib, a'zolar ro'yxatini oshkor qilishi mumkin edi.
        if not group.is_owner(self.request.user):
            sensitive = {"privacy", "slug", "max_members"}
            touched = sensitive & set(serializer.validated_data)
            changed = {
                field for field in touched
                if serializer.validated_data[field] != getattr(group, field)
            }
            if changed:
                raise PermissionDenied(
                    "Maxfiylik, manzil va sig'imni faqat guruh egasi o'zgartiradi."
                )
        serializer.save()

    def perform_destroy(self, instance):
        if not instance.is_owner(self.request.user):
            raise PermissionDenied("Guruhni faqat egasi o'chira oladi.")
        instance.delete(actor=self.request.user)

    # -------------------------------------------------------- qo'shilish
    def _add_member(self, group: Group, user) -> GroupMember:
        member, created = GroupMember.objects.get_or_create(
            group=group,
            user=user,
            defaults={
                # Ichki reyting a'zo qo'shilgandan keyingi natijalarni
                # hisoblaydi — shuning uchun boshlang'ich nuqta saqlanadi.
                "points_at_join": user.total_points,
                "solved_at_join": user.problems_solved,
            },
        )
        if created:
            group.recount()
            _log(group, user, GroupActivity.Kind.JOINED, "guruhga qo'shildi")
            self._notify_owner(group, user)
        return member

    @staticmethod
    def _notify_owner(group: Group, user, *, title: str | None = None) -> None:
        if not group.owner_id or group.owner_id == user.pk:
            return
        from apps.notifications.models import NotificationKind
        from apps.notifications.services import notify

        notify(
            group.owner,
            actor=user,
            kind=NotificationKind.GROUP_INVITE,
            title=title or f"{user.username} guruhingizga qo'shildi",
            body=group.name,
            url=f"/groups/{group.slug}",
        )

    def _guard_join(self, group: Group, user) -> Response | None:
        if group.bans.filter(user=user).exists():
            return Response(
                {"detail": "Siz bu guruhdan chetlatilgansiz."}, status=status.HTTP_403_FORBIDDEN
            )
        if group.members.count() >= group.max_members:
            return Response({"detail": "Guruh to'lgan."}, status=status.HTTP_400_BAD_REQUEST)
        return None

    @action(detail=False, methods=["post"])
    def join(self, request):
        """Taklif kodi bilan qo'shilish."""
        code = (request.data.get("invite_code") or "").strip().upper()
        group = Group.objects.filter(invite_code=code).first()
        if not group:
            return Response({"detail": "Taklif kodi noto'g'ri."}, status=status.HTTP_404_NOT_FOUND)

        blocked = self._guard_join(group, request.user)
        if blocked:
            return blocked

        existing = group.members.filter(user=request.user).exists()
        self._add_member(group, request.user)

        data = GroupSerializer(group, context=self.get_serializer_context()).data
        data["joined"] = not existing
        return Response(data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="join-open")
    def join_open(self, request, slug=None):
        """Ochiq guruhga to'g'ridan-to'g'ri qo'shilish (kodsiz)."""
        group = self.get_object()
        if group.privacy != Group.Privacy.OPEN:
            return Response(
                {"detail": "Bu guruhga to'g'ridan-to'g'ri qo'shilib bo'lmaydi."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        blocked = self._guard_join(group, request.user)
        if blocked:
            return blocked

        self._add_member(group, request.user)
        return Response(GroupSerializer(group, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="request-join")
    def request_join(self, request, slug=None):
        """«So'rov bilan» guruhga ariza yuborish."""
        group = self.get_object()
        if group.privacy != Group.Privacy.REQUEST:
            return Response(
                {"detail": "Bu guruh so'rov qabul qilmaydi."}, status=status.HTTP_400_BAD_REQUEST
            )
        blocked = self._guard_join(group, request.user)
        if blocked:
            return blocked
        if group.members.filter(user=request.user).exists():
            return Response({"detail": "Siz allaqachon a'zosiz."}, status=status.HTTP_400_BAD_REQUEST)

        GroupJoinRequest.objects.update_or_create(
            group=group,
            user=request.user,
            defaults={
                "message": (request.data.get("message") or "")[:200],
                "status": GroupJoinRequest.Status.PENDING,
                "decided_by": None,
                "decided_at": None,
            },
        )
        # Bu hali A'ZOLIK EMAS — xabar matni ham shunga mos bo'lsin.
        self._notify_owner(
            group, request.user,
            title=f"{request.user.username} guruhingizga qo'shilish so'rovini yubordi",
        )
        return Response({"detail": "So'rov yuborildi — guruh egasi ko'rib chiqadi."})

    @action(detail=True, methods=["get", "post"], url_path="requests")
    def requests(self, request, slug=None):
        """Kutayotgan so'rovlar ro'yxati va ular bo'yicha qaror."""
        group = self.get_object()
        if not group.can_manage(request.user):
            raise PermissionDenied("So'rovlarni egasi va moderatorlar ko'radi.")

        if request.method == "GET":
            rows = (
                group.join_requests.filter(status=GroupJoinRequest.Status.PENDING)
                .select_related("user")
                .order_by("created_at")[:500]
            )
            return Response(GroupJoinRequestSerializer(rows, many=True).data)

        request_id = to_int(request.data.get("id"), 0)
        decision = (request.data.get("decision") or "").strip()
        if decision not in {"approve", "reject"}:
            return Response(
                {"detail": "`decision` — `approve` yoki `reject`."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Faqat KUTAYOTGAN so'rov ustida qaror qabul qilinadi — allaqachon
        # hal bo'lganini qayta bosish takroriy xabar/faollik yozuvi bermaydi.
        row = (
            group.join_requests.filter(pk=request_id, status=GroupJoinRequest.Status.PENDING)
            .select_related("user")
            .first()
        )
        if not row:
            return Response({"detail": "Kutayotgan so'rov topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        if decision == "approve":
            # Avval shartlar (ban, sig'im), KEYIN holat o'zgaradi. Ilgari
            # tartib teskari edi: guruh to'lgan bo'lsa so'rov «tasdiqlangan»
            # deb saqlanib, a'zo esa qo'shilmay qolardi.
            blocked = self._guard_join(group, row.user)
            if blocked:
                return blocked

        row.status = (
            GroupJoinRequest.Status.APPROVED if decision == "approve"
            else GroupJoinRequest.Status.REJECTED
        )
        row.decided_by = request.user
        row.decided_at = timezone.now()
        row.save(update_fields=["status", "decided_by", "decided_at"])

        if decision == "approve":
            self._add_member(group, row.user)

        return Response({"detail": "Bajarildi.", "status": row.status})

    # ------------------------------------------------------------- chiqish
    @action(detail=True, methods=["post"])
    def leave(self, request, slug=None):
        group = self.get_object()
        if group.is_owner(request.user):
            return Response(
                {"detail": "Avval egalikni boshqa a'zoga o'tkazing yoki guruhni o'chiring."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        GroupMember.objects.filter(group=group, user=request.user).delete()
        group.recount()
        _log(group, request.user, GroupActivity.Kind.LEFT, "guruhdan chiqdi")
        return Response({"detail": "Guruhdan chiqdingiz."})

    @action(detail=True, methods=["post"], url_path="regenerate-code")
    def regenerate_code(self, request, slug=None):
        group = self.get_object()
        if not group.can_manage(request.user):
            raise PermissionDenied("Kodni egasi va moderatorlar yangilaydi.")

        # Kod noyob bo'lishi shart — to'qnashuvda qayta urinamiz.
        for _ in range(5):
            candidate = generate_invite_code()
            if not Group.objects.filter(invite_code=candidate).exists():
                group.invite_code = candidate
                group.save(update_fields=["invite_code"])
                return Response({"invite_code": group.invite_code})
        return Response(
            {"detail": "Kod yaratib bo'lmadi, qayta urinib ko'ring."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # -------------------------------------------------------------- a'zolar
    @action(detail=True, methods=["post"], url_path="members/(?P<member_id>[^/.]+)/remove")
    def remove_member(self, request, slug=None, member_id=None):
        group = self.get_object()
        if not group.can_manage(request.user):
            raise PermissionDenied("A'zoni egasi va moderatorlar chiqaradi.")

        member = group.members.filter(pk=to_int(member_id, 0)).select_related("user").first()
        if not member:
            return Response({"detail": "A'zo topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        if member.user_id == group.owner_id:
            return Response({"detail": "Egani chiqarib bo'lmaydi."}, status=status.HTTP_400_BAD_REQUEST)
        # Moderator boshqa moderatorga tegmaydi — faqat egasi.
        if member.role == GroupMember.Role.MODERATOR and not group.is_owner(request.user):
            return Response(
                {"detail": "Moderatorni faqat guruh egasi chiqara oladi."},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = member.user.username
        if str(request.data.get("ban") or "").lower() in {"1", "true", "yes"}:
            GroupBan.objects.get_or_create(
                group=group,
                user=member.user,
                defaults={
                    "reason": (request.data.get("reason") or "")[:200],
                    "created_by": request.user,
                },
            )
        member.delete()
        group.recount()
        _log(group, request.user, GroupActivity.Kind.LEFT, f"{username} guruhdan chiqarildi")
        return Response({"detail": "A'zo guruhdan chiqarildi."})

    @action(detail=True, methods=["get"], url_path="bans")
    def bans(self, request, slug=None):
        """Chetlatilganlar ro'yxati — egasi va moderatorlarga."""
        group = self.get_object()
        if not group.can_manage(request.user):
            raise PermissionDenied("Ro'yxatni egasi va moderatorlar ko'radi.")
        rows = group.bans.select_related("user", "created_by").order_by("-created_at")[:500]
        return Response(
            [
                {
                    "id": row.pk,
                    "username": row.user.username,
                    "full_name": row.user.full_name,
                    "reason": row.reason,
                    "created_by": row.created_by.username if row.created_by else None,
                    "created_at": row.created_at,
                }
                for row in rows
            ]
        )

    @action(detail=True, methods=["post"], url_path="bans/(?P<ban_id>[^/.]+)/remove")
    def unban(self, request, slug=None, ban_id=None):
        """Chetlatishni bekor qilish — foydalanuvchi yana qo'shila oladi.

        Busiz ban QAYTARIB BO'LMAS edi: bitta noto'g'ri bosish o'quvchini
        sinf guruhidan abadiy chiqarib yuborardi.
        """
        group = self.get_object()
        if not group.can_manage(request.user):
            raise PermissionDenied("Chetlatishni egasi va moderatorlar bekor qiladi.")
        row = group.bans.filter(pk=to_int(ban_id, 0)).select_related("user").first()
        if not row:
            return Response({"detail": "Yozuv topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        username = row.user.username
        row.delete()
        _log(group, request.user, GroupActivity.Kind.ROLE, f"{username} chetlatishdan chiqarildi")
        return Response({"detail": f"{username} endi guruhga qayta qo'shila oladi."})

    @action(detail=True, methods=["post"], url_path="members/(?P<member_id>[^/.]+)/role")
    def set_role(self, request, slug=None, member_id=None):
        """Moderator tayinlash yoki olib tashlash — faqat egasi."""
        group = self.get_object()
        if not group.is_owner(request.user):
            raise PermissionDenied("Rolni faqat guruh egasi o'zgartiradi.")

        member = group.members.filter(pk=to_int(member_id, 0)).select_related("user").first()
        if not member:
            return Response({"detail": "A'zo topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        if member.user_id == group.owner_id:
            return Response({"detail": "Egasining roli o'zgarmaydi."}, status=status.HTTP_400_BAD_REQUEST)

        role = (request.data.get("role") or "").strip()
        if role not in {GroupMember.Role.MODERATOR, GroupMember.Role.MEMBER}:
            return Response(
                {"detail": "`role` — `moderator` yoki `member`."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member.role = role
        member.save(update_fields=["role"])
        label = "moderator etib tayinlandi" if role == GroupMember.Role.MODERATOR else "oddiy a'zoga o'tkazildi"
        _log(group, request.user, GroupActivity.Kind.ROLE, f"{member.user.username} {label}")
        return Response(GroupMemberSerializer(member).data)

    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer_ownership(self, request, slug=None):
        """Egalikni boshqa a'zoga o'tkazish.

        Busiz guruh egasi guruhdan umuman chiqa olmasdi va hisobi
        o'chirilsa guruh boshqaruvsiz qolardi.
        """
        group = self.get_object()
        if not group.is_owner(request.user):
            raise PermissionDenied("Egalikni faqat joriy egasi o'tkazadi.")

        target = group.members.filter(user__username__iexact=request.data.get("username") or "")
        member = target.select_related("user").first()
        if not member:
            return Response({"detail": "Bunday a'zo yo'q."}, status=status.HTTP_404_NOT_FOUND)

        old_owner_row = group.members.filter(user_id=group.owner_id).first()
        group.owner = member.user
        group.save(update_fields=["owner"])

        member.role = GroupMember.Role.OWNER
        member.save(update_fields=["role"])
        if old_owner_row and old_owner_row.pk != member.pk:
            old_owner_row.role = GroupMember.Role.MODERATOR
            old_owner_row.save(update_fields=["role"])

        _log(group, request.user, GroupActivity.Kind.ROLE, f"egalik {member.user.username} ga o'tdi")
        return Response(GroupSerializer(group, context=self.get_serializer_context()).data)

    # ---------------------------------------------------------- ko'rsatkich
    @action(detail=True, methods=["get"])
    def leaderboard(self, request, slug=None):
        """Ichki reyting.

        `?period=group|week|month|all` — sukut bo'yicha `group`, ya'ni
        A'ZO QO'SHILGANDAN BERI to'plangan ball. Ilgari faqat umrbod
        ball bo'yicha saralanardi: eski hisob bilan kirgan odam avtomatik
        birinchi bo'lib turardi va yangi a'zo uni hech qachon quvib
        yetolmasdi.
        """
        group = self.get_object()
        period = (request.query_params.get("period") or "group").strip()

        rows = list(group.members.select_related("user"))

        if period in {"week", "month"}:
            days = 7 if period == "week" else 30
            since = timezone.now() - timezone.timedelta(days=days)
            from apps.problems.models import SolvedProblem

            counts = dict(
                SolvedProblem.objects.filter(
                    user__in=[row.user_id for row in rows], created_at__gte=since
                )
                .values_list("user")
                .annotate(total=Count("id"))
            )
            scored = [(row, counts.get(row.user_id, 0)) for row in rows]
            scored.sort(key=lambda item: (-item[1], -item[0].user.rating))
            data = []
            for index, (row, solved) in enumerate(scored, start=1):
                payload = GroupMemberSerializer(row).data
                payload["position"] = index
                payload["period_solved"] = solved
                data.append(payload)
            return Response(data)

        if period == "all":
            rows.sort(key=lambda row: (-row.user.total_points, -row.user.rating))
        else:
            rows.sort(
                key=lambda row: (
                    -(row.user.total_points - (row.points_at_join or 0)),
                    -row.user.rating,
                )
            )

        data = GroupMemberSerializer(rows, many=True).data
        for index, payload in enumerate(data, start=1):
            payload["position"] = index
        return Response(data)

    @action(detail=True, methods=["get"])
    def stats(self, request, slug=None):
        """Guruh ko'rsatkichlari — sahifadagi kartalar shundan."""
        from apps.judge.models import Submission, SubmissionStatus
        from apps.problems.models import SolvedProblem

        group = self.get_object()
        user_ids = list(group.members.values_list("user_id", flat=True))
        week_ago = timezone.now() - timezone.timedelta(days=7)

        solved_week = SolvedProblem.objects.filter(user__in=user_ids, created_at__gte=week_ago)
        active = solved_week.values("user").distinct().count()

        by_language = list(
            Submission.objects.filter(user__in=user_ids, status=SubmissionStatus.ACCEPTED)
            .values("language")
            .annotate(total=Count("id"))
            .order_by("-total")[:5]
        )

        members = list(group.members.select_related("user"))
        return Response(
            {
                "members": len(members),
                "max_members": group.max_members,
                "solved_total": sum(row.user.problems_solved for row in members),
                "solved_this_week": solved_week.count(),
                "active_this_week": active,
                "points_total": sum(row.user.total_points for row in members),
                "avg_rating": round(
                    sum(row.user.rating for row in members) / max(1, len(members))
                ),
                "top_streak": max((row.user.current_streak for row in members), default=0),
                "by_language": by_language,
            }
        )

    @action(detail=True, methods=["get"])
    def activity(self, request, slug=None):
        """Guruh faollik tasmasi."""
        group = self.get_object()
        limit = to_int(request.query_params.get("limit"), 30, low=5, high=100)
        rows = group.activities.select_related("user")[:limit]
        return Response(GroupActivitySerializer(rows, many=True).data)

    # ----------------------------------------------------------- vazifalar
    @action(detail=True, methods=["get", "post"], url_path="assignments")
    def assignments(self, request, slug=None):
        group = self.get_object()

        if request.method == "GET":
            rows = group.assignments.all()
            # Qoralama vazifalar faqat boshqaruvchilarga ko'rinadi — ilgari
            # moderator saqlagan qoralamasini ro'yxatdan topa olmasdi.
            if not group.can_manage(request.user):
                rows = rows.filter(is_published=True)
            rows = (
                rows.annotate(problem_total=Count("problems"))
                .select_related("created_by")[:200]
            )
            return Response(GroupAssignmentSerializer(rows, many=True).data)

        if not group.can_manage(request.user):
            raise PermissionDenied("Vazifani egasi va moderatorlar qo'shadi.")

        serializer = GroupAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save(group=group, created_by=request.user)
        _log(
            group, request.user, GroupActivity.Kind.ASSIGNMENT,
            f"yangi vazifa: {assignment.title}", url=f"/groups/{group.slug}",
        )
        return Response(
            GroupAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED
        )

    @action(
        detail=True,
        methods=["get", "patch", "delete"],
        url_path="assignments/(?P<assignment_id>[^/.]+)",
    )
    def assignment_detail(self, request, slug=None, assignment_id=None):
        """Vazifa tafsiloti: masalalar va har bir a'zoning bajarishi."""
        group = self.get_object()
        assignment = group.assignments.filter(pk=to_int(assignment_id, 0)).first()
        if not assignment or (
            not assignment.is_published and not group.can_manage(request.user)
        ):
            return Response({"detail": "Vazifa topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "DELETE":
            if not group.can_manage(request.user):
                raise PermissionDenied("Vazifani egasi va moderatorlar o'chiradi.")
            assignment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if request.method == "PATCH":
            if not group.can_manage(request.user):
                raise PermissionDenied("Vazifani egasi va moderatorlar tahrirlaydi.")
            serializer = GroupAssignmentSerializer(assignment, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        return Response(self._assignment_progress(group, assignment, request.user))

    @staticmethod
    def _assignment_progress(group: Group, assignment: GroupAssignment, viewer) -> dict:
        """Kim nechta masalani yechgani — bitta so'rovda."""
        from apps.problems.models import SolvedProblem

        problems = list(assignment.problems.all().order_by("difficulty", "title_uz"))
        problem_ids = [problem.id for problem in problems]
        members = list(group.members.select_related("user"))

        solved_pairs = set(
            SolvedProblem.objects.filter(
                user__in=[row.user_id for row in members], problem_id__in=problem_ids
            ).values_list("user_id", "problem_id")
        )

        rows = []
        for member in members:
            done = [pid for pid in problem_ids if (member.user_id, pid) in solved_pairs]
            rows.append(
                {
                    "username": member.user.username,
                    "full_name": member.user.full_name,
                    "avatar_url": member.user.avatar_url,
                    "solved": len(done),
                    "total": len(problem_ids),
                    "percent": round(len(done) / max(1, len(problem_ids)) * 100),
                }
            )
        rows.sort(key=lambda row: (-row["solved"], row["username"]))

        return {
            **GroupAssignmentSerializer(assignment).data,
            "problems": [
                {
                    "slug": problem.slug,
                    "title": problem.title_uz,
                    "difficulty": problem.difficulty,
                    "rating": problem.rating,
                    "solved": (viewer.id, problem.id) in solved_pairs,
                }
                for problem in problems
            ],
            "progress": rows,
        }
