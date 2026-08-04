#!/bin/sh
# Let's Encrypt sertifikatini oladi va MUDDATI TUGASHIDAN OLDIN yangilaydi.
#
# Nima uchun alohida xizmat: sertifikat 90 kun yashaydi. Ilgari uni qo'lda
# `docker run certbot ...` bilan olish DEPLOY.md da yozilgan edi, lekin
# yangilash uchun hech narsa yo'q edi — ya'ni sayt ishga tushganidan roppa-rosa
# 90 kun keyin jimgina "sertifikat muddati tugagan" bo'lib qolardi.
#
# Sikl 12 soatda bir marta `renew` chaqiradi (Let's Encrypt tavsiyasi).
# `renew` muddati tugashiga 30 kundan ko'p qolgan sertifikatga tegmaydi,
# shuning uchun tez-tez chaqirish xavfsiz va limitga urilmaydi.
set -eu

DOMAINS="${DOMAIN:-}"
EMAIL="${CERTBOT_EMAIL:-}"
WEBROOT=/var/www/certbot

if [ -z "$DOMAINS" ]; then
    echo "[certbot] DOMAIN o'rnatilmagan — sertifikat olinmaydi, sayt HTTP'da qoladi."
    echo "[certbot] Yoqish uchun .env ga DOMAIN=sizning-domen.uz qo'shing."
    while true; do sleep 86400; done
fi

PRIMARY="$(printf '%s' "$DOMAINS" | cut -d, -f1 | tr -d ' ')"

# `-d a.uz -d www.a.uz` ko'rinishidagi argumentlar
DOMAIN_ARGS=""
for d in $(printf '%s' "$DOMAINS" | tr ',' ' '); do
    DOMAIN_ARGS="${DOMAIN_ARGS} -d ${d}"
done

if [ -n "$EMAIL" ]; then
    ACCOUNT_ARGS="--email ${EMAIL}"
else
    # Emailsiz ro'yxatdan o'tish mumkin, lekin muddati tugashi haqida
    # ogohlantirish xati kelmaydi — shuning uchun email tavsiya etiladi.
    echo "[certbot] CERTBOT_EMAIL bo'sh — muddat haqida ogohlantirish kelmaydi."
    ACCOUNT_ARGS="--register-unsafely-without-email"
fi

STAGING_ARGS=""
case "${CERTBOT_STAGING:-false}" in
    1|true|True|yes|on)
        # Sinov uchun: Let's Encrypt'ning haqiqiy limiti haftasiga 5 ta
        # muvaffaqiyatsiz urinish bilan tugaydi, staging'da limit yo'q.
        echo "[certbot] STAGING rejimi — sertifikat brauzerda ISHONCHSIZ bo'ladi."
        STAGING_ARGS="--staging"
        ;;
esac

obtain() {
    echo "[certbot] ${DOMAINS} uchun sertifikat so'ralmoqda..."
    # shellcheck disable=SC2086
    certbot certonly \
        --webroot -w "$WEBROOT" \
        $DOMAIN_ARGS $ACCOUNT_ARGS $STAGING_ARGS \
        --agree-tos --non-interactive --keep-until-expiring
}

if [ ! -f "/etc/letsencrypt/live/${PRIMARY}/fullchain.pem" ]; then
    # nginx 80-portda javob bera boshlashini kutamiz: ACME HTTP-01 tekshiruvi
    # aynan o'sha port orqali ketadi va nginx ko'tarilmasidan so'ralsa,
    # urinish behuda sarflanadi.
    i=0
    while [ "$i" -lt 30 ]; do
        if wget -q -O /dev/null "http://nginx/.well-known/acme-challenge/ping" 2>/dev/null; then
            break
        fi
        # 404 ham "nginx tirik" degani — wget uni xato deb qaytaradi,
        # shuning uchun ulanish o'rnatilganini alohida tekshiramiz.
        if wget -q -S -O /dev/null "http://nginx/" 2>&1 | grep -q "HTTP/"; then
            break
        fi
        i=$((i + 1))
        sleep 2
    done

    obtain || echo "[certbot] birinchi urinish muvaffaqiyatsiz — sikl qayta urinadi."
fi

while true; do
    sleep 43200   # 12 soat
    if [ -f "/etc/letsencrypt/live/${PRIMARY}/fullchain.pem" ]; then
        certbot renew --webroot -w "$WEBROOT" --quiet || \
            echo "[certbot] yangilash muvaffaqiyatsiz — keyingi siklda qayta uriniladi."
    else
        obtain || true
    fi
done
