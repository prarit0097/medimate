from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Patient(TimeStampedModel):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        UNDISCLOSED = "undisclosed", "Undisclosed"

    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        HINDI = "hi", "Hindi"

    account = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_record",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_patients",
    )
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True)
    whatsapp_number = models.CharField(max_length=20, blank=True)
    preferred_language = models.CharField(
        max_length=10,
        choices=Language.choices,
        default=Language.ENGLISH,
    )
    timezone = models.CharField(max_length=64, default="Asia/Kolkata")
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=16,
        choices=Gender.choices,
        default=Gender.UNDISCLOSED,
    )
    conditions = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    voice_reminders_enabled = models.BooleanField(default=False)
    large_text_mode = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ("full_name",)

    def __str__(self):
        return self.full_name


class CaregiverRelationship(TimeStampedModel):
    class RelationshipType(models.TextChoices):
        CHILD = "child", "Child"
        SPOUSE = "spouse", "Spouse"
        SIBLING = "sibling", "Sibling"
        PARENT = "parent", "Parent"
        OTHER = "other", "Other"

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="caregiver_relationships",
    )
    caregiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="caregiver_relationships",
    )
    relationship_type = models.CharField(
        max_length=20,
        choices=RelationshipType.choices,
        default=RelationshipType.OTHER,
    )
    is_primary = models.BooleanField(default=False)
    receives_missed_dose_alerts = models.BooleanField(default=True)
    receives_refill_alerts = models.BooleanField(default=True)
    receives_weekly_summary = models.BooleanField(default=True)

    class Meta:
        ordering = ("-is_primary", "-created_at")
        constraints = [
            models.UniqueConstraint(
                fields=("patient", "caregiver"),
                name="unique_patient_caregiver_relationship",
            )
        ]

    def __str__(self):
        return f"{self.caregiver} -> {self.patient}"


class ProviderAccess(TimeStampedModel):
    class ProviderRole(models.TextChoices):
        DOCTOR = "doctor", "Doctor"
        PHARMACIST = "pharmacist", "Pharmacist"
        NURSE = "nurse", "Nurse"
        CARE_COORDINATOR = "care_coordinator", "Care Coordinator"

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="provider_relationships",
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_relationships",
    )
    provider_role = models.CharField(
        max_length=32,
        choices=ProviderRole.choices,
        default=ProviderRole.DOCTOR,
    )
    organization = models.CharField(max_length=255, blank=True)
    can_view_full_medication_list = models.BooleanField(default=True)
    can_manage_medications = models.BooleanField(default=False)

    class Meta:
        ordering = ("organization", "-created_at")
        constraints = [
            models.UniqueConstraint(
                fields=("patient", "provider", "provider_role"),
                name="unique_patient_provider_access",
            )
        ]

    def __str__(self):
        return f"{self.provider} -> {self.patient}"


class PrescriptionUpload(TimeStampedModel):
    class ReviewStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        REVIEWED = "reviewed", "Reviewed"
        NEEDS_CLARIFICATION = "needs_clarification", "Needs Clarification"

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_prescriptions",
    )
    image = models.FileField(upload_to="prescriptions/%Y/%m/%d/")
    status = models.CharField(
        max_length=32,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
    )
    ocr_text = models.TextField(blank=True)
    extracted_payload = models.JSONField(default=dict, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"Prescription {self.pk} for {self.patient}"


class Medication(TimeStampedModel):
    class MealRelation(models.TextChoices):
        BEFORE_MEAL = "before_meal", "Before Meal"
        AFTER_MEAL = "after_meal", "After Meal"
        WITH_MEAL = "with_meal", "With Meal"
        INDEPENDENT = "independent", "Independent"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="medications",
    )
    prescription = models.ForeignKey(
        PrescriptionUpload,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="medications",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_medications",
    )
    name = models.CharField(max_length=255)
    generic_name = models.CharField(max_length=255, blank=True)
    strength = models.CharField(max_length=64, blank=True)
    dosage_form = models.CharField(max_length=64, blank=True)
    route = models.CharField(max_length=64, blank=True)
    indication = models.CharField(max_length=255, blank=True)
    instructions = models.TextField(blank=True)
    meal_relation = models.CharField(
        max_length=20,
        choices=MealRelation.choices,
        default=MealRelation.INDEPENDENT,
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    total_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    current_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    low_stock_threshold_days = models.PositiveIntegerField(default=5)
    is_high_risk = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.name} ({self.patient})"


class MedicationReminder(TimeStampedModel):
    class RecurrenceType(models.TextChoices):
        DAILY = "daily", "Daily"
        SPECIFIC_DAYS = "specific_days", "Specific Days"
        WEEKLY = "weekly", "Weekly"
        ALTERNATE_DAYS = "alternate_days", "Alternate Days"
        PRN = "prn", "As Needed"

    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    label = models.CharField(max_length=100, blank=True)
    time_of_day = models.TimeField(null=True, blank=True)
    dose_quantity = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    recurrence_type = models.CharField(
        max_length=20,
        choices=RecurrenceType.choices,
        default=RecurrenceType.DAILY,
    )
    weekdays = models.JSONField(default=list, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("time_of_day", "created_at")

    def __str__(self):
        return f"{self.medication.name} @ {self.time_of_day or 'PRN'}"


class DoseLog(TimeStampedModel):
    class Status(models.TextChoices):
        TAKEN = "taken", "Taken"
        SKIPPED = "skipped", "Skipped"
        SNOOZED = "snoozed", "Snoozed"
        MISSED = "missed", "Missed"

    class Source(models.TextChoices):
        APP = "app", "App"
        WHATSAPP = "whatsapp", "WhatsApp"
        IVR = "ivr", "IVR"
        CAREGIVER = "caregiver", "Caregiver"
        PROVIDER = "provider", "Provider"
        SYSTEM = "system", "System"

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="dose_logs",
    )
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="dose_logs",
    )
    reminder = models.ForeignKey(
        MedicationReminder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dose_logs",
    )
    scheduled_for = models.DateTimeField()
    actioned_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TAKEN)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.APP)
    note = models.TextField(blank=True)
    logged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dose_logs",
    )

    class Meta:
        ordering = ("-scheduled_for",)

    def __str__(self):
        return f"{self.patient} {self.medication} {self.status}"
