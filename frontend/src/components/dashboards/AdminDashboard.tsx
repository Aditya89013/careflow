import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export const AdminDashboard: React.FC = () => {
  const { token, logout } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");

  const fetchAdminData = async () => {
    try {
      const lRes = await fetch("http://localhost:3001/api/v1/audit-logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (lRes.ok) setLogs(await lRes.json());

      const sRes = await fetch("http://localhost:3001/api/v1/staff", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sRes.ok) setStaff(await sRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "PATIENT_INTAKE":
        return (
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
            INTAKE
          </span>
        );
      case "PATIENT_DISCHARGE":
        return (
          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
            DISCHARGE
          </span>
        );
      case "CLINICAL_HISTORY_LOOKUP":
        return (
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
            EMR LOOKUP (HIPAA)
          </span>
        );
      case "SHIFTS_GENERATED":
        return (
          <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
            SOLVER GENERATION
          </span>
        );
      case "SHIFT_SWAP_REQUEST":
        return (
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
            SWAP REQUEST
          </span>
        );
      default:
        return (
          <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
            SYSTEM EVENT
          </span>
        );
    }
  };

  const renderPrettyJson = (obj: any) => {
    if (!obj) return null;
    const jsonStr = JSON.stringify(obj, null, 2);
    
    // Match keys, strings, numbers, booleans, null
    const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
    
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;
    let index = 0;
    
    while ((match = regex.exec(jsonStr)) !== null) {
      if (match.index > lastIdx) {
        parts.push(jsonStr.substring(lastIdx, match.index));
      }
      
      const value = match[0];
      let className = "text-amber-500 font-mono"; // numbers/booleans
      
      if (value.startsWith('"')) {
        if (value.endsWith(':')) {
          className = "text-indigo-400 font-bold font-mono"; // keys
        } else {
          className = "text-emerald-400 font-mono"; // string values
        }
      } else if (/true|false/.test(value)) {
        className = "text-orange-400 font-bold font-mono";
      } else if (/null/.test(value)) {
        className = "text-rose-400 font-bold font-mono";
      }
      
      parts.push(
        <span key={index++} className={className}>
          {value}
        </span>
      );
      
      lastIdx = regex.lastIndex;
    }
    
    if (lastIdx < jsonStr.length) {
      parts.push(jsonStr.substring(lastIdx));
    }
    
    return (
      <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-850/80 text-[10px] text-slate-400 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
        {parts}
      </pre>
    );
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400 font-bold text-xs">Loading Administrator Console...</div>;
  }

  const filteredLogs = logs.filter(l => {
    const matchesAction = l.action.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesPayload = l.payload_after ? JSON.stringify(l.payload_after).toLowerCase().includes(filterQuery.toLowerCase()) : false;
    const matchesId = l.id ? l.id.toLowerCase().includes(filterQuery.toLowerCase()) : false;
    return matchesAction || matchesPayload || matchesId;
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl flex justify-between items-center shadow-lg">
        <div>
          <span className="bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            OPERATIONS & SYSTEMS CONTROL
          </span>
          <h2 className="text-xl font-black text-white mt-3">CareFlow Systems Administrator</h2>
          <p className="text-slate-400 text-xs mt-1">Audit trail surveillance and user account profiles</p>
        </div>
        <button
          onClick={logout}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Staff Management list */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4 h-fit">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Active Staff Profiles ({staff.length})</h3>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {staff.map(s => (
              <div key={s.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 hover:border-slate-800 transition duration-150 space-y-1">
                <h4 className="text-xs font-bold text-white">{s.first_name} {s.last_name}</h4>
                <p className="text-[10px] text-slate-400 font-semibold">{s.email || "No email listed"}</p>
                <div className="flex justify-between items-center pt-2 text-[9px] uppercase font-bold tracking-wider">
                  <span className="text-indigo-400">{s.role.replace("_", " ")}</span>
                  <span className="text-slate-500">{s.specialty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Trail inspector */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-850 pb-4 gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">System Audit Logs ({filteredLogs.length})</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Real-time database mutations & access logs</p>
            </div>
            
            {/* Filter Input */}
            <input
              type="text"
              placeholder="Search logs by action, ID, payload..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500 transition w-full sm:w-64 placeholder-slate-600"
            />
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredLogs.map((l, idx) => (
              <div key={l.id || idx} className="bg-slate-950 p-5 rounded-xl border border-slate-855 hover:border-slate-800 transition duration-150 space-y-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-mono text-slate-500">{l.id || `log-${idx}`}</span>
                  <span className="text-slate-400 font-medium">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-white tracking-wide uppercase">
                    {l.action.replace(/_/g, " ")}
                  </h4>
                  {getActionBadge(l.action)}
                </div>

                {l.payload_after && renderPrettyJson(l.payload_after)}
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-16">No matching audit logs found.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
