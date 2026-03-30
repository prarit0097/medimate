import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "patient", "Patient"
        CAREGIVER = "caregiver", "Caregiver"
        DOCTOR = "doctor", "Doctor"
        PHARMACIST = "pharmacist", "Pharmacist"
        ADMIN = "admin", "Admin"

    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        HINDI = "hi", "Hindi"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    first_name = None
    last_name = None

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)
    preferred_language = models.CharField(
        max_length=10,
        choices=Language.choices,
        default=Language.ENGLISH,
    )
    timezone = models.CharField(max_length=64, default="Asia/Kolkata")
    is_phone_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} <{self.email}>"
