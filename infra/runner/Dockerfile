# CodeArena runner — ishonchsiz kod shu image ichida bajariladi.
#
# Ichida NIMA YO'Q: sayt kodi, baza paroli, maxfiy kalitlar, `.env`. Faqat
# kompilyatorlar va ikkita python fayl. Shuning uchun bu konteynerga kirib
# olgan kod ham hech narsa o'g'irlay olmaydi.
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# `util-linux` — `unshare` shu paketda (har bir bajarilish uchun alohida
# tarmoq va PID fazasi). Qolganlari — tillarning o'zi.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        util-linux \
        python3 \
        gcc g++ \
        openjdk-17-jdk-headless \
        nodejs npm \
        golang-go \
        rustc \
        php-cli \
        ruby \
        mono-mcs mono-runtime \
    && rm -rf /var/lib/apt/lists/*

# TypeScript uchun `tsx` — global o'rnatiladi, ijro paytida tarmoq
# kerak bo'lmasligi uchun.
RUN npm install -g --no-fund --no-audit tsx@4 typescript@5 \
    && npm cache clean --force

# Kotlin kompilyatori — Debian omborida yo'q, rasmiy relizdan olinadi.
# Busiz `kotlin` tanlovda ko'rinardi-yu, har bir yechim SYSTEM_ERROR olardi.
ARG KOTLIN_VERSION=2.0.21
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip \
    && curl -fsSL -o /tmp/kotlin.zip \
        "https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip" \
    && unzip -q /tmp/kotlin.zip -d /opt \
    && rm /tmp/kotlin.zip \
    && apt-get purge -y curl unzip && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*
ENV PATH="/opt/kotlinc/bin:${PATH}"

# Kod IMTIYOZSIZ foydalanuvchi nomidan bajariladi.
RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin runner

WORKDIR /app
COPY executor.py server.py /app/

# Go va Rust kesh kataloglarini yozib bo'ladigan joyga suramiz: konteyner
# fayl tizimi `read_only`, faqat /tmp yoziladi.
ENV TMPDIR=/tmp \
    GOCACHE=/tmp/go-build \
    GOPATH=/tmp/go \
    HOME=/tmp

USER runner
EXPOSE 2400

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python3 -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:2400/health', timeout=4).status==200 else 1)"

CMD ["python3", "/app/server.py"]
