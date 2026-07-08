import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { API_URL } from "../../config";

export const NurseDashboard: React.FC = () => {
  const { token, logout } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [hr, setHr] = useState("");
  const [bp, setBp] = useState("");
  const [o2, setO2] = useState("");
  const [oxygenSource, setOxygenSource] = useState<"SpO2" | "PaO2">("SpO2");
  const [isDelirious, setIsDelirious] = useState(false);
  const [fio2, setFio2] = useState("21");
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

  const handleLogVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const res = await fetch(`${API_URL}/patients/${selectedPatient.id}/vitals`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          hr,
          bp,
          o2,
          oxygenation_source: oxygenSource,
          is_delirious: isDelirious,
          fio2: parseFloat(fio2) / 100
        })
      });

      if (res.ok) {
        const updatedPatient = await res.json();
        setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
        setSelectedPatient(updatedPatient);
        alert(`Vitals successfully logged and synchronized to server for patient: ${selectedPatient.first_name} ${selectedPatient.last_name}`);
      } else {
        alert("Failed to synchronize vitals to server.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error synchronizing vitals to server.");
    }
    
    // Clear inputs
    setHr("");
    setBp("");
    setO2("");
    setIsDelirious(false);
    setFio2("21");
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400 font-bold text-xs">Loading Nurse Console...</div>;
  }

  const activePatients = patients.filter(p => p.status !== "discharged");

  return (
    <div className="space-y-8 font-sans">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-rose-900/30 to-rose-950/15 border border-rose-800/40 p-6 rounded-2xl flex justify-between items-center shadow-lg">
        <div>
          <span className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            NURSING & WARD CONSOLE
          </span>
          <h2 className="text-xl font-black text-white mt-3">Shift Task Manager & Vitals Charting</h2>
          <p className="text-slate-400 text-xs mt-1">Record vitals and verify MAR ticks</p>
        </div>
        <button
          onClick={logout}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Patient Selection list */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-rose-400 uppercase tracking-wider">Assigned Ward Patients</h3>
          <div className="space-y-3">
            {activePatients.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedPatient(p)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  selectedPatient?.id === p.id
                    ? "bg-rose-950/30 border-rose-500/60"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white">{p.first_name} {p.last_name}</h4>
                  <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/25 px-1.5 py-0.5 rounded font-black uppercase">
                    Bed: {p.bed_number || "Unallocated"}
                  </span>
                </div>
                {p.vitals ? (
                  <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-400 mt-3 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                    <div>HR: <strong className="text-white">{p.vitals.hr}</strong></div>
                    <div>BP: <strong className="text-white">{p.vitals.bp}</strong></div>
                    <div>SpO2: <strong className="text-white">{p.vitals.o2}</strong></div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic mt-3">No vitals logged yet today.</p>
                )}
              </button>
            ))}
            {activePatients.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-6">No active patients on unit.</p>
            )}
          </div>
        </div>

        {/* Vitals Form & MAR Ticks */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatient ? (
            <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-6">
              
              {/* EMR header */}
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  BEDSIDE CHARTING
                </span>
                <h3 className="text-base font-bold text-white mt-2">{selectedPatient.first_name} {selectedPatient.last_name}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">{selectedPatient.upid || "Legacy ID record"}</p>
              </div>

              {/* Vitals Charting Form */}
              <form onSubmit={handleLogVitals} className="space-y-4">
                <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Log Patient Vitals</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 78"
                      value={hr}
                      onChange={e => setHr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">BP (sys/dia)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 120/80"
                      value={bp}
                      onChange={e => setBp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">O2 Saturation (%)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 98%"
                      value={o2}
                      onChange={e => setO2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Oxygenation Source</label>
                    <select
                      value={oxygenSource}
                      onChange={e => setOxygenSource(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="SpO2">SpO2 (Pulse Oximetry)</option>
                      <option value="PaO2">PaO2 (Arterial Blood Gas)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">FiO2 Level (%)</label>
                    <input
                      type="number"
                      min="21"
                      max="100"
                      required
                      placeholder="e.g. 21"
                      value={fio2}
                      onChange={e => setFio2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-5">
                    <input
                      id="deliriousCheck"
                      type="checkbox"
                      checked={isDelirious}
                      onChange={e => setIsDelirious(e.target.checked)}
                      className="rounded border-slate-800 text-rose-500 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                    />
                    <label htmlFor="deliriousCheck" className="text-xs font-bold text-slate-300">Delirium Screen Flag</label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition duration-150"
                >
                  Record vital observations & sync chart
                </button>
              </form>

              {/* Medication administration checks */}
              <div className="border-t border-slate-800/80 pt-6 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Medication Administration Record (MAR) Checklist</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-white">Paracetamol 500mg (oral)</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Due: Morning Shift (09:00)</p>
                    </div>
                    <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-[10px] font-black px-2.5 py-1 rounded">
                      ADMINISTER
                    </button>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 opacity-60">
                    <div>
                      <p className="text-xs font-bold text-white">Pantocid 40mg (IV)</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Administered at 08:15 by John Connor</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">✔ DONE</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800/80 p-12 rounded-2xl text-center text-slate-500 italic text-xs">
              Select a patient from the assigned list to log vitals or review their MAR records.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
