# MediMate API

API-first Django backend for the MediMate medication adherence product. The backend is structured so the same APIs can power a web client now and a Flutter app later.

## What is included

- JWT authentication with custom email-based user model
- Patient and caregiver-first data model
- Medication plans, reminder slots, prescription uploads, and dose logs
- Provider access records for doctor/pharmacist visibility
- Adherence and refill summary endpoint for dashboards
- OpenAPI schema and Swagger docs

## Stack

- Python 3.10+
- Django 5.1
- Django REST Framework
- Simple JWT
- drf-spectacular
- SQLite by default, Postgres-ready via `DATABASE_URL`

## Quick start

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Main API routes

- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/token/refresh/`
- `GET /api/v1/auth/me/`
- `GET|POST /api/v1/patients/`
- `GET|POST /api/v1/caregiver-links/`
- `GET|POST /api/v1/provider-access/`
- `GET|POST /api/v1/prescriptions/`
- `GET|POST /api/v1/medications/`
- `GET|POST /api/v1/dose-logs/`
- `GET /api/v1/dashboard/patients/<patient_id>/`
- `GET /api/schema/`
- `GET /api/docs/`

## Product mapping

This scaffold is aligned to the MVP slice from the planning document:

- Patient records can exist with or without a direct login account.
- Caregivers can manage dependent patients.
- Medications support meal timing, refill thresholds, and multiple reminder times.
- Dose logs are channel-aware (`app`, `whatsapp`, `ivr`, `caregiver`, `provider`, `system`).
- Dashboard summaries expose adherence percentage and refill risk for provider-lite and caregiver views.

## Suggested next build steps

1. Add WhatsApp and IVR event ingestion endpoints.
2. Add OCR extraction workflow for `PrescriptionUpload`.
3. Split patient/caregiver/provider permissions into stronger role-based policies.
4. Add task scheduling with Celery + Redis for reminders and escalation.
5. Add ABDM/ABHA integration behind a dedicated interoperability app.

