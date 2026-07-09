import React, { useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export const WardBoyDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [status, setStatus] = useState<"available" | "busy" | "break">("available");
  const [tasks, setTasks] = useState([
    { id: 1, type: "transport", description: "Transport Patient (Rahul Sharma) from General Ward Bed 04 to X-Ray Lab", status: "pending", priority: "high" },
    { id: 2, type: "clean", description: "Clean and sanitize Bed ICU-02 (recently discharged)", status: "pending", priority: "medium" },
    { id: 3, type: "equipment", description: "Recover wheelchair from Room 102 and return to ER desk", status: "completed", priority: "low" }
  ]);

  const handleTaskAction = (taskId: number, action: "start" | "done") => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, status: action === "start" ? "in_progress" : "completed" };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6 font-sans max-w-md mx-auto">
      {/* Header card (mobile optimized) */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm text-center">
        <div>
          <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
            WARD LOGISTICS & TRANSPORT
          </span>
          <h2 className="text-lg font-black text-slate-900 mt-2">Wayne Wardboy</h2>
          <p className="text-slate-500 text-xs">Duty Station: Ward ICU/General</p>
        </div>
        
        {/* Status Toggles */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setStatus("available")}
            className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition ${
              status === "available" ? "bg-emerald-600 text-white" : "text-slate-500"
            }`}
          >
            AVAILABLE
          </button>
          <button
            onClick={() => setStatus("busy")}
            className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition ${
              status === "busy" ? "bg-amber-600 text-white" : "text-slate-500"
            }`}
          >
            BUSY
          </button>
          <button
            onClick={() => setStatus("break")}
            className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition ${
              status === "break" ? "bg-slate-700 text-white" : "text-slate-500"
            }`}
          >
            BREAK
          </button>
        </div>
      </div>

      {/* Task Queue */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">Active Task Queue</h3>
          <span className="bg-indigo-50 text-indigo-750 border border-indigo-200/50 px-2 py-0.5 rounded text-[9px] font-bold">
            {tasks.filter(t => t.status !== "completed").length} Pending
          </span>
        </div>

        <div className="space-y-4">
          {tasks.map(t => (
            <div key={t.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                  t.priority === "high" ? "bg-red-100 text-red-700 border border-red-200/50" :
                  t.priority === "medium" ? "bg-amber-100 text-amber-700 border border-amber-200/50" :
                  "bg-slate-200 text-slate-600 border border-slate-300"
                }`}>
                  {t.priority} Priority
                </span>
                <span className="text-[9px] text-slate-500 uppercase font-black">{t.type}</span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed">{t.description}</p>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2 border-t border-slate-200">
                {t.status === "pending" && (
                  <button
                    onClick={() => handleTaskAction(t.id, "start")}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-[10px] transition duration-150 active:scale-97 shadow-sm"
                  >
                    START WORK
                  </button>
                )}
                {t.status === "in_progress" && (
                  <button
                    onClick={() => handleTaskAction(t.id, "done")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-[10px] transition duration-150 active:scale-97 shadow-sm"
                  >
                    MARK COMPLETED
                  </button>
                )}
                {t.status === "completed" && (
                  <span className="w-full text-center text-emerald-650 font-bold text-[10px] py-1 select-none">
                    ✔ TASK DONE
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs hover:border-slate-350 transition duration-150 active:scale-97 shadow-sm"
      >
        Sign Out
      </button>
    </div>
  );
};
