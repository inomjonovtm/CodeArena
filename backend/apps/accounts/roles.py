"""Rol → Django huquqlari.

Ikki xil huquq tizimi bor va ular HAR XIL savolga javob beradi:

* Django huquqlari (`app_label.codename`) — «bu odam boshqaruv panelida
  qaysi jadvalni ko'ra/o'zgartira oladi?»;
* bizning kodlar (`PERMISSION_CATALOG`) — «bu odam Studio'da nima qila
  oladi?» (masala tayyorlash, generator ishga tushirish).

Shu fayl birinchisini rolga bog'laydi. Administrator xohlasa, panel ichida
guruhga qo'shimcha huquq berib, standartdan chetga chiqishi mumkin —
`sync_roles` buyrug'i guruhning MAVJUD huquqlarini o'chirmaydi, faqat
yetishmayotganini qo'shadi.
"""
from __future__ import annotations

from django.contrib.auth.models import Group, Permission
from django.db.models import Q

# Guruh nomlari — panelda shu ko'rinishda chiqadi.
MODERATOR_GROUP = "Moderatorlar"
SETTER_GROUP = "Mualliflar"


def _perms(model_labels: list[str], actions: tuple[str, ...]) -> Q:
    """`app_label.modelname` ro'yxati va amallar bo'yicha huquq filtri."""
    query = Q(pk__in=[])
    for label in model_labels:
        app_label, model_name = label.split(".")
        codenames = [f"{action}_{model_name}" for action in actions]
        query |= Q(content_type__app_label=app_label, codename__in=codenames)
    return query


# Moderator KO'RADI: deyarli hamma narsa (ish uchun kontekst kerak).
MODERATOR_VIEW = [
    "accounts.user",
    "problems.problem", "problems.testcase", "problems.tag", "problems.dailychallenge",
    "problems.referencesolution", "problems.testgenerator", "problems.authoringrun",
    "judge.submission", "judge.submissiontestresult",
    "contests.contest", "contests.contestproblem", "contests.conteststaff",
    "contests.contestparticipant",
    "assessments.question", "assessments.questionfolder", "assessments.quiz",
    "assessments.quizitem", "assessments.quizattempt",
    "content.discussion", "content.comment", "content.contentreport", "content.contactmessage",
    "community.group", "community.groupmember",
    "moderation.plagiarismpair", "moderation.announcement", "moderation.auditlog",
    "moderation.sitesetting",
    "notifications.notification",
]

# Moderator O'ZGARTIRADI: kontent va moderatsiya. Foydalanuvchi rollari,
# sayt sozlamalari va audit jurnali ATAYLAB tashqarida — ular saytning
# ishlashiga ta'sir qiladi va faqat administrator qo'lida qolishi kerak.
MODERATOR_CHANGE = [
    "problems.problem", "problems.testcase", "problems.tag", "problems.dailychallenge",
    "problems.referencesolution", "problems.testgenerator",
    "contests.contest", "contests.contestproblem", "contests.conteststaff",
    "contests.contestparticipant",
    "assessments.question", "assessments.questionfolder", "assessments.quiz",
    "assessments.quizitem",
    "content.discussion", "content.comment", "content.contentreport", "content.contactmessage",
    "community.group", "community.groupmember",
    "moderation.plagiarismpair", "moderation.announcement",
    # Qayta tekshirish (rejudge) `change_submission` huquqiga bog'langan.
    "judge.submission",
]

# Moderator QO'SHADI: yangi kontent yaratishi mumkin.
MODERATOR_ADD = [
    "problems.problem", "problems.testcase", "problems.tag", "problems.dailychallenge",
    "problems.referencesolution", "problems.testgenerator",
    "contests.contest", "contests.contestproblem", "contests.conteststaff",
    "assessments.question", "assessments.questionfolder", "assessments.quiz",
    "assessments.quizitem",
    "moderation.announcement",
]

# Moderator O'CHIRA OLMAYDI. O'chirish qaytarib bo'lmaydigan amal, shuning
# uchun u administratorda qoladi; kontentni yashirish esa moderatorda bor.

# Muallif (setter) boshqaruv paneliga UMUMAN kirmaydi — u Studio'da ishlaydi.
# Guruh baribir yaratiladi: administrator kerak bo'lsa unga qo'lda huquq
# qo'shishi mumkin.
SETTER_VIEW: list[str] = []


def group_permissions(group_name: str):
    """Guruhga tegishli huquqlar to'plami (`Permission` queryset)."""
    if group_name == MODERATOR_GROUP:
        query = (
            _perms(MODERATOR_VIEW, ("view",))
            | _perms(MODERATOR_CHANGE, ("change",))
            | _perms(MODERATOR_ADD, ("add",))
        )
    elif group_name == SETTER_GROUP:
        if not SETTER_VIEW:
            return Permission.objects.none()
        query = _perms(SETTER_VIEW, ("view",))
    else:
        return Permission.objects.none()
    return Permission.objects.filter(query)


def ensure_groups() -> dict[str, Group]:
    """Guruhlarni yaratadi va standart huquqlarni QO'SHADI.

    Mavjud huquqlar olib tashlanmaydi: administrator panel ichida qo'lda
    bergan ruxsat keyingi `sync_roles` da yo'qolib ketmasligi kerak.
    """
    groups = {}
    for name in (MODERATOR_GROUP, SETTER_GROUP):
        group, _ = Group.objects.get_or_create(name=name)
        wanted = group_permissions(name)
        if wanted.exists():
            group.permissions.add(*wanted)
        groups[name] = group
    return groups


def apply_role(user, *, save: bool = True) -> None:
    """Foydalanuvchining roliga mos guruh va `is_staff` bayrog'ini qo'yadi.

    `is_staff` — Django boshqaruv paneliga (`/admin/`) kirish kaliti va u
    FAQAT ADMINISTRATORDA bo'ladi.

    Ilgari moderator ham `is_staff` olardi, ya'ni panelga kira olardi.
    Panel — bazaning to'g'ridan-to'g'ri ko'rinishi: u yerda foydalanuvchi
    yozuvlari, sozlamalar jadvali va boshqa modellar ochiq turadi, xatolik
    esa darhol va qaytarilmas bo'ladi. Moderatorning ishi — kontentni
    ko'rib chiqish, shikoyatlarni hal qilish — buning uchun saytning O'Z
    interfeysi bor va u xavfsiz: har bir amal cheklangan, jurnalga
    yoziladi va orqaga qaytariladi.

    Moderatorning kontent huquqlari (`ROLE_PERMISSIONS` dagi kodlar va
    `is_staff_member` xossasi) TEGILMAYDI — o'zgargani faqat paneldagi
    eshik. Django guruhi ham joyida qoladi: `is_staff` yo'q ekan, guruh
    huquqlari panelga yo'l ochmaydi, lekin rol qaytarilsa hammasi darhol
    tiklanadi.
    """
    from .models import Role

    groups = ensure_groups()
    role = user.role

    should_be_staff = role == Role.ADMIN
    if user.is_staff != should_be_staff:
        user.is_staff = should_be_staff
        if save:
            user.save(update_fields=["is_staff"])

    if not user.pk:
        return

    # Rol guruhlarini almashtiramiz, qolgan guruhlarga tegmaymiz —
    # administrator qo'lda yaratgan guruhlar joyida qoladi.
    managed = {groups[MODERATOR_GROUP], groups[SETTER_GROUP]}
    user.groups.remove(*managed)
    if role == Role.MODERATOR:
        user.groups.add(groups[MODERATOR_GROUP])
    elif role == Role.SETTER:
        user.groups.add(groups[SETTER_GROUP])
