# Antigravity Development Context & Migration State

This file serves as a handoff context for Antigravity agents continuing the development of the **CareFlow** (formerly MediAlloc) project.

## Setup Context
- **OS**: Windows
- **Database**: Mock in-memory database used by default (since `DATABASE_URL` is undefined).
- **Backend Port**: `3001` (to avoid conflict with main project port 3000)
- **Frontend Port**: `5174` (to avoid conflict with main project port 5173)
- **Execution Policy**: Running PowerShell scripts is restricted. Run commands through `cmd /c`.

---

## Progress Log

### 1. Domain Entities & Database Extensions (Completed)
- **Entities (`src/domain/entities.ts`)**: Added support for `UniversalPatient` (demographics, chronic conditions, registries) and `AdmissionRecord` entities. Expanded `StaffRole` to cover the 9 distinct hospital roles.
- **Database Repository (`src/db.ts`)**: Seeded mock data for all 9 staff roles (Rita Receptionist, Dr. Rajesh Kumar, Nurse Priyanka, Wayne Wardboy, etc.) and implemented repository lookup utilities.

### 2. Authentication & Custom Routing (Completed)
- **RBAC Middleware (`src/middleware/auth.ts`)**: Expanded middleware to validate JWT session tokens for patients and the 9 clinical roles, supporting both secure headers and developer role-specific bypass tokens (`mock-bypass-token-${role}`) for instant simulation transitions.
- **Authorization Routers (`src/routes/auth.ts` & `patients.ts`)**:
  - `/auth/login`: Staff credentials validator.
  - `/auth/patient-login`: Log in with UPID + PIN (persists even after patient is discharged).
  - `/patients/register`: Joint Commission compliant registration. Generates permanent UPID (`CF-YYYY-XXXXXXXX`) and temporary 6-digit PIN.
  - `/patients/:id/discharge`: Discharges active local patient and logs summaries.
  - `/patients/:upid/history`: Clinical cross-hospital EMR lookup with HIPAA compliant audit log generation.
  - `/patients/me`: Patient portal self-record retrieval.
  - `/shifts`: Shift roster retrieval (allowed for all 9 staff roles).
  - `/shifts/generate`: Scheduling optimizer generation (allowed for clinical leads, doctors, nurses, receptionists, and administrators).
  - `/shifts/swaps`: Shift swap register triggers (allowed for all 9 staff roles).

### 3. Modular React Frontend & 9 Custom Dashboards (Completed)
- **LoginPage (`frontend/src/auth/LoginPage.tsx`)**: Premium dark-slate interface with separate tabs for Staff credentials and Patient UPID/PIN credentials, including bypass simulator controls.
- **RoleRouter (`frontend/src/components/RoleRouter.tsx`)**: Resolves active user session roles and mounts the corresponding console:
  1. **PatientDashboard**: Vitals trends, chronic conditions, and billing.
  2. **ReceptionistDashboard**: Intake forms, census list, and discharge actions.
  3. **DoctorDashboard**: CAS caseload, EMR SOAP note editing, and Rx dispatch.
  4. **NurseDashboard**: Bedside vital observation recording and MAR checklists.
  5. **WardBoyDashboard**: Mobile logistics queue and availability status toggles.
  6. **LabTechDashboard**: Diagnostic test result entries (Hb, WBC, Platelets).
  7. **PharmacistDashboard**: Prescription verification queue and inventory tracker.
  8. **MDDashboard**: CMO KPIs, ALOS tracking, and department occupancy load.
  9. **AdminDashboard**: Full audit trail surveillance inspector and staff profiles directory.
- **Guest Mode (`frontend/src/App.tsx`)**: Automatically shows public regional maps and EMS coordinator panels to unauthenticated users, letting them log in when ready.

### 4. Verification State (Completed)
- **E2E verification tests** ran and succeeded cleanly: `node scratch/verification_test.js` successfully verified patient intake, UPID/PIN generation, login verification, doctor EHR history retrieval, discharge, and post-discharge portal login persistence.
- **Production bundle build** compiled cleanly with zero TypeScript type or compiler warnings: `cmd /c npm run build` built successfully in 5.57 seconds.

### 5. Production Vercel & Supabase Deployment (Completed)
- **Environment Variable Setup**: Configured project variables (`DATABASE_URL`, `DATABASE_SSL`, `USE_MOCK_DB`, `JWT_SECRET`, `GEMINI_API_KEY`) on Vercel without double-quote wrapping syntax issues.
- **Circular Dependency Elimination**: Moved the WebSocket subscriptions map and `broadcastHospitalEvent` helper function into a separate file [src/ws_events.ts](file:///H:/quirky-planck-20260704T195455Z-3-001/quirky-planck-revamp/src/ws_events.ts). Routers now import from `src/ws_events.ts` rather than the main server entrypoint (`src/index.ts`), breaking circular import chains and avoiding WebSocket server initialization crashes in Vercel's serverless environment.
- **Router Interop Safety**: Updated [api/index.ts](file:///H:/quirky-planck-20260704T195455Z-3-001/quirky-planck-revamp/api/index.ts) to safely unwrap router default exports `(patientRouterRaw as any).default || patientRouterRaw` to support both ESM and CommonJS runtimes cleanly.
- **Successful Live Deployment**: CareFlow is deployed at [https://careflow-med-inky.vercel.app](https://careflow-med-inky.vercel.app). Verified that the `/api/health` and `/api/v1/public/hospitals` endpoints successfully connect to the Supabase PostgreSQL database instance and retrieve live Delhi hospital census data.

### 6. Database Persistence & Constraint Resolution (Completed)
- **Primary Key Constraint Fixes (`src/db.ts`)**: Resolved `null value in column "id" of relation "..." violates not-null constraint` errors by modifying the SQL `INSERT` statements for `patients`, `allocations`, and `shifts` to supply the generated entity `id` explicitly.
- **Audit Logs Foreign Key Validation (`src/db.ts`)**: Added validation in `addAuditEvent` to verify if the `actor_id` exists in the `staff_members` table and fallback to `null` instead of throwing a foreign key violation.
- **Triage Level Normalization (`src/routes/patients.ts`)**: Implemented `normalizeTriageLevel` to convert arbitrary triage strings to PostgreSQL enum compliant variants.
- **11-Role Full Hospital Operations Simulation**: Rerun the operations simulation against the live Vercel deployment: `node scratch/ops_sim.mjs`. Verified **100% success** across all roles, with successful patient registrations, shift generation, and swaps.

### 7. Clinical Modules & Advanced RBAC Implementation (Completed)
- **Clinical Endpoints (`src/routes/clinical.ts`)**: Built and mounted a brand-new router implementing:
  - **Prescriptions**: e-prescribing orders (`POST /prescriptions`) and queue retrieval (`GET /prescriptions`).
  - **Medications Administration**: Dose charting (`POST /medications/administer`).
  - **Labs**: Test orders (`POST /lab-orders`, `GET /lab-orders`) and result updates (`POST /lab-results`).
  - **Inventory**: Dispense tracker (`PUT /inventory/:id/dispense`) and stock lookup (`GET /inventory`).
  - **Nurse Alerts**: BED call light logging (`POST /nurse-alerts`, `GET /nurse-alerts`) and nurse resolution (`PUT /nurse-alerts/:id/resolve`).
  - **Wardboy Tasks**: Orderly transit queue (`GET /wardboy/tasks`, `POST /wardboy/tasks`, `PUT /wardboy/tasks/:id/status`).
  - **Analytics KPIs**: CMO analytics data engine (`GET /analytics/kpis`).
  - **Staff Onboarding**: Admin directory addition endpoint (`POST /staff`).
- **HIPAA Role Scoping**: Restricted `ward_boy` and `lab_tech` roles from accessing raw patient clinical profiles. They are now limited to reading task queues and lab queues respectively, while general patient vitals returns a 403.
- **Operations Simulation Validation**: Updated the simulation script to verify all clinical actions across the 9 roles, achieving a perfect **10/10 Scorecard** with all endpoints returning green and RBAC correctly throwing 403s where expected.

