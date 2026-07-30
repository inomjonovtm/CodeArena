# CodeArena dizayn tili — "ARENA" (v4)

Bu hujjat ekran quruvchi har bir ishtirokchi uchun MAJBURIY qo'llanma.
Maqsad: har bir sahifa bitta ovozda gapirsin va "shablondan yasalgan" emas,
**ataylab terilgan** ko'rinsin.

## Konsepsiya

Musobaqa uch narsadan iborat: **DARAJA, VAQT va DALIL**. Interfeys ham shu
uchligini ko'rsatadi — yaxshi terilgan natijalar taxtasi kabi: iliq qog'oz,
o'tkir siyoh, bitta qat'iy ko'k va monoshriftdagi raqamlar.

Butun tizimni **to'rt qaror** belgilaydi. Yangi ekran shu to'rttasiga
bo'ysunsa, u avtomatik ravishda qolgan sahifalarga o'xshaydi.

### 1. Iliq neytral + sovuq ko'k

Sahifa — **iliq qog'oz** (`--canvas` #f7f7f4), karta — **sof oq** (`--pane`).
Ko'k (`--brand` #1f6feb) faqat AMALDA: tugma, havola, faol holat, fokus.

Iliq va sovuq qarama-qarshiligi tufayli ko'k kuchli yangraydi. Ko'kish fonda
turgan ko'k esa yo'qoladi — shuning uchun kanvas hech qachon ko'kish emas.

### 2. Quti emas, CHIZIQ va BO'SHLIQ

**Karta faqat MA'LUMOTGA beriladi**: ro'yxat, jadval, forma, panel, grafik.

Kartada BO'LMAYDI: sahifa sarlavhasi, bo'lim nomi, statistika lentasi,
sahifalash, bo'sh holat matni, ogohlantirish. Bular kanvasda turadi va
**soch chizig'i** (`rule`, `border-t`) bilan ajraladi.

Hamma narsani qutilash — eng keng tarqalgan xato. U sahifani bir xil
og'irlikdagi to'rtburchaklar panjarasiga aylantiradi va ko'zga "qayerdan
boshlash"ni ko'rsatmaydi.

Karta ichida karta — **TAQIQ**. Ichki maydon kerak bo'lsa `pane-sunken`.

### 3. Uch ovoz (tipografika)

| Rol | Shrift | Qayerda |
| --- | --- | --- |
| Sarlavha | **Space Grotesk** (`--font-display`) | `t-display`, `t-title`, `t-section`, `h1–h3` |
| Interfeys | **Inter** (`--font-sans`) | matn, yorliq, jadval, tugma |
| Raqam va kod | **JetBrains Mono** (`--font-mono`) | `t-num`, `t-metric`, `t-eyebrow`, kod |

**Eng muhim qoida: sahifadagi HAR BIR son `t-num` yoki `t-metric` bilan.**
Reyting, ball, foiz, vaqt, sana, hisoblagich — hammasi monoshriftda. Shu
tufayli ustunlar tik turadi va ma'lumot "o'lchangan" ko'rinadi.

`t-eyebrow` ham monoshrift: kichik, keng oraliqli, katta harflarda — texnik
hujjatdagi ustun nomiga o'xshaydi.

### 4. O'tkir geometriya

Burchaklar kichik va aniq: `--r-ctl` 8px (tugma), `--r-field` 10px (maydon),
`--r-pane` 14px (karta), `--r-pane-lg` 20px (yirik blok), `--r-chip` kapsula.

Soya deyarli yo'q — faqat **suzuvchi qatlamda** (menyu, popover, modal:
`pane-float`) va hoverda (`pane-interactive`). Yumshoq katta burchak + soya
hamma narsani bir xil "mayin" qiladi va boshqaruvni bezakdan ajratmaydi.

## 0. Qat'iy taqiqlar (birinchi o'qing)

- **Ikonka rangli plitkada** (`size-10 rounded-xl bg-brand-wash` ichida ikonka).
  Bu eng aniq "shablon" belgisi. Ikonka yalang'och turadi (`--ink-4` rangida)
  yoki soch chizig'idagi doirada (`rounded-full border`).
- **Sarlavhani kartaga solish** (`<Pane><PageHead/></Pane>`).
- **Karta ichida karta**, `pane-sunken` bilan o'ralgan `Empty`.
- `text-white/NN`, `bg-white/[0.0N]`, `border-white/*` — faqat `pane-brand` va
  `--stage-*` sirtlari ustida ruxsat.
- `glass`, `backdrop-blur` (parda va sticky'dan tashqari), fon gradient tumanlari.
- Eski tokenlar: `--bg`, `--surface`, `--fg`, `--accent`, `--sidebar*`,
  `--success/--danger/--warning/--info`. Yangilari: `--canvas`, `--pane`,
  `--ink`, `--brand`, `--ok/--bad/--warn/--note`.
- Eski komponentlar: `components/site/ui.tsx`, `components/site/select.tsx`,
  `components/site/navbar.tsx` — IMPORT QILMANG.
- `animate-slide-up`, `animate-fade-in`, `skeleton` (o'rniga `enter*`, `loading-block`).
- Emerald/yashil brend. Brend — ko'k.
- Sonni oddiy shriftda qoldirish (`t-num` siz).

Biznes mantiqqa TEGMANG: hooklar, so'rovlar (`useQuery`, `api.*`), handlerlar,
marshrutlar, query-paramlar, `lib/*` — hammasi aynan qoladi. Matnlar (copy)
o'zbekcha qoladi; izohlar ham o'zbekcha va qisqa.

## 1. Token lug'ati (`styles/aurora.css`)

Sirtlar: `--canvas` `--canvas-deep` `--pane` `--pane-solid` `--pane-hover` `--pane-sunken`
Chegaralar: `--edge` `--edge-soft` `--edge-strong`
Siyoh: `--ink` `--ink-2` `--ink-3` `--ink-4` `--ink-on-brand`
Brend: `--brand` `--brand-hover` `--brand-press` `--brand-ink` `--brand-wash` `--brand-wash-strong` `--brand-edge`
Ikkinchi aksent (energiya: seriya, kunlik, jonli): `--flare` `--flare-wash` `--flare-edge`
Semantik: `--ok/--ok-wash` `--warn/--warn-wash` `--bad/--bad-wash` `--note/--note-wash`
Qiyinlik: `--easy` `--medium` `--hard`
**Sahna** (DOIM to'q, temaga bo'ysunmaydi): `--stage` `--stage-2` `--stage-edge`
`--stage-ink` `--stage-ink-2` `--stage-ink-3` `--stage-brand` `--stage-ok`
Radius: `--r-chip` `--r-ctl`(8) `--r-field`(10) `--r-pane`(14) `--r-pane-lg`(20)
Soyalar: `--lift-1..3` `--lift-pop` `--lift-brand`
Harakat: `--t-fast`(130ms) `--t-base`(220ms) `--t-slow`(420ms), `--ease-snap`, `--ease-soft`
Tartib: `--rail`(68) `--rail-open`(240) `--bar`(60) `--tabbar`(62) `--page`(1240) `--page-tight`(780) `--gutter`(32)

Tailwind orqali ham bor: `bg-pane-sunken`, `text-ink-3`, `border-edge`,
`bg-brand-wash`, `rounded-pane`, `bg-stage` va h.k. Ammo mavjud kod uslubi —
`bg-[var(--pane-sunken)]` ko'rinishida; shu uslubda davom eting.

## 2. Utility klasslar

**Sirtlar**
- `pane` / `pane-solid` — oq karta, soch chizig'i, soyasiz.
- `pane-sunken` — botiq maydon (input foni, kod bloki, bo'sh joy).
- `pane-float` — suzuvchi qatlam (menyu, popover, modal). Yagona soyali sirt.
- `pane-interactive` — hoverda chegara brend rangiga o'tadi (transform YO'Q).
- `pane-brand` — to'yingan ko'k blok. Sahifada faqat BITTA (CTA).
- `pane-ink` — siyoh blok, ko'kdan ham kuchli urg'u.

**Chiziqlar**
- `rule` / `rule-soft` — bo'lim ustidagi soch chizig'i.
- `edge-brand` — chap qirrada 2px brend chizig'i (faol element).
- `row-mark` — ro'yxat qatori: hoverda chap qirradan brend chizig'i o'sib chiqadi.
  `data-active="true"` bilan doimiy qilib qo'yiladi.

**Fon va tekstura**
- `aurora-canvas` — sahifa foni.
- `grid-paper` / `dot-paper` — juda xira tekstura (hero, bo'sh maydon).
- `texture-fade` — teksturani chekkalarga qarab so'ndiradi.

**Boshqalar**
- `focus-ring` (har bir interaktiv elementda), `sticky-edge`, `fade-edges`,
  `no-scrollbar`, `loading-block` (chapdan o'ngga yorug'lik),
  `enter` / `enter-pop` / `enter-sheet` / `enter-veil` / `enter-draw` / `enter-stagger`.

Tipografika: `t-display` `t-title` `t-section` `t-body` `t-meta` `t-eyebrow` `t-num` `t-metric`.

## 3. Kit API (`@/components/kit`)

- `Button` {variant: primary|quiet|ghost|danger|brand-soft|ink, size: sm|md|lg, loading, icon, iconAfter}
- `LinkButton`, `IconButton` {label majburiy}
- `Chip` {tone: neutral|brand|ok|warn|bad|note|flare, dot, icon}, `Count`, `LiveDot`, `KeyHint`
- `Divider` {vertical}, `DividerLabel`, `Eyebrow` {index}, `DifficultyMark` {value, label}
- `Pane` {tone: card|solid|sunken|bare, interactive, inset: none|sm|md|lg}
- `PaneHead` {eyebrow, title, hint, action}
- `PageHead` {eyebrow, **index**, title, lead, meta, actions} — kanvasda, o'ramsiz
- `Stat` {label, value, sub, tone, icon}, `StatRow`+`StatCell` (kanvasdagi lenta)
- `Section` {eyebrow, index, title, hint, action} — sarlavha ostida chiziq
- `SplitLayout` {aside, asideFirst} — 1fr + 316px yopishqoq yon ustun
- `Field` {label, hint, error, required, htmlFor}, `Input`, `Textarea`,
  `SearchField`, `Toggle`, `ChoiceRow`, `inputClass`/`textareaClass`/`fieldBase`
- `Empty` {icon, title, description, action, compact}, `Block`, `TextLines`,
  `ListSkeleton`, `CardSkeleton`, `Spinner`, `Alert` {tone, title, action}, `Meter` {value, max, label, tone}
- `Segmented`, `ChipRail`, `Breadcrumb`, `Pagination`
- `Modal`, `Tooltip`, `Popover`, `MenuItem`, `MenuLink`

Logotip: `@/components/shell/logo` — `Logo`, `LogoMark`, `LogoLink`. Belgi —
buyruq qatori kursori (`>`); u tizimning monoshrift qatlamiga bog'lanadi.
Boshqa joyda logotip **qayta yasalmaydi**.

Yetishmagan bezak kerak bo'lsa — tokenlar bilan joyida yozing, eski
komponentga qaytmang.

## 4. Sahifa ritmi

Sayt sahifalari `SiteShell` ichida: tepada `SiteBar` (`--bar`), pastda
`SiteFooter`, mobilda qo'shimcha tab-bar. `main` allaqachon
`max-w-[var(--page)]` + gutter beradi — sahifa ichida QAYTA konteyner ochmang
(faqat torroq kontent uchun `max-w-[var(--page-tight)] mx-auto`). Bosh sahifa
(`components/landing/`) ham AYNAN shu gutterlardan foydalanadi: aks holda
sahifalar orasida logotip va sarlavha gorizontal siljib ketadi.

Mobilda pastda `MobileTabBar` (`--tabbar`) turadi. Ekran pastiga yopishgan
har qanday element (`sticky bottom-*`) uni hisobga olishi shart:
`bottom-[var(--tabbar)] lg:bottom-0`.

Har sahifa:

1. `PageHead` — eyebrow + title + lead + meta + actions. **`Pane` ichiga
   solinmaydi.** Ostidagi chiziq o'zi kontentni ajratadi.
2. Tashqi o'ram: `flex flex-col gap-7` (28px). Blok ichida 16–20px.
3. Ro'yxatlar `enter-stagger` bilan; qatorlarda `row-mark`.
4. Har bir holat: loading (skelet — HAQIQIY tartib shaklida), empty (`Empty` +
   amal tugmasi), error (`Alert tone="bad"` + qayta urinish).
   **Uchtasi ham majburiy.** Xatoni bo'sh holat bilan almashtirish — jimgina
   yolg'on: so'rov uzilganda foydalanuvchi ma'lumotini yo'qotdim deb o'ylaydi.
   `useQuery` dan `isError` va `refetch` ni oling.
5. `Pagination` — kanvasda, `Pane` ICHIDA EMAS (2-bo'limga qarang).

Yopishqoq elementlar `top-[var(--bar)]` (ro'yxat sarlavhasi) yoki
`top-[calc(var(--bar)+24px)]` (yon ustun).

## 5. Kompozitsiya qoidalari

- Bitta ekranda ko'pi bilan 2 xil sirt turi.
- **Masala yechish maydoni — bitta ustun:** shart tepada, kod muharriri
  pastda, natija konsoli eng oxirida (amaliyot va musobaqa sahifalarida bir
  xil). Yonma-yon ikki ustunda matn ham, kod ham yarim kenglikda qolardi.
  Mobilda `Segmented` bilan bo'lim almashadi — telefon uchun uzun varaq
  o'rniga uchta ekran.
- Ro'yxat sahifalarida kontent bitta `Pane tone="solid" inset="none"` ichidagi
  `divide-y` qatorlar — "har element alohida karta" uslubiga qaytmang.
- Aksent kam va maqsadli: sahifada bitta `primary` tugma; qolgani `quiet`/`ghost`.
- Hover: rang/chegara/fon o'zgaradi — transform yo'q (ro'yxat sakramasin).
  Faqat tugmada `active:scale-[0.985]`.
- Ikonkalar lucide, `size-4` (meta ichida `size-3.5`), rang `--ink-4` dan boshlanadi.
- Bo'sh bezakli div'lar, gradient chiziqlar, "chiroyli" burchak bezaklari —
  yo'q. Har piksel funksional.
- Tekstura (`grid-paper`) juda xira va faqat hero/bo'sh maydonda.

## 6. Responsiv

- Mobil: bir ustun, `PageHead` actions pastga o'raladi, jadval → karta-qator
  ko'rinishi (muhim ustunlargina), filtrlar `Segmented full` yoki `ChipRail`.
- Yon ustunlar (`SplitLayout`) mobilda pastga tushadi (yoki `asideFirst`).
- Touch nishonlar ≥ 40px.
- Gorizontal scroll faqat o'z konteyneri ichida (`fade-edges no-scrollbar`);
  sahifa tanasi hech qachon gorizontal siljimaydi.

## 7. Harakat va a11y

- Kirish: `enter` / `enter-stagger`. Hover: 130ms. Joy almashish: 220ms `--ease-snap`.
- `prefers-reduced-motion` CSS'da o'chiriladi — inline animatsiya yozmang;
  JS bilan animatsiya qilsangiz, `matchMedia` bilan tekshiring.
- Har interaktiv element: `focus-ring`, `aria-*`, klaviatura bilan ishlaydi.
- Rang yagona signal emas: qiyinlik uchun `DifficultyMark` (shakl + rang),
  statuslar `Chip dot`.
- Kontrast: oq matn faqat `--brand`, `--bad`, `--ink` va `--stage-*` ustida.

## 8. Admin panel

Admin ham xuddi shu tilda, lekin **zichroq** (Linear/Stripe ichki asboblari kabi).

- Sahifa: `PageHeader` (orqaga + sarlavha + amallar + tablar, **kartasiz**) →
  KPI qatori (`StatCard` panjarasi) → asboblar paneli → zich `DataTable`
  (`pane-solid` ichida) → `Pagination`.
- Jadval qatori ~44px, matn 13px, ustun sarlavhalari `t-eyebrow`, sonlar `t-num`.
- Boshqaruv balandligi 36px (`h-9`), kichigi 32px (`h-8`).
- Yon panel (drawer) tafsilotlar uchun, modal — qisqa amallar uchun.
- `components/ui/*` API'lari saqlanadi — ko'rinish yangi tilda.
