# CodeArena dizayn tizimi — "SKOG"

Bu hujjat ekran quruvchi har bir ishtirokchi uchun MAJBURIY qo'llanma.
Maqsad: sayt har bir sahifada bitta ovozda gapirsin.

Manba fayllar: `src/styles/skog.css` (tokenlar, tipografika, sirtlar,
utility'lar), `src/app/globals.css` (hujjat asosi, markdown, chop etish),
`src/styles/studio.css` (muallif paneli qatlami).

---

## Konsepsiya

**Skandinaviya minimalizmi + zamonaviy clean-tech.** Sahifa oq, karta oq,
ular bir-biridan RANG bilan emas — bir piksel chiziq va deyarli
sezilmaydigan soya bilan ajraladi. Yashil faqat HARAKAT bo'lgan joyda
ko'rinadi.

### Oltita qaror

1. **Oq sahifa, oq karta.** Fon `#FFFFFF`, karta ham `#FFFFFF`. Bo'lim
   ajratish kerak bo'lsa — juda och yashil-oq lenta (`--bg-tint`,
   `#F6FAF7`). Kulrang fon tizimda yo'q.
2. **Yashil — harakat rangi.** `#2E7D32` faqat tugma, havola, faol holat
   va ijobiy natijada. Bezak uchun yashil ISHLATILMAYDI.
3. **Siyoh neytral.** Matn deyarli qora (`#16191B`) va uning uch
   pog'onasi. Sovuq ham, iliq ham emas — yashil yonida toza ko'rinadi.
4. **O'lcham aniq.** Asosiy matn 15px, sarlavhalar 20–48px. Ulkan
   tipografika yo'q: ierarxiyani o'lcham emas, BO'SHLIQ yaratadi.
5. **Burchak yumshoq, kapsula yo'q.** Tugma 10px, karta 14px, maydon 8px.
   To'liq yumaloq shakl faqat avatar, nuqta va yuklanish chizig'ida.
6. **Harakat deyarli yo'q.** Faqat rang/soya o'tishi (120–180ms) va tugma
   bosilganda 1px cho'kish. Parallax, scroll animatsiyasi, masshtab,
   porlash, suzuvchi panel — tizimda YO'Q.

---

## 1. Ranglar

### Sirtlar

| Token | Yorug' | Vazifa |
| --- | --- | --- |
| `--bg` | `#FFFFFF` | Sahifa foni |
| `--bg-tint` | `#F6FAF7` | Bo'lim lentasi — juda och yashil-oq |
| `--surface` | `#FFFFFF` | Karta, panel, suzuvchi qatlam |
| `--surface-hover` | `#F4F8F5` | Qator ustida sichqoncha |
| `--surface-sunk` | `#F3F7F4` | Botiq maydon: bo'sh holat, chip foni |

### Chiziqlar

| Token | Yorug' | Qayerda |
| --- | --- | --- |
| `--line` | `#E4EAE6` | Odatiy chegara |
| `--line-soft` | `#EFF3F0` | Ro'yxat ichidagi ajratgich |
| `--line-strong` | `#D2DCD6` | Kirish maydoni, ikkinchi darajali tugma |

### Siyoh

To'rtala pog'ona ham oq fonda WCAG AA dan o'tadi.

| Token | Qiymat | Kontrast | Qayerda |
| --- | --- | --- | --- |
| `--text` | `#16191B` | 16.9:1 | Sarlavha, asosiy matn |
| `--text-2` | `#3A443F` | 9.6:1 | Ikkinchi darajali matn |
| `--text-3` | `#5A655F` | 6.2:1 | Meta, izoh |
| `--text-4` | `#6F7A74` | 4.7:1 | Yorliq, sokin qiymat |

### Yashil

| Token | Qiymat | Vazifa |
| --- | --- | --- |
| `--green` | `#2E7D32` | Amal: tugma foni, faol holat |
| `--green-hover` | `#276E2B` | Hover |
| `--green-active` | `#1F5C23` | Bosilgan |
| `--green-text` | `#2A6E2E` | Oq fondagi YOZUV (5.6:1) |
| `--green-mid` | `#4CAF50` | Faqat bezak: diagramma, daraja |
| `--green-pale` | `#81C784` | Faqat bezak |
| `--green-wash` | `#EEF6EF` | Tanlangan holat foni |
| `--green-line` | `#C3DFC5` | Yashil elementning chegarasi |

**Ko'k, qizil, sariq, binafsha — YO'Q.** Holat farqi rang bilan emas,
YORLIQ, IKONKA va OG'IRLIK bilan beriladi:

- ijobiy natija — yashil (`--ok`)
- salbiy natija — to'q siyoh (`--danger`), doim matnli yorliq bilan
- kutish — tinch kulrang (`--warn`)

Qiyinlik darajasi ham shu qoidada: bitta yashil oilaning uch toni
(`--easy` / `--medium` / `--hard`) + uch ustunli SHAKL belgisi, ya'ni
rang ko'rmaydigan foydalanuvchi ham farqni ko'radi.

### Qorong'i rejim

`.dark` sinfida xuddi shu tizim teskari: sahifa `#0F1311`, karta
`#161B18`, yashil `#6FCF74` (to'q fonda AA uchun yorug'roq). Yorug' rejim
asosiy va sukut bo'yicha.

---

## 2. Tipografika

**Bitta shrift — Inter.** Sarlavha ham, interfeys ham, raqam ham.
Monoshrift (JetBrains Mono) faqat MASHINA matni uchun: kod, terminal
chiqishi, test ma'lumotlari, fayl yo'li.

| Klass | O'lcham | Weight | Qayerda |
| --- | --- | --- | --- |
| `ts-display` | 34 → 48px | 700 | Bosh sahifa sarlavhasi |
| `ts-h1` | 26 → 34px | 650 | Sahifa sarlavhasi |
| `ts-h2` | 20 → 24px | 600 | Bo'lim sarlavhasi |
| `ts-h3` | 17px | 600 | Karta/panel sarlavhasi |
| `ts-lead` | 16 → 18px | 400 | Yetakchi xatboshi |
| `ts-body` | 15px | 400 | Asosiy matn |
| `ts-sm` | 14px | 400 | Ikkinchi darajali qator |
| `ts-xs` | 13px | 400 | Meta, izoh, hisoblagich |
| `ts-label` | 12px, +0.06em, UPPERCASE | 600 | Ustun va bo'lim yorlig'i |
| `ts-num` | — | — | Raqam (`tabular-nums`) |
| `ts-metric` | 28 → 36px | 650 | Interfeys ko'rsatkichi |

`<body>` ning o'zi `font-size: 0.9375rem` (15px).

**Qoidalar**

- Harf oralig'i o'lchamga TESKARI: 48px sarlavhada `-0.026em`, 12px
  yorliqda `+0.06em`.
- Sarlavhalar faqat chapdan tekislanadi.
- Sarlavha kengligi `max-w-[24ch]`, matn ustuni `max-w-[62ch]`.
- Markdown (`prose-ca`) interfeysdan bir pog'ona YIRIKROQ: 16px/1.75 —
  masala sharti eng ko'p o'qiladigan matn.

---

## 3. Shakl va soya

| Token | Qiymat | Qayerda |
| --- | --- | --- |
| `--radius-xs` | 6px | Chip, nishon, segment tugmasi |
| `--radius-sm` | 8px | Kirish maydoni, menyu bandi |
| `--radius-md` | 10px | **Tugma** |
| `--radius-lg` | 14px | Karta |
| `--radius-xl` | 20px | Modal, katta panel |
| `--radius-full` | 999px | FAQAT avatar, nuqta, progress |

Soyalar juda yengil va neytral (yashil emas): `--shadow-xs` kartada,
`--shadow-sm` hoverda, `--shadow-lg` faqat suzuvchi qatlamda (menyu,
modal). Tinch holatdagi karta "suzmaydi".

---

## 4. Sirt sinflari

| Sinf | Nima |
| --- | --- |
| `card` | Oq yuza + 1px chiziq + `shadow-xs` |
| `card-link` | Bosiladigan karta: hoverda chiziq quyuqlashadi |
| `well` | Botiq maydon karta ICHIDA |
| `float` | Suzuvchi qatlam: menyu, popover, modal |
| `wash` | Yashil yuvindi — tanlangan holat |
| `divider` / `divider-soft` | Gorizontal ajratgich |
| `edge-green` | Chap qirradagi yashil chiziq — faol element |
| `on-green` | To'yingan yashil blok (futer): tokenlarni ag'daradi |
| `on-code` | Kod sirti (muharrir, terminal) |

**Karta ichida karta bo'lmasin** — ichki maydon kerak bo'lsa `well`.

---

## 5. Tartib

Tepada 60px NAVIGATSIYA LENTASI: asosiy besh bo'lim tekis havolalar
bo'lib turadi (ochiluvchi menyu ortida emas), faol bo'limning ostida
panel qirrasiga tegib turgan 2px yashil chiziq yonadi. Qolgan bo'limlar
"Yana" menyusida. O'ngda qidiruv (⌘K), tema, bildirishnoma, hisob.

Kontent MARKAZLASHGAN (`wrap`, 1120px). Har bir sahifa `PageHead` bilan
boshlanadi — u OCH YASHIL PANEL (`--bg-tint`, 20px radius): sahifaning
"boshi" fon bilan e'lon qilinadi, kontent esa ostida oq qog'ozda davom
etadi. Panel ichida: sarlavha + amallar bitta qatorda, izoh, so'ng meta
— chegarali OQ stat-chiplar.

Futer — bitta ingichka qator (© + huquqiy havolalar + email). To'yingan
yashil bloklar tizimda YO'Q. 1024px dan tor ekranda: navbar burger bilan,
pastda tab-panel.

| Token | Qiymat | Vazifa |
| --- | --- | --- |
| `--nav-h` | 60px | Yuqori panel |
| `--container` | 1120px | Sahifa konteyneri (`wrap`) |
| `--container-narrow` | 704px | Matn ustuni (`wrap-narrow`) |

**Bo'lim** (`Section`): sarlavha yonida kichik yashil belgi — ajratgich
chiziqlar yo'q. **Statistika** (`Stat`): karta-plitka, yorliq tepada.

**Katalog sahifalari** (masalalar): filtrlar chap relsda EMAS — karta
ichidagi asboblar qatorida (qidiruv + ochiluvchi filtrlar + saralash),
jadval o'sha kartaning ichida. **Musobaqalar**: bitta jadval emas, uch
guruh — jonli (wash-karta), kutilmoqda (sana-plitkali qatorlar),
tugagan (ixcham jadval).

---

## 6. Boshqaruv elementlari

**Tugma** (`kit/primitives.tsx`) — 10px burchak, balandligi 36/40/44/48px.

| Variant | Ko'rinish | Qachon |
| --- | --- | --- |
| `primary` | To'yingan yashil, oq matn | Ekranda BITTA |
| `quiet` | Oq yuza + chiziq | Ikkinchi darajali amal |
| `ghost` | Fonsiz, faqat matn | Uchinchi daraja, ikonka |
| `brand-soft` | Yashil yuvindi | Yumshoq chaqiriq |
| `danger` | To'q siyoh | Xavfli amal |

Javob: hoverda fon bir pog'ona o'zgaradi (120ms), bosilganda 1px
cho'kish. **Masshtab, siljish va soya sakrashi yo'q.**

**Maydon** — 40px balandlik, 8px burchak, 14px matn; fokusda chegara
yashilga o'tadi va tizimning umumiy konturi chiziladi.

**Chip** — 6px burchak, haqiqiy chegara, 12px matn.

**Jadval** (`grid-table`) — katalog sahifalarining asosiy tartibi:
ustun sarlavhalari 12px UPPERCASE, raqamli ustunlar (`col-num`) o'ngdan
tekislangan, tor ekranda jadval `table-scroll` ichida o'zi suriladi.

---

## 7. Harakat

Tizimda BOR bo'lgan harakatlar ro'yxati to'liq shu:

| Nima | Qancha |
| --- | --- |
| Rang/chegara/soya o'tishi | 120ms (`--dur-1`) |
| Panel soyasi, modal varaq | 180ms (`--dur-2`) |
| Tugma bosilganda | `translate-y-px` |
| Menyu/modal ochilishi | `pop-in` / `enter-sheet` (8px, 120–180ms) |
| Jarayon belgisi | `pulse-soft` (shaffoflik) |

`prefers-reduced-motion` da hammasi o'chadi.

---

## 8. Fokus

Butun sayt bo'ylab BITTA ko'rinish: `ring-focus` sinfi,
`:focus-visible` da 2px yashil kontur va 2px chekinish. Komponentning
o'z halqasi bo'lmaydi — ikkalasi ustma-ust tushsa qo'sh ramka hosil
bo'ladi.
