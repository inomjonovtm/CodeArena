#!/usr/bin/env bash
#
# Yagona konteynerni ishga tushiradi: migratsiya → statik fayllar →
# supervisord (nginx + gunicorn + next [+ celery]).
#
# Celery ataylab shartli: Redis bo'lmasa worker cheksiz qayta urinib,
# loglarni to'ldiradi va "ishlayapti" degan yolg'on taassurot qoldiradi.
# Redis manzili berilmagan bo'lsa, tasklar Django ichida sinxron bajariladi
# (`CELERY_TASK_ALWAYS_EAGER`).

set -euo pipefail

PORT="${PORT:-8080}"
export PORT

log() { printf '[entrypoint] %s\n' "$*"; }

# --------------------------------------------------------------- nginx konfig
log "nginx konfiguratsiyasi tayyorlanmoqda (port ${PORT})"
envsubst '${PORT}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
nginx -t

# ------------------------------------------------------------------- Django
cd /app/backend

if [ -z "${DATABASE_URL:-}" ] && [ -z "${POSTGRES_HOST:-}" ]; then
  log "OGOHLANTIRISH: DATABASE_URL ham, POSTGRES_HOST ham berilmagan."
  log "               PostgreSQL tashqarida bo'lishi shart — ulanish uzilishi mumkin."
fi

log "migratsiyalar qo'llanmoqda"
python manage.py migrate --noinput

log "statik fayllar yig'ilmoqda"
python manage.py collectstatic --noinput --clear

# --------------------------------------------------------------- supervisord
CONF=/etc/supervisord.conf

cat > "$CONF" <<'EOF'
[supervisord]
nodaemon=true
loglevel=info
logfile=/dev/null
logfile_maxbytes=0
pidfile=/tmp/supervisord.pid

[program:gunicorn]
command=gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 120 --access-logfile - --error-logfile -
directory=/app/backend
autorestart=true
startretries=10
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nextjs]
command=npm run start -- --port 3000 --hostname 127.0.0.1
directory=/app/frontend
autorestart=true
startretries=10
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nginx]
command=nginx -g "daemon off;"
autorestart=true
startretries=10
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

if [ -n "${REDIS_URL:-}" ]; then
  log "Redis topildi — celery worker va beat yoqilmoqda"
  cat >> "$CONF" <<'EOF'

[program:celery]
command=celery -A config worker -l info --concurrency=2
directory=/app/backend
autorestart=true
startretries=10
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:celery-beat]
command=celery -A config beat -l info
directory=/app/backend
autorestart=true
startretries=10
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF
else
  log "REDIS_URL yo'q — tasklar sinxron bajariladi (CELERY_TASK_ALWAYS_EAGER)"
  export CELERY_TASK_ALWAYS_EAGER=True
fi

log "ishga tushirilmoqda"
exec supervisord -c "$CONF"
