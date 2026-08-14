"""Eski `Problem.solution_code_python` ni `ReferenceSolution` ga ko'chiradi.

Ilgari etalon yechim masalaning bitta matn maydonida yotardi va hech qayerda
ishlatilmasdi. Studio uni ishchi obyektga aylantiradi: kutilgan chiqishni
shu yechim hisoblaydi. Mavjud masalalar bo'sh qolmasin — kod bor bo'lsa,
u asosiy etalon sifatida ko'chiriladi.
"""
from django.db import migrations


def forwards(apps, schema_editor):
    Problem = apps.get_model("problems", "Problem")
    ReferenceSolution = apps.get_model("problems", "ReferenceSolution")

    rows = []
    for problem in Problem.objects.exclude(solution_code_python="").only(
        "id", "solution_code_python", "author_id"
    ):
        rows.append(
            ReferenceSolution(
                problem_id=problem.id,
                name="Etalon (ko'chirilgan)",
                kind="model",
                language="python",
                code=problem.solution_code_python,
                is_primary=True,
                note="Masalaning eski `solution_code_python` maydonidan olindi.",
                author_id=problem.author_id,
            )
        )
    ReferenceSolution.objects.bulk_create(rows, batch_size=200)


def backwards(apps, schema_editor):
    ReferenceSolution = apps.get_model("problems", "ReferenceSolution")
    ReferenceSolution.objects.filter(name="Etalon (ko'chirilgan)").delete()


class Migration(migrations.Migration):
    dependencies = [("problems", "0005_problem_checker_code_problem_checker_language_and_more")]

    operations = [migrations.RunPython(forwards, backwards)]
