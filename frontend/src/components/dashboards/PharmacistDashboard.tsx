import React, { useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export const PharmacistDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [prescriptions, setPrescriptions] = useState([
    { id: "rx-201", patientName: "Rahul Sharma", physician: "Dr. Rajesh Kumar", drug: "Paracetamol 500mg", quantity: 30, status: "pending", priority: "normal" },
    { id: "rx-202", patientName: "John Connor", physician: "Dr. Arthur", drug: "Propofol 20ml", quantity: 5, status: "pending", priority: "STAT" },
    { id: "rx-203", patientName: "Sarah Smith", physician: "Dr. Rajesh Kumar", drug: "Pantocid 40mg", quantity: 10, status: "dispensed", priority: "normal" }
  ]);
  const [inventory, setInventory] = useState([
    { id: "inv-1", name: "Paracetamol 500mg", stock: 250, threshold: 50, unit: "tablets" },
    { id: "inv-2", name: "Propofol 20ml", stock: 15, threshold: 20, unit: "vials" }, // Low stock
    { id: "inv-3", name: "Pantocid 40mg", stock: 120, threshold: 30, unit: "vials" }
  ]);

  const handleDispense = (rxId: string, drugName: string, quantity: number) => {
    // Check stock
    const item = inventory.find(i => i.name === drugName);
    if (item && item.stock < quantity) {
      alert(`Insufficient stock of ${drugName} to dispense!`);
      return;
    }

    setPrescriptions(prev => prev.map(p => {
      if (p.id === rxId) return { ...p, status: "dispensed" };
      return p;
    }));

    setInventory(prev => prev.map(i => {
      if (i.name === drugName) {
        return { ...i, stock: i.stock - quantity };
      }
      return i;
    }));

    alert(`Dispensed ${quantity} ${item?.unit} of ${drugName} for Rx ${rxId}`);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-violet-900/30 to-violet-950/15 border border-violet-800/40 p-6 rounded-2xl flex justify-between items-center shadow-lg">
        <div>
          <span className="bg-violet-500/10 border border-violet-500/25 text-violet-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            PHARMACY MANAGEMENT CONSOLE
          </span>
          <h2 className="text-xl font-black text-white mt-3">Prescription Verification & Dispensing</h2>
          <p className="text-slate-400 text-xs mt-1">Review clinical orders and manage formulary stocks</p>
        </div>
        <button
          onClick={logout}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Prescription Queue */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-violet-400 uppercase tracking-wider">Prescription Dispensing Queue</h3>
          
          <div className="space-y-4">
            {prescriptions.map(p => (
              <div key={p.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-mono text-slate-500">{p.id}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                      p.priority === "STAT" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}>
                      {p.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1">{p.patientName}</h4>
                  <p className="text-xs text-violet-300 font-semibold">{p.drug} <span className="text-slate-500">x{p.quantity}</span></p>
                  <p className="text-[9px] text-slate-500">Ordered by: {p.physician}</p>
                </div>

                <div>
                  {p.status === "pending" ? (
                    <button
                      onClick={() => handleDispense(p.id, p.drug, p.quantity)}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition duration-150 active:scale-95"
                    >
                      Verify & Dispense
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-bold uppercase">✔ DISPENSED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulary Stock Tracker */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-violet-400 uppercase tracking-wider">Formulary Stock levels</h3>
          
          <div className="space-y-3">
            {inventory.map(i => {
              const lowStock = i.stock < i.threshold;
              return (
                <div key={i.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-white">{i.name}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Min Threshold: {i.threshold} {i.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${lowStock ? "text-red-500" : "text-white"}`}>
                      {i.stock}
                    </p>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">{i.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
