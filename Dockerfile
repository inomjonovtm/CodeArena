# Yagona konteyner: nginx + Django (gunicorn) + Next.js.
#
# Nega bitta konteyner: "bitta Dockerfile push qil" turidagi hosting
# platformalari repozitoriy ildizidan bitta image quradi va bitta port
# ochadi. `docker-compose*.yml` fayllari joyida qoladi — server o'zingizniki
# bo'lsa, xizmatlarni ajratib yuritgan ma'qul (DEPLOY.md ga qarang).
#
# Ichki tuzilma:
#   nginx  :$PORT  ── /api/, /health/, /static/, /media/ → gunicorn :8000
#                   └─ qolgan hammasi                     → next     :3000
#
# TASHQI TALAB: PostgreSQL. Konteynerda baza yo'q — `DATABASE_URL` yoki
# `POSTGRES_*` orqali tashqi bazaga ulanadi.

# --------------------------------------------------------- 1. frontend build
FROM node:22-bookworm-slim AS frontend

WORKDIR /build
ENV NEXT_TELEMETRY_DISABLED=1

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
# Brauzer `/api/...` ga so'raydi va uni nginx to'g'ridan-to'g'ri Django'ga
# uzatadi, ya'ni Next'ning rewrite'i produksiyada ishlatilmaydi. Qiymat
# baribir kerak: `next.config.mjs` uni build paytida o'qiydi.
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Build tugagach dev bog'liqliklari (typescript, tailwind, eslint) kerak emas.
# `next start` faqat `dependencies` ro'yxatidagilarga tayanadi.
RUN npm prune --omit=dev

# ------------------------------------------------------------- 2. ishchi image
FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       nginx gettext-base curl libpq5 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

# Node ishga tushirish muhiti — Next `npm start` uchun. Alohida Node image
# o'rniga binarlar ko'chiriladi: ikkala image ham bookworm asosida, shuning
# uchun glibc mos keladi va ikkinchi paket menejeri kerak bo'lmaydi.
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm

WORKDIR /app

# --- backend
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r backend/requirements.txt \
    && pip install supervisor
COPY backend/ ./backend/

# --- frontend (qurilgan holda)
COPY --from=frontend /build/.next        ./frontend/.next
COPY --from=frontend /build/public       ./frontend/public
COPY --from=frontend /build/node_modules ./frontend/node_modules
COPY --from=frontend /build/package.json ./frontend/package.json
COPY --from=frontend /build/next.config.mjs ./frontend/next.config.mjs

# --- ishga tushirish
COPY infra/single/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY infra/single/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /app/backend/media /app/backend/staticfiles /var/log/codearena

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health/" || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
