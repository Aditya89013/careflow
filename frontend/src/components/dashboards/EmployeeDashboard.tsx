import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { API_URL } from "../../config";

export const EmployeeDashboard: React.FC = () => {
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "patients" | "shifts">("overview");

  // Data State
  const [shifts, setShifts] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      // Fetch shifts assigned to this employee
      const shiftRes = await fetch(`${API_URL}/shifts/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (shiftRes.ok) setShifts(await shiftRes.json());

      // Fetch beds assigned to this hospital
      const bedsRes = await fetch(`${API_URL}/beds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (bedsRes.ok) {
        const allBeds = await bedsRes.json();
        // Show occupied beds or beds related to this hospital
        setBeds(allBeds.filter((b: any) => b.status === "occupied" || b.patient_id));
      }

      // Fetch active caseload patients under care
      const patRes = await fetch(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (patRes.ok) setPatients(await patRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [token]);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Querying staff registries...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6 text-slate-900 bg-white min-h-screen font-sans">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
            Clinician / Staff Workspace
          </span>
          <h2 className="text-xl font-bold mt-2 text-slate-900">
            {user?.first_name} {user?.last_name}
            <span className="text-xs font-normal text-slate-500 ml-2 capitalize">({user?.role})</span>
          </h2>
          <p className="text-xs text-slate-550 mt-0.5">
            Facility: <strong className="text-slate-800">{user?.hospital_name || "CareFlow Medical Center"}</strong>
            <span className="mx-2 text-slate-300">·</span>
            Employee ID: <code className="font-mono bg-slate-50 px-1 rounded text-[11px] text-slate-800">{user?.id}</code>
          </p>
        </div>
        <button
          onClick={logout}
          className="text-xs font-bold px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-slate-600 transition-all"
        >
          Sign Out
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-slate-200 rounded p-4 text-center">
          <span className="block text-xl font-bold text-slate-900">{shifts.length}</span>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">My Shifts</span>
        </div>
        <div className="border border-slate-200 rounded p-4 text-center">
          <span className="block text-xl font-bold text-slate-900">{beds.length}</span>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Hospital Occupied Beds</span>
        </div>
        <div className="border border-slate-200 rounded p-4 text-center">
          <span className="block text-xl font-bold text-slate-900">{patients.length}</span>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Active Patient Caseload</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-250 gap-1 p-0.5 bg-slate-50 rounded border max-w-md">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-2 text-xs font-bold uppercase rounded tracking-wider transition-all ${
            activeTab === "overview" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("patients")}
          className={`flex-1 py-2 text-xs font-bold uppercase rounded tracking-wider transition-all ${
            activeTab === "patients" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          Caseload
        </button>
        <button
          onClick={() => setActiveTab("shifts")}
          className={`flex-1 py-2 text-xs font-bold uppercase rounded tracking-wider transition-all ${
            activeTab === "shifts" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          My Shifts
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Next Shift */}
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Upcoming Shift</h4>
            {shifts.length > 0 ? (
              <div className="space-y-3">
                {[shifts[0]].map((s: any) => (
                  <div key={s.id} className="space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h5 className="text-sm font-bold text-slate-900 capitalize">{s.shift_type} Shift</h5>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full uppercase">
                        {s.status}
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-1 text-slate-700">
                      <div className="flex justify-between">
                        <span>Start Time:</span>
                        <strong className="text-slate-900">{new Date(s.start_time).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>End Time:</span>
                        <strong className="text-slate-900">{new Date(s.end_time).toLocaleString()}</strong>
                      </div>
                      {s.bed_number && (
                        <div className="flex justify-between">
                          <span>Assigned Bed:</span>
                          <strong className="text-slate-900 font-mono">{s.bed_number}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No upcoming shifts scheduled.</p>
            )}
          </div>

          {/* Occupied Beds */}
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Active Bed Placements</h4>
            {beds.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {beds.map((b: any) => (
                  <div key={b.id} className="flex justify-between items-center border-b border-slate-100 pb-2 text-xs text-slate-700">
                    <div>
                      <span className="font-bold text-slate-900">{b.bed_number}</span>
                      <span className="text-[10px] text-slate-450 uppercase ml-2">({b.type})</span>
                    </div>
                    <span className="bg-slate-50 text-slate-700 border px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No beds currently occupied.</p>
            )}
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === "patients" && (
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Clinical Caseload</h4>
          {patients.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400">
              <p className="text-xs italic">No active patient caseload assigned to your workspace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((p: any) => (
                <div key={p.id} className="border border-slate-200 rounded p-4 bg-white space-y-3 text-xs">
                  <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{p.first_name} {p.last_name}</h5>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">UPID: {p.upid || "—"}</p>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full">
                      {p.triage_level?.replace("_", " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-750">
                    <div>
                      <span className="block text-slate-450 uppercase text-[9px] font-bold">Blood Group</span>
                      <strong className="text-slate-800">{p.blood_group || "—"}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-455 uppercase text-[9px] font-bold">Assigned Bed</span>
                      <strong className="text-slate-800 font-mono">{p.bed_number || "Unassigned"}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-450 uppercase text-[9px] font-bold">Admitted At</span>
                      <strong className="text-slate-800">{p.admitted_at ? new Date(p.admitted_at).toLocaleDateString() : "—"}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-450 uppercase text-[9px] font-bold">Needs Ventilator</span>
                      <strong className="text-slate-800">{p.needs_ventilator ? "Yes" : "No"}</strong>
                    </div>
                  </div>

                  {p.diet_plan && (
                    <div className="bg-slate-50 border border-slate-100 rounded p-2.5 text-[11px] text-slate-700 leading-relaxed font-sans">
                      <strong className="text-slate-500 text-[10px] uppercase block mb-1">AI Care Diet Plan</strong>
                      {p.diet_plan}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shifts Tab */}
      {activeTab === "shifts" && (
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">My Shift Schedule</h4>
          {shifts.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400">
              <p className="text-xs italic">No scheduled shifts found in registry.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {shifts.map((s: any) => (
                <div key={s.id} className="border border-slate-200 rounded p-4 bg-white flex justify-between items-center text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-800">
                        {s.shift_type}
                      </span>
                      <h5 className="font-bold text-slate-900 capitalize">{s.shift_type} Shift</h5>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-slate-700">
                      <div>Starts: <strong className="text-slate-900">{new Date(s.start_time).toLocaleString()}</strong></div>
                      <div>Ends: <strong className="text-slate-900">{new Date(s.end_time).toLocaleString()}</strong></div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full uppercase font-mono">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
