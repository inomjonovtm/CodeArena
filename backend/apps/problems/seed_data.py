"""Saralangan masalalar to'plami — seed uchun.

Har bir masala haqiqiy, yechiladigan masala: matni, cheklovlari, namuna
testlari va etalon yechimi bor. Yashirin testlarning kutilgan javobi seed
paytida etalon yechimni judge orqali ishga tushirib olinadi, so'ngra butun
to'plam yana bir bor tekshiriladi — ya'ni bazaga faqat "o'tadigan" masala
tushadi.

Barcha masalalar `stdin` → `stdout` shaklida: judge shu formatda ishlaydi.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SeedProblem:
    slug: str
    title_uz: str
    title_en: str
    difficulty: str
    points: int
    tags: tuple[str, ...]
    description_uz: str
    description_en: str
    constraints_uz: str
    constraints_en: str
    hint_uz: str
    hint_en: str
    editorial_uz: str
    editorial_en: str
    solution_python: str
    starter: dict[str, str]
    #: (kirish, kutilgan chiqish, izoh)
    samples: tuple[tuple[str, str, str], ...]
    #: Faqat kirish — javob etalon yechimdan olinadi
    hidden_inputs: tuple[str, ...] = field(default_factory=tuple)
    time_limit_ms: int = 2000
    #: Faqat musobaqa doirasida ko'rinadi (amaliyot ro'yxatiga tushmaydi)
    is_contest_only: bool = False


PY_HEAD = "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n"
JS_HEAD = (
    'const input = require("fs").readFileSync(0, "utf8");\n'
    "const data = input.split(/\\s+/).filter(Boolean);\n"
)
CPP_HEAD = "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n"

TODO_UZ = "    // Yechimingizni shu yerga yozing\n"
TODO_PY = "    # Yechimingizni shu yerga yozing\n"


PROBLEMS: list[SeedProblem] = [
    # ------------------------------------------------------------------ 1
    SeedProblem(
        slug="ikki-sonning-yigindisi",
        title_uz="Ikki sonning yig'indisi",
        title_en="Two Sum",
        difficulty="easy",
        points=10,
        tags=("massiv", "xesh-jadval"),
        description_uz="""Sizga `n` ta butun sondan iborat massiv va `target` soni berilgan.

Yig'indisi aynan `target` ga teng bo'ladigan **ikkita turli indeksni** toping.

Javob har doim mavjud va yagona deb hisoblang. Indekslar **0 dan** boshlanadi
va o'sish tartibida chiqarilsin.

## Kirish

Birinchi qatorda `n` va `target`.
Ikkinchi qatorda `n` ta butun son.

## Chiqish

Bo'sh joy bilan ajratilgan ikkita indeks.""",
        description_en="""You are given an array of `n` integers and a number `target`.

Find **two distinct indices** whose values add up to exactly `target`.

Assume the answer always exists and is unique. Indices are **0-based** and must
be printed in increasing order.

## Input

First line: `n` and `target`.
Second line: `n` integers.

## Output

Two indices separated by a space.""",
        constraints_uz="2 ≤ n ≤ 100 000\n-10⁹ ≤ nums[i], target ≤ 10⁹",
        constraints_en="2 ≤ n ≤ 100 000\n-10⁹ ≤ nums[i], target ≤ 10⁹",
        hint_uz="Har bir son uchun `target - son` ni avval ko'rilganlar orasidan qidiring. "
                "Lug'at (hash map) bunda O(1) vaqt beradi.",
        hint_en="For each number look up `target - number` among the ones already seen. "
                "A hash map makes that O(1).",
        editorial_uz="""Sodda yechim — barcha juftliklarni ko'rib chiqish, O(n²). Bu `n = 100 000` da juda sekin.

Tezroq usul: massiv bo'ylab bir marta yuramiz va ko'rgan sonlarni
`qiymat → indeks` lug'atiga yozib boramiz. `nums[i]` ni ko'rganda
`target - nums[i]` lug'atda bormi deb tekshiramiz — bo'lsa, javob topildi.

Vaqt: **O(n)**, xotira: **O(n)**.""",
        editorial_en="""The naive solution checks every pair — O(n²), too slow for `n = 100 000`.

Better: walk the array once, storing each seen value in a `value → index` map.
At `nums[i]`, check whether `target - nums[i]` is already in the map.

Time: **O(n)**, memory: **O(n)**.""",
        solution_python="""import sys

def main():
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    nums = list(map(int, data[2:2 + n]))
    seen = {}
    for index, value in enumerate(nums):
        if target - value in seen:
            print(seen[target - value], index)
            return
        seen[value] = index

main()
""",
        starter={
            "python": PY_HEAD + "    n, target = int(data[0]), int(data[1])\n"
                                "    nums = list(map(int, data[2:2 + n]))\n" + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const n = Number(data[0]);\nconst target = Number(data[1]);\n"
                                    "const nums = data.slice(2, 2 + n).map(Number);\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    int n; long long target;\n    cin >> n >> target;\n"
                              "    vector<long long> nums(n);\n    for (auto &x : nums) cin >> x;\n"
                              + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("4 9\n2 7 11 15", "0 1", "2 + 7 = 9, shuning uchun 0 va 1-indekslar."),
            ("3 6\n3 2 4", "1 2", "2 + 4 = 6."),
        ),
        hidden_inputs=(
            "2 6\n3 3",
            "5 -8\n-3 4 -5 1 9",
            "6 100\n10 20 30 40 60 70",
            "8 0\n5 -1 3 -5 2 8 -3 7",
            "10 19\n1 2 3 4 5 6 7 8 9 10",
        ),
    ),
    # ------------------------------------------------------------------ 2
    SeedProblem(
        slug="qavslar-togriligi",
        title_uz="Qavslar to'g'riligi",
        title_en="Valid Parentheses",
        difficulty="easy",
        points=10,
        tags=("stek", "satr"),
        description_uz="""Faqat `()`, `[]`, `{}` belgilaridan iborat `s` satri berilgan.

Satr **to'g'ri** deb hisoblanadi, agar:

1. har bir ochilgan qavs mos turdagi qavs bilan yopilsa;
2. qavslar to'g'ri tartibda yopilsa (`([)]` — noto'g'ri).

## Kirish

Bitta qatorda `s` satri.

## Chiqish

`YES` — agar satr to'g'ri bo'lsa, aks holda `NO`.""",
        description_en="""A string `s` consisting only of `()`, `[]`, `{}` is given.

The string is **valid** when:

1. every open bracket is closed by the same type of bracket;
2. brackets close in the correct order (`([)]` is invalid).

## Input

One line: the string `s`.

## Output

`YES` if the string is valid, otherwise `NO`.""",
        constraints_uz="1 ≤ |s| ≤ 100 000",
        constraints_en="1 ≤ |s| ≤ 100 000",
        hint_uz="Stekdan foydalaning: ochilgan qavsni stekka qo'ying, yopilganda stek tepasidagi "
                "qavs mos kelishini tekshiring.",
        hint_en="Use a stack: push opening brackets, and on a closing bracket check that the top "
                "of the stack matches.",
        editorial_uz="""Satr bo'ylab yuramiz:

* ochuvchi qavs (`(`, `[`, `{`) bo'lsa — stekka qo'yamiz;
* yopuvchi qavs bo'lsa — stek bo'sh bo'lmasligi va tepasidagi element mos
  turdagi ochuvchi qavs bo'lishi kerak; shundan keyin uni olib tashlaymiz.

Oxirida stek bo'sh bo'lsa — satr to'g'ri.

Vaqt: **O(n)**, xotira: **O(n)**.""",
        editorial_en="""Walk over the string:

* an opening bracket is pushed onto the stack;
* a closing bracket requires a non-empty stack whose top is the matching opener;
  then pop it.

The string is valid when the stack ends up empty.

Time: **O(n)**, memory: **O(n)**.""",
        solution_python="""import sys

def main():
    s = sys.stdin.readline().strip()
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for char in s:
        if char in "([{":
            stack.append(char)
        elif char in pairs:
            if not stack or stack.pop() != pairs[char]:
                print("NO")
                return
    print("YES" if not stack else "NO")

main()
""",
        starter={
            "python": "import sys\n\ndef main():\n    s = sys.stdin.readline().strip()\n"
                      + TODO_PY + "\nmain()\n",
            "javascript": 'const s = require("fs").readFileSync(0, "utf8").trim();\n'
                          "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    string s;\n    getline(cin, s);\n" + TODO_UZ
                   + "    return 0;\n}\n",
        },
        samples=(
            ("()[]{}", "YES", "Har bir qavs o'z turida yopilgan."),
            ("([)]", "NO", "Tartib buzilgan: `)` dan oldin `]` yopilishi kerak edi."),
        ),
        hidden_inputs=("(", "]", "{[()]}", "((((((((((", "{[]}({})[[]]", "(((())))", "([{}])"),
    ),
    # ------------------------------------------------------------------ 3
    SeedProblem(
        slug="maksimal-qism-massiv",
        title_uz="Maksimal qism-massiv",
        title_en="Maximum Subarray",
        difficulty="medium",
        points=30,
        tags=("massiv", "dinamik-dasturlash"),
        description_uz="""`n` ta butun sondan iborat massiv berilgan.

Yig'indisi eng katta bo'lgan **bo'sh bo'lmagan ketma-ket qism-massivni** toping
va uning yig'indisini chiqaring.

## Kirish

Birinchi qatorda `n`, ikkinchi qatorda `n` ta butun son.

## Chiqish

Maksimal yig'indi.""",
        description_en="""An array of `n` integers is given.

Find the **non-empty contiguous subarray** with the largest sum and print that sum.

## Input

First line: `n`. Second line: `n` integers.

## Output

The maximum sum.""",
        constraints_uz="1 ≤ n ≤ 200 000\n-10⁴ ≤ nums[i] ≤ 10⁴",
        constraints_en="1 ≤ n ≤ 200 000\n-10⁴ ≤ nums[i] ≤ 10⁴",
        hint_uz="Har bir pozitsiyada savol bitta: oldingi qism-massivni davom ettirish "
                "foydaliroqmi yoki shu elementdan yangisini boshlashmi?",
        hint_en="At each position ask one question: is it better to extend the previous subarray "
                "or start a new one at this element?",
        editorial_uz="""Kadane algoritmi. `best` — shu elementda tugaydigan eng yaxshi yig'indi:

```
best = max(nums[i], best + nums[i])
answer = max(answer, best)
```

Agar oldingi yig'indi manfiy bo'lsa, uni davom ettirishdan ko'ra yangisini
boshlash foydali — formula shuni o'zi hal qiladi.

Vaqt: **O(n)**, xotira: **O(1)**.""",
        editorial_en="""Kadane's algorithm. `best` is the best sum ending at the current element:

```
best = max(nums[i], best + nums[i])
answer = max(answer, best)
```

If the running sum went negative, starting fresh beats extending — the formula
handles that on its own.

Time: **O(n)**, memory: **O(1)**.""",
        solution_python="""import sys

def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    best = answer = nums[0]
    for value in nums[1:]:
        best = max(value, best + value)
        answer = max(answer, best)
    print(answer)

main()
""",
        starter={
            "python": PY_HEAD + "    n = int(data[0])\n    nums = list(map(int, data[1:1 + n]))\n"
                      + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const n = Number(data[0]);\n"
                                    "const nums = data.slice(1, 1 + n).map(Number);\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    int n;\n    cin >> n;\n    vector<long long> nums(n);\n"
                              "    for (auto &x : nums) cin >> x;\n" + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("9\n-2 1 -3 4 -1 2 1 -5 4", "6", "[4, -1, 2, 1] qism-massivi 6 ni beradi."),
            ("1\n-7", "-7", "Yagona element — u ham javob."),
        ),
        hidden_inputs=(
            "5\n-5 -2 -8 -1 -4",
            "5\n1 2 3 4 5",
            "8\n5 -9 6 -2 3 -1 4 -8",
            "6\n-1 -2 -3 10 -1 -2",
            "3\n0 0 0",
        ),
    ),
    # ------------------------------------------------------------------ 4
    SeedProblem(
        slug="anagramma-tekshirish",
        title_uz="Anagramma tekshirish",
        title_en="Valid Anagram",
        difficulty="easy",
        points=10,
        tags=("satr", "xesh-jadval", "saralash"),
        description_uz="""Ikkita satr `s` va `t` berilgan. Ular bir-birining **anagrammasimi**?

Anagramma — bir xil harflardan bir xil sonda tuzilgan, faqat tartibi boshqacha satr.

## Kirish

Birinchi qatorda `s`, ikkinchi qatorda `t`. Ikkalasi ham faqat kichik lotin harflaridan iborat.

## Chiqish

`YES` yoki `NO`.""",
        description_en="""Two strings `s` and `t` are given. Are they **anagrams** of each other?

An anagram uses exactly the same letters the same number of times, only in a
different order.

## Input

First line: `s`. Second line: `t`. Both contain lowercase Latin letters only.

## Output

`YES` or `NO`.""",
        constraints_uz="1 ≤ |s|, |t| ≤ 100 000",
        constraints_en="1 ≤ |s|, |t| ≤ 100 000",
        hint_uz="Har bir harf nechta marta uchraganini sanang va ikkala satr uchun solishtiring.",
        hint_en="Count how many times each letter occurs and compare the two counts.",
        editorial_uz="""Ikki yo'l bor:

1. **Saralash** — ikkala satrni saralab, tenglikni tekshirish. O(n log n).
2. **Sanash** — 26 elementli massivda harflar sonini hisoblash: `s` uchun
   `+1`, `t` uchun `-1`. Oxirida hamma element nol bo'lsa — anagramma. **O(n)**.

Uzunliklar farq qilsa, javob darrov `NO`.""",
        editorial_en="""Two approaches:

1. **Sorting** — sort both strings and compare. O(n log n).
2. **Counting** — a 26-slot array: `+1` for `s`, `-1` for `t`. If every slot ends
   at zero it is an anagram. **O(n)**.

Different lengths mean an immediate `NO`.""",
        solution_python="""import sys
from collections import Counter

def main():
    lines = sys.stdin.read().split()
    s = lines[0] if lines else ""
    t = lines[1] if len(lines) > 1 else ""
    print("YES" if Counter(s) == Counter(t) else "NO")

main()
""",
        starter={
            "python": "import sys\n\ndef main():\n    lines = sys.stdin.read().split()\n"
                      "    s, t = lines[0], lines[1]\n" + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const s = data[0];\nconst t = data[1];\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    string s, t;\n    cin >> s >> t;\n" + TODO_UZ
                   + "    return 0;\n}\n",
        },
        samples=(
            ("anagram\nnagaram", "YES", "Harflar bir xil, faqat tartibi boshqacha."),
            ("rat\ncar", "NO", "`t` va `c` mos kelmaydi."),
        ),
        hidden_inputs=("a\na", "ab\nabc", "listen\nsilent", "aabbcc\nabcabc", "xyz\nzyx"),
    ),
    # ------------------------------------------------------------------ 5
    SeedProblem(
        slug="ikkilik-qidiruv",
        title_uz="Ikkilik qidiruv",
        title_en="Binary Search",
        difficulty="easy",
        points=10,
        tags=("massiv", "ikkilik-qidiruv"),
        description_uz="""O'sish tartibida saralangan `n` ta turli butun sondan iborat massiv va
`target` soni berilgan.

`target` massivda bo'lsa — uning indeksini (0 dan boshlab) chiqaring,
bo'lmasa `-1`.

Yechim `O(log n)` bo'lishi kutiladi.

## Kirish

Birinchi qatorda `n` va `target`, ikkinchi qatorda `n` ta saralangan son.

## Chiqish

Indeks yoki `-1`.""",
        description_en="""A sorted array of `n` distinct integers and a number `target` are given.

Print the 0-based index of `target` in the array, or `-1` if it is not there.

An `O(log n)` solution is expected.

## Input

First line: `n` and `target`. Second line: `n` sorted integers.

## Output

The index, or `-1`.""",
        constraints_uz="1 ≤ n ≤ 200 000\n-10⁹ ≤ nums[i], target ≤ 10⁹",
        constraints_en="1 ≤ n ≤ 200 000\n-10⁹ ≤ nums[i], target ≤ 10⁹",
        hint_uz="Har qadamda qidiruv oralig'ini ikkiga bo'ling: o'rtadagi element `target` dan "
                "kichik bo'lsa, chap yarmini tashlab yuboring.",
        hint_en="Halve the search range each step: if the middle element is smaller than `target`, "
                "discard the left half.",
        editorial_uz="""`lo = 0`, `hi = n - 1` oralig'ini saqlaymiz.

Har qadamda `mid = (lo + hi) // 2`:

* `nums[mid] == target` → javob topildi;
* `nums[mid] < target` → `lo = mid + 1`;
* aks holda → `hi = mid - 1`.

Oraliq bo'shab qolsa — element yo'q.

Vaqt: **O(log n)**, xotira: **O(1)**.""",
        editorial_en="""Keep a range `lo = 0`, `hi = n - 1`.

Each step, with `mid = (lo + hi) // 2`:

* `nums[mid] == target` → found;
* `nums[mid] < target` → `lo = mid + 1`;
* otherwise → `hi = mid - 1`.

An empty range means the element is absent.

Time: **O(log n)**, memory: **O(1)**.""",
        solution_python="""import sys

def main():
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    nums = list(map(int, data[2:2 + n]))
    lo, hi = 0, n - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            print(mid)
            return
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    print(-1)

main()
""",
        starter={
            "python": PY_HEAD + "    n, target = int(data[0]), int(data[1])\n"
                                "    nums = list(map(int, data[2:2 + n]))\n" + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const n = Number(data[0]);\nconst target = Number(data[1]);\n"
                                    "const nums = data.slice(2, 2 + n).map(Number);\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    int n; long long target;\n    cin >> n >> target;\n"
                              "    vector<long long> nums(n);\n    for (auto &x : nums) cin >> x;\n"
                              + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("6 9\n-1 0 3 5 9 12", "4", "9 soni 4-indeksda turibdi."),
            ("6 2\n-1 0 3 5 9 12", "-1", "2 soni massivda yo'q."),
        ),
        hidden_inputs=(
            "1 5\n5",
            "1 4\n5",
            "5 -1\n-9 -5 -1 3 8",
            "7 100\n1 2 3 4 5 6 100",
            "7 1\n1 2 3 4 5 6 100",
        ),
    ),
    # ------------------------------------------------------------------ 6
    SeedProblem(
        slug="zinapoya-boylab-kotarilish",
        title_uz="Zinapoya bo'ylab ko'tarilish",
        title_en="Climbing Stairs",
        difficulty="easy",
        points=10,
        tags=("dinamik-dasturlash", "matematika"),
        description_uz="""Zinapoyada `n` ta pog'ona bor. Har safar **1 yoki 2** pog'ona
ko'tarilish mumkin.

Tepaga chiqishning nechta har xil usuli borligini toping.

Javob katta bo'lishi mumkin — uni `10⁹ + 7` ga bo'lgandagi qoldiqni chiqaring.

## Kirish

Bitta butun son `n`.

## Chiqish

Usullar soni (mod 10⁹ + 7).""",
        description_en="""A staircase has `n` steps. Each move climbs **1 or 2** steps.

Count the number of distinct ways to reach the top.

The answer may be large — print it modulo `10⁹ + 7`.

## Input

A single integer `n`.

## Output

The number of ways (mod 10⁹ + 7).""",
        constraints_uz="1 ≤ n ≤ 1 000 000",
        constraints_en="1 ≤ n ≤ 1 000 000",
        hint_uz="`n`-pog'onaga faqat `n-1` yoki `n-2` dan kelish mumkin. Bu Fibonachchi ketma-ketligi.",
        hint_en="Step `n` can only be reached from `n-1` or `n-2`. That is the Fibonacci recurrence.",
        editorial_uz="""`f(n)` — `n`-pog'onaga chiqish usullari soni. Oxirgi qadam 1 yoki 2 bo'lgani uchun:

```
f(n) = f(n - 1) + f(n - 2),  f(1) = 1,  f(2) = 2
```

Bu Fibonachchi. Rekursiya `n = 10⁶` da ishlamaydi — ikkita o'zgaruvchi bilan
tsiklda hisoblaymiz va har qadamda modul olamiz.

Vaqt: **O(n)**, xotira: **O(1)**.""",
        editorial_en="""Let `f(n)` be the number of ways to reach step `n`. The last move is 1 or 2, so:

```
f(n) = f(n - 1) + f(n - 2),  f(1) = 1,  f(2) = 2
```

That is Fibonacci. Recursion will not survive `n = 10⁶` — iterate with two
variables and take the modulus at every step.

Time: **O(n)**, memory: **O(1)**.""",
        solution_python="""import sys

MOD = 10 ** 9 + 7

def main():
    n = int(sys.stdin.read().split()[0])
    previous, current = 1, 1
    for _ in range(n - 1):
        previous, current = current, (previous + current) % MOD
    print(current % MOD)

main()
""",
        starter={
            "python": "import sys\n\nMOD = 10 ** 9 + 7\n\ndef main():\n"
                      "    n = int(sys.stdin.read().split()[0])\n" + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const n = Number(data[0]);\nconst MOD = 1000000007n;\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    const long long MOD = 1000000007LL;\n    long long n;\n"
                              "    cin >> n;\n" + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("2", "2", "1+1 yoki 2 — ikkita usul."),
            ("3", "3", "1+1+1, 1+2, 2+1."),
        ),
        hidden_inputs=("1", "5", "10", "45", "1000", "1000000"),
        time_limit_ms=3000,
    ),
    # ------------------------------------------------------------------ 7
    SeedProblem(
        slug="uy-ogrisi",
        title_uz="Uy o'g'risi",
        title_en="House Robber",
        difficulty="medium",
        points=30,
        tags=("dinamik-dasturlash", "massiv"),
        description_uz="""Ko'chada `n` ta uy bir qatorda joylashgan, `i`-uyda `nums[i]` pul bor.

**Yonma-yon turgan ikkita uyni** birdaniga o'g'irlab bo'lmaydi — signalizatsiya ishlaydi.

Qo'lga tushmasdan olish mumkin bo'lgan eng katta summani toping.

## Kirish

Birinchi qatorda `n`, ikkinchi qatorda `n` ta manfiy bo'lmagan son.

## Chiqish

Maksimal summa.""",
        description_en="""There are `n` houses in a row; house `i` holds `nums[i]` money.

You cannot rob **two adjacent houses** — the alarm goes off.

Find the maximum amount you can take without being caught.

## Input

First line: `n`. Second line: `n` non-negative integers.

## Output

The maximum amount.""",
        constraints_uz="1 ≤ n ≤ 200 000\n0 ≤ nums[i] ≤ 10⁴",
        constraints_en="1 ≤ n ≤ 200 000\n0 ≤ nums[i] ≤ 10⁴",
        hint_uz="Har bir uy uchun ikki variant: uni olish (u holda oldingisi olinmagan) "
                "yoki tashlab ketish.",
        hint_en="For each house there are two options: rob it (then the previous one was skipped) "
                "or skip it.",
        editorial_uz="""`take` — joriy uyni olganda maksimal summa, `skip` — olmaganda.

```
yangi_take = skip + nums[i]
yangi_skip = max(skip, take)
```

Javob — oxirida `max(take, skip)`.

Vaqt: **O(n)**, xotira: **O(1)**.""",
        editorial_en="""`take` is the best total if the current house is robbed, `skip` if it is not.

```
new_take = skip + nums[i]
new_skip = max(skip, take)
```

The answer is `max(take, skip)` at the end.

Time: **O(n)**, memory: **O(1)**.""",
        solution_python="""import sys

def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    take = skip = 0
    for value in nums:
        take, skip = skip + value, max(skip, take)
    print(max(take, skip))

main()
""",
        starter={
            "python": PY_HEAD + "    n = int(data[0])\n    nums = list(map(int, data[1:1 + n]))\n"
                      + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const n = Number(data[0]);\n"
                                    "const nums = data.slice(1, 1 + n).map(Number);\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    int n;\n    cin >> n;\n    vector<long long> nums(n);\n"
                              "    for (auto &x : nums) cin >> x;\n" + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("4\n1 2 3 1", "4", "1 va 3-uylar: 1 + 3 = 4."),
            ("5\n2 7 9 3 1", "12", "2 + 9 + 1 = 12."),
        ),
        hidden_inputs=("1\n42", "2\n5 5", "6\n0 0 0 0 0 0", "7\n10 1 1 10 1 1 10", "5\n1 2 3 4 5"),
    ),
    # ------------------------------------------------------------------ 8
    SeedProblem(
        slug="uzun-takrorlanmas-qism-satr",
        title_uz="Eng uzun takrorlanmas qism-satr",
        title_en="Longest Substring Without Repeating Characters",
        difficulty="medium",
        points=30,
        tags=("satr", "ikki-korsatkich", "xesh-jadval"),
        description_uz="""`s` satri berilgan. Undagi **belgilari takrorlanmaydigan** eng uzun
ketma-ket qism-satr uzunligini toping.

## Kirish

Bitta qatorda `s` (bo'shliqsiz, ko'rinadigan ASCII belgilar).

## Chiqish

Eng uzun qism-satr uzunligi.""",
        description_en="""Given a string `s`, find the length of the longest contiguous substring
whose characters are **all distinct**.

## Input

One line: `s` (no spaces, printable ASCII).

## Output

The length of the longest such substring.""",
        constraints_uz="1 ≤ |s| ≤ 200 000",
        constraints_en="1 ≤ |s| ≤ 200 000",
        hint_uz="Siljiydigan oyna (sliding window): o'ng chegarani suring, takror uchraganda "
                "chap chegarani kerakli joygacha tortib oling.",
        hint_en="Sliding window: extend the right edge, and when a repeat appears pull the left "
                "edge past its previous position.",
        editorial_uz="""Har bir belgining oxirgi ko'rilgan pozitsiyasini lug'atda saqlaymiz.

`right` bo'ylab yuramiz. Agar `s[right]` avval `left` dan o'ngroqda uchragan
bo'lsa, `left` ni `oxirgi_pozitsiya + 1` ga suramiz. Har qadamda javobni
`right - left + 1` bilan yangilaymiz.

Vaqt: **O(n)**, xotira: **O(k)** — bu yerda `k` alifbo hajmi.""",
        editorial_en="""Store the last seen position of every character in a map.

Move `right` across the string. If `s[right]` was seen at or after `left`, move
`left` to `last_position + 1`. Update the answer with `right - left + 1` each step.

Time: **O(n)**, memory: **O(k)** where `k` is the alphabet size.""",
        solution_python="""import sys

def main():
    s = sys.stdin.readline().strip()
    last = {}
    left = 0
    best = 0
    for right, char in enumerate(s):
        if char in last and last[char] >= left:
            left = last[char] + 1
        last[char] = right
        best = max(best, right - left + 1)
    print(best)

main()
""",
        starter={
            "python": "import sys\n\ndef main():\n    s = sys.stdin.readline().strip()\n"
                      + TODO_PY + "\nmain()\n",
            "javascript": 'const s = require("fs").readFileSync(0, "utf8").trim();\n'
                          "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    string s;\n    getline(cin, s);\n" + TODO_UZ
                   + "    return 0;\n}\n",
        },
        samples=(
            ("abcabcbb", "3", "`abc` — uzunligi 3."),
            ("bbbbb", "1", "Faqat `b`, uzunligi 1."),
        ),
        hidden_inputs=("pwwkew", "a", "abcdefghij", "dvdf", "abba", "tmmzuxt"),
    ),
    # ------------------------------------------------------------------ 9
    SeedProblem(
        slug="orollar-soni",
        title_uz="Orollar soni",
        title_en="Number of Islands",
        difficulty="medium",
        points=30,
        tags=("graf", "massiv"),
        description_uz="""`m × n` o'lchamdagi jadval berilgan: `1` — quruqlik, `0` — suv.

**Orol** — yonma-yon (yuqori, quyi, chap, o'ng) turgan quruqlik kataklarining
bog'langan guruhi. Diagonal bog'lanish hisobga olinmaydi.

Jadvaldagi orollar sonini toping.

## Kirish

Birinchi qatorda `m` va `n`. Keyingi `m` qatorda `n` tadan `0`/`1` raqami
(bo'shliqsiz).

## Chiqish

Orollar soni.""",
        description_en="""An `m × n` grid is given: `1` is land, `0` is water.

An **island** is a group of land cells connected horizontally or vertically.
Diagonals do not connect.

Count the islands in the grid.

## Input

First line: `m` and `n`. Then `m` lines of `n` digits (`0`/`1`, no spaces).

## Output

The number of islands.""",
        constraints_uz="1 ≤ m, n ≤ 300",
        constraints_en="1 ≤ m, n ≤ 300",
        hint_uz="Har bir tekshirilmagan `1` dan boshlab BFS/DFS yuriting va butun orolni "
                "belgilab chiqing. Boshlangan yurishlar soni — javob.",
        hint_en="Start a BFS/DFS from every unvisited `1` and mark the whole island. The number "
                "of starts is the answer.",
        editorial_uz="""Jadval bo'ylab yuramiz. `1` uchrasa va u hali ko'rilmagan bo'lsa:

1. hisoblagichni bittaga oshiramiz;
2. shu katakdan BFS (yoki DFS) yuritib, butun bog'langan sohani `0` ga
   aylantiramiz (yoki `visited` da belgilaymiz).

Har bir katak bir marta ko'riladi.

Rekursiv DFS chuqurligi `300 × 300 = 90 000` ga yetishi mumkin — Pythonda
stek limitiga urilmaslik uchun **BFS (navbat)** ishlatgan ma'qul.

Vaqt: **O(m · n)**.""",
        editorial_en="""Scan the grid. On an unvisited `1`:

1. increment the counter;
2. run a BFS (or DFS) from that cell, turning the whole connected region into
   `0` (or marking it visited).

Each cell is visited once.

Recursive DFS can reach depth `300 × 300 = 90 000` — use **BFS with a queue** in
Python to avoid the recursion limit.

Time: **O(m · n)**.""",
        solution_python="""import sys
from collections import deque

def main():
    data = sys.stdin.read().split()
    m, n = int(data[0]), int(data[1])
    grid = [list(row) for row in data[2:2 + m]]

    islands = 0
    for row in range(m):
        for col in range(n):
            if grid[row][col] != "1":
                continue
            islands += 1
            queue = deque([(row, col)])
            grid[row][col] = "0"
            while queue:
                r, c = queue.popleft()
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == "1":
                        grid[nr][nc] = "0"
                        queue.append((nr, nc))
    print(islands)

main()
""",
        starter={
            "python": PY_HEAD + "    m, n = int(data[0]), int(data[1])\n"
                                "    grid = [list(row) for row in data[2:2 + m]]\n"
                      + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const m = Number(data[0]);\nconst n = Number(data[1]);\n"
                                    "const grid = data.slice(2, 2 + m).map((row) => row.split(\"\"));\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    int m, n;\n    cin >> m >> n;\n    vector<string> grid(m);\n"
                              "    for (auto &row : grid) cin >> row;\n" + TODO_UZ
                   + "    return 0;\n}\n",
        },
        samples=(
            ("4 5\n11000\n11000\n00100\n00011", "3",
             "Chap yuqoridagi katta orol, o'rtadagi bitta katak va o'ng pastdagi juftlik."),
            ("3 3\n111\n010\n111", "1", "Hammasi markaz orqali bog'langan."),
        ),
        hidden_inputs=(
            "1 1\n0",
            "1 1\n1",
            "3 3\n101\n010\n101",
            "4 4\n1111\n1001\n1001\n1111",
            "5 5\n10101\n00000\n10101\n00000\n10101",
        ),
    ),
    # ------------------------------------------------------------------ 10
    SeedProblem(
        slug="kth-eng-katta-element",
        title_uz="K-chi eng katta element",
        title_en="Kth Largest Element",
        difficulty="medium",
        points=30,
        tags=("massiv", "saralash"),
        description_uz="""`n` ta butun sondan iborat massiv va `k` soni berilgan.

Saralangan tartibda **`k`-chi eng katta** elementni toping. Bu `k`-chi *turli*
element emas — takrorlanuvchilar ham sanaladi.

## Kirish

Birinchi qatorda `n` va `k`, ikkinchi qatorda `n` ta son.

## Chiqish

`k`-chi eng katta element.""",
        description_en="""An array of `n` integers and a number `k` are given.

Find the **`k`-th largest** element in sorted order. This is not the `k`-th
*distinct* element — duplicates count.

## Input

First line: `n` and `k`. Second line: `n` integers.

## Output

The `k`-th largest element.""",
        constraints_uz="1 ≤ k ≤ n ≤ 200 000\n-10⁹ ≤ nums[i] ≤ 10⁹",
        constraints_en="1 ≤ k ≤ n ≤ 200 000\n-10⁹ ≤ nums[i] ≤ 10⁹",
        hint_uz="Eng oddiy yechim — saralash. Kattaroq massivlarda `k` o'lchamli min-uyum (heap) "
                "tezroq ishlaydi.",
        hint_en="The simplest solution is sorting. For larger inputs a min-heap of size `k` is faster.",
        editorial_uz="""**Saralash:** massivni kamayish tartibida saralab, `k-1` indeksdagi elementni
olamiz. O(n log n) — bu cheklovlarda yetarli.

**Uyum bilan:** `k` o'lchamli min-uyum saqlaymiz. Har bir yangi element uyum
ildizidan katta bo'lsa — ildizni almashtiramiz. Oxirida ildiz — javob.
O(n log k).

**Quickselect** esa o'rtacha O(n) beradi.""",
        editorial_en="""**Sorting:** sort descending and take index `k-1`. O(n log n) is fine here.

**Heap:** keep a min-heap of size `k`; replace the root whenever a larger element
arrives. The root is the answer. O(n log k).

**Quickselect** gives O(n) on average.""",
        solution_python="""import sys
import heapq

def main():
    data = sys.stdin.read().split()
    n, k = int(data[0]), int(data[1])
    nums = list(map(int, data[2:2 + n]))
    print(heapq.nlargest(k, nums)[-1])

main()
""",
        starter={
            "python": PY_HEAD + "    n, k = int(data[0]), int(data[1])\n"
                                "    nums = list(map(int, data[2:2 + n]))\n" + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const n = Number(data[0]);\nconst k = Number(data[1]);\n"
                                    "const nums = data.slice(2, 2 + n).map(Number);\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    int n, k;\n    cin >> n >> k;\n    vector<long long> nums(n);\n"
                              "    for (auto &x : nums) cin >> x;\n" + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("6 2\n3 2 1 5 6 4", "5", "Saralangan: 6, 5, 4, 3, 2, 1 — ikkinchisi 5."),
            ("9 4\n3 2 3 1 2 4 5 5 6", "4", "Takrorlanuvchilar ham sanaladi."),
        ),
        hidden_inputs=(
            "1 1\n7",
            "5 5\n1 2 3 4 5",
            "5 1\n-5 -4 -3 -2 -1",
            "8 3\n0 0 0 1 1 1 2 2",
            "6 3\n1000000000 -1000000000 0 5 5 5",
        ),
    ),
    # ------------------------------------------------------------------ 11
    SeedProblem(
        slug="kurslar-jadvali",
        title_uz="Kurslar jadvali",
        title_en="Course Schedule",
        difficulty="hard",
        points=50,
        tags=("graf", "saralash"),
        description_uz="""`n` ta kurs bor (`0` dan `n-1` gacha). `m` ta shart berilgan:
`a b` — `a` kursini olishdan oldin `b` kursi tugatilgan bo'lishi kerak.

Barcha kurslarni tugatish **mumkinmi**?

Boshqacha aytganda: shartlar grafida sikl bormi?

## Kirish

Birinchi qatorda `n` va `m`. Keyingi `m` qatorda ikkitadan son: `a` va `b`.

## Chiqish

`YES` — hammasini tugatish mumkin bo'lsa, aks holda `NO`.""",
        description_en="""There are `n` courses (`0` to `n-1`) and `m` prerequisites:
`a b` means course `b` must be finished before course `a`.

Is it **possible** to finish all courses?

In other words: does the prerequisite graph contain a cycle?

## Input

First line: `n` and `m`. Then `m` lines with two integers `a` and `b`.

## Output

`YES` if all courses can be finished, otherwise `NO`.""",
        constraints_uz="1 ≤ n ≤ 100 000\n0 ≤ m ≤ 200 000",
        constraints_en="1 ≤ n ≤ 100 000\n0 ≤ m ≤ 200 000",
        hint_uz="Kirish darajasi (in-degree) nol bo'lgan tugunlardan boshlab, ularni birma-bir "
                "olib tashlang (Kahn algoritmi). Hamma tugun olib tashlansa — sikl yo'q.",
        hint_en="Start from nodes with in-degree zero and remove them one by one (Kahn's "
                "algorithm). If every node is removed there is no cycle.",
        editorial_uz="""Bu — **topologik saralash** masalasi. Kahn algoritmi:

1. har bir tugun uchun kirish darajasini hisoblaymiz;
2. darajasi `0` bo'lganlarni navbatga solamiz;
3. navbatdan tugun olib, uning qo'shnilarining darajasini `1` ga kamaytiramiz;
   daraja `0` bo'lsa — navbatga qo'shamiz.

Agar oxirida qayta ishlangan tugunlar soni `n` ga teng bo'lsa — sikl yo'q,
javob `YES`.

Vaqt: **O(n + m)**.""",
        editorial_en="""This is **topological sorting**. Kahn's algorithm:

1. compute the in-degree of every node;
2. enqueue all nodes with in-degree `0`;
3. pop a node and decrement its neighbours' in-degrees; enqueue any that reach `0`.

If the number of processed nodes equals `n` there is no cycle, so the answer is `YES`.

Time: **O(n + m)**.""",
        solution_python="""import sys
from collections import deque

def main():
    data = sys.stdin.buffer.read().split()
    n, m = int(data[0]), int(data[1])
    adjacency = [[] for _ in range(n)]
    indegree = [0] * n
    for index in range(m):
        a = int(data[2 + index * 2])
        b = int(data[3 + index * 2])
        adjacency[b].append(a)
        indegree[a] += 1

    queue = deque(node for node in range(n) if indegree[node] == 0)
    processed = 0
    while queue:
        node = queue.popleft()
        processed += 1
        for neighbour in adjacency[node]:
            indegree[neighbour] -= 1
            if indegree[neighbour] == 0:
                queue.append(neighbour)

    print("YES" if processed == n else "NO")

main()
""",
        starter={
            "python": "import sys\n\ndef main():\n    data = sys.stdin.buffer.read().split()\n"
                      "    n, m = int(data[0]), int(data[1])\n" + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const n = Number(data[0]);\nconst m = Number(data[1]);\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    int n, m;\n    cin >> n >> m;\n" + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("2 1\n1 0", "YES", "Avval 0-kurs, keyin 1-kurs — muammo yo'q."),
            ("2 2\n1 0\n0 1", "NO", "Ikkalasi bir-birini kutadi — sikl."),
        ),
        hidden_inputs=(
            "1 0",
            "4 4\n1 0\n2 1\n3 2\n0 3",
            "5 4\n1 0\n2 0\n3 1\n4 2",
            "3 3\n0 1\n1 2\n2 0",
            "6 3\n1 0\n3 2\n5 4",
        ),
        time_limit_ms=3000,
    ),
    # ------------------------------------------------------------------ 12
    SeedProblem(
        slug="palindrom-son",
        title_uz="Palindrom son",
        title_en="Palindrome Number",
        difficulty="easy",
        points=10,
        tags=("matematika",),
        description_uz="""`x` butun soni berilgan. U **palindrommi**?

Palindrom — o'ngdan chapga o'qilganda ham bir xil bo'ladigan son (masalan `121`).
Manfiy sonlar palindrom emas: `-121` teskarisiga `121-` bo'ladi.

## Kirish

Bitta butun son `x`.

## Chiqish

`YES` yoki `NO`.""",
        description_en="""An integer `x` is given. Is it a **palindrome**?

A palindrome reads the same backwards (for example `121`). Negative numbers are
not palindromes: `-121` reversed is `121-`.

## Input

A single integer `x`.

## Output

`YES` or `NO`.""",
        constraints_uz="-10¹⁸ ≤ x ≤ 10¹⁸",
        constraints_en="-10¹⁸ ≤ x ≤ 10¹⁸",
        hint_uz="Sonni satrga aylantirib teskarisiga solishtiring — yoki raqamlarni "
                "matematik yo'l bilan teskari tartibda yig'ing.",
        hint_en="Convert to a string and compare with its reverse — or rebuild the number "
                "digit by digit in reverse.",
        editorial_uz="""Eng oddiy yechim — satr: `s == s[::-1]`.

Matematik yechim: sonning yarmini teskari tartibda yig'ib boramiz va qolgan
yarmi bilan solishtiramiz — bu to'lib ketishning (overflow) oldini oladi.

Manfiy sonlar uchun darrov `NO`.

Vaqt: **O(log x)**.""",
        editorial_en="""The simplest solution uses a string: `s == s[::-1]`.

Mathematically: rebuild half of the number in reverse and compare it with the
other half — this avoids overflow.

Negative numbers are an immediate `NO`.

Time: **O(log x)**.""",
        solution_python="""import sys

def main():
    raw = sys.stdin.read().split()[0]
    value = int(raw)
    if value < 0:
        print("NO")
        return
    digits = str(value)
    print("YES" if digits == digits[::-1] else "NO")

main()
""",
        starter={
            "python": "import sys\n\ndef main():\n    x = int(sys.stdin.read().split()[0])\n"
                      + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const x = data[0];\n// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    long long x;\n    cin >> x;\n" + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("121", "YES", "121 teskarisiga ham 121."),
            ("-121", "NO", "Manfiy sonlar palindrom emas."),
        ),
        hidden_inputs=("0", "10", "1221", "1000000001", "123456789987654321", "-1"),
    ),
]


TAG_DEFINITIONS = [
    ("massiv", "Massiv", "Array", "#10b981"),
    ("xesh-jadval", "Xesh-jadval", "Hash Table", "#059669"),
    ("ikki-korsatkich", "Ikki ko'rsatkich", "Two Pointers", "#34d399"),
    ("dinamik-dasturlash", "Dinamik dasturlash", "Dynamic Programming", "#047857"),
    ("graf", "Graf", "Graph", "#6ee7b7"),
    ("saralash", "Saralash", "Sorting", "#065f46"),
    ("ikkilik-qidiruv", "Ikkilik qidiruv", "Binary Search", "#22c55e"),
    ("satr", "Satr", "String", "#16a34a"),
    ("stek", "Stek", "Stack", "#15803d"),
    ("matematika", "Matematika", "Math", "#14b8a6"),
]

