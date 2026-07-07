import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import logo from "../assets/careflow_logo.png";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, patientLogin } = useAuth();
  
  // Tabs: "staff_login" | "patient_login" | "admin_login"
  const [activeTab, setActiveTab] = useState<"staff_login" | "patient_login" | "admin_login">("staff_login");
  
  // Staff Login Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Patient Login Fields
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [patientUpid, setPatientUpid] = useState("");
  const [patientPin, setPatientPin] = useState("");
  const [useLegacyLogin, setUseLegacyLogin] = useState(false);

  // Admin Login Fields
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!email || !password) return setError("Please enter your email and password");
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        onLoginSuccess();
      } else {
        setError("Invalid email or password");
      }
    } catch {
      setError("An unexpected error occurred during staff login");
    } finally {
      setLoading(false);
    }
  };

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    setLoading(true);

    try {
      let success = false;
      if (useLegacyLogin) {
        if (!patientUpid || !patientPin) {
          setError("UPID and PIN are required");
          setLoading(false);
          return;
        }
        success = await patientLogin(patientUpid, patientPin);
      } else {
        if (!patientEmail || !patientPassword) {
          setError("Email and password are required");
          setLoading(false);
          return;
        }
        success = await patientLogin("", "", patientEmail, patientPassword);
      }

      if (success) {
        onLoginSuccess();
      } else {
        setError(useLegacyLogin ? "Invalid UPID or PIN" : "Invalid email or password");
      }
    } catch {
      setError("An unexpected error occurred during patient login");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!adminEmail || !adminPassword) return setError("Please enter your email and password");
    setLoading(true);

    try {
      const success = await login(adminEmail, adminPassword);
      if (success) {
        onLoginSuccess();
      } else {
        setError("Invalid email or password");
      }
    } catch {
      setError("An unexpected error occurred during admin login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-6 font-sans text-slate-800">
      
      {/* Container */}
      <div className="w-full max-w-lg border border-slate-200 rounded-xl p-8 shadow-sm bg-white">
        
        {/* Header */}
        <div className="flex flex-col items-center space-y-2 mb-6">
          <img src={logo} alt="CareFlow Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">CareFlow Command Center</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Minimal Cross-Hospital Portal</p>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50 border border-slate-200 rounded-lg mb-6">
          <button
            onClick={() => { setActiveTab("staff_login"); resetState(); }}
            className={`py-2 text-[10px] font-bold rounded transition-all ${
              activeTab === "staff_login" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Staff Login
          </button>
          <button
            onClick={() => { setActiveTab("patient_login"); resetState(); }}
            className={`py-2 text-[10px] font-bold rounded transition-all ${
              activeTab === "patient_login" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Patient Login
          </button>
          <button
            onClick={() => { setActiveTab("admin_login"); resetState(); }}
            className={`py-2 text-[10px] font-bold rounded transition-all ${
              activeTab === "admin_login" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Admin Login
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg text-center mb-6 font-semibold">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-lg text-center mb-6 font-semibold">
            {successMsg}
          </div>
        )}

        {/* ======================================================== */}
        {/* 1. STAFF LOGIN FORM                                      */}
        {/* ======================================================== */}
        {activeTab === "staff_login" && (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Employee Email or ID</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@careflow.com or EMP-12345"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold tracking-wider uppercase transition-all"
            >
              {loading ? "Authenticating..." : "Login to Hospital Dashboard"}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* 2. PATIENT LOGIN FORM                                    */}
        {/* ======================================================== */}
        {activeTab === "patient_login" && (
          <form onSubmit={handlePatientLogin} className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase text-slate-500">Method</span>
              <button
                type="button"
                onClick={() => setUseLegacyLogin(!useLegacyLogin)}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                {useLegacyLogin ? "Use Email/Password instead" : "Use UPID/PIN (admitted only) instead"}
              </button>
            </div>

            {useLegacyLogin ? (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Universal Patient ID (UPID)</label>
                  <input
                    type="text"
                    value={patientUpid}
                    onChange={(e) => setPatientUpid(e.target.value)}
                    placeholder="CF-2026-XXXXXX"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">6-Digit PIN Code</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={patientPin}
                    onChange={(e) => setPatientPin(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="patient@gmail.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
                  <input
                    type="password"
                    value={patientPassword}
                    onChange={(e) => setPatientPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold tracking-wider uppercase transition-all"
            >
              {loading ? "Logging in..." : "Access Patient Portal"}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* 4. ADMIN LOGIN FORM                                      */}
        {/* ======================================================== */}
        {activeTab === "admin_login" && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="superadmin@careflow.com or manager@hospital.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold tracking-wider uppercase transition-all"
            >
              {loading ? "Logging in..." : "Login to System Console"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
