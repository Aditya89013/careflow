import React, { useState } from "react";
import type { Patient } from "../App";

interface IntakeScreenProps {
  patients: Patient[];
  onIntake: (payload: any) => Promise<void>;
  onAllocate: (payload: any) => Promise<void>;
  loadingRecs: boolean;
  recommendations: any[];
  onFetchRecs: (patientId: string) => Promise<void>;
  setRecommendations: (recs: any[]) => void;
}

export const IntakeScreen: React.FC<IntakeScreenProps> = ({
  patients,
  onIntake,
  onAllocate,
  loadingRecs,
  recommendations,
  onFetchRecs,
  setRecommendations
}) => {
  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [triageLevel, setTriageLevel] = useState("2_emergent");
  const [deptCode, setDeptCode] = useState("ICU");
  const [needsVentilator, setNeedsVentilator] = useState(false);

  // Vitals states
  const [hr, setHr] = useState("");
  const [bp, setBp] = useState("");
  const [o2, setO2] = useState("");
  const [oxygenationSource, setOxygenationSource] = useState<"SpO2" | "PaO2">("SpO2");
  const [isDelirious, setIsDelirious] = useState(false);

  // Allocation Wizard states
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedRecIndex, setSelectedRecIndex] = useState<number | null>(null);
  const [isOverride, setIsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const handleSubmitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    await onIntake({
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dob || undefined,
      triage_level: triageLevel,
      required_department_code: deptCode,
      needs_ventilator: needsVentilator,
      vitals: hr || bp || o2 ? { 
        hr: hr || "80", 
        bp: bp || "120/80", 
        o2: o2 || "98%", 
        oxygenation_source: oxygenationSource, 
        is_delirious: isDelirious 
      } : undefined
    });
    // Clear forms
    setFirstName("");
    setLastName("");
    setDob("");
    setHr("");
    setBp("");
    setO2("");
    setOxygenationSource("SpO2");
    setIsDelirious(false);
  };

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPatientId(val);
    setRecommendations([]);
    setSelectedRecIndex(null);
    if (val) {
      onFetchRecs(val);
    }
  };

  const handleConfirmAllocation = async () => {
    if (!selectedPatientId || selectedRecIndex === null) return;
    const rec = recommendations[selectedRecIndex];
    await onAllocate({
      patient_id: selectedPatientId,
      bed_id: rec.bedId,
      ventilator_id: rec.ventilatorId,
      primary_doctor_id: rec.staffId,
      is_override: isOverride,
      override_reason: isOverride ? overrideReason : undefined
    });
    // Reset wizard
    setSelectedPatientId("");
    setSelectedRecIndex(null);
    setRecommendations([]);
    setIsOverride(false);
    setOverrideReason("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 1. Patient Intake form */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-900">Patient Admission Intake</h2>
          <p className="text-gray-400 text-xs mt-1">Register a patient and assign triage classification.</p>
        </div>

        <form onSubmit={handleSubmitIntake} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="firstName" className="text-xs font-bold text-gray-400 uppercase">First Name</label>
              <input 
                id="firstName"
                type="text" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                required 
                className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lastName" className="text-xs font-bold text-gray-400 uppercase">Last Name</label>
              <input 
                id="lastName"
                type="text" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                required 
                className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="dob" className="text-xs font-bold text-gray-400 uppercase">Date of Birth</label>
              <input 
                id="dob"
                type="date" 
                value={dob} 
                onChange={e => setDob(e.target.value)} 
                className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:border-blue-500 transition text-gray-700"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="triageLevel" className="text-xs font-bold text-gray-400 uppercase">Triage Level</label>
              <select 
                id="triageLevel"
                value={triageLevel} 
                onChange={e => setTriageLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:border-blue-500 transition text-gray-700 bg-white"
              >
                <option value="1_resuscitation">Level 1 - Resuscitation (Red)</option>
                <option value="2_emergent">Level 2 - Emergent (Orange)</option>
                <option value="3_urgent">Level 3 - Urgent (Yellow)</option>
                <option value="4_less_urgent">Level 4 - Less Urgent (Green)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="deptCode" className="text-xs font-bold text-gray-400 uppercase">Required Ward</label>
              <select 
                id="deptCode"
                value={deptCode} 
                onChange={e => setDeptCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:border-blue-500 transition text-gray-700 bg-white"
              >
                <option value="ICU">Intensive Care (ICU)</option>
                <option value="general">General Medical Ward</option>
              </select>
            </div>
            <div className="flex items-center space-x-3 pt-6">
              <input 
                id="needsVentilator"
                type="checkbox" 
                checked={needsVentilator} 
                onChange={e => setNeedsVentilator(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="needsVentilator" className="text-sm font-semibold text-gray-700">Requires Mechanical Ventilator</label>
            </div>
          </div>

          {/* Vitals inputs */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Clinical Vitals (Optional)</span>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="vitalHR" className="text-[10px] font-bold text-gray-400">Heart Rate (bpm)</label>
                <input 
                  id="vitalHR"
                  type="number" 
                  placeholder="80" 
                  value={hr} 
                  onChange={e => setHr(e.target.value)} 
                  className="w-full px-3 py-1.5 border border-gray-100 rounded-md focus:outline-none text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="vitalBP" className="text-[10px] font-bold text-gray-400">BP (mmHg)</label>
                <input 
                  id="vitalBP"
                  type="text" 
                  placeholder="120/80" 
                  value={bp} 
                  onChange={e => setBp(e.target.value)} 
                  className="w-full px-3 py-1.5 border border-gray-100 rounded-md focus:outline-none text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="vitalO2" className="text-[10px] font-bold text-gray-400">Oxygen Sat (%)</label>
                <input 
                  id="vitalO2"
                  type="text" 
                  placeholder="98%" 
                  value={o2} 
                  onChange={e => setO2(e.target.value)} 
                  className="w-full px-3 py-1.5 border border-gray-100 rounded-md focus:outline-none text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <label htmlFor="vitalO2Source" className="text-[10px] font-bold text-gray-400">Oxygen Source</label>
                <select 
                  id="vitalO2Source"
                  value={oxygenationSource} 
                  onChange={e => setOxygenationSource(e.target.value as "SpO2" | "PaO2")}
                  className="w-full px-3 py-1.5 border border-gray-100 rounded-md focus:outline-none text-sm bg-white text-gray-700"
                >
                  <option value="SpO2">SpO2 (Pulse Oximetry)</option>
                  <option value="PaO2">PaO2 (Arterial Blood Gas)</option>
                </select>
              </div>
              <div className="flex items-center space-x-3 pt-5">
                <input 
                  id="isDelirious"
                  type="checkbox" 
                  checked={isDelirious} 
                  onChange={e => setIsDelirious(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isDelirious" className="text-sm font-semibold text-gray-700">Delirium Screen Positive</label>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-150 active:scale-95 shadow-sm shadow-blue-200"
          >
            Admit Patient & Run Matching Engine
          </button>
        </form>
      </div>

      {/* 2. Allocation recommendations wizard */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-900">Clinical Allocation Matching</h2>
          <p className="text-gray-400 text-xs mt-1">Select a waiting patient to resolve resource allocation options.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="selectPatient" className="text-xs font-bold text-gray-400 uppercase">Select Waiting Patient</label>
            <select 
              id="selectPatient"
              value={selectedPatientId} 
              onChange={handlePatientSelect}
              className="w-full px-4 py-2.5 border border-gray-100 rounded-lg focus:outline-none text-gray-700 bg-white"
            >
              <option value="">-- Choose patient --</option>
              {patients.filter(p => p.status === "waiting" || p.status === "admitted").map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.triage_level.replace("_", " ").toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {loadingRecs && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-sm text-gray-400 font-medium">Running multi-principle resource scoring matching...</p>
            </div>
          )}

          {!loadingRecs && recommendations.length > 0 && (
            <div className="space-y-6">
              {/* Top recommendations selection grid */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Allocation Options</span>
                <div className="grid grid-cols-3 gap-3">
                  {recommendations.map((rec, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedRecIndex(index);
                        setIsOverride(false);
                      }}
                      className={`p-3 rounded-lg border text-left flex flex-col justify-between h-24 transition duration-150 active:scale-95 ${
                        selectedRecIndex === index 
                          ? "border-blue-500 bg-blue-50/20 shadow-sm shadow-blue-100" 
                          : "border-gray-100 hover:bg-gray-50/50"
                      }`}
                    >
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Option {index + 1}</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">{rec.bedNumber}</p>
                      </div>
                      <span className={`inline-block self-start px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        rec.score >= 80 ? "bg-green-100 text-green-700" :
                        rec.score >= 60 ? "bg-blue-100 text-blue-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {rec.score}% Match
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Display detailed reasoning for the selected recommendation option */}
              {selectedRecIndex !== null && (
                <div className="bg-gray-50/50 border border-gray-100 p-5 rounded-xl space-y-4">
                  <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Assigned Bed</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{recommendations[selectedRecIndex].bedNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Attending Specialist</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{recommendations[selectedRecIndex].staffName}</p>
                    </div>
                    {recommendations[selectedRecIndex].ventilatorSerial && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Allocated Ventilator</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{recommendations[selectedRecIndex].ventilatorSerial}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Clinical Matching Reasoning</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {recommendations[selectedRecIndex].reasoning.map((reason: string, idx: number) => (
                        <li key={idx} className="text-xs text-gray-600">{reason}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Manual Override controls */}
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <input 
                        id="overrideCheck"
                        type="checkbox" 
                        checked={isOverride} 
                        onChange={e => setIsOverride(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="overrideCheck" className="text-sm font-bold text-red-600 uppercase tracking-wide">
                        ⚠️ Request Manual Override Command
                      </label>
                    </div>

                    {isOverride && (
                      <div className="space-y-1">
                        <label htmlFor="overrideReason" className="text-[10px] font-bold text-gray-400 uppercase">Justification Reasoning</label>
                        <textarea 
                          id="overrideReason"
                          rows={2} 
                          value={overrideReason} 
                          onChange={e => setOverrideReason(e.target.value)}
                          placeholder="Please document the clinical reason for overriding the recommended allocation."
                          required 
                          className="w-full px-3 py-2 border border-red-100 rounded-lg focus:outline-none focus:border-red-500 transition text-xs text-gray-700"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleConfirmAllocation}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-150 active:scale-95 shadow-sm shadow-blue-200"
                  >
                    Confirm Allocation Placement
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
