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
import { SuperAdminDashboard } from "./dashboards/SuperAdminDashboard";

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

    // ── Staff / Employee roles ────────────────────────────────────────────
    case "receptionist":
    case "doctor":
    case "dept_head":
    case "nurse":
    case "staff":
    case "ward_boy":
    case "lab_tech":
    case "pharmacist":
    case "medical_director":
    case "employee":
    default:
      return <EmployeeDashboard />;
  }
};
