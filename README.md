# MediMate

MediMate is an API-first medication adherence platform. This repository now contains:

- Django backend in the repo root
- Vite + React frontend in `frontend/`

## What is included

- JWT authentication with custom email-based user model
- Patient and caregiver-first data model
- Medication plans, reminder slots, prescription uploads, and dose logs
- Provider access records for doctor/pharmacist visibility
- Adherence and refill summary endpoint for dashboards
- OpenAPI schema and Swagger docs
- Integrated care-portal frontend workspace

## Stack

- Python 3.10+
- Django 5.1
- Django REST Framework
- Simple JWT
- drf-spectacular
- SQLite by default, Postgres-ready via `DATABASE_URL`
- React 18 + TypeScript + Vite + Tailwind CSS for the frontend

## Quick start

### Backend

```powershell
cd E:\coding\MediMate
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```powershell
cd E:\coding\MediMate\frontend
npm install
npm run dev
```

Frontend dev server: `http://127.0.0.1:8080`
Backend API/docs: `http://127.0.0.1:8000`

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

## Frontend note

The imported care portal is now part of this repo. Authentication plus the Patients list/create/detail flow are wired to the backend. Several other dashboard/detail screens still use temporary mock data while API migration continues.

## Suggested next build steps

1. Migrate frontend dashboard, patient, medication, prescription, and report screens from mock data to live APIs.
2. Add WhatsApp and IVR event ingestion endpoints.
3. Add OCR extraction workflow for `PrescriptionUpload`.
4. Split patient/caregiver/provider permissions into stronger role-based policies.
5. Add task scheduling with Celery + Redis for reminders and escalation.
6. Add ABDM/ABHA integration behind a dedicated interoperability app.
