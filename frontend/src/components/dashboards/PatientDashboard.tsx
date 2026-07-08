import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { API_URL } from "../../config";

export const PatientDashboard: React.FC = () => {
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stays" | "emergency">("stays");
  
  // Stays & Treatments State
  const [portalData, setPortalData] = useState<any>(null);
  const [loadingStays, setLoadingStays] = useState(true);

  // Dynamic Questionnaire State
  const [questionnaireStep, setQuestionnaireStep] = useState<number>(1);
  const [primarySymptom, setPrimarySymptom] = useState("Other General Issue");
  const [duration, setDuration] = useState("Recent (few hours)");
  const [secondarySymptoms, setSecondarySymptoms] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");

  // Emergency Matchmaking State
  const [rankedHospitals, setRankedHospitals] = useState<any[]>([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [submittingEmergency, setSubmittingEmergency] = useState<string | null>(null);

  const fetchTreatments = async () => {
    setLoadingStays(true);
    try {
      const res = await fetch(`${API_URL}/patient-portal/treatments`, {
        headers: { Authorization: `Bearer ${token}` }
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

  const toggleSecondarySymptom = (sym: string) => {
    if (secondarySymptoms.includes(sym)) {
      setSecondarySymptoms(secondarySymptoms.filter(s => s !== sym));
    } else {
      setSecondarySymptoms([...secondarySymptoms, sym]);
    }
  };

  const getInferredWard = () => {
    const isCriticalSymptom = ["Chest Pain", "Shortness of Breath"].includes(primarySymptom);
    const isAcute = duration === "Acute (less than 1 hour)";
    if (isCriticalSymptom || isAcute) return "ICU";
    if (primarySymptom === "Severe Trauma/Bleeding") return "HDU";
    return "general";
  };

  const compileSymptomDescription = () => {
    const secondaryStr = secondarySymptoms.length > 0 ? secondarySymptoms.join(", ") : "None";
    return `Patient is experiencing: ${primarySymptom}. Duration/onset: ${duration}. Associated symptoms: ${secondaryStr}. Additional Details: ${additionalContext || "None"}.`;
  };

  const handleSearchHospitals = async (e: React.FormEvent) => {
    e.preventDefault();
    const symptomsText = compileSymptomDescription();
    const inferredWard = getInferredWard();

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
        body: JSON.stringify({ symptoms: symptomsText, ward_required: inferredWard })
      });
      if (res.ok) {
        setRankedHospitals(await res.json());
        setQuestionnaireStep(5); // Go to results view
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
      const symptomsText = compileSymptomDescription();
      const inferredWard = getInferredWard();

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
          symptoms: symptomsText,
          ward_required: inferredWard
        })
      });
      if (res.ok) {
        setRequestStatus(`Emergency dispatch successfully requested from ${hospName}! Awaiting active unit response.`);
      } else {
        setRequestStatus("Failed to submit emergency dispatch request.");
      }
    } catch {
      setRequestStatus("Error requesting emergency dispatch.");
    } finally {
      setSubmittingEmergency(null);
    }
  };

  const resetQuestionnaire = () => {
    setQuestionnaireStep(1);
    setPrimarySymptom("Other General Issue");
    setDuration("Recent (few hours)");
    setSecondarySymptoms([]);
    setAdditionalContext("");
    setRankedHospitals([]);
    setRequestStatus(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8 text-slate-900 bg-white min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
            Customer Patient Portal
          </span>
          <h2 className="text-xl font-bold mt-2 text-slate-900">
            Welcome, {user?.first_name} {user?.last_name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Universal Patient ID: <code className="font-mono bg-slate-50 px-1.5 py-0.5 rounded text-[11px] text-slate-800">{user?.upid}</code>
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
      <div className="flex border-b border-slate-200 gap-1 p-0.5 bg-slate-50 rounded border max-w-sm">
        <button
          onClick={() => setActiveTab("stays")}
          className={`flex-1 py-2 text-xs font-bold uppercase rounded tracking-wider transition-all ${
            activeTab === "stays" ? "bg-white text-slate-900 shadow-sm border border-slate-250" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          My Stays & Treatments
        </button>
        <button
          onClick={() => { setActiveTab("emergency"); resetQuestionnaire(); }}
          className={`flex-1 py-2 text-xs font-bold uppercase rounded tracking-wider transition-all ${
            activeTab === "emergency" ? "bg-white text-slate-950 shadow-sm border border-slate-250" : "text-slate-400 hover:text-slate-900"
          }`}
        >
          🚨 Request Emergency
        </button>
      </div>

      {/* Stays and Treatment Sessions */}
      {activeTab === "stays" && (
        <div className="space-y-8">
          
          {/* Active Treatment Tracking Section */}
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
              Active Treatment Sessions (Real-Time Care Tracking)
            </h3>
            {loadingStays ? (
              <div className="text-center py-6 text-xs text-slate-400 font-bold">Querying clinical session logs...</div>
            ) : !portalData?.treatment_sessions?.length ? (
              <p className="text-xs text-slate-400 italic">No active care session or treatment registry records found.</p>
            ) : (
              <div className="space-y-4">
                {portalData.treatment_sessions.map((ts: any) => (
                  <div key={ts.id} className="border border-slate-200 rounded p-4 space-y-3 bg-white">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Session ID</span>
                        <span className="block text-xs font-mono font-bold text-slate-800">{ts.id}</span>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full uppercase">
                        {ts.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block text-slate-500">Primary Clinician ID</span>
                        <strong className="text-slate-800 font-mono">{ts.assigned_employee_id || "Awaiting AI Assignment"}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500">Allocated Equipment Resources</span>
                        {ts.resource_used_ids && ts.resource_used_ids.length > 0 ? (
                          <div className="flex gap-1 flex-wrap mt-0.5">
                            {ts.resource_used_ids.map((rid: string) => (
                              <span key={rid} className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] border border-slate-200">
                                {rid}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <strong className="text-slate-400 italic">No mechanical resources assigned</strong>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded p-2.5 text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-500 text-[10px] uppercase block mb-1">Clinical Indication & Diagnosis</strong>
                      {ts.health_issue_description || "Awaiting clinical description."}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stays & Care Log */}
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
              Ongoing Stays & Clinician Caseloads
            </h3>
            {loadingStays ? (
              <div className="text-center py-6 text-xs text-slate-400 font-bold">Querying ward stay records...</div>
            ) : !portalData?.treatments?.length ? (
              <p className="text-xs text-slate-400 italic">No active hospital stays or admissions found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {portalData.treatments.map((tr: any) => (
                  <div key={tr.patient_id} className="border border-slate-200 rounded p-5 space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3 gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{tr.first_name} {tr.last_name}</h4>
                        <p className="text-xs text-slate-500">Facility: <strong className="text-slate-700">{tr.hospital_name}</strong></p>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full uppercase">
                        {tr.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Stay Context</h5>
                        <div className="flex justify-between text-xs text-slate-700">
                          <span>Assigned Bed:</span>
                          <strong className="text-slate-900 font-mono">{tr.bed_number}</strong>
                        </div>
                        <div className="flex justify-between text-xs text-slate-700">
                          <span>Admitted At:</span>
                          <strong className="text-slate-800">{new Date(tr.admitted_at).toLocaleDateString()}</strong>
                        </div>
                        <div className="flex justify-between text-xs text-slate-700">
                          <span>Triage Level:</span>
                          <strong className="text-slate-900 uppercase text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            {tr.triage_level.replace("_", " ")}
                          </strong>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t md:border-t-0 md:border-x border-slate-100 pt-3 md:pt-0 md:px-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned Clinical Team</h5>
                        <div className="text-xs text-slate-750">
                          <span className="block text-slate-500">Doctor:</span>
                          <strong className="text-slate-900 block mt-0.5">{tr.doctor_name}</strong>
                        </div>
                        <div className="text-xs pt-1">
                          <span className="block text-slate-500 mb-0.5">Nurses on Duty:</span>
                          {tr.nurses?.length ? (
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                              {tr.nurses.map((n: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                                  <span>• {n.name}</span>
                                  <span className="text-slate-400 capitalize">({n.shift_type})</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No nurse shift active</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">🧬 AI Diet Plan Recommendation</h5>
                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded text-xs text-slate-700 leading-relaxed italic">
                          {tr.diet_plan}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Matchmaking Section */}
      {activeTab === "emergency" && (
        <div className="space-y-6">
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <h3 className="text-sm font-bold text-slate-900">🚨 Smart Emergency Facility Matchmaking</h3>
              {questionnaireStep > 1 && (
                <button
                  onClick={resetQuestionnaire}
                  className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
                >
                  Restart Questionnaire
                </button>
              )}
            </div>

            {/* Dynamic Step Questionnaire */}
            {questionnaireStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questionnaire — Step 1 of 4</span>
                  <h4 className="text-sm font-bold text-slate-900">What is the primary symptom you are currently experiencing?</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Chest Pain",
                    "Shortness of Breath",
                    "Severe Trauma/Bleeding",
                    "High Fever/Infection",
                    "Abdominal Pain",
                    "Other General Issue"
                  ].map((sym) => (
                    <button
                      key={sym}
                      onClick={() => { setPrimarySymptom(sym); setQuestionnaireStep(2); }}
                      className={`text-left p-3 text-xs border rounded transition-all font-semibold ${
                        primarySymptom === sym ? "border-slate-900 bg-slate-50 text-slate-900" : "border-slate-200 hover:border-slate-450 bg-white"
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {questionnaireStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questionnaire — Step 2 of 4</span>
                  <h4 className="text-sm font-bold text-slate-900">How long has this symptom been active (onset duration)?</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Acute (less than 1 hour)",
                    "Recent (few hours)",
                    "Sub-acute (1-2 days)",
                    "Chronic (longer)"
                  ].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => { setDuration(dur); setQuestionnaireStep(3); }}
                      className={`text-left p-3 text-xs border rounded transition-all font-semibold ${
                        duration === dur ? "border-slate-900 bg-slate-50 text-slate-900" : "border-slate-200 hover:border-slate-450 bg-white"
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setQuestionnaireStep(1)}
                  className="text-xs text-slate-400 hover:text-slate-900 underline block"
                >
                  Back
                </button>
              </div>
            )}

            {questionnaireStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questionnaire — Step 3 of 4</span>
                  <h4 className="text-sm font-bold text-slate-900">Select any secondary symptoms or indicators:</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Dizziness", "Nausea/Vomiting", "Cough/Congestion", "Confusion/Delirium", "Physical Injury"].map((sym) => {
                    const active = secondarySymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSecondarySymptom(sym)}
                        className={`text-center py-2 text-xs border rounded font-semibold transition-all ${
                          active ? "border-slate-900 bg-slate-50 text-slate-900" : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {sym} {active ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={() => setQuestionnaireStep(2)}
                    className="text-xs text-slate-550 underline"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setQuestionnaireStep(4)}
                    className="py-1.5 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded uppercase tracking-wider"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {questionnaireStep === 4 && (
              <form onSubmit={handleSearchHospitals} className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questionnaire — Step 4 of 4</span>
                  <h4 className="text-sm font-bold text-slate-900">Add any additional details or background medical conditions:</h4>
                </div>
                <textarea
                  rows={4}
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g. Asthma patient. Difficulty breathing started after exercise. Oxygen support would be preferred."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                />
                
                <div className="bg-slate-50 border border-slate-200 p-4 rounded text-xs text-slate-700 space-y-1">
                  <strong className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Compiled Questionnaire Data Summary:</strong>
                  <div>• Primary: <strong>{primarySymptom}</strong></div>
                  <div>• Duration: <strong>{duration}</strong></div>
                  <div>• Secondary: <strong>{secondarySymptoms.length > 0 ? secondarySymptoms.join(", ") : "None"}</strong></div>
                  <div>• Inferred Placement Requirement: <strong className="text-slate-900 uppercase">{getInferredWard()} Ward</strong></div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setQuestionnaireStep(3)}
                    className="text-xs text-slate-550 underline"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={searchingHospitals}
                    className="py-2 px-5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded uppercase tracking-wider transition-all"
                  >
                    {searchingHospitals ? "Querying AI Matchmaker..." : "Find & Match Hospitals"}
                  </button>
                </div>
              </form>
            )}

            {/* Matchmaking Results view */}
            {questionnaireStep === 5 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Matchmaking Search Complete</h4>
                    <p className="text-xs text-slate-800 font-semibold mt-1">Found {rankedHospitals.length} matching facilities in your area.</p>
                  </div>
                  <button
                    onClick={resetQuestionnaire}
                    className="text-xs py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-bold"
                  >
                    Reset & Search Again
                  </button>
                </div>

                {requestStatus && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-4 rounded text-center font-bold">
                    {requestStatus}
                  </div>
                )}

                <div className="space-y-4">
                  {rankedHospitals.map((h: any) => (
                    <div key={h.id} className="border border-slate-200 rounded p-5 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center font-mono">
                            {h.rank}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{h.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500">{h.address} · Tel: {h.phone}</p>
                        
                        {/* Dispatch reasons */}
                        <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 italic leading-relaxed">
                          <strong>AI Capacity Reason:</strong> {h.reason}
                        </div>

                        {/* Beds & resources */}
                        <div className="flex gap-4 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                          <span>Beds: {h.free_beds} Free / {h.total_beds} Total</span>
                          {getInferredWard() === "ICU" && (
                            <span>Vents: {h.available_vents} Avail / {h.total_vents} Total</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRequestEmergency(h.id, h.name)}
                        disabled={submittingEmergency === h.id}
                        className="py-2 px-4 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded uppercase tracking-wider transition-all whitespace-nowrap"
                      >
                        {submittingEmergency === h.id ? "Submitting..." : "Request Dispatch"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
