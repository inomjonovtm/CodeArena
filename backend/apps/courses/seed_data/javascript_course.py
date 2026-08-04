"""«JavaScript asoslari» kursining kontenti."""

COURSE = {
    "slug": "javascript-asoslari",
    "title_uz": "JavaScript asoslari",
    "subtitle_uz": "Brauzer va Node.js uchun birinchi qadamlar",
    "language": "javascript",
    "level": "beginner",
    "badge": "JS",
    "accent_color": "#f7df1e",
    "estimated_hours": 10,
    "order": 2,
    "is_featured": True,
    "description_uz": """
JavaScript — veb sahifalarni «jonlantiradigan» til. Bugun u faqat brauzerda emas, server (Node.js), mobil ilova va hatto ish stoli dasturlarida ham ishlatiladi.

Bu kursda til asoslari o'rgatiladi: o'zgaruvchilar, satrlar, shartlar, sikllar, massivlar va funksiyalar. Har bir mavzu oxirida test va kod yozadigan topshiriqlar bor.

Topshiriqlardagi kod **Node.js** muhitida bajariladi: ma'lumot kirishdan (stdin) o'qiladi, javob `console.log()` bilan chiqariladi.
""".strip(),
    "modules": [
        {
            "slug": "kirish",
            "title_uz": "Kirish",
            "summary_uz": "Birinchi dastur, o'zgaruvchilar va ma'lumot turlari",
            "lessons": [
                {
                    "slug": "birinchi-dastur",
                    "title_uz": "Birinchi dastur va console.log()",
                    "summary_uz": "Chiqarish, nuqta-vergul va sintaksis",
                    "estimated_minutes": 8,
                    "content_md": """
## JavaScript qayerda ishlaydi?

- **Brauzerda** — sahifadagi tugmalar, animatsiya, forma tekshiruvi;
- **Serverda (Node.js)** — API, bot, skript.

Bu kursda kod Node.js muhitida bajariladi — ya'ni brauzersiz, xuddi oddiy dastur kabi.

## Ekranga chiqarish

```javascript
console.log("Salom, dunyo!");
```

`console.log()` — chiqarish funksiyasi. Qavs ichiga bir nechta qiymat ham berish mumkin, ular bo'shliq bilan ajratiladi:

```javascript
console.log("Yosh:", 15);
```

## Nuqta-vergul

JavaScriptda qator oxiriga `;` qo'yish odat. Til uni o'zi qo'shishga harakat qiladi, lekin ba'zi holatlarda xato qiladi — shuning uchun ochiq yozgan ma'qul.

## Izohlar

```javascript
// bir qatorli izoh

/* bir necha
   qatorli izoh */
```

## Katta-kichik harf

`console.log` va `Console.Log` — ikki xil narsa. JavaScript katta va kichik harfni farqlaydi.
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Salom, dunyo!",
                            "code": 'console.log("Salom, dunyo!");',
                            "expected_output": "Salom, dunyo!",
                            "explanation_uz": "`console.log()` qavs ichidagi qiymatni chiqaradi.",
                        },
                        {
                            "title_uz": "Bir nechta qiymat va izoh",
                            "code": '// bu izoh — bajarilmaydi\nconsole.log("Yosh:", 15);\nconsole.log(2 + 3);',
                            "expected_output": "Yosh: 15\n5",
                            "explanation_uz": "Vergul bilan ajratilgan qiymatlar orasiga bo'shliq qo'yiladi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "JavaScriptda ekranga chiqarish uchun nima ishlatiladi?",
                            "options": ["print()", "echo", "console.log()", "System.out.println()"],
                            "correct_index": 2,
                            "explanation_uz": "`console.log()` — Node.js va brauzerda ishlaydigan standart chiqarish usuli.",
                        },
                        {
                            "question_uz": "Bir qatorli izoh qanday yoziladi?",
                            "options": ["# izoh", "// izoh", "-- izoh", "<!-- izoh -->"],
                            "correct_index": 1,
                            "explanation_uz": "`//` bir qatorli, `/* */` esa ko'p qatorli izoh.",
                        },
                        {
                            "question_uz": "`Console.log(\"a\")` kodi nima bo'ladi?",
                            "options": ["a chiqaradi", "Xatolik beradi", "Bo'sh qator chiqaradi", "Izoh bo'lib qoladi"],
                            "correct_index": 1,
                            "explanation_uz": "JavaScript katta-kichik harfni farqlaydi — `Console` degan obyekt yo'q.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Birinchi chiqish",
                            "prompt_md": "Ekranga aynan `Salom, CodeArena!` matnini chiqaring.",
                            "starter_code": "// Shu yerga kod yozing\n",
                            "solution_code": 'console.log("Salom, CodeArena!");',
                            "hint_uz": "`console.log(\"...\")` ko'rinishida yozing.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "Salom, CodeArena!", "is_sample": True},
                            ],
                        },
                        {
                            "title_uz": "Uch qator",
                            "prompt_md": "Uchta alohida `console.log()` bilan quyidagi qatorlarni chiqaring:\n\n```\nJavaScript\no'rganyapman\n2026\n```",
                            "starter_code": "",
                            "solution_code": 'console.log("JavaScript");\nconsole.log("o\'rganyapman");\nconsole.log(2026);',
                            "hint_uz": "Son qo'shtirnoqsiz yoziladi.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "JavaScript\no'rganyapman\n2026", "is_sample": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "ozgaruvchilar",
                    "title_uz": "O'zgaruvchilar: let va const",
                    "summary_uz": "Qiymat saqlash va ma'lumot turlari",
                    "estimated_minutes": 10,
                    "content_md": """
## let va const

```javascript
let yosh = 15;        // keyin o'zgartirish mumkin
const PI = 3.14;      // o'zgarmas
```

Qoida oddiy: **avval `const`**, agar qiymat haqiqatan o'zgarishi kerak bo'lsagina `let`. Bu tasodifiy o'zgarishlardan himoya qiladi.

`var` ham bor, lekin u eski va chalkash qoidalarga ega — yangi kodda ishlatilmaydi.

```javascript
let ball = 10;
ball = ball + 5;      // ✅ ruxsat
const narx = 100;
narx = 200;           // ❌ TypeError
```

## Asosiy turlar

| Tur | Misol | Izoh |
|-----|-------|------|
| `number` | `15`, `3.14` | butun va kasrli son — bitta tur |
| `string` | `"Ali"`, `'Ali'` | matn |
| `boolean` | `true`, `false` | rost / yolg'on |
| `undefined` | — | qiymat berilmagan |
| `null` | `null` | «ataylab bo'sh» |

Turni bilish uchun `typeof`:

```javascript
console.log(typeof 15);       // number
console.log(typeof "Ali");    // string
console.log(typeof true);     // boolean
```

## Nomlash

- harf, `_` yoki `$` bilan boshlanadi;
- so'zlar `camelCase` uslubida qo'shiladi: `talabaYoshi`;
- `let`, `const`, `if` kabi kalit so'zlar nom bo'la olmaydi.
""".strip(),
                    "examples": [
                        {
                            "title_uz": "let va const",
                            "code": 'let ball = 10;\nball = ball + 5;\nconsole.log(ball);\n\nconst PI = 3.14;\nconsole.log(PI);',
                            "expected_output": "15\n3.14",
                            "explanation_uz": "`let` bilan e'lon qilingan qiymatni o'zgartirish mumkin, `const` bilan — yo'q.",
                        },
                        {
                            "title_uz": "typeof",
                            "code": 'console.log(typeof 15);\nconsole.log(typeof "Ali");\nconsole.log(typeof true);',
                            "expected_output": "number\nstring\nboolean",
                            "explanation_uz": "JavaScriptda butun va kasrli son bitta `number` turiga tegishli.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Qiymati o'zgarmaydigan o'zgaruvchi qanday e'lon qilinadi?",
                            "options": ["let", "const", "var", "final"],
                            "correct_index": 1,
                            "explanation_uz": "`const` bilan e'lon qilingan o'zgaruvchiga qayta qiymat berib bo'lmaydi.",
                        },
                        {
                            "question_uz": "`typeof 3.14` nima qaytaradi?",
                            "options": ["float", "double", "number", "decimal"],
                            "correct_index": 2,
                            "explanation_uz": "JavaScriptda barcha sonlar `number` turida.",
                        },
                        {
                            "question_uz": "Qaysi nom JavaScript uslubiga mos?",
                            "options": ["talaba_yoshi", "TalabaYoshi", "talabaYoshi", "talaba-yoshi"],
                            "correct_index": 2,
                            "explanation_uz": "JavaScriptda `camelCase` qabul qilingan. Chiziqcha esa umuman ruxsat etilmaydi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Uchta o'zgaruvchi",
                            "prompt_md": "Uchta o'zgaruvchi e'lon qiling va ularni bitta `console.log()` bilan chiqaring:\n\n- `ism` = `Dilnoza`\n- `yosh` = `16`\n- `shahar` = `Toshkent`\n\nKutilgan chiqish:\n\n```\nDilnoza 16 Toshkent\n```",
                            "starter_code": "const ism = ;\nconst yosh = ;\nconst shahar = ;\n\nconsole.log(ism, yosh, shahar);",
                            "solution_code": 'const ism = "Dilnoza";\nconst yosh = 16;\nconst shahar = "Toshkent";\n\nconsole.log(ism, yosh, shahar);',
                            "hint_uz": "Matn qo'shtirnoqda, son qo'shtirnoqsiz.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "Dilnoza 16 Toshkent", "is_sample": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "satrlar-va-shablon",
                    "title_uz": "Satrlar va shablon qatorlari",
                    "summary_uz": "Matn birlashtirish va `${}` sintaksisi",
                    "estimated_minutes": 10,
                    "content_md": """
## Uch xil tirnoq

```javascript
const a = "qo'shtirnoq";
const b = 'bittalik tirnoq';
const c = `teskari tirnoq`;   // shablon qatori
```

## Shablon qatori (template literal)

Teskari tirnoq (`` ` ``) ichida `${}` orqali o'zgaruvchi qo'yish mumkin:

```javascript
const ism = "Ali";
const yosh = 15;

console.log(`${ism} ${yosh} yoshda`);
```

Bu `"" + ism + " " + yosh + ""` ko'rinishidagi uzun yozuvdan ancha qulay.

## Foydali metodlar

```javascript
const matn = "Salom Dunyo";

console.log(matn.length);              // 11
console.log(matn.toUpperCase());       // SALOM DUNYO
console.log(matn.toLowerCase());       // salom dunyo
console.log(matn.replace("Dunyo", "Olam"));
console.log(matn.includes("Salom"));   // true
```

**Diqqat:** `length` — metod emas, xususiyat. Qavs qo'yilmaydi.

## Belgini olish

```javascript
const matn = "Kod";
console.log(matn[0]);        // K
console.log(matn.slice(0, 2));   // Ko
```

## Sonni satrga, satrni songa

```javascript
Number("42") + 1     // 43
String(42) + "1"     // "421"
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Shablon qatori",
                            "code": 'const ism = "Ali";\nconst yosh = 15;\nconsole.log(`${ism} ${yosh} yoshda`);',
                            "expected_output": "Ali 15 yoshda",
                            "explanation_uz": "Teskari tirnoq ichidagi `${}` avtomatik hisoblanadi.",
                        },
                        {
                            "title_uz": "Satr metodlari",
                            "code": 'const matn = "Salom Dunyo";\nconsole.log(matn.length);\nconsole.log(matn.toUpperCase());\nconsole.log(matn.includes("Dunyo"));',
                            "expected_output": "11\nSALOM DUNYO\ntrue",
                            "explanation_uz": "`length` qavssiz yoziladi, qolgan metodlar esa qavs bilan chaqiriladi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Shablon qatorida o'zgaruvchi qanday qo'yiladi?",
                            "options": ["{ism}", "${ism}", "%ism%", "#{ism}"],
                            "correct_index": 1,
                            "explanation_uz": "Teskari tirnoq ichida `${...}` sintaksisi ishlatiladi.",
                        },
                        {
                            "question_uz": "`\"CodeArena\".length` nima qaytaradi?",
                            "options": ["8", "9", "10", "Xatolik"],
                            "correct_index": 1,
                            "explanation_uz": "So'zda 9 ta belgi bor va `length` qavssiz yoziladi.",
                        },
                        {
                            "question_uz": "`Number(\"7\") + 1` natijasi nima?",
                            "options": ["71", "8", "\"71\"", "NaN"],
                            "correct_index": 1,
                            "explanation_uz": "`Number()` satrni songa aylantiradi, shundan keyin qo'shish arifmetik bo'ladi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Tanishtiruv",
                            "prompt_md": "Shablon qatoridan foydalanib quyidagi matnni chiqaring:\n\n```\nMening ismim Aziz, men 17 yoshdaman.\n```",
                            "starter_code": 'const ism = "Aziz";\nconst yosh = 17;\n\n// shablon qatori bilan chiqaring',
                            "solution_code": 'const ism = "Aziz";\nconst yosh = 17;\n\nconsole.log(`Mening ismim ${ism}, men ${yosh} yoshdaman.`);',
                            "hint_uz": "Teskari tirnoq ` ` ichida yozing.",
                            "points": 5,
                            "tests": [
                                {"input": "", "expected_output": "Mening ismim Aziz, men 17 yoshdaman.", "is_sample": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "kiritish",
                    "title_uz": "Ma'lumot kiritish (stdin)",
                    "summary_uz": "Node.js da kirishdan o'qish",
                    "estimated_minutes": 9,
                    "content_md": """
## Kirishdan o'qish

Brauzerda `prompt()` bor, lekin Node.js da u yo'q. Topshiriqlarda ma'lumot **standart kirish** orqali keladi va uni bitta qatorda o'qib olish mumkin:

```javascript
const input = require("fs").readFileSync(0, "utf8").trim();
console.log(input);
```

`readFileSync(0, "utf8")` — butun kirishni matn sifatida o'qiydi, `trim()` esa boshi va oxiridagi ortiqcha bo'shliq va yangi qatorni olib tashlaydi.

## Bir nechta qator

```javascript
const lines = require("fs").readFileSync(0, "utf8").trim().split("\\n");

const a = Number(lines[0]);
const b = Number(lines[1]);
console.log(a + b);
```

## Bir qatordagi bir nechta son

```javascript
const nums = require("fs")
  .readFileSync(0, "utf8")
  .trim()
  .split(/\\s+/)
  .map(Number);

console.log(nums[0] + nums[1]);
```

`split(/\\s+/)` istalgan sondagi bo'shliq bo'yicha ajratadi, `map(Number)` esa har bir bo'lakni songa aylantiradi.

## Nega Number() shart?

Kirishdan kelgan har bir bo'lak — **satr**. `"2" + "3"` natijasi `"23"` bo'ladi, `2 + 3` esa `5`. Bu eng ko'p uchraydigan xato.
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Bitta qatorni o'qish",
                            "code": 'const ism = require("fs").readFileSync(0, "utf8").trim();\nconsole.log(`Salom, ${ism}!`);',
                            "expected_output": "Salom, Ali!",
                            "explanation_uz": "«Sinab ko'rish» oynasidagi kirish maydoniga `Ali` deb yozing.",
                        },
                        {
                            "title_uz": "Ikki sonni qo'shish",
                            "code": 'const lines = require("fs").readFileSync(0, "utf8").trim().split("\\n");\nconst a = Number(lines[0]);\nconst b = Number(lines[1]);\nconsole.log(a + b);',
                            "expected_output": "42",
                            "explanation_uz": "Kirishga ikki qator yozing: `12` va `30`.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Kirishdan kelgan ma'lumot qaysi turda bo'ladi?",
                            "options": ["number", "string", "array", "object"],
                            "correct_index": 1,
                            "explanation_uz": "Kirish har doim matn sifatida keladi — sonlar uchun `Number()` kerak.",
                        },
                        {
                            "question_uz": "`\"2\" + \"3\"` natijasi nima?",
                            "options": ["5", "23", "\"5\"", "NaN"],
                            "correct_index": 1,
                            "explanation_uz": "Ikki satr `+` bilan ulanadi, qo'shilmaydi.",
                        },
                        {
                            "question_uz": "`trim()` nima qiladi?",
                            "options": [
                                "Satrni bo'laklarga ajratadi",
                                "Boshi va oxiridagi bo'shliqni olib tashlaydi",
                                "Satrni songa aylantiradi",
                                "Katta harfga o'tkazadi",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "Kirish oxiridagi yangi qator belgisi ham `trim()` bilan olib tashlanadi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Ikki sonning ko'paytmasi",
                            "prompt_md": "Ikkita butun son alohida qatorlarda beriladi. Ularning ko'paytmasini chiqaring.\n\n**Kirish**\n```\n6\n7\n```\n**Chiqish**\n```\n42\n```",
                            "starter_code": 'const lines = require("fs").readFileSync(0, "utf8").trim().split("\\n");\n\n',
                            "solution_code": 'const lines = require("fs").readFileSync(0, "utf8").trim().split("\\n");\n\nconst a = Number(lines[0]);\nconst b = Number(lines[1]);\nconsole.log(a * b);',
                            "hint_uz": "`Number(lines[0])` va `Number(lines[1])` ni ko'paytiring.",
                            "points": 10,
                            "tests": [
                                {"input": "6\n7", "expected_output": "42", "is_sample": True},
                                {"input": "0\n99", "expected_output": "0", "is_sample": True},
                                {"input": "-3\n5", "expected_output": "-15", "is_sample": False},
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
                    "summary_uz": "Shart, solishtirish va === farqi",
                    "estimated_minutes": 11,
                    "content_md": """
## Shart yozish

```javascript
const yosh = 20;

if (yosh >= 18) {
  console.log("Voyaga yetgan");
} else {
  console.log("Voyaga yetmagan");
}
```

Shart **qavs ichida**, blok esa **figurali qavs ichida** yoziladi.

## == va === farqi

Bu JavaScriptdagi eng muhim tafsilotlardan biri:

```javascript
console.log(5 == "5");    // true  — tur solishtirilmaydi
console.log(5 === "5");   // false — tur ham solishtiriladi
```

**Har doim `===` ishlating.** `==` avtomatik tur o'zgartirishi tufayli kutilmagan natijalar beradi.

## else if

```javascript
const ball = 75;

if (ball >= 90) {
  console.log("A'lo");
} else if (ball >= 70) {
  console.log("Yaxshi");
} else {
  console.log("Qoniqarsiz");
}
```

## Mantiqiy amallar

- `&&` — va (ikkalasi ham rost)
- `||` — yoki (kamida bittasi rost)
- `!` — inkor

```javascript
if (yosh >= 18 && chipta) {
  console.log("Kirishi mumkin");
}
```

## Uchlik operator

Qisqa shart uchun:

```javascript
const holat = yosh >= 18 ? "katta" : "kichik";
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "if / else",
                            "code": 'const yosh = 20;\n\nif (yosh >= 18) {\n  console.log("Voyaga yetgan");\n} else {\n  console.log("Voyaga yetmagan");\n}',
                            "expected_output": "Voyaga yetgan",
                            "explanation_uz": "Shart rost bo'lgani uchun birinchi blok bajarildi.",
                        },
                        {
                            "title_uz": "== va === farqi",
                            "code": 'console.log(5 == "5");\nconsole.log(5 === "5");',
                            "expected_output": "true\nfalse",
                            "explanation_uz": "`==` turni tenglashtiradi, `===` esa tur va qiymatni birga tekshiradi.",
                        },
                        {
                            "title_uz": "Uchlik operator",
                            "code": 'const yosh = 15;\nconst holat = yosh >= 18 ? "katta" : "kichik";\nconsole.log(holat);',
                            "expected_output": "kichik",
                            "explanation_uz": "`shart ? rost : yolgon` — qisqa `if/else`.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Qaysi solishtirish operatori turni ham tekshiradi?",
                            "options": ["==", "===", "=", "!="],
                            "correct_index": 1,
                            "explanation_uz": "`===` qat'iy tenglik — qiymat va tur mos kelishi kerak.",
                        },
                        {
                            "question_uz": "`\"10\" == 10` natijasi nima?",
                            "options": ["true", "false", "Xatolik", "undefined"],
                            "correct_index": 0,
                            "explanation_uz": "`==` satrni songa aylantirib solishtiradi, shuning uchun `true`.",
                        },
                        {
                            "question_uz": "`&&` operatori qachon `true` beradi?",
                            "options": [
                                "Kamida bittasi rost bo'lsa",
                                "Ikkalasi ham rost bo'lsa",
                                "Ikkalasi ham yolg'on bo'lsa",
                                "Har doim",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "`&&` — mantiqiy «va», ikkala shart ham bajarilishi kerak.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Musbat, manfiy yoki nol",
                            "prompt_md": "Bitta butun son beriladi. Agar son musbat bo'lsa `Musbat`, manfiy bo'lsa `Manfiy`, nolga teng bo'lsa `Nol` deb chiqaring.\n\n**Kirish**\n```\n-7\n```\n**Chiqish**\n```\nManfiy\n```",
                            "starter_code": 'const n = Number(require("fs").readFileSync(0, "utf8").trim());\n\n',
                            "solution_code": 'const n = Number(require("fs").readFileSync(0, "utf8").trim());\n\nif (n > 0) {\n  console.log("Musbat");\n} else if (n < 0) {\n  console.log("Manfiy");\n} else {\n  console.log("Nol");\n}',
                            "hint_uz": "Uchta holatni `if / else if / else` bilan ajrating.",
                            "points": 10,
                            "tests": [
                                {"input": "-7", "expected_output": "Manfiy", "is_sample": True},
                                {"input": "0", "expected_output": "Nol", "is_sample": True},
                                {"input": "12", "expected_output": "Musbat", "is_sample": False},
                            ],
                        },
                    ],
                },
                {
                    "slug": "sikllar",
                    "title_uz": "for va while sikllari",
                    "summary_uz": "Takrorlash, break va continue",
                    "estimated_minutes": 12,
                    "content_md": """
## for sikli

```javascript
for (let i = 1; i <= 5; i++) {
  console.log(i);
}
```

Uch qism nuqta-vergul bilan ajratiladi:

1. **boshlanish** — `let i = 1`
2. **shart** — `i <= 5`
3. **qadam** — `i++` (ya'ni `i = i + 1`)

## while sikli

```javascript
let i = 1;
while (i <= 5) {
  console.log(i);
  i++;
}
```

`i++` unutilsa, sikl cheksiz ishlaydi va dastur vaqt chegarasidan oshadi.

## Yig'indi to'plash

```javascript
let sum = 0;
for (let i = 1; i <= 10; i++) {
  sum += i;
}
console.log(sum);   // 55
```

## break va continue

```javascript
for (let i = 1; i < 10; i++) {
  if (i === 5) break;      // siklni to'xtatadi
  if (i % 2 === 0) continue;  // qadamni tashlab ketadi
  console.log(i);          // 1 3
}
```

## Massiv bo'ylab yurish

```javascript
const sonlar = [10, 20, 30];

for (const son of sonlar) {
  console.log(son);
}
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "1 dan 5 gacha",
                            "code": "for (let i = 1; i <= 5; i++) {\n  console.log(i);\n}",
                            "expected_output": "1\n2\n3\n4\n5",
                            "explanation_uz": "`i++` har qadamda `i` ni bittaga oshiradi.",
                        },
                        {
                            "title_uz": "Yig'indi",
                            "code": "let sum = 0;\nfor (let i = 1; i <= 10; i++) {\n  sum += i;\n}\nconsole.log(sum);",
                            "expected_output": "55",
                            "explanation_uz": "`sum += i` — `sum = sum + i` ning qisqa yozuvi.",
                        },
                        {
                            "title_uz": "for...of",
                            "code": "const sonlar = [10, 20, 30];\nfor (const son of sonlar) {\n  console.log(son);\n}",
                            "expected_output": "10\n20\n30",
                            "explanation_uz": "`for...of` massiv elementlarini birma-bir beradi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`for (let i = 0; i < 3; i++)` sikli necha marta ishlaydi?",
                            "options": ["2", "3", "4", "Cheksiz"],
                            "correct_index": 1,
                            "explanation_uz": "`i` 0, 1, 2 qiymatlarini oladi — jami 3 marta.",
                        },
                        {
                            "question_uz": "`i++` nimaga teng?",
                            "options": ["i = 1", "i = i + 1", "i == 1", "i + 1 (i o'zgarmaydi)"],
                            "correct_index": 1,
                            "explanation_uz": "`++` operatori qiymatni bittaga oshirib, o'sha o'zgaruvchiga yozadi.",
                        },
                        {
                            "question_uz": "`break` nima qiladi?",
                            "options": [
                                "Joriy qadamni tashlab ketadi",
                                "Siklni butunlay to'xtatadi",
                                "Dasturni qayta ishga tushiradi",
                                "Xatolik beradi",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "Qadamni tashlab ketish uchun `continue` ishlatiladi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "1 dan N gacha yig'indi",
                            "prompt_md": "Butun son `n` beriladi. 1 dan `n` gacha sonlar yig'indisini chiqaring.\n\n**Kirish**\n```\n10\n```\n**Chiqish**\n```\n55\n```",
                            "starter_code": 'const n = Number(require("fs").readFileSync(0, "utf8").trim());\n\nlet sum = 0;\n// sikl yozing\n\nconsole.log(sum);',
                            "solution_code": 'const n = Number(require("fs").readFileSync(0, "utf8").trim());\n\nlet sum = 0;\nfor (let i = 1; i <= n; i++) {\n  sum += i;\n}\n\nconsole.log(sum);',
                            "hint_uz": "Shart `i <= n` bo'lsin, aks holda oxirgi son qo'shilmay qoladi.",
                            "points": 10,
                            "tests": [
                                {"input": "10", "expected_output": "55", "is_sample": True},
                                {"input": "1", "expected_output": "1", "is_sample": True},
                                {"input": "100", "expected_output": "5050", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Ko'paytirish jadvali",
                            "prompt_md": "Son `n` beriladi. Uning 1 dan 5 gacha ko'paytirish jadvalini chiqaring.\n\n**Kirish**\n```\n4\n```\n**Chiqish**\n```\n4 x 1 = 4\n4 x 2 = 8\n4 x 3 = 12\n4 x 4 = 16\n4 x 5 = 20\n```",
                            "starter_code": 'const n = Number(require("fs").readFileSync(0, "utf8").trim());\n\n',
                            "solution_code": 'const n = Number(require("fs").readFileSync(0, "utf8").trim());\n\nfor (let i = 1; i <= 5; i++) {\n  console.log(`${n} x ${i} = ${n * i}`);\n}',
                            "hint_uz": "Shablon qatoridan foydalaning: `` `${n} x ${i} = ${n * i}` ``.",
                            "points": 10,
                            "tests": [
                                {"input": "4", "expected_output": "4 x 1 = 4\n4 x 2 = 8\n4 x 3 = 12\n4 x 4 = 16\n4 x 5 = 20", "is_sample": True},
                                {"input": "9", "expected_output": "9 x 1 = 9\n9 x 2 = 18\n9 x 3 = 27\n9 x 4 = 36\n9 x 5 = 45", "is_sample": False},
                            ],
                        },
                    ],
                },
            ],
        },
        {
            "slug": "massiv-va-funksiya",
            "title_uz": "Massivlar va funksiyalar",
            "summary_uz": "Ko'p qiymat bilan ishlash va kodni bo'laklash",
            "lessons": [
                {
                    "slug": "massivlar",
                    "title_uz": "Massivlar",
                    "summary_uz": "Element qo'shish, o'chirish va map / filter",
                    "estimated_minutes": 13,
                    "content_md": """
## Massiv yaratish

```javascript
const sonlar = [10, 20, 30];
const ismlar = ["Ali", "Vali"];
```

## Elementga murojaat

```javascript
console.log(sonlar[0]);        // 10
console.log(sonlar.length);    // 3
console.log(sonlar[sonlar.length - 1]);   // 30 — oxirgisi
```

## O'zgartirish

```javascript
sonlar.push(40);      // oxiriga qo'shadi
sonlar.pop();         // oxirgisini olib tashlaydi
sonlar.unshift(5);    // boshiga qo'shadi
sonlar.shift();       // birinchisini olib tashlaydi
```

**Eslatma:** `const` bilan e'lon qilingan massivga element qo'shish mumkin — taqiq faqat massivni butunlay boshqasiga almashtirishga tegishli.

## Eng ko'p ishlatiladigan metodlar

```javascript
const sonlar = [1, 2, 3, 4, 5];

const ikkilangan = sonlar.map(x => x * 2);        // [2, 4, 6, 8, 10]
const juftlar = sonlar.filter(x => x % 2 === 0);  // [2, 4]
const yigindi = sonlar.reduce((a, b) => a + b, 0);// 15

console.log(Math.max(...sonlar));   // 5
console.log(sonlar.join(" "));      // "1 2 3 4 5"
```

- `map` — har bir elementni o'zgartirib, **yangi** massiv qaytaradi;
- `filter` — shartga mos elementlarni saqlaydi;
- `reduce` — barcha elementlarni bitta qiymatga yig'adi;
- `join` — massivni satrga aylantiradi.
""".strip(),
                    "examples": [
                        {
                            "title_uz": "Asosiy amallar",
                            "code": 'const sonlar = [10, 20, 30];\nconsole.log(sonlar[0]);\nconsole.log(sonlar.length);\nsonlar.push(40);\nconsole.log(sonlar.join(" "));',
                            "expected_output": "10\n3\n10 20 30 40",
                            "explanation_uz": "`join(\" \")` massiv elementlarini bo'shliq bilan birlashtiradi.",
                        },
                        {
                            "title_uz": "map va filter",
                            "code": "const sonlar = [1, 2, 3, 4, 5];\nconsole.log(sonlar.map(x => x * 2).join(\" \"));\nconsole.log(sonlar.filter(x => x % 2 === 0).join(\" \"));",
                            "expected_output": "2 4 6 8 10\n2 4",
                            "explanation_uz": "`map` va `filter` asl massivni o'zgartirmaydi — ular yangi massiv qaytaradi.",
                        },
                        {
                            "title_uz": "reduce bilan yig'indi",
                            "code": "const sonlar = [4, 8, 15];\nconst yigindi = sonlar.reduce((a, b) => a + b, 0);\nconsole.log(yigindi);",
                            "expected_output": "27",
                            "explanation_uz": "Oxirgi `0` — boshlang'ich qiymat. Bo'sh massivda ham natija to'g'ri bo'ladi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "Massiv oxiriga element qo'shish uchun qaysi metod ishlatiladi?",
                            "options": ["append()", "add()", "push()", "insert()"],
                            "correct_index": 2,
                            "explanation_uz": "`push()` oxiriga qo'shadi, `unshift()` esa boshiga.",
                        },
                        {
                            "question_uz": "`[1, 2, 3].map(x => x + 1)` nima qaytaradi?",
                            "options": ["[1, 2, 3]", "[2, 3, 4]", "6", "[1, 2, 3, 1]"],
                            "correct_index": 1,
                            "explanation_uz": "`map` har bir elementga funksiyani qo'llab, yangi massiv yasaydi.",
                        },
                        {
                            "question_uz": "`const` bilan e'lon qilingan massivga `push()` qilish mumkinmi?",
                            "options": ["Ha, mumkin", "Yo'q, xatolik beradi", "Faqat bo'sh massivga", "Faqat sonlar uchun"],
                            "correct_index": 0,
                            "explanation_uz": "`const` massivning o'zini almashtirishni taqiqlaydi, ichini o'zgartirishni emas.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Yig'indi va maksimum",
                            "prompt_md": "Bir qatorda bo'shliq bilan sonlar beriladi. Ularning yig'indisini va eng kattasini alohida qatorlarda chiqaring.\n\n**Kirish**\n```\n4 8 15 16 23 42\n```\n**Chiqish**\n```\n108\n42\n```",
                            "starter_code": 'const nums = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\n\n',
                            "solution_code": 'const nums = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\n\nconsole.log(nums.reduce((a, b) => a + b, 0));\nconsole.log(Math.max(...nums));',
                            "hint_uz": "`reduce` yig'indi uchun, `Math.max(...nums)` maksimum uchun.",
                            "points": 10,
                            "tests": [
                                {"input": "4 8 15 16 23 42", "expected_output": "108\n42", "is_sample": True},
                                {"input": "5", "expected_output": "5\n5", "is_sample": True},
                                {"input": "-3 -1 -7", "expected_output": "-11\n-1", "is_sample": False},
                            ],
                        },
                        {
                            "title_uz": "Toq sonlarni ajrating",
                            "prompt_md": "Bir qatorda sonlar beriladi. Faqat toq sonlarni bir qatorda, bo'shliq bilan chiqaring.\n\n**Kirish**\n```\n1 2 3 4 5 6\n```\n**Chiqish**\n```\n1 3 5\n```",
                            "starter_code": 'const nums = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\n\n',
                            "solution_code": 'const nums = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\n\nconsole.log(nums.filter(x => x % 2 !== 0).join(" "));',
                            "hint_uz": "`filter` bilan tanlang, `join(\" \")` bilan chiqaring.",
                            "points": 10,
                            "tests": [
                                {"input": "1 2 3 4 5 6", "expected_output": "1 3 5", "is_sample": True},
                                {"input": "2 4 6", "expected_output": "", "is_sample": True},
                                {"input": "7 9 11", "expected_output": "7 9 11", "is_sample": False},
                            ],
                        },
                    ],
                },
                {
                    "slug": "funksiyalar",
                    "title_uz": "Funksiyalar",
                    "summary_uz": "function, strelkali funksiya va return",
                    "estimated_minutes": 12,
                    "content_md": """
## Oddiy funksiya

```javascript
function salomlash(ism) {
  console.log(`Salom, ${ism}!`);
}

salomlash("Ali");
```

## return — qiymat qaytarish

```javascript
function kvadrat(x) {
  return x * x;
}

const natija = kvadrat(5);
console.log(natija);   // 25
```

`return` bajarilishi bilan funksiya darhol tugaydi.

## Strelkali funksiya (arrow function)

Qisqaroq yozuv — zamonaviy kodda ko'p uchraydi:

```javascript
const kvadrat = (x) => x * x;
const yigindi = (a, b) => a + b;

console.log(kvadrat(4));    // 16
console.log(yigindi(2, 3)); // 5
```

Tanasi bir ifodadan iborat bo'lsa, `{}` va `return` yozilmaydi.

Ko'p qatorli bo'lsa:

```javascript
const baho = (ball) => {
  if (ball >= 90) return "A'lo";
  if (ball >= 70) return "Yaxshi";
  return "Qoniqarsiz";
};
```

## Standart qiymat

```javascript
function salomlash(ism = "mehmon") {
  console.log(`Salom, ${ism}!`);
}

salomlash();        // Salom, mehmon!
```
""".strip(),
                    "examples": [
                        {
                            "title_uz": "function va return",
                            "code": "function kvadrat(x) {\n  return x * x;\n}\n\nconsole.log(kvadrat(5));\nconsole.log(kvadrat(5) + 1);",
                            "expected_output": "25\n26",
                            "explanation_uz": "`return` qaytargan qiymat ustida amal bajarish mumkin.",
                        },
                        {
                            "title_uz": "Strelkali funksiya",
                            "code": "const yigindi = (a, b) => a + b;\nconsole.log(yigindi(2, 3));",
                            "expected_output": "5",
                            "explanation_uz": "Bitta ifodadan iborat tanada `return` avtomatik bajariladi.",
                        },
                        {
                            "title_uz": "Standart qiymat",
                            "code": 'function salomlash(ism = "mehmon") {\n  console.log(`Salom, ${ism}!`);\n}\n\nsalomlash();\nsalomlash("Ali");',
                            "expected_output": "Salom, mehmon!\nSalom, Ali!",
                            "explanation_uz": "Argument berilmasa, standart qiymat ishlatiladi.",
                        },
                    ],
                    "quiz": [
                        {
                            "question_uz": "`const f = x => x * 3;` bo'lsa, `f(4)` nima qaytaradi?",
                            "options": ["4", "12", "34", "undefined"],
                            "correct_index": 1,
                            "explanation_uz": "Strelkali funksiya tanasidagi ifoda natijasi avtomatik qaytariladi.",
                        },
                        {
                            "question_uz": "Funksiyada `return` yozilmasa nima qaytadi?",
                            "options": ["0", "null", "undefined", "Xatolik"],
                            "correct_index": 2,
                            "explanation_uz": "`return` bo'lmaganda funksiya `undefined` qaytaradi.",
                        },
                        {
                            "question_uz": "Ko'p qatorli strelkali funksiyada natija qanday qaytariladi?",
                            "options": [
                                "Avtomatik qaytadi",
                                "`return` yozish kerak",
                                "`console.log` bilan",
                                "Qaytarib bo'lmaydi",
                            ],
                            "correct_index": 1,
                            "explanation_uz": "Figurali qavs qo'yilgan zahoti `return` majburiy bo'ladi.",
                        },
                    ],
                    "exercises": [
                        {
                            "title_uz": "Baho funksiyasi",
                            "prompt_md": "`baho(ball)` funksiyasini yozing:\n\n- 90 va undan yuqori → `A'lo`\n- 70–89 → `Yaxshi`\n- 50–69 → `Qoniqarli`\n- 50 dan past → `Qoniqarsiz`\n\n**Kirish**\n```\n75\n```\n**Chiqish**\n```\nYaxshi\n```",
                            "starter_code": 'function baho(ball) {\n  // shartlarni yozing\n}\n\nconst ball = Number(require("fs").readFileSync(0, "utf8").trim());\nconsole.log(baho(ball));',
                            "solution_code": 'function baho(ball) {\n  if (ball >= 90) return "A\'lo";\n  if (ball >= 70) return "Yaxshi";\n  if (ball >= 50) return "Qoniqarli";\n  return "Qoniqarsiz";\n}\n\nconst ball = Number(require("fs").readFileSync(0, "utf8").trim());\nconsole.log(baho(ball));',
                            "hint_uz": "`return` bajarilishi bilan funksiya tugaydi — shuning uchun `else` shart emas.",
                            "points": 15,
                            "tests": [
                                {"input": "75", "expected_output": "Yaxshi", "is_sample": True},
                                {"input": "90", "expected_output": "A'lo", "is_sample": True},
                                {"input": "49", "expected_output": "Qoniqarsiz", "is_sample": False},
                                {"input": "50", "expected_output": "Qoniqarli", "is_sample": False},
                            ],
                        },
                    ],
                },
            ],
        },
    ],
}
