"""Studio (muallif paneli) asboblari: generator, etalon yechim, stress-test.

G'oya
-----
Test-case'ning kutilgan chiqishi QO'LDA yozilmaydi. Muallif ikki narsani
beradi:

1. **Generator** — urug'dan (seed) test kirishini yasaydigan dastur;
2. **Etalon yechim** — masalani to'g'ri ishlaydigan dastur.

Tizim generatordan kirishlarni oladi, etalon yechimni o'sha kirishlarda
ishga tushiradi va chiqishini kutilgan javob sifatida saqlaydi. Foydalanuvchi
kod yuborganda AYNAN SHU testlar unga ham beriladi, natija esa masalaning
`checker_type` iga ko'ra solishtiriladi. Ya'ni «ikkalasiga ham bir xil test
yuboriladi va natijalar solishtiriladi».

«Istalgan javob» masalalarida etalonning chiqishi yagona to'g'ri javob emas —
shuning uchun solishtirishni maxsus checker bajaradi (`apps.judge.checker`).

Cheklovlar
----------
Bu amallar SINXRON bajariladi (so'rov ichida). Har bir test alohida jarayon
ishga tushirishni talab qiladi, shuning uchun sonlar qattiq cheklangan —
aks holda bitta bosish serverni daqiqalab band qilardi.
"""
from __future__ import annotations

import time
from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from apps.judge import checker as checker_mod
from apps.judge import engine

from .models import AuthoringRun, SolutionKind, TestCase

# Bitta chaqiruvda yasaladigan/tekshiriladigan testlarning eng ko'p soni.
MAX_GENERATE = 200
MAX_STRESS = 100
# Generator va etalon yechim uchun limitlar: ular foydalanuvchi kodi emas,
# shuning uchun masalaning vaqt limitidan kengroq bo'lishi mumkin.
TOOL_TIME_LIMIT_MS = 10_000
TOOL_MEMORY_LIMIT_KB = 512 * 1024
# Bitta test kirishi/chiqishi uchun saqlash chegarasi (bazani shishirmaslik).
MAX_TEST_CHARS = 200_000


class AuthoringError(Exception):
    """Muallifga ko'rsatiladigan, kutilgan xato (400 bo'lib qaytadi)."""


@dataclass
class ProgramRun:
    """Bitta dasturning bir nechta kirishdagi natijasi."""

    outputs: list[str]
    statuses: list[str]
    runtimes: list[int]
    messages: list[str]


def _execute(*, language: str, code: str, inputs: list[str],
             time_limit_ms: int, memory_limit_kb: int) -> ProgramRun:
    """Dasturni kirishlar ro'yxatida bajaradi (bitta partiyada)."""
    if not (code or "").strip():
        raise AuthoringError("Kod bo'sh.")

    backend, results = engine.execute(
        language=language,
        code=code,
        cases=[{"input": text, "expected_output": None} for text in inputs],
        time_limit_ms=time_limit_ms,
        memory_limit_kb=memory_limit_kb,
    )
    if backend == engine.BACKEND_NONE:
        raise AuthoringError(engine.NO_BACKEND_MESSAGE)

    return ProgramRun(
        outputs=[r.stdout for r in results],
        statuses=[r.status for r in results],
        runtimes=[r.runtime_ms or 0 for r in results],
        messages=[
            (r.compile_output or r.stderr or r.message or "").strip()[:600] for r in results
        ],
    )


def _first_failure(run: ProgramRun) -> tuple[int, str, str] | None:
    """Birinchi muvaffaqiyatsiz bajarilish: `(indeks, status, xabar)`."""
    for index, status_value in enumerate(run.statuses):
        if status_value != "ACCEPTED":
            return index, status_value, run.messages[index]
    return None


def primary_solution(problem):
    """Kutilgan chiqishni hisoblaydigan yechim."""
    solutions = list(problem.solutions.filter(kind=SolutionKind.MODEL))
    if not solutions:
        raise AuthoringError(
            "Etalon yechim yo'q. Avval «Yechimlar» bo'limida to'g'ri kod qo'shing."
        )
    for solution in solutions:
        if solution.is_primary:
            return solution
    return solutions[0]


def _record(problem, user, *, kind: str, status_value: str, summary: str,
            detail: dict, started: float) -> AuthoringRun:
    return AuthoringRun.objects.create(
        problem=problem,
        kind=kind,
        status=status_value,
        summary=summary[:200],
        detail=detail,
        duration_ms=int((time.perf_counter() - started) * 1000),
        created_by=user if getattr(user, "is_authenticated", False) else None,
    )


# --------------------------------------------------------------- generator
def run_generator(generator, *, count: int, seed_start: int) -> list[dict]:
    """Generatorni urug'lar bo'yicha ishga tushiradi va kirishlarni qaytaradi."""
    count = max(1, min(int(count or 1), MAX_GENERATE))
    seeds = list(range(int(seed_start or 0), int(seed_start or 0) + count))

    run = _execute(
        language=generator.language,
        code=generator.code,
        inputs=[f"{seed}\n" for seed in seeds],
        time_limit_ms=TOOL_TIME_LIMIT_MS,
        memory_limit_kb=TOOL_MEMORY_LIMIT_KB,
    )

    failure = _first_failure(run)
    if failure:
        index, status_value, message = failure
        raise AuthoringError(
            f"Generator {seeds[index]} urug'ida ishlamadi ({status_value}). {message}".strip()
        )

    rows = []
    for seed, output in zip(seeds, run.outputs, strict=True):
        text = output.strip("\n")
        if not text.strip():
            raise AuthoringError(f"Generator {seed} urug'ida bo'sh kirish qaytardi.")
        if len(text) > MAX_TEST_CHARS:
            raise AuthoringError(
                f"Generator {seed} urug'ida juda katta kirish qaytardi "
                f"({len(text)} belgi, chegara {MAX_TEST_CHARS})."
            )
        rows.append({"seed": seed, "input": text + "\n"})
    return rows


def solve_inputs(problem, solution, inputs: list[str]) -> ProgramRun:
    """Yechimni berilgan kirishlarda ishga tushiradi.

    Vaqt limiti masalanikidan kengroq: etalon yechim Pythonda yozilgan
    bo'lsa ham «juda sekin» deb hisoblanmasligi kerak.
    """
    return _execute(
        language=solution.language,
        code=solution.code,
        inputs=inputs,
        time_limit_ms=max(problem.time_limit_ms * 3, TOOL_TIME_LIMIT_MS),
        memory_limit_kb=max(problem.memory_limit_kb, TOOL_MEMORY_LIMIT_KB),
    )


def validate_inputs(problem, inputs: list[str]) -> list[str]:
    """Validator dasturi orqali test KIRISHLARINI tekshiradi.

    Validator kirishni `stdin` dan oladi va nol kod bilan tugasa — kirish
    to'g'ri. Xato bo'lsa, sababni `stderr` yoki `stdout` ga yozadi.

    Validator sozlanmagan bo'lsa hech narsa qilinmaydi: bu ixtiyoriy
    xavfsizlik to'ri, majburiy bosqich emas.

    Qaytadi: xato xabarlari ro'yxati (bo'sh bo'lsa hammasi joyida).
    """
    code = (getattr(problem, "validator_code", "") or "").strip()
    if not code or not inputs:
        return []

    run = _execute(
        language=getattr(problem, "validator_language", "python") or "python",
        code=code,
        inputs=inputs,
        time_limit_ms=TOOL_TIME_LIMIT_MS,
        memory_limit_kb=TOOL_MEMORY_LIMIT_KB,
    )

    problems_found = []
    for index, status_value in enumerate(run.statuses):
        if status_value == "ACCEPTED":
            continue
        if status_value == "COMPILE_ERROR":
            return [f"Validator kompilyatsiya qilinmadi: {run.messages[index]}"]
        detail = (run.outputs[index].strip() or run.messages[index] or status_value)[:200]
        problems_found.append(f"{index + 1}-kirish validatordan o'tmadi: {detail}")
    return problems_found


@transaction.atomic
def generate_tests(problem, generator, *, count: int, seed_start: int,
                   replace: bool, user) -> AuthoringRun:
    """Generator + validator + etalon yechim → tayyor test-case'lar."""
    started = time.perf_counter()
    solution = primary_solution(problem)

    rows = run_generator(generator, count=count, seed_start=seed_start)
    inputs = [row["input"] for row in rows]

    # Validator sozlangan bo'lsa, NOTO'G'RI kirish bazaga umuman tushmaydi.
    invalid = validate_inputs(problem, inputs)
    if invalid:
        raise AuthoringError(
            "Generator masala shartlariga mos kelmaydigan kirish yasadi:\n"
            + "\n".join(invalid[:5])
        )

    run = solve_inputs(problem, solution, inputs)

    failure = _first_failure(run)
    if failure:
        index, status_value, message = failure
        raise AuthoringError(
            f"Etalon yechim {rows[index]['seed']} urug'idagi testda ishlamadi "
            f"({status_value}). {message}".strip()
        )

    if replace:
        # Faqat SHU generator yasagan testlar o'chadi — qo'lda yozilgan
        # namunalarga tegilmaydi.
        problem.test_cases.filter(generator=generator).delete()

    next_order = (
        problem.test_cases.order_by("-order").values_list("order", flat=True).first() or 0
    ) + 1

    created = []
    for offset, (row, output) in enumerate(zip(rows, run.outputs, strict=True)):
        created.append(
            TestCase(
                problem=problem,
                order=next_order + offset,
                input=row["input"],
                expected_output=output.strip("\n") + "\n" if output.strip() else "",
                is_sample=generator.make_sample,
                source="generated",
                generator=generator,
                seed=row["seed"],
            )
        )
    TestCase.objects.bulk_create(created)

    generator.last_run_at = timezone.now()
    generator.last_message = f"{len(created)} ta test yasaldi."
    generator.save(update_fields=["last_run_at", "last_message", "updated_at"])

    return _record(
        problem, user,
        kind=AuthoringRun.Kind.GENERATE,
        status_value=AuthoringRun.Status.OK,
        summary=f"{len(created)} ta test yasaldi ({generator.name}).",
        detail={
            "generator": generator.name,
            "solution": solution.name,
            "created": len(created),
            "replaced": bool(replace),
            "seeds": [row["seed"] for row in rows][:50],
            "max_runtime_ms": max(run.runtimes or [0]),
            "preview": [
                {"seed": rows[i]["seed"],
                 "input": rows[i]["input"][:500],
                 "output": run.outputs[i][:500]}
                for i in range(min(3, len(rows)))
            ],
        },
        started=started,
    )


# ------------------------------------------------- kutilgan chiqishni qayta hisoblash
@transaction.atomic
def fill_expected(problem, *, user, only_empty: bool = False) -> AuthoringRun:
    """Mavjud testlarning kutilgan chiqishini etalon yechimdan qayta hisoblaydi.

    Masala sharti o'zgargandan keyin (masalan chiqish formati) barcha
    javoblarni qo'lda tuzatish o'rniga shu tugma bosiladi.
    """
    started = time.perf_counter()
    solution = primary_solution(problem)

    cases = list(problem.test_cases.order_by("order"))
    if only_empty:
        cases = [tc for tc in cases if not (tc.expected_output or "").strip()]
    if not cases:
        raise AuthoringError("Yangilanadigan test topilmadi.")
    if len(cases) > MAX_GENERATE:
        raise AuthoringError(
            f"Bir chaqiruvda {MAX_GENERATE} tagacha test qayta hisoblanadi "
            f"(hozir {len(cases)} ta). Testlarni bo'lib-bo'lib yangilang."
        )

    run = solve_inputs(problem, solution, [tc.input for tc in cases])
    failure = _first_failure(run)
    if failure:
        index, status_value, message = failure
        raise AuthoringError(
            f"Etalon yechim {index + 1}-testda ishlamadi ({status_value}). {message}".strip()
        )

    changed = []
    for tc, output in zip(cases, run.outputs, strict=True):
        new_value = output.strip("\n") + "\n" if output.strip() else ""
        if new_value != tc.expected_output:
            tc.expected_output = new_value
            changed.append(tc)
    TestCase.objects.bulk_update(changed, ["expected_output"])

    return _record(
        problem, user,
        kind=AuthoringRun.Kind.GENERATE,
        status_value=AuthoringRun.Status.OK,
        summary=f"{len(changed)} ta testning javobi yangilandi ({len(cases)} tekshirildi).",
        detail={
            "solution": solution.name,
            "checked": len(cases),
            "changed": len(changed),
            "max_runtime_ms": max(run.runtimes or [0]),
        },
        started=started,
    )


# ------------------------------------------------------------------ tekshiruv
# Yechim turi → undan KUTILADIGAN natija. Tekshiruv shu jadvalga qarab
# «kutilgandek» yoki «kutilmagan» degan xulosa chiqaradi.
EXPECTATION = {
    SolutionKind.MODEL: "Barcha testlardan o'tishi kerak",
    SolutionKind.BRUTE: "Barcha testlardan o'tishi kerak (sekin bo'lsa ham)",
    SolutionKind.SLOW: "Kamida bitta testda vaqt limitiga urilishi kerak",
    SolutionKind.WRONG: "Kamida bitta testda yiqilishi kerak",
}


def _verdict_matches(kind: str, statuses: list[str]) -> bool:
    passed = all(s == "ACCEPTED" for s in statuses)
    if kind in {SolutionKind.MODEL, SolutionKind.BRUTE}:
        return passed
    if kind == SolutionKind.SLOW:
        return any(s == "TIME_LIMIT_EXCEEDED" for s in statuses)
    if kind == SolutionKind.WRONG:
        return not passed
    return passed


def validate_solutions(problem, *, user, solution_ids: list[str] | None = None) -> AuthoringRun:
    """Har bir yechimni barcha testlarda ishlatib, kutilgan natijani tekshiradi.

    Bu masalaning «sifat nazorati»: etalon o'tishi, ataylab noto'g'ri yechim
    esa YIQILISHI kerak. Ikkinchisi testlar to'plami kuchli ekanini isbotlaydi —
    aks holda masala «hamma narsani qabul qiladigan» bo'lib qolganini hech kim
    sezmasdi.
    """
    started = time.perf_counter()
    cases = list(problem.test_cases.order_by("order"))
    if not cases:
        raise AuthoringError("Masalada test yo'q.")
    if len(cases) > MAX_GENERATE:
        raise AuthoringError(f"Tekshiruv {MAX_GENERATE} tagacha testda ishlaydi.")

    solutions = list(problem.solutions.all())
    if solution_ids:
        solutions = [s for s in solutions if str(s.pk) in {str(i) for i in solution_ids}]
    if not solutions:
        raise AuthoringError("Tekshiriladigan yechim yo'q.")

    inputs = [tc.input for tc in cases]
    reports = []
    all_ok = True

    for solution in solutions:
        run = _execute(
            language=solution.language,
            code=solution.code,
            # Bu yerda MASALANING limiti qo'llanadi: «sekin yechim TLE
            # bo'ladimi» degan savolga faqat shu limit javob beradi.
            inputs=inputs,
            time_limit_ms=problem.time_limit_ms,
            memory_limit_kb=problem.memory_limit_kb,
        )

        statuses = list(run.statuses)
        # Bajarilgan testlarni checker orqali o'tkazamiz — javob mazmuni
        # faqat shu yerda baholanadi.
        runnable = [i for i, s in enumerate(statuses) if s == "ACCEPTED"]
        notes: dict[int, str] = {}
        if runnable:
            verdicts = checker_mod.check_many(
                problem,
                [
                    {"input": cases[i].input, "expected": cases[i].expected_output,
                     "actual": run.outputs[i]}
                    for i in runnable
                ],
            )
            for i, verdict in zip(runnable, verdicts, strict=True):
                if verdict.message:
                    notes[i] = verdict.message
                if not verdict.ok:
                    statuses[i] = "SYSTEM_ERROR" if verdict.system_error else "WRONG_ANSWER"

        first_bad = next((i for i, s in enumerate(statuses) if s != "ACCEPTED"), None)
        matched = _verdict_matches(solution.kind, statuses)
        all_ok = all_ok and matched

        verdict_label = "ACCEPTED" if first_bad is None else statuses[first_bad]
        solution.last_verdict = verdict_label
        solution.last_checked_at = timezone.now()
        solution.last_runtime_ms = max(run.runtimes or [0])
        solution.last_message = (
            "" if matched else f"Kutilgani: {EXPECTATION.get(solution.kind, '')}"
        )
        solution.save(update_fields=[
            "last_verdict", "last_checked_at", "last_runtime_ms", "last_message", "updated_at",
        ])

        reports.append({
            "id": str(solution.pk),
            "name": solution.name,
            "kind": solution.kind,
            "language": solution.language,
            "verdict": verdict_label,
            "as_expected": matched,
            "expectation": EXPECTATION.get(solution.kind, ""),
            "passed": sum(1 for s in statuses if s == "ACCEPTED"),
            "total": len(statuses),
            "failed_test": None if first_bad is None else first_bad + 1,
            "max_runtime_ms": max(run.runtimes or [0]),
            "note": (notes.get(first_bad) if first_bad is not None else "")
                    or (run.messages[first_bad] if first_bad is not None else ""),
        })

    summary = (
        f"{len(reports)} ta yechim tekshirildi — hammasi kutilgandek."
        if all_ok
        else f"{sum(1 for r in reports if not r['as_expected'])} ta yechim kutilgandek ishlamadi."
    )
    return _record(
        problem, user,
        kind=AuthoringRun.Kind.VALIDATE,
        status_value=AuthoringRun.Status.OK if all_ok else AuthoringRun.Status.FAILED,
        summary=summary,
        detail={"tests": len(cases), "solutions": reports},
        started=started,
    )


# --------------------------------------------------------------- stress-test
def stress_test(problem, *, user, generator, model, brute,
                iterations: int, seed_start: int, save_counterexample: bool) -> AuthoringRun:
    """Etalonni sodda yechimga qarshi qo'yib, farq qiladigan testni izlaydi.

    Sodda yechim (`brute`) sekin, lekin aniq to'g'ri deb qabul qilinadi. Agar
    etalon undan farq qilsa — kamchilik etalonda yoki masala shartida. Bu
    masala chop etilgunga qadar topilishi kerak bo'lgan xato turi.
    """
    started = time.perf_counter()
    iterations = max(1, min(int(iterations or 10), MAX_STRESS))

    rows = run_generator(generator, count=iterations, seed_start=seed_start)
    inputs = [row["input"] for row in rows]

    model_run = solve_inputs(problem, model, inputs)
    brute_run = solve_inputs(problem, brute, inputs)

    for label, run in (("Etalon", model_run), ("Sodda yechim", brute_run)):
        failure = _first_failure(run)
        if failure:
            index, status_value, message = failure
            raise AuthoringError(
                f"{label} {rows[index]['seed']} urug'ida ishlamadi ({status_value}). {message}".strip()
            )

    # Solishtirish checker orqali: «istalgan javob» masalasida ikki xil,
    # lekin ikkalasi ham to'g'ri javob farq deb hisoblanmasligi kerak.
    verdicts = checker_mod.check_many(
        problem,
        [
            {"input": inputs[i], "expected": brute_run.outputs[i], "actual": model_run.outputs[i]}
            for i in range(len(rows))
        ],
    )

    bad = next((i for i, v in enumerate(verdicts) if not v.ok), None)
    detail = {
        "generator": generator.name,
        "model": model.name,
        "brute": brute.name,
        "iterations": len(rows),
        "seed_start": rows[0]["seed"] if rows else seed_start,
        "max_runtime_ms": max([*model_run.runtimes, *brute_run.runtimes] or [0]),
    }

    if bad is None:
        return _record(
            problem, user,
            kind=AuthoringRun.Kind.STRESS,
            status_value=AuthoringRun.Status.OK,
            summary=f"{len(rows)} ta tasodifiy testda farq topilmadi.",
            detail=detail,
            started=started,
        )

    counterexample = {
        "seed": rows[bad]["seed"],
        "input": inputs[bad][:MAX_TEST_CHARS],
        "model_output": model_run.outputs[bad][:5000],
        "brute_output": brute_run.outputs[bad][:5000],
        "note": verdicts[bad].message,
    }
    detail["counterexample"] = counterexample

    if save_counterexample:
        next_order = (
            problem.test_cases.order_by("-order").values_list("order", flat=True).first() or 0
        ) + 1
        TestCase.objects.create(
            problem=problem,
            order=next_order,
            input=inputs[bad],
            # Ishonchli javob — sodda yechimniki. Etalonnikini yozib qo'ysak,
            # xato testga muhrlanib qolardi.
            expected_output=brute_run.outputs[bad].strip("\n") + "\n",
            is_sample=False,
            source="generated",
            generator=generator,
            seed=rows[bad]["seed"],
            explanation_uz="Stress-testda topilgan qarshi misol.",
        )
        detail["saved_as_test"] = True

    return _record(
        problem, user,
        kind=AuthoringRun.Kind.STRESS,
        status_value=AuthoringRun.Status.FAILED,
        summary=f"Farq topildi — {rows[bad]['seed']} urug'i, {bad + 1}-urinish.",
        detail=detail,
        started=started,
    )


# ------------------------------------------------------------ checker sinovi
def try_checker(problem, *, user, test_input: str, user_output: str,
                jury_output: str) -> AuthoringRun:
    """Checkerni bitta qo'lda kiritilgan holatda sinab ko'radi.

    Muallif «bu javob qabul qilinadimi?» degan savolni masalani chop etmasdan
    turib tekshira oladi.
    """
    started = time.perf_counter()
    verdict = checker_mod.check_one(
        problem, test_input=test_input, expected=jury_output, actual=user_output
    )
    return _record(
        problem, user,
        kind=AuthoringRun.Kind.CHECKER,
        status_value=AuthoringRun.Status.OK if verdict.ok else AuthoringRun.Status.FAILED,
        summary=("Qabul qilindi" if verdict.ok else "Qabul qilinmadi")
                + (f" — {verdict.message}" if verdict.message else ""),
        detail={
            "checker_type": problem.checker_type,
            "accepted": verdict.ok,
            "system_error": verdict.system_error,
            "message": verdict.message,
            "input": test_input[:2000],
            "user_output": user_output[:2000],
            "jury_output": jury_output[:2000],
        },
        started=started,
    )
