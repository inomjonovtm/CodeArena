#!/bin/sh
# nginx konfiguratsiyasini ishga tushish paytida quradi.
#
# Nima uchun skript kerak: `ssl_certificate` ko'rsatgan fayl mavjud bo'lmasa
# nginx umuman ko'tarilmaydi. Ilgari HTTPS bloki faylda izohga olingan holda
# turardi va uni qo'lda ochish kerak edi — sertifikat olingunga qadar sayt
# HTTP'da, Django esa (DEBUG=False da) HTTPS'ga yo'naltirib turardi. Natija:
# nginx 443 da eshitmaydi, brauzer esa o'sha yerga boradi — sayt umuman
# ochilmasdi.
#
# Endi mantiq shunday:
#   sertifikat yo'q   -> faqat 80-port, sayt HTTP orqali ishlaydi
#                        (+ ACME tekshiruvi ochiq turadi)
#   sertifikat bor    -> 80 dan 443 ga yo'naltirish, sayt TLS ustida
#
# Sertifikat certbot tomonidan fon rejimida olinadi, shuning uchun konfig
# har 6 soatda qayta quriladi va o'zgargan bo'lsa nginx reload qilinadi.
# Bu bir vaqtning o'zida yangilangan sertifikatni ham ko'tarib oladi.
set -eu

CONF_DIR=/etc/nginx/conf.d
CONF="${CONF_DIR}/default.conf"

DOMAINS="${DOMAIN:-}"
PRIMARY="$(printf '%s' "$DOMAINS" | cut -d, -f1 | tr -d ' ')"
SERVER_NAMES="$(printf '%s' "$DOMAINS" | tr ',' ' ' | tr -s ' ')"
[ -n "$SERVER_NAMES" ] || SERVER_NAMES="_"

cert_dir() {
    [ -n "$PRIMARY" ] || return 1
    [ -f "/etc/letsencrypt/live/${PRIMARY}/fullchain.pem" ] || return 1
    printf '/etc/letsencrypt/live/%s' "$PRIMARY"
}

write_conf() {
    tls_dir="$(cert_dir || true)"

    {
        cat <<'UPSTREAMS'
upstream codearena_backend {
    server backend:8000;
}

upstream codearena_frontend {
    server frontend:3000;
}

# WebSocket/HMR uchun: `Connection: upgrade` faqat brauzer so'raganda
# yuborilsin. Doimiy "upgrade" qo'yilsa oddiy so'rovlar ham buziladi.
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
UPSTREAMS

        printf '\nserver {\n    listen 80;\n    server_name %s;\n\n' "$SERVER_NAMES"
        printf '    client_max_body_size 10M;\n\n'
        printf '    # Let'"'"'s Encrypt HTTP-01 tekshiruvi — sertifikat yangilanishi\n'
        printf '    # uchun HTTPS holatidan qat'"'"'i nazar DOIM ochiq turishi kerak.\n'
        printf '    location /.well-known/acme-challenge/ {\n        root /var/www/certbot;\n    }\n\n'

        if [ -n "$tls_dir" ]; then
            printf '    location / {\n        return 301 https://$host$request_uri;\n    }\n}\n\n'
            printf 'server {\n    listen 443 ssl;\n    http2 on;\n    server_name %s;\n\n' "$SERVER_NAMES"
            printf '    client_max_body_size 10M;\n\n'
            printf '    ssl_certificate     %s/fullchain.pem;\n' "$tls_dir"
            printf '    ssl_certificate_key %s/privkey.pem;\n' "$tls_dir"
            cat <<'TLS'
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    include /etc/nginx/app.conf;
}
TLS
        else
            printf '    include /etc/nginx/app.conf;\n}\n'
        fi
    } > "${CONF}.new"

    if [ -f "$CONF" ] && cmp -s "${CONF}.new" "$CONF"; then
        rm -f "${CONF}.new"
        return 1
    fi
    mv "${CONF}.new" "$CONF"
    return 0
}

write_conf || true

if cert_dir >/dev/null 2>&1; then
    echo "[nginx] TLS yoqildi: ${PRIMARY}"
elif [ -n "$PRIMARY" ]; then
    echo "[nginx] ${PRIMARY} uchun sertifikat hali yo'q — HTTP rejimida ishlayapmiz."
    echo "[nginx] certbot uni olgach konfig avtomatik yangilanadi."
else
    echo "[nginx] DOMAIN o'rnatilmagan — TLS o'chiq, faqat HTTP."
fi

# Fon sikli: sertifikat paydo bo'lishini va yangilanishini kuzatadi.
(
    while true; do
        sleep 6h
        if write_conf; then
            echo "[nginx] konfiguratsiya o'zgardi, qayta yuklanmoqda"
        fi
        # Sertifikat yangilanganda fayl o'zgaradi-yu, konfig o'zgarmaydi —
        # shuning uchun reload har holda bajariladi (u uzilishsiz ketadi).
        nginx -s reload 2>/dev/null || true
    done
) &

exec nginx -g 'daemon off;'
