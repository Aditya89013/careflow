import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { API_URL } from "../../config";

export const SuperAdminDashboard: React.FC = () => {
  const { token, logout, user } = useAuth();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields for new hospital
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [ownerFirst, setOwnerFirst] = useState("");
  const [ownerLast, setOwnerLast] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);



  const fetchHospitals = async () => {
    try {
      const res = await fetch(`${API_URL}/super-admin/hospitals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHospitals(data.hospitals || []);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to load hospitals list");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error loading hospitals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [token]);

  const handleRegisterHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      name,
      address,
      contact_phone: phone,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      owner_first_name: ownerFirst,
      owner_last_name: ownerLast,
      owner_email: ownerEmail,
      owner_password: ownerPassword
    };

    try {
      const res = await fetch(`${API_URL}/super-admin/hospitals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(`Hospital "${name}" and owner account registered successfully! Default ER and ICU departments created.`);
        setName("");
        setAddress("");
        setPhone("");
        setLatitude("");
        setLongitude("");
        setOwnerFirst("");
        setOwnerLast("");
        setOwnerEmail("");
        setOwnerPassword("");
        fetchHospitals();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to register hospital");
      }
    } catch (err) {
      setErrorMsg("Network error registering hospital");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
              System Admin Console
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2">CareFlow Global Command Center</h1>
            <p className="text-xs text-slate-500 mt-0.5">Logged in as: <strong className="text-slate-700">{user?.email} (Super Admin)</strong></p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-600 transition"
          >
            Sign Out
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg text-center font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-lg text-center font-semibold">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Add Hospital Form */}
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Register New Hospital</h2>
              <p className="text-xs text-slate-500 mt-0.5">Add a new hospital facility into the global CareFlow network.</p>
            </div>

            <form onSubmit={handleRegisterHospital} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Hospital Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo Hospital"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jasola Vihar, New Delhi"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contact Phone</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 011-40599900"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Latitude (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 28.5672"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Longitude (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 77.2100"
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Owner / Manager Credentials */}
              <div className="border-t border-slate-100 pt-3 mt-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase mb-2">Owner / Manager Details</h3>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane"
                      value={ownerFirst}
                      onChange={e => setOwnerFirst(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Smith"
                      value={ownerLast}
                      onChange={e => setOwnerLast(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Owner Email</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@hospital.com"
                      value={ownerEmail}
                      onChange={e => setOwnerEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Owner Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={ownerPassword}
                      onChange={e => setOwnerPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition active:scale-95 mt-2"
              >
                {submitting ? "Registering..." : "Register Hospital & Owner"}
              </button>
            </form>
          </div>

          {/* Right panel: Registered Hospitals List */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 font-sans">Active Facilities Network ({hospitals.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time resource capacity & metrics for all mapped hospitals.</p>
            </div>

            {loading ? (
              <div className="text-center py-12 text-xs text-slate-400 italic">Loading facilities...</div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {hospitals.map((h: any) => (
                  <div key={h.id} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 bg-white transition space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{h.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">{h.address}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Phone: {h.contact_phone} • Coordinates: {h.latitude}, {h.longitude}</p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {h.id}
                      </span>
                    </div>

                    {/* Facility Metrics grid */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                      <div className="text-center bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Beds</span>
                        <span className="text-xs font-bold text-slate-700">{h.metrics.occupied_beds} / {h.metrics.total_beds}</span>
                      </div>
                      <div className="text-center bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Ventilators</span>
                        <span className="text-xs font-bold text-slate-700">{h.metrics.in_use_ventilators} / {h.metrics.total_ventilators}</span>
                      </div>
                      <div className="text-center bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Staff</span>
                        <span className="text-xs font-bold text-slate-700">{h.metrics.total_staff}</span>
                      </div>
                      <div className="text-center bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Patients</span>
                        <span className="text-xs font-bold text-slate-700">{h.metrics.total_patients}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {hospitals.length === 0 && (
                  <div className="text-center py-12 text-xs text-slate-400 italic">No registered hospitals in the global network database.</div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
