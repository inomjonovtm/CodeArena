FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# postgresql-client — `pg_dump`/`pg_restore` uchun. Usiz zaxira `dumpdata`
# ga tushadi, u esa butun bazani xotiraga yig'adi va katta bazada
# konteynerni OOM bilan o'ldiradi.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential libpq-dev curl postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

RUN mkdir -p /app/media /app/staticfiles

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD curl -fsS http://localhost:8000/health/ || exit 1

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
