"""Server tomonida to'liq CSV eksport — filtr bo'yicha BARCHA yozuvlar."""
from __future__ import annotations

import csv
from typing import Iterable

from django.http import StreamingHttpResponse
from django.utils import timezone


class _Echo:
    """`csv.writer` uchun soxta buffer — har bir qatorni darhol qaytaradi."""

    def write(self, value):
        return value


def stream_csv(rows: Iterable[dict], columns: list[tuple[str, str]], filename: str):
    """
    `columns` — [(maydon_kaliti, "Ustun sarlavhasi"), ...]
    Butun natijani xotiraga yig'maydi — qator-baqator oqim qilib yuboradi.
    """
    writer = csv.writer(_Echo())
    headers = [title for _, title in columns]
    keys = [key for key, _ in columns]

    def generate():
        # Excel UTF-8 ni to'g'ri o'qishi uchun BOM
        yield "﻿"
        yield writer.writerow(headers)
        for row in rows:
            yield writer.writerow([_stringify(row.get(key)) for key in keys])

    stamp = timezone.localtime().strftime("%Y%m%d-%H%M")
    response = StreamingHttpResponse(generate(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}-{stamp}.csv"'
    response["Cache-Control"] = "no-store"
    return response


def _stringify(value) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "ha" if value else "yo'q"
    if hasattr(value, "isoformat"):
        return value.isoformat(sep=" ", timespec="seconds")
    return str(value)


class ExportMixin:
    """
    ViewSet'ga `GET .../export/` qo'shadi — joriy filtrlar bo'yicha to'liq CSV.

    `export_columns` — [(orm_yo'li, "Sarlavha"), ...]
    """

    export_columns: list[tuple[str, str]] = []
    export_filename: str = "export"
    export_limit: int = 100_000

    def get_export_queryset(self):
        return self.filter_queryset(self.get_queryset())

    def export_csv(self, request):
        if not self.export_columns:
            from rest_framework.response import Response

            return Response({"detail": "Bu bo'lim uchun eksport sozlanmagan."}, status=400)

        keys = [key for key, _ in self.export_columns]
        queryset = self.get_export_queryset().values(*keys)[: self.export_limit]
        return stream_csv(queryset.iterator(chunk_size=500), self.export_columns, self.export_filename)
