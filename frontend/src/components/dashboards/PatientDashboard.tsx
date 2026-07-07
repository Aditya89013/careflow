import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export const PatientDashboard: React.FC = () => {
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stays" | "emergency">("stays");
  
  // Stays & Treatments State
  const [portalData, setPortalData] = useState<any>(null);
  const [loadingStays, setLoadingStays] = useState(true);

  // Emergency Finder State
  const [symptoms, setSymptoms] = useState("");
  const [wardRequired, setWardRequired] = useState("general");
  const [rankedHospitals, setRankedHospitals] = useState<any[]>([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [submittingEmergency, setSubmittingEmergency] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api/v1`;

  const fetchTreatments = async () => {
    setLoadingStays(true);
    try {
      const res = await fetch(`${API_URL}/patient-portal/treatments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        setPortalData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStays(false);
    }
  };

  useEffect(() => {
    if (activeTab === "stays") {
      fetchTreatments();
    }
  }, [token, activeTab]);

  const handleSearchHospitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setSearchingHospitals(true);
    setRankedHospitals([]);
    setRequestStatus(null);

    try {
      const res = await fetch(`${API_URL}/emergency/find-hospitals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ symptoms, ward_required: wardRequired })
      });
      if (res.ok) {
        setRankedHospitals(await res.json());
      } else {
        setRequestStatus("Failed to rank hospitals. Please try again.");
      }
    } catch {
      setRequestStatus("Error communicating with emergency service.");
    } finally {
      setSearchingHospitals(false);
    }
  };

  const handleRequestEmergency = async (hospId: string, hospName: string) => {
    setSubmittingEmergency(hospId);
    setRequestStatus(null);

    try {
      const res = await fetch(`${API_URL}/emergency/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          hospital_id: hospId,
          patient_name: `${user?.first_name} ${user?.last_name}`,
          phone: portalData?.customer?.phone || "555-0199",
          symptoms,
          ward_required: wardRequired
        })
      });
      if (res.ok) {
        setRequestStatus(`Emergency request successfully submitted to ${hospName}! Awaiting triage.`);
      } else {
        setRequestStatus("Failed to submit request.");
      }
    } catch {
      setRequestStatus("Error submitting emergency request.");
    } finally {
      setSubmittingEmergency(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6 text-slate-800 bg-white min-h-screen">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
            Customer Patient Portal
          </span>
          <h2 className="text-xl font-bold mt-2 text-slate-900">
            Welcome, {user?.first_name} {user?.last_name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            UPID: <code className="font-mono bg-slate-50 px-1 rounded">{user?.upid}</code>
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
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("stays")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "stays" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Ongoing Stays & Treatments
        </button>
        <button
          onClick={() => setActiveTab("emergency")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "emergency" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          🚨 Find Emergency Hospital
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "stays" ? (
        <div className="space-y-6">
          {loadingStays ? (
            <div className="text-center py-12 text-xs font-bold text-slate-400">Loading your treatments and stays...</div>
          ) : !portalData?.treatments?.length ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-12 text-center text-slate-400">
              <p className="text-sm font-semibold">No active treatments found</p>
              <p className="text-xs mt-1">There are no active stays registered for you or your relatives currently.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {portalData.treatments.map((tr: any) => (
                <div key={tr.patient_id} className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-4">
                  {/* Title Bar */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-3 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{tr.first_name} {tr.last_name}</h3>
                      <p className="text-xs text-slate-500">Facility: <strong className="text-slate-700">{tr.hospital_name}</strong></p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded-full border border-green-200 uppercase">
                      {tr.status}
                    </span>
                  </div>

                  {/* Stays Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stay Stats */}
                    <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Stay Context</h4>
                      <div className="flex justify-between items-center text-xs">
                        <span>Assigned Bed:</span>
                        <strong className="text-slate-900">{tr.bed_number}</strong>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span>Admitted At:</span>
                        <strong className="text-slate-700">{new Date(tr.admitted_at).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span>Triage level:</span>
                        <strong className="text-slate-900 uppercase text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {tr.triage_level.replace("_", " ")}
                        </strong>
                      </div>
                    </div>

                    {/* Clinicians */}
                    <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Clinical Team</h4>
                      <div className="text-xs">
                        <span className="block text-slate-500">Treating Doctor:</span>
                        <strong className="block text-slate-900 mt-0.5">{tr.doctor_name}</strong>
                      </div>
                      <div className="text-xs pt-1">
                        <span className="block text-slate-500">Nurses on Duty:</span>
                        {tr.nurses?.length ? (
                          <div className="mt-1 space-y-1">
                            {tr.nurses.map((n: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                                <span>• {n.name}</span>
                                <span className="text-slate-400 capitalize">({n.shift_type} Shift)</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No nurse shifts scheduled</span>
                        )}
                      </div>
                    </div>

                    {/* Diet Plan */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">🧬 AI Clinical Diet Plan</h4>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 font-medium leading-relaxed shadow-sm">
                        {tr.diet_plan}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Symptoms and Ward Input Form */}
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900 mb-4">🚨 Request Emergency Triage</h3>
            
            <form onSubmit={handleSearchHospitals} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Describe Symptoms (AI Diagnostic Context)</label>
                <textarea
                  required
                  rows={3}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Patient has severe breathing difficulty, chest pain, and 102F fever. Needs oxygen support."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Required Ward/OPD Type</label>
                <select
                  value={wardRequired}
                  onChange={(e) => setWardRequired(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none bg-white text-slate-800"
                >
                  <option value="general">General Ward</option>
                  <option value="ICU">Intensive Care Unit (ICU)</option>
                  <option value="HDU">High Dependency Unit (HDU)</option>
                  <option value="isolation">Isolation Ward</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={searchingHospitals}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold tracking-wider uppercase transition-all"
              >
                {searchingHospitals ? "Ranking Facilities with AI..." : "Search & Rank Facilities"}
              </button>
            </form>
          </div>

          {/* Action alerts */}
          {requestStatus && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-4 rounded-xl text-center font-semibold">
              {requestStatus}
            </div>
          )}

          {/* Hospital Rankings */}
          {rankedHospitals.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI-Preferred Facility Dispatch Order</h4>
              
              <div className="grid grid-cols-1 gap-4">
                {rankedHospitals.map((h: any) => (
                  <div key={h.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center">
                          {h.rank}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{h.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500">{h.address} · Call: {h.phone}</p>
                      
                      {/* AI Reasoning */}
                      <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 italic">
                        <strong>AI Dispatch Reason:</strong> {h.reason}
                      </div>

                      {/* Resource details */}
                      <div className="flex gap-4 pt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Beds: {h.free_beds} Free / {h.total_beds} Total</span>
                        {wardRequired === "ICU" && (
                          <span>Vents: {h.available_vents} Avail / {h.total_vents} Total</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRequestEmergency(h.id, h.name)}
                      disabled={submittingEmergency === h.id}
                      className="py-1.5 px-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-md uppercase tracking-wider transition-all whitespace-nowrap"
                    >
                      {submittingEmergency === h.id ? "Requesting..." : "Request Dispatch"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
