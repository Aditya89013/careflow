import React from "react";
import { useAuth } from "../auth/AuthContext";
import { PatientDashboard } from "./dashboards/PatientDashboard";
import { ReceptionistDashboard } from "./dashboards/ReceptionistDashboard";
import { DoctorDashboard } from "./dashboards/DoctorDashboard";
import { NurseDashboard } from "./dashboards/NurseDashboard";
import { WardBoyDashboard } from "./dashboards/WardBoyDashboard";
import { LabTechDashboard } from "./dashboards/LabTechDashboard";
import { PharmacistDashboard } from "./dashboards/PharmacistDashboard";
import { MDDashboard } from "./dashboards/MDDashboard";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { EmployeeDashboard } from "./dashboards/EmployeeDashboard";

export const RoleRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    // ── Customer Patient Portal ──────────────────────────────────────────
    case "patient":
      return <PatientDashboard />;

    // ── Hospital Owner / Manager ─────────────────────────────────────────
    case "hospital_owner":
    case "admin":
      return <AdminDashboard />;

    // ── Staff / Employee roles ────────────────────────────────────────────
    case "receptionist":
      return <ReceptionistDashboard />;
    case "doctor":
    case "dept_head":
      return <DoctorDashboard />;
    case "nurse":
    case "staff":
      return <NurseDashboard />;
    case "ward_boy":
      return <WardBoyDashboard />;
    case "lab_tech":
      return <LabTechDashboard />;
    case "pharmacist":
      return <PharmacistDashboard />;
    case "medical_director":
      return <MDDashboard />;

    // ── Fallback for any other employee type added by hospital admin ──────
    case "employee":
    default:
      // Check if it looks like a registered employee (has hospital_id)
      if (user.hospital_id) {
        return <EmployeeDashboard />;
      }
      return (
        <div className="text-center py-12 text-slate-500 italic text-xs">
          Role "{user.role}" dashboard not implemented or supported.
        </div>
      );
  }
};
