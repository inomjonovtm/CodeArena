"""Frontend uchun bir xil ko'rinishdagi xatolik javoblari."""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def api_exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        return Response(
            {"detail": "Ma'lumotlar noto'g'ri.", "errors": {"non_field_errors": exc.messages}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if isinstance(exc, IntegrityError):
        return Response(
            {"detail": "Ma'lumotlar bazasi cheklovi buzildi (takrorlanuvchi qiymat bo'lishi mumkin).",
             "errors": {"non_field_errors": [str(exc)]}},
            status=status.HTTP_409_CONFLICT,
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    detail = "Xatolik yuz berdi."
    errors: dict | None = None
    data = response.data

    if isinstance(data, dict):
        raw_detail = data.get("detail")
        if raw_detail is not None:
            detail = str(raw_detail)
            extra = {k: v for k, v in data.items() if k != "detail"}
            errors = extra or None
        else:
            detail = "Formada xatoliklar bor."
            errors = data
    elif isinstance(data, list):
        detail = "Formada xatoliklar bor."
        errors = {"non_field_errors": data}

    if isinstance(exc, Http404):
        detail = "So'ralgan obyekt topilmadi."
    elif isinstance(exc, PermissionDenied):
        detail = str(getattr(exc, "detail", detail))

    payload: dict = {"detail": detail}
    if errors:
        payload["errors"] = errors
    if isinstance(exc, APIException) and getattr(exc, "default_code", None):
        payload["code"] = exc.default_code

    response.data = payload
    return response
