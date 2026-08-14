"""Kurslar bo'limini bazadan butunlay olib tashlaydi.

`apps.courses` ilovasi loyihadan chiqarildi: platforma masala yechish va
olimpiadaga jamlandi. Ilova `INSTALLED_APPS` dan olingani uchun uning o'z
migratsiyalari endi ishlamaydi — jadvallarni tashlashning yagona yo'li shu
yerdagi aniq SQL.

Migratsiya IKKALA holatda ham xavfsiz:

* eski bazada — jadvallar mavjud, ular tashlanadi;
* toza bazada — `courses` migratsiyalari umuman ishlamagan, jadvallar yo'q
  va `IF EXISTS` tufayli hech narsa qilinmaydi.

`CASCADE` kerak: kurs jadvallariga tashqi kalit bilan bog'langan yozuvlar
(ro'yxatdan o'tish, progress, urinishlar) bir vaqtda tushishi shart.
"""
from django.db import migrations

# Tartib muhim emas (CASCADE bor), lekin bog'liqdan boshlash toza bo'ladi.
TABLES = [
    "course_quiz_attempts",
    "course_exercise_attempts",
    "course_lesson_progress",
    "course_enrollments",
    "course_exercise_tests",
    "course_exercises",
    "course_quiz_questions",
    "course_examples",
    "course_lessons",
    "course_modules",
    "courses",
]

DROP_SQL = "\n".join(f'DROP TABLE IF EXISTS "{table}" CASCADE;' for table in TABLES)

# Ilova o'chirilgach `django_migrations` da yetim qatorlar qoladi. Ular
# zarar qilmaydi, lekin `showmigrations` chiqishini chalkashtiradi va
# kelajakda shu nom bilan yangi ilova qo'shilsa muammo bo'ladi.
FORGET_SQL = "DELETE FROM django_migrations WHERE app = 'courses';"


class Migration(migrations.Migration):
    dependencies = [("core", "0003_trigram_search_indexes")]

    operations = [
        migrations.RunSQL(
            sql=DROP_SQL + "\n" + FORGET_SQL,
            # Orqaga qaytarish YO'Q: o'chirilgan kurs ma'lumotini SQL bilan
            # tiklab bo'lmaydi. Zaxira nusxadan tiklash kerak.
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
