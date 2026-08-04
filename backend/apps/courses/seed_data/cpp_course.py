"""«C++ asoslari» kursining kontenti."""

COURSE = {
    "slug": "cpp-asoslari",
    "title_uz": "C++ asoslari",
    "subtitle_uz": "Olimpiada va tizim dasturlashning tili",
    "language": "cpp",
    "level": "beginner",
    "badge": "C++",
    "accent_color": "#00599c",
    "estimated_hours": 12,
    "order": 3,
    "is_featured": False,
    "description_uz": """
C++ — tez va aniq boshqariladigan til. Aynan shu sabab u olimpiada dasturlashda, o'yin dvigatellarida va operatsion tizim darajasidagi dasturlarda ustunlik qiladi.

C++ Python yoki JavaScriptdan qat'iyroq: har bir o'zgaruvchining turi oldindan e'lon qilinadi va kod ishga tushishidan oldin kompilyatsiya qilinadi. Bu ko'proq yozishni talab qiladi, lekin ko'p xatoni dastur ishlashidan **oldin** ushlaydi.

Kursda til asoslari — turlar, `cin/cout`, shartlar, sikllar, massivlar va funksiyalar — misollar va topshiriqlar bilan o'rgatiladi.
""".strip(),
    "modules": [
        {
            "slug": "kirish",
            "title_uz": "Kirish",
            "summary_uz": "Dastur tuzilishi, turlar va kiritish-chiqarish",
            "lessons": [
                {
                    "slug": "birinchi-dastur",
                    "title_uz": "Birinchi dastur va cout",
                    "summary_uz": "Dastur skeleti va ekranga chiqarish",
                    "estimated_minutes": 10,
                    "content_md": """
## Eng kichik C++ dasturi

```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Salom, dunyo!" << endl;
    return 0;
}
```

Har bir qatorning ma'nosi:

- `#include <iostream>` — kiritish-chiqarish kutubxonasini ulaydi;
- `using namespace std;` — `std::cout` o'rniga qisqa `cout` yozish imkonini beradi;
- `int main()` — dastur **shu yerdan** boshlanadi;
- `return 0;` — dastur muvaffaqiyatli tugadi degani.

## cout va <<

`cout` — chiqish oqimi, `<<` esa unga qiymat «uzatish» belgisi. Bir necha qiymatni ketma-ket ulash mumkin:

```cpp
cout << "Yosh: " << 15 << endl;
```

`endl` yangi qatorga o'tkazadi. Uning o'rniga `"\\n"` ham ishlatiladi.

## Nuqta-vergul majburiy

C++ da har bir buyruq `;` bilan tugaydi. Uni tushirib qoldirish — boshlovchilarda eng ko'p uchraydigan kompilyatsiya xatosi.

## Izohlar

```cpp
// bir qatorli izoh
/* ko'p qatorli
   izoh */
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Salom, dunyo!",
                            "code": '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Salom, dunyo!" << endl;\n    return 0;\n}',
                            "expected_output": "Salom, dunyo!",
                            "explanation_uz": "Dastur `main()` funksiyasidan boshlanadi va `return 0;` bilan tugaydi.",
                        },
                        {
                            "title_uz": "Bir nechta qiymat",
                            "code": '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Yosh: " << 15 << endl;\n    cout << 2 + 3 << endl;\n    return 0;\n}',
                            "expected_output": "Yosh: 15\n5",
                            "explanation_uz": "`<<` bilan qiymatlar ketma-ket ulanadi. Bo'shliq kerak bo'lsa, uni matnga o'zingiz qo'shasiz.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "C++ dasturi qaysi funksiyadan boshlanadi?",
                            "options": ["start()", "main()", "begin()", "run()"],
                            "correct_index": 1,
                            "explanation_uz": "Bajarilish har doim `main()` funksiyasidan boshlanadi.",
                        },
                        {
                            "question_uz": "`cout` dan foydalanish uchun qaysi kutubxona ulanadi?",
                            "options": ["<string>", "<vector>", "<iostream>", "<cmath>"],
                            "correct_index": 2,
                            "explanation_uz": "`<iostream>` kiritish-chiqarish oqimlarini beradi.",
                        },
                        {
                            "question_uz": "C++ da har bir buyruq oxiriga nima qo'yiladi?",
                            "options": ["Nuqta", "Vergul", "Nuqta-vergul", "Hech narsa"],
                            "correct_index": 2,
                            "explanation_uz": "`;` buyruqning tugaganini bildiradi va uni tushirib qoldirish kompilyatsiya xatosiga olib keladi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Birinchi chiqish",
                            "prompt_md": "Ekranga aynan `Salom, CodeArena!` matnini chiqaring.",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    // kod yozing\n    return 0;\n}",
                            "solution_code": '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Salom, CodeArena!" << endl;\n    return 0;\n}',
                            "hint_uz": "`cout << \"...\" << endl;` ko'rinishida yozing.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "Salom, CodeArena!", "is_sample": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "ozgaruvchilar-va-turlar",
                    "title_uz": "O'zgaruvchilar va turlar",
                    "summary_uz": "int, double, string, bool va arifmetika",
                    "estimated_minutes": 12,
                    "content_md": """
## Tur oldindan e'lon qilinadi

Pythondan asosiy farq shu: C++ da o'zgaruvchining turi yoziladi va keyin o'zgarmaydi.

```cpp
int yosh = 15;
double boy = 1.72;
string ism = "Ali";
bool faol = true;
char harf = 'A';
```

`string` uchun `#include <string>` kerak (odatda `<iostream>` bilan birga keladi). `char` — bitta belgi va **bittalik** tirnoqda yoziladi.

## Butun bo'lish tuzog'i

```cpp
cout << 7 / 2 << endl;      // 3   — ikkalasi ham int!
cout << 7.0 / 2 << endl;    // 3.5
cout << 7 % 2 << endl;      // 1   — qoldiq
```

Ikkala son ham `int` bo'lsa, natija ham `int` bo'ladi va kasr qismi tashlanadi. Kasrli natija kerak bo'lsa, kamida bittasi `double` bo'lishi kerak.

## O'zgarmas qiymat

```cpp
const double PI = 3.14159;
```

## Qisqa yozuvlar

```cpp
int x = 10;
x += 5;    // x = x + 5  → 15
x++;       // x = x + 1  → 16
x--;       // 15
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Turlar",
                            "code": '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    int yosh = 15;\n    double boy = 1.72;\n    string ism = "Ali";\n\n    cout << ism << " " << yosh << " " << boy << endl;\n    return 0;\n}',
                            "expected_output": "Ali 15 1.72",
                            "explanation_uz": "Har bir o'zgaruvchi o'z turi bilan e'lon qilinadi.",
                        },
                        {
                            "title_uz": "Butun bo'lish",
                            "code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << 7 / 2 << endl;\n    cout << 7.0 / 2 << endl;\n    cout << 7 % 2 << endl;\n    return 0;\n}",
                            "expected_output": "3\n3.5\n1",
                            "explanation_uz": "`int / int` natijasi ham `int` bo'ladi — kasr qismi yo'qoladi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`int a = 9, b = 2;` bo'lsa, `a / b` nima beradi?",
                            "options": ["4.5", "4", "5", "Xatolik"],
                            "correct_index": 1,
                            "explanation_uz": "Ikkala operand `int` bo'lgani uchun natija butun bo'ladi.",
                        },
                        {
                            "question_uz": "Bitta belgini saqlash uchun qaysi tur ishlatiladi?",
                            "options": ["string", "char", "text", "byte"],
                            "correct_index": 1,
                            "explanation_uz": "`char` bitta belgini saqlaydi va bittalik tirnoqda yoziladi: `'A'`.",
                        },
                        {
                            "question_uz": "Kasrli natija olish uchun `7 / 2` ni qanday yozish kerak?",
                            "options": ["`7 / 2.0`", "`(double)(7 / 2)`", "`7 // 2`", "`double(7 / 2)`"],
                            "correct_index": 0,
                            "explanation_uz": "Bo'lishdan OLDIN operandlardan biri kasrli bo'lishi kerak; qavs ichida bo'lgach kech bo'ladi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "To'rtburchak",
                            "prompt_md": "`a = 12`, `b = 5` bo'lgan to'rtburchakning yuzasi va perimetrini chiqaring.\n\nKutilgan chiqish:\n\n```\n60\n34\n```",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a = 12;\n    int b = 5;\n\n    // hisoblang\n    return 0;\n}",
                            "solution_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a = 12;\n    int b = 5;\n\n    cout << a * b << endl;\n    cout << 2 * (a + b) << endl;\n    return 0;\n}",
                            "hint_uz": "Yuza = a * b, perimetr = 2 * (a + b).",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "60\n34", "is_sample": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "cin-bilan-kiritish",
                    "title_uz": "cin bilan ma'lumot kiritish",
                    "summary_uz": "Kirishdan son va matn o'qish",
                    "estimated_minutes": 10,
                    "content_md": """
## cin >> qanday ishlaydi

```cpp
int a;
cin >> a;
```

`>>` belgisi yo'nalishni ko'rsatadi: ma'lumot kirishdan **o'zgaruvchiga** oqadi. `cout <<` da esa teskari — o'zgaruvchidan ekranga.

## Bir nechta qiymatni birdan o'qish

```cpp
int a, b;
cin >> a >> b;
cout << a + b << endl;
```

`cin` bo'shliq va yangi qatorni **o'zi tashlab ketadi**, shuning uchun sonlar bir qatorda ham, alohida qatorlarda ham berilishi mumkin — kod o'zgarmaydi.

## Matn o'qish

```cpp
string ism;
cin >> ism;          // faqat birinchi so'z
getline(cin, ism);   // butun qator, bo'shliqlari bilan
```

## Kasrli son

```cpp
double narx;
cin >> narx;
```

## Odatiy topshiriq skeleti

```cpp
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;

    cout << n * 2 << endl;
    return 0;
}
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Ikkita sonni qo'shish",
                            "code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
                            "expected_output": "42",
                            "explanation_uz": "Kirishga `12 30` yoki ikki qatorda `12` va `30` deb yozing — natija bir xil.",
                        },
                        {
                            "title_uz": "Ism o'qish",
                            "code": '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string ism;\n    cin >> ism;\n    cout << "Salom, " << ism << "!" << endl;\n    return 0;\n}',
                            "expected_output": "Salom, Ali!",
                            "explanation_uz": "Kirish maydoniga `Ali` deb yozib ko'ring.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Kirishdan o'qish uchun qaysi operator ishlatiladi?",
                            "options": ["<<", ">>", "->", "<-"],
                            "correct_index": 1,
                            "explanation_uz": "`cin >> a` — ma'lumot kirishdan o'zgaruvchiga oqadi.",
                        },
                        {
                            "question_uz": "`cin >> a >> b;` da sonlar bir qatorda bo'lishi shartmi?",
                            "options": [
                                "Ha, aks holda xato",
                                "Yo'q — bo'shliq ham, yangi qator ham bo'ladi",
                                "Faqat vergul bilan",
                                "Faqat alohida qatorlarda",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "`cin` bo'shliq belgilarini ajratgich sifatida qabul qiladi.",
                        },
                        {
                            "question_uz": "Bo'shliqli butun qatorni o'qish uchun nima ishlatiladi?",
                            "options": ["cin >> s", "getline(cin, s)", "read(s)", "scanf(s)"],
                            "correct_index": 1,
                            "explanation_uz": "`cin >>` birinchi bo'shliqda to'xtaydi, `getline` esa qator oxirigacha o'qiydi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Yig'indi",
                            "prompt_md": "Ikkita butun son beriladi. Ularning yig'indisini chiqaring.\n\n**Kirish**\n```\n12 30\n```\n**Chiqish**\n```\n42\n```",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    // o'qing va chiqaring\n    return 0;\n}",
                            "solution_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
                            "hint_uz": "`cin >> a >> b;` bilan ikkala sonni birdan o'qing.",
                            "points": 10,
                            "tests": [
                                {"input": "12 30", "expected_output": "42", "is_sample": True},
                                {"input": "-5 5", "expected_output": "0", "is_sample": True},
                                {"input": "1000000 2000000", "expected_output": "3000000", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Kvadrat va kub",
                            "prompt_md": "Bitta butun son beriladi. Uning kvadratini va kubini alohida qatorlarda chiqaring.\n\n**Kirish**\n```\n3\n```\n**Chiqish**\n```\n9\n27\n```",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    return 0;\n}",
                            "solution_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    cout << n * n << endl;\n    cout << n * n * n << endl;\n    return 0;\n}",
                            "hint_uz": "Daraja operatori yo'q — shunchaki ko'paytiring.",
                            "points": 10,
                            "tests": [
                                {"input": "3", "expected_output": "9\n27", "is_sample": True},
                                {"input": "-2", "expected_output": "4\n-8", "is_sample": False},
                                {"input": "10", "expected_output": "100\n1000", "is_sample": False},
                            ],
                        },
                    ],
                },
            ],
        },
        {
            "slug": "shart-va-sikllar",
            "title_uz": "Shartlar va sikllar",
            "summary_uz": "if, for, while va mantiqiy amallar",
            "lessons": [
                {
                    "slug": "shartlar",
                    "title_uz": "if / else if / else",
                    "summary_uz": "Solishtirish va mantiqiy amallar",
                    "estimated_minutes": 11,
                    "content_md": """
## Shart yozish

```cpp
int yosh = 20;

if (yosh >= 18) {
    cout << "Voyaga yetgan" << endl;
} else {
    cout << "Voyaga yetmagan" << endl;
}
```

Shart qavs ichida, blok esa figurali qavs ichida.

## else if

```cpp
int ball = 75;

if (ball >= 90) {
    cout << "A'lo" << endl;
} else if (ball >= 70) {
    cout << "Yaxshi" << endl;
} else {
    cout << "Qoniqarsiz" << endl;
}
```

## Mantiqiy amallar

- `&&` — va
- `||` — yoki
- `!` — inkor

```cpp
if (yosh >= 18 && chipta) {
    cout << "Kirishi mumkin" << endl;
}
```

## Eng ko'p uchraydigan xato

```cpp
if (x = 5)    // ❌ qiymat berish, doim rost
if (x == 5)   // ✅ solishtirish
```

## switch — ko'p variantli tanlov

```cpp
int kun = 3;

switch (kun) {
    case 1: cout << "Dushanba"; break;
    case 2: cout << "Seshanba"; break;
    case 3: cout << "Chorshanba"; break;
    default: cout << "Noma'lum";
}
```

`break` yozilmasa, keyingi `case` ham bajarilib ketadi.
""".strip(),
                    "examples": [
                        {
                            "title_uz": "if / else",
                            "code": '#include <iostream>\nusing namespace std;\n\nint main() {\n    int yosh = 20;\n\n    if (yosh >= 18) {\n        cout << "Voyaga yetgan" << endl;\n    } else {\n        cout << "Voyaga yetmagan" << endl;\n    }\n    return 0;\n}',
                            "expected_output": "Voyaga yetgan",
                            "explanation_uz": "Shart rost bo'lgani uchun birinchi blok ishladi.",
                        },
                        {
                            "title_uz": "else if zanjiri",
                            "code": '#include <iostream>\nusing namespace std;\n\nint main() {\n    int ball = 75;\n\n    if (ball >= 90) cout << "A\'lo" << endl;\n    else if (ball >= 70) cout << "Yaxshi" << endl;\n    else cout << "Qoniqarsiz" << endl;\n    return 0;\n}',
                            "expected_output": "Yaxshi",
                            "explanation_uz": "Blokda bitta buyruq bo'lsa, figurali qavsni tushirib qoldirish mumkin.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`if (x = 5)` kodi nima qiladi?",
                            "options": [
                                "x ni 5 bilan solishtiradi",
                                "x ga 5 beradi va shart doim rost bo'ladi",
                                "Kompilyatsiya xatosi",
                                "Hech narsa qilmaydi",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "`=` qiymat beradi. Solishtirish uchun `==` kerak.",
                        },
                        {
                            "question_uz": "`switch` ichida `break` yozilmasa nima bo'ladi?",
                            "options": [
                                "Xatolik chiqadi",
                                "Keyingi case ham bajariladi",
                                "switch to'xtaydi",
                                "default ishlaydi",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "Bu «fallthrough» deb ataladi va odatda kutilmagan natija beradi.",
                        },
                        {
                            "question_uz": "`(5 > 3) || (2 > 7)` natijasi nima?",
                            "options": ["true", "false", "Xatolik", "0"],
                            "correct_index": 0,
                            "explanation_uz": "`||` uchun bitta shartning rost bo'lishi yetarli.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Juft yoki toq",
                            "prompt_md": "Butun son beriladi. Juft bo'lsa `Juft`, aks holda `Toq` chiqaring.\n\n**Kirish**\n```\n8\n```\n**Chiqish**\n```\nJuft\n```",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    return 0;\n}",
                            "solution_code": '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    if (n % 2 == 0) {\n        cout << "Juft" << endl;\n    } else {\n        cout << "Toq" << endl;\n    }\n    return 0;\n}',
                            "hint_uz": "`n % 2 == 0` sharti juftlikni tekshiradi.",
                            "points": 10,
                            "tests": [
                                {"input": "8", "expected_output": "Juft", "is_sample": True},
                                {"input": "7", "expected_output": "Toq", "is_sample": True},
                                {"input": "0", "expected_output": "Juft", "is_sample": False},
                                {"input": "-3", "expected_output": "Toq", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Eng katta son",
                            "prompt_md": "Uchta butun son beriladi. Eng kattasini chiqaring.\n\n**Kirish**\n```\n3 9 5\n```\n**Chiqish**\n```\n9\n```",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n\n    return 0;\n}",
                            "solution_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n\n    int eng = a;\n    if (b > eng) eng = b;\n    if (c > eng) eng = c;\n\n    cout << eng << endl;\n    return 0;\n}",
                            "hint_uz": "Birinchi sonni «hozircha eng katta» deb oling, keyin qolganlari bilan solishtiring.",
                            "points": 10,
                            "tests": [
                                {"input": "3 9 5", "expected_output": "9", "is_sample": True},
                                {"input": "10 2 4", "expected_output": "10", "is_sample": True},
                                {"input": "-5 -2 -9", "expected_output": "-2", "is_sample": False},
                                {"input": "7 7 7", "expected_output": "7", "is_sample": False},
                            ],
                        },
                    ],
                },
                {
                    "slug": "sikllar",
                    "title_uz": "for va while sikllari",
                    "summary_uz": "Takrorlash, yig'indi va break/continue",
                    "estimated_minutes": 12,
                    "content_md": """
## for sikli

```cpp
for (int i = 1; i <= 5; i++) {
    cout << i << endl;
}
```

Uch qism: boshlanish, shart, qadam.

## while sikli

```cpp
int i = 1;
while (i <= 5) {
    cout << i << endl;
    i++;
}
```

## Yig'indi to'plash

```cpp
int sum = 0;
for (int i = 1; i <= 10; i++) {
    sum += i;
}
cout << sum << endl;   // 55
```

## N ta sonni o'qish

Bu olimpiada masalalaridagi eng keng tarqalgan naqsh:

```cpp
int n;
cin >> n;

int sum = 0;
for (int i = 0; i < n; i++) {
    int x;
    cin >> x;
    sum += x;
}
cout << sum << endl;
```

## break va continue

```cpp
for (int i = 1; i < 10; i++) {
    if (i == 5) break;         // to'xtatadi
    if (i % 2 == 0) continue;  // qadamni tashlaydi
    cout << i << " ";          // 1 3
}
```

## Ichma-ich sikl

```cpp
for (int i = 1; i <= 3; i++) {
    for (int j = 1; j <= 3; j++) {
        cout << i * j << " ";
    }
    cout << endl;
}
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "1 dan 5 gacha",
                            "code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    for (int i = 1; i <= 5; i++) {\n        cout << i << endl;\n    }\n    return 0;\n}",
                            "expected_output": "1\n2\n3\n4\n5",
                            "explanation_uz": "`i++` har qadamda `i` ni bittaga oshiradi.",
                        },
                        {
                            "title_uz": "Yig'indi",
                            "code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int sum = 0;\n    for (int i = 1; i <= 10; i++) sum += i;\n    cout << sum << endl;\n    return 0;\n}",
                            "expected_output": "55",
                            "explanation_uz": "Blokda bitta buyruq bo'lsa figurali qavs shart emas.",
                        },
                        {
                            "title_uz": "Ichma-ich sikl",
                            "code": '#include <iostream>\nusing namespace std;\n\nint main() {\n    for (int i = 1; i <= 3; i++) {\n        for (int j = 1; j <= 3; j++) {\n            cout << i * j << " ";\n        }\n        cout << endl;\n    }\n    return 0;\n}',
                            "expected_output": "1 2 3\n2 4 6\n3 6 9",
                            "explanation_uz": "Ichki sikl tashqi siklning har bir qadami uchun to'liq aylanadi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`for (int i = 0; i < 4; i++)` necha marta ishlaydi?",
                            "options": ["3", "4", "5", "Cheksiz"],
                            "correct_index": 1,
                            "explanation_uz": "`i` 0, 1, 2, 3 qiymatlarini oladi.",
                        },
                        {
                            "question_uz": "`while` ichida qadam (`i++`) unutilsa nima bo'ladi?",
                            "options": [
                                "Sikl bir marta ishlaydi",
                                "Kompilyatsiya xatosi",
                                "Cheksiz sikl — vaqt chegarasidan oshadi",
                                "Sikl umuman ishlamaydi",
                            ],
                            "correct_index": 2,
                            "explanation_uz": "Shart hech qachon yolg'on bo'lmaydi va dastur to'xtatiladi.",
                        },
                        {
                            "question_uz": "Sikl ichida e'lon qilingan `int i` sikldan keyin mavjudmi?",
                            "options": ["Ha", "Yo'q", "Faqat while da", "Faqat 0 qiymati bilan"],
                            "correct_index": 1,
                            "explanation_uz": "`for (int i = ...)` da `i` faqat sikl ichida ko'rinadi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "N ta sonning yig'indisi",
                            "prompt_md": "Birinchi qatorda `n` soni, keyin `n` ta butun son beriladi. Ularning yig'indisini chiqaring.\n\n**Kirish**\n```\n4\n10 20 30 40\n```\n**Chiqish**\n```\n100\n```",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    int sum = 0;\n    // sikl yozing\n\n    cout << sum << endl;\n    return 0;\n}",
                            "solution_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    int sum = 0;\n    for (int i = 0; i < n; i++) {\n        int x;\n        cin >> x;\n        sum += x;\n    }\n\n    cout << sum << endl;\n    return 0;\n}",
                            "hint_uz": "Sikl ichida har safar yangi son o'qing va `sum` ga qo'shing.",
                            "points": 15,
                            "tests": [
                                {"input": "4\n10 20 30 40", "expected_output": "100", "is_sample": True},
                                {"input": "1\n7", "expected_output": "7", "is_sample": True},
                                {"input": "5\n-1 -2 -3 -4 -5", "expected_output": "-15", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Faktorial",
                            "prompt_md": "Butun son `n` (1 ≤ n ≤ 12) beriladi. `n!` (faktorial) ni hisoblang.\n\n`n! = 1 × 2 × ... × n`\n\n**Kirish**\n```\n5\n```\n**Chiqish**\n```\n120\n```",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    return 0;\n}",
                            "solution_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    long long natija = 1;\n    for (int i = 2; i <= n; i++) {\n        natija *= i;\n    }\n\n    cout << natija << endl;\n    return 0;\n}",
                            "hint_uz": "Natijani 1 dan boshlang va sikl ichida ko'paytirib boring.",
                            "points": 15,
                            "tests": [
                                {"input": "5", "expected_output": "120", "is_sample": True},
                                {"input": "1", "expected_output": "1", "is_sample": True},
                                {"input": "10", "expected_output": "3628800", "is_sample": False},
                                {"input": "12", "expected_output": "479001600", "is_sample": False},
                            ],
                        },
                    ],
                },
            ],
        },
        {
            "slug": "massiv-va-funksiya",
            "title_uz": "Massivlar va funksiyalar",
            "summary_uz": "Ko'p qiymat saqlash va kodni bo'laklash",
            "lessons": [
                {
                    "slug": "massivlar",
                    "title_uz": "Massivlar va vector",
                    "summary_uz": "Elementlar to'plami bilan ishlash",
                    "estimated_minutes": 13,
                    "content_md": """
## Oddiy massiv

```cpp
int sonlar[5] = {10, 20, 30, 40, 50};

cout << sonlar[0] << endl;   // 10
sonlar[1] = 25;
```

Indeks **0 dan** boshlanadi va massiv o'lchami e'lon paytida qat'iy belgilanadi.

**Ehtiyot bo'ling:** C++ chegaradan chiqishni tekshirmaydi. `sonlar[10]` xato bermaydi, lekin begona xotirani o'qiydi va dastur kutilmagan tarzda ishlaydi.

## Massivni to'ldirish va yurish

```cpp
int n;
cin >> n;

int a[100];
for (int i = 0; i < n; i++) {
    cin >> a[i];
}

int sum = 0;
for (int i = 0; i < n; i++) {
    sum += a[i];
}
cout << sum << endl;
```

## vector — o'lchami o'zgaradigan massiv

```cpp
#include <vector>

vector<int> v;
v.push_back(10);
v.push_back(20);

cout << v.size() << endl;   // 2
cout << v[0] << endl;       // 10
```

`vector` o'lchamini oldindan bilish shart emas — bu uni oddiy massivdan qulayroq qiladi.

## Diapazonli sikl

```cpp
vector<int> v = {1, 2, 3};
for (int x : v) {
    cout << x << " ";
}
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Oddiy massiv",
                            "code": '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a[5] = {10, 20, 30, 40, 50};\n    cout << a[0] << endl;\n    cout << a[4] << endl;\n    return 0;\n}',
                            "expected_output": "10\n50",
                            "explanation_uz": "5 elementli massivda indekslar 0 dan 4 gacha.",
                        },
                        {
                            "title_uz": "vector bilan ishlash",
                            "code": '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> v;\n    v.push_back(10);\n    v.push_back(20);\n\n    cout << v.size() << endl;\n    for (int x : v) cout << x << " ";\n    cout << endl;\n    return 0;\n}',
                            "expected_output": "2\n10 20",
                            "explanation_uz": "`push_back` oxiriga qo'shadi, `size()` esa elementlar sonini qaytaradi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`int a[5]` massivida oxirgi element indeksi qanday?",
                            "options": ["5", "4", "0", "6"],
                            "correct_index": 1,
                            "explanation_uz": "Indeks 0 dan boshlanadi, shuning uchun oxirgisi `a[4]`.",
                        },
                        {
                            "question_uz": "`vector` ning oddiy massivdan asosiy afzalligi nima?",
                            "options": [
                                "Tezroq ishlaydi",
                                "O'lchami dastur ishlash paytida o'zgaradi",
                                "Kam xotira oladi",
                                "Indeks 1 dan boshlanadi",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "`vector` o'lchamini oldindan bilish shart emas — `push_back` bilan o'sib boradi.",
                        },
                        {
                            "question_uz": "Massiv chegarasidan tashqariga murojaat qilinsa nima bo'ladi?",
                            "options": [
                                "Kompilyatsiya xatosi",
                                "Aniq xato xabari chiqadi",
                                "Tekshirilmaydi — kutilmagan natija bo'ladi",
                                "0 qaytaradi",
                            ],
                            "correct_index": 2,
                            "explanation_uz": "C++ tezlik uchun chegarani tekshirmaydi; indeksni o'zingiz nazorat qilishingiz kerak.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Massivdagi eng katta",
                            "prompt_md": "Birinchi qatorda `n`, keyin `n` ta son beriladi. Eng katta sonni chiqaring.\n\n**Kirish**\n```\n5\n4 8 15 16 23\n```\n**Chiqish**\n```\n23\n```",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    return 0;\n}",
                            "solution_code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    int eng;\n    for (int i = 0; i < n; i++) {\n        int x;\n        cin >> x;\n        if (i == 0 || x > eng) eng = x;\n    }\n\n    cout << eng << endl;\n    return 0;\n}",
                            "hint_uz": "Barcha sonni saqlash shart emas — o'qib borib, eng kattasini eslab qolish yetarli.",
                            "points": 15,
                            "tests": [
                                {"input": "5\n4 8 15 16 23", "expected_output": "23", "is_sample": True},
                                {"input": "1\n-7", "expected_output": "-7", "is_sample": True},
                                {"input": "4\n-5 -2 -9 -1", "expected_output": "-1", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Teskari tartibda chiqarish",
                            "prompt_md": "Birinchi qatorda `n`, keyin `n` ta son beriladi. Ularni teskari tartibda, bir qatorda bo'shliq bilan chiqaring.\n\n**Kirish**\n```\n4\n1 2 3 4\n```\n**Chiqish**\n```\n4 3 2 1\n```",
                            "starter_code": "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    vector<int> v(n);\n\n    return 0;\n}",
                            "solution_code": '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n\n    vector<int> v(n);\n    for (int i = 0; i < n; i++) cin >> v[i];\n\n    for (int i = n - 1; i >= 0; i--) {\n        cout << v[i];\n        if (i > 0) cout << " ";\n    }\n    cout << endl;\n    return 0;\n}',
                            "hint_uz": "Avval barcha sonni o'qing, keyin oxiridan boshlab chiqaring.",
                            "points": 15,
                            "tests": [
                                {"input": "4\n1 2 3 4", "expected_output": "4 3 2 1", "is_sample": True},
                                {"input": "1\n42", "expected_output": "42", "is_sample": True},
                                {"input": "3\n-1 0 5", "expected_output": "5 0 -1", "is_sample": False},
                            ],
                        },
                    ],
                },
                {
                    "slug": "funksiyalar",
                    "title_uz": "Funksiyalar",
                    "summary_uz": "E'lon, parametr va qaytariladigan qiymat",
                    "estimated_minutes": 12,
                    "content_md": """
## Funksiya tuzilishi

```cpp
int kvadrat(int x) {
    return x * x;
}
```

- `int` — **qaytariladigan** qiymat turi;
- `kvadrat` — nom;
- `(int x)` — parametr va uning turi.

## Chaqirish

```cpp
#include <iostream>
using namespace std;

int kvadrat(int x) {
    return x * x;
}

int main() {
    cout << kvadrat(5) << endl;   // 25
    return 0;
}
```

**Muhim:** funksiya `main()` dan **oldin** e'lon qilinishi kerak — aks holda kompilyator uni tanimaydi.

## Qiymat qaytarmaydigan funksiya

```cpp
void salomlash(string ism) {
    cout << "Salom, " << ism << "!" << endl;
}
```

`void` — «hech narsa qaytarmaydi» degani.

## Bir nechta parametr

```cpp
int yigindi(int a, int b) {
    return a + b;
}
```

## Nima uchun funksiya kerak?

- takrorlanuvchi kodni bir joyga yig'adi;
- dasturni kichik, tekshiriladigan bo'laklarga ajratadi;
- xatoni tuzatish bitta joyda bo'ladi.
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Qiymat qaytaruvchi funksiya",
                            "code": "#include <iostream>\nusing namespace std;\n\nint kvadrat(int x) {\n    return x * x;\n}\n\nint main() {\n    cout << kvadrat(5) << endl;\n    cout << kvadrat(5) + 1 << endl;\n    return 0;\n}",
                            "expected_output": "25\n26",
                            "explanation_uz": "`return` qaytargan qiymat ustida amal bajarish mumkin.",
                        },
                        {
                            "title_uz": "void funksiya",
                            "code": '#include <iostream>\n#include <string>\nusing namespace std;\n\nvoid salomlash(string ism) {\n    cout << "Salom, " << ism << "!" << endl;\n}\n\nint main() {\n    salomlash("Ali");\n    salomlash("Guli");\n    return 0;\n}',
                            "expected_output": "Salom, Ali!\nSalom, Guli!",
                            "explanation_uz": "`void` funksiya qiymat qaytarmaydi, faqat amal bajaradi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`void` nimani bildiradi?",
                            "options": [
                                "Funksiya bo'sh",
                                "Funksiya qiymat qaytarmaydi",
                                "Funksiya xato beradi",
                                "Funksiya faqat bir marta chaqiriladi",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "`void` funksiyada `return` qiymat bilan yozilmaydi.",
                        },
                        {
                            "question_uz": "Funksiya `main()` dan keyin yozilsa nima bo'ladi?",
                            "options": [
                                "Farqi yo'q",
                                "Kompilyator uni tanimaydi (prototip yozilmasa)",
                                "Sekinroq ishlaydi",
                                "Avtomatik ko'chiriladi",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "C++ faylni yuqoridan pastga o'qiydi; oldindan e'lon (prototip) kerak bo'ladi.",
                        },
                        {
                            "question_uz": "`int f(int x) { return x + 1; }` bo'lsa, `f(f(1))` nima qaytaradi?",
                            "options": ["1", "2", "3", "Xatolik"],
                            "correct_index": 2,
                            "explanation_uz": "Avval `f(1)` = 2, keyin `f(2)` = 3.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Juftlik funksiyasi",
                            "prompt_md": "`bool juftmi(int n)` funksiyasini yozing — son juft bo'lsa `true` qaytarsin.\n\nDastur bitta son o'qiydi va `Juft` yoki `Toq` chiqaradi.\n\n**Kirish**\n```\n8\n```\n**Chiqish**\n```\nJuft\n```",
                            "starter_code": '#include <iostream>\nusing namespace std;\n\nbool juftmi(int n) {\n    // return yozing\n}\n\nint main() {\n    int n;\n    cin >> n;\n    cout << (juftmi(n) ? "Juft" : "Toq") << endl;\n    return 0;\n}',
                            "solution_code": '#include <iostream>\nusing namespace std;\n\nbool juftmi(int n) {\n    return n % 2 == 0;\n}\n\nint main() {\n    int n;\n    cin >> n;\n    cout << (juftmi(n) ? "Juft" : "Toq") << endl;\n    return 0;\n}',
                            "hint_uz": "`return n % 2 == 0;` — solishtirish natijasining o'zi `bool`.",
                            "points": 10,
                            "tests": [
                                {"input": "8", "expected_output": "Juft", "is_sample": True},
                                {"input": "7", "expected_output": "Toq", "is_sample": True},
                                {"input": "0", "expected_output": "Juft", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Daraja funksiyasi",
                            "prompt_md": "`long long daraja(int a, int b)` funksiyasini yozing — `a` ning `b`-darajasini qaytarsin (`b ≥ 0`).\n\n**Kirish**\n```\n2 10\n```\n**Chiqish**\n```\n1024\n```",
                            "starter_code": "#include <iostream>\nusing namespace std;\n\nlong long daraja(int a, int b) {\n    // sikl bilan hisoblang\n}\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << daraja(a, b) << endl;\n    return 0;\n}",
                            "solution_code": "#include <iostream>\nusing namespace std;\n\nlong long daraja(int a, int b) {\n    long long natija = 1;\n    for (int i = 0; i < b; i++) {\n        natija *= a;\n    }\n    return natija;\n}\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << daraja(a, b) << endl;\n    return 0;\n}",
                            "hint_uz": "Natijani 1 dan boshlab, `b` marta `a` ga ko'paytiring. `b = 0` bo'lsa natija 1 bo'lib qoladi.",
                            "points": 15,
                            "tests": [
                                {"input": "2 10", "expected_output": "1024", "is_sample": True},
                                {"input": "5 0", "expected_output": "1", "is_sample": True},
                                {"input": "3 5", "expected_output": "243", "is_sample": False},
                                {"input": "7 2", "expected_output": "49", "is_sample": False},
                            ],
                        },
                    ],
                },
            ],
        },
    ],
}
