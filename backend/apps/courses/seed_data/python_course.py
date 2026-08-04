"""«Python asoslari» kursining to'liq kontenti.

Kontent kod ichida saqlanadi (JSON yoki fixture emas), chunki u kod
bloklari bilan aralashgan: fixture'da har bir yangi qator `\\n` bo'lib
ketardi va matnni tahrirlash imkonsiz bo'lardi. Bu yerda esa oddiy
uchtirnoqli satr — misolni ko'chirib olib, darhol ishga tushirish mumkin.
"""

COURSE = {
    "slug": "python-asoslari",
    "title_uz": "Python asoslari",
    "subtitle_uz": "Noldan boshlab: birinchi dasturdan funksiyalargacha",
    "language": "python",
    "level": "beginner",
    "badge": "Py",
    "accent_color": "#3776ab",
    "estimated_hours": 14,
    "order": 1,
    "is_featured": True,
    "description_uz": """
Python — o'rganish uchun eng qulay dasturlash tillaridan biri. Sintaksisi sodda, kod deyarli ingliz tilidagi gapga o'xshaydi, shuning uchun e'tiboringiz qavslar va nuqta-vergullarga emas, mantiqning o'ziga qaratiladi.

Bu kursda siz:

- birinchi dasturingizni yozasiz va uni shu yerning o'zida ishga tushirasiz;
- o'zgaruvchilar, sonlar, satrlar va ro'yxatlar bilan ishlashni o'rganasiz;
- shart va sikllar yordamida dasturga qaror qabul qilishni o'rgatasiz;
- har bir mavzu oxirida test yechasiz va kod yozib topshiriq bajarasiz.

Hech narsa o'rnatish shart emas: kod brauzerda yoziladi, serverda bajariladi.
""".strip(),
    "modules": [
        # ============================================================ 1-bo'lim
        {
            "slug": "kirish",
            "title_uz": "Kirish",
            "summary_uz": "Birinchi dastur, chiqarish va izohlar",
            "lessons": [
                {
                    "slug": "python-bilan-tanishuv",
                    "title_uz": "Python bilan tanishuv",
                    "summary_uz": "Birinchi dastur va print() funksiyasi",
                    "estimated_minutes": 8,
                    "content_md": """
## Python nima?

Python — 1991-yilda Gvido van Rossum yaratgan dasturlash tili. Bugun u veb-saytlar, sun'iy intellekt, ma'lumotlar tahlili va avtomatlashtirish uchun ishlatiladi.

Nega aynan Pythondan boshlash qulay:

- **Sodda sintaksis.** Kodni o'qish oddiy matn o'qishga yaqin.
- **Ortiqcha belgilar yo'q.** Nuqta-vergul qo'yish shart emas, blok chegarasi
qavs bilan emas, **bo'shliq** bilan belgilanadi.
- **Katta jamoa.** Deyarli har qanday vazifa uchun tayyor kutubxona bor.

## Birinchi dastur

Ekranga matn chiqarish uchun `print()` funksiyasi ishlatiladi. Chiqarilishi kerak bo'lgan matn qavs ichida, qo'shtirnoq orasida yoziladi:

```python
print("Salom, dunyo!")
```

Bu dastur bitta qator chiqaradi: `Salom, dunyo!`

## print() haqida yana bir necha narsa

`print()` bir nechta qiymatni ham chiqara oladi — ular vergul bilan ajratiladi va orasiga avtomatik bo'shliq qo'yiladi:

```python
print("Yosh:", 15)
```

Har bir `print()` chaqiruvi yangi qatordan boshlanadi.
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Salom, dunyo!",
                            "code": 'print("Salom, dunyo!")',
                            "expected_output": "Salom, dunyo!",
                            "explanation_uz": "Qo'shtirnoq ichidagi matn **satr** deb ataladi. `print()` uni ekranga chiqaradi.",
                        },
                        {
                            "title_uz": "Bir nechta qiymat",
                            "code": 'print("Ism:", "Ali")\nprint("Yosh:", 15)\nprint(2 + 3)',
                            "expected_output": "Ism: Ali\nYosh: 15\n5",
                            "explanation_uz": "Vergul bilan ajratilgan qiymatlar orasiga bo'shliq qo'yiladi. Qo'shtirnoqsiz yozilgan `2 + 3` esa avval hisoblanadi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Ekranga matn chiqarish uchun qaysi funksiya ishlatiladi?",
                            "options": ["print()", "echo()", "write()", "show()"],
                            "correct_index": 0,
                            "explanation_uz": "Pythonda chiqarish uchun `print()` ishlatiladi. `echo` — PHP va bash tilidagi buyruq.",
                        },
                        {
                            "question_uz": "`print(\"Yosh:\", 15)` nima chiqaradi?",
                            "options": ["Yosh:15", "Yosh: 15", "Yosh: \"15\"", "Xatolik"],
                            "correct_index": 1,
                            "explanation_uz": "Vergul bilan ajratilgan qiymatlar orasiga avtomatik bitta bo'shliq qo'yiladi.",
                        },
                        {
                            "question_uz": "Pythonda qator oxiriga nuqta-vergul (`;`) qo'yish shartmi?",
                            "options": ["Ha, har doim", "Yo'q, shart emas", "Faqat funksiyalarda", "Faqat sikllarda"],
                            "correct_index": 1,
                            "explanation_uz": "Pythonda qator oxiri buyruqning tugaganini bildiradi — nuqta-vergul kerak emas.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Ekranga ism chiqaring",
                            "prompt_md": "`print()` yordamida ekranga aynan `Salom, CodeArena!` matnini chiqaring.",
                            "starter_code": '# Shu yerga kod yozing\n',
                            "solution_code": 'print("Salom, CodeArena!")',
                            "hint_uz": "Matn qo'shtirnoq ichida yoziladi: `print(\"...\")`.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "Salom, CodeArena!", "is_sample": True,
                                 "explanation_uz": "Dastur hech narsa so'ramaydi, faqat bitta qator chiqaradi."},
                            ],
                        },
                        {
                            "title_uz": "Uchta qator",
                            "prompt_md": "Uchta alohida `print()` bilan quyidagi uch qatorni chiqaring:\n\n```\nMen Python o'rganyapman\nBu mening birinchi dasturim\n2026\n```",
                            "starter_code": "",
                            "solution_code": 'print("Men Python o\'rganyapman")\nprint("Bu mening birinchi dasturim")\nprint(2026)',
                            "hint_uz": "Har bir `print()` yangi qatordan chiqadi. Son qo'shtirnoqsiz yoziladi.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "Men Python o'rganyapman\nBu mening birinchi dasturim\n2026", "is_sample": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "izohlar-va-sintaksis",
                    "title_uz": "Izohlar va sintaksis",
                    "summary_uz": "Kodga izoh yozish va Pythondagi bo'shliq qoidasi",
                    "estimated_minutes": 7,
                    "content_md": """
## Izoh nima?

Izoh — kod ichidagi, dastur bajarmaydigan matn. U kodni **odam** uchun tushuntiradi. Pythonda izoh `#` belgisidan boshlanadi:

```python
# Bu qator bajarilmaydi
print("Salom")  # bu esa qator oxiridagi izoh
```

Izohlar nima uchun kerak:

- murakkab qismning **nima uchun** shunday yozilganini tushuntiradi;
- kodning bir qismini vaqtincha o'chirib turishga yordam beradi.

## Bo'shliq (otstup) muhim

Ko'p tillarda blok `{ }` bilan chegaralanadi. Pythonda esa **chapdagi bo'shliq** bloklarni belgilaydi. Odatda 4 ta probel ishlatiladi:

```python
if 5 > 3:
    print("Besh uchdan katta")
    print("Bu ham shart ichida")
print("Bu esa shartdan tashqarida")
```

Agar bo'shliq noto'g'ri bo'lsa, Python `IndentationError` xatosini beradi.

## Katta-kichik harf farqlanadi

`Print` va `print` — ikki xil nom. Python katta va kichik harfni farqlaydi, shuning uchun funksiya nomi aynan `print` bo'lishi kerak.
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Izoh bajarilmaydi",
                            "code": '# Bu izoh — hech narsa qilmaydi\nprint("Bir")\n# print("Ikki")\nprint("Uch")',
                            "expected_output": "Bir\nUch",
                            "explanation_uz": "Ikkinchi `print` izohga aylantirilgani uchun bajarilmadi.",
                        },
                        {
                            "title_uz": "Blok va bo'shliq",
                            "code": 'if 5 > 3:\n    print("Ichkarida")\nprint("Tashqarida")',
                            "expected_output": "Ichkarida\nTashqarida",
                            "explanation_uz": "Ichkariga surilgan qator shart bajarilgandagina ishlaydi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Pythonda izoh qaysi belgidan boshlanadi?",
                            "options": ["//", "#", "/*", "--"],
                            "correct_index": 1,
                            "explanation_uz": "`#` belgisidan qator oxirigacha bo'lgan matn izoh hisoblanadi.",
                        },
                        {
                            "question_uz": "Pythonda blok qanday belgilanadi?",
                            "options": ["`{}` qavslar bilan", "`begin/end` so'zlari bilan", "Chapdagi bo'shliq bilan", "Nuqta-vergul bilan"],
                            "correct_index": 2,
                            "explanation_uz": "Python bloklarni otstup (chapdagi bo'shliq) orqali aniqlaydi.",
                        },
                        {
                            "question_uz": "`Print(\"Salom\")` kodi nima bo'ladi?",
                            "options": ["Salom chiqaradi", "Xatolik beradi", "Bo'sh qator chiqaradi", "Izoh sifatida o'tadi"],
                            "correct_index": 1,
                            "explanation_uz": "Python katta-kichik harfni farqlaydi: `Print` degan funksiya yo'q — `NameError` chiqadi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Izohli dastur",
                            "prompt_md": "Kodni to'g'rilang: dastur faqat `Ikkinchi qator` matnini chiqarsin. Birinchi `print` ni izohga aylantiring.",
                            "starter_code": 'print("Birinchi qator")\nprint("Ikkinchi qator")',
                            "solution_code": '# print("Birinchi qator")\nprint("Ikkinchi qator")',
                            "hint_uz": "Qator boshiga `#` qo'ying.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "Ikkinchi qator", "is_sample": True},
                            ],
                        },
                    ],
                },
            ],
        },
        # ============================================================ 2-bo'lim
        {
            "slug": "ozgaruvchilar-va-turlar",
            "title_uz": "O'zgaruvchilar va ma'lumot turlari",
            "summary_uz": "Qiymat saqlash, sonlar, satrlar va kiritish",
            "lessons": [
                {
                    "slug": "ozgaruvchilar",
                    "title_uz": "O'zgaruvchilar",
                    "summary_uz": "Qiymatni nom bilan saqlash",
                    "estimated_minutes": 10,
                    "content_md": """
## O'zgaruvchi nima?

O'zgaruvchi — qiymat saqlanadigan nomli quti. Qiymat `=` belgisi bilan beriladi:

```python
ism = "Ali"
yosh = 15
boy = 1.72
```

Pythonda o'zgaruvchining turini oldindan e'lon qilish shart emas — u berilgan qiymatdan avtomatik aniqlanadi.

## Nomlash qoidalari

- nom harf yoki `_` bilan boshlanadi (raqam bilan **emas**);
- bo'shliq ishlatilmaydi, o'rniga pastki chiziq: `talaba_yoshi`;
- katta-kichik harf farqlanadi: `Yosh` va `yosh` — ikki xil o'zgaruvchi;
- `print`, `if`, `for` kabi kalit so'zlarni nom sifatida ishlatib bo'lmaydi.

## Qiymatni almashtirish

O'zgaruvchiga istalgan payt yangi qiymat berish mumkin — eskisi yo'qoladi:

```python
ball = 10
ball = ball + 5
print(ball)   # 15
```

## Turni bilish

`type()` funksiyasi qiymat qaysi turga tegishli ekanini aytadi:

```python
print(type(15))       # <class 'int'>
print(type(1.72))     # <class 'float'>
print(type("Ali"))    # <class 'str'>
print(type(True))     # <class 'bool'>
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Qiymat saqlash",
                            "code": 'ism = "Ali"\nyosh = 15\nprint(ism, yosh)',
                            "expected_output": "Ali 15",
                            "explanation_uz": "`=` belgisi o'ngdagi qiymatni chapdagi nomga bog'laydi.",
                        },
                        {
                            "title_uz": "Qiymatni yangilash",
                            "code": "ball = 10\nball = ball + 5\nprint(ball)",
                            "expected_output": "15",
                            "explanation_uz": "Avval o'ng tomon hisoblanadi (10 + 5), keyin natija `ball` ga yoziladi.",
                        },
                        {
                            "title_uz": "Turni tekshirish",
                            "code": 'print(type(15))\nprint(type(1.72))\nprint(type("Ali"))',
                            "expected_output": "<class 'int'>\n<class 'float'>\n<class 'str'>",
                            "explanation_uz": "`int` — butun son, `float` — kasrli son, `str` — satr.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Qaysi o'zgaruvchi nomi noto'g'ri?",
                            "options": ["talaba_yoshi", "_ball", "2chi_son", "ismFamiliya"],
                            "correct_index": 2,
                            "explanation_uz": "O'zgaruvchi nomi raqam bilan boshlanmaydi.",
                        },
                        {
                            "question_uz": "`x = 5` dan keyin `x = \"besh\"` yozilsa nima bo'ladi?",
                            "options": ["Xatolik", "x endi satr bo'ladi", "x 5 bo'lib qoladi", "Ikkala qiymat saqlanadi"],
                            "correct_index": 1,
                            "explanation_uz": "Pythonda o'zgaruvchi turi qat'iy emas — yangi qiymat eskisini butunlay almashtiradi.",
                        },
                        {
                            "question_uz": "`type(3.14)` nima qaytaradi?",
                            "options": ["int", "float", "str", "double"],
                            "correct_index": 1,
                            "explanation_uz": "Kasrli sonlar `float` turiga tegishli. Pythonda `double` degan tur yo'q.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Uchta o'zgaruvchi",
                            "prompt_md": "Uchta o'zgaruvchi yarating va ularni bitta `print()` bilan chiqaring:\n\n- `ism` = `Dilnoza`\n- `yosh` = `16`\n- `shahar` = `Toshkent`\n\nKutilgan chiqish:\n\n```\nDilnoza 16 Toshkent\n```",
                            "starter_code": "ism = \nyosh = \nshahar = \n\nprint(ism, yosh, shahar)",
                            "solution_code": 'ism = "Dilnoza"\nyosh = 16\nshahar = "Toshkent"\n\nprint(ism, yosh, shahar)',
                            "hint_uz": "Matn qo'shtirnoqda, son qo'shtirnoqsiz yoziladi.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "Dilnoza 16 Toshkent", "is_sample": True},
                            ],
                        },
                        {
                            "title_uz": "Ballni oshiring",
                            "prompt_md": "`ball` o'zgaruvchisi 40 ga teng. Uni avval 10 ga oshiring, so'ng 2 ga ko'paytiring va natijani chiqaring.\n\nKutilgan chiqish: `100`",
                            "starter_code": "ball = 40\n# ball ni o'zgartiring\n\nprint(ball)",
                            "solution_code": "ball = 40\nball = ball + 10\nball = ball * 2\n\nprint(ball)",
                            "hint_uz": "(40 + 10) * 2 = 100. Har bir amaldan keyin natijani `ball` ga qaytadan yozing.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "100", "is_sample": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "sonlar-va-amallar",
                    "title_uz": "Sonlar va arifmetik amallar",
                    "summary_uz": "Qo'shish, bo'lish, qoldiq va daraja",
                    "estimated_minutes": 10,
                    "content_md": """
## Ikki xil son

- `int` — butun son: `7`, `-3`, `1000`
- `float` — kasrli son: `3.14`, `-0.5`, `2.0`

## Asosiy amallar

| Amal | Belgi | Misol | Natija |
|------|-------|-------|--------|
| Qo'shish | `+` | `7 + 2` | `9` |
| Ayirish | `-` | `7 - 2` | `5` |
| Ko'paytirish | `*` | `7 * 2` | `14` |
| Bo'lish | `/` | `7 / 2` | `3.5` |
| Butun bo'lish | `//` | `7 // 2` | `3` |
| Qoldiq | `%` | `7 % 2` | `1` |
| Daraja | `**` | `7 ** 2` | `49` |

**Diqqat:** `/` har doim `float` qaytaradi, hatto `6 / 3` ham `2.0` bo'ladi. Butun natija kerak bo'lsa `//` ishlatiladi.

## Qoldiq nima uchun kerak?

`%` amali sonning juft yoki toqligini aniqlashda eng ko'p ishlatiladi: son 2 ga bo'linganda qoldiq `0` bo'lsa — juft.

```python
print(10 % 2)   # 0  → juft
print(7 % 2)    # 1  → toq
```

## Amallar tartibi

Matematikadagi kabi: avval `**`, keyin `*`, `/`, `//`, `%`, oxirida `+` va `-`. Tartibni o'zgartirish uchun qavs ishlatiladi:

```python
print(2 + 3 * 4)     # 14
print((2 + 3) * 4)   # 20
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Barcha amallar",
                            "code": "a = 7\nb = 2\nprint(a + b)\nprint(a / b)\nprint(a // b)\nprint(a % b)\nprint(a ** b)",
                            "expected_output": "9\n3.5\n3\n1\n49",
                            "explanation_uz": "`/` kasrli natija beradi, `//` butun qismini oladi, `%` qoldiqni qaytaradi.",
                        },
                        {
                            "title_uz": "Qavslar tartibni o'zgartiradi",
                            "code": "print(2 + 3 * 4)\nprint((2 + 3) * 4)",
                            "expected_output": "14\n20",
                            "explanation_uz": "Qavssiz ko'paytirish birinchi bajariladi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`9 // 2` natijasi nima?",
                            "options": ["4.5", "4", "5", "1"],
                            "correct_index": 1,
                            "explanation_uz": "`//` butun bo'lish: kasr qismi tashlab yuboriladi.",
                        },
                        {
                            "question_uz": "`10 % 3` natijasi nima?",
                            "options": ["3", "3.33", "1", "0"],
                            "correct_index": 2,
                            "explanation_uz": "10 ni 3 ga bo'lganda butun qism 3, qoldiq esa 1.",
                        },
                        {
                            "question_uz": "`6 / 3` qaysi turdagi qiymat qaytaradi?",
                            "options": ["int (2)", "float (2.0)", "str ('2')", "bool"],
                            "correct_index": 1,
                            "explanation_uz": "Pythonda `/` doim `float` qaytaradi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "To'rtburchak yuzasi va perimetri",
                            "prompt_md": "Tomonlari `a = 12` va `b = 5` bo'lgan to'rtburchakning yuzasi va perimetrini hisoblang.\n\nKutilgan chiqish:\n\n```\n60\n34\n```",
                            "starter_code": "a = 12\nb = 5\n\n# yuza va perimetrni hisoblang",
                            "solution_code": "a = 12\nb = 5\n\nprint(a * b)\nprint(2 * (a + b))",
                            "hint_uz": "Yuza = a * b, perimetr = 2 * (a + b).",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "60\n34", "is_sample": True},
                            ],
                        },
                        {
                            "title_uz": "Soniyalarni ajrating",
                            "prompt_md": "`vaqt = 3725` soniya berilgan. Uni soat, daqiqa va soniyaga ajrating va uchta alohida qatorda chiqaring.\n\nKutilgan chiqish:\n\n```\n1\n2\n5\n```",
                            "starter_code": "vaqt = 3725\n",
                            "solution_code": "vaqt = 3725\n\nprint(vaqt // 3600)\nprint(vaqt % 3600 // 60)\nprint(vaqt % 60)",
                            "hint_uz": "1 soat = 3600 soniya. Soat uchun `//`, qolgani uchun `%` dan foydalaning.",
                            "points": 10,
                            "tests": [
                                {"input": "", "expected_output": "1\n2\n5", "is_sample": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "satrlar",
                    "title_uz": "Satrlar (str)",
                    "summary_uz": "Matn bilan ishlash, birlashtirish va f-satrlar",
                    "estimated_minutes": 12,
                    "content_md": """
## Satr nima?

Satr — qo'shtirnoq (`"`) yoki bittalik tirnoq (`'`) ichidagi matn:

```python
ism = "Ali"
shahar = 'Buxoro'
```

## Birlashtirish va takrorlash

```python
print("Sa" + "lom")     # Salom
print("ha" * 3)         # hahaha
```

`+` faqat satrni satr bilan qo'sha oladi. `"Yosh: " + 15` xato beradi — sonni avval `str(15)` bilan satrga aylantirish kerak.

## f-satr — eng qulay usul

Satr oldiga `f` qo'yilsa, ichida `{}` orasida o'zgaruvchi ishlatish mumkin:

```python
ism = "Ali"
yosh = 15
print(f"{ism} {yosh} yoshda")   # Ali 15 yoshda
```

## Foydali funksiya va metodlar

```python
matn = "Salom Dunyo"

print(len(matn))          # 11  — belgilar soni
print(matn.upper())       # SALOM DUNYO
print(matn.lower())       # salom dunyo
print(matn.replace("Dunyo", "Olam"))   # Salom Olam
```

## Belgini indeks bilan olish

Har bir belgining o'z tartib raqami bor va **nol**dan boshlanadi:

```python
matn = "Python"
print(matn[0])    # P
print(matn[-1])   # n  — oxirgi belgi
print(matn[0:3])  # Pyt — 0 dan 3 gacha (3 kirmaydi)
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Birlashtirish va takrorlash",
                            "code": 'print("Sa" + "lom")\nprint("ha" * 3)\nprint(len("Python"))',
                            "expected_output": "Salom\nhahaha\n6",
                            "explanation_uz": "`+` satrlarni ulaydi, `*` takrorlaydi, `len()` uzunligini qaytaradi.",
                        },
                        {
                            "title_uz": "f-satr",
                            "code": 'ism = "Ali"\nyosh = 15\nprint(f"{ism} {yosh} yoshda")',
                            "expected_output": "Ali 15 yoshda",
                            "explanation_uz": "f-satr ichida `{}` orasidagi ifoda hisoblanib, natijasi matnga qo'yiladi.",
                        },
                        {
                            "title_uz": "Indeks va kesib olish",
                            "code": 'matn = "Python"\nprint(matn[0])\nprint(matn[-1])\nprint(matn[0:3])',
                            "expected_output": "P\nn\nPyt",
                            "explanation_uz": "Indeks 0 dan boshlanadi, manfiy indeks oxiridan sanaydi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`len(\"CodeArena\")` nima qaytaradi?",
                            "options": ["8", "9", "10", "Xatolik"],
                            "correct_index": 1,
                            "explanation_uz": "«CodeArena» so'zida 9 ta belgi bor.",
                        },
                        {
                            "question_uz": "`\"Yosh: \" + 15` kodi nima bo'ladi?",
                            "options": ["Yosh: 15", "TypeError xatosi", "Yosh: '15'", "Yosh:15"],
                            "correct_index": 1,
                            "explanation_uz": "Satrni songa qo'shib bo'lmaydi — `str(15)` yoki f-satr ishlatiladi.",
                        },
                        {
                            "question_uz": "`\"Python\"[1]` nimani qaytaradi?",
                            "options": ["P", "y", "t", "n"],
                            "correct_index": 1,
                            "explanation_uz": "Indeks 0 dan boshlanadi, demak 1-indeks — ikkinchi belgi, ya'ni `y`.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Tanishtiruv matni",
                            "prompt_md": "Berilgan o'zgaruvchilardan f-satr yordamida quyidagi qatorni yasang:\n\n```\nMening ismim Aziz, men 17 yoshdaman va Samarqandda yashayman.\n```",
                            "starter_code": 'ism = "Aziz"\nyosh = 17\nshahar = "Samarqand"\n\n# f-satr bilan chiqaring',
                            "solution_code": 'ism = "Aziz"\nyosh = 17\nshahar = "Samarqand"\n\nprint(f"Mening ismim {ism}, men {yosh} yoshdaman va {shahar}da yashayman.")',
                            "hint_uz": "`print(f\"... {ism} ... {yosh} ... {shahar}da ...\")` ko'rinishida yozing.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "Mening ismim Aziz, men 17 yoshdaman va Samarqandda yashayman.", "is_sample": True},
                            ],
                        },
                        {
                            "title_uz": "Katta harflar va uzunlik",
                            "prompt_md": "`matn` o'zgaruvchisidagi so'zni katta harflarda va uzunligini alohida qatorlarda chiqaring.\n\nKutilgan chiqish:\n\n```\nDASTURLASH\n10\n```",
                            "starter_code": 'matn = "dasturlash"\n',
                            "solution_code": 'matn = "dasturlash"\n\nprint(matn.upper())\nprint(len(matn))',
                            "hint_uz": "`.upper()` metodi va `len()` funksiyasidan foydalaning.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "DASTURLASH\n10", "is_sample": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "kiritish-va-turlar",
                    "title_uz": "Ma'lumot kiritish va turni o'zgartirish",
                    "summary_uz": "input() va int() / float()",
                    "estimated_minutes": 10,
                    "content_md": """
## input() — foydalanuvchidan ma'lumot olish

`input()` funksiyasi klaviaturadan bitta qator o'qiydi:

```python
ism = input()
print(f"Salom, {ism}!")
```

**Eng muhim qoida:** `input()` **har doim satr** qaytaradi. Kiritilgan `25` ham son emas, `"25"` satri bo'ladi.

## Turni o'zgartirish

```python
son = int(input())      # satrni butun songa
narx = float(input())   # satrni kasrli songa
matn = str(100)         # sonni satrga
```

Agar satrni songa aylantirib bo'lmasa (masalan `"salom"`), dastur `ValueError` xatosi bilan to'xtaydi.

## Nima uchun bu muhim?

```python
a = input()   # 2
b = input()   # 3
print(a + b)      # 23  — satrlar ulandi!
print(int(a) + int(b))   # 5  — sonlar qo'shildi
```

## Bir qatorda bir nechta son

Agar sonlar bitta qatorda bo'shliq bilan berilsa, `split()` ularni ajratadi:

```python
a, b = input().split()
print(int(a) + int(b))
```

## Bu kursdagi topshiriqlar haqida

Topshiriqlarda ma'lumot **kirish** (stdin) orqali beriladi va javob `print()` bilan chiqariladi — xuddi shu tartibda tekshiriladi.
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Ism so'rash",
                            "code": 'ism = input()\nprint(f"Salom, {ism}!")',
                            "expected_output": "Salom, Ali!",
                            "explanation_uz": "«Sinab ko'rish» oynasidagi kirish maydoniga `Ali` deb yozib ko'ring.",
                        },
                        {
                            "title_uz": "Satr va son farqi",
                            "code": 'a = "2"\nb = "3"\nprint(a + b)\nprint(int(a) + int(b))',
                            "expected_output": "23\n5",
                            "explanation_uz": "Satrlar ulanadi, sonlar esa qo'shiladi. Shuning uchun `int()` kerak.",
                        },
                        {
                            "title_uz": "Bir qatordan ikkita son",
                            "code": "a, b = input().split()\nprint(int(a) * int(b))",
                            "expected_output": "12",
                            "explanation_uz": "Kirishga `3 4` deb yozsangiz, natija 12 bo'ladi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`input()` qanday turdagi qiymat qaytaradi?",
                            "options": ["int", "float", "str", "Kiritilganiga qarab o'zgaradi"],
                            "correct_index": 2,
                            "explanation_uz": "`input()` har doim satr (`str`) qaytaradi.",
                        },
                        {
                            "question_uz": "Foydalanuvchi `5` va `7` kiritdi. `print(input() + input())` nima chiqaradi?",
                            "options": ["12", "57", "Xatolik", "5 7"],
                            "correct_index": 1,
                            "explanation_uz": "Ikkalasi ham satr, shuning uchun ular ulanadi: `\"5\" + \"7\" = \"57\"`.",
                        },
                        {
                            "question_uz": "`int(\"salom\")` nima bo'ladi?",
                            "options": ["0 qaytaradi", "ValueError xatosi", "None qaytaradi", "\"salom\" qaytaradi"],
                            "correct_index": 1,
                            "explanation_uz": "Songa aylantirib bo'lmaydigan satr `ValueError` beradi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Ikki sonning yig'indisi",
                            "prompt_md": "Ikkita butun son alohida qatorlarda beriladi. Ularning yig'indisini chiqaring.\n\n**Kirish**\n```\n12\n30\n```\n**Chiqish**\n```\n42\n```",
                            "starter_code": "a = int(input())\nb = int(input())\n\n# yig'indini chiqaring",
                            "solution_code": "a = int(input())\nb = int(input())\n\nprint(a + b)",
                            "hint_uz": "`int(input())` satrni butun songa aylantiradi.",
                            "points": 5,
                            "tests": [
                                {"input": "12\n30", "expected_output": "42", "is_sample": True},
                                {"input": "-5\n5", "expected_output": "0", "is_sample": True},
                                {"input": "1000000\n2000000", "expected_output": "3000000", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Salomlashish",
                            "prompt_md": "Bitta qatorda ism beriladi. Quyidagi ko'rinishda javob chiqaring:\n\n**Kirish**\n```\nDilnoza\n```\n**Chiqish**\n```\nSalom, Dilnoza! CodeArena'ga xush kelibsiz.\n```",
                            "starter_code": "ism = input()\n",
                            "solution_code": 'ism = input()\n\nprint(f"Salom, {ism}! CodeArena\'ga xush kelibsiz.")',
                            "hint_uz": "f-satr ishlating va tinish belgilariga e'tibor bering.",
                            "points": 5,
                            "tests": [
                                {"input": "Dilnoza", "expected_output": "Salom, Dilnoza! CodeArena'ga xush kelibsiz.", "is_sample": True},
                                {"input": "Ali", "expected_output": "Salom, Ali! CodeArena'ga xush kelibsiz.", "is_sample": False},
                            ],
                        },
                    ],
                },
            ],
        },
        # ============================================================ 3-bo'lim
        {
            "slug": "shart-va-sikllar",
            "title_uz": "Shartlar va sikllar",
            "summary_uz": "Dasturga qaror qabul qilish va takrorlashni o'rgatish",
            "lessons": [
                {
                    "slug": "shart-operatori",
                    "title_uz": "if / elif / else",
                    "summary_uz": "Shartga qarab turli yo'l tanlash",
                    "estimated_minutes": 12,
                    "content_md": """
## Solishtirish amallari

| Amal | Ma'nosi | Misol |
|------|---------|-------|
| `==` | teng | `5 == 5` → `True` |
| `!=` | teng emas | `5 != 3` → `True` |
| `>` | katta | `5 > 3` |
| `<` | kichik | `3 < 5` |
| `>=` | katta yoki teng | `5 >= 5` |
| `<=` | kichik yoki teng | `3 <= 5` |

**Diqqat:** `=` — qiymat berish, `==` — solishtirish. Bu eng ko'p uchraydigan xato.

## if

```python
yosh = 20
if yosh >= 18:
    print("Voyaga yetgan")
```

Shart `True` bo'lsa, ichkariga surilgan blok bajariladi.

## if / else

```python
yosh = 15
if yosh >= 18:
    print("Voyaga yetgan")
else:
    print("Voyaga yetmagan")
```

## elif — bir nechta variant

```python
ball = 75

if ball >= 90:
    print("A'lo")
elif ball >= 70:
    print("Yaxshi")
elif ball >= 50:
    print("Qoniqarli")
else:
    print("Qoniqarsiz")
```

Python shartlarni **yuqoridan pastga** tekshiradi va **birinchi** to'g'ri kelganida to'xtaydi.

## Bir nechta shartni birlashtirish

- `and` — ikkalasi ham bajarilsa
- `or` — kamida bittasi bajarilsa
- `not` — teskarisi

```python
yosh = 20
bor = True

if yosh >= 18 and bor:
    print("Kirishi mumkin")
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Oddiy shart",
                            "code": 'yosh = 20\n\nif yosh >= 18:\n    print("Voyaga yetgan")\nelse:\n    print("Voyaga yetmagan")',
                            "expected_output": "Voyaga yetgan",
                            "explanation_uz": "Shart `True` bo'lgani uchun `if` bloki bajarildi.",
                        },
                        {
                            "title_uz": "Baho aniqlash",
                            "code": 'ball = 75\n\nif ball >= 90:\n    print("A\'lo")\nelif ball >= 70:\n    print("Yaxshi")\nelse:\n    print("Qoniqarsiz")',
                            "expected_output": "Yaxshi",
                            "explanation_uz": "Birinchi shart bajarilmadi, ikkinchisi bajarildi va tekshiruv to'xtadi.",
                        },
                        {
                            "title_uz": "and va or",
                            "code": 'yosh = 20\nchipta = True\n\nif yosh >= 18 and chipta:\n    print("Kirishi mumkin")\nelse:\n    print("Kira olmaydi")',
                            "expected_output": "Kirishi mumkin",
                            "explanation_uz": "`and` ikkala shart ham `True` bo'lishini talab qiladi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Ikki qiymatni solishtirish uchun qaysi belgi ishlatiladi?",
                            "options": ["=", "==", "=>", ":="],
                            "correct_index": 1,
                            "explanation_uz": "`=` qiymat beradi, `==` esa tenglikni tekshiradi.",
                        },
                        {
                            "question_uz": "`ball = 95` bo'lsa, darsdagi baho misoli nima chiqaradi?",
                            "options": ["A'lo", "Yaxshi", "Qoniqarli", "Hech narsa"],
                            "correct_index": 0,
                            "explanation_uz": "Birinchi shart (`ball >= 90`) bajariladi va qolganlari tekshirilmaydi.",
                        },
                        {
                            "question_uz": "`if 5 > 3 or 2 > 7:` sharti qanday natija beradi?",
                            "options": ["True", "False", "Xatolik", "None"],
                            "correct_index": 0,
                            "explanation_uz": "`or` uchun bitta shartning to'g'ri bo'lishi yetarli.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Juft yoki toq",
                            "prompt_md": "Bitta butun son beriladi. Agar u juft bo'lsa `Juft`, aks holda `Toq` deb chiqaring.\n\n**Kirish**\n```\n8\n```\n**Chiqish**\n```\nJuft\n```",
                            "starter_code": "son = int(input())\n",
                            "solution_code": 'son = int(input())\n\nif son % 2 == 0:\n    print("Juft")\nelse:\n    print("Toq")',
                            "hint_uz": "2 ga bo'lgandagi qoldiq (`%`) nolga teng bo'lsa — juft.",
                            "points": 10,
                            "tests": [
                                {"input": "8", "expected_output": "Juft", "is_sample": True},
                                {"input": "7", "expected_output": "Toq", "is_sample": True},
                                {"input": "0", "expected_output": "Juft", "is_sample": False},
                                {"input": "-3", "expected_output": "Toq", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Baho qo'yish",
                            "prompt_md": "0 dan 100 gacha ball beriladi. Quyidagi qoidaga ko'ra baho chiqaring:\n\n- 90 va undan yuqori → `A'lo`\n- 70–89 → `Yaxshi`\n- 50–69 → `Qoniqarli`\n- 50 dan past → `Qoniqarsiz`",
                            "starter_code": "ball = int(input())\n",
                            "solution_code": 'ball = int(input())\n\nif ball >= 90:\n    print("A\'lo")\nelif ball >= 70:\n    print("Yaxshi")\nelif ball >= 50:\n    print("Qoniqarli")\nelse:\n    print("Qoniqarsiz")',
                            "hint_uz": "`elif` dan foydalaning va shartlarni kattadan kichikka qarab yozing.",
                            "points": 10,
                            "tests": [
                                {"input": "95", "expected_output": "A'lo", "is_sample": True},
                                {"input": "70", "expected_output": "Yaxshi", "is_sample": True},
                                {"input": "50", "expected_output": "Qoniqarli", "is_sample": False},
                                {"input": "12", "expected_output": "Qoniqarsiz", "is_sample": False},
                            ],
                        },
                    ],
                },
                {
                    "slug": "for-sikli",
                    "title_uz": "for sikli",
                    "summary_uz": "Ma'lum sondagi takrorlash va range()",
                    "estimated_minutes": 12,
                    "content_md": """
## for nima uchun kerak?

1 dan 5 gacha sonlarni chiqarish uchun beshta `print()` yozish mumkin. Ammo 1000 tagacha kerak bo'lsa-chi? Sikl aynan shu uchun.

```python
for i in range(1, 6):
    print(i)
```

## range() ning uch ko'rinishi

```python
range(5)         # 0, 1, 2, 3, 4
range(1, 6)      # 1, 2, 3, 4, 5
range(0, 10, 2)  # 0, 2, 4, 6, 8   — qadam 2
```

**Muhim:** oxirgi son **kirmaydi**. `range(1, 6)` beshinchi songacha boradi, oltinchi son chiqmaydi.

## Yig'indi to'plash

Sikl ichida o'zgaruvchini o'stirish eng ko'p uchraydigan naqsh:

```python
yigindi = 0
for i in range(1, 11):
    yigindi = yigindi + i
print(yigindi)   # 55
```

## Satr bo'ylab yurish

`for` faqat sonlar bilan emas, satr belgilar bilan ham ishlaydi:

```python
for harf in "Python":
    print(harf)
```

## Teskari tartib

```python
for i in range(5, 0, -1):
    print(i)     # 5 4 3 2 1
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "1 dan 5 gacha",
                            "code": "for i in range(1, 6):\n    print(i)",
                            "expected_output": "1\n2\n3\n4\n5",
                            "explanation_uz": "`range(1, 6)` 1 dan boshlab 6 gacha (6 kirmaydi) sanaydi.",
                        },
                        {
                            "title_uz": "Yig'indi hisoblash",
                            "code": "yigindi = 0\nfor i in range(1, 11):\n    yigindi += i\nprint(yigindi)",
                            "expected_output": "55",
                            "explanation_uz": "`yigindi += i` — `yigindi = yigindi + i` ning qisqa yozuvi.",
                        },
                        {
                            "title_uz": "Satr belgilarini chiqarish",
                            "code": 'for harf in "Kod":\n    print(harf)',
                            "expected_output": "K\no\nd",
                            "explanation_uz": "`for` satrni belgima-belgi aylanib chiqadi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`range(3)` qanday sonlarni beradi?",
                            "options": ["1, 2, 3", "0, 1, 2", "0, 1, 2, 3", "3"],
                            "correct_index": 1,
                            "explanation_uz": "Bitta argument berilganda sanash 0 dan boshlanadi va 3 kirmaydi.",
                        },
                        {
                            "question_uz": "`for i in range(2, 10, 3)` sikli qaysi qiymatlarni oladi?",
                            "options": ["2, 5, 8", "2, 3, 4...9", "3, 6, 9", "2, 5, 8, 11"],
                            "correct_index": 0,
                            "explanation_uz": "Uchinchi argument — qadam. 2, keyin 5, keyin 8; 11 esa 10 dan katta.",
                        },
                        {
                            "question_uz": "`x += 3` nimaga teng?",
                            "options": ["x = 3", "x = x + 3", "x == 3", "x * 3"],
                            "correct_index": 1,
                            "explanation_uz": "`+=` mavjud qiymatga qo'shib, natijani o'sha o'zgaruvchiga qaytaradi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "1 dan N gacha yig'indi",
                            "prompt_md": "Butun son `n` beriladi. 1 dan `n` gacha bo'lgan barcha sonlar yig'indisini chiqaring.\n\n**Kirish**\n```\n10\n```\n**Chiqish**\n```\n55\n```",
                            "starter_code": "n = int(input())\n\nyigindi = 0\n# sikl yozing\n\nprint(yigindi)",
                            "solution_code": "n = int(input())\n\nyigindi = 0\nfor i in range(1, n + 1):\n    yigindi += i\n\nprint(yigindi)",
                            "hint_uz": "`range(1, n + 1)` — `n` ning o'zi ham kirishi uchun `+ 1` kerak.",
                            "points": 10,
                            "tests": [
                                {"input": "10", "expected_output": "55", "is_sample": True},
                                {"input": "1", "expected_output": "1", "is_sample": True},
                                {"input": "100", "expected_output": "5050", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Ko'paytirish jadvali",
                            "prompt_md": "Son `n` beriladi. Uning ko'paytirish jadvalini 1 dan 5 gacha chiqaring.\n\n**Kirish**\n```\n3\n```\n**Chiqish**\n```\n3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n```",
                            "starter_code": "n = int(input())\n",
                            "solution_code": 'n = int(input())\n\nfor i in range(1, 6):\n    print(f"{n} x {i} = {n * i}")',
                            "hint_uz": "f-satr ichida ko'paytmani ham hisoblash mumkin: `{n * i}`.",
                            "points": 10,
                            "tests": [
                                {"input": "3", "expected_output": "3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15", "is_sample": True},
                                {"input": "7", "expected_output": "7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n7 x 4 = 28\n7 x 5 = 35", "is_sample": False},
                            ],
                        },
                    ],
                },
                {
                    "slug": "while-sikli",
                    "title_uz": "while sikli",
                    "summary_uz": "Shart bajarilgunicha takrorlash",
                    "estimated_minutes": 10,
                    "content_md": """
## while — «toki ... bo'lguncha»

`for` necha marta takrorlashni oldindan biladi. `while` esa **shart to'g'ri bo'lgan ekan** ishlayveradi:

```python
son = 1
while son <= 5:
    print(son)
    son += 1
```

## Uch qism har doim bo'lishi kerak

1. **Boshlang'ich qiymat** — `son = 1`
2. **Shart** — `son <= 5`
3. **O'zgarish** — `son += 1`

Uchinchisini unutsangiz, shart hech qachon yolg'on bo'lmaydi va sikl **cheksiz** ishlaydi. Bunday dastur vaqt chegarasidan oshib to'xtatiladi (`Time Limit Exceeded`).

## break va continue

- `break` — siklni butunlay to'xtatadi;
- `continue` — joriy qadamni tashlab, keyingisiga o'tadi.

```python
for i in range(1, 10):
    if i == 5:
        break
    print(i)      # 1 2 3 4
```

```python
for i in range(1, 6):
    if i % 2 == 0:
        continue
    print(i)      # 1 3 5
```

## Qachon qaysi biri?

- Takrorlash soni ma'lum → `for`
- Takrorlash shartga bog'liq (masalan, foydalanuvchi `0` kiritmaguncha) → `while`
""".strip(),
                    "examples": [
                        {
                            "title_uz": "1 dan 5 gacha (while)",
                            "code": "son = 1\nwhile son <= 5:\n    print(son)\n    son += 1",
                            "expected_output": "1\n2\n3\n4\n5",
                            "explanation_uz": "`son += 1` bo'lmasa, shart doim to'g'ri qolib, sikl cheksiz ishlardi.",
                        },
                        {
                            "title_uz": "break bilan to'xtatish",
                            "code": "for i in range(1, 10):\n    if i == 5:\n        break\n    print(i)",
                            "expected_output": "1\n2\n3\n4",
                            "explanation_uz": "`i` 5 ga tenglashganda sikl butunlay to'xtadi.",
                        },
                        {
                            "title_uz": "continue bilan o'tkazib yuborish",
                            "code": "for i in range(1, 6):\n    if i % 2 == 0:\n        continue\n    print(i)",
                            "expected_output": "1\n3\n5",
                            "explanation_uz": "Juft sonlarda `continue` ishlab, `print` ga yetib borilmadi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`while` sikli qachon to'xtaydi?",
                            "options": ["10 marta ishlagach", "Shart yolg'on bo'lganda", "`for` ga yetganda", "Hech qachon"],
                            "correct_index": 1,
                            "explanation_uz": "Har bir qadam oldidan shart tekshiriladi; u `False` bo'lsa sikl tugaydi.",
                        },
                        {
                            "question_uz": "Sikl ichida o'zgaruvchi o'zgartirilmasa nima bo'ladi?",
                            "options": ["Sikl bir marta ishlaydi", "Xatolik chiqadi", "Cheksiz sikl hosil bo'ladi", "Sikl umuman ishlamaydi"],
                            "correct_index": 2,
                            "explanation_uz": "Shart hech qachon yolg'on bo'lmaydi — dastur vaqt chegarasidan oshib to'xtatiladi.",
                        },
                        {
                            "question_uz": "`continue` nima qiladi?",
                            "options": ["Siklni to'xtatadi", "Joriy qadamni tashlab, keyingisiga o'tadi", "Dasturni tugatadi", "Siklni qaytadan boshlaydi"],
                            "correct_index": 1,
                            "explanation_uz": "`continue` faqat shu qadamning qolgan qismini o'tkazib yuboradi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Teskari sanoq",
                            "prompt_md": "Son `n` beriladi. `while` sikli yordamida `n` dan 1 gacha kamayib boruvchi sonlarni har birini yangi qatorda chiqaring.\n\n**Kirish**\n```\n5\n```\n**Chiqish**\n```\n5\n4\n3\n2\n1\n```",
                            "starter_code": "n = int(input())\n",
                            "solution_code": "n = int(input())\n\nwhile n >= 1:\n    print(n)\n    n -= 1",
                            "hint_uz": "Shart `n >= 1`, har qadamda `n -= 1`.",
                            "points": 10,
                            "tests": [
                                {"input": "5", "expected_output": "5\n4\n3\n2\n1", "is_sample": True},
                                {"input": "1", "expected_output": "1", "is_sample": False},
                                {"input": "3", "expected_output": "3\n2\n1", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Raqamlar yig'indisi",
                            "prompt_md": "Musbat butun son beriladi. Uning raqamlari yig'indisini toping.\n\n**Kirish**\n```\n1234\n```\n**Chiqish**\n```\n10\n```",
                            "starter_code": "n = int(input())\n\nyigindi = 0\n# while sikli yozing\n\nprint(yigindi)",
                            "solution_code": "n = int(input())\n\nyigindi = 0\nwhile n > 0:\n    yigindi += n % 10\n    n //= 10\n\nprint(yigindi)",
                            "hint_uz": "`n % 10` oxirgi raqamni beradi, `n //= 10` esa oxirgi raqamni olib tashlaydi.",
                            "points": 15,
                            "tests": [
                                {"input": "1234", "expected_output": "10", "is_sample": True},
                                {"input": "7", "expected_output": "7", "is_sample": True},
                                {"input": "999999", "expected_output": "54", "is_sample": False},
                            ],
                        },
                    ],
                },
            ],
        },
        # ============================================================ 4-bo'lim
        {
            "slug": "toplamlar",
            "title_uz": "Ro'yxat va lug'at",
            "summary_uz": "Ko'p qiymatni bitta o'zgaruvchida saqlash",
            "lessons": [
                {
                    "slug": "royxat",
                    "title_uz": "Ro'yxat (list)",
                    "summary_uz": "Elementlar ketma-ketligi bilan ishlash",
                    "estimated_minutes": 12,
                    "content_md": """
## Ro'yxat nima?

Ro'yxat — tartiblangan qiymatlar to'plami. U kvadrat qavs ichida yoziladi:

```python
sonlar = [10, 20, 30]
ismlar = ["Ali", "Vali", "Guli"]
aralash = [1, "ikki", 3.0, True]
```

## Elementga murojaat

Indeks 0 dan boshlanadi:

```python
sonlar = [10, 20, 30]
print(sonlar[0])    # 10
print(sonlar[-1])   # 30  — oxirgisi
sonlar[1] = 25      # qiymatni almashtirish
```

## Ro'yxatni o'zgartirish

```python
sonlar = [10, 20]
sonlar.append(30)      # oxiriga qo'shish  → [10, 20, 30]
sonlar.insert(0, 5)    # 0-o'ringa qo'yish → [5, 10, 20, 30]
sonlar.remove(20)      # qiymat bo'yicha o'chirish
sonlar.pop()           # oxirgisini olib tashlash
```

## Foydali funksiyalar

```python
sonlar = [4, 8, 15, 16]

print(len(sonlar))     # 4   — elementlar soni
print(sum(sonlar))     # 43  — yig'indi
print(max(sonlar))     # 16
print(min(sonlar))     # 4
print(sorted(sonlar))  # tartiblangan yangi ro'yxat
```

## Ro'yxat bo'ylab yurish

```python
for son in [1, 2, 3]:
    print(son * 2)
```

## Kirishdan ro'yxat olish

Bir qatorda bo'shliq bilan berilgan sonlarni ro'yxatga aylantirish:

```python
sonlar = list(map(int, input().split()))
print(sum(sonlar))
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Ro'yxat yaratish va o'qish",
                            "code": 'ismlar = ["Ali", "Vali", "Guli"]\nprint(ismlar[0])\nprint(ismlar[-1])\nprint(len(ismlar))',
                            "expected_output": "Ali\nGuli\n3",
                            "explanation_uz": "Indeks 0 dan boshlanadi, `-1` esa oxirgi elementni bildiradi.",
                        },
                        {
                            "title_uz": "Element qo'shish va o'chirish",
                            "code": "sonlar = [10, 20]\nsonlar.append(30)\nprint(sonlar)\nsonlar.remove(10)\nprint(sonlar)",
                            "expected_output": "[10, 20, 30]\n[20, 30]",
                            "explanation_uz": "`append()` oxiriga qo'shadi, `remove()` esa berilgan qiymatni o'chiradi.",
                        },
                        {
                            "title_uz": "Yig'indi, eng katta va eng kichik",
                            "code": "sonlar = [4, 8, 15, 16]\nprint(sum(sonlar))\nprint(max(sonlar))\nprint(min(sonlar))",
                            "expected_output": "43\n16\n4",
                            "explanation_uz": "Bu uch funksiya ro'yxat bilan to'g'ridan-to'g'ri ishlaydi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`[5, 10, 15][1]` nimani qaytaradi?",
                            "options": ["5", "10", "15", "Xatolik"],
                            "correct_index": 1,
                            "explanation_uz": "Indeks 0 dan boshlangani uchun 1-indeks ikkinchi element — 10.",
                        },
                        {
                            "question_uz": "Ro'yxat oxiriga element qo'shish uchun qaysi metod ishlatiladi?",
                            "options": ["add()", "push()", "append()", "insert()"],
                            "correct_index": 2,
                            "explanation_uz": "`append()` elementni oxiriga qo'shadi. `insert()` esa aniq o'ringa qo'yadi.",
                        },
                        {
                            "question_uz": "`len([1, 2, 3]) + sum([1, 2, 3])` natijasi nima?",
                            "options": ["6", "9", "3", "12"],
                            "correct_index": 1,
                            "explanation_uz": "`len` = 3, `sum` = 6, jami 9.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Sonlar yig'indisi va o'rtachasi",
                            "prompt_md": "Bir qatorda bo'shliq bilan ajratilgan butun sonlar beriladi. Ularning yig'indisini va eng kattasini alohida qatorlarda chiqaring.\n\n**Kirish**\n```\n4 8 15 16 23 42\n```\n**Chiqish**\n```\n108\n42\n```",
                            "starter_code": "sonlar = list(map(int, input().split()))\n",
                            "solution_code": "sonlar = list(map(int, input().split()))\n\nprint(sum(sonlar))\nprint(max(sonlar))",
                            "hint_uz": "`sum()` va `max()` funksiyalari tayyor javob beradi.",
                            "points": 10,
                            "tests": [
                                {"input": "4 8 15 16 23 42", "expected_output": "108\n42", "is_sample": True},
                                {"input": "5", "expected_output": "5\n5", "is_sample": True},
                                {"input": "-3 -1 -7", "expected_output": "-11\n-1", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Faqat juftlarni chiqaring",
                            "prompt_md": "Bir qatorda sonlar beriladi. Ular orasidan faqat juftlarini bir qatorda, bo'shliq bilan chiqaring.\n\n**Kirish**\n```\n1 2 3 4 5 6\n```\n**Chiqish**\n```\n2 4 6\n```\n\nJuft son bo'lmasa, hech narsa chiqarmang (bo'sh qator).",
                            "starter_code": "sonlar = list(map(int, input().split()))\n\nnatija = []\n# juftlarni yig'ing\n\nprint(*natija)",
                            "solution_code": "sonlar = list(map(int, input().split()))\n\nnatija = []\nfor son in sonlar:\n    if son % 2 == 0:\n        natija.append(son)\n\nprint(*natija)",
                            "hint_uz": "`print(*natija)` ro'yxat elementlarini bo'shliq bilan ajratib chiqaradi.",
                            "points": 15,
                            "tests": [
                                {"input": "1 2 3 4 5 6", "expected_output": "2 4 6", "is_sample": True},
                                {"input": "1 3 5", "expected_output": "", "is_sample": True},
                                {"input": "10 20 30", "expected_output": "10 20 30", "is_sample": False},
                            ],
                        },
                    ],
                },
                {
                    "slug": "lugat",
                    "title_uz": "Lug'at (dict)",
                    "summary_uz": "Kalit–qiymat juftliklari",
                    "estimated_minutes": 11,
                    "content_md": """
## Lug'at nima?

Ro'yxatda elementlar **raqam** bilan topiladi. Lug'atda esa har bir qiymat o'zining **kaliti** bilan saqlanadi:

```python
talaba = {
    "ism": "Ali",
    "yosh": 16,
    "shahar": "Toshkent"
}

print(talaba["ism"])    # Ali
```

## Qo'shish va o'zgartirish

```python
talaba["ball"] = 95        # yangi kalit qo'shildi
talaba["yosh"] = 17        # mavjud qiymat o'zgardi
del talaba["shahar"]       # kalit o'chirildi
```

## Kalit bor-yo'qligini tekshirish

Mavjud bo'lmagan kalitga murojaat qilish `KeyError` beradi. Xavfsiz usul:

```python
print("ball" in talaba)        # True yoki False
print(talaba.get("telefon"))   # None — xatolik bermaydi
print(talaba.get("telefon", "yo'q"))   # standart qiymat bilan
```

## Lug'at bo'ylab yurish

```python
narxlar = {"non": 4000, "sut": 12000}

for kalit in narxlar:
    print(kalit, narxlar[kalit])

for kalit, qiymat in narxlar.items():
    print(f"{kalit}: {qiymat}")
```

## Qachon lug'at, qachon ro'yxat?

- Tartib va indeks muhim, elementlar bir xil turdagi → **ro'yxat**
- Har bir qiymatning nomi bor (`ism`, `yosh`, `narx`) → **lug'at**
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Lug'at yaratish",
                            "code": 'talaba = {"ism": "Ali", "yosh": 16}\nprint(talaba["ism"])\nprint(talaba["yosh"])',
                            "expected_output": "Ali\n16",
                            "explanation_uz": "Qiymat kvadrat qavs ichidagi kalit orqali olinadi.",
                        },
                        {
                            "title_uz": "Qo'shish va tekshirish",
                            "code": 'talaba = {"ism": "Ali"}\ntalaba["ball"] = 95\nprint(talaba)\nprint("ball" in talaba)\nprint(talaba.get("telefon", "yo\'q"))',
                            "expected_output": "{'ism': 'Ali', 'ball': 95}\nTrue\nyo'q",
                            "explanation_uz": "`get()` mavjud bo'lmagan kalitda xatolik bermaydi.",
                        },
                        {
                            "title_uz": "items() bilan aylanish",
                            "code": 'narxlar = {"non": 4000, "sut": 12000}\nfor kalit, qiymat in narxlar.items():\n    print(f"{kalit}: {qiymat}")',
                            "expected_output": "non: 4000\nsut: 12000",
                            "explanation_uz": "`items()` har bir qadamda kalit va qiymatni birga qaytaradi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Lug'atdagi qiymat nima orqali topiladi?",
                            "options": ["Indeks raqami bo'yicha", "Kalit bo'yicha", "Tartib bo'yicha", "Qiymatning o'zi bo'yicha"],
                            "correct_index": 1,
                            "explanation_uz": "Lug'atda har bir qiymat noyob kalit bilan bog'langan.",
                        },
                        {
                            "question_uz": "Mavjud bo'lmagan kalitga `d[\"yoq\"]` deb murojaat qilinsa nima bo'ladi?",
                            "options": ["None qaytaradi", "Bo'sh satr qaytaradi", "KeyError xatosi", "Yangi kalit yaratiladi"],
                            "correct_index": 2,
                            "explanation_uz": "Xavfsiz murojaat uchun `.get()` ishlatiladi.",
                        },
                        {
                            "question_uz": "Qaysi holatda lug'at ro'yxatdan qulayroq?",
                            "options": [
                                "Sonlarni tartiblash kerak bo'lganda",
                                "Har bir qiymatning nomi bo'lganda",
                                "Elementlar soni ko'p bo'lganda",
                                "Faqat matn saqlanganda",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "«ism», «yosh», «narx» kabi nomlangan ma'lumot uchun lug'at tabiiy tanlov.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Talaba ma'lumoti",
                            "prompt_md": "Uchta qator beriladi: ism, yosh, shahar. Ulardan lug'at yasang va quyidagi ko'rinishda chiqaring.\n\n**Kirish**\n```\nAli\n16\nToshkent\n```\n**Chiqish**\n```\nism: Ali\nyosh: 16\nshahar: Toshkent\n```",
                            "starter_code": "ism = input()\nyosh = input()\nshahar = input()\n\ntalaba = {}\n",
                            "solution_code": 'ism = input()\nyosh = input()\nshahar = input()\n\ntalaba = {"ism": ism, "yosh": yosh, "shahar": shahar}\n\nfor kalit, qiymat in talaba.items():\n    print(f"{kalit}: {qiymat}")',
                            "hint_uz": "`items()` bilan aylanib, `f\"{kalit}: {qiymat}\"` ko'rinishida chiqaring.",
                            "points": 10,
                            "tests": [
                                {"input": "Ali\n16\nToshkent", "expected_output": "ism: Ali\nyosh: 16\nshahar: Toshkent", "is_sample": True},
                                {"input": "Guli\n20\nBuxoro", "expected_output": "ism: Guli\nyosh: 20\nshahar: Buxoro", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Harflarni sanang",
                            "prompt_md": "Bitta so'z beriladi. Har bir harf nechta marta uchraganini so'zdagi **birinchi uchrash tartibida** chiqaring.\n\n**Kirish**\n```\nsalom\n```\n**Chiqish**\n```\ns: 1\na: 1\nl: 1\no: 1\nm: 1\n```",
                            "starter_code": "soz = input()\n\nsanoq = {}\n",
                            "solution_code": "soz = input()\n\nsanoq = {}\nfor harf in soz:\n    sanoq[harf] = sanoq.get(harf, 0) + 1\n\nfor harf, soni in sanoq.items():\n    print(f\"{harf}: {soni}\")",
                            "hint_uz": "`sanoq.get(harf, 0) + 1` — kalit bo'lmasa 0 dan boshlaydi. Pythonda lug'at qo'shilish tartibini saqlaydi.",
                            "points": 15,
                            "tests": [
                                {"input": "salom", "expected_output": "s: 1\na: 1\nl: 1\no: 1\nm: 1", "is_sample": True},
                                {"input": "kitob", "expected_output": "k: 1\ni: 1\nt: 1\no: 1\nb: 1", "is_sample": False},
                                {"input": "aaa", "expected_output": "a: 3", "is_sample": False},
                            ],
                        },
                    ],
                },
            ],
        },
        # ============================================================ 5-bo'lim
        {
            "slug": "funksiyalar",
            "title_uz": "Funksiyalar",
            "summary_uz": "Kodni qayta ishlatiladigan bloklarga bo'lish",
            "lessons": [
                {
                    "slug": "funksiya-yaratish",
                    "title_uz": "Funksiya yaratish va chaqirish",
                    "summary_uz": "def, parametrlar va return",
                    "estimated_minutes": 14,
                    "content_md": """
## Funksiya nima uchun kerak?

Bir xil kodni bir necha joyda takrorlash o'rniga, unga nom berib, kerak bo'lganda chaqirish mumkin. Funksiya kodni **qisqartiradi** va uni tuzatishni osonlashtiradi: o'zgartirish faqat bitta joyda qilinadi.

## Yaratish va chaqirish

```python
def salomlash():
    print("Salom!")

salomlash()      # chaqirish
salomlash()      # yana chaqirish
```

`def` — funksiya e'loni, undan keyin nom va qavslar. Tanasi ichkariga suriladi.

## Parametrlar

Funksiyaga ma'lumot uzatish mumkin:

```python
def salomlash(ism):
    print(f"Salom, {ism}!")

salomlash("Ali")     # Salom, Ali!
salomlash("Guli")    # Salom, Guli!
```

## return — natija qaytarish

`print()` ekranga **chiqaradi**, `return` esa qiymatni **qaytaradi** — uni keyin ishlatish mumkin:

```python
def kvadrat(x):
    return x * x

natija = kvadrat(5)
print(natija + 1)     # 26
```

`return` bajarilishi bilan funksiya darhol tugaydi.

## Standart qiymatli parametr

```python
def salomlash(ism="mehmon"):
    print(f"Salom, {ism}!")

salomlash()          # Salom, mehmon!
salomlash("Ali")     # Salom, Ali!
```

## Bir nechta parametr

```python
def yigindi(a, b):
    return a + b

print(yigindi(3, 4))    # 7
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Oddiy funksiya",
                            "code": 'def salomlash():\n    print("Salom!")\n\nsalomlash()\nsalomlash()',
                            "expected_output": "Salom!\nSalom!",
                            "explanation_uz": "Funksiya e'lon qilinganda ishlamaydi — faqat chaqirilganda bajariladi.",
                        },
                        {
                            "title_uz": "return va print farqi",
                            "code": "def kvadrat(x):\n    return x * x\n\nnatija = kvadrat(5)\nprint(natija)\nprint(natija + 1)",
                            "expected_output": "25\n26",
                            "explanation_uz": "`return` qiymatni qaytaradi, shuning uchun uni o'zgaruvchiga yozib, ustida amal bajarish mumkin.",
                        },
                        {
                            "title_uz": "Standart qiymat",
                            "code": 'def salomlash(ism="mehmon"):\n    print(f"Salom, {ism}!")\n\nsalomlash()\nsalomlash("Ali")',
                            "expected_output": "Salom, mehmon!\nSalom, Ali!",
                            "explanation_uz": "Argument berilmasa, standart qiymat ishlatiladi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Funksiya qaysi kalit so'z bilan e'lon qilinadi?",
                            "options": ["function", "def", "fun", "define"],
                            "correct_index": 1,
                            "explanation_uz": "Pythonda funksiya `def` bilan e'lon qilinadi.",
                        },
                        {
                            "question_uz": "`return` va `print()` orasidagi asosiy farq nima?",
                            "options": [
                                "Farqi yo'q",
                                "`return` qiymatni qaytaradi, `print()` ekranga chiqaradi",
                                "`return` faqat sonlar bilan ishlaydi",
                                "`print()` funksiyani to'xtatadi",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "`return` natijani chaqirgan joyga beradi va uni keyin ishlatish mumkin.",
                        },
                        {
                            "question_uz": "`def f(x): return x * 2` bo'lsa, `f(f(3))` nima qaytaradi?",
                            "options": ["6", "12", "9", "Xatolik"],
                            "correct_index": 1,
                            "explanation_uz": "Avval `f(3)` = 6, so'ng `f(6)` = 12.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Kvadrat funksiyasi",
                            "prompt_md": "`kvadrat(x)` funksiyasini yozing — u sonning kvadratini **qaytarsin** (chiqarmasin).\n\nDastur kirishdan bitta son o'qiydi va natijani chiqaradi.\n\n**Kirish**\n```\n7\n```\n**Chiqish**\n```\n49\n```",
                            "starter_code": "def kvadrat(x):\n    # return yozing\n    pass\n\n\nson = int(input())\nprint(kvadrat(son))",
                            "solution_code": "def kvadrat(x):\n    return x * x\n\n\nson = int(input())\nprint(kvadrat(son))",
                            "hint_uz": "`return x * x` yoki `return x ** 2`.",
                            "points": 10,
                            "tests": [
                                {"input": "7", "expected_output": "49", "is_sample": True},
                                {"input": "0", "expected_output": "0", "is_sample": True},
                                {"input": "-4", "expected_output": "16", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Eng katta uchtadan",
                            "prompt_md": "`eng_katta(a, b, c)` funksiyasini yozing — u uch sondan kattasini qaytarsin. `max()` ishlatmasdan, `if` bilan yozib ko'ring.\n\n**Kirish**\n```\n3 9 5\n```\n**Chiqish**\n```\n9\n```",
                            "starter_code": "def eng_katta(a, b, c):\n    pass\n\n\na, b, c = map(int, input().split())\nprint(eng_katta(a, b, c))",
                            "solution_code": "def eng_katta(a, b, c):\n    natija = a\n    if b > natija:\n        natija = b\n    if c > natija:\n        natija = c\n    return natija\n\n\na, b, c = map(int, input().split())\nprint(eng_katta(a, b, c))",
                            "hint_uz": "Birinchi sonni «hozircha eng katta» deb oling, keyin qolganlari bilan solishtiring.",
                            "points": 15,
                            "tests": [
                                {"input": "3 9 5", "expected_output": "9", "is_sample": True},
                                {"input": "10 2 4", "expected_output": "10", "is_sample": True},
                                {"input": "-5 -2 -9", "expected_output": "-2", "is_sample": False},
                                {"input": "7 7 7", "expected_output": "7", "is_sample": False},
                            ],
                        },
                    ],
                },
            ],
        },
    ],
}
