import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import logo from "../assets/careflow_logo.png";
import { API_URL } from "../config";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, patientLogin } = useAuth();
  
  // Tabs: "admin_login" | "staff_login" | "patient_login"
  const [activeTab, setActiveTab] = useState<"admin_login" | "staff_login" | "patient_login">("staff_login");
  
  // Login Fields
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [staffId, setStaffId] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [patientUpid, setPatientUpid] = useState("");
  const [patientPin, setPatientPin] = useState("");
  const [useLegacyLogin, setUseLegacyLogin] = useState(false);

  // Forgot Password flow states
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<"request_otp" | "reset_password">("request_otp");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setError(null);
    setSuccessMsg(null);
    setDevOtp(null);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!adminEmail || !adminPassword) return setError("Please enter your admin email and password");
    setLoading(true);

    try {
      const success = await login(adminEmail, adminPassword);
      if (success) {
        onLoginSuccess();
      } else {
        setError("Invalid admin email or password");
      }
    } catch {
      setError("An unexpected error occurred during admin login");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!staffId || !staffPassword) return setError("Please enter your Employee ID and password");
    setLoading(true);

    try {
      const success = await login(staffId, staffPassword);
      if (success) {
        onLoginSuccess();
      } else {
        setError("Invalid Employee ID or password");
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

  const handleRequestRecoveryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!recoveryEmail) return setError("Please enter your email");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/patient/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("OTP sent to your email successfully.");
        if (data.dev_otp) {
          setDevOtp(data.dev_otp);
        }
        setRecoveryStep("reset_password");
      } else {
        setError(data.error || "Failed to request recovery OTP");
      }
    } catch {
      setError("Network error requesting recovery OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!recoveryEmail || !recoveryOtp || !recoveryNewPassword) {
      return setError("All fields are required");
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/patient/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail, otp: recoveryOtp, new_password: recoveryNewPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Password reset successfully. You can now login.");
        setForgotPasswordMode(false);
        setRecoveryStep("request_otp");
        setRecoveryEmail("");
        setRecoveryOtp("");
        setRecoveryNewPassword("");
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch {
      setError("Network error resetting password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-6 font-sans text-slate-900">
      
      {/* Container */}
      <div className="w-full max-w-md border border-slate-200 rounded-lg p-8 bg-white">
        
        {/* Header */}
        <div className="flex flex-col items-center space-y-2 mb-8">
          <img src={logo} alt="CareFlow Logo" className="w-12 h-12 object-contain" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">CareFlow Command Center</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Minimal Cross-Hospital Portal</p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-white border border-red-200 text-red-700 text-xs p-3 rounded mb-6 font-semibold text-center">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-white border border-slate-200 text-slate-800 text-xs p-3 rounded mb-6 font-semibold text-center">
            {successMsg}
          </div>
        )}

        {/* ======================================================== */}
        {/* FORGOT PASSWORD MODE                                     */}
        {/* ======================================================== */}
        {forgotPasswordMode ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider">Reset Patient Password</h2>
              <button
                onClick={() => { setForgotPasswordMode(false); resetState(); }}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold"
              >
                Back to Login
              </button>
            </div>

            {recoveryStep === "request_otp" ? (
              <form onSubmit={handleRequestRecoveryOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="patient@gmail.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  {loading ? "Requesting OTP..." : "Send Verification OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {devOtp && (
                  <div className="bg-slate-50 border border-slate-200 text-slate-800 text-xs p-3 rounded font-mono text-center font-bold">
                    Dev Mode OTP: <span className="text-sm font-black text-black">{devOtp}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={recoveryEmail}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-slate-50 text-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Enter OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={recoveryOtp}
                    onChange={(e) => setRecoveryOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 font-mono tracking-widest text-center focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  {loading ? "Resetting..." : "Confirm & Reset Password"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Tab Controls */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50 border border-slate-200 rounded mb-6">
              <button
                onClick={() => { setActiveTab("staff_login"); resetState(); }}
                className={`py-2 text-[9px] font-bold uppercase rounded transition-all ${
                  activeTab === "staff_login" ? "bg-white text-slate-900 border border-slate-200 shadow-sm" : "text-slate-400 hover:text-slate-900"
                }`}
              >
                Staff Login
              </button>
              <button
                onClick={() => { setActiveTab("patient_login"); resetState(); }}
                className={`py-2 text-[9px] font-bold uppercase rounded transition-all ${
                  activeTab === "patient_login" ? "bg-white text-slate-900 border border-slate-200 shadow-sm" : "text-slate-400 hover:text-slate-900"
                }`}
              >
                Patient Login
              </button>
              <button
                onClick={() => { setActiveTab("admin_login"); resetState(); }}
                className={`py-2 text-[9px] font-bold uppercase rounded transition-all ${
                  activeTab === "admin_login" ? "bg-white text-slate-900 border border-slate-200 shadow-sm" : "text-slate-400 hover:text-slate-900"
                }`}
              >
                Hospital Admin
              </button>
            </div>

            {/* ======================================================== */}
            {/* 1. STAFF LOGIN FORM                                      */}
            {/* ======================================================== */}
            {activeTab === "staff_login" && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="EMP-123456"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Please enter your system generated employee code.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  {loading ? "Authenticating..." : "Login to Staff Portal"}
                </button>
              </form>
            )}

            {/* ======================================================== */}
            {/* 2. PATIENT LOGIN FORM                                    */}
            {/* ======================================================== */}
            {activeTab === "patient_login" && (
              <form onSubmit={handlePatientLogin} className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Method</span>
                  <button
                    type="button"
                    onClick={() => setUseLegacyLogin(!useLegacyLogin)}
                    className="text-[10px] text-slate-500 hover:underline font-bold"
                  >
                    {useLegacyLogin ? "Use Email/Password" : "Use Admission UPID/PIN"}
                  </button>
                </div>

                {useLegacyLogin ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Universal Patient ID (UPID)</label>
                      <input
                        type="text"
                        required
                        value={patientUpid}
                        onChange={(e) => setPatientUpid(e.target.value)}
                        placeholder="CF-2026-XXXXXX"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">6-Digit PIN Code</label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        value={patientPin}
                        onChange={(e) => setPatientPin(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="patient@gmail.com"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold uppercase text-slate-500">Password</label>
                        <button
                          type="button"
                          onClick={() => { setForgotPasswordMode(true); resetState(); }}
                          className="text-[10px] text-slate-500 hover:underline font-bold"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <input
                        type="password"
                        required
                        value={patientPassword}
                        onChange={(e) => setPatientPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                  </>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  {loading ? "Logging in..." : "Access Patient Portal"}
                </button>
              </form>
            )}

            {/* ======================================================== */}
            {/* 3. ADMIN LOGIN FORM                                      */}
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
                    placeholder="admin@hospital.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
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
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                  {loading ? "Logging in..." : "Login to Admin Console"}
                </button>
              </form>
            )}
          </>
        )}

      </div>
    </div>
  );
};
