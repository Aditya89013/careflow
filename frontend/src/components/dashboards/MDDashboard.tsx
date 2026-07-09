import React from "react";
import { useAuth } from "../../auth/AuthContext";

export const MDDashboard: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="space-y-8 font-sans">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/60 p-6 rounded-2xl flex justify-between items-center shadow-sm">
        <div>
          <span className="bg-amber-100 border border-amber-200/60 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            EXECUTIVE CLINICAL COMMAND
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-3">Chief Medical Officer (CMO) Dashboard</h2>
          <p className="text-slate-550 text-xs mt-1">Hospital-wide capacity tracking and performance metrics</p>
        </div>
        <button
          onClick={logout}
          className="bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95 shadow-sm"
        >
          Sign Out
        </button>
      </div>

      {/* Main KPI metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bed Occupancy Rate</p>
          <p className="text-3xl font-black text-slate-900 mt-2">75%</p>
          <span className="text-[9px] text-emerald-600 font-bold block mt-1">✔ Target Zone (70-85%)</span>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ventilator Load</p>
          <p className="text-3xl font-black text-slate-900 mt-2">50%</p>
          <span className="text-[9px] text-slate-500 font-bold block mt-1">1 of 2 active</span>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Length of Stay (ALOS)</p>
          <p className="text-3xl font-black text-slate-900 mt-2">4.2 <span className="text-xs text-slate-500 font-normal">days</span></p>
          <span className="text-[9px] text-emerald-650 font-bold block mt-1">↓ 8% from last week</span>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Patient Satisfaction</p>
          <p className="text-3xl font-black text-teal-600 mt-2">94%</p>
          <span className="text-[9px] text-teal-650 font-bold block mt-1">HCAHPS Tier 1</span>
        </div>
      </div>

      {/* Department load meters & incident review */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Department load levels */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-amber-600 uppercase tracking-wider">Department Census Load</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-800 font-bold">Intensive Care Unit (ICU)</span>
                <span className="text-slate-500 font-bold">2 / 3 beds</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: "67%" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-800 font-bold">Emergency Room (ER)</span>
                <span className="text-slate-500 font-bold">1 / 1 beds</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div className="bg-amber-600 h-2 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quality review feed */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Incident Response & Audit Feeds</h3>
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">EMS Alert Dispatched</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Cardiac Arrest Alert (Level 1)</p>
              </div>
              <span className="text-[9px] bg-red-100 text-red-700 border border-red-200/50 px-2 py-0.5 rounded font-bold uppercase">STAT</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">Manual Bed Override</p>
                <p className="text-[10px] text-slate-500 mt-0.5">ICU-03 allocated by Sarah Smith (Reason: Urgent Sepsis Transit)</p>
              </div>
              <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200/50 px-2 py-0.5 rounded font-bold uppercase">Audited</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
