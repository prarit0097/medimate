# Medimate

## Purpose

Medimate ek API-first medication adherence web platform hai. Iska main goal sirf reminder dena nahi, balki patient, caregiver aur provider ko ek shared system dena hai jisme:

- medicine schedule clearly define ho
- dose tracking ho
- refill risk samajh aaye
- caregiver ko visibility mile
- doctor ya pharmacist ko adherence summary mil sake

Yeh backend is tarah banaya gaya hai ki aaj web app use kare aur baad mein Flutter mobile app bhi same APIs consume kar sake.

## Why This Project Exists

Project isliye create kiya gaya hai kyunki chronic patients ko medicines regularly lena, samajhna, track karna, aur continue rakhna difficult hota hai. Family members aur providers ko bhi timely visibility nahi milti. Medimate ka focus hai:

- remember: dose miss na ho
- understand: medicine ka schedule clear ho
- continue: refill aur continuity maintain rahe
- stay safe: medication chaos kam ho

## Current Build Status

Current codebase ek Django + DRF backend scaffold hai jisme:

- JWT authentication
- custom email-based user model
- patient records
- caregiver relationships
- provider access relationships
- prescription upload model
- medication and reminder management
- dose logging
- adherence/refill dashboard summary
- OpenAPI schema and Swagger docs

## Who Uses the App

### Patient

- apna ya caregiver-created profile use karta hai
- medicines aur reminders dekh sakta hai
- dose taken, skipped, missed track ho sakti hai

### Caregiver

- parent ya dependent patient manage kar sakta hai
- patient record create kar sakta hai
- medication schedules maintain kar sakta hai
- dashboard summary dekh sakta hai

### Provider

- doctor, pharmacist, nurse ya care coordinator ke role mein patient visibility paa sakta hai
- adherence aur refill summary dekh sakta hai

### Admin

- Django admin aur full system control

## How the App Works Right Now

Typical flow:

1. User register karta hai aur JWT token leta hai.
2. Caregiver ya patient patient record create karta hai.
3. Medication add hoti hai.
4. Har medication ke liye reminders/time slots define hote hain.
5. Dose log create hota hai jab medicine taken, skipped, snoozed ya missed hoti hai.
6. Dashboard endpoint patient ke adherence score aur refill risk ka summary return karta hai.

## Tech Stack

- Python 3.10+
- Django 5.1.8
- Django REST Framework
- Simple JWT
- drf-spectacular
- django-filter
- django-cors-headers
- Pillow
- SQLite default database

## Run Commands

### First setup

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Useful development commands

```powershell
python manage.py check
python manage.py makemigrations
python manage.py migrate
python manage.py test
python manage.py runserver
```

### API documentation

- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- OpenAPI Schema: `http://127.0.0.1:8000/api/schema/`
- Health Check: `http://127.0.0.1:8000/api/health/`

## Environment Variables

Project `.env` file use karta hai. Current supported values:

- `DEBUG`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `CORS_ALLOW_ALL_ORIGINS`
- `DATABASE_URL`
- `TIME_ZONE`

## Main API Endpoints

### Auth

- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/token/refresh/`
- `GET /api/v1/auth/me/`

### Core care

- `GET|POST /api/v1/patients/`
- `GET|POST /api/v1/caregiver-links/`
- `GET|POST /api/v1/provider-access/`
- `GET|POST /api/v1/prescriptions/`
- `GET|POST /api/v1/medications/`
- `GET|POST /api/v1/dose-logs/`
- `GET /api/v1/dashboard/patients/<patient_id>/`

## File-by-File Project Map

### Root files

`/.env.example`
- sample environment configuration
- local development ke liye required env keys dikhata hai

`/.gitignore`
- virtualenv, db, media, cache aur local env files ko ignore karta hai

`/db.sqlite3`
- current local development database
- production database nahi hai

`/manage.py`
- Django command entry point
- isi file se `runserver`, `migrate`, `test`, `createsuperuser` jaise commands run hote hain

`/README.md`
- short project setup and overview document

`/requirements.txt`
- Python dependencies ki list

`/Medimate.md`
- master project documentation file
- har meaningful change ke baad update honi chahiye

`/agent.md`
- project workflow instructions file

### Config folder

`/config/__init__.py`
- Python package marker

`/config/asgi.py`
- ASGI entry point
- async-compatible deployment tools is file ko use karte hain

`/config/settings.py`
- core project settings
- installed apps define karta hai
- custom user model set karta hai
- DRF, JWT, CORS, media/static, env config define karta hai

Important settings inside `config/settings.py`:
- `INSTALLED_APPS`: Django apps plus `accounts`, `care`, `common`, DRF-related packages
- `MIDDLEWARE`: request/response middleware chain
- `DATABASES`: env-based database configuration
- `AUTH_USER_MODEL`: custom `accounts.User`
- `REST_FRAMEWORK`: authentication, filters, pagination, schema settings
- `SIMPLE_JWT`: token lifetime configuration
- `SPECTACULAR_SETTINGS`: API docs configuration

`/config/urls.py`
- complete URL router
- admin, health check, schema/docs, auth routes aur care routes ko wire karta hai

`/config/wsgi.py`
- WSGI entry point
- classic deployment servers is file ko use karte hain

### Common app

`/common/__init__.py`
- package marker

`/common/admin.py`
- currently empty/default admin module

`/common/apps.py`
- Django app config for `common`

`/common/models.py`
- reusable shared model base rakhta hai

Code inside `common/models.py`:
- `TimeStampedModel`: abstract base model
  - UUID primary key deta hai
  - `created_at` aur `updated_at` common timestamps deta hai
  - isse care app ke multiple models inherit karte hain

`/common/tests.py`
- health endpoint test karta hai

`/common/views.py`
- shared light utility views rakhta hai

Code inside `common/views.py`:
- `HealthCheckView`: `/api/health/` endpoint
  - service up hone ka simple JSON response deta hai

`/common/migrations/__init__.py`
- migrations package marker

### Accounts app

`/accounts/__init__.py`
- package marker

`/accounts/admin.py`
- custom user admin registration

Code inside `accounts/admin.py`:
- `MediMateUserAdmin`
  - Django admin mein custom fields dikhata hai
  - email-based user management support karta hai

`/accounts/apps.py`
- Django app config for `accounts`

`/accounts/managers.py`
- custom user manager define karta hai

Code inside `accounts/managers.py`:
- `UserManager`
  - email normalize karta hai
  - `create_user` aur `create_superuser` provide karta hai
  - email-based authentication model ko support karta hai

`/accounts/models.py`
- custom authentication user model

Code inside `accounts/models.py`:
- `User`
  - default username remove karta hai
  - email ko unique login identifier banata hai
  - `full_name`, `phone_number`, `role`, `preferred_language`, `timezone` fields rakhta hai
  - roles: patient, caregiver, doctor, pharmacist, admin

`/accounts/serializers.py`
- auth/user API payload format define karta hai

Code inside `accounts/serializers.py`:
- `UserSerializer`
  - user details read format deta hai
- `RegisterSerializer`
  - new user registration validation aur creation karta hai
- `MediMateTokenObtainPairSerializer`
  - login response mein JWT ke saath user data return karta hai
  - token claims mein role aur full name inject karta hai

`/accounts/tests.py`
- register, login aur `/me` endpoint ka integration test

`/accounts/urls.py`
- auth routes map karta hai

`/accounts/views.py`
- auth-related API views rakhta hai

Code inside `accounts/views.py`:
- `RegisterView`: new user create karta hai
- `LoginView`: JWT login endpoint
- `MeView`: current logged-in user details return karta hai

`/accounts/migrations/__init__.py`
- migrations package marker

`/accounts/migrations/0001_initial.py`
- custom `User` model ka initial database schema

### Care app

`/care/__init__.py`
- package marker

`/care/admin.py`
- care models ko Django admin mein register karta hai

`/care/apps.py`
- Django app config for `care`

`/care/models.py`
- product ka main domain model layer

Code inside `care/models.py`:
- `Patient`
  - patient profile information store karta hai
  - language, timezone, accessibility, notes, conditions fields rakhta hai
- `CaregiverRelationship`
  - caregiver ko patient se link karta hai
  - alert preferences rakhta hai
- `ProviderAccess`
  - doctor/pharmacist/nurse/care coordinator access track karta hai
- `PrescriptionUpload`
  - uploaded prescription image aur OCR/review related data rakhta hai
- `Medication`
  - medicine record store karta hai
  - stock, meal relation, high risk, status fields support karta hai
- `MedicationReminder`
  - medication ke time slots aur recurrence rules rakhta hai
- `DoseLog`
  - dose action history rakhta hai
  - source track karta hai: app, whatsapp, ivr, caregiver, provider, system

`/care/serializers.py`
- care models ke liye API input/output serializers

Code inside `care/serializers.py`:
- `PatientSerializer`
  - patient data format karta hai
  - patient ke sath adherence summary bhi return karta hai
- `CaregiverRelationshipSerializer`
  - caregiver link validation aur serialization
- `ProviderAccessSerializer`
  - provider link validation aur serialization
- `PrescriptionUploadSerializer`
  - prescription upload payload handle karta hai
- `MedicationReminderSerializer`
  - reminder schedule structure validate karta hai
- `MedicationSerializer`
  - medication create/update karta hai
  - nested reminders handle karta hai
  - refill estimate aur daily quantity expose karta hai
- `DoseLogSerializer`
  - dose log create/update validation karta hai
  - patient access aur reminder-medication consistency check karta hai

`/care/services.py`
- business logic helper functions

Code inside `care/services.py`:
- `accessible_patients_queryset`
  - current user kaunse patients ko access kar sakta hai, yeh decide karta hai
- `user_can_access_patient`
  - single patient access check helper
- `average_daily_quantity_for_reminder`
  - reminder recurrence ko average daily quantity mein convert karta hai
- `medication_daily_quantity`
  - active reminders ke basis par per-day medicine requirement nikalta hai
- `medication_estimated_refill_date`
  - current stock aur schedule se refill due date estimate karta hai
- `adherence_summary_for_patient`
  - patient ke recent dose logs se adherence score aur refill summary banata hai

`/care/tests.py`
- patient create, medication create aur dashboard summary flow test karta hai

`/care/urls.py`
- care app router
- all ViewSets aur patient dashboard endpoint expose karta hai

`/care/views.py`
- REST API endpoints implement karta hai

Code inside `care/views.py`:
- `PatientViewSet`
  - patient CRUD provide karta hai
- `CaregiverRelationshipViewSet`
  - caregiver link CRUD provide karta hai
- `ProviderAccessViewSet`
  - provider access CRUD provide karta hai
- `PrescriptionUploadViewSet`
  - prescription upload CRUD provide karta hai
- `MedicationViewSet`
  - medication CRUD aur nested reminder support provide karta hai
- `DoseLogViewSet`
  - dose log CRUD provide karta hai
- `PatientDashboardView`
  - patient summary response deta hai with dashboard metrics

`/care/migrations/__init__.py`
- migrations package marker

`/care/migrations/0001_initial.py`
- all initial care domain tables create karta hai

## Generated Files

`/__pycache__/...`
- Python bytecode cache files
- auto-generated hote hain
- manually edit nahi karne chahiye
- inka source equivalent `.py` files hote hain

## Current Testing Coverage

Abhi 3 basic tests hain:

- health check test
- auth register/login/me flow test
- patient/medication/dashboard integration test

## Current Limitations

Abhi project mein ye cheezein baaki hain:

- WhatsApp integration
- IVR integration
- prescription OCR processing pipeline
- Celery reminder scheduler
- strong role-based permission system
- frontend web UI
- Flutter app
- ABDM/ABHA integration

## Documentation Update Rule

Yeh file har code, file, architecture, command, API, workflow ya config change ke baad update honi chahiye. Koi bhi naya feature add ho, koi file add/remove ho, ya behavior change ho, to yahan reflect hona zaroori hai.

## Change Log

### 2026-03-30

- initial Medimate project documentation create ki gayi
- current Django API scaffold document kiya gaya
- file-by-file explanation add ki gayi
- run commands aur maintenance rule add kiye gaye
- `agent.md` workflow file reference add ki gayi
