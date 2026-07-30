"""Ommaviy import va tarjima holati."""
from __future__ import annotations

import json
import re
import zipfile

from django.db import transaction
from django.db.models import Case, Count, IntegerField, Q, When
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.core.mixins import write_audit
from apps.core.permissions import require
from apps.core.utils import unique_slug

from .models import Problem, ProblemStatus, Tag, TestCase

# ------------------------------------------------------------------------
# Masalalarni JSON dan import qilish
# ------------------------------------------------------------------------
REQUIRED_FIELDS = {"title_uz", "description_uz"}

IMPORTABLE_FIELDS = {
    "title_uz", "title_en", "slug", "difficulty", "points", "status",
    "description_uz", "description_en", "constraints_uz", "constraints_en",
    "hint_uz", "hint_en", "editorial_uz", "editorial_en",
    "starter_code_python", "starter_code_javascript", "starter_code_cpp",
    "solution_code_python", "time_limit_ms", "memory_limit_kb",
    "is_premium", "is_contest_only",
}

SAMPLE_TEMPLATE = [
    {
        "title_uz": "Ikki sonning yig'indisi",
        "title_en": "Two Sum",
        "difficulty": "easy",
        "points": 10,
        "status": "draft",
        "description_uz": "### Masala\n\nMassiv va target beriladi...",
        "constraints_uz": "- `1 <= n <= 10^5`",
        "tags": ["array", "hash-table"],
        "starter_code_python": "def solve(nums, target):\n    pass\n",
        "test_cases": [
            {"input": "4\n2 7 11 15\n9", "expected_output": "0 1", "is_sample": True},
            {"input": "3\n3 2 4\n6", "expected_output": "1 2", "is_sample": False},
        ],
    }
]


@api_view(["GET"])
@permission_classes([require("problems.import")])
def import_template(request):
    """Import uchun namuna JSON — admin yuklab olib to'ldiradi."""
    return Response(
        {
            "format": "JSON massiv — har bir element bitta masala",
            "required": sorted(REQUIRED_FIELDS),
            "optional": sorted(IMPORTABLE_FIELDS - REQUIRED_FIELDS),
            "relations": {
                "tags": "teg slug'lari massivi (mavjud bo'lmasa yaratiladi)",
                "test_cases": "input / expected_output / is_sample / explanation_uz",
            },
            "sample": SAMPLE_TEMPLATE,
        }
    )


def _resolve_tags(names: list[str]) -> list[Tag]:
    tags = []
    for raw in names or []:
        name = str(raw).strip()
        if not name:
            continue
        tag = Tag.objects.filter(Q(slug__iexact=name) | Q(name_en__iexact=name) | Q(name_uz__iexact=name)).first()
        if not tag:
            tag = Tag.objects.create(
                name_uz=name, name_en=name, slug=unique_slug(Tag, name)
            )
        tags.append(tag)
    return tags


@api_view(["POST"])
@permission_classes([require("problems.import")])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def import_problems(request):
    """
    `POST /api/admin/problems/import/`

    Body: `{"items": [...], "dry_run": true}` yoki `file` (JSON) yuklash.
    `dry_run` — faqat tekshiradi, saqlamaydi.
    """
    payload = request.data.get("items")

    upload = request.FILES.get("file")
    if upload is not None:
        try:
            payload = json.loads(upload.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            return Response({"detail": f"JSON o'qib bo'lmadi: {exc}"},
                            status=status.HTTP_400_BAD_REQUEST)

    if isinstance(payload, dict):
        payload = [payload]
    if not isinstance(payload, list) or not payload:
        return Response({"detail": "Bo'sh yoki noto'g'ri format — JSON massiv kutilgan."},
                        status=status.HTTP_400_BAD_REQUEST)
    if len(payload) > 500:
        return Response({"detail": "Bir martada 500 tadan ko'p masala import qilib bo'lmaydi."},
                        status=status.HTTP_400_BAD_REQUEST)

    dry_run = bool(request.data.get("dry_run"))
    errors: list[dict] = []
    prepared: list[dict] = []

    for index, raw in enumerate(payload):
        if not isinstance(raw, dict):
            errors.append({"index": index, "error": "Obyekt emas."})
            continue
        missing = REQUIRED_FIELDS - set(k for k, v in raw.items() if str(v or "").strip())
        if missing:
            errors.append({"index": index, "title": raw.get("title_uz", "—"),
                           "error": f"To'ldirilmagan: {', '.join(sorted(missing))}"})
            continue
        if raw.get("difficulty") and raw["difficulty"] not in {"easy", "medium", "hard"}:
            errors.append({"index": index, "title": raw.get("title_uz"),
                           "error": "difficulty faqat easy/medium/hard bo'lishi mumkin"})
            continue

        fields = {key: raw[key] for key in IMPORTABLE_FIELDS if key in raw}
        fields.setdefault("difficulty", "easy")
        fields.setdefault("points", {"easy": 10, "medium": 30, "hard": 50}[fields["difficulty"]])
        fields.setdefault("status", ProblemStatus.DRAFT)
        prepared.append(
            {
                "fields": fields,
                "tags": raw.get("tags") or [],
                "test_cases": raw.get("test_cases") or [],
                "index": index,
            }
        )

    if dry_run:
        return Response(
            {
                "dry_run": True,
                "valid": len(prepared),
                "invalid": len(errors),
                "errors": errors[:50],
                "preview": [item["fields"].get("title_uz") for item in prepared[:20]],
            }
        )

    created = []
    with transaction.atomic():
        for item in prepared:
            fields = item["fields"]
            fields["slug"] = unique_slug(
                Problem, fields.get("slug") or fields.get("title_en") or fields["title_uz"],
                max_length=120,
            )
            problem = Problem.objects.create(author=request.user, **fields)
            problem.tags.set(_resolve_tags(item["tags"]))

            TestCase.objects.bulk_create(
                [
                    TestCase(
                        problem=problem,
                        order=order,
                        input=str(row.get("input", "")),
                        expected_output=str(row.get("expected_output", "")),
                        is_sample=bool(row.get("is_sample")),
                        explanation_uz=str(row.get("explanation_uz", "")),
                        explanation_en=str(row.get("explanation_en", "")),
                    )
                    for order, row in enumerate(item["test_cases"])
                    if isinstance(row, dict)
                ]
            )
            created.append({"id": str(problem.id), "title": problem.title_uz, "slug": problem.slug})

    write_audit(
        request,
        action_name="problem.import",
        target_type="Problem",
        target_repr=f"{len(created)} ta masala",
        changes={"created": len(created), "skipped": len(errors)},
    )
    return Response(
        {
            "detail": f"{len(created)} ta masala import qilindi.",
            "created": created,
            "errors": errors[:50],
        },
        status=status.HTTP_201_CREATED,
    )


# ------------------------------------------------------------------------
# Test-case'larni fayldan yuklash
# ------------------------------------------------------------------------
@api_view(["POST"])
@permission_classes([require("problems.import")])
@parser_classes([MultiPartParser, FormParser])
def import_test_cases(request, problem_id):
    """
    `POST /api/admin/problems/<id>/test-cases/import/`

    Qo'llab-quvvatlanadi:
    - `.zip` — ichida `1.in`/`1.out`, `2.in`/`2.out` juftliklari
    - `.txt` — `---` bilan ajratilgan bloklar (kirish, keyin `===`, keyin chiqish)
    """
    problem = Problem.objects.filter(pk=problem_id).first()
    if not problem:
        return Response({"detail": "Masala topilmadi."}, status=status.HTTP_404_NOT_FOUND)

    upload = request.FILES.get("file")
    if upload is None:
        return Response({"detail": "Fayl yuborilmadi."}, status=status.HTTP_400_BAD_REQUEST)

    replace = bool(request.data.get("replace"))
    sample_count = int(request.data.get("sample_count", 0))
    pairs: list[tuple[str, str]] = []

    name = (upload.name or "").lower()
    try:
        if name.endswith(".zip"):
            with zipfile.ZipFile(upload) as archive:
                inputs, outputs = {}, {}
                for member in archive.namelist():
                    if member.endswith("/"):
                        continue
                    stem = re.sub(r"\.(in|out|txt|ans)$", "", member.split("/")[-1], flags=re.I)
                    content = archive.read(member).decode("utf-8", errors="replace")
                    if re.search(r"\.(in|txt)$", member, re.I):
                        inputs[stem] = content
                    elif re.search(r"\.(out|ans)$", member, re.I):
                        outputs[stem] = content
                for stem in sorted(inputs, key=lambda value: (len(value), value)):
                    if stem in outputs:
                        pairs.append((inputs[stem], outputs[stem]))
        else:
            text = upload.read().decode("utf-8", errors="replace")
            for block in re.split(r"^-{3,}$", text, flags=re.M):
                if not block.strip():
                    continue
                parts = re.split(r"^={3,}$", block, flags=re.M)
                if len(parts) >= 2:
                    pairs.append((parts[0].strip("\n"), parts[1].strip("\n")))
    except Exception as exc:  # noqa: BLE001
        return Response({"detail": f"Faylni o'qib bo'lmadi: {exc}"},
                        status=status.HTTP_400_BAD_REQUEST)

    if not pairs:
        return Response(
            {"detail": "Test juftliklari topilmadi. ZIP uchun `1.in`/`1.out`, "
                       "TXT uchun `---` va `===` ajratkichlarini ishlating."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        if replace:
            problem.test_cases.all().delete()
        start = problem.test_cases.count()
        TestCase.objects.bulk_create(
            [
                TestCase(
                    problem=problem,
                    order=start + index,
                    input=raw_input,
                    expected_output=expected,
                    is_sample=index < sample_count,
                )
                for index, (raw_input, expected) in enumerate(pairs)
            ]
        )

    write_audit(
        request,
        action_name="testcase.import",
        obj=problem,
        changes={"count": len(pairs), "replace": replace},
    )
    return Response(
        {"detail": f"{len(pairs)} ta test qo'shildi.", "count": len(pairs)},
        status=status.HTTP_201_CREATED,
    )
