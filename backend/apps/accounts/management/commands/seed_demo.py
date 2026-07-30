"""Saralangan demo ma'lumotlar.

Masalalar **haqiqiy**: matni, cheklovlari va etalon yechimi bor. Yashirin
testlarning kutilgan javobi to'qib chiqarilmaydi, balki etalon yechimni judge
orqali ishga tushirib olinadi. Seed oxirida har bir masala yana tekshiriladi —
etalon yechim barcha testlardan o'tishi shart, aks holda seed to'xtaydi.

Submissionlar ham soxta emas: ular haqiqatan judge'dan o'tkaziladi, shuning
uchun statuslar, test natijalari va hisoblagichlar o'zaro mos bo'ladi.

Ishlatish:
    python manage.py seed_demo --reset
    python manage.py seed_demo --reset --users 24 --submissions 120
"""
from __future__ import annotations

import datetime
import random

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Follow, Role, User
from apps.community.models import Group, GroupMember
from apps.content.models import Comment, Discussion
from apps.contests.models import Contest, ContestParticipant, ContestProblem, ContestStatus
from apps.core.utils import unique_slug
from apps.judge import engine
from apps.judge.models import Submission, SubmissionStatus, SubmissionTestResult
from apps.core import site_settings
from apps.moderation.models import Announcement, AuditLog, SiteSetting
from apps.problems.models import (
    DEFAULT_POINTS, DailyChallenge, Problem, ProblemStatus, SolvedProblem, Tag, TestCase,
)
from apps.problems.contest_seed_data import CONTEST_PROBLEMS
from apps.problems.seed_data import PROBLEMS, TAG_DEFINITIONS

FIRST_NAMES = ["Abror", "Malika", "Jasur", "Dilnoza", "Sardor", "Nilufar", "Bekzod", "Kamola",
               "Otabek", "Zilola", "Aziz", "Gulnora", "Shohruh", "Madina", "Temur", "Sevara",
               "Rustam", "Feruza", "Doniyor", "Nodira", "Ulugbek", "Shahnoza", "Islom", "Zarina"]
LAST_NAMES = ["Karimov", "Yusupova", "Rahimov", "Ismoilova", "Tursunov", "Ergasheva",
              "Nazarov", "Alimova", "Sobirov", "Xolmatova", "Qodirov", "Saidova"]

BIOS = [
    "Backend dasturchi. Algoritmlar va tizim dizayni bilan qiziqaman.",
    "TATU talabasi. Har kuni kamida bitta masala yechishga harakat qilaman.",
    "Frontend'dan boshlab algoritmlarga o'tdim. Graf masalalari yoqadi.",
    "Olimpiada dasturlashi bilan maktabdan beri shug'ullanaman.",
    "Data engineer. Python va SQL kundalik ishimda.",
    "",
]

# Etalon yechimni "buzadigan" o'zgartirishlar — haqiqiy xato statuslarini olish uchun
BROKEN_VARIANTS = [
    ("wrong", lambda code: code + "\nprint(0)\n"),
    ("tle", lambda code: code + "\nwhile True:\n    pass\n"),
    ("runtime", lambda code: code + "\nraise ValueError('kutilmagan holat')\n"),
    ("compile", lambda code: code + "\ndef broken(:\n    pass\n"),
]


DISCUSSIONS = [
    ("Bu masalani O(n) da yechish mumkinmi?",
     "Ikki tsikl bilan yozdim, katta testlarda TLE. Xesh-jadval bilan bo'ladimi?"),
    ("Test 7 da xato — qayerda adashdim?",
     "Namuna testlar o'tyapti, lekin 7-testda yiqilyapti. Chegaraviy holat bormi?"),
    ("C++ da cin sekin ishlayaptimi?",
     "`ios::sync_with_stdio(false)` yordam berdi. Boshqa maslahat bormi?"),
    ("Kadane algoritmini tushunmadim",
     "Nega `max(value, best + value)` deb yoziladi? `best` manfiy bo'lsa nima bo'ladi?"),
    ("BFS va DFS orasidagi farq nima?",
     "Orollar masalasida ikkalasi ham ishladi. Qaysi biri afzalroq?"),
]

COMMENTS = [
    "Xesh-jadvaldan foydalaning — bitta yurishda O(n) bo'ladi.",
    "Menda ham shunday edi. Bo'sh massiv holatini tekshirib ko'ring.",
    "Rahmat, aynan shu yordam berdi!",
    "Editorial'ni o'qing, u yerda batafsil tushuntirilgan.",
    "Chiqishda ortiqcha bo'shliq qolgan bo'lishi mumkin.",
]


class Command(BaseCommand):
    help = "Saralangan demo ma'lumotlarni yaratadi (masalalar judge orqali tekshiriladi)"

    def add_arguments(self, parser):
        parser.add_argument("--users", type=int, default=24)
        parser.add_argument("--submissions", type=int, default=110)
        parser.add_argument("--reset", action="store_true", help="Avval hamma ma'lumotni o'chirish")
        parser.add_argument(
            "--skip-verify", action="store_true",
            help="Etalon yechimlarni judge orqali tekshirmaslik",
        )

    def handle(self, *args, **options):
        random.seed(20260728)

        verify = not options["skip_verify"]
        if verify and engine.active_backend() == engine.BACKEND_NONE:
            raise CommandError(
                "Judge ishlamayapti — testlarning kutilgan javobini hisoblab bo'lmaydi.\n"
                "Judge0 ni ishga tushiring, LOCAL_JUDGE_ENABLED=True qiling "
                "yoki --skip-verify bilan ishlating."
            )

        if options["reset"]:
            self._reset()

        with transaction.atomic():
            admin, moderator = self._create_staff()
            tags = self._create_tags()
            users = self._create_users(options["users"])
            self._create_follows([*users, admin, moderator])

        problems = self._create_problems(PROBLEMS, tags, admin, verify=verify)
        contest_problems = self._create_problems(
            CONTEST_PROBLEMS, tags, admin, verify=verify
        )

        with transaction.atomic():
            self._create_daily(problems)
            self._create_contests(contest_problems, users, admin)
            self._create_content(users, problems, admin)
            self._create_groups(users)
            self._create_settings()
            self._create_audit(admin)

        self._create_submissions(options["submissions"], users, problems)

        with transaction.atomic():
            self._create_plagiarism()
            self._recount()

        self.stdout.write(self.style.SUCCESS("\nDemo ma'lumotlar tayyor."))
        self.stdout.write(f"  Judge backend: {engine.active_backend()}")
        self.stdout.write("  Admin:         admin / admin12345")
        self.stdout.write("  Moderator:     moderator / moder12345")
        self.stdout.write("  Foydalanuvchi: aziz / user12345")
        self.stdout.write(
            f"  Masalalar: {Problem.objects.count()}, "
            f"testlar: {TestCase.objects.count()}, "
            f"foydalanuvchilar: {User.objects.count()}, "
            f"submissionlar: {Submission.objects.count()}"
        )

    # ------------------------------------------------------------------ reset
    def _reset(self):
        self.stdout.write("Baza tozalanmoqda...")
        from apps.moderation.models import PlagiarismPair
        from apps.notifications.models import Notification

        for model in (
            SubmissionTestResult, PlagiarismPair, Submission, SolvedProblem, DailyChallenge,
            TestCase, ContestParticipant, ContestProblem, Contest, Comment, Discussion,
            GroupMember, Group, Follow, Notification, AuditLog, Announcement,
            SiteSetting, Problem, Tag, User,
        ):
            # `SoftDeleteModel` uchun `objects.delete()` faqat `deleted_at` ni
            # belgilaydi — qatorlar bazada qolib, unique slug'larni band qiladi.
            # Shuning uchun bu yerda haqiqiy o'chirish kerak.
            manager = getattr(model, "all_objects", model.objects)
            queryset = manager.all()
            if hasattr(queryset, "hard_delete"):
                queryset.hard_delete()
            else:
                queryset.delete()

    # ----------------------------------------------------------------- xodim
    def _create_staff(self) -> tuple[User, User]:
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@codearena.uz", "role": Role.ADMIN, "is_staff": True,
                "is_superuser": True, "is_email_verified": True,
                "full_name": "Bosh administrator", "country": "UZ",
                "bio": "Platformani boshqaraman.", "rating": 2100,
            },
        )
        if created:
            admin.set_password("admin12345")
            admin.save()

        moderator, created = User.objects.get_or_create(
            username="moderator",
            defaults={
                "email": "moderator@codearena.uz", "role": Role.MODERATOR,
                "is_email_verified": True, "full_name": "Kontent moderatori",
                "country": "UZ", "bio": "Masalalar va muhokamalarni ko'rib chiqaman.",
                "rating": 1780,
            },
        )
        if created:
            moderator.set_password("moder12345")
            moderator.save()
        return admin, moderator

    def _create_tags(self) -> dict[str, Tag]:
        rows = {}
        for slug, name_uz, name_en, color in TAG_DEFINITIONS:
            tag, _ = Tag.objects.get_or_create(
                slug=slug, defaults={"name_uz": name_uz, "name_en": name_en, "color": color},
            )
            rows[slug] = tag
        return rows

    def _create_users(self, count: int) -> list[User]:
        # Birinchi uchtasi taxmin qilinadigan login bilan — demo uchun qulay
        fixed = [("aziz", "Aziz Karimov"), ("malika", "Malika Yusupova"), ("jasur", "Jasur Rahimov")]
        created: list[User] = []
        used = set(User.objects.values_list("username", flat=True))

        for index in range(count):
            if index < len(fixed):
                username, full_name = fixed[index]
            else:
                first = random.choice(FIRST_NAMES)
                last = random.choice(LAST_NAMES)
                username = f"{first.lower()}{random.randint(10, 999)}"
                full_name = f"{first} {last}"
            if username in used:
                continue
            used.add(username)

            user = User(
                username=username,
                email=f"{username}@example.uz",
                full_name=full_name,
                role=Role.USER,
                locale=random.choice(["uz", "uz", "uz", "en"]),
                country=random.choice(["UZ", "UZ", "UZ", "UZ", "KZ", "KG", "RU"]),
                bio=random.choice(BIOS),
                rating=random.randint(1100, 2200),
                is_email_verified=random.random() > 0.15,
                created_at=timezone.now() - datetime.timedelta(days=random.randint(5, 500)),
            )
            user.max_rating = user.rating + random.randint(0, 120)
            user.set_password("user12345")
            created.append(user)

        User.objects.bulk_create(created)
        return list(User.objects.filter(role=Role.USER).order_by("created_at"))

    def _create_follows(self, users: list[User]) -> None:
        """Har bir foydalanuvchi bir nechta odamga obuna bo'ladi."""
        if len(users) < 3:
            return
        links = []
        for user in users:
            others = [other for other in users if other.pk != user.pk]
            for target in random.sample(others, k=min(len(others), random.randint(2, 6))):
                links.append(Follow(follower=user, following=target))
        Follow.objects.bulk_create(links, ignore_conflicts=True)

    # --------------------------------------------------------------- masala
    def _create_problems(self, specs, tags, author, *, verify: bool) -> list[Problem]:
        rows: list[Problem] = []
        for spec in specs:
            problem = Problem.objects.filter(slug=spec.slug).first()
            if problem:
                rows.append(problem)
                continue

            self.stdout.write(f"  · {spec.title_uz}")
            problem = Problem.objects.create(
                slug=spec.slug,
                title_uz=spec.title_uz,
                title_en=spec.title_en,
                difficulty=spec.difficulty,
                points=spec.points or DEFAULT_POINTS[spec.difficulty],
                status=ProblemStatus.PUBLISHED,
                is_contest_only=spec.is_contest_only,
                description_uz=spec.description_uz,
                description_en=spec.description_en,
                constraints_uz=spec.constraints_uz,
                constraints_en=spec.constraints_en,
                hint_uz=spec.hint_uz,
                hint_en=spec.hint_en,
                editorial_uz=spec.editorial_uz,
                editorial_en=spec.editorial_en,
                starter_code_python=spec.starter["python"],
                starter_code_javascript=spec.starter["javascript"],
                starter_code_cpp=spec.starter["cpp"],
                solution_code_python=spec.solution_python,
                time_limit_ms=spec.time_limit_ms,
                author=author,
                published_at=timezone.now() - datetime.timedelta(days=random.randint(10, 240)),
            )
            problem.tags.set([tags[slug] for slug in spec.tags if slug in tags])

            self._create_test_cases(problem, spec, verify=verify)
            rows.append(problem)

        return rows

    def _create_test_cases(self, problem: Problem, spec, *, verify: bool) -> None:
        cases = [
            TestCase(
                problem=problem, order=index, input=sample_input,
                expected_output=expected, is_sample=True, explanation_uz=explanation,
            )
            for index, (sample_input, expected, explanation) in enumerate(spec.samples)
        ]

        if spec.hidden_inputs and verify:
            # Kutilgan javob etalon yechimdan olinadi — qo'lda yozilgani masala
            # matniga mos kelmay qolishi mumkin edi.
            _, results = engine.execute(
                language="python",
                code=spec.solution_python,
                cases=[{"input": item, "expected_output": None} for item in spec.hidden_inputs],
                time_limit_ms=max(spec.time_limit_ms, 6000),
                memory_limit_kb=problem.memory_limit_kb,
            )
            for offset, (raw_input, result) in enumerate(zip(spec.hidden_inputs, results)):
                if result.status != "ACCEPTED":
                    raise CommandError(
                        f"«{spec.title_uz}» etalon yechimi yashirin testda yiqildi "
                        f"({result.status}): {result.stderr or result.message}"
                    )
                cases.append(
                    TestCase(
                        problem=problem, order=len(spec.samples) + offset,
                        input=raw_input, expected_output=result.stdout.strip(),
                        is_sample=False,
                    )
                )
        elif spec.hidden_inputs:
            self.stdout.write(
                self.style.WARNING("    yashirin testlar o'tkazib yuborildi (--skip-verify)")
            )

        TestCase.objects.bulk_create(cases)

        if verify:
            self._verify(problem, spec)

    def _verify(self, problem: Problem, spec) -> None:
        """Etalon yechim BARCHA testlardan o'tishini tasdiqlaydi."""
        all_cases = list(problem.test_cases.order_by("order"))
        _, results = engine.execute(
            language="python",
            code=spec.solution_python,
            cases=[{"input": tc.input, "expected_output": tc.expected_output} for tc in all_cases],
            time_limit_ms=max(spec.time_limit_ms, 6000),
            memory_limit_kb=problem.memory_limit_kb,
        )
        for index, result in enumerate(results, start=1):
            if result.status == "ACCEPTED":
                continue
            raise CommandError(
                f"«{spec.title_uz}» tekshiruvdan o'tmadi: {index}-test {result.status}\n"
                f"    kutilgan: {all_cases[index - 1].expected_output!r}\n"
                f"    olingan:  {result.stdout.strip()!r}\n"
                f"    {result.stderr or result.compile_output or result.message}"
            )

    # ---------------------------------------------------------- submissionlar
    def _create_submissions(self, count: int, users: list[User], problems: list[Problem]) -> None:
        """Haqiqiy submissionlar — har biri judge'dan o'tkaziladi."""
        if not users or not problems:
            return

        from apps.judge.tasks import judge_submission

        self.stdout.write(f"Submissionlar tekshirilmoqda ({count} ta)...")
        specs = {spec.slug: spec for spec in [*PROBLEMS, *CONTEST_PROBLEMS]}

        for index in range(count):
            user = random.choice(users)
            problem = random.choice(problems)
            spec = specs.get(problem.slug)
            if spec is None:
                continue

            # 60% to'g'ri yechim, qolgani — ataylab buzilgan variantlar
            if random.random() < 0.6:
                code = spec.solution_python
            else:
                _, mutate = random.choice(BROKEN_VARIANTS)
                code = mutate(spec.solution_python)

            created = timezone.now() - datetime.timedelta(
                days=random.randint(0, 60), hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )
            submission = Submission.objects.create(
                user=user, problem=problem, language="python", code=code,
                ip_address=f"92.63.{random.randint(0, 40)}.{random.randint(1, 254)}",
            )
            Submission.objects.filter(pk=submission.pk).update(created_at=created)
            judge_submission(str(submission.id))

            if (index + 1) % 25 == 0:
                self.stdout.write(f"  {index + 1}/{count}")

    def _recount(self) -> None:
        """Hisoblagichlarni haqiqiy qatorlar bo'yicha qayta hisoblaydi."""
        for user in User.objects.all():
            solved = list(SolvedProblem.objects.filter(user=user))
            User.objects.filter(pk=user.pk).update(
                problems_solved=len(solved),
                total_points=sum(row.points_awarded for row in solved),
                submissions_count=Submission.objects.filter(user=user).count(),
                followers_count=Follow.objects.filter(following=user).count(),
                following_count=Follow.objects.filter(follower=user).count(),
                contests_participated=ContestParticipant.objects.filter(user=user).count(),
            )

        for problem in Problem.objects.all():
            submissions = Submission.objects.filter(problem=problem)
            Problem.objects.filter(pk=problem.pk).update(
                total_submissions=submissions.count(),
                accepted_submissions=submissions.filter(status=SubmissionStatus.ACCEPTED).count(),
            )

    # ------------------------------------------------------------ kunlik masala
    def _create_daily(self, problems: list[Problem]) -> None:
        if not problems:
            return
        today = timezone.localdate()
        for offset in range(-21, 8):
            date = today + datetime.timedelta(days=offset)
            if DailyChallenge.objects.filter(date=date).exists():
                continue
            DailyChallenge.objects.create(
                problem=problems[(offset + 21) % len(problems)], date=date, bonus_points=5
            )

    # --------------------------------------------------------------- contest
    def _create_contests(self, problems: list[Problem], users: list[User], admin: User) -> None:
        if len(problems) < 4 or not users:
            return
        now = timezone.now()
        specs = [
            ("CodeArena Haftalik Raund #12", "CodeArena Weekly Round #12",
             now - datetime.timedelta(days=6), ContestStatus.FINISHED),
            ("Yangi boshlovchilar raundi", "Beginner Round",
             now - datetime.timedelta(minutes=30), ContestStatus.RUNNING),
            ("Bahorgi Kubok 2026", "Spring Cup 2026",
             now + datetime.timedelta(days=5), ContestStatus.SCHEDULED),
        ]

        for title_uz, title_en, start, contest_status in specs:
            if Contest.objects.filter(title_uz=title_uz).exists():
                continue
            duration = 120
            contest = Contest.objects.create(
                slug=unique_slug(Contest, title_en, max_length=120),
                title_uz=title_uz, title_en=title_en,
                description_uz="Reytingli musobaqa. Ballar yechilgan masalalar va vaqtga qarab beriladi.",
                description_en="A rated contest. Points depend on solved problems and time.",
                start_time=start,
                end_time=start + datetime.timedelta(minutes=duration),
                duration_minutes=duration,
                status=contest_status, is_rated=True, created_by=admin,
            )
            for index, problem in enumerate(problems[:5]):
                ContestProblem.objects.create(
                    contest=contest, problem=problem, order=index,
                    label=chr(65 + index), points=(index + 1) * 100,
                )

            if contest_status == ContestStatus.FINISHED:
                participants = random.sample(users, k=min(len(users), 15))
                scored = sorted(
                    ((user, random.randint(0, 500)) for user in participants),
                    key=lambda pair: pair[1], reverse=True,
                )
                for rank, (user, score) in enumerate(scored, start=1):
                    change = max(-90, min(120, int((len(scored) / 2 - rank) * 12)))
                    ContestParticipant.objects.create(
                        contest=contest, user=user, rank=rank, score=score,
                        penalty=random.randint(0, 240),
                        solved_count=min(5, score // 100),
                        rating_before=user.rating,
                        rating_after=user.rating + change,
                        rating_change=change,
                    )
            elif contest_status == ContestStatus.RUNNING:
                for user in random.sample(users, k=min(len(users), 8)):
                    ContestParticipant.objects.create(contest=contest, user=user)

    # --------------------------------------------------------------- kontent
    def _create_content(self, users: list[User], problems: list[Problem], admin: User) -> None:
        if not users or not problems:
            return

        for index, (title, body) in enumerate(DISCUSSIONS):
            if Discussion.objects.filter(title=title).exists():
                continue
            discussion = Discussion.objects.create(
                author=random.choice(users),
                title=title, body_md=body,
                upvotes=random.randint(0, 42),
                views=random.randint(20, 700),
            )
            for _ in range(random.randint(1, 3)):
                Comment.objects.create(
                    discussion=discussion, author=random.choice(users),
                    body_md=random.choice(COMMENTS), upvotes=random.randint(0, 18),
                )
            discussion.comment_count = discussion.comments.count()
            discussion.save(update_fields=["comment_count"])

        # Masala ostidagi izohlar — muhokamalardan alohida oqim
        for index, problem in enumerate(problems[:8]):
            if Comment.objects.filter(problem=problem).exists():
                continue
            for _ in range(random.randint(1, 4)):
                Comment.objects.create(
                    problem=problem, author=random.choice(users),
                    body_md=random.choice(COMMENTS), upvotes=random.randint(0, 12),
                )

    def _create_groups(self, users: list[User]) -> None:
        if len(users) < 4:
            return
        for name, description in [
            ("TATU Algoritm klubi", "Haftalik mashg'ulotlar va ichki reyting."),
            ("Najot Ta'lim CP", "Olimpiada dasturlashiga tayyorgarlik guruhi."),
            ("IT Park Mentors", "Mentorlar va o'quvchilar hamjamiyati."),
        ]:
            if Group.objects.filter(name=name).exists():
                continue
            owner = random.choice(users)
            group = Group.objects.create(
                name=name, slug=unique_slug(Group, name, max_length=90),
                description=description, owner=owner, is_verified=True,
            )
            members = random.sample(users, k=min(len(users), random.randint(5, 12)))
            if owner not in members:
                members.append(owner)
            GroupMember.objects.bulk_create(
                [
                    GroupMember(group=group, user=user, role="owner" if user == owner else "member")
                    for user in members
                ],
                ignore_conflicts=True,
            )
            group.member_count = group.members.count()
            group.save(update_fields=["member_count"])

    # ------------------------------------------------------------- plagiat
    def _create_plagiarism(self) -> None:
        from apps.moderation.models import PlagiarismPair
        from apps.moderation.similarity import matched_lines, similarity

        if PlagiarismPair.objects.exists():
            return

        # Bir xil masalani deyarli bir xil kod bilan yechganlar — haqiqiy o'xshashlik
        accepted = list(
            Submission.objects.filter(status=SubmissionStatus.ACCEPTED)
            .select_related("user", "problem").order_by("problem_id", "created_at")[:60]
        )
        created = 0
        for index in range(len(accepted) - 1):
            first, second = accepted[index], accepted[index + 1]
            if first.problem_id != second.problem_id or first.user_id == second.user_id:
                continue
            score = similarity(first.code, second.code)
            if score < 0.8:
                continue
            PlagiarismPair.objects.create(
                problem=first.problem, submission_a=first, submission_b=second,
                user_a=first.user, user_b=second.user, similarity=round(score, 4),
                language=first.language,
                same_ip=first.ip_address == second.ip_address,
                time_delta_seconds=abs(int((second.created_at - first.created_at).total_seconds())),
                matched_lines=matched_lines(first.code, second.code),
            )
            created += 1
            if created >= 6:
                break

    # -------------------------------------------------------------- sozlama
    def _create_settings(self) -> None:
        # Sozlamalar ro'yxati `apps.core.site_settings` registrida
        site_settings.sync_defaults()
        Announcement.objects.get_or_create(
            title_uz="Bahorgi Kubok 2026 — ro'yxatdan o'tish ochiq",
            defaults={
                "title_en": "Spring Cup 2026 — registration is open",
                "body_uz": "Musobaqa 5 kundan keyin boshlanadi. Ishtirok bepul.",
                "body_en": "The contest starts in 5 days. Participation is free.",
                "level": "success", "is_active": True,
            },
        )

    def _create_audit(self, admin: User) -> None:
        if AuditLog.objects.count() > 3:
            return
        for action, target_type, target_repr in [
            ("problem.publish", "Problem", "Ikki sonning yig'indisi"),
            ("problem.publish", "Problem", "Orollar soni"),
            ("contest.create", "Contest", "Bahorgi Kubok 2026"),
            ("setting.bulk_update", "SiteSetting", "3 ta"),
        ]:
            AuditLog.objects.create(
                actor=admin, action=action, target_type=target_type,
                target_repr=target_repr, ip_address="127.0.0.1", changes={"seed": True},
            )
