"""Javobni tekshirish qatlami — «istalgan to'g'ri javob» muammosining yechimi.

Muammo
------
Ilgari yechim faqat bitta yo'l bilan baholanardi: foydalanuvchi chiqishi
etalon javob bilan belgima-belgi solishtirilardi. Bu masalalarning katta
qismida noto'g'ri ishlaydi:

* «Yig'indisi N bo'lgan ISTALGAN juftlikni chiqaring» — to'g'ri javob ko'p;
* «Grafda ISTALGAN eng qisqa yo'lni chiqaring» — bir nechta optimal yo'l;
* haqiqiy sonli javob — `0.3333333` va `0.33333334` ikkalasi ham to'g'ri;
* elementlar tartibi ahamiyatsiz bo'lgan javoblar.

Yechim: masala o'zi qanday tekshirilishini e'lon qiladi (`Problem.checker_type`).

    exact   — qator oxiridagi bo'shliqlarsiz belgima-belgi (eski xatti-harakat)
    token   — so'zlarga bo'lib solishtirish (bo'shliq va qator farqi kechiriladi)
    float   — sonlarni epsilon bilan solishtirish
    custom  — MUALLIF YOZGAN DASTUR qaror qiladi

Maxsus checker shartnomasi
--------------------------
Checker `stdin` dan uchta bo'limni shu tartibda oladi. Har bir bo'lim
avval qatorlar SONI, keyin o'sha qatorlarning o'zi:

    <kirish qatorlari soni>
    <kirish>
    <ishtirokchi javobi qatorlari soni>
    <ishtirokchi javobi>
    <etalon javob qatorlari soni>
    <etalon javob>

Uzunlik oldindan berilgani uchun matn ichida istalgan belgi bo'lishi mumkin —
ajratgich izlash shart emas, C++ da ham `getline` bilan o'qish oson.

Checker `stdout` ning BIRINCHI so'ziga qarab qaror qabul qilinadi:

    OK / AC / 1   → javob qabul qilindi
    boshqa hamma  → noto'g'ri javob

Birinchi so'zdan keyingi matn foydalanuvchiga izoh sifatida ko'rsatiladi
(«3-sonda xatolik», «juftlik yig'indisi 12 emas» kabi).

Checker o'zi qulasa yoki vaqti tugasa — bu MASALANING nuqsoni, foydalanuvchi
xatosi emas: shunda `SYSTEM_ERROR` qaytariladi, `WRONG_ANSWER` emas.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from .results import normalize_output

# Checkerga beriladigan vaqt: masalaning limitiga bog'liq emas — u
# foydalanuvchi kodidan ancha yengil bo'lishi kutiladi.
CHECKER_TIME_LIMIT_MS = 5000
CHECKER_MEMORY_LIMIT_KB = 262144

_NUMBER = re.compile(r"^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$")


@dataclass
class CheckResult:
    """Bitta test bo'yicha tekshiruv natijasi."""

    ok: bool
    message: str = ""
    # Checkerning o'zi ishlamadi — masala noto'g'ri sozlangan.
    system_error: bool = False


# ----------------------------------------------------------------- oddiy usullar
def _tokens(text: str | None) -> list[str]:
    return (text or "").split()


def check_exact(expected: str, actual: str) -> CheckResult:
    if normalize_output(actual) == normalize_output(expected):
        return CheckResult(True)
    return CheckResult(False, "Chiqish etalon javobga mos kelmadi.")


def check_token(expected: str, actual: str) -> CheckResult:
    want, got = _tokens(expected), _tokens(actual)
    if want == got:
        return CheckResult(True)
    if len(want) != len(got):
        return CheckResult(
            False, f"So'zlar soni mos emas: {len(want)} kutilgan, {len(got)} chiqdi."
        )
    for index, (a, b) in enumerate(zip(want, got, strict=True), start=1):
        if a != b:
            return CheckResult(False, f"{index}-so'z farq qildi: «{a}» kutilgan, «{b}» chiqdi.")
    return CheckResult(False, "Chiqish mos kelmadi.")


def check_float(expected: str, actual: str, epsilon: float) -> CheckResult:
    """Sonlarni epsilon bilan, qolgan so'zlarni aynan solishtiradi.

    Xatolik ABSOLYUT yoki NISBIY bo'lishi mumkin: kattaligi 1 dan katta
    sonlarda absolyut epsilon juda qattiq bo'lib qoladi, shuning uchun
    ikkovidan biri yetarli.
    """
    want, got = _tokens(expected), _tokens(actual)
    if len(want) != len(got):
        return CheckResult(
            False, f"So'zlar soni mos emas: {len(want)} kutilgan, {len(got)} chiqdi."
        )

    eps = abs(epsilon) or 1e-6
    for index, (a, b) in enumerate(zip(want, got, strict=True), start=1):
        if a == b:
            continue
        if not (_NUMBER.match(a) and _NUMBER.match(b)):
            return CheckResult(False, f"{index}-so'z farq qildi: «{a}» kutilgan, «{b}» chiqdi.")
        try:
            x, y = float(a), float(b)
        except ValueError:
            return CheckResult(False, f"{index}-so'zni son sifatida o'qib bo'lmadi: «{b}».")
        diff = abs(x - y)
        if diff <= eps or diff <= eps * max(abs(x), abs(y)):
            continue
        return CheckResult(
            False, f"{index}-son xatoligi {diff:.3g} — ruxsat etilgani {eps:.3g}."
        )
    return CheckResult(True)


# ---------------------------------------------------------------- maxsus checker
def build_payload(test_input: str, actual: str, expected: str) -> str:
    """Checker `stdin` ga beriladigan uch bo'limli matnni yasaydi."""

    def section(text: str | None) -> list[str]:
        body = (text or "").replace("\r\n", "\n").replace("\r", "\n")
        lines = body.split("\n")
        # Oxiridagi bo'sh qator faqat `\n` ning izi — uni bo'lim uzunligiga
        # qo'shsak, checker yozuvchi kutmagan bitta ortiqcha qator paydo bo'ladi.
        if lines and lines[-1] == "":
            lines.pop()
        return [str(len(lines)), *lines]

    parts = section(test_input) + section(actual) + section(expected)
    return "\n".join(parts) + "\n"


def parse_verdict(stdout: str) -> CheckResult:
    """Checker chiqishining birinchi so'zidan qaror chiqaradi."""
    text = (stdout or "").strip()
    if not text:
        return CheckResult(
            False, "Checker hech narsa chiqarmadi.", system_error=True
        )
    head, _, tail = text.partition("\n")
    verdict, _, inline = head.strip().partition(" ")
    message = (inline.strip() or tail.strip())[:500]
    if verdict.upper() in {"OK", "AC", "1", "YES", "CORRECT"}:
        return CheckResult(True, message)
    return CheckResult(False, message or "Javob qabul qilinmadi.")


def _run_custom(problem, rows: list[dict]) -> list[CheckResult]:
    from . import engine

    if not (problem.checker_code or "").strip():
        return [
            CheckResult(False, "Masalaga maxsus checker sozlangan, lekin kodi bo'sh.", system_error=True)
            for _ in rows
        ]

    cases = [
        {
            "input": build_payload(row.get("input") or "", row.get("actual") or "", row.get("expected") or ""),
            "expected_output": None,  # solishtirish yo'q — chiqishning o'zi kerak
        }
        for row in rows
    ]

    backend, results = engine.execute(
        language=problem.checker_language or "python",
        code=problem.checker_code,
        cases=cases,
        time_limit_ms=CHECKER_TIME_LIMIT_MS,
        memory_limit_kb=CHECKER_MEMORY_LIMIT_KB,
    )

    if backend == engine.BACKEND_NONE:
        return [CheckResult(False, engine.NO_BACKEND_MESSAGE, system_error=True) for _ in rows]

    verdicts: list[CheckResult] = []
    for result in results:
        if result.status == "COMPILE_ERROR":
            verdicts.append(CheckResult(
                False, "Checker kompilyatsiya qilinmadi: " + (result.compile_output or "")[:300],
                system_error=True,
            ))
        elif result.status != "ACCEPTED":
            verdicts.append(CheckResult(
                False,
                f"Checker bajarilmadi ({result.status}): " + (result.stderr or result.message or "")[:300],
                system_error=True,
            ))
        else:
            verdicts.append(parse_verdict(result.stdout))
    return verdicts


# ------------------------------------------------------------------ umumiy kirish
def needs_program(problem) -> bool:
    """Tekshirish uchun alohida dastur ishga tushiriladimi."""
    return getattr(problem, "checker_type", "exact") == "custom"


def check_one(problem, *, test_input: str, expected: str, actual: str) -> CheckResult:
    return check_many(problem, [{"input": test_input, "expected": expected, "actual": actual}])[0]


def check_many(problem, rows: list[dict]) -> list[CheckResult]:
    """Bir nechta testni tekshiradi.

    `rows` — `{"input", "expected", "actual"}` lug'atlari. Maxsus checker
    bo'lsa hammasi BITTA partiyada bajariladi: aks holda har bir test uchun
    alohida kompilyatsiya va jarayon ishga tushishi kerak bo'lardi.
    """
    if not rows:
        return []

    kind = getattr(problem, "checker_type", "exact") or "exact"

    if kind == "custom":
        return _run_custom(problem, rows)

    if kind == "token":
        return [check_token(row.get("expected") or "", row.get("actual") or "") for row in rows]

    if kind == "float":
        eps = getattr(problem, "float_epsilon", 1e-6) or 1e-6
        return [check_float(row.get("expected") or "", row.get("actual") or "", eps) for row in rows]

    return [check_exact(row.get("expected") or "", row.get("actual") or "") for row in rows]


# --------------------------------------------------------------------- shablonlar
# Studio muharririda «Namuna yuklash» tugmasi shularni qo'yadi. Shartnomani
# eslab qolish shart bo'lmasin — ishlaydigan kod darhol turadi.
CHECKER_TEMPLATES: dict[str, str] = {
    "python": '''import sys

def read_block(it):
    """Navbatdagi bo'limni o'qiydi: avval qatorlar soni, keyin qatorlar."""
    n = int(next(it).strip() or 0)
    return [next(it).rstrip("\\n") for _ in range(n)]

def main():
    it = iter(sys.stdin.read().split("\\n"))
    test_input = read_block(it)   # masalaning kirishi
    user_out   = read_block(it)   # ishtirokchi javobi
    jury_out   = read_block(it)   # etalon javob

    # --- MISOL: «yig'indisi N bo'lgan istalgan juftlikni chiqaring»
    # n = int(test_input[0])
    # a, b = map(int, user_out[0].split())
    # if a + b != n:
    #     print("WA", f"{a}+{b} = {a + b}, kerak {n}")
    #     return
    # print("OK")

    # Sukut bo'yicha: so'zma-so'z solishtirish
    if " ".join(user_out).split() == " ".join(jury_out).split():
        print("OK")
    else:
        print("WA", "javob etalonga mos emas")

main()
''',
    "cpp": '''#include <bits/stdc++.h>
using namespace std;

// Navbatdagi bo'limni o'qiydi: avval qatorlar soni, keyin qatorlar.
vector<string> read_block() {
    int n;
    if (!(cin >> n)) return {};
    cin.ignore();
    vector<string> lines(n);
    for (int i = 0; i < n; i++) getline(cin, lines[i]);
    return lines;
}

int main() {
    vector<string> test_input = read_block();  // masalaning kirishi
    vector<string> user_out   = read_block();  // ishtirokchi javobi
    vector<string> jury_out   = read_block();  // etalon javob

    // --- MISOL: «yig'indisi n bo'lgan istalgan juftlik»
    // long long n = stoll(test_input[0]);
    // stringstream ss(user_out.empty() ? "" : user_out[0]);
    // long long a, b;
    // if (!(ss >> a >> b)) { cout << "WA javobda ikkita son yo'q\\n"; return 0; }
    // if (a + b != n) { cout << "WA yig'indi " << a + b << ", kerak " << n << "\\n"; return 0; }
    // cout << "OK\\n";

    auto words = [](const vector<string>& v) {
        vector<string> out;
        for (auto& line : v) { stringstream ss(line); string w; while (ss >> w) out.push_back(w); }
        return out;
    };
    cout << (words(user_out) == words(jury_out) ? "OK" : "WA javob etalonga mos emas") << "\\n";
    return 0;
}
''',
    "javascript": '''const data = require("fs").readFileSync(0, "utf8").split("\\n");
let pos = 0;

// Navbatdagi bo'limni o'qiydi: avval qatorlar soni, keyin qatorlar.
function readBlock() {
  const n = parseInt(data[pos++] || "0", 10);
  return data.slice(pos, (pos += n));
}

const testInput = readBlock();  // masalaning kirishi
const userOut   = readBlock();  // ishtirokchi javobi
const juryOut   = readBlock();  // etalon javob

// --- MISOL: «yig'indisi n bo'lgan istalgan juftlik»
// const n = Number(testInput[0]);
// const [a, b] = (userOut[0] || "").trim().split(/\\s+/).map(Number);
// if (a + b !== n) { console.log("WA", `${a}+${b} = ${a + b}, kerak ${n}`); process.exit(0); }
// console.log("OK");

const words = (v) => v.join(" ").split(/\\s+/).filter(Boolean);
const same = JSON.stringify(words(userOut)) === JSON.stringify(words(juryOut));
console.log(same ? "OK" : "WA javob etalonga mos emas");
''',
}

GENERATOR_TEMPLATES: dict[str, str] = {
    "python": '''import random, sys

# Urug' (seed) `stdin` dan keladi. Bir xil urug' — bir xil test.
seed = int(sys.stdin.read().strip() or 0)
random.seed(seed)

n = random.randint(1, 10 ** 5)
print(n)
print(*[random.randint(1, 10 ** 9) for _ in range(n)])
''',
    "cpp": '''#include <bits/stdc++.h>
using namespace std;

int main() {
    // Urug' (seed) `stdin` dan keladi. Bir xil urug' — bir xil test.
    long long seed = 0;
    cin >> seed;
    mt19937_64 rng(seed);

    int n = (int)(rng() % 100000) + 1;
    printf("%d\\n", n);
    for (int i = 0; i < n; i++) printf("%llu%c", rng() % 1000000000ULL + 1, " \\n"[i + 1 == n]);
    return 0;
}
''',
    "javascript": '''const seed = Number(require("fs").readFileSync(0, "utf8").trim() || 0);

// Oddiy, lekin takrorlanuvchi generator (mulberry32).
let s = seed >>> 0;
const rnd = () => {
  s = (s + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const n = between(1, 100000);
const out = [String(n), Array.from({ length: n }, () => between(1, 1e9)).join(" ")];
console.log(out.join("\\n"));
''',
}
