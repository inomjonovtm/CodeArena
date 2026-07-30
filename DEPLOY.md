# Deploy

Ikki yo'l bor:

| Yo'l | Qachon | Fayl |
|---|---|---|
| **Yagona konteyner** | "Dockerfile push qil" turidagi hosting platformalari | ildizdagi [`Dockerfile`](Dockerfile) |
| **Ajratilgan xizmatlar** | o'z serveringiz bo'lsa | [`docker-compose.prod.yml`](docker-compose.prod.yml) + GitHub Actions |

Ikkalasi ham tashqi **PostgreSQL** talab qiladi — konteynerlarning hech birida
baza yo'q.

---

## A. Yagona konteyner (hosting platformalari)

Repozitoriy ildizidagi `Dockerfile` bitta image quradi va bitta port ochadi:

```
nginx :$PORT ── /api/, /health/, /static/, /media/ → gunicorn :8000
             └─ qolgan hammasi                      → next     :3000
```

Jarayonlarni `supervisord` boshqaradi va biri tushsa qayta ko'taradi.
Migratsiya va `collectstatic` har ishga tushishda avtomatik bajariladi.

### Kerakli muhit o'zgaruvchilari

| O'zgaruvchi | Qiymat | Izoh |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:parol@host:5432/nom?sslmode=require` | tashqi Postgres |
| `DJANGO_SECRET_KEY` | 64 belgili tasodifiy satr | standart qiymat bilan **ishga tushmaydi** |
| `DJANGO_DEBUG` | `False` | |
| `DJANGO_ALLOWED_HOSTS` | `sizning-domen.app` | noto'g'ri bo'lsa hamma so'rov 400 beradi |
| `CORS_ALLOWED_ORIGINS` | `https://sizning-domen.app` | |
| `CSRF_TRUSTED_ORIGINS` | `https://sizning-domen.app` | |
| `FRONTEND_URL` | `https://sizning-domen.app` | xatlardagi havolalar shundan quriladi |
| `AUTH_COOKIE_SECURE` | `True` | |
| `PORT` | platforma o'zi beradi | berilmasa `8080` |
| `REDIS_URL` | ixtiyoriy | bo'lsa celery worker + beat yoqiladi; bo'lmasa tasklar sinxron bajariladi |

`DATABASE_URL` o'rniga alohida `POSTGRES_DB` / `POSTGRES_USER` /
`POSTGRES_PASSWORD` / `POSTGRES_HOST` / `POSTGRES_PORT` ham beriladi.
Ikkalasi bo'lsa `DATABASE_URL` ustun turadi.

### Birinchi ishga tushirishdan keyin

Administrator hisobi qo'lda yaratiladi — platformaning konsolida:

```bash
cd /app/backend && python manage.py createsuperuser
```

> **Judge0 bu rejimda yo'q.** Kod tekshiruvi lokal runnerga tushadi
> (`LOCAL_JUDGE_ENABLED=True`), u esa **to'liq sandbox emas**: tarmoq va fayl
> tizimi bloklanmagan. Ishonchsiz foydalanuvchilar kodi uchun alohida Judge0
> ko'taring va `JUDGE0_URL` ni ko'rsating.

---

## B. Ajratilgan xizmatlar (o'z serveringiz)

GitHub Actions orqali: **CI o'tadi → image'lar GHCR'ga chiqadi → serverga SSH
bilan yetkaziladi.** Serverda kod ham, Node/Python ham kerak emas — faqat
Docker va bir nechta konfiguratsiya fayli.

```
push → main
   │
   ├─ CI (ci.yml)              backend: check + migratsiya (haqiqiy Postgres)
   │                           frontend: typecheck + build
   │
   └─ Deploy (deploy.yml)      CI muvaffaqiyatli bo'lsa:
        ├─ build               ghcr.io/<owner>/<repo>-backend:<sha>
        │                      ghcr.io/<owner>/<repo>-frontend:<sha>
        └─ deploy              scp konfiguratsiya → ssh → compose pull && up -d
```

---

### 1. Serverni tayyorlash

Talab: Ubuntu 22.04+ (yoki shunga o'xshash), 4 GB RAM dan yuqori
(Judge0 konteynerlari ochko'z), Docker Engine + Compose plugin.

```bash
curl -fsSL https://get.docker.com | sh
```

Deploy uchun alohida foydalanuvchi yarating va uni `docker` guruhiga qo'shing:

```bash
sudo adduser --disabled-password --gecos "" deploy && sudo usermod -aG docker deploy
```

Katalog tuzilmasi:

```bash
sudo -u deploy mkdir -p /srv/codearena/infra /srv/codearena/backend
```

Serverga qo'lda joylashtiriladigan fayllar (ular Git'da ham, CI'da ham yo'q):

| Fayl | Nima |
|---|---|
| `/srv/codearena/.env` | compose o'zgaruvchilari — `POSTGRES_*`, `JUDGE0_*` |
| `/srv/codearena/backend/.env` | Django sozlamalari (`backend/.env.example` dan) |
| `/srv/codearena/infra/judge0.conf` | Judge0 konfiguratsiyasi, `AUTHN_TOKEN` bilan |

`docker-compose.prod.yml` va `infra/nginx.conf` har deploy'da CI tomonidan
yangilanadi — ularni qo'lda tahrirlamang.

### `/srv/codearena/.env`

```ini
IMAGE_PREFIX=ghcr.io/<owner>/<repo>
IMAGE_TAG=latest
POSTGRES_DB=codearena
POSTGRES_USER=codearena
POSTGRES_PASSWORD=<kuchli parol>
JUDGE0_DB_PASSWORD=<kuchli parol>
JUDGE0_REDIS_PASSWORD=<kuchli parol>
```

### `/srv/codearena/backend/.env`

`backend/.env.example` dan nusxa oling va **kamida** shularni o'zgartiring:

```ini
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<python -c "import secrets; print(secrets.token_urlsafe(64))">
DJANGO_ALLOWED_HOSTS=codearena.uz,www.codearena.uz
POSTGRES_HOST=postgres
POSTGRES_PASSWORD=<.env dagi bilan bir xil>
REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=https://codearena.uz
CSRF_TRUSTED_ORIGINS=https://codearena.uz
FRONTEND_URL=https://codearena.uz
AUTH_COOKIE_SECURE=True
LOCAL_JUDGE_ENABLED=False
```

> `DJANGO_DEBUG=False` bo'lganda server standart `DJANGO_SECRET_KEY` yoki
> standart `POSTGRES_PASSWORD` bilan **ishga tushmaydi** — bu ataylab:
> `.env.example` qiymatlari produksiyaga o'tib ketishi eng ko'p uchraydigan
> xato edi.

---

### 2. GitHub sirlarini sozlash

Repozitoriy → Settings → Secrets and variables → Actions:

| Secret | Misol | Majburiymi |
|---|---|---|
| `DEPLOY_HOST` | `203.0.113.10` | ha |
| `DEPLOY_USER` | `deploy` | ha |
| `DEPLOY_SSH_KEY` | maxfiy kalitning to'liq matni (`-----BEGIN ...`) | ha |
| `DEPLOY_PATH` | `/srv/codearena` | ha |
| `DEPLOY_PORT` | `22` | yo'q (sukut: 22) |
| `DEPLOY_HEALTH_URL` | `https://codearena.uz/health/` | yo'q |

Kalit juftligini yaratish va serverga qo'shish:

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/codearena_deploy -N ""
```

Ochiq kalitni serverdagi `deploy` foydalanuvchisiga qo'shing, maxfiysini
(`~/.ssh/codearena_deploy`) `DEPLOY_SSH_KEY` sirига joylang.

GHCR uchun alohida token kerak emas — workflow `GITHUB_TOKEN` bilan ishlaydi
(`packages: write` ruxsati `deploy.yml` da e'lon qilingan).

> **Birinchi deploy'dan oldin:** GHCR paketi sukut bo'yicha private bo'ladi.
> Server image'ni torta olishi uchun workflow serverda `docker login ghcr.io`
> ni o'zi bajaradi, shuning uchun qo'shimcha sozlash shart emas.

---

### 3. Birinchi ishga tushirish

Deploy workflow'i `migrate` xizmatini avtomatik bajaradi, lekin birinchi marta
administrator hisobi qo'lda yaratiladi:

```bash
ssh deploy@<host>
```

```bash
cd /srv/codearena && docker compose -f docker-compose.prod.yml run --rm backend python manage.py createsuperuser
```

Demo ma'lumot bilan to'ldirish (ixtiyoriy, **faqat toza bazada**):

```bash
cd /srv/codearena && docker compose -f docker-compose.prod.yml run --rm backend python manage.py seed_demo
```

### HTTPS

`infra/nginx.conf` da HTTPS bloki izohga olingan. Sertifikat oling:

```bash
docker run --rm -v /srv/codearena/infra/certbot/conf:/etc/letsencrypt -v /srv/codearena/infra/certbot/www:/var/www/certbot certbot/certbot certonly --webroot -w /var/www/certbot -d codearena.uz
```

So'ng `infra/nginx.conf` dagi HTTPS blokini va HTTP→HTTPS yo'naltirishni
faollashtiring (fayl repozitoriyda — o'zgartirib, push qiling).

---

### 4. Kundalik ish

| Vazifa | Buyruq |
|---|---|
| Deploy | `main` ga push (yoki Actions → Deploy → Run workflow) |
| Loglar | `docker compose -f docker-compose.prod.yml logs -f backend` |
| Holat | `docker compose -f docker-compose.prod.yml ps` |
| Migratsiya | deploy'da avtomatik (`migrate` xizmati) |
| Baza zaxirasi | admin panel → Zaxira nusxalar, yoki `pg_dump` (pastga qarang) |

### Qo'lda zaxira

```bash
cd /srv/codearena && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U codearena codearena | gzip > backup-$(date +%F).sql.gz
```

Tiklash:

```bash
cd /srv/codearena && gzip -dc backup-2026-07-30.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U codearena -d codearena
```

### Orqaga qaytarish (rollback)

Image'lar commit SHA bilan teglanadi, shuning uchun oldingi versiyaga
qaytish — `IMAGE_TAG` ni o'zgartirib qayta ko'tarish:

```bash
cd /srv/codearena && IMAGE_TAG=<oldingi-sha-12> docker compose -f docker-compose.prod.yml up -d backend frontend
```

> Migratsiyalar avtomatik orqaga qaytmaydi. Agar deploy migratsiya qo'shgan
> bo'lsa, avval `migrate <app> <oldingi_migratsiya>` bilan qaytaring.
