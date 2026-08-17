from __future__ import annotations

from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Contest, ContestStatus
from .rating import RatingRow, compute_rating_changes


@shared_task(name="apps.contests.tasks.refresh_contest_statuses")
def refresh_contest_statuses() -> str:
    now = timezone.now()
    started = Contest.objects.filter(
        status=ContestStatus.SCHEDULED, start_time__lte=now, end_time__gt=now
    ).update(status=ContestStatus.RUNNING)
    finished = Contest.objects.filter(
        status__in=[ContestStatus.SCHEDULED, ContestStatus.RUNNING], end_time__lte=now
    ).update(status=ContestStatus.FINISHED)

    # NATIJA VA REYTING O'ZI QO'LLANADI. Ilgari buning uchun admin panelda
    # ikkita tugma bosish kerak edi: musobaqa tugagach jadval ham, reyting
    # ham hech kim tugma bosmaguncha eskirib turardi va ishtirokchi «reyting
    # o'zgarishi» ustunida cheksiz «—» ko'rardi.
    #
    # Ikkalasi ZANJIRDA ketadi: reyting jadval qayta hisoblanGANDAN keyin
    # qo'llanadi. Ilgari ikkita mustaqil task edi va ikkinchi worker eski
    # rank'lar ustida reyting hisoblashi mumkin edi. `is_rated` filtri ham
    # olib tashlandi: reytingsiz musobaqaning YAKUNIY jadvali ham bir marta
    # to'liq hisoblanishi kerak (oxirgi soniyalardagi yechimlar bilan) —
    # `apply_contest_ratings` bunday musobaqada faqat «yakunlandi» belgisini
    # qo'yadi.
    settle = 0
    pending = Contest.objects.filter(
        status=ContestStatus.FINISHED,
        end_time__lte=now - timezone.timedelta(minutes=2),
        ratings_applied_at__isnull=True,
    ).values_list("id", flat=True)[:20]

    from celery import chain

    for contest_id in pending:
        chain(
            recalculate_standings.si(str(contest_id)),
            apply_contest_ratings.si(str(contest_id)),
        ).delay()
        settle += 1

    return f"started={started} finished={finished} settled={settle}"


@shared_task(name="apps.contests.tasks.send_contest_reminders")
def send_contest_reminders() -> str:
    """Boshlanishiga oz qolgan musobaqalar uchun ishtirokchilarga eslatma.

    Sozlamalardagi "Musobaqa eslatmalari" (`notify_contest`) o'chirilgan
    foydalanuvchilar chetlab o'tiladi. Xabar sayt ichidagi qo'ng'iroqqa
    yoziladi va obuna bo'lgan qurilmalarga brauzer push xabari sifatida ketadi
    (`notifications.services.notify_many`).

    Takroriy xabardan `reminder_sent_at` himoya qiladi: bayroq **oldin**
    va shartli `UPDATE` bilan qo'yiladi, shuning uchun ikkita beat bir vaqtda
    ishga tushib qolsa ham xabar bir marta ketadi.
    """
    from apps.notifications.models import NotificationKind
    from apps.notifications.services import notify_many

    now = timezone.now()
    minutes = int(getattr(settings, "CONTEST_REMINDER_MINUTES", 30))
    horizon = now + timedelta(minutes=minutes)

    # Ro'yxat darhol o'qib olinadi: quyida `reminder_sent_at` yozilgach,
    # queryset qayta hisoblansa bo'sh qaytardi.
    upcoming = list(
        Contest.objects.filter(
            start_time__gt=now, start_time__lte=horizon, reminder_sent_at__isnull=True
        ).exclude(status__in=[ContestStatus.DRAFT, ContestStatus.CANCELLED])
    )

    total = 0
    for contest in upcoming:
        claimed = Contest.objects.filter(pk=contest.pk, reminder_sent_at__isnull=True).update(
            reminder_sent_at=now
        )
        if not claimed:
            continue  # boshqa ishchi ulgurdi

        recipients = [
            participant.user
            for participant in contest.participants.select_related("user").filter(
                is_disqualified=False, user__notify_contest=True, user__is_active=True
            )
        ]
        if not recipients:
            continue

        left = max(1, int((contest.start_time - now).total_seconds() // 60))
        total += notify_many(
            recipients,
            kind=NotificationKind.CONTEST_SOON,
            level="info",
            title=f"{contest.title_uz} — {left} daqiqadan keyin",
            body="Musobaqa boshlanmoqda. Tayyor bo'ling!",
            url=f"/contests/{contest.slug}",
        )

    return f"contests={len(upcoming)} notified={total}"


@shared_task(name="apps.contests.tasks.recalculate_standings")
def recalculate_standings(contest_id: str) -> str:
    """Ballarni submissionlardan qayta hisoblab, rank'larni yangilaydi.

    Hisoblash mantig'i `standings.refresh_live_standings` bilan YAGONA —
    ilgari shu yerda nusxasi bor edi va ikkalasi sekin farqlanib ketgan.
    """
    from .standings import refresh_live_standings

    contest = Contest.objects.filter(pk=contest_id).prefetch_related("contest_problems").first()
    if not contest:
        return "not-found"

    with transaction.atomic():
        refresh_live_standings(contest)

    return f"ok:{contest.participants.count()}"


@shared_task(name="apps.contests.tasks.apply_contest_ratings")
def apply_contest_ratings(contest_id: str) -> str:
    """Contest tugagach Elo reytingini qo'llaydi (7-bo'lim)."""
    contest = Contest.objects.filter(pk=contest_id).first()
    if not contest:
        return "not-found"

    # Belgini ATOMIK bosib olamiz: beat har daqiqada qayta navbatga qo'yadi,
    # sekin birinchi ishga tushish paytida ikkinchisi kelib qolsa, reyting
    # IKKI MARTA qo'llanardi. Reytingsiz musobaqada ham belgi qo'yiladi —
    # u «jadval yakunlandi» ma'nosini beradi va qayta navbatlashni to'xtatadi.
    claimed = Contest.objects.filter(pk=contest_id, ratings_applied_at__isnull=True).update(
        ratings_applied_at=timezone.now()
    )
    if not claimed:
        return "already-applied"
    if not contest.is_rated:
        return "not-rated"

    participants = list(
        contest.participants.filter(is_disqualified=False, is_virtual=False)
        .select_related("user")
        .order_by("rank")
    )
    if len(participants) < 2:
        return "not-enough-participants"

    rows = [
        RatingRow(
            user_id=str(p.user_id),
            rating_before=p.user.rating,
            actual_rank=p.rank or index,
            contests_played=p.user.contests_participated,
        )
        for index, p in enumerate(participants, start=1)
    ]
    changes = compute_rating_changes(
        rows, k_new=contest.rating_k_new, k_experienced=contest.rating_k_experienced
    )

    from apps.accounts import rating as rating_engine

    try:
        with transaction.atomic():
            for participant in participants:
                delta = changes.get(str(participant.user_id), 0)
                user = participant.user
                before = user.rating

                # Reytingni yagona dvigatel qo'llaydi: u tarixga ham yozadi va
                # pastki chegarani ushlab turadi. Ilgari bu yerda alohida
                # hisob-kitob bor edi va o'zgarish hech qayerda saqlanmasdi.
                after = rating_engine.apply_contest(
                    user, before=before, delta=delta,
                    contest=contest, rank=participant.rank,
                )

                participant.rating_before = before
                participant.rating_change = after - before
                participant.rating_after = after
                participant.save(update_fields=["rating_before", "rating_change", "rating_after"])

                user.contests_participated += 1
                user.save(update_fields=["contests_participated"])
    except Exception:
        # Belgi qaytariladi — keyingi beat yana urinadi; aks holda reyting
        # «qo'llangan» deb belgilangan-u, aslida qo'llanmagan bo'lib qolardi.
        Contest.objects.filter(pk=contest_id).update(ratings_applied_at=None)
        raise

    return f"applied:{len(participants)}"
