from __future__ import annotations

import base64
import json
import mimetypes
import re
from datetime import datetime

from django.conf import settings
from django.utils import timezone

from .models import Medication, MedicationReminder, PrescriptionUpload


class PrescriptionAIError(Exception):
    pass


class PrescriptionAIConfigurationError(PrescriptionAIError):
    pass


class PrescriptionAIResponseError(PrescriptionAIError):
    pass


def extract_prescription_with_ai(prescription: PrescriptionUpload):
    if not settings.OPENAI_API_KEY:
        raise PrescriptionAIConfigurationError(
            "OpenAI is not configured yet. Add OPENAI_API_KEY to the server .env file."
        )

    content = _build_file_content(prescription)
    client = _get_openai_client()
    response = _create_ai_response(
        client=client,
        model=settings.OPENAI_VISION_MODEL,
        instructions=_extraction_instructions(),
        input=[
            {
                "role": "user",
                "content": content,
            }
        ],
        max_output_tokens=1800,
        text={
            "format": {"type": "json_object"},
            "verbosity": "low",
        },
    )

    normalized = _normalize_extraction_payload(_parse_json(response.output_text))
    prescription.ocr_text = normalized["ocr_text"]
    prescription.extracted_payload = {
        "summary": normalized["summary"],
        "confidence": normalized["confidence"],
        "needs_clarification": normalized["needs_clarification"],
        "clarifications": normalized["clarifications"],
        "medications": normalized["medications"],
    }
    prescription.review_notes = _build_review_notes(
        existing_notes=prescription.review_notes,
        summary=normalized["summary"],
        clarifications=normalized["clarifications"],
    )
    prescription.status = (
        PrescriptionUpload.ReviewStatus.NEEDS_CLARIFICATION
        if normalized["needs_clarification"]
        else PrescriptionUpload.ReviewStatus.REVIEWED
    )
    prescription.save(
        update_fields=[
            "ocr_text",
            "extracted_payload",
            "review_notes",
            "status",
            "updated_at",
        ]
    )
    return prescription


def create_medications_from_extraction(prescription: PrescriptionUpload, user):
    payload = prescription.extracted_payload or {}
    medications = payload.get("medications") or []
    if not medications:
        raise PrescriptionAIError(
            "Run AI extraction first. No medication drafts were found on this prescription."
        )

    created_ids = []
    skipped_count = 0
    for item in medications:
        name = str(item.get("name") or "").strip()
        strength = str(item.get("strength") or "").strip()
        if not name:
            skipped_count += 1
            continue

        existing = Medication.objects.filter(
            patient=prescription.patient,
            prescription=prescription,
            name__iexact=name,
            strength=strength,
        ).first()
        if existing:
            skipped_count += 1
            continue

        medication = Medication.objects.create(
            patient=prescription.patient,
            prescription=prescription,
            created_by=user,
            name=name,
            generic_name=str(item.get("generic_name") or "").strip(),
            strength=strength,
            dosage_form=str(item.get("dosage_form") or "").strip(),
            route=str(item.get("route") or "").strip(),
            indication=str(item.get("indication") or "").strip(),
            instructions=str(item.get("instructions") or "").strip(),
            meal_relation=_normalize_meal_relation(item.get("meal_relation")),
            start_date=timezone.localdate(),
            total_quantity="0",
            current_quantity="0",
            low_stock_threshold_days=5,
            is_high_risk=bool(item.get("is_high_risk")),
            status=Medication.Status.ACTIVE,
        )
        created_ids.append(str(medication.pk))

        for reminder in item.get("reminders") or []:
            MedicationReminder.objects.create(
                medication=medication,
                label=str(reminder.get("label") or "").strip(),
                time_of_day=_parse_time_of_day(reminder.get("time_of_day")),
                dose_quantity=str(reminder.get("dose_quantity") or "1").strip() or "1",
                recurrence_type=_normalize_recurrence_type(reminder.get("recurrence_type")),
                weekdays=_normalize_weekdays(reminder.get("weekdays")),
                notes=str(reminder.get("notes") or "").strip(),
                is_active=True,
            )

    return {
        "created_count": len(created_ids),
        "skipped_count": skipped_count,
        "created_medication_ids": created_ids,
    }


def _get_openai_client():
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise PrescriptionAIConfigurationError(
            "The OpenAI Python SDK is not installed. Run pip install -r requirements.txt."
        ) from exc

    return OpenAI(api_key=settings.OPENAI_API_KEY)


def _create_ai_response(*, client, **kwargs):
    try:
        return client.responses.create(**kwargs)
    except Exception as exc:
        if exc.__class__.__module__.startswith("openai"):
            raise PrescriptionAIResponseError(f"OpenAI request failed: {exc}") from exc
        raise


def _build_file_content(prescription: PrescriptionUpload):
    content_type = _guess_content_type(prescription)
    with prescription.image.open("rb") as file_handle:
        encoded = base64.b64encode(file_handle.read()).decode("utf-8")

    prompt = (
        "Extract the prescription content. Return valid JSON only with keys: "
        "ocr_text, summary, confidence, needs_clarification, clarifications, medications. "
        "confidence must be one of high, medium, low. "
        "medications must be an array. For each medication include: "
        "name, generic_name, strength, dosage_form, route, indication, instructions, "
        "meal_relation (before_meal, after_meal, with_meal, independent), "
        "is_high_risk, reminders. "
        "Each reminder should include: label, time_of_day (HH:MM or HH:MM:SS or null), "
        "dose_quantity, recurrence_type (daily, specific_days, weekly, alternate_days, prn), "
        "weekdays (0-6 array), notes. "
        "Return raw JSON only with no markdown fences or extra prose. "
        "If a field is unclear, use an empty string, null, or empty array. "
        "Do not invent medications that are not visible in the document."
    )

    if content_type == "application/pdf":
        return [
            {"type": "input_text", "text": prompt},
            {
                "type": "input_file",
                "filename": prescription.image.name.rsplit("/", 1)[-1],
                "file_data": encoded,
            },
        ]

    if content_type.startswith("image/"):
        return [
            {"type": "input_text", "text": prompt},
            {
                "type": "input_image",
                "image_url": f"data:{content_type};base64,{encoded}",
            },
        ]

    raise PrescriptionAIError(
        "Only PDF, JPG, JPEG, PNG, WEBP, and other standard image uploads are supported for AI extraction."
    )


def _guess_content_type(prescription: PrescriptionUpload):
    content_type = mimetypes.guess_type(prescription.image.name)[0]
    if content_type:
        return content_type
    return "application/octet-stream"


def _extraction_instructions():
    return (
        "You extract medication data from prescription documents for a care-management web app. "
        "Be conservative. Preserve the raw readable text in ocr_text. "
        "If instructions or medicine names are unclear, set needs_clarification=true and explain the issue in clarifications. "
        "Do not recommend treatment changes."
    )


def _parse_json(output_text: str):
    if not output_text or not output_text.strip():
        raise PrescriptionAIError("OpenAI returned an empty extraction response.")

    try:
        return json.loads(output_text)
    except json.JSONDecodeError as exc:
        extracted = _extract_json_object(output_text)
        if extracted is not None:
            try:
                return json.loads(extracted)
            except json.JSONDecodeError:
                pass
        raise PrescriptionAIError("OpenAI returned invalid JSON for prescription extraction.") from exc


def _extract_json_object(output_text: str):
    fenced_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", output_text, re.DOTALL)
    if fenced_match:
        return fenced_match.group(1).strip()

    start = output_text.find("{")
    end = output_text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    return output_text[start : end + 1].strip()


def _normalize_extraction_payload(payload: dict):
    medications = []
    for raw_medication in payload.get("medications") or []:
        name = str(raw_medication.get("name") or "").strip()
        if not name:
            continue
        medications.append(
            {
                "name": name,
                "generic_name": str(raw_medication.get("generic_name") or "").strip(),
                "strength": str(raw_medication.get("strength") or "").strip(),
                "dosage_form": str(raw_medication.get("dosage_form") or "").strip(),
                "route": str(raw_medication.get("route") or "").strip(),
                "indication": str(raw_medication.get("indication") or "").strip(),
                "instructions": str(raw_medication.get("instructions") or "").strip(),
                "meal_relation": _normalize_meal_relation(raw_medication.get("meal_relation")),
                "is_high_risk": bool(raw_medication.get("is_high_risk")),
                "reminders": _normalize_reminders(raw_medication.get("reminders")),
            }
        )

    clarifications = [
        str(item).strip()
        for item in (payload.get("clarifications") or [])
        if str(item).strip()
    ]
    needs_clarification = bool(payload.get("needs_clarification")) or not medications
    if not medications and not clarifications:
        clarifications.append("No medication entries could be confidently extracted.")

    confidence = str(payload.get("confidence") or "low").strip().lower()
    if confidence not in {"high", "medium", "low"}:
        confidence = "low"

    return {
        "ocr_text": str(payload.get("ocr_text") or "").strip(),
        "summary": str(payload.get("summary") or "").strip()
        or "AI extraction completed for this prescription.",
        "confidence": confidence,
        "needs_clarification": needs_clarification,
        "clarifications": clarifications,
        "medications": medications,
    }


def _normalize_reminders(reminders):
    normalized = []
    for raw_reminder in reminders or []:
        recurrence_type = _normalize_recurrence_type(raw_reminder.get("recurrence_type"))
        normalized.append(
            {
                "label": str(raw_reminder.get("label") or "").strip(),
                "time_of_day": _normalize_time_string(raw_reminder.get("time_of_day")),
                "dose_quantity": str(raw_reminder.get("dose_quantity") or "1").strip() or "1",
                "recurrence_type": recurrence_type,
                "weekdays": _normalize_weekdays(raw_reminder.get("weekdays")),
                "notes": str(raw_reminder.get("notes") or "").strip(),
            }
        )
    return normalized


def _normalize_meal_relation(value):
    normalized = str(value or "").strip().lower()
    mapping = {
        "before_meal": Medication.MealRelation.BEFORE_MEAL,
        "before meal": Medication.MealRelation.BEFORE_MEAL,
        "after_meal": Medication.MealRelation.AFTER_MEAL,
        "after meal": Medication.MealRelation.AFTER_MEAL,
        "with_meal": Medication.MealRelation.WITH_MEAL,
        "with meal": Medication.MealRelation.WITH_MEAL,
        "independent": Medication.MealRelation.INDEPENDENT,
        "anytime": Medication.MealRelation.INDEPENDENT,
        "none": Medication.MealRelation.INDEPENDENT,
    }
    return mapping.get(normalized, Medication.MealRelation.INDEPENDENT)


def _normalize_recurrence_type(value):
    normalized = str(value or "").strip().lower()
    mapping = {
        "daily": MedicationReminder.RecurrenceType.DAILY,
        "specific_days": MedicationReminder.RecurrenceType.SPECIFIC_DAYS,
        "specific days": MedicationReminder.RecurrenceType.SPECIFIC_DAYS,
        "weekly": MedicationReminder.RecurrenceType.WEEKLY,
        "alternate_days": MedicationReminder.RecurrenceType.ALTERNATE_DAYS,
        "alternate days": MedicationReminder.RecurrenceType.ALTERNATE_DAYS,
        "prn": MedicationReminder.RecurrenceType.PRN,
        "as needed": MedicationReminder.RecurrenceType.PRN,
    }
    return mapping.get(normalized, MedicationReminder.RecurrenceType.DAILY)


def _normalize_weekdays(value):
    weekdays = []
    for day in value or []:
        try:
            parsed = int(day)
        except (TypeError, ValueError):
            continue
        if parsed in [0, 1, 2, 3, 4, 5, 6]:
            weekdays.append(parsed)
    return weekdays


def _normalize_time_string(value):
    parsed = _parse_time_of_day(value)
    return parsed.isoformat() if parsed else None


def _parse_time_of_day(value):
    if value in (None, "", "null"):
        return None

    text = str(value).strip()
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(text, fmt).time()
        except ValueError:
            continue
    return None


def _build_review_notes(*, existing_notes: str, summary: str, clarifications: list[str]):
    manual_notes = _manual_review_notes(existing_notes)
    sections = []
    if manual_notes:
        sections.append(f"User notes: {manual_notes}")
    sections.append(f"AI summary: {summary}")
    if clarifications:
        sections.append(f"AI clarification: {'; '.join(clarifications)}")
    return "\n\n".join(sections)


def _manual_review_notes(existing_notes: str):
    lines = []
    for raw_line in (existing_notes or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("AI summary:") or line.startswith("AI clarification:"):
            continue
        if line.startswith("User notes:"):
            line = line.replace("User notes:", "", 1).strip()
        if line:
            lines.append(line)
    return "\n".join(lines).strip()
