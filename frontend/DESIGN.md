# CodeArena dizayn tizimi — "MONO" (v5)

Bu hujjat ekran quruvchi har bir ishtirokchi uchun MAJBURIY qo'llanma.
Maqsad: sayt har bir sahifada bitta ovozda gapirsin.

Manba fayllar: `src/styles/aurora.css` (tokenlar va utility'lar),
`src/app/globals.css` (animatsiya, markdown, to'q sahna).

---

## Konsepsiya

Butun sayt **UCH rangdan** quriladi va to'rtinchisi yo'q:

| Rang | Token | Qiymat | Vazifa |
| --- | --- | --- | --- |
| QORA | `--ink` | `#0A0A0A` | Matn, asosiy tugma foni, futer, to'q bo'limlar |
| OQ | `--canvas` / `--pane` | `#FFFFFF` | Sahifa foni, karta foni, to'q fondagi matn |
| KO'K | `--brand` | `#1E5EFF` | CTA, havola, aksent chiziq, statistik raqam |

**Kulrang RANG hisoblanmaydi.** U faqat chegara (`--edge` #E5E5E5), ajratgich
va ikkinchi darajali matn (`--ink-2` #4A4A4A, `--ink-3` #737373) uchun neytral.

**Yashil/sariq/qizil YO'Q.** Holat farqi rang bilan emas — SHAKL, YORLIQ va
OG'IRLIK bilan beriladi (pastda "Rangsiz semantika" bo'limiga qarang).

### To'rt qaror

1. **Ko'k kam va qimmat.** Sahifaning ~10% dan ortig'i ko'k bo'lmaydi. Ko'k
   ko'rinsa — u yerda harakat bor: bosiladigan joy yoki muhim raqam.
2. **Bo'sh joy — material.** Bo'limlar orasida 120px, sarlavhalar yirik.
   Element qo'shishdan oldin bo'shliqni kengaytirish tekshiriladi.
3. **Soya faqat hoverda.** Tinch holatda sirt tekis: karta 1px kulrang chegara
   bilan turadi. Soya — javob, bezak emas.
4. **Yumaloq, lekin qat'iy.** Tugma 10px, karta 16px, katta panel 24px.
   Bitta shkala, o'rtasida tasodifiy qiymat yo'q.

---

## 1. Tipografika

**Bitta shrift — Inter.** Sarlavha ham, interfeys ham, raqam ham, yorliq ham.

### Monoshrift qachon ruxsat etiladi

JetBrains Mono faqat **mashina chiqargan yoki mashina o'qiydigan** matn uchun.
Odam o'qiydigan HAR QANDAY yozuv — hatto eng kichigi ham — Inter'da:

| ✅ Monoshrift | ❌ Inter (interfeys shrifti) |
| --- | --- |
| Kod bloki, muharrir, markdown manbasi | Yorliq, sarlavha, tugma, menyu |
| Dastur chiqishi, `stderr`, kompilyator xatosi | Til nomi (`Python`, `C++`) va nishonlar |
| Test kirish/chiqishi | Klaviatura ko'rsatkichi (`⌘K`, `Enter`) |
| Fayl nomi va yo'li | Non ushoqlari (breadcrumb) ajratgichi `/` |
| Belgima-belgi ko'chiriladigan kod: taklif kodi, 2FA, zaxira kaliti | Sahifalash, hisoblagich, statistika raqami |
| Logotipdagi `>` belgisi (brend) | Jadval ustuni nomi, meta-matn |

Sabab: raqamlar endi Inter'ning `tabular-nums` xususiyati bilan tekislanadi,
shuning uchun jadval ustunlari monoshriftsiz ham tik turadi. Monoshrift esa
"bu — mashina matni" degan ma'noni tashiydi; uni oddiy yorliqqa qo'ysak, shu
ma'no yo'qoladi va sahifada ikkita shrift beso'naqay aralashadi.

| Klass | O'lcham (mobil → desktop) | Weight | Qayerda |
| --- | --- | --- | --- |
| `t-display` | 36 → 64px | 700 | Hero sarlavhasi |
| `t-title` | 28 → 40px | 700 | Sahifa va bo'lim sarlavhasi |
| `t-section` | 20px | 600 | Panel/karta sarlavhasi |
| `t-body` | 16px / 1.65 | 400 | Asosiy matn |
| `t-meta` | 14px | 400 | Meta: sana, muallif, izoh |
| `t-eyebrow` | 13px, +0.12em, UPPERCASE | 600 | Bo'lim yorlig'i — kulrang (interfeys ichida) |
| `t-eyebrow-brand` | 13px, +0.12em, UPPERCASE | 600 | Marketing bo'limi yorlig'i — **KO'K** |
| `t-num` | — | — | Raqam (`tabular-nums`, ustunlar tik turadi) |
| `t-metric` | 28 → 36px | 700 | Interfeys ichidagi ko'rsatkich |
| `t-metric-lg` | 40 → 56px | 700 | Marketing statistikasi — **doim KO'K** |

**Qoidalar**

- Sarlavhalar **faqat chapdan** tekislanadi. Yagona istisno: sahifa
  oxiridagi CTA bloki va 404.
- Matn qatori maksimal **68 belgi** (`max-w-[68ch]` yoki `shell-tight`).
- Sarlavha ichidagi ko'k aksent — **bitta so'z yoki bitta qisqa ibora**.
  Ikkita ko'k bo'lak bitta sarlavhada bo'lmaydi.
- `--ink-4` (#A3A3A3) matn uchun ISHLATILMAYDI — oq fonda 3.45:1, AA dan past.
  U faqat ikonka va ajratgich uchun.

---

## 2. Tartib (layout)

| Token | Qiymat | Nima |
| --- | --- | --- |
| `--page` | 1200px | Konteyner kengligi (`shell`) |
| `--page-tight` | 720px | Matn ustuni (`shell-tight`) |
| `--bar` | 72px | Yopishqoq panel balandligi |
| `--sec` / `--sec-md` / `--sec-sm` | 120 / 88 / 64px | Bo'lim vertikal paddingi (`band`) |

**Utility'lar:** `shell` (gorizontal konteyner), `shell-tight` (matn ustuni),
`band` (bo'lim paddingi), `band-sm` (zich bo'lim).

Yangi marketing bo'limi shu ikkitadan quriladi: `<section className="band shell">`.

### Sahifa ritmi

Bo'limlar fon bo'yicha almashinadi, shuning uchun uzun sahifa "nafas oladi":

```
oq → oq → OCH KULRANG (#F5F5F5) → oq → QORA (#0A0A0A) → oq → OCH KULRANG → oq → QORA (futer)
```

To'q bo'lim sahifada **bittadan ortiq bo'lmaydi** (futer alohida hisoblanadi).
Ikki og'ir blok ketma-ket kelsa, sahifa oxiri "qorong'i devor"ga aylanadi.

---

## 3. Tugmalar

Ikkita qoida butun tizimni ushlab turadi:

1. **Asosiy (`primary`)** — QORA fon, oq matn → hoverda fon **KO'KGA** o'tadi.
2. **Ikkinchi darajali (`quiet` / `outline`)** — shaffof fon, qora chegara va
   matn → hoverda chegara ham, matn ham **ko'kka** o'tadi.

Ya'ni ko'k tugmaning tinch holati emas, balki **javobi**.

| Variant | Tinch holat | Hover |
| --- | --- | --- |
| `primary` / `ink` | Qora fon, oq matn | Ko'k fon |
| `quiet` / `outline` | Shaffof, qora chegara | Ko'k chegara + ko'k matn |
| `brand` / `secondary` | To'yingan ko'k | Ochroq ko'k |
| `brand-soft` | Ko'k yuvindi | To'yingan ko'k |
| `ghost` | Faqat matn | Ko'k matn + yengil fon |
| `danger` | Qora | Quyuqroq — **ko'kka o'tmaydi** |

**O'lchamlar:** `sm` 36px · `md` 40px · `lg` 48px (padding 14/28 — CTA) ·
`xl` 56px. `lg` va `xl` hoverda 2px yuqoriga siljiydi; kichiklari siljimaydi
(jadval ichida sakraydigan tugma qatorni titratadi).

**Barcha tugmalarda:** radius 10px, o'tish 250ms `ease-snap`,
bosilganda `scale(0.97)`. Rang hech qachon to'satdan almashmaydi.

---

## 4. Sirtlar

| Utility | Nima |
| --- | --- |
| `pane` / `pane-solid` | Karta: oq fon + 1px kulrang chegara, **soyasiz** |
| `pane-sunken` | Karta ICHIDAGI botiq maydon |
| `pane-float` | Suzuvchi qatlam (menyu, modal) — yagona doimiy soya |
| `pane-interactive` | Hoverda `translateY(-4px)` + soya + ko'k chegara |
| `pane-ink` | Qora blok (CTA lentasi, hero vizuali) |
| `pane-brand` | To'yingan ko'k blok — sahifada bittadan ko'p emas |
| `on-dark` | To'q bo'lim: sirt/siyoh tokenlarini ag'daradi |

**Karta ichida karta — TAQIQ.** Ichki maydon kerak bo'lsa `pane-sunken`.

`on-dark` ichida `--ink` oq, `--brand` ochroq ko'k (#5B8CFF) va
`--ink-on-brand` qora bo'ladi — komponentlar o'z kodiga tegmasdan moslashadi.

---

## 5. Animatsiya

| Token | Qiymat | Qayerda |
| --- | --- | --- |
| `--t-fast` | 200ms | Hover, rang |
| `--t-base` | 250ms | Tugma, menyu |
| `--t-slow` | 300ms | Akkordeon, karta ko'tarilishi |
| `--t-reveal` | 500ms | Scroll bo'yicha paydo bo'lish |

**Easing:** `--ease-snap` (boshqaruv), `--ease-soft` (kirish).

- **Hech bir animatsiya 0.6s dan uzoq emas.**
- Kirish qonuni bitta: **20px pastdan + shaffoflikdan**. Masshtab yo'q —
  masshtablangan blok matnni kirish paytida xiralashtiradi.
- Ro'yxatlarda stagger **100ms**, 6 elementdan keyin kechikish to'xtaydi.
- Scroll animatsiyasi `Reveal` komponenti orqali (IntersectionObserver).
- Sahifa almashganda `page-in`: 220ms fade + 8px ko'tarilish. Siljish
  ataylab kichik — yirik siljish yopishqoq panel bilan to'qnashadi.
- Sahifa ichidagi havolalar — silliq scroll
  (`scroll-behavior: smooth` + `scroll-padding-top`).
- `prefers-reduced-motion` barcha animatsiyani bir joyda o'chiradi.

---

## 6. Rangsiz semantika

Palitrada yashil/sariq/qizil yo'q. Ma'no shunday beriladi:

| Token | Qiymat | Mantiq |
| --- | --- | --- |
| `--ok` | Ko'k | Tizimda ko'k = "ishladi, davom et" |
| `--bad` | Qora | Eng og'ir vizual og'irlik |
| `--warn` | `--ink-2` | Qoradan bir pog'ona past |
| `--easy` / `--medium` / `--hard` | Och → quyuq ton | Yoniga uchta ustunli belgi qo'shiladi |

**Majburiy:** har bir holat yonida DOIM matnli yorliq yoki ikonka turadi.
Rang bitta o'zi ma'no tashimasligi kerak (WCAG 1.4.1).

**Forma xatosi** uch signal bilan: qalinlashgan siyoh chegara + ichki halqa +
ostidagi ikonkali qalin matn.

---

## 7. Kontrast (tekshirilgan)

| Juftlik | Nisbat | Holat |
| --- | --- | --- |
| `#1E5EFF` oq ustida | 5.12:1 | ✅ AA |
| oq `#1E5EFF` ustida | 5.12:1 | ✅ AA (tugma matni) |
| `#1E5EFF` **qora ustida** | 3.80:1 | ❌ — to'q fonda `--brand-light` (#5B8CFF, 6.16:1) |
| `#4A4A4A` oq ustida | 8.86:1 | ✅ |
| `#737373` oq ustida | 4.74:1 | ✅ |
| `#A3A3A3` oq ustida | 3.45:1 | ❌ matn uchun ishlatilmaydi |

**Qorong'i rejimda** `--brand` ochroq (#4C7FFF), shuning uchun ko'k fondagi
matn QORA bo'ladi — `--ink-on-brand` tokeni buni avtomatik hal qiladi.
Ko'k tugmada `text-white` yozmang, `text-[var(--ink-on-brand)]` yozing.

---

## 8. Qat'iy taqiqlar

- Palitradan tashqari rang: yashil, sariq, qizil, binafsha, kehribar.
- Ko'k tugmada `text-white` (qorong'i rejimda kontrast yo'qoladi —
  `--ink-on-brand` ishlating).
- `bg-[var(--ink)]` ustida `text-white` (qorong'i rejimda oq ustiga oq —
  `text-[var(--canvas)]` ishlating).
- Ikonka rangli plitkada. Ikonka yalang'och turadi yoki chegarali doirada.
- Sarlavhani kartaga solish; karta ichida karta.
- Sahifada ikkita to'q bo'lim ketma-ket.
- Sarlavhada ikkita ko'k bo'lak.
- Bo'sh yoki nol statistikani ko'rsatish (`0+` kabi) — raqam bo'lmasa,
  raqam chizilmaydi.
- O'ylab topilgan statistika, sharh yoki mijoz nomi. Bosh sahifadagi
  raqamlar `site.stats` API'dan keladi; sharhlar bo'limi (`testimonials.tsx`)
  haqiqiy matn kelmaguncha shablon holatida turadi.
- `spacing` shkalasidan tashqari qiymat (4, 8, 12, 16, 20, 24, 32, 40, 48,
  64, 80, 96, 120, 160).
