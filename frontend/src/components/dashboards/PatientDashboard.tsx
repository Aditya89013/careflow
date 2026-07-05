import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export const PatientDashboard: React.FC = () => {
  const { token, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/v1/patients/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [token]);

  if (loading) {
    return <div className="text-center py-12 text-slate-400 font-bold text-xs">Loading Patient Portal...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-red-500 font-bold text-xs">Error loading patient portal. Profile not found.</div>;
  }

  const { profile, activeAdmission } = data;

  return (
    <div className="space-y-8 font-sans">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-teal-900/40 to-emerald-950/20 border border-teal-800/40 p-6 rounded-2xl flex justify-between items-center shadow-lg">
        <div>
          <span className="bg-teal-500/10 border border-teal-500/25 text-teal-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            PATIENT PORTAL ACTIVE
          </span>
          <h2 className="text-xl font-black text-white mt-3">Hello, {profile.first_name} {profile.last_name}</h2>
          <p className="text-slate-400 text-xs mt-1">UPID: <code className="text-teal-400 font-bold">{profile.upid}</code></p>
        </div>
        <button
          onClick={logout}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95"
        >
          Sign Out
        </button>
      </div>

      {/* Admission status & vital signs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Admission Info */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-teal-400 uppercase tracking-wider">Current Bed Assignment</h3>
          {activeAdmission ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400">Hospital:</span>
                <span className="text-xs font-bold text-white">AIIMS New Delhi</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400">Bed Number:</span>
                <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">{activeAdmission.bed_number || "Awaiting allocation"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400">Admitted At:</span>
                <span className="text-xs font-bold text-white">{new Date(activeAdmission.admitted_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Triage Index:</span>
                <span className="text-xs font-bold text-orange-400 uppercase">{activeAdmission.triage_level.replace("_", " ")}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No active admission recorded. You are viewing your historical record.</p>
          )}
        </div>

        {/* Real-time vitals */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4 col-span-2">
          <h3 className="text-xs font-black text-teal-400 uppercase tracking-wider">Active Vital Signs</h3>
          {activeAdmission?.vitals ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Heart Rate</p>
                <p className="text-2xl font-black text-rose-500 mt-2">{activeAdmission.vitals.hr} <span className="text-xs text-slate-400 font-normal">bpm</span></p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Blood Pressure</p>
                <p className="text-2xl font-black text-indigo-400 mt-2">{activeAdmission.vitals.bp} <span className="text-[10px] text-slate-400 font-normal">mmHg</span></p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">O2 Saturation</p>
                <p className="text-2xl font-black text-emerald-400 mt-2">{activeAdmission.vitals.o2}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No vital signs recorded for current session.</p>
          )}
        </div>

      </div>

      {/* Clinical profiles & allergies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Allergies & Conditions */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Allergies & Reactions</h3>
            {profile.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.allergies.map((alg: string, idx: number) => (
                  <span key={idx} className="bg-red-500/10 border border-red-500/25 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded">
                    {alg}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No known allergies (NKDA).</p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Chronic Conditions</h3>
            {profile.chronic_conditions.length > 0 ? (
              <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                {profile.chronic_conditions.map((cond: string, idx: number) => (
                  <li key={idx}>{cond}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">No chronic conditions listed.</p>
            )}
          </div>
        </div>

        {/* Active Medications & Refills */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Active Medications</h3>
          {profile.current_medications.length > 0 ? (
            <div className="space-y-3">
              {profile.current_medications.map((med: string, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs font-bold text-white">{med}</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">Active</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No active prescriptions listed.</p>
          )}
        </div>

      </div>

      {/* Bill summary & payments */}
      <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Hospital Bill & Insurance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 text-xs text-slate-300">
            <p><strong>Insurance Provider:</strong> {profile.insurance_provider || "N/A"}</p>
            <p><strong>Policy Number:</strong> {profile.insurance_policy_number || "N/A"}</p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center md:col-span-2">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Admitted Charges</p>
              <p className="text-xl font-black text-white mt-1">₹4,250.00 <span className="text-xs text-slate-400 font-normal">INR</span></p>
            </div>
            <button className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition">
              Pay Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
