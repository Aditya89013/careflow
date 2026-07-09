import React, { useState } from "react";
import type { Shift } from "../App";

interface ShiftsScreenProps {
  shifts: Shift[];
  onGenerateShifts: (payload: any) => Promise<void>;
  onSwapRequest: (payload: any) => Promise<void>;
  userRole?: string;
}

export const ShiftsScreen: React.FC<ShiftsScreenProps> = ({
  shifts,
  onGenerateShifts,
  onSwapRequest,
  userRole
}) => {
  const [startDate, setStartDate] = useState("2026-07-04");
  const [endDate, setEndDate] = useState("2026-07-06");
  const [generating, setGenerating] = useState(false);

  // Swap form states
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [targetStaffId, setTargetStaffId] = useState("s2");
  const [swapReason, setSwapReason] = useState("");
  const [swapStatusMsg, setSwapStatusMsg] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await onGenerateShifts({ start_date: startDate, end_date: endDate });
    } finally {
      setGenerating(false);
    }
  };

  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftId) return;
    await onSwapRequest({
      shift_id: selectedShiftId,
      target_staff_member_id: targetStaffId,
      reason: swapReason
    });
    setSwapStatusMsg("Shift swap registered. Awaiting manager approval.");
    setSelectedShiftId("");
    setSwapReason("");
    setTimeout(() => setSwapStatusMsg(""), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Shift listings column */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Clinician Shift Schedule</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="py-2">Staff Member</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Shift Type</th>
                  <th className="py-2">Constraint/Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">No shifts scheduled. Run optimizer to populate.</td>
                  </tr>
                ) : (
                  shifts.map(shift => (
                    <tr key={shift.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-semibold text-gray-900">{shift.staff_name}</td>
                      <td className="py-3 text-gray-500 tabular-nums">{shift.shift_date}</td>
                      <td className="py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          shift.type === "day" ? "bg-blue-100 text-blue-700" : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {shift.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500">{shift.rationale || "Scheduled shift."}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Optimizer & Swap forms column */}
      <div className="space-y-6">
        {/* Scheduler run form */}
        {(userRole === "admin" || userRole === "hospital_owner") && (
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">Scheduling Optimizer</h2>
              <p className="text-gray-400 text-xs mt-1">Generate fatigue-aware schedules automatically.</p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="startDate" className="text-xs font-bold text-gray-400 uppercase">Start Date</label>
                  <input 
                    id="startDate"
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    required 
                    className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:border-blue-500 transition text-sm text-gray-700 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="endDate" className="text-xs font-bold text-gray-400 uppercase">End Date</label>
                  <input 
                    id="endDate"
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    required 
                    className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:border-blue-500 transition text-sm text-gray-700 bg-white"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={generating}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-150 active:scale-95 shadow-sm shadow-blue-200"
              >
                {generating ? "Optimizing shift matrices..." : "Run Schedule Optimizer"}
              </button>
            </form>
          </div>
        )}

        {/* Swap request form */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">Shift Swap Request</h2>
            <p className="text-gray-400 text-xs mt-1">Submit shift swap requests for peer review.</p>
          </div>

          <form onSubmit={handleSwapSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="shiftSelect" className="text-xs font-bold text-gray-400 uppercase">Select Active Shift</label>
              <select 
                id="shiftSelect"
                value={selectedShiftId} 
                onChange={e => setSelectedShiftId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none text-gray-700 bg-white text-sm"
              >
                <option value="">-- Choose shift --</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.staff_name} - {s.shift_date} ({s.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="targetStaff" className="text-xs font-bold text-gray-400 uppercase">Target Backup Staff</label>
              <select 
                id="targetStaff"
                value={targetStaffId} 
                onChange={e => setTargetStaffId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none text-gray-700 bg-white text-sm"
              >
                <option value="s1">Sarah Smith (Pulmonology)</option>
                <option value="s2">John Connor (ICU Nurse)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="swapReason" className="text-xs font-bold text-gray-400 uppercase">Reason for Swap</label>
              <textarea 
                id="swapReason"
                rows={2} 
                value={swapReason} 
                onChange={e => setSwapReason(e.target.value)}
                placeholder="Personal reasons, fatigue recovery..."
                required 
                className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:outline-none text-xs text-gray-700"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-150 active:scale-95 shadow-sm shadow-indigo-200"
            >
              Submit Swap Request
            </button>
          </form>

          {swapStatusMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-xs text-center font-semibold">
              ✔ {swapStatusMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
