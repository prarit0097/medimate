# MediMate Care Portal

Frontend workspace for the MediMate project. This is a Vite + React + TypeScript app imported from the Lovable-generated portal and now housed inside the main Medimate repository under `frontend/`.

## Current status

- authentication is wired to the Django backend
- patients list, add-patient flow, and patient detail page are wired to the Django backend
- API base defaults to `/api/v1`
- Vite dev server proxies `/api/*` requests to `http://127.0.0.1:8000`
- dashboard, medications, prescriptions, reports, and some related screens still use mock data and need progressive backend migration

## Run locally

```powershell
cd E:\coding\MediMate\frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:8080`.

## Backend requirement

Run the Django backend separately from the repo root:

```powershell
cd E:\coding\MediMate
.\.venv\Scripts\python manage.py runserver
```

## Important files

- `src/contexts/AuthContext.tsx`: login, register, logout, current-user bootstrap
- `src/services/api.ts`: fetch wrapper and token refresh logic
- `src/App.tsx`: route map
- `src/pages/Patients.tsx`: live patients listing and create-patient dialog
- `src/pages/PatientDetail.tsx`: live patient profile detail view
- `src/lib/mock-data.ts`: temporary mocked records used by UI pages not yet migrated
- `vite.config.ts`: dev server and proxy settings
