# MediMate Care Portal

Frontend workspace for the MediMate project. This is a Vite + React + TypeScript app imported from the Lovable-generated portal and now housed inside the main Medimate repository under `frontend/`.

## Current status

- authentication is wired to the Django backend
- patients list, add-patient flow, and patient detail page are wired to the Django backend
- medications, prescriptions, dose logs, caregivers, provider access, reports, and settings are wired to the Django backend
- dashboard is wired to live backend aggregates and schedule actions
- top-bar bell is wired to live notification items and browser-notification permission flow
- API base defaults to `/api/v1`
- Vite dev server proxies `/api/*` requests to `http://127.0.0.1:8000`
- top-bar global search is still a placeholder

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

- `src/contexts/AuthContext.tsx`: login, register, logout, refresh-user, current-user bootstrap
- `src/services/api.ts`: fetch wrapper, token refresh logic, paginated `listAll`, and upload handling
- `src/App.tsx`: route map
- `src/pages/Patients.tsx`: live patients listing and create-patient dialog
- `src/pages/PatientDetail.tsx`: live patient profile detail view
- `src/pages/Medications.tsx`: live medications list and create flow
- `src/pages/Prescriptions.tsx`: live prescription list and upload flow
- `src/pages/DoseLogs.tsx`: live dose log list, create flow, and CSV export
- `src/pages/Caregivers.tsx`: live caregiver relationship management
- `src/pages/ProviderAccess.tsx`: live provider access management
- `src/pages/Reports.tsx`: live summary, charts, print, and CSV export
- `src/pages/Settings.tsx`: live profile, notification, and password settings
- `src/pages/Dashboard.tsx`: live dashboard summary, today schedule, refill alerts, and care network widgets
- `src/lib/dashboard-utils.ts`: dashboard aggregation and scheduling helper
- `src/lib/notification-utils.ts`: notification preferences, generated feed items, and storage helpers
- `src/lib/export-utils.ts`: CSV download helper
- `src/lib/mock-data.ts`: legacy sample data retained for reference
- `src/components/layout/TopBar.tsx`: top-bar search shell and live notification center
- `vite.config.ts`: dev server and proxy settings
