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

- root landing page at `/`
- integrated `frontend/` Vite + React care portal workspace
- server-side OpenAI configuration support via `.env`
- OpenAI-backed AI assistant endpoints
- AI prescription extraction and medication draft creation flow
- JWT authentication
- profile update, password change, and user-directory auth endpoints
- custom email-based user model
- patient records
- caregiver relationships
- provider access relationships
- prescription upload model
- medication and reminder management
- dose logging
- adherence/refill dashboard summary
- OpenAPI schema and Swagger docs
- frontend auth wiring to backend
- frontend patients list, add-patient flow, and patient detail wired to backend
- frontend medications, prescriptions, dose logs, caregivers, provider access, reports, and settings screens wired to backend
- frontend dashboard page bhi live backend aggregates aur actions se wired hai
- top-bar global MediMate AI assistant
- dashboard, patients, patient detail, medications, prescriptions, dose logs, caregivers, provider access, reports, aur settings par page-aware AI actions

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
7. User kisi bhi major page se MediMate AI ko open karke context-aware summary, action plan, ya follow-up guidance generate kar sakta hai.

## Tech Stack

- Python 3.10+
- Django 5.1.8
- Django REST Framework
- Simple JWT
- drf-spectacular
- django-filter
- django-cors-headers
- Pillow
- OpenAI Python SDK
- SQLite default database
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query

## Run Commands

### First setup

```powershell
cd E:\coding\MediMate
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
# optional but recommended for AI features: OPENAI_API_KEY add karo
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py createsuperuser
.\.venv\Scripts\python manage.py runserver
```

### Useful development commands

```powershell
cd E:\coding\MediMate
.\.venv\Scripts\python manage.py check
.\.venv\Scripts\python manage.py makemigrations
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py test
.\.venv\Scripts\python manage.py runserver
```

### Frontend setup

```powershell
cd E:\coding\MediMate\frontend
npm install
npm run dev
```

### API documentation

- Landing page: `http://127.0.0.1:8000/`
- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- OpenAPI Schema: `http://127.0.0.1:8000/api/schema/`
- Health Check: `http://127.0.0.1:8000/api/health/`
- Frontend dev app: `http://127.0.0.1:8080/`

## Environment Variables

Project `.env` file use karta hai. Current supported values:

- `DEBUG`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `CORS_ALLOW_ALL_ORIGINS`
- `DATABASE_URL`
- `TIME_ZONE`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_VISION_MODEL`

## Main API Endpoints

### Auth

- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/token/refresh/`
- `GET /api/v1/auth/me/`
- `PATCH /api/v1/auth/me/`
- `GET /api/v1/auth/users/`
- `POST /api/v1/auth/change-password/`

### Core care

- `GET|POST /api/v1/patients/`
- `GET|POST /api/v1/caregiver-links/`
- `GET|POST /api/v1/provider-access/`
- `GET|POST /api/v1/prescriptions/`
- `POST /api/v1/prescriptions/<prescription_id>/extract-ai/`
- `POST /api/v1/prescriptions/<prescription_id>/create-medications/`
- `GET|POST /api/v1/medications/`
- `GET|POST /api/v1/dose-logs/`
- `GET /api/v1/dashboard/patients/<patient_id>/`
- `GET /api/v1/ai/status/`
- `POST /api/v1/ai/assist/`

## File-by-File Project Map

### Root files

`/.env.example`
- sample environment configuration
- local development ke liye required env keys dikhata hai
- OpenAI API key aur default model placeholders bhi include karta hai

`/.env`
- local environment configuration file
- gitignored hai aur machine-specific secrets rakhta hai
- current local development ke liye generated Django `SECRET_KEY` isme stored hai
- user apni `OPENAI_API_KEY` isi file mein add karega taaki AI features enable ho sake

`/.gitignore`
- virtualenv, db, media, cache aur local env files ko ignore karta hai
- `frontend/node_modules`, `frontend/dist` aur frontend local env files bhi ignore karta hai

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

`/frontend/`
- imported care portal frontend workspace
- Vite + React + TypeScript app yahin rehti hai

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
- root `templates/` folder bhi load karta hai
- OpenAI API key aur model ko server-side env se read karta hai

Important settings inside `config/settings.py`:
- `INSTALLED_APPS`: Django apps plus `accounts`, `care`, `common`, `ai_assistant`, DRF-related packages
- `MIDDLEWARE`: request/response middleware chain
- `DATABASES`: env-based database configuration
- `AUTH_USER_MODEL`: custom `accounts.User`
- `REST_FRAMEWORK`: authentication, filters, pagination, schema settings
- `SIMPLE_JWT`: token lifetime configuration
- `SPECTACULAR_SETTINGS`: API docs configuration
- `TEMPLATES["DIRS"]`: project-level `templates/` folder load karta hai
- `OPENAI_API_KEY` / `OPENAI_MODEL`: general AI assistant backend configuration
- `OPENAI_VISION_MODEL`: prescription extraction ke liye vision-capable model configuration

`/config/urls.py`
- complete URL router
- root landing page, admin, health check, schema/docs, auth routes, care routes, aur AI routes ko wire karta hai

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
- root landing page aur health endpoint test karta hai

`/common/views.py`
- shared light utility views rakhta hai

Code inside `common/views.py`:
- `HomePageView`: root landing page render karta hai
  - browser ke liye quick links aur status page dikhata hai
- `HealthCheckView`: `/api/health/` endpoint
  - service up hone ka simple JSON response deta hai

`/common/migrations/__init__.py`
- migrations package marker

`/templates/home.html`
- root URL ka landing page template
- browser par docs, admin, health, schema aur frontend dev link dikhata hai
- API-first build ko readable homepage ke form mein present karta hai

### Frontend workspace

`/frontend/.env.example`
- frontend API base ka sample env file
- default `/api/v1` use karta hai

`/frontend/.env`
- local frontend env file
- dev server ke liye backend API base configure karta hai

`/frontend/package.json`
- frontend dependencies aur scripts define karta hai
- `npm run dev`, `npm run build`, `npm run test` yahin se milte hain

`/frontend/package-lock.json`
- npm dependency lock file

`/frontend/vite.config.ts`
- Vite dev server config
- frontend ko `127.0.0.1:8080` par run karta hai
- `/api/*` requests ko Django backend par proxy karta hai

`/frontend/index.html`
- frontend app shell HTML
- browser tab title aur basic SEO/social meta branding yahin define hoti hai

`/frontend/src/main.tsx`
- React root mount karta hai

`/frontend/src/App.tsx`
- frontend route tree define karta hai
- landing, login, register aur protected `/app/*` routes wire karta hai

`/frontend/src/contexts/AuthContext.tsx`
- frontend authentication state manage karta hai
- login, register, logout, refresh-user aur current-user bootstrap backend API se karta hai

`/frontend/src/services/api.ts`
- frontend fetch client
- JWT token attach karta hai
- refresh token flow handle karta hai
- paginated endpoints ko full-list fetch karne ke liye `listAll` helper deta hai
- upload requests par bhi auth refresh/error handling karta hai

`/frontend/src/types/index.ts`
- shared frontend TypeScript types
- user, patient, medication, dose log, dashboard aur auth payload shapes define karta hai
- create/update payload contracts bhi yahin stored hain
- AI status/request/response contracts bhi yahin defined hain

`/frontend/src/lib/patient-utils.ts`
- patient-related frontend helper functions
- conditions parsing, initials, adherence score, refill risk, age aur file-name formatting handle karta hai

`/frontend/src/lib/dashboard-utils.ts`
- dashboard aggregation helper
- patients, medications, reminders aur dose logs ko combine karke live dashboard data banata hai

`/frontend/src/lib/notification-utils.ts`
- notification preferences aur local-storage helpers
- missed dose, refill, weekly summary, caregiver update, aur prescription notifications generate karta hai

`/frontend/src/lib/export-utils.ts`
- CSV export helper
- dose logs aur reports export ko browser download mein convert karta hai

`/frontend/src/lib/mock-data.ts`
- temporary mock records
- legacy sample data file
- current live screens is file par depend nahi karti

`/frontend/src/pages/*.tsx`
- main route-level pages
- login/register backend-ready hain
- har major app page par page-aware AI action available hai
- `Patients.tsx` live patient list aur create dialog backend se chalata hai
- `PatientDetail.tsx` live patient profile, medications, logs, prescriptions aur care-team data backend se load karta hai
- `Medications.tsx` live medication list, reminder summary aur add-medication dialog provide karta hai
- `Prescriptions.tsx` live prescription list, upload dialog, AI extraction, aur medication-draft creation provide karta hai
- `DoseLogs.tsx` live activity list, stats, add-log dialog aur CSV export provide karta hai
- `Caregivers.tsx` live caregiver relationship list aur add-caregiver dialog provide karta hai
- `ProviderAccess.tsx` live provider access list aur add-provider dialog provide karta hai
- `Reports.tsx` live summary cards, charts, refill tracking aur export/print actions provide karta hai
- `Settings.tsx` live profile update, notification preferences, browser-notification permission, aur password-change flow provide karta hai
- `Dashboard.tsx` live schedule, care network, refill alerts, recent activity, aur quick actions provide karta hai

`/frontend/src/components/layout/*`
- authenticated app shell, sidebar aur topbar components
- `TopBar.tsx` live notification bell, unread count, dropdown feed, browser-notification enable flow, aur global MediMate AI launcher handle karta hai

`/frontend/src/components/ai/AiAssistantDialog.tsx`
- reusable AI dialog component
- server-side AI status check karta hai
- page-specific prompt aur context ke saath AI insights render karta hai

`/frontend/src/components/common/*`
- reusable display components like stats, rings, empty states, and badges

`/frontend/src/components/ui/*`
- Lovable/shadcn generated UI primitive components
- buttons, inputs, dialogs, tables, tabs, sidebar, toast, etc.

`/frontend/public/*`
- favicon, placeholder assets, robots file

`/frontend/README.md`
- frontend-specific run notes aur current status summary

### AI Assistant app

`/ai_assistant/__init__.py`
- package marker

`/ai_assistant/apps.py`
- Django app config for MediMate AI assistant

`/ai_assistant/serializers.py`
- AI request payload validate karta hai
- patient-level AI requests ke liye required `patient_id` enforce karta hai

`/ai_assistant/services.py`
- AI assistant ka core server-side service layer
- accessible patient/workspace context build karta hai
- medication, prescription, dose log, caregiver, provider aur refill context aggregate karta hai
- OpenAI Responses API call karta hai
- output ko normalized JSON insight format mein convert karta hai

`/ai_assistant/views.py`
- `GET /api/v1/ai/status/` aur `POST /api/v1/ai/assist/` endpoints expose karta hai
- missing API key, permission issues, aur AI response errors ko safe HTTP responses mein map karta hai

`/ai_assistant/urls.py`
- AI status aur assist routes define karta hai

`/ai_assistant/tests.py`
- AI status endpoint aur assist endpoint response contract test karta hai

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
- `UpdateUserSerializer`
  - current user profile update payload validate karta hai
- `ChangePasswordSerializer`
  - current password verify karta hai
  - new password change workflow validate aur save karta hai
- `MediMateTokenObtainPairSerializer`
  - login response mein JWT ke saath user data return karta hai
  - token claims mein role aur full name inject karta hai

`/accounts/tests.py`
- register, login, `/me`, profile update, user directory aur password change ka integration test

`/accounts/urls.py`
- auth routes map karta hai

`/accounts/views.py`
- auth-related API views rakhta hai

Code inside `accounts/views.py`:
- `RegisterView`: new user create karta hai
- `LoginView`: JWT login endpoint
- `MeView`: current logged-in user details return aur update karta hai
- `UserDirectoryView`: searchable user list return karta hai
- `ChangePasswordView`: authenticated password change endpoint deta hai

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
  - uploaded prescription file aur AI extraction/review related data rakhta hai
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

`/care/prescription_ai.py`
- prescription OCR/extraction ka AI service layer
- uploaded PDF/image ko OpenAI vision-capable model par bhejta hai
- structured medication drafts, OCR text, summary, aur clarification flags normalize karta hai
- extracted payload se actual `Medication` aur `MedicationReminder` drafts create kar sakta hai

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
  - patient-based filtering support karta hai
- `ProviderAccessViewSet`
  - provider access CRUD provide karta hai
  - patient-based filtering support karta hai
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

`/care/migrations/0002_alter_prescriptionupload_image.py`
- prescription upload field ko `FileField` par shift karta hai
- PDF uploads ko support karne ke liye migration add karta hai

## Generated Files

`/__pycache__/...`
- Python bytecode cache files
- auto-generated hote hain
- manually edit nahi karne chahiye
- inka source equivalent `.py` files hote hain

## Current Testing Coverage

Abhi 9 backend tests aur 1 frontend smoke test run hote hain:

- root landing page test
- health check test
- auth register/login/me flow test
- auth profile update, user directory, aur password change flow test
- patient/medication/dashboard integration test
- prescription AI extraction and medication-draft creation flow test
- AI status endpoint test
- AI assist endpoint contract test
- AI assist OpenAI failure handling test
- frontend Vitest example smoke test

## Current Limitations

Abhi project mein ye cheezein baaki hain:

- WhatsApp integration
- IVR integration
- AI extraction ke upar approval queue / pharmacist review workflow abhi basic hai
- Celery reminder scheduler
- AI features ko actual OpenAI responses ke liye valid `OPENAI_API_KEY` chahiye
- AI guidance workflow support hai, clinical decision replacement nahi
- strong role-based permission system
- top-bar global search abhi backend se wire nahi hai
- edit/delete flows ka richer UX abhi missing hai for most newly-wired frontend pages
- browser notifications app-open/in-browser mode tak limited hain; background push infra abhi nahi hai
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
- local `.env` file generated Django secret key ke saath create ki gayi
- root `/` landing page add ki gayi taaki browser par empty-path 404 na aaye
- external Lovable frontend repo import karke `frontend/` workspace add ki gayi
- frontend auth backend se wire kiya gaya aur Vite proxy/env config add ki gayi
- frontend Patients page ko live API list/create flow par migrate kiya gaya
- frontend Patient Detail page ko live backend data par migrate kiya gaya
- auth profile update, user directory, aur password change backend endpoints add kiye gaye
- frontend medications, prescriptions, dose logs, caregivers, provider access, reports aur settings pages ko live backend workflows par migrate kiya gaya
- frontend CSV export helper add kiya gaya
- patient-scoped caregiver/provider filtering backend aur frontend dono mein align ki gayi
- run commands ko `.venv` Python usage ke saath clarify kiya gaya
- frontend browser-tab title aur meta branding ko `MediMate` par update kiya gaya
- frontend dashboard ko live backend data, schedule actions, care network counts, aur responsive widgets ke saath rebuild kiya gaya
- top-bar notification bell ko live in-app feed, unread count, settings-synced preferences, aur browser notification permission ke saath enable kiya gaya
- OpenAI Python SDK dependency add ki gayi
- `.env` aur `.env.example` mein `OPENAI_API_KEY`, `OPENAI_MODEL`, aur `OPENAI_VISION_MODEL` placeholders add kiye gaye
- new `ai_assistant` Django app add ki gayi with AI status aur assist endpoints
- backend workspace-aware AI context builder aur OpenAI Responses API integration add ki gayi
- reusable frontend AI dialog add karke global top-bar assistant enable kiya gaya
- dashboard, patients, patient detail, medications, prescriptions, dose logs, caregivers, provider access, reports, aur settings pages par AI actions add kiye gaye
- prescription uploads ko `FileField` support diya gaya taaki PDF files bhi accept ho sake
- new `care/prescription_ai.py` extraction service add ki gayi
- prescription AI extraction endpoint aur medication draft creation endpoint add kiye gaye
- prescriptions page par `AI Extract` aur `Create Meds` workflow add kiya gaya
- `gpt-5-mini` compatibility ke liye AI requests se unsupported `temperature` parameter hataaya gaya
- AI assistant aur prescription extraction response parsing ko harden kiya gaya taaki raw/fenced JSON safely parse ho sake
- AI dialog layout fix ki gayi taaki long insights modal ke andar properly scroll ho sake
