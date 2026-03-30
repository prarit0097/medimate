from __future__ import annotations

import json
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.utils import timezone

from care.models import (
    CaregiverRelationship,
    DoseLog,
    Medication,
    PrescriptionUpload,
    ProviderAccess,
)
from care.services import (
    accessible_patients_queryset,
    adherence_summary_for_patient,
    medication_estimated_refill_date,
)

SUPPORTED_SURFACES = (
    "general",
    "dashboard",
    "patients",
    "patient",
    "medications",
    "prescriptions",
    "dose_logs",
    "caregivers",
    "provider_access",
    "reports",
)


class AIConfigurationError(Exception):
    pass


class AIResponseError(Exception):
    pass


def ai_status():
    enabled = bool(settings.OPENAI_API_KEY)
    missing = []
    if not settings.OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")

    return {
        "enabled": enabled,
        "configured": enabled,
        "model": settings.OPENAI_MODEL,
        "missing_configuration": missing,
        "supported_surfaces": list(SUPPORTED_SURFACES),
        "note": (
            "Add the OpenAI API key to the server-side .env file. The key is never used in the browser."
        ),
    }


def generate_ai_assist_response(
    *,
    user,
    surface: str,
    question: str = "",
    patient_id=None,
    medication_id=None,
    prescription_id=None,
):
    if not settings.OPENAI_API_KEY:
        raise AIConfigurationError(
            "OpenAI is not configured yet. Add OPENAI_API_KEY to the server .env file."
        )

    context = build_assistant_context(
        user=user,
        surface=surface,
        patient_id=patient_id,
        medication_id=medication_id,
        prescription_id=prescription_id,
    )

    client = _get_openai_client()
    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        instructions=_system_instructions(user.preferred_language),
        input=_user_prompt(surface=surface, question=question, context=context),
        max_output_tokens=900,
        temperature=0.4,
        text={
            "format": {"type": "json_object"},
            "verbosity": "low",
        },
        user=str(user.id),
    )

    payload = _normalize_response_payload(_parse_response_json(response.output_text))
    payload["surface"] = surface
    payload["model"] = settings.OPENAI_MODEL
    payload["generated_at"] = timezone.now().isoformat()
    return payload


def build_assistant_context(
    *,
    user,
    surface: str,
    patient_id=None,
    medication_id=None,
    prescription_id=None,
):
    patients_qs = accessible_patients_queryset(user).select_related("account", "created_by")
    focus_patient = None
    focus_medication = None
    focus_prescription = None

    if patient_id:
        focus_patient = patients_qs.filter(pk=patient_id).first()
        if not focus_patient:
            raise PermissionDenied("You do not have access to this patient.")
        patients_qs = patients_qs.filter(pk=focus_patient.pk)

    if medication_id:
        focus_medication = (
            Medication.objects.filter(patient__in=patients_qs)
            .select_related("patient", "prescription")
            .prefetch_related("reminders")
            .filter(pk=medication_id)
            .first()
        )
        if not focus_medication:
            raise PermissionDenied("You do not have access to this medication.")
        focus_patient = focus_medication.patient
        patients_qs = patients_qs.filter(pk=focus_patient.pk)

    if prescription_id:
        focus_prescription = (
            PrescriptionUpload.objects.filter(patient__in=patients_qs)
            .select_related("patient", "uploaded_by")
            .filter(pk=prescription_id)
            .first()
        )
        if not focus_prescription:
            raise PermissionDenied("You do not have access to this prescription.")
        focus_patient = focus_prescription.patient
        patients_qs = patients_qs.filter(pk=focus_patient.pk)

    patients = list(patients_qs[:6])
    medication_qs = (
        Medication.objects.filter(patient__in=patients_qs)
        .select_related("patient", "prescription")
        .prefetch_related("reminders")
    )
    medications = list(medication_qs[:12])
    prescription_qs = (
        PrescriptionUpload.objects.filter(patient__in=patients_qs)
        .select_related("patient", "uploaded_by")
        .order_by("-created_at")
    )
    dose_log_qs = (
        DoseLog.objects.filter(patient__in=patients_qs)
        .select_related("patient", "medication", "reminder", "logged_by")
        .order_by("-scheduled_for")
    )
    caregiver_qs = (
        CaregiverRelationship.objects.filter(patient__in=patients_qs)
        .select_related("patient", "caregiver")
        .order_by("-is_primary", "-created_at")
    )
    provider_qs = (
        ProviderAccess.objects.filter(patient__in=patients_qs)
        .select_related("patient", "provider")
        .order_by("organization", "-created_at")
    )
    prescriptions = list(prescription_qs[:8])
    dose_logs = list(dose_log_qs[:14])
    caregivers = list(caregiver_qs[:10])
    providers = list(provider_qs[:10])

    active_medications = medication_qs.filter(status=Medication.Status.ACTIVE)
    refill_alerts = _collect_refill_alerts(active_medications)

    return {
        "surface": surface,
        "generated_at": timezone.now().isoformat(),
        "workspace": {
            "user": {
                "name": user.full_name,
                "email": user.email,
                "role": user.role,
                "preferred_language": user.preferred_language,
                "timezone": user.timezone,
            },
            "counts": {
                "patients": patients_qs.count(),
                "medications": medication_qs.count(),
                "active_medications": active_medications.count(),
                "prescriptions": prescription_qs.count(),
                "recent_dose_logs": dose_log_qs.count(),
                "caregivers": caregiver_qs.count(),
                "providers": provider_qs.count(),
                "refill_alerts": len(refill_alerts),
            },
        },
        "focus": {
            "patient": _serialize_patient(focus_patient) if focus_patient else None,
            "medication": _serialize_medication(focus_medication) if focus_medication else None,
            "prescription": (
                _serialize_prescription(focus_prescription) if focus_prescription else None
            ),
        },
        "patients": [_serialize_patient(patient) for patient in patients],
        "medications": [_serialize_medication(medication) for medication in medications],
        "prescriptions": [_serialize_prescription(prescription) for prescription in prescriptions],
        "recent_dose_activity": [_serialize_dose_log(log) for log in dose_logs],
        "caregivers": [_serialize_caregiver(link) for link in caregivers],
        "providers": [_serialize_provider(link) for link in providers],
        "refill_alerts": refill_alerts[:8],
    }


def _collect_refill_alerts(active_medications):
    alerts = []
    today = timezone.localdate()

    for medication in active_medications[:20]:
        refill_date = medication_estimated_refill_date(medication)
        if refill_date and refill_date <= today + timedelta(days=medication.low_stock_threshold_days):
            alerts.append(
                {
                    "medication_id": str(medication.pk),
                    "medication_name": medication.name,
                    "patient_name": medication.patient.full_name,
                    "current_quantity": str(medication.current_quantity),
                    "estimated_refill_date": refill_date.isoformat(),
                }
            )

    return alerts


def _get_openai_client():
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise AIConfigurationError(
            "The OpenAI Python SDK is not installed. Run pip install -r requirements.txt."
        ) from exc

    return OpenAI(api_key=settings.OPENAI_API_KEY)


def _system_instructions(preferred_language: str):
    language = "Hindi" if preferred_language == "hi" else "English"
    return (
        "You are MediMate AI, an in-product assistant for a medication adherence platform. "
        "Use only the provided app context. Be clinically cautious, operationally useful, and concise. "
        "Do not diagnose, do not suggest changing prescriptions, and do not pretend missing data exists. "
        "If risk is serious, advise contacting a clinician. "
        f"Write the answer in {language}. "
        "Return a JSON object with keys: title, summary, highlights, actions, warnings, disclaimer. "
        "Use short strings. highlights, actions, and warnings must be arrays."
    )


def _user_prompt(*, surface: str, question: str, context: dict):
    resolved_question = question.strip() or _default_question(surface)
    return (
        f"Surface: {surface}\n"
        f"User question: {resolved_question}\n"
        "Context JSON:\n"
        f"{json.dumps(context, default=str)}"
    )


def _default_question(surface: str):
    defaults = {
        "general": "What needs attention across this MediMate workspace right now?",
        "dashboard": "Summarize today's risks, adherence issues, and next actions.",
        "patients": "Which patients need follow-up first and why?",
        "patient": "Summarize this patient's medication adherence and care priorities.",
        "medications": "Review the medication plan and identify refill or safety concerns.",
        "prescriptions": "Summarize prescription review priorities and missing information.",
        "dose_logs": "Explain recent adherence patterns from the dose logs.",
        "caregivers": "Review caregiver coverage and communication priorities.",
        "provider_access": "Review provider access setup and coordination gaps.",
        "reports": "Write an executive summary of the current adherence reports.",
    }
    return defaults.get(surface, defaults["general"])


def _normalize_response_payload(payload: dict):
    def normalize_list(value):
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    return {
        "title": str(payload.get("title") or "MediMate AI Insight").strip(),
        "summary": str(payload.get("summary") or "").strip(),
        "highlights": normalize_list(payload.get("highlights")),
        "actions": normalize_list(payload.get("actions")),
        "warnings": normalize_list(payload.get("warnings")),
        "disclaimer": str(
            payload.get("disclaimer")
            or "AI guidance supports workflow review and does not replace clinical judgment."
        ).strip(),
    }


def _parse_response_json(output_text: str):
    if not output_text or not output_text.strip():
        raise AIResponseError("OpenAI returned an empty response.")

    try:
        return json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise AIResponseError("OpenAI returned invalid JSON for the assistant response.") from exc


def _serialize_patient(patient):
    if not patient:
        return None

    return {
        "id": str(patient.pk),
        "full_name": patient.full_name,
        "phone_number": patient.phone_number,
        "whatsapp_number": patient.whatsapp_number,
        "preferred_language": patient.preferred_language,
        "timezone": patient.timezone,
        "conditions": _split_text(patient.conditions),
        "notes": _short_text(patient.notes),
        "voice_reminders_enabled": patient.voice_reminders_enabled,
        "large_text_mode": patient.large_text_mode,
        "active": patient.active,
        "adherence_summary": adherence_summary_for_patient(patient, days=30),
    }


def _serialize_medication(medication):
    if not medication:
        return None

    refill_date = medication_estimated_refill_date(medication)
    reminders = list(medication.reminders.filter(is_active=True))
    return {
        "id": str(medication.pk),
        "patient_id": str(medication.patient_id),
        "patient_name": medication.patient.full_name,
        "name": medication.name,
        "generic_name": medication.generic_name,
        "strength": medication.strength,
        "dosage_form": medication.dosage_form,
        "route": medication.route,
        "indication": medication.indication,
        "instructions": _short_text(medication.instructions),
        "meal_relation": medication.meal_relation,
        "status": medication.status,
        "is_high_risk": medication.is_high_risk,
        "current_quantity": str(medication.current_quantity),
        "total_quantity": str(medication.total_quantity),
        "low_stock_threshold_days": medication.low_stock_threshold_days,
        "estimated_refill_date": refill_date.isoformat() if refill_date else None,
        "reminders": [
            {
                "label": reminder.label,
                "time_of_day": reminder.time_of_day.isoformat() if reminder.time_of_day else None,
                "dose_quantity": str(reminder.dose_quantity),
                "recurrence_type": reminder.recurrence_type,
                "weekdays": reminder.weekdays,
                "notes": reminder.notes,
            }
            for reminder in reminders[:4]
        ],
    }


def _serialize_prescription(prescription):
    if not prescription:
        return None

    return {
        "id": str(prescription.pk),
        "patient_id": str(prescription.patient_id),
        "patient_name": prescription.patient.full_name,
        "uploaded_by": prescription.uploaded_by.full_name,
        "status": prescription.status,
        "image_name": prescription.image.name,
        "ocr_text_excerpt": _short_text(prescription.ocr_text, 500),
        "extracted_payload": prescription.extracted_payload,
        "review_notes": _short_text(prescription.review_notes, 400),
        "created_at": prescription.created_at.isoformat(),
    }


def _serialize_dose_log(log):
    return {
        "id": str(log.pk),
        "patient_name": log.patient.full_name,
        "medication_name": log.medication.name,
        "status": log.status,
        "source": log.source,
        "scheduled_for": log.scheduled_for.isoformat(),
        "actioned_at": log.actioned_at.isoformat() if log.actioned_at else None,
        "note": _short_text(log.note, 280),
    }


def _serialize_caregiver(link):
    return {
        "id": str(link.pk),
        "patient_name": link.patient.full_name,
        "caregiver_name": link.caregiver.full_name,
        "caregiver_email": link.caregiver.email,
        "relationship_type": link.relationship_type,
        "is_primary": link.is_primary,
        "receives_missed_dose_alerts": link.receives_missed_dose_alerts,
        "receives_refill_alerts": link.receives_refill_alerts,
        "receives_weekly_summary": link.receives_weekly_summary,
    }


def _serialize_provider(link):
    return {
        "id": str(link.pk),
        "patient_name": link.patient.full_name,
        "provider_name": link.provider.full_name,
        "provider_email": link.provider.email,
        "provider_role": link.provider_role,
        "organization": link.organization,
        "can_view_full_medication_list": link.can_view_full_medication_list,
        "can_manage_medications": link.can_manage_medications,
    }


def _split_text(value: str):
    if not value:
        return []

    normalized = value.replace("\r", "\n")
    parts = []
    for raw in normalized.replace(",", "\n").split("\n"):
        item = raw.strip()
        if item:
            parts.append(item)
    return parts[:8]


def _short_text(value: str, limit: int = 300):
    value = (value or "").strip()
    if len(value) <= limit:
        return value
    return f"{value[:limit].rstrip()}..."
