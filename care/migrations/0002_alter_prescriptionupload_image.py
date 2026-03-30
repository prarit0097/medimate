from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("care", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="prescriptionupload",
            name="image",
            field=models.FileField(upload_to="prescriptions/%Y/%m/%d/"),
        ),
    ]
