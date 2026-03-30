from datetime import timedelta
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

from .models import DoseLog, Medication, MedicationReminder, Patient

ZERO = Decimal("0")


def accessible_patients_queryset(user):
    if not user.is_authenticated:
        return Patient.objects.none()

    if user.is_superuser or user.is_staff:
        return Patient.objects.all()

    return (
        Patient.objects.filter(
            Q(account=user)
            | Q(created_by=user)
            | Q(caregiver_relationships__caregiver=user)
            | Q(provider_relationships__provider=user)
        )
        .distinct()
    )


def user_can_access_patient(user, patient):
    return accessible_patients_queryset(user).filter(pk=patient.pk).exists()


def average_daily_quantity_for_reminder(reminder):
    dose = reminder.dose_quantity or ZERO

    if reminder.recurrence_type == MedicationReminder.RecurrenceType.DAILY:
        return dose
    if reminder.recurrence_type == MedicationReminder.RecurrenceType.SPECIFIC_DAYS:
        weekday_count = len(reminder.weekdays or [])
        return (dose * Decimal(weekday_count)) / Decimal("7")
    if reminder.recurrence_type == MedicationReminder.RecurrenceType.WEEKLY:
        return dose / Decimal("7")
    if reminder.recurrence_type == MedicationReminder.RecurrenceType.ALTERNATE_DAYS:
        return dose / Decimal("2")
    return ZERO


def medication_daily_quantity(medication):
    total = ZERO
    for reminder in medication.reminders.filter(is_active=True):
        total += average_daily_quantity_for_reminder(reminder)
    return total.quantize(Decimal("0.01"))


def medication_estimated_refill_date(medication):
    daily_quantity = medication_daily_quantity(medication)
    if daily_quantity <= ZERO or medication.current_quantity <= ZERO:
        return None

    remaining_days = int(medication.current_quantity / daily_quantity)
    return timezone.localdate() + timedelta(days=remaining_days)


def adherence_summary_for_patient(patient, days=30):
    window_start = timezone.now() - timedelta(days=days)
    logs = patient.dose_logs.filter(scheduled_for__gte=window_start)
    actionable_logs = logs.exclude(status=DoseLog.Status.SNOOZED)
    total_actionable = actionable_logs.count()
    taken_count = actionable_logs.filter(status=DoseLog.Status.TAKEN).count()
    missed_count = actionable_logs.filter(
        status__in=[DoseLog.Status.MISSED, DoseLog.Status.SKIPPED]
    ).count()

    adherence_score = None
    if total_actionable:
        adherence_score = round((taken_count / total_actionable) * 100, 1)

    refill_due = []
    today = timezone.localdate()
    active_medications = patient.medications.filter(status=Medication.Status.ACTIVE).prefetch_related(
        "reminders"
    )
    for medication in active_medications:
        refill_date = medication_estimated_refill_date(medication)
        if refill_date and refill_date <= today + timedelta(days=medication.low_stock_threshold_days):
            refill_due.append(
                {
                    "medication_id": str(medication.pk),
                    "name": medication.name,
                    "estimated_refill_date": refill_date.isoformat(),
                }
            )

    return {
        "window_days": days,
        "adherence_score": adherence_score,
        "taken_count": taken_count,
        "missed_count": missed_count,
        "total_actionable_doses": total_actionable,
        "active_medications": active_medications.count(),
        "refill_due": refill_due,
    }

