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
      <div className="bg-gradient-to-r from-violet-50 to-violet-100/50 border border-violet-200/60 p-6 rounded-2xl flex justify-between items-center shadow-sm">
        <div>
          <span className="bg-violet-100 border border-violet-200/60 text-violet-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            PHARMACY MANAGEMENT CONSOLE
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-3">Prescription Verification & Dispensing</h2>
          <p className="text-slate-550 text-xs mt-1">Review clinical orders and manage formulary stocks</p>
        </div>
        <button
          onClick={logout}
          className="bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95 shadow-sm"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Prescription Queue */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-violet-600 uppercase tracking-wider">Prescription Dispensing Queue</h3>
          
          <div className="space-y-4">
            {prescriptions.map(p => (
              <div key={p.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-mono text-slate-400">{p.id}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                      p.priority === "STAT" ? "bg-red-100 text-red-700 border border-red-200/55" : "bg-slate-100 text-slate-600 border border-slate-250"
                    }`}>
                      {p.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mt-1">{p.patientName}</h4>
                  <p className="text-xs text-violet-750 font-semibold">{p.drug} <span className="text-slate-400">x{p.quantity}</span></p>
                  <p className="text-[9px] text-slate-500 font-medium">Ordered by: {p.physician}</p>
                </div>

                <div>
                  {p.status === "pending" ? (
                    <button
                      onClick={() => handleDispense(p.id, p.drug, p.quantity)}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition duration-150 active:scale-97 shadow-sm"
                    >
                      Verify & Dispense
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-650 font-bold uppercase">✔ DISPENSED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulary Stock Tracker */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-violet-600 uppercase tracking-wider">Formulary Stock levels</h3>
          
          <div className="space-y-3">
            {inventory.map(i => {
              const lowStock = i.stock < i.threshold;
              return (
                <div key={i.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{i.name}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Min Threshold: {i.threshold} {i.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${lowStock ? "text-red-600" : "text-slate-900"}`}>
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
