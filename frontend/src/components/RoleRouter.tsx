import React from "react";
import { useAuth } from "../auth/AuthContext";
import { PatientDashboard } from "./dashboards/PatientDashboard";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { EmployeeDashboard } from "./dashboards/EmployeeDashboard";
import { SuperAdminDashboard } from "./dashboards/SuperAdminDashboard";
import { DoctorDashboard } from "./dashboards/DoctorDashboard";
import { NurseDashboard } from "./dashboards/NurseDashboard";
import { ReceptionistDashboard } from "./dashboards/ReceptionistDashboard";
import { LabTechDashboard } from "./dashboards/LabTechDashboard";
import { PharmacistDashboard } from "./dashboards/PharmacistDashboard";
import { WardBoyDashboard } from "./dashboards/WardBoyDashboard";
import { MDDashboard } from "./dashboards/MDDashboard";

export const RoleRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    // ── Global System Admin ──────────────────────────────────────────────
    case "super_admin":
      return <SuperAdminDashboard />;

    // ── Customer Patient Portal ──────────────────────────────────────────
    case "patient":
      return <PatientDashboard />;

    // ── Hospital Owner / Manager ─────────────────────────────────────────
    case "hospital_owner":
    case "admin":
      return <AdminDashboard />;

    // ── Specialized Clinical Staff ─────────────────────────────────────────
    case "receptionist":
      return <ReceptionistDashboard />;
    case "doctor":
      return <DoctorDashboard />;
    case "nurse":
      return <NurseDashboard />;
    case "lab_tech":
      return <LabTechDashboard />;
    case "pharmacist":
      return <PharmacistDashboard />;
    case "ward_boy":
      return <WardBoyDashboard />;
    case "medical_director":
    case "dept_head":
      return <MDDashboard />;

    // ── Generic Staff / Employee fallback ──────────────────────────────────
    case "staff":
    case "employee":
    default:
      return <EmployeeDashboard />;
  }
};
