from django.utils import timezone
from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import (
    CaregiverRelationship,
    DoseLog,
    Medication,
    MedicationReminder,
    Patient,
    PrescriptionUpload,
    ProviderAccess,
)
from .services import (
    adherence_summary_for_patient,
    medication_daily_quantity,
    medication_estimated_refill_date,
    user_can_access_patient,
)


class PatientSerializer(serializers.ModelSerializer):
    account_email = serializers.EmailField(source="account.email", read_only=True)
    created_by_detail = UserSerializer(source="created_by", read_only=True)
    adherence_summary = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = (
            "id",
            "account",
            "account_email",
            "created_by",
            "created_by_detail",
            "full_name",
            "phone_number",
            "whatsapp_number",
            "preferred_language",
            "timezone",
            "date_of_birth",
            "gender",
            "conditions",
            "notes",
            "voice_reminders_enabled",
            "large_text_mode",
            "active",
            "adherence_summary",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by",
            "created_by_detail",
            "account_email",
            "adherence_summary",
            "created_at",
            "updated_at",
        )

    def get_adherence_summary(self, obj):
        return adherence_summary_for_patient(obj, days=30)

    def validate_account(self, value):
        request = self.context["request"]
        if value and value != request.user and not request.user.is_staff:
            raise serializers.ValidationError(
                "You can only link your own account to a patient in this build."
            )
        return value


class CaregiverRelationshipSerializer(serializers.ModelSerializer):
    caregiver_detail = UserSerializer(source="caregiver", read_only=True)

    class Meta:
        model = CaregiverRelationship
        fields = (
            "id",
            "patient",
            "caregiver",
            "caregiver_detail",
            "relationship_type",
            "is_primary",
            "receives_missed_dose_alerts",
            "receives_refill_alerts",
            "receives_weekly_summary",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "caregiver_detail")

    def validate_patient(self, value):
        if not user_can_access_patient(self.context["request"].user, value):
            raise serializers.ValidationError("You do not have access to this patient.")
        return value


class ProviderAccessSerializer(serializers.ModelSerializer):
    provider_detail = UserSerializer(source="provider", read_only=True)

    class Meta:
        model = ProviderAccess
        fields = (
            "id",
            "patient",
            "provider",
            "provider_detail",
            "provider_role",
            "organization",
            "can_view_full_medication_list",
            "can_manage_medications",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "provider_detail")

    def validate_patient(self, value):
        if not user_can_access_patient(self.context["request"].user, value):
            raise serializers.ValidationError("You do not have access to this patient.")
        return value


class PrescriptionUploadSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserSerializer(source="uploaded_by", read_only=True)

    class Meta:
        model = PrescriptionUpload
        fields = (
            "id",
            "patient",
            "uploaded_by",
            "uploaded_by_detail",
            "image",
            "status",
            "ocr_text",
            "extracted_payload",
            "review_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "uploaded_by",
            "uploaded_by_detail",
            "created_at",
            "updated_at",
        )

    def validate_patient(self, value):
        if not user_can_access_patient(self.context["request"].user, value):
            raise serializers.ValidationError("You do not have access to this patient.")
        return value


class MedicationReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationReminder
        fields = (
            "id",
            "label",
            "time_of_day",
            "dose_quantity",
            "recurrence_type",
            "weekdays",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_weekdays(self, value):
        for day in value:
            if day not in [0, 1, 2, 3, 4, 5, 6]:
                raise serializers.ValidationError("Weekdays must use 0-6 for Monday-Sunday.")
        return value


class MedicationSerializer(serializers.ModelSerializer):
    reminders = MedicationReminderSerializer(many=True, required=False)
    daily_required_quantity = serializers.SerializerMethodField()
    estimated_refill_date = serializers.SerializerMethodField()

    class Meta:
        model = Medication
        fields = (
            "id",
            "patient",
            "prescription",
            "created_by",
            "name",
            "generic_name",
            "strength",
            "dosage_form",
            "route",
            "indication",
            "instructions",
            "meal_relation",
            "start_date",
            "end_date",
            "total_quantity",
            "current_quantity",
            "low_stock_threshold_days",
            "is_high_risk",
            "status",
            "reminders",
            "daily_required_quantity",
            "estimated_refill_date",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by",
            "daily_required_quantity",
            "estimated_refill_date",
            "created_at",
            "updated_at",
        )

    def get_daily_required_quantity(self, obj):
        return medication_daily_quantity(obj)

    def get_estimated_refill_date(self, obj):
        refill_date = medication_estimated_refill_date(obj)
        return refill_date.isoformat() if refill_date else None

    def validate_patient(self, value):
        if not user_can_access_patient(self.context["request"].user, value):
            raise serializers.ValidationError("You do not have access to this patient.")
        return value

    def validate(self, attrs):
        patient = attrs.get("patient") or getattr(self.instance, "patient", None)
        prescription = attrs.get("prescription") or getattr(self.instance, "prescription", None)
        if prescription and patient and prescription.patient_id != patient.id:
            raise serializers.ValidationError(
                {"prescription": "Prescription must belong to the same patient."}
            )
        return attrs

    def create(self, validated_data):
        reminders = validated_data.pop("reminders", [])
        medication = Medication.objects.create(**validated_data)
        for reminder_data in reminders:
            MedicationReminder.objects.create(medication=medication, **reminder_data)
        return medication

    def update(self, instance, validated_data):
        reminders = validated_data.pop("reminders", None)
        instance = super().update(instance, validated_data)
        if reminders is not None:
            instance.reminders.all().delete()
            for reminder_data in reminders:
                MedicationReminder.objects.create(medication=instance, **reminder_data)
        return instance


class DoseLogSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = DoseLog
        fields = (
            "id",
            "patient",
            "medication",
            "reminder",
            "scheduled_for",
            "actioned_at",
            "status",
            "source",
            "note",
            "logged_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "patient", "logged_by", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context["request"]
        medication = attrs.get("medication") or getattr(self.instance, "medication", None)
        reminder = attrs.get("reminder") or getattr(self.instance, "reminder", None)

        if medication and not user_can_access_patient(request.user, medication.patient):
            raise serializers.ValidationError("You do not have access to this medication.")

        if reminder and medication and reminder.medication_id != medication.id:
            raise serializers.ValidationError(
                {"reminder": "Reminder must belong to the selected medication."}
            )

        return attrs

    def create(self, validated_data):
        medication = validated_data["medication"]
        if not validated_data.get("actioned_at") and validated_data["status"] != DoseLog.Status.MISSED:
            validated_data["actioned_at"] = timezone.now()
        return DoseLog.objects.create(
            patient=medication.patient,
            logged_by=self.context["request"].user,
            **validated_data,
        )

