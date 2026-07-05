import React from "react";
import { useAuth } from "../../auth/AuthContext";

export const MDDashboard: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="space-y-8 font-sans">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-amber-900/30 to-yellow-950/10 border border-amber-800/40 p-6 rounded-2xl flex justify-between items-center shadow-lg">
        <div>
          <span className="bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            EXECUTIVE CLINICAL COMMAND
          </span>
          <h2 className="text-xl font-black text-white mt-3">Chief Medical Officer (CMO) Dashboard</h2>
          <p className="text-slate-400 text-xs mt-1">Hospital-wide capacity tracking and performance metrics</p>
        </div>
        <button
          onClick={logout}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95"
        >
          Sign Out
        </button>
      </div>

      {/* Main KPI metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bed Occupancy Rate</p>
          <p className="text-3xl font-black text-white mt-2">75%</p>
          <span className="text-[9px] text-emerald-400 font-bold block mt-1">✔ Target Zone (70-85%)</span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ventilator Load</p>
          <p className="text-3xl font-black text-white mt-2">50%</p>
          <span className="text-[9px] text-slate-500 font-bold block mt-1">1 of 2 active</span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Length of Stay (ALOS)</p>
          <p className="text-3xl font-black text-white mt-2">4.2 <span className="text-xs text-slate-400 font-normal">days</span></p>
          <span className="text-[9px] text-emerald-400 font-bold block mt-1">↓ 8% from last week</span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Patient Satisfaction</p>
          <p className="text-3xl font-black text-teal-400 mt-2">94%</p>
          <span className="text-[9px] text-teal-500 font-bold block mt-1">HCAHPS Tier 1</span>
        </div>
      </div>

      {/* Department load meters & incident review */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Department load levels */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">Department Census Load</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white font-bold">Intensive Care Unit (ICU)</span>
                <span className="text-slate-400 font-bold">2 / 3 beds</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: "67%" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white font-bold">Emergency Room (ER)</span>
                <span className="text-slate-400 font-bold">1 / 1 beds</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                <div className="bg-amber-600 h-2 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quality review feed */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Incident Response & Audit Feeds</h3>
          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-white">EMS Alert Dispatched</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Cardiac Arrest Alert (Level 1)</p>
              </div>
              <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase">STAT</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-white">Manual Bed Override</p>
                <p className="text-[10px] text-slate-500 mt-0.5">ICU-03 allocated by Sarah Smith (Reason: Urgent Sepsis Transit)</p>
              </div>
              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">Audited</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
