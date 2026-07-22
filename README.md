<div align="center">

<img src="https://img.shields.io/badge/CareFlow-Hospital%20Information%20System-0ea5e9?style=for-the-badge&logo=heart&logoColor=white" />

# CareFlow HMS
### A Modern, Full-Stack Hospital Information System

[![Live](https://img.shields.io/badge/Live-careflow--med--inky.vercel.app-22c55e?style=flat-square&logo=vercel)](https://careflow-med-inky.vercel.app)
[![Backend Health](https://img.shields.io/badge/API-Healthy-22c55e?style=flat-square&logo=express)](https://careflow-med-inky.vercel.app/api/health)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2017-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)

</div>

---

CareFlow is a **production-grade**, role-based Hospital Information System (HMS) built to automate clinical workflows, patient management, payroll, shift scheduling, and biometric attendance — all from a single, beautiful dark-mode interface. Designed to meet **NABH**, **JCI**, and **HIPAA** compliance standards.

---

## 🚀 Live Deployment

| | |
|---|---|
| **Production App** | [https://careflow-med-inky.vercel.app](https://careflow-med-inky.vercel.app) |
| **API Health Check** | [https://careflow-med-inky.vercel.app/api/health](https://careflow-med-inky.vercel.app/api/health) |
| **Stack** | Vite + React 18 · Express.js · Supabase PostgreSQL 17 · Vercel Serverless |

---

## ✨ Feature Overview

### 🏥 Role-Based Clinical Dashboards

Strict RBAC across **9 clinical/administrative roles** plus a dedicated **Patient Portal**:

| Role | Key Functions |
|:---|:---|
| 🧑‍⚕️ **Patient** | Vitals, medications, chronic conditions, pending bills, self-service portal |
| 🛎 **Receptionist** | Joint Commission–compliant patient intake, bed assignment, discharge management |
| 👨‍⚕️ **Doctor** | SOAP progress notes, clinical caseload, prescriptions, medical history |
| 👩‍⚕️ **Nurse** | Real-time vital observations, MAR (Medication Administration Record), nurse call queue |
| 🛏 **Ward Boy** | Patient transit logistics, bed cleanup queues, availability toggles |
| 🔬 **Lab Technician** | Diagnostic result entry (Hb, WBC, Platelets), verification workflow |
| 💊 **Pharmacist** | Prescription verification queue, pharmaceutical inventory management |
| 🩺 **Medical Director** | Live department occupancy, hospital-wide KPIs, ALOS analytics |
| 🔑 **Administrator** | Audit log inspector, user registry, system status, all modules below |

---

### 💰 Shift Tracking & Payroll Automation

Automated payroll engine linked directly to shift data:

- **Auto shift generation** — morning, afternoon, night rotations for all staff
- **Overtime calculation** — configurable per-staff contracts (multiplier, weekly cap)
- **One-click payroll runs** — calculates base pay + overtime, persists to `payroll_runs` table
- **Payslip exports** — per-employee breakdowns with hours and net pay
- **Payroll history** — full audit trail of every run

---

### 🏥 Attendance Integration Hub

Connect **any biometric or workforce management system** to CareFlow for real-time attendance sync:

| System | Protocol | Auth | Common In |
|:---|:---|:---|:---|
| 🖐 **ZKTeco** (biometric device) | PUSH — device initiates | Serial Number | India (most common) |
| 🌐 **ZKBioTime 8** | REST API poll | Basic Auth | India, UAE |
| 🔐 **MATRIX COSEC** | REST API pull | API Key | India, SAARC |
| 🏢 **UKG Pro / Kronos WFM** | REST API poll | OAuth2 | Enterprise, US hospitals |
| 📋 **Deputy** | REST API poll | Bearer Token | AU, UK, US |
| 🎋 **BambooHR** | REST API poll | API Key | US SMB |
| 🗄 **eSSL E-Time Track** | SQL database poll | DB credentials | India |
| 🔗 **Generic Webhook** | HTTP POST | API Key | Any system |
| 📄 **CSV Upload** | Manual import | — | Universal fallback |

**Real-time punch event dashboard** — present/absent/late/OT counts, punch log with verify method, temperature fever detection (>37.5°C highlighted), department drill-down.

**ZKTeco PUSH setup** (for IT team):
```
Device → Comm → ADMS → Cloud Server
  Server URL: https://your-domain.com/iclock/cdata
  Heartbeat: 60 seconds
→ Save → Restart Device
```

---

### 🤖 AI Resource Advisor

- GPT-4o–powered hospital resource advisor embedded in the Admin Dashboard
- Real-time recommendations for bed allocation, staff redeployment, and ICU overflow management
- Integrated with live census data

---

### 🌍 Public Hospital Finder

- OpenStreetMap-sourced Delhi hospital directory (500+ entries)
- Emergency bed & ICU availability broadcast
- Universal Patient ID (UPID) — single identity across hospital network

---

## 🛠 Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | React 18, TypeScript, Vite, Vanilla CSS (dark glassmorphism UI) |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | Supabase PostgreSQL 17.6 (production) · In-memory mock (dev/test) |
| **Auth** | JWT (RS256), bcrypt password hashing |
| **Real-time** | WebSocket event broadcast (`ws_events.ts`) |
| **Deployment** | Vercel Serverless Functions |
| **Mobile** | Android APK (Capacitor) |
| **Desktop** | Windows Portable EXE |

---

## 💻 Local Development

### Prerequisites
- Node.js v18+
- npm v9+

### 1. Backend (Express API — port 3001)
```bash
# From project root
npm install
npm run dev
```

### 2. Frontend (Vite React — port 5174)
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables
Create `.env` in the project root:
```env
DATABASE_URL=postgresql://...   # Supabase connection string
DATABASE_SSL=true
JWT_SECRET=your-secret
OPENAI_API_KEY=sk-...           # For AI Advisor (optional)
```

### 4. Run Database Migrations
```bash
# Core schema
npx ts-node run_migration.ts

# Payroll tables
npx ts-node run_payroll_migration.ts

# Attendance integration tables
npx ts-node run_attendance_migration.ts
```

---

## 🔐 Default Login Credentials

| Role | Email | Password |
|:---|:---|:---|
| Super Admin | `superadmin@careflow.com` | `admin123` |
| Hospital Admin | `admin@careflow.com` | `password123` |
| Doctor | `doctor@careflow.com` | `password123` |
| Nurse | `nurse@careflow.com` | `password123` |
| Receptionist | `receptionist@careflow.com` | `password123` |

> ⚠️ Change all credentials before production use.

---

## 📦 Native Clients

Pre-compiled binaries live in `/platforms/` (excluded from Git via `.gitignore` due to size):

| Platform | File | Size |
|:---|:---|:---|
| 🪟 Windows Desktop | `platforms/careflow-windows-setup.exe` | ~79.5 MB |
| 🤖 Android | `platforms/careflow-debug.apk` | ~5.7 MB |

**To distribute via GitHub Releases:**
1. Go to **Releases** → **Draft a new release**
2. Tag it `v1.x.x`, add title and notes
3. Drag in the `.exe` and `.apk` files
4. Click **Publish release**

---

## 🗂 Project Structure

```
careflow/
├── api/
│   └── index.ts              # Vercel entrypoint — mounts all routes
├── src/
│   ├── routes/
│   │   ├── patients.ts
│   │   ├── shifts.ts
│   │   ├── payroll.ts
│   │   ├── attendance_integration.ts  ← NEW
│   │   ├── clinical.ts
│   │   ├── emergency.ts
│   │   ├── auth.ts
│   │   └── ...
│   ├── db.ts                 # Repository pattern (SQL + mock fallback)
│   └── domain/entities.ts
├── frontend/
│   └── src/components/dashboards/
│       ├── AdminDashboard.tsx
│       ├── PayrollTab.tsx
│       ├── AttendanceTab.tsx          ← NEW
│       └── ...
├── platforms/
│   ├── attendance_migration.sql       ← NEW
│   ├── careflow-windows-setup.exe
│   └── careflow-debug.apk
├── run_attendance_migration.ts        ← NEW
└── README.md
```

---

## 📋 API Reference (Key Endpoints)

### Authentication
| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/v1/auth/login` | JWT login |
| POST | `/api/v1/auth/register` | Staff registration |

### Attendance Integration
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/iclock/cdata` | ZKTeco device heartbeat |
| POST | `/iclock/cdata?table=ATTLOG` | ZKTeco PUSH punch receive |
| GET | `/api/v1/attendance/connectors` | List connectors |
| POST | `/api/v1/attendance/connectors` | Add connector |
| POST | `/api/v1/attendance/connectors/:id/test` | Test connectivity |
| POST | `/api/v1/attendance/connectors/:id/sync` | Manual pull sync |
| GET | `/api/v1/attendance/events` | Query punch log |
| GET | `/api/v1/attendance/summary` | Today's KPI summary |
| POST | `/api/v1/attendance/webhook/:provider` | Generic webhook receiver |

### Payroll
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/v1/payroll/preview` | Preview payroll calculation |
| POST | `/api/v1/payroll/run` | Execute payroll run |
| GET | `/api/v1/payroll/history` | Payroll run history |

---

## 📜 Compliance & Standards

- **NABH** (National Accreditation Board for Hospitals) — shift records, audit trails
- **JCI** (Joint Commission International) — patient registration, identity verification
- **HIPAA** — role-based data access, JWT authentication, audit logging
- **HL7 FHIR** — scheduling resource model (Schedule/Slot/Appointment pattern)

---

## 📝 License & Copyright

**All rights reserved — AA FORGE**

CareFlow is proprietary software. Unauthorized reproduction, distribution, or modification is prohibited.

---

<div align="center">
Built with ❤️ for hospitals that care about their staff and patients.
</div>
