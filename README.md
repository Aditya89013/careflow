# CareFlow Hospital Information System (HIS)

CareFlow is a modern, premium, role-based Hospital Information System (HIS) designed to streamline clinical workflows, patient registrations, EMR SOAP documentation, bed allocations, and shift schedules.

Built with a Vite React frontend, Express.js backend, and a production Supabase PostgreSQL database, CareFlow offers a beautiful dark-mode interface tailored to nine distinct clinical and administrative roles, alongside a secure patient portal.

## 🚀 Live Production Deployment

* **Production URL:** [https://careflow-med-inky.vercel.app](https://careflow-med-inky.vercel.app)
* **Backend Status:** [https://careflow-med-inky.vercel.app/api/health](https://careflow-med-inky.vercel.app/api/health)

---

## 🔑 Key Features & Role Dashboards

CareFlow implements strict Role-Based Access Control (RBAC) across 9 clinical/administrative roles and a dedicated Patient portal:

| Role | Primary Functions |
| :--- | :--- |
| **Patient** | Retrieve personal vitals, active medications, chronic conditions, and pending bills. |
| **Receptionist / Front Desk** | Patient intake registration (Joint Commission compliant), bed assignment, and discharges. |
| **Doctor / Physician** | EMR SOAP progress notes, clinical caseload management, prescriptions, and history review. |
| **Nurse** | Real-time vital sign observations, medication administration checks (MAR), and nurse call queues. |
| **Ward Boy / Orderly** | Patient transit logistics, availability toggles, and bed cleanup queues. |
| **Lab Technician** | Diagnostic test result entry (Hb, WBC, Platelets) and verification. |
| **Pharmacist** | Prescription verification queue and pharmaceutical drug inventory management. |
| **Medical Director (CMO)** | Live department occupancy, hospital-wide KPIs, and Average Length of Stay (ALOS) stats. |
| **Administrator / HR** | Platform audit log inspector, user registry, and system status configuration. |

---

## 💻 Local Setup & Development

### Prerequisites
* Node.js (v18+)
* npm (v9+)

### 1. Run the Express Backend
1. Install dependencies from the project root:
   ```bash
   npm install
   ```
2. Start the development server (runs on port `3001`):
   ```bash
   npm run dev
   ```

### 2. Run the Vite React Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite server (runs on port `5174`):
   ```bash
   npm run dev
   ```

---

## 📦 Native Mobile & Desktop Releases

Pre-compiled native binaries are stored locally in the `/platforms` folder to bypass Git tracking limits:
* **Windows Desktop Client (.exe Installer):** `platforms/careflow-windows-setup.exe` (79.5 MB)
* **Android Client (.apk Package):** `platforms/careflow-debug.apk` (5.7 MB)

### Accessing Pre-Compiled Binaries
Since `.exe` and `.apk` files are ignored in Git to maintain clean repository sizes, you can access and copy them directly from your local workspace under:
```
[workspace_root]/platforms/careflow-windows-setup.exe
[workspace_root]/platforms/careflow-debug.apk
```

### Distributing via GitHub Releases (Recommended)
To make these native clients publicly downloadable for hospital staff on GitHub:
1. Go to your GitHub repository homepage.
2. Click on **Create a new release** (or **Releases** -> **Draft a new release**).
3. Set the tag version (e.g., `v1.0.0`) and title.
4. Drag and drop `platforms/careflow-windows-setup.exe` and `platforms/careflow-debug.apk` into the release attachments box.
5. Click **Publish release**.

For instructions on building the native platforms from scratch, see the [Platform Build Guides](file:///H:/quirky-planck-20260704T195455Z-3-001/quirky-planck-revamp/platforms/README.md).
