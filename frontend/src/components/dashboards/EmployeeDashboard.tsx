import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export const EmployeeDashboard: React.FC = () => {
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "patients" | "shifts">("overview");

  // Data State
  const [shifts, setShifts] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api/v1`;

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      // Fetch shifts assigned to this employee
      const shiftRes = await fetch(`${API_URL}/shifts/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (shiftRes.ok) setShifts(await shiftRes.json());

      // Fetch beds assigned to this department/employee
      const bedsRes = await fetch(`${API_URL}/beds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (bedsRes.ok) {
        const allBeds = await bedsRes.json();
        // Filter to occupied beds assigned to this employee's dept
        setBeds(allBeds.filter((b: any) => b.status === "occupied" || b.patient_id));
      }

      // Fetch patients under care
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
      <div className="w-full max-w-6xl mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Employee Portal...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6 text-slate-800 bg-white min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 uppercase">
            Staff Employee Portal
          </span>
          <h2 className="text-xl font-bold mt-2 text-slate-900">
            {user?.first_name} {user?.last_name}
            <span className="text-sm font-normal text-slate-500 ml-2 capitalize">({user?.role})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Facility: <strong className="text-slate-700">{user?.hospital_name || "Hospital"}</strong>
            <span className="mx-2 text-slate-300">·</span>
            Employee ID: <code className="font-mono bg-slate-50 px-1 rounded text-[11px]">{user?.id}</code>
          </p>
        </div>
        <button
          onClick={logout}
          className="text-xs font-bold px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-600 transition-all"
        >
          Sign Out
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 text-center">
          <span className="block text-2xl font-black text-slate-900">{shifts.length}</span>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Upcoming Shifts</span>
        </div>
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 text-center">
          <span className="block text-2xl font-black text-slate-900">{beds.length}</span>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Assigned Beds</span>
        </div>
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 text-center">
          <span className="block text-2xl font-black text-slate-900">{patients.length}</span>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Active Patients</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "overview" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Today's Overview
        </button>
        <button
          onClick={() => setActiveTab("patients")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "patients" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          My Patients
        </button>
        <button
          onClick={() => setActiveTab("shifts")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "shifts" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          My Shifts
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Next Upcoming Shift */}
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Next Shift</h4>
            {shifts.length > 0 ? (
              <div className="space-y-3">
                {[shifts[0]].map((s: any) => (
                  <div key={s.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h5 className="text-base font-bold text-slate-900 capitalize">{s.shift_type} Shift</h5>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                        s.status === "active" ? "bg-green-50 text-green-700 border-green-200" :
                        s.status === "scheduled" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>Starts:</span>
                        <strong className="text-slate-900">{new Date(s.start_time).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Ends:</span>
                        <strong className="text-slate-900">{new Date(s.end_time).toLocaleString()}</strong>
                      </div>
                      {s.bed_number && (
                        <div className="flex justify-between">
                          <span>Assigned Bed:</span>
                          <strong className="text-slate-900 font-mono">{s.bed_number}</strong>
                        </div>
                      )}
                      {s.patient_name && (
                        <div className="flex justify-between">
                          <span>Patient:</span>
                          <strong className="text-slate-900">{s.patient_name}</strong>
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

          {/* Occupied Beds Summary */}
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Occupied Bed Assignments</h4>
            {beds.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {beds.map((b: any) => (
                  <div key={b.id} className="flex justify-between items-center border-b border-slate-150 pb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800">{b.bed_number}</span>
                      <span className="text-[10px] text-slate-400 ml-2 capitalize">({b.type})</span>
                    </div>
                    <div className="text-right">
                      {b.patient_id && (
                        <span className="text-[10px] text-slate-500 font-mono">{b.patient_id}</span>
                      )}
                      <span className={`block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${
                        b.status === "occupied" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No beds currently assigned to your section.</p>
            )}
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === "patients" && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Patient Caseload</h4>
          {patients.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-12 text-center text-slate-400">
              <p className="text-sm font-semibold">No patients assigned</p>
              <p className="text-xs mt-1">No patients are currently assigned to your care or specialty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((p: any) => (
                <div key={p.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">{p.first_name} {p.last_name}</h5>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.upid}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      p.triage_level === "critical" ? "bg-red-100 text-red-800 border-red-200" :
                      p.triage_level === "high" ? "bg-amber-100 text-amber-800 border-amber-200" :
                      "bg-green-100 text-green-800 border-green-200"
                    }`}>
                      {p.triage_level?.replace("_", " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="block text-slate-500">Blood Group</span>
                      <strong className="text-slate-800">{p.blood_group?.replace("_", " ")}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Bed No.</span>
                      <strong className="text-slate-800 font-mono">{p.bed_number || "Unassigned"}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Admitted</span>
                      <strong className="text-slate-800">{p.admitted_at ? new Date(p.admitted_at).toLocaleDateString() : "—"}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Gender</span>
                      <strong className="text-slate-800">{p.gender}</strong>
                    </div>
                  </div>

                  {p.diet_plan && (
                    <div className="bg-slate-50 border border-slate-100 rounded p-2.5 text-[11px] text-slate-700 leading-relaxed">
                      <strong className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1">Diet Plan</strong>
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
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Full Shift Schedule</h4>
          {shifts.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-12 text-center text-slate-400">
              <p className="text-sm font-semibold">No shifts scheduled</p>
              <p className="text-xs mt-1">Your schedule is clear. Contact your supervisor for shift assignments.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {shifts.map((s: any) => (
                <div key={s.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          s.shift_type === "night" ? "bg-slate-800 text-white border-slate-600" :
                          s.shift_type === "evening" ? "bg-indigo-100 text-indigo-700 border-indigo-200" :
                          "bg-amber-100 text-amber-700 border-amber-200"
                        }`}>
                          {s.shift_type}
                        </span>
                        <h5 className="text-sm font-bold text-slate-900 capitalize">{s.shift_type} Shift</h5>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                        <div>
                          <span className="block text-slate-500 text-[10px] uppercase">Start Time</span>
                          <strong className="text-slate-800">{new Date(s.start_time).toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="block text-slate-500 text-[10px] uppercase">End Time</span>
                          <strong className="text-slate-800">{new Date(s.end_time).toLocaleString()}</strong>
                        </div>
                        {s.bed_number && (
                          <div>
                            <span className="block text-slate-500 text-[10px] uppercase">Assigned Bed</span>
                            <strong className="text-slate-800 font-mono">{s.bed_number}</strong>
                          </div>
                        )}
                        {s.patient_name && (
                          <div>
                            <span className="block text-slate-500 text-[10px] uppercase">Patient</span>
                            <strong className="text-slate-800">{s.patient_name}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase whitespace-nowrap ${
                      s.status === "active" ? "bg-green-50 text-green-700 border-green-200" :
                      s.status === "completed" ? "bg-slate-100 text-slate-500 border-slate-200" :
                      "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
