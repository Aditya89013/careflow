import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { API_URL } from "../../config";

export const DoctorDashboard: React.FC = () => {
  const { token, logout } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clinicalNote, setClinicalNote] = useState("");
  const [prescription, setPrescription] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPatients(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [token]);

  const handleSelectPatient = async (p: any) => {
    setSelectedPatient(p);
    setHistoryData(null);
    if (!p.upid) return;

    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/patients/${p.upid}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setHistoryData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateEMR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    // Allergy check CDS logic
    if (prescription && historyData && historyData.allergies) {
      const allergyMatch = historyData.allergies.find((allergy: string) => 
        prescription.toLowerCase().includes(allergy.toLowerCase())
      );
      if (allergyMatch) {
        const confirmPrescribe = window.confirm(
          `⚠️ WARNING: CLINICAL ALLERGY ALERT!\n` +
          `Patient ${selectedPatient.first_name} is allergic to: ${allergyMatch.toUpperCase()}.\n` +
          `You are prescribing: "${prescription}".\n\n` +
          `Do you want to override this warning and force dispatch this order? (Audited Break-Glass)`
        );
        if (!confirmPrescribe) {
          return; // cancel submit
        }
      }
    }

    // Simple EMR updates in simulation - push logs and updates
    alert(`EMR Clinical note saved for patient ${selectedPatient.first_name}.\nPrescriptions ordered: ${prescription || "None"}`);
    setClinicalNote("");
    setPrescription("");
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400 font-bold text-xs">Loading Physician Console...</div>;
  }

  const activePatients = patients.filter(p => p.status !== "discharged");

  return (
    <div className="space-y-8 font-sans">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-200/60 p-6 rounded-2xl flex justify-between items-center shadow-sm">
        <div>
          <span className="bg-indigo-100 border border-indigo-200/60 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            PHYSICIAN CLINICAL CONSOLE
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-3">EMR & Care Team Workspace</h2>
          <p className="text-slate-500 text-xs mt-1">Manage active caseloads and prescriptions</p>
        </div>
        <button
          onClick={logout}
          className="bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95 shadow-sm"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Caseload list */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Active Caseload</h3>
          <div className="space-y-3">
            {activePatients.map((p: any) => (
              <button
                key={p.id}
                onClick={() => handleSelectPatient(p)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  selectedPatient?.id === p.id
                    ? "bg-indigo-50/60 border-indigo-300 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className={`text-xs font-bold ${selectedPatient?.id === p.id ? "text-indigo-900" : "text-slate-800"}`}>{p.first_name} {p.last_name}</h4>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-200/60 px-1.5 py-0.5 rounded font-black uppercase">
                    {p.triage_level.split("_")[1]}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{p.upid || "Legacy ID"}</p>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
                  <span>Bed: {p.bed_number || "Unallocated"}</span>
                  <span>Dept: {p.required_department_code}</span>
                </div>
              </button>
            ))}
            {activePatients.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-6">No active patients assigned.</p>
            )}
          </div>
        </div>

        {/* EMR workspace / history */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatient ? (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
              
              {/* EMR header */}
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[9px] bg-slate-50 border border-slate-200 text-slate-500 font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  UPID CLINICAL RECORD
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-2">{selectedPatient.first_name} {selectedPatient.last_name}</h3>
                <p className="text-xs text-slate-550 mt-1 font-mono">{selectedPatient.upid || "No Universal Identity record linked."}</p>
              </div>

              {/* Universal Patient History details */}
              {loadingHistory ? (
                <div className="text-xs text-slate-500 italic">Querying cross-hospital health registry...</div>
              ) : historyData ? (
                <div className="grid grid-cols-2 gap-6 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Cross-Hospital Allergies</h4>
                    {historyData.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {historyData.allergies.map((a: string, i: number) => (
                          <span key={i} className="bg-red-100 text-red-700 border border-red-200/50 px-2 py-0.5 rounded text-[9px] font-bold">{a}</span>
                        ))}
                      </div>
                    ) : <p className="italic text-slate-400">None recorded.</p>}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Chronic Conditions</h4>
                    {historyData.chronic_conditions.length > 0 ? (
                      <p className="font-semibold text-slate-800">{historyData.chronic_conditions.join(", ")}</p>
                    ) : <p className="italic text-slate-400">No chronic conditions listed.</p>}
                  </div>
                </div>
              ) : null}

              {/* Vitals overview */}
              {selectedPatient.vitals && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Session Vitals (Logged by Nurse)</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">HR</span>
                      <strong className="text-sm font-black text-rose-600">{selectedPatient.vitals.hr} bpm</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">BP</span>
                      <strong className="text-sm font-black text-indigo-600">{selectedPatient.vitals.bp} mmHg</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">SpO2</span>
                      <strong className="text-sm font-black text-emerald-600">{selectedPatient.vitals.o2}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Treatment editor */}
              <form onSubmit={handleUpdateEMR} className="space-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">Physician SOAP Clinical Notes</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Subjective, Objective, Assessment, Plan..."
                    value={clinicalNote}
                    onChange={e => setClinicalNote(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">Order Prescription / Medications</label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol 500mg, 1 tablet twice daily"
                    value={prescription}
                    onChange={e => setPrescription(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition duration-150 active:scale-97 shadow-sm"
                >
                  Save SOAP Note & Dispatch Rx Order
                </button>
              </form>

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 p-12 rounded-2xl text-center text-slate-400 italic text-xs">
              Select a patient from the caseload to open EMR console and clinical history registry.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
