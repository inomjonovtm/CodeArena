"""Admin panelning qobig'i: yon menyu, bosh sahifa va muhit nishoni.

`UNFOLD` sozlamasi shu funksiyalarga nuqtali yo'l orqali murojaat qiladi,
shuning uchun ular har bir so'rovda qayta hisoblanadi — foydalanuvchi
huquqiga qarab menyu o'zgaradi va bosh sahifadagi raqamlar tirik bo'ladi.
"""
from __future__ import annotations

from django.conf import settings
from django.urls import reverse_lazy
from django.utils import timezone


def environment_badge(request):
    """Yuqori burchakdagi muhit nishoni.

    Produksiyada nishon YO'Q: u yerda «bu qaysi server?» degan savol
    tug'ilmasligi kerak. Dev va staging esa ataylab ko'zga tashlanadi —
    ishlab chiquvchi tirik bazani sinov bazasi deb o'ylab qolmasin.
    """
    if settings.DEBUG:
        return ["Ishlab chiqish", "warning"]
    if getattr(settings, "ENVIRONMENT_NAME", "") == "staging":
        return ["Staging", "info"]
    return None


# ---------------------------------------------------------------- yon menyu
def _link(title: str, icon: str, url_name: str, permission: str | None = None) -> dict:
    """Menyu bandini yasaydi.

    `permission` — Django huquq kodi (`app_label.codename`). Berilsa, band
    faqat o'sha huquqi borlarga ko'rinadi: moderator o'zi ocholmaydigan
    bo'limni menyuda ko'rib, keyin «ruxsat yo'q» sahifasiga urilmaydi.
    """
    item = {"title": title, "icon": icon, "link": reverse_lazy(url_name)}
    if permission:
        item["permission"] = lambda request, code=permission: request.user.has_perm(code)
    return item


def sidebar_navigation(request):
    """Ish oqimi bo'yicha guruhlangan menyu.

    Tartib ataylab: kunlik ish (masalalar, yuborishlar) tepada, kamdan-kam
    ochiladigan sozlamalar pastda.
    """
    return [
        {
            "title": "Umumiy",
            "separator": False,
            "items": [
                {
                    "title": "Bosh sahifa",
                    "icon": "dashboard",
                    "link": reverse_lazy("admin:index"),
                },
                {
                    "title": "Studio — kontent tayyorlash",
                    "icon": "draw",
                    "link": "/studio",
                },
                {
                    "title": "Saytga o'tish",
                    "icon": "open_in_new",
                    "link": "/",
                },
            ],
        },
        {
            "title": "Masalalar",
            "separator": True,
            "items": [
                _link("Masalalar", "extension", "admin:problems_problem_changelist",
                      "problems.view_problem"),
                _link("Test-case'lar", "science", "admin:problems_testcase_changelist",
                      "problems.view_testcase"),
                _link("Etalon yechimlar", "code", "admin:problems_referencesolution_changelist",
                      "problems.view_referencesolution"),
                _link("Generatorlar", "terminal", "admin:problems_testgenerator_changelist",
                      "problems.view_testgenerator"),
                _link("Teglar", "sell", "admin:problems_tag_changelist", "problems.view_tag"),
                _link("Kunlik masala", "calendar_month",
                      "admin:problems_dailychallenge_changelist",
                      "problems.view_dailychallenge"),
            ],
        },
        {
            "title": "Musobaqa va judge",
            "separator": True,
            "items": [
                _link("Olimpiadalar", "trophy", "admin:contests_contest_changelist",
                      "contests.view_contest"),
                _link("Mas'ullar", "groups", "admin:contests_conteststaff_changelist",
                      "contests.view_conteststaff"),
                _link("Ishtirokchilar", "how_to_reg",
                      "admin:contests_contestparticipant_changelist",
                      "contests.view_contestparticipant"),
                _link("Yuborishlar", "send", "admin:judge_submission_changelist",
                      "judge.view_submission"),
            ],
        },
        {
            "title": "Test sinovlari",
            "separator": True,
            "items": [
                _link("Savollar", "quiz", "admin:assessments_question_changelist",
                      "assessments.view_question"),
                _link("Papkalar", "folder", "admin:assessments_questionfolder_changelist",
                      "assessments.view_questionfolder"),
                _link("Sinovlar", "assignment", "admin:assessments_quiz_changelist",
                      "assessments.view_quiz"),
                _link("Urinishlar", "history_edu",
                      "admin:assessments_quizattempt_changelist",
                      "assessments.view_quizattempt"),
            ],
        },
        {
            "title": "Foydalanuvchilar",
            "separator": True,
            "items": [
                _link("Foydalanuvchilar", "person", "admin:accounts_user_changelist",
                      "accounts.view_user"),
                _link("Huquq guruhlari", "shield_person", "admin:auth_group_changelist",
                      "auth.view_group"),
                _link("Guruhlar (jamoa)", "diversity_3", "admin:community_group_changelist",
                      "community.view_group"),
            ],
        },
        {
            "title": "Kontent va moderatsiya",
            "separator": True,
            "items": [
                _link("Muhokamalar", "forum", "admin:content_discussion_changelist",
                      "content.view_discussion"),
                _link("Izohlar", "chat", "admin:content_comment_changelist",
                      "content.view_comment"),
                _link("Shikoyatlar", "flag", "admin:content_contentreport_changelist",
                      "content.view_contentreport"),
                _link("Murojaatlar", "mail", "admin:content_contactmessage_changelist",
                      "content.view_contactmessage"),
                _link("Plagiat", "policy", "admin:moderation_plagiarismpair_changelist",
                      "moderation.view_plagiarismpair"),
                _link("E'lonlar", "campaign", "admin:moderation_announcement_changelist",
                      "moderation.view_announcement"),
            ],
        },
        {
            "title": "Tizim",
            "separator": True,
            "items": [
                _link("Sayt sozlamalari", "settings", "admin:moderation_sitesetting_changelist",
                      "moderation.view_sitesetting"),
                _link("Huquqiy sahifalar", "gavel", "admin:moderation_legaldocument_changelist",
                      "moderation.view_legaldocument"),
                _link("Audit jurnali", "receipt_long", "admin:moderation_auditlog_changelist",
                      "moderation.view_auditlog"),
                _link("Bildirishnomalar", "notifications",
                      "admin:notifications_notification_changelist",
                      "notifications.view_notification"),
            ],
        },
    ]


# --------------------------------------------------------------- bosh sahifa
def dashboard_callback(request, context):
    """Admin bosh sahifasidagi ko'rsatkichlar.

    Modellar funksiya ichida import qilinadi: sozlama fayli yuklanayotganda
    ilovalar hali tayyor emas.
    """
    from apps.accounts.models import User
    from apps.content.models import ContentReport
    from apps.contests.models import Contest
    from apps.judge.models import Submission, SubmissionStatus
    from apps.moderation.models import PlagiarismPair
    from apps.problems.models import Problem, ProblemStatus

    now = timezone.now()
    day_ago = now - timezone.timedelta(days=1)

    submissions = Submission.objects.all()
    total_subs = submissions.count()
    accepted = submissions.filter(status=SubmissionStatus.ACCEPTED).count()

    # E'tibor talab qiladigan navbatlar — ular nolga teng bo'lishi kerak.
    pending_reports = ContentReport.objects.filter(is_resolved=False).count()
    pending_plagiarism = PlagiarismPair.objects.filter(status="pending").count()
    stuck = submissions.filter(
        status__in=[SubmissionStatus.PENDING, SubmissionStatus.JUDGING]
    ).count()

    context.update({
        "kpi": [
            {
                "title": "Foydalanuvchilar",
                "metric": f"{User.objects.count():,}".replace(",", " "),
                "footer": f"+{User.objects.filter(created_at__gte=day_ago).count()} bugun",
            },
            {
                "title": "Masalalar",
                "metric": f"{Problem.objects.count()}",
                "footer": f"{Problem.objects.filter(status=ProblemStatus.PUBLISHED).count()} chop etilgan",
            },
            {
                "title": "Yuborishlar",
                "metric": f"{total_subs:,}".replace(",", " "),
                "footer": (
                    f"{round(accepted / total_subs * 100)}% qabul qilindi"
                    if total_subs else "hali yo'q"
                ),
            },
            {
                "title": "Olimpiadalar",
                "metric": f"{Contest.objects.count()}",
                "footer": f"{Contest.objects.filter(start_time__lte=now, end_time__gte=now).count()} davom etmoqda",
            },
        ],
        # Navbatlar — nolga teng bo'lmasa, kimdir ish qilishi kerak.
        "queues": [
            {
                "title": "Ochiq shikoyatlar",
                "value": pending_reports,
                "link": reverse_lazy("admin:content_contentreport_changelist") + "?is_resolved__exact=0",
            },
            {
                "title": "Tekshirilmagan plagiat",
                "value": pending_plagiarism,
                "link": reverse_lazy("admin:moderation_plagiarismpair_changelist") + "?status__exact=pending",
            },
            {
                "title": "Navbatda turgan yechimlar",
                "value": stuck,
                "link": reverse_lazy("admin:judge_submission_changelist") + "?status__exact=PENDING",
            },
        ],
    })
    return context
