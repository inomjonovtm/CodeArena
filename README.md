# CodeArena

Algoritmik masalalar platformasi: **foydalanuvchi sayti** + **maxsus qurilgan admin
panel**. Django + DRF backend, Next.js 15 frontend.

Django'ning tayyor `django.contrib.admin` paneli **ishlatilmagan** — barcha
boshqaruv DRF endpointlari orqali ishlaydigan `/admin/...` sahifalarida.

---

## Tarkib

```
CodeArenaV2/
├── backend/                 Django + DRF (API, judge, celery)
│   ├── config/              settings, urls, celery
│   └── apps/
│       ├── core/            permissions, pagination, audit mixin, utils
│       ├── accounts/        User modeli, JWT auth, admin user CRUD
│       ├── problems/        Tag, Problem, TestCase, DailyChallenge
│       ├── judge/           Submission, Judge0 klienti, celery tasklar
│       ├── contests/        Contest, ishtirokchilar, Elo reyting
│       ├── content/         Muhokamalar, izohlar, shikoyatlar, murojaatlar
│       ├── community/       Guruhlar (private leaderboard)
│       ├── moderation/      Anti-plagiat, audit log, sozlamalar, e'lonlar
│       └── dashboard/       Statistika, grafiklar, global qidiruv
├── frontend/                Next.js 15 + TS + Tailwind v4
│   └── src/
│       ├── app/admin/...    admin sahifalari
│       ├── components/      UI kit, admin layout, formalar
│       ├── lib/             API klienti, tiplar, yordamchilar
│       ├── hooks/           jadval holati, CRUD mutatsiyalari
│       └── i18n/            interfeys lug'ati (o'zbekcha)
├── infra/                   nginx.conf, judge0.conf
└── docker-compose.yml
```

---

## Tez ishga tushirish (lokal)

Loyiha **PostgreSQL** talab qiladi — SQLite qo'llanmaydi. Judge0 shart emas
(lokal runner zaxira sifatida ishlaydi), Redis ham majburiy emas
(`CELERY_TASK_ALWAYS_EAGER=True` bo'lsa tasklar sinxron bajariladi).

### 1. Baza va Redis

Eng oson yo'l — faqat shu ikkitasini konteynerda ko'tarish:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Docker ishlatmasangiz, PostgreSQL 16 ni tizimga o'rnating va baza yarating:

```bash
psql -U postgres -c "CREATE USER codearena WITH PASSWORD 'codearena'; CREATE DATABASE codearena OWNER codearena;"
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env             # POSTGRES_* qiymatlarini bazangizga moslang
python manage.py migrate
python manage.py seed_demo       # demo ma'lumotlar
python manage.py runserver 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

> `frontend/.env.local` dagi `NEXT_PUBLIC_API_URL` backend porti bilan mos
> bo'lishi kerak (sukut bo'yicha `http://localhost:8000`).
>
> `NEXT_PUBLIC_SITE_URL` — saytning tashqi manzili. `sitemap.xml`, `robots.txt`
> va ulashish metama'lumotlaridagi absolyut havolalar shundan quriladi;
> produksiyada domenni qo'ying.

Brauzerda: **http://localhost:3000/admin**

### Demo hisoblar

| Rol | Login | Parol |
|---|---|---|
| Administrator | `admin` | `admin12345` |
| Moderator | `moderator` | `moder12345` |
| Foydalanuvchi | (seed'dagi istalgan username) | `user12345` |

> `seed_demo` 12 ta amaliyot masalasi + 4 ta musobaqa masalasi, 24 foydalanuvchi,
> haqiqiy submissionlar, 3 contest, guruhlar va sozlamalar yaratadi.
>
> **Masalalar tekshiriladi:** yashirin testlarning javobi to'qib chiqarilmaydi —
> etalon yechim judge orqali ishga tushirilib olinadi, so'ng butun to'plam qayta
> tekshiriladi. Biror masala o'tmasa, seed xato bilan to'xtaydi.

---

## Judge (kod tekshirish)

Ikki backend qo'llab-quvvatlanadi:

| Backend | Qachon ishlatiladi | Izolyatsiya |
|---|---|---|
| **Judge0** | sozlangan va javob berayotgan bo'lsa | Docker konteynerlari |
| **Lokal runner** | Judge0 yo'q va `LOCAL_JUDGE_ENABLED=True` | subprocess, **to'liq sandbox emas** |

Tanlov avtomatik: `apps/judge/engine.py` avval Judge0 ni tekshiradi (natija 30
soniyaga keshlanadi), javob bo'lmasa lokal runnerga o'tadi. Ikkalasi ham
ishlamasa submission `SYSTEM_ERROR` oladi va sabab ko'rsatiladi.

Lokal runner **faqat ishlab chiqish va demo uchun**: har bir bajarilish alohida
vaqtinchalik katalogda, qattiq timeout va chiqish limiti bilan ketadi, POSIX'da
`setrlimit` qo'llanadi — lekin tarmoq va fayl tizimi bloklanmagan. Shuning uchun
`DEBUG=False` da sukut bo'yicha **o'chirilgan**. Produksiyada ishonchsiz
foydalanuvchilar kodi uchun Judge0 ishlating.

`GET /api/judge/status/` qaysi backend faol va qaysi tillar mavjudligini
qaytaradi — kod muharriri o'rnatilmagan tilni tanlash ro'yxatida o'chirib qo'yadi.

---

## Ishlab chiqarish (Docker Compose)

Serverda kodni qurish uchun:

```bash
cp backend/.env.example backend/.env      # sirlarni to'ldiring
nano infra/judge0.conf                     # AUTHN_TOKEN ni o'zgartiring
docker compose up -d --build
docker compose exec backend python manage.py createsuperuser
```

Xizmatlar: `nginx` (80/443) → `frontend` (3000) + `backend` (8000),
`postgres`, `redis`, `celery`, `celery-beat`, `judge0-server`, `judge0-workers`.

**GitHub orqali avtomatik deploy** (tavsiya etiladi) — [DEPLOY.md](DEPLOY.md).
U yerda `docker-compose.prod.yml` ishlatiladi: image'lar CI'da qurilib GHCR'ga
chiqadi, serverda faqat `pull` bo'ladi.

| Compose fayli | Qachon |
|---|---|
| `docker-compose.dev.yml` | lokal ishlab chiqish — faqat Postgres va Redis |
| `docker-compose.yml` | to'liq stek, serverda qurish bilan |
| `docker-compose.prod.yml` | to'liq stek, GHCR'dan tayyor image bilan |

---

## Admin panel imkoniyatlari

### Umumiy
- **Rol asosidagi kirish**: `admin` — to'liq, `moderator` — kontent va moderatsiya
- **Dark / light mavzu** + tizim rejimi, oq-qora-yashil rang sxemasi
- **Command palette** (`Ctrl/Cmd + K`) — sahifalar + masala/user/contest/maqola qidiruvi
- **Yig'iluvchi sidebar**, breadcrumb, mobil menyu, skeleton yuklanish holatlari
- **Har bir jadvalda**: qidiruv, filtrlar, ustun bo'yicha sortlash, sahifalash,
  ustunlarni yashirish, qatorlarni tanlash, bulk amallar, CSV eksport
- **Audit log** — har bir yaratish/o'zgartirish/o'chirish yozib boriladi

### Bo'limlar

| Bo'lim | Imkoniyatlar |
|---|---|
| **Bosh sahifa** | KPI kartalar, faollik grafigi (7/30/90 kun), status va til taqsimoti, top masalalar/userlar, so'nggi submissionlar, tizim ogohlantirishlari, Judge0 holati |
| **Masalalar** | To'liq CRUD, Markdown tavsif, Monaco muharririda 3 til uchun starter kod, test-case menejeri (namuna/yashirin, tartiblash, limitlar), teglar, chop etish/arxivlash/nusxalash, statistika, tekshiruv ro'yxati |
| **Test-case'lar** | Barcha testlar markazlashgan ro'yxati, masala bo'yicha filtr, inline tahrirlash |
| **Teglar** | CRUD, rang tanlash, masalalar soni |
| **Kunlik masala** | Oylik kalendar, kunga masala tayinlash, avtomatik to'ldirish |
| **Foydalanuvchilar** | CRUD, rol o'zgartirish, ban/unban (sabab + muddat), reyting tuzatish, parol tiklash, faollik statistikasi, submissionlar tarixi, bulk amallar |
| **Submissionlar** | Filtr (status/til/user/masala/rejim), kod ko'rish, test natijalari, rejudge (bitta yoki bulk), Judge0 navbati holati |
| **Musobaqalar** | CRUD, masalalar ro'yxati (belgi/ball/tartib), ishtirokchilar, real leaderboard, diskvalifikatsiya, natijalarni qayta hisoblash, Elo reytingni qo'llash, plagiat skanerlash |
| **Muhokamalar / Izohlar** | Moderatsiya (yashirish, yopish, qadash), izohlar ko'rinishi, moderator izohi |
| **Shikoyatlar** | Sabab bo'yicha filtr, hal qilish |
| **Guruhlar** | Ro'yxat, ichki leaderboard, taklif kodini yangilash, tasdiqlash |
| **Anti-plagiat** | O'xshashlik bo'yicha saralangan juftliklar, **yonma-yon kod solishtirish** (mos qatorlar ajratilgan), IP va vaqt signallari, xulosa (yolg'on signal / tasdiqlash + diskvalifikatsiya), tekshiruvni ishga tushirish |
| **Audit log** | Amal/admin/obyekt bo'yicha filtr, o'zgarishlar diff'i |
| **E'lonlar** | Banner CRUD, daraja, faollik muddati |
| **Sozlamalar** | Guruhlangan sayt parametrlari (umumiy/judge/xavfsizlik/kontent/reyting), o'z profili va parolni o'zgartirish |

---

## API

Interaktiv hujjat: `http://localhost:8000/api/docs/`

### Autentifikatsiya
```
POST   /api/auth/login/            login + parol → JWT (HttpOnly cookie)
POST   /api/auth/register/
POST   /api/auth/refresh/
POST   /api/auth/logout/
GET    /api/auth/me/
POST   /api/auth/change-password/
```

### Admin (rol: admin/moderator)
```
GET    /api/admin/dashboard/stats/ | charts/ | activity/ | health/
GET    /api/admin/search/?q=

CRUD   /api/admin/users/            + ban, unban, change-role, adjust-rating, stats, summary
CRUD   /api/admin/problems/         + publish, unpublish, duplicate, test-cases, stats, summary
CRUD   /api/admin/test-cases/ | tags/ | daily-challenges/
GET    /api/admin/submissions/      + rejudge, judge-health, summary
CRUD   /api/admin/contests/         + problems, participants, leaderboard,
                                      recalculate, apply-ratings, scan-plagiarism
CRUD   /api/admin/discussions/ | comments/ | reports/
CRUD   /api/admin/groups/ | group-members/
GET    /api/admin/plagiarism/       + review, scan, summary
GET    /api/admin/audit-log/
CRUD   /api/admin/settings/ | announcements/
```

Har bir ro'yxat endpointi `POST .../bulk/` ni qo'llab-quvvatlaydi:
```json
{ "ids": ["..."], "action": "publish", "payload": {} }
```

### Public (foydalanuvchi qismi uchun tayyor)
```
GET    /api/problems/ | /api/problems/:slug/
POST   /api/submissions/            (10/daqiqa limit)
GET    /api/submissions/:id/
GET    /api/leaderboard/ | /api/users/:username/
GET    /api/daily-challenge/ | /api/tags/
GET    /api/contests/  POST /api/contests/:slug/join/
GET    /api/contests/:slug/stream/  jonli natijalar (SSE)
GET    /api/discussions/ | /api/comments/ | /api/site/settings/
CRUD   /api/bookmarks/ | /api/groups/

GET    /api/auth/sessions/          faol qurilmalar
POST   /api/auth/sessions/:id/revoke/ | /api/auth/sessions/revoke-others/

GET    /api/push/config/ | /api/push/devices/
POST   /api/push/subscribe/ | /api/push/unsubscribe/ | /api/push/test/
```

---

## Foydalanuvchi qismini qo'shish

Panel shunday qurilganki, foydalanuvchi interfeysi ustiga qo'shiladi:

- `src/app/admin/` — admin sahifalari (o'zgarmaydi)
- `src/app/(site)/` — foydalanuvchi sahifalarini shu yerga qo'shing
- `src/components/ui/` — UI kit ikkala qism uchun umumiy
- `src/lib/api.ts` — bitta API klienti; `resource()` yordamchisi CRUD uchun
- `src/components/providers/` — tema, til, auth, toast — ildiz layoutda

Auth allaqachon rolni biladi: `usePermissions()` → `can_access_admin`, `is_admin`, ...
`/admin` marshrutlari `AuthProvider` tomonidan avtomatik himoyalangan.

Yangi sahifa qo'shganda ikkita fayl kerak:

```
src/app/(site)/<bolim>/page.tsx      "use client" — sahifaning o'zi
src/app/(site)/<bolim>/layout.tsx    server — faqat `metadata` (sarlavha, tavsif)
```

Sarlavhasiz sahifa brauzer tabida «CodeArena» bo'lib qoladi va qidiruvda
ko'rinmaydi. Shaxsiy bo'limlarga `robots: { index: false, follow: false }`
qo'shing.

Umumiy qobiq elementlari (`components/shell/`):
`SiteBar` (yuqori panel), `SiteFooter` (huquqiy va yordam havolalari),
`MobileTabBar` + `MobileMenu`, `PrefsMenu` (tema va til), `CommandPalette`.

---

## Brauzer bildirishnomalari (Web Push) va PWA

Sayt qurilmaga o'rnatiladi (`app/manifest.ts`) va yopiq bo'lganda ham xabar
yubora oladi. Ikkalasi ham `public/sw.js` service worker'iga tayanadi.

```bash
python manage.py vapid_keys      # kalit juftligini yaratadi
# chiqqan ikki qatorni backend/.env ga qo'ying, so'ng serverni qayta ishga tushiring
```

Kalitlar bo'sh bo'lsa push **butunlay o'chadi**: `/api/push/config/`
`enabled: false` qaytaradi va sozlamalardagi obuna bloki ko'rsatilmaydi —
loyihani kalitlarsiz ham ishga tushirish mumkin.

- Obuna: Sozlamalar → Bildirishnomalar → «Brauzer bildirishnomalari»
- Xabarlar `notifications.services.notify()` orqali ketadi — sayt ichidagi
  qo'ng'iroqqa yoziladi va obuna bo'lgan qurilmalarga push sifatida yuboriladi
- Musobaqa eslatmasi: `apps.contests.tasks.send_contest_reminders` (celery beat,
  har daqiqada tekshiradi; `CONTEST_REMINDER_MINUTES` — necha daqiqa oldin)
- Ikonkalar `frontend/scripts/generate-icons.py` bilan brend belgisidan
  yaratiladi (tashqi kutubxonasiz)

Ikonkalarni qayta yaratish:

```bash
cd frontend && python scripts/generate-icons.py
```

---

## Muhim texnik qarorlar

- **Django admin o'chirilgan** — `INSTALLED_APPS` da `django.contrib.admin` yo'q.
- **JWT HttpOnly cookie'da** — `CookieJWTAuthentication`; frontend `/api/...` ga
  so'rov yuboradi, Next rewrite uni Django'ga uzatadi (same-origin, XSS'ga chidamli).
- **Token qurilma sessiyasiga bog'langan** — tokenda `sid` da'vosi bor
  (`accounts/sessions.py`). Sessiya yopilganda o'sha qurilmaning access **va**
  refresh tokenlari darhol rad etiladi; ban ham barcha sessiyalarni yopadi.
  Bu bog'lanishsiz "Sessiyani yopish" faqat ko'rinishda ishlardi.
- **SSE endpointlariga `EventStreamRenderer` kerak** (`core/renderers.py`) —
  `EventSource` `Accept: text/event-stream` yuboradi va mos renderer bo'lmasa
  DRF 406 qaytaradi. Shuningdek `Connection` sarlavhasi qo'yilmaydi: u
  hop-by-hop va WSGI uni taqiqlaydi (javob 500 bilan uzilardi).
- **Jonli jadval hisobi throttle qilingan** (`contests/standings.py`) — oqim ham,
  oddiy endpoint ham bir xil funksiyani chaqiradi, lekin baza 5 soniyada bir
  martadan ko'p yangilanmaydi.
- **Anti-plagiat** tashqi kutubxonasiz: winnowing algoritmi (`moderation/similarity.py`),
  o'zgaruvchi nomlarini normallashtiradi — nom o'zgartirib "aldash" ishlamaydi.
- **Elo reyting** (`contests/rating.py`): yangi userlar uchun K=40, tajribalilar uchun K=20.
- **Yashirin test natijalari saqlanmaydi** — faqat "Test 7/15 da xato" ko'rsatiladi (8-bo'lim).
- **React Query `networkMode: "always"`** — brauzerning noto'g'ri offline signali
  so'rovlarni jimgina to'xtatib qo'ymasligi uchun.
- **`APPEND_SLASH = False`** — API slashsiz manzilga 301 emas, 404 qaytaradi.
  301 brauzerda **doimiy** keshlanadi va bir marta noto'g'ri javob kelsa,
  foydalanuvchining hisobga kirishi butunlay buzilib qolardi. Shu sababli API
  klienti ham `cache: "no-store"` bilan ishlaydi.
- **Musobaqa masalalari ajratilgan** — contestga faqat `is_contest_only=True`
  masalalar qo'shiladi (`ContestProblemSerializer.validate_problem`), aks holda
  ishtirokchilar masalani oldindan yechib olishlari mumkin bo'lardi. Musobaqa
  ichidagi masala sahifasida tahlil va muhokama **umuman qaytarilmaydi**.
- **Tahlil (editorial) qulflangan** — matn faqat masalani yechganlarga beriladi;
  boshqalarga `has_editorial`/`editorial_locked` bayroqlari qaytadi, shuning
  uchun tab ko'rinadi, lekin ochilmaydi.
- **Tema bitta token to'plami orqali** — barcha ranglar `styles/aurora.css`
  dagi CSS o'zgaruvchilaridan (`--canvas`, `--pane`, `--ink*`, `--brand*`)
  keladi; qorong'i rejim faqat `.dark` ichida shu tokenlarni qayta belgilaydi.
  `text-white/60` kabi qattiq qiymatlar faqat DOIM to'q sirtlarda
  (`pane-brand`, `--stage-*`) ruxsat etiladi.
- **Sarlavha va SEO server layoutlarida** — sahifalar klient komponenti,
  ulardan `metadata` eksport qilib bo'lmaydi. Har bir marshrutda kichik
  server `layout.tsx` turadi; dinamik sahifalar (`/problems/[slug]`,
  `/contests/[slug]`, `/u/[username]`) sarlavha va tavsifni
  `generateMetadata` orqali backenddan oladi (`lib/site.ts`). Oraliq
  layoutlar `title: { default, template }` beradi — oddiy satr sarlavha
  ildizdagi `%s · CodeArena` shablonini uzib qo'yardi.

---

## Foydali buyruqlar

```bash
# Backend
python manage.py seed_demo --reset --users 24 --submissions 110
python manage.py seed_demo --skip-verify        # judge yo'q bo'lsa
python manage.py check --deploy                 # produksiyaga tayyorlikni tekshirish
python manage.py makemigrations && python manage.py migrate
celery -A config worker -l info
celery -A config beat -l info

# Frontend
npm run dev          # ishlab chiqish
npm run build        # produksiya build
npm run typecheck    # TypeScript tekshiruvi
```
