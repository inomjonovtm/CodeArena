from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel, SoftDeleteModel, TimeStampedModel
from apps.core.utils import invite_code


class Group(SoftDeleteModel, BaseModel):
    """Guruh — sinf, kurs yoki do'stlar davrasi uchun yopiq maydon.

    Guruh ikkita ishni bajaradi: ichki reyting yuritadi va o'qituvchiga
    a'zolarga vazifa berish imkonini beradi. Shuning uchun unda oddiy
    ro'yxatdan tashqari faollik tasmasi, statistika va vazifalar bor.
    """

    class Privacy(models.TextChoices):
        #: Ro'yxatda ko'rinadi va istalgan odam qo'shila oladi.
        OPEN = "open", "Ochiq — hamma qo'shila oladi"
        #: Ro'yxatda ko'rinadi, lekin qo'shilish uchun tasdiq kerak.
        REQUEST = "request", "So'rov bilan — egasi tasdiqlaydi"
        #: Ro'yxatda ko'rinmaydi, faqat taklif kodi bilan kiriladi.
        PRIVATE = "private", "Yopiq — faqat taklif kodi bilan"

    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=90, unique=True)
    description = models.TextField(blank=True, max_length=500)
    avatar_url = models.CharField(max_length=500, blank=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="owned_groups"
    )
    invite_code = models.CharField(max_length=16, unique=True, default=invite_code)

    # `is_private` bayrog'i o'rniga uch holatli sozlama: ilgari bayroq
    # saqlanardi-yu, hech bir joyda TEKSHIRILMASDI — "ochiq" guruh ham
    # amalda faqat kod bilan ochilardi.
    privacy = models.CharField(
        max_length=8, choices=Privacy.choices, default=Privacy.PRIVATE, db_index=True
    )
    is_verified = models.BooleanField(
        default=False, help_text="Admin tomonidan tasdiqlangan (masalan, universitet)"
    )
    member_count = models.PositiveIntegerField(default=0)
    max_members = models.PositiveIntegerField(default=200)

    class Meta:
        db_table = "groups_custom"
        verbose_name = "Guruh"
        verbose_name_plural = "Guruhlar"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["privacy", "-member_count"]),
            models.Index(fields=["owner"]),
        ]

    def __str__(self) -> str:
        return self.name

    # ------------------------------------------------------------ yordamchi
    @property
    def is_full(self) -> bool:
        return self.member_count >= self.max_members

    def recount(self) -> int:
        """A'zolar sonini haqiqiy qatorlardan qayta hisoblaydi.

        Denormallashtirilgan hisoblagich hisob o'chirilganda (CASCADE) jimgina
        eskirib qolardi — shuning uchun uni bitta joydan yangilaymiz.
        """
        self.member_count = self.members.count()
        self.save(update_fields=["member_count"])
        return self.member_count

    def role_of(self, user) -> str | None:
        if not user or not user.is_authenticated:
            return None
        member = self.members.filter(user=user).first()
        return member.role if member else None

    def can_manage(self, user) -> bool:
        """Egasi va moderatorlar — a'zolar va vazifalarni boshqaradi."""
        return self.role_of(user) in {GroupMember.Role.OWNER, GroupMember.Role.MODERATOR}

    def is_owner(self, user) -> bool:
        return bool(user and user.is_authenticated and self.owner_id == user.pk)


class GroupMember(TimeStampedModel):
    class Role(models.TextChoices):
        OWNER = "owner", "Egasi"
        MODERATOR = "moderator", "Moderator"
        MEMBER = "member", "A'zo"

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_memberships"
    )
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    # Guruh reytingi uchun boshlang'ich nuqta: a'zo QO'SHILGANDAN KEYIN
    # to'plagan ballari hisoblanadi. Aks holda beshinchi yil hisobi bilan
    # kirgan odam guruhda avtomatik birinchi bo'lib turardi va yangi
    # a'zoning uni quvib yetishi imkonsiz edi.
    points_at_join = models.IntegerField(default=0)
    solved_at_join = models.IntegerField(default=0)

    class Meta:
        db_table = "group_members"
        verbose_name = "Guruh a'zosi"
        verbose_name_plural = "Guruh a'zolari"
        unique_together = [("group", "user")]
        ordering = ["-joined_at"]
        indexes = [models.Index(fields=["group", "role"])]

    def __str__(self) -> str:
        return f"{self.user} @ {self.group}"


class GroupBan(TimeStampedModel):
    """Guruhdan chiqarilgan a'zo — taklif kodi bilan qaytib kira olmaydi.

    Bo'lmasa chiqarish ma'nosiz edi: odam o'sha kod bilan bir soniyada
    qaytib qo'shilardi.
    """

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="bans")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_bans"
    )
    reason = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="group_bans_issued",
    )

    class Meta:
        db_table = "group_bans"
        verbose_name = "Guruhdan chetlatilgan"
        verbose_name_plural = "Guruhdan chetlatilganlar"
        unique_together = [("group", "user")]
        ordering = ["-created_at"]


class GroupJoinRequest(TimeStampedModel):
    """«So'rov bilan» guruhlarga qo'shilish arizasi."""

    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        APPROVED = "approved", "Tasdiqlangan"
        REJECTED = "rejected", "Rad etilgan"

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="join_requests")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_join_requests"
    )
    message = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="group_requests_decided",
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "group_join_requests"
        verbose_name = "Guruhga qo'shilish so'rovi"
        verbose_name_plural = "Guruhga qo'shilish so'rovlari"
        unique_together = [("group", "user")]
        ordering = ["-created_at"]


class GroupActivity(TimeStampedModel):
    """Guruh faollik tasmasi — kim nima qildi.

    Guruhning tirikligi shu tasmadan ko'rinadi: kim qo'shildi, kim qaysi
    masalani yechdi, qaysi vazifa berildi. Ilgari guruh sahifasi statik
    ro'yxat edi va unga qaytib kelish uchun sabab yo'q edi.
    """

    class Kind(models.TextChoices):
        JOINED = "joined", "Qo'shildi"
        LEFT = "left", "Chiqdi"
        SOLVED = "solved", "Masala yechdi"
        ASSIGNMENT = "assignment", "Yangi vazifa"
        ROLE = "role", "Rol o'zgardi"

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="activities")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="group_activities"
    )
    kind = models.CharField(max_length=12, choices=Kind.choices, db_index=True)
    text = models.CharField(max_length=200, blank=True)
    url = models.CharField(max_length=300, blank=True)

    class Meta:
        db_table = "group_activities"
        verbose_name = "Guruh faoliyati"
        verbose_name_plural = "Guruh faoliyati"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["group", "-created_at"])]


class GroupAssignment(BaseModel):
    """Vazifa — guruhga berilgan masalalar to'plami va muddat.

    Bu guruhni «reyting jadvali» dan «sinf» ga aylantiradigan qism:
    o'qituvchi masalalarni tanlaydi, muddat qo'yadi va kim nechtasini
    yechganini bitta jadvalda ko'radi.
    """

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="assignments")
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, max_length=1000)
    problems = models.ManyToManyField(
        "problems.Problem", related_name="group_assignments", blank=True
    )
    due_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="group_assignments_created",
    )

    class Meta:
        db_table = "group_assignments"
        verbose_name = "Guruh vazifasi"
        verbose_name_plural = "Guruh vazifalari"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.group})"

    @property
    def is_overdue(self) -> bool:
        from django.utils import timezone

        return bool(self.due_at and self.due_at < timezone.now())
