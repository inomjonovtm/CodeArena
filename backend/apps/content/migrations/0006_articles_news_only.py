"""Blog bo'limi olib tashlandi — mavjud maqolalar yangilikka o'tkaziladi.

Ma'lumot o'chirilmaydi: eski blog yozuvlari admin paneldagi «Yangiliklar»
ro'yxatida ko'rinadi va u yerdan kerak bo'lsa qo'lda o'chiriladi.
"""
from django.db import migrations, models


def blog_to_news(apps, schema_editor):
    Article = apps.get_model("content", "Article")
    Article.objects.filter(kind="blog").update(kind="news")


def noop(apps, schema_editor):
    """Orqaga qaytishda tur o'zgarmaydi — qaysi maqola blog bo'lgani noma'lum."""


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0005_contactmessage"),
    ]

    operations = [
        migrations.RunPython(blog_to_news, noop),
        migrations.AlterField(
            model_name="article",
            name="kind",
            field=models.CharField(
                choices=[("news", "Yangilik")], db_index=True, default="news", max_length=8
            ),
        ),
    ]
