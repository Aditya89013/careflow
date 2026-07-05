import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import logo from "../assets/careflow_logo.png";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, patientLogin, bypassRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"staff" | "patient">("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [upid, setUpid] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let success = false;
      if (activeTab === "staff") {
        success = await login(email, password);
      } else {
        success = await patientLogin(upid, pin);
      }

      if (success) {
        onLoginSuccess();
      } else {
        setError(activeTab === "staff" ? "Invalid email or password" : "Invalid UPID or PIN. Note: patient portal login is active only while admitted.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: string) => {
    bypassRole(role);
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-900/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center space-y-3 mb-8">
          <img src={logo} alt="CareFlow" className="w-12 h-12 object-contain filter drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]" />
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tight">Welcome to CareFlow</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Cross-Hospital Information System</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80 mb-6">
          <button
            onClick={() => { setActiveTab("staff"); setError(null); }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-md transition-all duration-200 ${
              activeTab === "staff"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Hospital Staff
          </button>
          <button
            onClick={() => { setActiveTab("patient"); setError(null); }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-md transition-all duration-200 ${
              activeTab === "patient"
                ? "bg-teal-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Patient Portal
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg font-semibold text-center mb-6">
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === "staff" ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Staff Email</label>
                <input
                  type="email"
                  placeholder="doctor@careflow.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition placeholder-slate-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition placeholder-slate-600"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Universal Patient ID (UPID)</label>
                <input
                  type="text"
                  placeholder="CF-2026-AB3F7E91"
                  value={upid}
                  onChange={e => setUpid(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition placeholder-slate-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">6-Digit Admission PIN</label>
                <input
                  type="password"
                  placeholder="123456"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition placeholder-slate-600 tracking-widest"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-xs font-extrabold text-white transition active:scale-[0.98] mt-2 ${
              activeTab === "staff"
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-900/30"
                : "bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-900/30"
            }`}
          >
            {loading ? "Authenticating..." : activeTab === "staff" ? "Sign In to Dashboard" : "Access Patient Portal"}
          </button>
        </form>

        {/* Demo Roles Quick Login */}
        <div className="border-t border-slate-800/80 mt-8 pt-6">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-center mb-3">Simulation Demo Roles</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { role: "receptionist", label: "Reception" },
              { role: "doctor", label: "Doctor" },
              { role: "nurse", label: "Nurse" },
              { role: "ward_boy", label: "Ward Boy" },
              { role: "lab_tech", label: "Lab Tech" },
              { role: "pharmacist", label: "Pharmacy" },
              { role: "medical_director", label: "Director" },
              { role: "admin", label: "Admin" },
              { role: "patient", label: "Patient" }
            ].map(d => (
              <button
                key={d.role}
                onClick={() => handleQuickLogin(d.role)}
                className="bg-slate-950 border border-slate-800/60 hover:border-slate-700 text-[10px] font-bold text-slate-300 py-1.5 px-2 rounded-md transition text-center hover:bg-slate-900"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
