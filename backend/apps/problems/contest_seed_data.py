"""Musobaqa masalalari — seed uchun.

Bular `is_contest_only=True`: amaliyot ro'yxatida ko'rinmaydi va faqat
musobaqa doirasida yechiladi. Musobaqaga aynan shunday masalalar qo'shiladi
(`ContestProblemSerializer.validate_problem`), aks holda ishtirokchilar
masalani musobaqadan oldin yechib olishlari mumkin bo'lardi.
"""
from __future__ import annotations

from .seed_data import CPP_HEAD, JS_HEAD, PY_HEAD, TODO_PY, TODO_UZ, SeedProblem

CONTEST_PROBLEMS: list[SeedProblem] = [
    # ------------------------------------------------------------------ A
    SeedProblem(
        slug="raqamlar-yigindisi-c",
        title_uz="Raqamlar yig'indisi",
        title_en="Digit Sum",
        difficulty="easy",
        points=100,
        tags=("matematika",),
        is_contest_only=True,
        description_uz="""`n` sonining raqamlari yig'indisini toping.

## Kirish

Bitta butun son `n` (manfiy bo'lishi mumkin).

## Chiqish

Raqamlar yig'indisi. Manfiy sonda minus belgisi hisobga olinmaydi.""",
        description_en="""Find the sum of the digits of `n`.

## Input

A single integer `n` (may be negative).

## Output

The digit sum. The minus sign is ignored.""",
        constraints_uz="-10¹⁸ ≤ n ≤ 10¹⁸",
        constraints_en="-10¹⁸ ≤ n ≤ 10¹⁸",
        hint_uz="Sonni satrga aylantirib, har bir belgini raqamga o'giring.",
        hint_en="Convert the number to a string and map each character to a digit.",
        editorial_uz="""Sonning modulini olib satrga aylantiramiz va raqamlarni qo'shamiz.

Vaqt: **O(log n)**.""",
        editorial_en="""Take the absolute value, convert to a string and sum the digits.

Time: **O(log n)**.""",
        solution_python="""import sys

def main():
    raw = sys.stdin.read().split()[0]
    print(sum(int(ch) for ch in raw if ch.isdigit()))

main()
""",
        starter={
            "python": "import sys\n\ndef main():\n    n = int(sys.stdin.read().split()[0])\n"
                      + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const n = data[0];\n// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    long long n;\n    cin >> n;\n" + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("1234", "10", "1 + 2 + 3 + 4 = 10."),
            ("-905", "14", "9 + 0 + 5 = 14."),
        ),
        hidden_inputs=("0", "9", "1000000000000000000", "-999999999", "58"),
    ),
    # ------------------------------------------------------------------ B
    SeedProblem(
        slug="juft-toq-ajratish-c",
        title_uz="Juft va toq sonlar",
        title_en="Split Even and Odd",
        difficulty="easy",
        points=150,
        tags=("massiv", "saralash"),
        is_contest_only=True,
        description_uz="""`n` ta butun son berilgan. Avval barcha **juft**, keyin barcha **toq**
sonlarni chiqaring. Har bir guruh ichida tartib o'sish bo'yicha bo'lsin.

## Kirish

Birinchi qatorda `n`, ikkinchi qatorda `n` ta son.

## Chiqish

Bitta qatorda bo'sh joy bilan ajratilgan sonlar.""",
        description_en="""Given `n` integers, print all **even** numbers first, then all **odd**
numbers. Sort each group in increasing order.

## Input

First line: `n`. Second line: `n` integers.

## Output

One line with the numbers separated by spaces.""",
        constraints_uz="1 ≤ n ≤ 100 000\n-10⁹ ≤ nums[i] ≤ 10⁹",
        constraints_en="1 ≤ n ≤ 100 000\n-10⁹ ≤ nums[i] ≤ 10⁹",
        hint_uz="Ikki ro'yxatga ajratib, ikkalasini alohida saralang.",
        hint_en="Split into two lists and sort each one separately.",
        editorial_uz="""Sonlarni juft va toq ro'yxatlarga ajratamiz, ikkalasini saralab
birlashtiramiz. Pythonda `x % 2 == 0` manfiy sonlar uchun ham to'g'ri ishlaydi.

Vaqt: **O(n log n)**.""",
        editorial_en="""Split into even and odd lists, sort both and concatenate. In Python
`x % 2 == 0` behaves correctly for negative numbers too.

Time: **O(n log n)**.""",
        solution_python="""import sys

def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    evens = sorted(x for x in nums if x % 2 == 0)
    odds = sorted(x for x in nums if x % 2 != 0)
    print(" ".join(map(str, evens + odds)))

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
            ("6\n5 2 9 4 1 8", "2 4 8 1 5 9", "Juftlar: 2, 4, 8. Toqlar: 1, 5, 9."),
            ("3\n7 7 2", "2 7 7", "Takrorlanuvchi sonlar ham saqlanadi."),
        ),
        hidden_inputs=(
            "1\n1",
            "1\n2",
            "5\n-4 -3 -2 -1 0",
            "8\n10 9 8 7 6 5 4 3",
            "4\n1000000000 -1000000000 3 -3",
        ),
    ),
    # ------------------------------------------------------------------ C
    SeedProblem(
        slug="matritsa-diagonali-c",
        title_uz="Matritsa diagonali",
        title_en="Matrix Diagonal",
        difficulty="medium",
        points=200,
        tags=("massiv", "matematika"),
        is_contest_only=True,
        description_uz="""`n × n` o'lchamdagi butun sonli matritsa berilgan.

Bosh diagonal (chap yuqoridan o'ng pastga) va yon diagonal (o'ng yuqoridan
chap pastga) yig'indilari **farqining modulini** toping.

## Kirish

Birinchi qatorda `n`. Keyingi `n` qatorda `n` tadan son.

## Chiqish

|bosh − yon|.""",
        description_en="""An `n × n` integer matrix is given.

Print the **absolute difference** between the sum of the primary diagonal
(top-left to bottom-right) and the secondary diagonal (top-right to bottom-left).

## Input

First line: `n`. Then `n` lines with `n` integers each.

## Output

|primary − secondary|.""",
        constraints_uz="1 ≤ n ≤ 500\n-10⁶ ≤ a[i][j] ≤ 10⁶",
        constraints_en="1 ≤ n ≤ 500\n-10⁶ ≤ a[i][j] ≤ 10⁶",
        hint_uz="`i`-qatorda bosh diagonal `a[i][i]`, yon diagonal esa `a[i][n-1-i]`.",
        hint_en="In row `i` the primary diagonal is `a[i][i]` and the secondary is `a[i][n-1-i]`.",
        editorial_uz="""Bitta yurishda ikkala diagonalni yig'amiz: `i` qator uchun `a[i][i]` va
`a[i][n-1-i]`. Toq `n` da markaziy element ikkala yig'indiga ham kiradi va
farqda qisqaradi — bu to'g'ri natija beradi.

Vaqt: **O(n)** (matritsani o'qishdan tashqari).""",
        editorial_en="""Sum both diagonals in one pass: for row `i` take `a[i][i]` and
`a[i][n-1-i]`. For odd `n` the centre element is in both sums and cancels out in
the difference — which is the correct result.

Time: **O(n)** beyond reading the matrix.""",
        solution_python="""import sys

def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    values = list(map(int, data[1:1 + n * n]))
    primary = secondary = 0
    for i in range(n):
        primary += values[i * n + i]
        secondary += values[i * n + (n - 1 - i)]
    print(abs(primary - secondary))

main()
""",
        starter={
            "python": PY_HEAD + "    n = int(data[0])\n"
                                "    values = list(map(int, data[1:1 + n * n]))\n"
                      + TODO_PY + "\nmain()\n",
            "javascript": JS_HEAD + "const n = Number(data[0]);\n"
                                    "const values = data.slice(1, 1 + n * n).map(Number);\n"
                                    "// Yechimingizni shu yerga yozing\n",
            "cpp": CPP_HEAD + "    int n;\n    cin >> n;\n    vector<long long> v(n * n);\n"
                              "    for (auto &x : v) cin >> x;\n" + TODO_UZ + "    return 0;\n}\n",
        },
        samples=(
            ("3\n1 2 3\n4 5 6\n9 8 9", "2", "Bosh: 1+5+9=15, yon: 3+5+9=17 — farq 2."),
            ("1\n7", "0", "Yagona element ikkala diagonalda ham."),
        ),
        hidden_inputs=(
            "2\n1 2\n3 4",
            "4\n1 0 0 1\n0 1 1 0\n0 1 1 0\n1 0 0 1",
            "3\n-1 -2 -3\n-4 -5 -6\n-7 -8 -9",
            "5\n1 1 1 1 1\n1 1 1 1 1\n1 1 1 1 1\n1 1 1 1 1\n1 1 1 1 1",
        ),
    ),
    # ------------------------------------------------------------------ D
    SeedProblem(
        slug="eng-uzun-ketma-ketlik-c",
        title_uz="Eng uzun o'suvchi ketma-ketlik",
        title_en="Longest Increasing Run",
        difficulty="medium",
        points=250,
        tags=("massiv",),
        is_contest_only=True,
        description_uz="""`n` ta sondan iborat massivda **qat'iy o'suvchi** eng uzun ketma-ket
qism-massiv uzunligini toping.

## Kirish

Birinchi qatorda `n`, ikkinchi qatorda `n` ta son.

## Chiqish

Eng uzun o'suvchi qism-massiv uzunligi.""",
        description_en="""Find the length of the longest **strictly increasing** contiguous
subarray of `n` integers.

## Input

First line: `n`. Second line: `n` integers.

## Output

The length of the longest increasing run.""",
        constraints_uz="1 ≤ n ≤ 200 000\n-10⁹ ≤ nums[i] ≤ 10⁹",
        constraints_en="1 ≤ n ≤ 200 000\n-10⁹ ≤ nums[i] ≤ 10⁹",
        hint_uz="Joriy ketma-ketlik uzunligini saqlang: element oldingisidan katta bo'lsa "
                "oshiring, aks holda 1 ga qaytaring.",
        hint_en="Track the current run length: extend it when the element is greater than the "
                "previous one, otherwise reset to 1.",
        editorial_uz="""Bitta yurish yetarli. `current` — shu elementda tugaydigan o'suvchi
ketma-ketlik uzunligi:

```
current = current + 1 if nums[i] > nums[i-1] else 1
best = max(best, current)
```

Vaqt: **O(n)**, xotira: **O(1)**.""",
        editorial_en="""A single pass is enough. `current` is the length of the increasing run
ending at the current element:

```
current = current + 1 if nums[i] > nums[i-1] else 1
best = max(best, current)
```

Time: **O(n)**, memory: **O(1)**.""",
        solution_python="""import sys

def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    best = current = 1
    for index in range(1, n):
        current = current + 1 if nums[index] > nums[index - 1] else 1
        best = max(best, current)
    print(best)

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
            ("7\n1 2 3 1 2 3 4", "4", "Oxirgi [1, 2, 3, 4] — uzunligi 4."),
            ("4\n5 4 3 2", "1", "Hech qayerda o'sish yo'q."),
        ),
        hidden_inputs=(
            "1\n42",
            "5\n1 2 3 4 5",
            "6\n2 2 2 2 2 2",
            "8\n-5 -4 0 1 -1 0 1 2",
            "3\n1 1 2",
        ),
    ),
]
