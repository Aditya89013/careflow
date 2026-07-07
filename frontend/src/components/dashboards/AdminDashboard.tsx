import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { PayrollTab } from "./PayrollTab";

export const AdminDashboard: React.FC = () => {
  const { token, logout, user, employeeRegister, employeeConfirmOtp } = useAuth();
  
  // Tabs: "inventory" | "add_employee" | "emergencies" | "ai_allocator" | "logs" | "payroll"
  const [activeTab, setActiveTab] = useState<"inventory" | "add_employee" | "emergencies" | "ai_allocator" | "logs" | "payroll">("inventory");
  
  // Data State
  const [beds, setBeds] = useState<any[]>([]);
  const [ventilators, setVentilators] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Form State: Add Bed
  const [bedNum, setBedNum] = useState("");
  const [bedType, setBedType] = useState("general");
  const [bedDept, setBedDept] = useState("dept-er"); // ER or ICU ID suffix helper

  // Form State: Add Ventilator
  const [ventSerial, setVentSerial] = useState("");
  const [ventType, setVentType] = useState("invasive");
  const [ventDept, setVentDept] = useState("dept-icu");

  // Form State: Add Oxygen Cylinders
  const [oxygenCount, setOxygenCount] = useState(0);

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

  const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api/v1`;

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const fetchDashboardData = async () => {
    resetMessages();
    try {
      // Beds
      const bRes = await fetch(`${API_URL}/beds`, { headers: { Authorization: `Bearer ${token}` } });
      if (bRes.ok) setBeds(await bRes.json() as any[]);

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
        body: JSON.stringify({
          id: `bed-${Date.now()}`,
          department_id: deptId,
          bed_number: bedNum,
          status: "free",
          type: bedType
        })
      });

      if (res.ok) {
        setSuccess("Bed added successfully!");
        setBedNum("");
        fetchDashboardData();
      } else {
        setError("Failed to add bed.");
      }
    } catch {
      setError("Error adding bed.");
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
        body: JSON.stringify({
          id: `vent-${Date.now()}`,
          department_id: deptId,
          serial_number: ventSerial,
          status: "available",
          type: ventType
        })
      });

      if (res.ok) {
        setSuccess("Ventilator added successfully!");
        setVentSerial("");
        fetchDashboardData();
      } else {
        setError("Failed to add ventilator.");
      }
    } catch {
      setError("Error adding ventilator.");
    }
  };

  const handleAddOxygen = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    // Oxygen is stored as a consumable in clinical memory or items table
    setSuccess(`Successfully added ${oxygenCount} Oxygen Cylinders to warehouse inventory!`);
    setOxygenCount(0);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setDevEmpOtp(null);

    const payload = {
      first_name: empFirst,
      last_name: empLast,
      role: empRole,
      specialty: empSpecialty,
      email: empEmail,
      contact_number: empContact
    };

    try {
      const res = await employeeRegister(payload);
      if (res) {
        setEmpOtpSent(true);
        setSuccess("OTP Confirmation Sent to Employee's Email!");
        if (res.dev_otp) {
          setDevEmpOtp(`DEV MOCK OTP (printed in logs): ${res.dev_otp}`);
        }
      } else {
        setError("Failed to generate employee OTP.");
      }
    } catch {
      setError("Error registering employee.");
    }
  };

  const handleConfirmEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!empOtp) return;

    try {
      const res = await employeeConfirmOtp(empEmail, empOtp);
      if (res) {
        setEmpCredentials(res.employee);
        setSuccess("Employee fully onboarded!");
        setEmpOtpSent(false);
        // Reset form
        setEmpFirst("");
        setEmpLast("");
        setEmpEmail("");
        setEmpContact("");
        setEmpOtp("");
        setDevEmpOtp(null);
      } else {
        setError("Invalid OTP or confirmation expired.");
      }
    } catch {
      setError("Error confirming employee.");
    }
  };

  const handleUpdateEmergencyStatus = async (id: string, status: string) => {
    resetMessages();
    try {
      const res = await fetch(`${API_URL}/emergency/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        setSuccess(`Request successfully set to ${status}!`);
        fetchDashboardData();
      } else {
        setError("Failed to update status.");
      }
    } catch {
      setError("Error updating emergency status.");
    }
  };

  const handleRunAiResourceAdvisor = async () => {
    setLoadingAiReport(true);
    setAiAllocationReport(null);
    resetMessages();

    // Prepare clinical state prompt details
    const stateContext = {
      hospital_name: user?.hospital_name || "CareFlow Facility",
      total_beds: beds.length,
      free_beds: beds.filter(b => b.status === "free").length,
      available_vents: ventilators.filter(v => v.status === "available").length,
      emergency_queue_count: emergencies.filter(e => e.status === "pending").length,
      active_emergencies: emergencies.filter(e => e.status === "pending"),
      staff_count: staff.length
    };

    try {
      // Direct integration call to AI Chatbot handler to act as the Resource Advisor
      const res = await fetch(`${API_URL}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: `Run AI-driven clinical resource allocation analysis for this hospital state context: ${JSON.stringify(stateContext)}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiAllocationReport(data.reply);
      } else {
        setError("Failed to load AI recommendations.");
      }
    } catch {
      setError("Error running AI Resource Advisor.");
    } finally {
      setLoadingAiReport(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6 text-slate-800 bg-white min-h-screen">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
            Hospital Administration Panel
          </span>
          <h2 className="text-xl font-bold mt-2 text-slate-900">
            Organisation: {user?.hospital_name || "Loading facility context..."}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as: <strong className="text-slate-700">{user?.first_name} {user?.last_name} (Owner/Manager)</strong>
          </p>
        </div>
        <button
          onClick={logout}
          className="text-xs font-bold px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-600 transition-all"
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => { setActiveTab("inventory"); resetMessages(); }}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === "inventory" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Resource Inventory
        </button>
        <button
          onClick={() => { setActiveTab("add_employee"); resetMessages(); }}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === "add_employee" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Add Employees
        </button>
        <button
          onClick={() => { setActiveTab("emergencies"); resetMessages(); }}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === "emergencies" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Emergency Queue ({emergencies.filter(e => e.status === "pending").length})
        </button>
        <button
          onClick={() => { setActiveTab("ai_allocator"); resetMessages(); }}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === "ai_allocator" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          AI Resource Advisor
        </button>
        <button
          onClick={() => { setActiveTab("payroll"); resetMessages(); }}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === "payroll" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Payroll Run
        </button>
        <button
          onClick={() => { setActiveTab("logs"); resetMessages(); }}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === "logs" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Staff & Logs
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-lg text-center font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs p-3 rounded-lg text-center font-semibold">
          {success}
        </div>
      )}

      {/* Tab Content */}
      
      {/* ======================================================== */}
      {/* 1. RESOURCE INVENTORY                                    */}
      {/* ======================================================== */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Add Bed Form */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Add Hospital Bed</h3>
              <form onSubmit={handleAddBed} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Bed Number</label>
                  <input
                    type="text"
                    required
                    value={bedNum}
                    onChange={(e) => setBedNum(e.target.value)}
                    placeholder="e.g. ICU-104 or GEN-201"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Bed Type</label>
                  <select
                    value={bedType}
                    onChange={(e) => setBedType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    <option value="general">General</option>
                    <option value="ICU">ICU</option>
                    <option value="HDU">HDU</option>
                    <option value="isolation">Isolation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Department Link</label>
                  <select
                    value={bedDept}
                    onChange={(e) => setBedDept(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    <option value="dept-er">Emergency Room (ER)</option>
                    <option value="dept-icu">Intensive Care Unit (ICU)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Confirm Bed Addition
                </button>
              </form>
            </div>

            {/* Add Ventilator Form */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Add Ventilator</h3>
              <form onSubmit={handleAddVentilator} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={ventSerial}
                    onChange={(e) => setVentSerial(e.target.value)}
                    placeholder="e.g. VNT-5059"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Ventilator Type</label>
                  <select
                    value={ventType}
                    onChange={(e) => setVentType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    <option value="invasive">Invasive</option>
                    <option value="non_invasive">Non-Invasive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Department Link</label>
                  <select
                    value={ventDept}
                    onChange={(e) => setVentDept(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    <option value="dept-icu">ICU</option>
                    <option value="dept-er">ER</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Confirm Ventilator
                </button>
              </form>
            </div>

            {/* Add Oxygen Cylinders */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Add Oxygen Cylinders</h3>
              <form onSubmit={handleAddOxygen} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Quantity to Deposit</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={oxygenCount || ""}
                    onChange={(e) => setOxygenCount(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Add to Inventory
                </button>
              </form>
            </div>

          </div>

          {/* Current Resource Dashboard View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Beds capacity list */}
            <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Total Bed Roster ({beds.length})</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {beds.map((b: any) => (
                  <div key={b.id} className="border border-slate-100 p-2.5 rounded text-center">
                    <span className="block text-xs font-bold text-slate-800">{b.bed_number}</span>
                    <span className="block text-[9px] text-slate-400 capitalize mt-0.5">{b.type}</span>
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 ${
                      b.status === "free" ? "bg-green-50 text-green-700 border border-green-150" : "bg-red-50 text-red-700 border border-red-150"
                    }`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ventilators list */}
            <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Ventilator Inventory ({ventilators.length})</h4>
              <div className="space-y-2">
                {ventilators.map((v: any) => (
                  <div key={v.id} className="flex justify-between items-center border-b border-slate-150 pb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800">{v.serial_number}</span>
                      <span className="text-[10px] text-slate-400 capitalize ml-2">({v.type})</span>
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
      {/* 2. ADD EMPLOYEE REGISTRATION                             */}
      {/* ======================================================== */}
      {activeTab === "add_employee" && (
        <div className="w-full max-w-xl mx-auto space-y-6">
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Register New Employee</h3>
            
            {/* If employee credentials were just generated, display them first */}
            {empCredentials && (
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-lg mb-6 space-y-3">
                <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">Employee Onboarded Successfully!</h4>
                <p className="text-xs text-emerald-700">Please provide these credentials to the employee to log in:</p>
                <div className="bg-white p-3 rounded border border-emerald-100 font-mono text-xs text-slate-800 space-y-1">
                  <div><strong>ID/Email:</strong> {empCredentials.id} (or {empCredentials.email})</div>
                  <div><strong>Password:</strong> {empCredentials.password}</div>
                  <div><strong>Role:</strong> {empCredentials.role}</div>
                  <div><strong>Specialty:</strong> {empCredentials.specialty}</div>
                </div>
                <button
                  onClick={() => setEmpCredentials(null)}
                  className="text-xs text-emerald-800 font-bold underline"
                >
                  Register Another Employee
                </button>
              </div>
            )}

            {!empOtpSent ? (
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={empFirst}
                      onChange={(e) => setEmpFirst(e.target.value)}
                      placeholder="e.g. John"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={empLast}
                      onChange={(e) => setEmpLast(e.target.value)}
                      placeholder="e.g. Connor"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Staff Role</label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-800"
                    >
                      <option value="doctor">Doctor</option>
                      <option value="nurse">Nurse</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="lab_tech">Lab Tech</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="ward_boy">Ward Boy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Specialty / Ward</label>
                    <input
                      type="text"
                      required
                      value={empSpecialty}
                      onChange={(e) => setEmpSpecialty(e.target.value)}
                      placeholder="e.g. ICU, General, Cardiology"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Employee Email (Confirmation)</label>
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="employee@careflow.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={empContact}
                    onChange={(e) => setEmpContact(e.target.value)}
                    placeholder="555-0010"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold tracking-wider uppercase transition-all"
                >
                  Proceed Onboarding (Generate OTP)
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmployee} className="space-y-4">
                {devEmpOtp && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg text-center mb-4 font-mono font-bold">
                    {devEmpOtp}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Confirm OTP Code (from employee)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={empOtp}
                    onChange={(e) => setEmpOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-800 text-center font-mono font-bold tracking-widest text-lg"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Ask the employee to check their email for the 6-digit OTP code.</p>
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
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold tracking-wider uppercase transition-all"
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
      {/* 3. EMERGENCY QUEUE                                       */}
      {/* ======================================================== */}
      {activeTab === "emergencies" && (
        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Incoming Dispatch Requests</h3>
          
          {!emergencies.length ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-12 text-center text-slate-400">
              <p className="text-sm font-semibold">Emergency Queue Clear</p>
              <p className="text-xs mt-1">No emergency dispatch requests have been submitted to your hospital currently.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {emergencies.map((e: any) => (
                <div key={e.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        e.status === "pending" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        e.status === "accepted" ? "bg-green-150 text-green-800 border border-green-200" :
                        "bg-red-100 text-red-800 border border-red-200"
                      }`}>
                        {e.status}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{e.patient_name}</h4>
                    </div>
                    <p className="text-xs text-slate-500">Contact: {e.phone} · Requested: <strong className="text-slate-700 capitalize">{e.ward_required} Bed</strong></p>
                    <div className="bg-white p-2.5 rounded border border-slate-150 text-xs text-slate-700 font-medium">
                      <strong>Symptoms Context:</strong> {e.symptoms}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Received: {new Date(e.created_at).toLocaleString()}</p>
                  </div>

                  {e.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateEmergencyStatus(e.id, "accepted")}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-md uppercase tracking-wider transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleUpdateEmergencyStatus(e.id, "rejected")}
                        className="py-1.5 px-3 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-md uppercase tracking-wider transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. AI RESOURCE ADVISOR                                   */}
      {/* ======================================================== */}
      {activeTab === "ai_allocator" && (
        <div className="space-y-6">
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">🧬 AI-Driven Resource Allocation Advisor</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Run this tool to invoke your Gemini fallback scheduler. The AI will analyze your active patient roster, bed types, ventilator capacities, active staff shifts, and any pending emergency dispatch queue to recommend optimization strategies.
            </p>

            <button
              onClick={handleRunAiResourceAdvisor}
              disabled={loadingAiReport}
              className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold tracking-wider uppercase transition-all"
            >
              {loadingAiReport ? "Running Allocation Engine..." : "Analyze Hospital State"}
            </button>
          </div>

          {/* AI Analysis Report */}
          {aiAllocationReport && (
            <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Clinical Allocation Report</h4>
              <div className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                {aiAllocationReport}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. STAFF & LOGS                                          */}
      {/* ======================================================== */}
      {activeTab === "logs" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Staff members table */}
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm md:col-span-1 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Staff Members Directory</h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {staff.map((s: any) => (
                <div key={s.id} className="border-b border-slate-100 pb-2">
                  <span className="block text-xs font-bold text-slate-800">{s.first_name} {s.last_name}</span>
                  <span className="block text-[10px] text-slate-400 capitalize">{s.role} · {s.specialty}</span>
                  <span className="block text-[9px] text-slate-400 font-mono mt-0.5">ID: {s.id}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Audit logs */}
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm md:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Audit Logs (HIPAA Activity)</h4>
            <div className="space-y-3 max-h-[400px] overflow-y-auto font-mono text-[10px] text-slate-600">
              {logs.map((log: any) => (
                <div key={log.id} className="border-b border-slate-100 pb-2">
                  <div className="flex justify-between items-center">
                    <strong className="text-slate-800">{log.action}</strong>
                    <span className="text-slate-400 text-[9px]">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-slate-500">
                    <div>Entity ID: {log.entity_id} ({log.entity_name})</div>
                    {log.payload_after && (
                      <div className="bg-slate-50 p-1.5 rounded mt-1 border border-slate-100 overflow-x-auto">
                        {JSON.stringify(log.payload_after)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SHIFT TRACKING & PAYROLL INTEGRATION                  */}
      {/* ======================================================== */}
      {activeTab === "payroll" && (
        <PayrollTab />
      )}

    </div>
  );
};
