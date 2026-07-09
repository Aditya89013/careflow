import React, { useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export const LabTechDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [orders, setOrders] = useState([
    { id: "lab-101", patientName: "Rahul Sharma", testName: "Complete Blood Count (CBC)", status: "pending", date: "2026-07-04" },
    { id: "lab-102", patientName: "John Connor", testName: "Arterial Blood Gas (PaO2)", status: "pending", date: "2026-07-04" },
    { id: "lab-103", patientName: "Sarah Smith", testName: "Basic Metabolic Panel (BMP)", status: "resulted", date: "2026-07-03" }
  ]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Results inputs
  const [hb, setHb] = useState("");
  const [wbc, setWbc] = useState("");
  const [plt, setPlt] = useState("");

  const handleResultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setOrders(prev => prev.map(o => {
      if (o.id === selectedOrder.id) {
        return { ...o, status: "resulted" };
      }
      return o;
    }));

    alert(`Results for order ${selectedOrder.id} submitted:\nHb: ${hb} g/dL, WBC: ${wbc} k/uL, Plt: ${plt} k/uL`);
    setSelectedOrder(null);
    setHb("");
    setWbc("");
    setPlt("");
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/60 p-6 rounded-2xl flex justify-between items-center shadow-sm">
        <div>
          <span className="bg-emerald-100 border border-emerald-200/60 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            LABORATORY INFORMATION SYSTEM (LIS)
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-3">Pathology Diagnostics & Results Entry</h2>
          <p className="text-slate-555 text-xs mt-1">Verify orders and upload hematology/biochemistry reports</p>
        </div>
        <button
          onClick={logout}
          className="bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95 shadow-sm"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Orders list */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-emerald-600 uppercase tracking-wider">Pending Diagnostics</h3>
          <div className="space-y-3">
            {orders.map(o => (
              <button
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  selectedOrder?.id === o.id
                    ? "bg-emerald-55/60 border-emerald-300 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-400">{o.id}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                    o.status === "pending" ? "bg-amber-100 text-amber-700 border border-amber-250" : "bg-emerald-100 text-emerald-700 border border-emerald-250"
                  }`}>
                    {o.status}
                  </span>
                </div>
                <h4 className={`text-xs font-bold ${selectedOrder?.id === o.id ? "text-emerald-950" : "text-slate-800"} mt-2`}>{o.patientName}</h4>
                <p className="text-[10px] text-slate-500 mt-1">{o.testName}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Results Entry Panel */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            selectedOrder.status === "pending" ? (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-[9px] bg-slate-50 border border-slate-200 text-slate-550 font-black uppercase tracking-wider px-2 py-0.5 rounded">
                    ORDER WORKLIST
                  </span>
                  <h3 className="text-base font-bold text-slate-800 mt-2">Enter Results for {selectedOrder.patientName}</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedOrder.testName} • {selectedOrder.id}</p>
                </div>

                <form onSubmit={handleResultSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Hemoglobin (Hb, g/dL)</label>
                      <input
                        type="text"
                        required
                        placeholder="Normal: 12-16"
                        value={hb}
                        onChange={e => setHb(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">WBC Count (k/uL)</label>
                      <input
                        type="text"
                        required
                        placeholder="Normal: 4-11"
                        value={wbc}
                        onChange={e => setWbc(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Platelets (k/uL)</label>
                      <input
                        type="text"
                        required
                        placeholder="Normal: 150-450"
                        value={plt}
                        onChange={e => setPlt(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition duration-150 active:scale-97 shadow-sm"
                  >
                    Submit & Authorize Pathology Report
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl shadow-sm text-center py-12 text-slate-400 italic text-xs">
                Results for this order have already been signed off and pushed to the patient's EHR.
              </div>
            )
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 p-12 rounded-2xl text-center text-slate-400 italic text-xs">
              Select an active lab order from the worklist to log diagnostic parameters.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
