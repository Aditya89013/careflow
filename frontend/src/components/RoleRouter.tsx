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

export const RoleRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "patient":
      return <PatientDashboard />;
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
    case "admin":
      return <AdminDashboard />;
    default:
      return (
        <div className="text-center py-12 text-slate-500 italic text-xs">
          Role "{user.role}" dashboard not implemented or supported.
        </div>
      );
  }
};
