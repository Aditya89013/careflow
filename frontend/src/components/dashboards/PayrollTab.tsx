import React, { useState, useEffect } from "react";
import { API_URL } from "../../config";

interface EmployeePayroll {
  staff_member_id: string;
  first_name: string;
  last_name: string;
  role: string;
  hourly_rate: number;
  overtime_multiplier: number;
  base_hours: number;
  overtime_hours: number;
  base_pay: number;
  overtime_pay: number;
  net_pay: number;
  compliance_alerts: string[];
  is_compliant: boolean;
}

interface PayrollRun {
  id: string;
  start_date: string;
  end_date: string;
  processed_at: string;
  total_amount: string;
  status: string;
}

export const PayrollTab: React.FC = () => {
  const token = localStorage.getItem("cf_token");
  
  // Date Range (default: current month start/end)
  const getInitialDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${lastDay}`
    };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);

  // States
  const [summaryData, setSummaryData] = useState<{
    total_gross_payout: number;
    employees: EmployeePayroll[];
  } | null>(null);

  const [history, setHistory] = useState<PayrollRun[]>([]);
  
  // Contract editing modal
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>("");
  const [editMultiplier, setEditMultiplier] = useState<string>("1.5");
  const [editLimit, setEditLimit] = useState<string>("40");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);



  // Fetch summary calculation
  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/payroll/summary?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to calculate payroll summary.");
      }
    } catch (err: any) {
      setError(err.message || "Connection error calculating payroll.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch processed history
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/payroll/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load payroll history:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchHistory();
  }, [startDate, endDate]);

  // Handle processing current simulation
  const handleProcessPayroll = async () => {
    if (!summaryData || summaryData.employees.length === 0) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      start_date: startDate,
      end_date: endDate,
      total_amount: summaryData.total_gross_payout,
      records: summaryData.employees.map(emp => ({
        staff_member_id: emp.staff_member_id,
        base_hours: emp.base_hours,
        overtime_hours: emp.overtime_hours,
        base_pay: emp.base_pay,
        overtime_pay: emp.overtime_pay,
        net_pay: emp.net_pay
      }))
    };

    try {
      const res = await fetch(`${API_URL}/payroll/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccess("Payroll successfully processed and disbursed for all clinicians.");
        fetchHistory();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to process payroll.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit processed payroll.");
    } finally {
      setActionLoading(false);
    }
  };

  // Open pay rate edit modal
  const openEditModal = (emp: EmployeePayroll) => {
    setEditingStaffId(emp.staff_member_id);
    setEditRate(emp.hourly_rate.toString());
    setEditMultiplier(emp.overtime_multiplier.toString());
    setEditLimit("40");
  };

  // Save staff pay contract
  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId || !editRate) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/payroll/contract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_member_id: editingStaffId,
          hourly_rate: parseFloat(editRate),
          overtime_multiplier: parseFloat(editMultiplier),
          weekly_hours_limit: parseInt(editLimit)
        })
      });

      if (res.ok) {
        setEditingStaffId(null);
        fetchSummary();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to update contract.");
      }
    } catch (err: any) {
      setError(err.message || "Connection error saving contract.");
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate active compliance flags
  const totalFlags = summaryData?.employees.reduce((acc, emp) => acc + emp.compliance_alerts.length, 0) || 0;

  return (
    <div className="space-y-8 font-sans text-slate-800">
      
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Shift Tracking & Payroll Engine</h2>
          <p className="text-xs text-slate-500">Reconcile clinical rosters, compute overtime, and audit safety compliance.</p>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold px-1">Start Date</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="bg-transparent border-none outline-none font-medium px-1 py-0.5 text-slate-800"
            />
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold px-1">End Date</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="bg-transparent border-none outline-none font-medium px-1 py-0.5 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg p-3">
          {success}
        </div>
      )}

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Gross Payout</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">${summaryData.total_gross_payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Disbursement pool for date range</p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Salaries</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              ${summaryData.employees.reduce((acc, emp) => acc + emp.base_pay, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Regular contract clinical hours</p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overtime Premiums</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              ${summaryData.employees.reduce((acc, emp) => acc + emp.overtime_pay, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Paid at rate multipliers (e.g. 1.5x)</p>
          </div>

          <div className={`border rounded-xl p-4 shadow-sm ${totalFlags > 0 ? "border-amber-200 bg-amber-50/30" : "border-slate-200 bg-white"}`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accreditation Safety Flags</span>
            <h3 className={`text-2xl font-bold mt-1 ${totalFlags > 0 ? "text-amber-600" : "text-slate-900"}`}>{totalFlags}</h3>
            <p className="text-[10px] text-slate-500 mt-1">JCI / NABH compliance alerts</p>
          </div>
        </div>
      )}

      {/* Main Payslip Calculation Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Clinician Timesheet & Salary Breakdown</h3>
          {summaryData && summaryData.employees.length > 0 && (
            <button
              onClick={handleProcessPayroll}
              disabled={actionLoading || loading}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-all disabled:opacity-50"
            >
              {actionLoading ? "Processing..." : "Approve & Run Payroll"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Calculating timesheets and auditing compliance...</div>
        ) : !summaryData || summaryData.employees.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No active staff members loaded for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="p-3">Compliance</th>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-right">Base Hours</th>
                  <th className="p-3 text-right">Overtime Hours</th>
                  <th className="p-3 text-right">Hourly Rate</th>
                  <th className="p-3 text-right">Gross Salary</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.employees.map((emp) => (
                  <tr key={emp.staff_member_id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                    
                    {/* Compliance Indicator */}
                    <td className="p-3">
                      {emp.is_compliant ? (
                        <div className="flex items-center space-x-1 text-emerald-600 font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-[10px]">Compliant</span>
                        </div>
                      ) : (
                        <div className="relative group flex items-center space-x-1 text-amber-600 font-medium cursor-help">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-[10px] underline decoration-dotted">Warning</span>
                          
                          {/* Compliance Tooltip */}
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 bg-slate-900 text-white text-[10px] rounded-lg p-3.5 shadow-lg z-20 space-y-1.5 leading-relaxed">
                            <p className="font-bold text-amber-400 uppercase tracking-wider text-[8px]">Safety Rule Violations:</p>
                            {emp.compliance_alerts.map((alert, index) => (
                              <p key={index}>• {alert}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Staff Details */}
                    <td className="p-3 font-semibold text-slate-900">{emp.first_name} {emp.last_name}</td>
                    <td className="p-3 text-slate-500 capitalize">{emp.role.replace("_", " ")}</td>
                    <td className="p-3 text-right">{emp.base_hours}h</td>
                    <td className="p-3 text-right">{emp.overtime_hours}h</td>
                    <td className="p-3 text-right">${emp.hourly_rate.toFixed(2)}/hr</td>
                    
                    {/* Salary Breakdown */}
                    <td className="p-3 text-right font-bold text-slate-950">
                      ${emp.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Contract Action */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="text-slate-500 hover:text-slate-900 font-bold border border-slate-200 hover:border-slate-300 py-1 px-2 rounded transition-all text-[10px]"
                      >
                        Adjust Contract
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roster Contract Settings Modal */}
      {editingStaffId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeIn">
          <form 
            onSubmit={handleSaveContract} 
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl space-y-4"
          >
            <div>
              <h4 className="text-sm font-bold text-slate-950">Adjust Clinician Employment Contract</h4>
              <p className="text-xs text-slate-500">Configure pay parameters and safety thresholds.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hourly Base Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Overtime Multiplier (Multiplier)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={editMultiplier}
                  onChange={(e) => setEditMultiplier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Weekly Safety Limit Cap (Hours)</label>
                <input
                  type="number"
                  required
                  value={editLimit}
                  onChange={(e) => setEditLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStaffId(null)}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-500 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Contract Parameters"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historical Audits Panel */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payroll Disbursement History & Audit Trail</h3>
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">No payroll runs processed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="p-3">Processed Date</th>
                  <th className="p-3">Run Date Period</th>
                  <th className="p-3 text-right">Total Disbursed</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run) => (
                  <tr key={run.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                    <td className="p-3 text-slate-500">{new Date(run.processed_at).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-slate-900">{run.start_date} to {run.end_date}</td>
                    <td className="p-3 text-right font-bold text-slate-950">
                      ${parseFloat(run.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
