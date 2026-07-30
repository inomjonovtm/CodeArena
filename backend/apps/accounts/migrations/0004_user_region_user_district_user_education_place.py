from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_user_followers_count_user_following_count_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="region",
            field=models.CharField(blank=True, db_index=True, help_text="Viloyat", max_length=64),
        ),
        migrations.AddField(
            model_name="user",
            name="district",
            field=models.CharField(blank=True, help_text="Tuman / shahar", max_length=64),
        ),
        migrations.AddField(
            model_name="user",
            name="education_place",
            field=models.CharField(blank=True, help_text="Ta'lim maskani", max_length=160),
        ),
    ]
