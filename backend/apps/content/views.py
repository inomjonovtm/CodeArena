"""Public muhokama endpointlari."""
from __future__ import annotations

from django.db.models import F
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import (
    Comment,
    ContactMessage,
    ContentVote,
    Discussion,
    ModerationStatus,
)
from .serializers import (
    PublicCommentSerializer,
    PublicDiscussionSerializer,
    PublicReportSerializer,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def problem_discussions(request, problem_id):
    """`GET /api/discussions/problem/:problemId/` — eski (UUID bo'yicha) manzil."""
    rows = (
        Discussion.objects.filter(problem_id=problem_id, status=ModerationStatus.VISIBLE)
        .select_related("author", "problem")
        .order_by("-is_pinned", "-created_at")[:100]
    )
    return Response(
        PublicDiscussionSerializer(rows, many=True, context={"request": request}).data
    )


class DiscussionViewSet(viewsets.ModelViewSet):
    """`/api/discussions/` — masala muhokamalari va umumiy mavzular."""

    serializer_class = PublicDiscussionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    search_fields = ["title", "body_md"]
    ordering_fields = ["created_at", "upvotes", "comment_count"]
    ordering = ["-is_pinned", "-created_at"]

    def get_queryset(self):
        queryset = (
            Discussion.objects.filter(status=ModerationStatus.VISIBLE)
            .select_related("author", "problem")
        )
        slug = self.request.query_params.get("problem_slug")
        if slug:
            queryset = queryset.filter(problem__slug=slug)
        problem_id = self.request.query_params.get("problem")
        if problem_id:
            queryset = queryset.filter(problem_id=problem_id)
        if self.request.query_params.get("mine") in {"1", "true"} and self.request.user.is_authenticated:
            queryset = queryset.filter(author=self.request.user)
        return queryset

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Discussion.objects.filter(pk=instance.pk).update(views=F("views") + 1)
        instance.refresh_from_db(fields=["views"])
        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.author_id != self.request.user.pk:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Faqat o'z mavzuingizni tahrirlay olasiz.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.pk and not self.request.user.is_staff_member:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Faqat o'z mavzuingizni o'chira olasiz.")
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        """`+1` / `-1` / `0` (bekor qilish)."""
        discussion = self.get_object()
        return _apply_vote(request, target=discussion, field="discussion")

    @action(detail=True, methods=["get"])
    def comments(self, request, pk=None):
        """Muhokama izohlari — daraxt tuzilishi frontendda yig'iladi."""
        discussion = self.get_object()
        rows = (
            Comment.objects.filter(discussion=discussion, status=ModerationStatus.VISIBLE)
            .select_related("author")
            .order_by("created_at")
        )
        return Response(PublicCommentSerializer(rows, many=True, context={"request": request}).data)


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = PublicCommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ["discussion", "parent"]
    ordering = ["created_at"]

    def get_queryset(self):
        return (
            Comment.objects.filter(status=ModerationStatus.VISIBLE)
            .select_related("author", "discussion", "parent")
        )

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    def perform_create(self, serializer):
        discussion = serializer.validated_data.get("discussion")
        if discussion and discussion.is_locked:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Bu mavzu yopilgan — yangi izoh qo'shib bo'lmaydi.")

        comment = serializer.save(author=self.request.user)
        Discussion.objects.filter(pk=comment.discussion_id).update(
            comment_count=F("comment_count") + 1
        )
        _notify_comment(comment, actor=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.author_id != self.request.user.pk:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Faqat o'z izohingizni tahrirlay olasiz.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.pk and not self.request.user.is_staff_member:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Faqat o'z izohingizni o'chira olasiz.")
        discussion_id = instance.discussion_id
        instance.delete()
        Discussion.objects.filter(pk=discussion_id, comment_count__gt=0).update(
            comment_count=F("comment_count") - 1
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        comment = self.get_object()
        return _apply_vote(request, target=comment, field="comment")


class ReportViewSet(viewsets.GenericViewSet):
    """`POST /api/reports/` — noto'g'ri kontent haqida xabar berish."""

    serializer_class = PublicReportSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = serializer.validated_data
        duplicate = request.user.reports_made.filter(
            discussion=target.get("discussion"), comment=target.get("comment"), is_resolved=False
        ).exists()
        if duplicate:
            return Response(
                {"detail": "Siz bu kontent haqida allaqachon xabar bergansiz."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = serializer.save(reporter=request.user)
        if report.discussion_id:
            Discussion.objects.filter(pk=report.discussion_id).update(
                flagged_count=F("flagged_count") + 1
            )
        if report.comment_id:
            Comment.objects.filter(pk=report.comment_id).update(
                flagged_count=F("flagged_count") + 1
            )

        return Response(
            {"detail": "Rahmat! Moderatorlar tez orada ko'rib chiqadi.", "id": str(report.id)},
            status=status.HTTP_201_CREATED,
        )


# --------------------------------------------------------------------- ovoz
def _apply_vote(request, *, target, field: str):
    try:
        value = int(request.data.get("value", 1))
    except (TypeError, ValueError):
        value = 1
    value = max(-1, min(1, value))

    existing = ContentVote.objects.filter(user=request.user, **{field: target}).first()
    delta = 0

    if value == 0:
        if existing:
            delta = -existing.value
            existing.delete()
    elif existing:
        if existing.value != value:
            delta = value - existing.value
            existing.value = value
            existing.save(update_fields=["value"])
    else:
        delta = value
        ContentVote.objects.create(user=request.user, value=value, **{field: target})

    if delta:
        type(target).objects.filter(pk=target.pk).update(upvotes=F("upvotes") + delta)
        target.refresh_from_db(fields=["upvotes"])

    return Response({"upvotes": target.upvotes, "my_vote": value})


def _notify_comment(comment, *, actor) -> None:
    """Izoh qoldirilganda muhokama egasiga va javob berilgan izoh egasiga xabar."""
    from apps.notifications.models import NotificationKind
    from apps.notifications.services import notify

    url = f"/discussions/{comment.discussion_id}"
    excerpt = (comment.body_md or "")[:120]

    if comment.parent_id and comment.parent.author_id:
        notify(
            comment.parent.author,
            actor=actor,
            kind=NotificationKind.COMMENT_REPLY,
            title=f"{actor.username} izohingizga javob berdi",
            body=excerpt,
            url=url,
        )

    discussion_author = comment.discussion.author
    if discussion_author and (not comment.parent_id or comment.parent.author_id != discussion_author.pk):
        notify(
            discussion_author,
            actor=actor,
            kind=NotificationKind.DISCUSSION_COMMENT,
            title=f"{actor.username} mavzuingizga izoh qoldirdi",
            body=excerpt,
            url=url,
        )


# ============================================================ bog'lanish
@api_view(["POST"])
@permission_classes([AllowAny])
def contact_submit(request):
    """`POST /api/contact/` — «Bog'lanish» formasi.

    Mehmon ham yozishi mumkin; tizimga kirgan bo'lsa ism/email avtomatik
    to'ldiriladi va xabar hisobga bog'lanadi.
    """
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError as DjangoValidationError

    user = request.user if request.user.is_authenticated else None
    data = request.data

    name = (data.get("name") or (user.display_name if user else "")).strip()
    email = (data.get("email") or (user.email if user else "")).strip().lower()
    subject = (data.get("subject") or "").strip()
    body = (data.get("body") or "").strip()
    topic = data.get("topic") or "general"

    errors = {}
    if len(name) < 2:
        errors["name"] = ["Ismingizni kiriting."]
    if not email:
        errors["email"] = ["Email kiriting."]
    else:
        try:
            validate_email(email)
        except DjangoValidationError:
            errors["email"] = ["Email formati noto'g'ri."]
    if len(subject) < 3:
        errors["subject"] = ["Mavzuni kiriting."]
    if len(body) < 10:
        errors["body"] = ["Xabar kamida 10 ta belgidan iborat bo'lsin."]
    if topic not in dict(ContactMessage.TOPICS):
        topic = "general"
    if errors:
        return Response(
            {"detail": "Formada xatoliklar bor.", "errors": errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Oddiy spam himoyasi: bir xil emaildan 5 daqiqada bittadan ko'p emas
    from django.utils import timezone

    recent = ContactMessage.objects.filter(
        email__iexact=email, created_at__gte=timezone.now() - timezone.timedelta(minutes=5)
    ).exists()
    if recent:
        return Response(
            {"detail": "Xabaringiz yaqinda yuborildi. Bir necha daqiqadan so'ng urinib ko'ring."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    message = ContactMessage.objects.create(
        user=user, name=name[:120], email=email, topic=topic,
        subject=subject[:200], body=body,
        ip_address=getattr(request, "client_ip", None) or None,
    )
    return Response(
        {"detail": "Xabaringiz yuborildi. Tez orada javob beramiz.", "id": str(message.id)},
        status=status.HTTP_201_CREATED,
    )
