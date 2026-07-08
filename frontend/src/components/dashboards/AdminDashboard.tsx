import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { API_URL } from "../../config";
import { PayrollTab } from "./PayrollTab";
import AttendanceTab from "./AttendanceTab";

export const AdminDashboard: React.FC = () => {
  const { token, logout, user, employeeRegister, employeeConfirmOtp } = useAuth();
  
  // Tabs: "inventory" | "infra_resources" | "add_employee" | "emergencies" | "ai_allocator" | "logs" | "payroll" | "attendance"
  const [activeTab, setActiveTab] = useState<"inventory" | "infra_resources" | "add_employee" | "emergencies" | "ai_allocator" | "logs" | "payroll" | "attendance">("inventory");

  // Data State
  const [beds, setBeds] = useState<any[]>([]);
  const [ventilators, setVentilators] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [infrastructure, setInfrastructure] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  // Form State: Add Bed
  const [bedNum, setBedNum] = useState("");
  const [bedType, setBedType] = useState("general");
  const [bedDept, setBedDept] = useState("dept-er");

  // Form State: Add Ventilator
  const [ventSerial, setVentSerial] = useState("");
  const [ventType, setVentType] = useState("invasive");
  const [ventDept, setVentDept] = useState("dept-icu");

  // Form State: Add Infrastructure
  const [infraType, setInfraType] = useState("ICU");
  const [infraCapacity, setInfraCapacity] = useState("10");

  // Form State: Add Resource
  const [resType, setResType] = useState("Ventilator");
  const [resWard, setResWard] = useState("");
  const [resStatus, setResStatus] = useState("Available");

  // Form State: Add Employee
  const [empFirst, setEmpFirst] = useState("");
  const [empLast, setEmpLast] = useState("");
  const [empRole, setEmpRole] = useState("doctor");
  const [empSpecialty, setEmpSpecialty] = useState("Internal Medicine");
  const [empEmail, setEmpEmail] = useState("");
  const [empContact, setEmpContact] = useState("");
  const [empOtp, setEmpOtp] = useState("");
  const [empOtpSent, setEmpOtpSent] = useState(false);
  const [empCredentials, setEmpCredentials] = useState<any | null>(null);
  const [devEmpOtp, setDevEmpOtp] = useState<string | null>(null);

  // Form State: AI Resource Advisor
  const [aiAllocationReport, setAiAllocationReport] = useState<string | null>(null);
  const [loadingAiReport, setLoadingAiReport] = useState(false);

  // Global Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const fetchDashboardData = async () => {
    resetMessages();
    try {
      // Beds
      const bRes = await fetch(`${API_URL}/beds`, { headers: { Authorization: `Bearer ${token}` } });
      if (bRes.ok) setBeds(await bRes.json());

      // Vents
      const vRes = await fetch(`${API_URL}/ventilators`, { headers: { Authorization: `Bearer ${token}` } });
      if (vRes.ok) setVentilators(await vRes.json());

      // Staff
      const sRes = await fetch(`${API_URL}/staff`, { headers: { Authorization: `Bearer ${token}` } });
      if (sRes.ok) setStaff(await sRes.json());

      // Emergencies
      const eRes = await fetch(`${API_URL}/emergency/list`, { headers: { Authorization: `Bearer ${token}` } });
      if (eRes.ok) setEmergencies(await eRes.json());

      // Audit Logs
      const lRes = await fetch(`${API_URL}/audit-logs`, { headers: { Authorization: `Bearer ${token}` } });
      if (lRes.ok) setLogs(await lRes.json());

      // Infrastructure
      const iRes = await fetch(`${API_URL}/infrastructure`, { headers: { Authorization: `Bearer ${token}` } });
      if (iRes.ok) {
        const infData = await iRes.json();
        setInfrastructure(infData);
        if (infData.length > 0 && !resWard) {
          setResWard(infData[0].id);
        }
      }

      // Resources
      const rRes = await fetch(`${API_URL}/resources`, { headers: { Authorization: `Bearer ${token}` } });
      if (rRes.ok) setResources(await rRes.json());
      
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, activeTab]);

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!bedNum) return;

    try {
      const deptId = bedDept === "dept-icu" ? `dept-icu-${user?.hospital_id}` : `dept-er-${user?.hospital_id}`;
      const res = await fetch(`${API_URL}/beds`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bed_number: bedNum, type: bedType, department_id: deptId })
      });
      if (res.ok) {
        setSuccess(`Bed ${bedNum} successfully added.`);
        setBedNum("");
        fetchDashboardData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to add bed");
      }
    } catch {
      setError("Network error adding bed");
    }
  };

  const handleAddVentilator = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!ventSerial) return;

    try {
      const deptId = ventDept === "dept-icu" ? `dept-icu-${user?.hospital_id}` : `dept-er-${user?.hospital_id}`;
      const res = await fetch(`${API_URL}/ventilators`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serial_number: ventSerial, type: ventType, department_id: deptId })
      });
      if (res.ok) {
        setSuccess(`Ventilator ${ventSerial} successfully added.`);
        setVentSerial("");
        fetchDashboardData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to add ventilator");
      }
    } catch {
      setError("Network error adding ventilator");
    }
  };

  const handleAddInfrastructure = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!infraCapacity) return;

    try {
      const res = await fetch(`${API_URL}/infrastructure`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: infraType, total_capacity: infraCapacity })
      });
      if (res.ok) {
        setSuccess(`Ward type "${infraType}" created successfully.`);
        fetchDashboardData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to create ward");
      }
    } catch {
      setError("Network error creating ward");
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    try {
      const res = await fetch(`${API_URL}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: resType, ward_id: resWard || null, status: resStatus })
      });
      if (res.ok) {
        setSuccess(`Equipment resource "${resType}" added successfully.`);
        fetchDashboardData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to add resource");
      }
    } catch {
      setError("Network error adding resource");
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setEmpCredentials(null);

    const ok = await employeeRegister(empFirst, empLast, empRole, empSpecialty, empEmail, empContact);
    if (ok) {
      setEmpOtpSent(true);
      // Retrieve the generated OTP directly in development
      try {
        const logRes = await fetch(`${API_URL}/audit-logs`, { headers: { Authorization: `Bearer ${token}` } });
        if (logRes.ok) {
          // Dev OTP simulation fallback
        }
      } catch {}
      setSuccess("Onboarding initiated. OTP generated.");
    } else {
      setError("Failed to register employee details.");
    }
  };

  const handleConfirmEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!empOtp) return;

    const creds = await employeeConfirmOtp(empEmail, empOtp);
    if (creds) {
      setEmpCredentials(creds);
      setEmpOtpSent(false);
      setEmpFirst("");
      setEmpLast("");
      setEmpEmail("");
      setEmpContact("");
      setEmpOtp("");
      setSuccess("Employee successfully verified and onboarded!");
    } else {
      setError("Verification failed. Invalid OTP code.");
    }
  };

  const handleRunAiOperationsOptimizer = async () => {
    setLoadingAiReport(true);
    setAiAllocationReport(null);
    resetMessages();

    try {
      const res = await fetch(`${API_URL}/ai/optimize-operations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAiAllocationReport(data.reasoning);
        setSuccess("AI operations optimizer complete. Shift roster and resources updated.");
        fetchDashboardData();
      } else {
        setError(data.error || "AI optimization run failed.");
      }
    } catch {
      setError("Network error invoking AI operations optimizer");
    } finally {
      setLoadingAiReport(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 text-slate-900 bg-white min-h-screen">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 uppercase">
            Hospital Admin Portal
          </span>
          <h2 className="text-xl font-bold mt-2 text-slate-900">
            {user?.hospital_name || "CareFlow Medical Center"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin Profile: <strong className="text-slate-700">{user?.first_name} {user?.last_name}</strong>
          </p>
        </div>
        <button
          onClick={logout}
          className="text-xs font-bold px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-slate-600 transition-all"
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 p-0.5 bg-slate-50 rounded border">
        {[
          { id: "inventory", label: "Bed & Vents" },
          { id: "infra_resources", label: "Wards & Equipment" },
          { id: "add_employee", label: "Employee Onboarding" },
          { id: "emergencies", label: `Emergencies (${emergencies.length})` },
          { id: "ai_allocator", label: "AI Operations Optimizer" },
          { id: "payroll", label: "Payroll Control" },
          { id: "attendance", label: "Time & Attendance" },
          { id: "logs", label: "Audit Logs" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); resetMessages(); }}
            className={`py-2 px-4 text-xs font-bold uppercase rounded tracking-wider transition-all ${
              activeTab === tab.id ? "bg-white text-slate-900 shadow-sm border border-slate-255" : "text-slate-400 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification banners */}
      {error && (
        <div className="bg-white border border-red-200 text-red-700 text-xs p-3 rounded font-semibold text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-white border border-slate-200 text-slate-800 text-xs p-3 rounded font-semibold text-center">
          {success}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. LEGACY INVENTORY TAB                                  */}
      {/* ======================================================== */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Add Bed form */}
            <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-2 border-b border-slate-100">Add Admission Bed</h3>
              <form onSubmit={handleAddBed} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Bed Identifier</label>
                  <input
                    type="text"
                    required
                    value={bedNum}
                    onChange={(e) => setBedNum(e.target.value)}
                    placeholder="e.g. ICU-05"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Bed Type Class</label>
                  <select
                    value={bedType}
                    onChange={(e) => setBedType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="ICU">ICU</option>
                    <option value="HDU">HDU</option>
                    <option value="isolation">Isolation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Department</label>
                  <select
                    value={bedDept}
                    onChange={(e) => setBedDept(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="dept-er">Emergency Department (ER)</option>
                    <option value="dept-icu">Intensive Care (ICU)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Create Bed
                </button>
              </form>
            </div>

            {/* Add Vent form */}
            <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-2 border-b border-slate-100">Register Ventilator</h3>
              <form onSubmit={handleAddVentilator} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={ventSerial}
                    onChange={(e) => setVentSerial(e.target.value)}
                    placeholder="e.g. VENT-9981"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Ventilator Interface</label>
                  <select
                    value={ventType}
                    onChange={(e) => setVentType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="invasive">Invasive</option>
                    <option value="non_invasive">Non-Invasive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Placement Department</label>
                  <select
                    value={ventDept}
                    onChange={(e) => setVentDept(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="dept-icu">Intensive Care Unit (ICU)</option>
                    <option value="dept-er">Emergency Department (ER)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Create Ventilator
                </button>
              </form>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Bed Registry ({beds.length})</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {beds.map((b: any) => (
                  <div key={b.id} className="border border-slate-100 p-2.5 rounded text-center">
                    <span className="block text-xs font-bold text-slate-800">{b.bed_number}</span>
                    <span className="block text-[9px] text-slate-450 uppercase mt-0.5">{b.type}</span>
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 ${
                      b.status === "free" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ventilator Inventory ({ventilators.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ventilators.map((v: any) => (
                  <div key={v.id} className="flex justify-between items-center border-b border-slate-100 pb-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-850">{v.serial_number}</span>
                      <span className="text-[10px] text-slate-400 uppercase ml-2">({v.type})</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      v.status === "available" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. NEW INFRASTRUCTURE & RESOURCES TAB                    */}
      {/* ======================================================== */}
      {activeTab === "infra_resources" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Add Infrastructure Ward */}
            <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-2 border-b border-slate-100">Create Ward / OPD (Infrastructure)</h3>
              <form onSubmit={handleAddInfrastructure} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Ward / Location Type</label>
                  <select
                    value={infraType}
                    onChange={(e) => setInfraType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="ICU">ICU (Intensive Care)</option>
                    <option value="CCU">CCU (Coronary Care)</option>
                    <option value="General">General Ward</option>
                    <option value="Isolation">Isolation Ward</option>
                    <option value="OPD">Outpatient Department (OPD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Total Bed Capacity</label>
                  <input
                    type="number"
                    required
                    value={infraCapacity}
                    onChange={(e) => setInfraCapacity(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Add Ward
                </button>
              </form>
            </div>

            {/* Add Equipment Resource */}
            <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-2 border-b border-slate-100">Add Equipment / Resource</h3>
              <form onSubmit={handleAddResource} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Equipment Type</label>
                  <select
                    value={resType}
                    onChange={(e) => setResType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="Ventilator">Ventilator</option>
                    <option value="Oxygen Cylinder">Oxygen Cylinder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Assign to Ward</label>
                  <select
                    value={resWard}
                    onChange={(e) => setResWard(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="">Unassigned / Main Stock</option>
                    {infrastructure.map((inf: any) => (
                      <option key={inf.id} value={inf.id}>{inf.type} Ward (ID: {inf.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Initial Status</label>
                  <select
                    value={resStatus}
                    onChange={(e) => setResStatus(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="Available">Available</option>
                    <option value="In-Use">In-Use</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Create Resource
                </button>
              </form>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Wards list */}
            <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hospital Wards ({infrastructure.length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {infrastructure.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No wards registered yet.</p>
                ) : (
                  infrastructure.map((inf: any) => (
                    <div key={inf.id} className="flex justify-between items-center border-b border-slate-100 pb-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-850">{inf.type} Ward</span>
                        <span className="block text-[10px] text-slate-400 font-mono">ID: {inf.id}</span>
                      </div>
                      <div className="text-right">
                        <span className="block font-semibold">Beds: {inf.current_occupancy} / {inf.total_capacity} Occupied</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Resources list */}
            <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Equipment Inventory ({resources.length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {resources.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No equipment resources added.</p>
                ) : (
                  resources.map((res: any) => (
                    <div key={res.id} className="flex justify-between items-center border-b border-slate-100 pb-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{res.type}</span>
                        <span className="block text-[9px] text-slate-400 font-mono">ID: {res.id} (Ward: {res.ward_id || "Stock"})</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        res.status === "Available" ? "bg-green-50 text-green-700" :
                        res.status === "In-Use" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-705"
                      }`}>
                        {res.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. EMPLOYEE ONBOARDING                                   */}
      {/* ======================================================== */}
      {activeTab === "add_employee" && (
        <div className="w-full max-w-xl mx-auto space-y-6">
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-2 border-b border-slate-100">Onboard New Employee</h3>
            
            {empCredentials && (
              <div className="bg-slate-50 border border-slate-200 p-5 rounded space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-850 tracking-wider">Employee Onboarded successfully!</h4>
                <p className="text-xs text-slate-600">Please provide these credentials to the employee to sign in:</p>
                <div className="bg-white p-3 rounded border font-mono text-xs text-slate-800 space-y-1">
                  <div><strong>Employee ID:</strong> {empCredentials.id}</div>
                  <div><strong>Temp Password:</strong> {empCredentials.password}</div>
                  <div><strong>Email Profile:</strong> {empCredentials.email}</div>
                  <div><strong>Assigned Role:</strong> {empCredentials.role}</div>
                </div>
                <button
                  onClick={() => setEmpCredentials(null)}
                  className="text-xs text-slate-900 font-bold underline"
                >
                  Onboard Another Employee
                </button>
              </div>
            )}

            {!empOtpSent ? (
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={empFirst}
                      onChange={(e) => setEmpFirst(e.target.value)}
                      placeholder="e.g. Sarah"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={empLast}
                      onChange={(e) => setEmpLast(e.target.value)}
                      placeholder="e.g. Connor"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Staff Role</label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                    >
                      <option value="doctor">Doctor</option>
                      <option value="nurse">Nurse</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="ward_boy">Ward Boy</option>
                      <option value="lab_tech">Lab Tech</option>
                      <option value="pharmacist">Pharmacist</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Specialty / Ward</label>
                    <input
                      type="text"
                      required
                      value={empSpecialty}
                      onChange={(e) => setEmpSpecialty(e.target.value)}
                      placeholder="e.g. ICU, General, Diagnostics"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Employee Email Address</label>
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="employee@careflow.com"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={empContact}
                    onChange={(e) => setEmpContact(e.target.value)}
                    placeholder="555-9081"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Generate Onboarding OTP
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmployee} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Confirm OTP Code (from employee)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={empOtp}
                    onChange={(e) => setEmpOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 text-center font-mono font-bold tracking-widest text-lg focus:border-slate-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Provide the OTP from email offline to verify account setup.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEmpOtpSent(false); setDevEmpOtp(null); }}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded text-xs font-bold text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Verify & Onboard
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. EMERGENCIES QUEUE                                     */}
      {/* ======================================================== */}
      {activeTab === "emergencies" && (
        <div className="space-y-6">
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-2 border-b border-slate-100">Live Hospital Triage Queue</h3>
            {emergencies.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No incoming emergencies in the queue.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {emergencies.map((e: any) => (
                  <div key={e.id} className="border border-slate-200 p-4 rounded text-xs flex justify-between items-center gap-4 bg-white">
                    <div>
                      <h4 className="font-bold text-slate-900">{e.patient_name}</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Ward Needed: {e.ward_required}</p>
                      <p className="text-slate-650 mt-1"><strong>Symptoms:</strong> {e.symptoms}</p>
                    </div>
                    <span className="bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap">
                      {e.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. AI OPERATIONS OPTIMIZER                              */}
      {/* ======================================================== */}
      {activeTab === "ai_allocator" && (
        <div className="w-full max-w-3xl mx-auto space-y-6">
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4 text-center">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-150">AI Operations Optimizer (Shift & Resource Allocator)</h3>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              Feed the hospital's infrastructure capacity, staff rosters, and active caseloads to Gemini. The model will automate and optimize shift rotas and patient resource allocations.
            </p>
            <button
              onClick={handleRunAiOperationsOptimizer}
              disabled={loadingAiReport}
              className="py-2.5 px-6 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {loadingAiReport ? "Optimizing Operations (Gemini)..." : "Run AI Operations Optimizer"}
            </button>
          </div>

          {aiAllocationReport && (
            <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">AI Optimizer Allocation Report</h4>
              <div className="bg-white p-4 rounded border text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                {aiAllocationReport}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. PAYROLL TAB                                           */}
      {/* ======================================================== */}
      {activeTab === "payroll" && <PayrollTab />}

      {/* ======================================================== */}
      {/* 7. ATTENDANCE TAB                                        */}
      {/* ======================================================== */}
      {activeTab === "attendance" && <AttendanceTab />}

      {/* ======================================================== */}
      {/* 8. AUDIT LOGS                                            */}
      {/* ======================================================== */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-2 border-b border-slate-100">Facility Audit Logs</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No audit log history recorded.</p>
              ) : (
                logs.map((l: any) => (
                  <div key={l.id} className="border-b border-slate-100 pb-2 text-[11px] text-slate-650 flex justify-between gap-4">
                    <div>
                      <strong className="text-slate-800">{l.action}</strong> by Actor: {l.actor_id || "System"}
                      <span className="block text-[9px] text-slate-400">{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                    <code className="text-[10px] text-slate-400 font-mono">ID: {l.id}</code>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
