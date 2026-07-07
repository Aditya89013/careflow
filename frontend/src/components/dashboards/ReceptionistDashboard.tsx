import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export const ReceptionistDashboard: React.FC = () => {
  const { token, logout } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Other");
  const [bloodGroup, setBloodGroup] = useState("Unknown");
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [triageLevel, setTriageLevel] = useState("3_urgent");
  const [deptCode, setDeptCode] = useState("general");
  const [needsVentilator, setNeedsVentilator] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ upid: string; pin: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Discharge modal
  const [dischargingPatient, setDischargingPatient] = useState<any | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState("");

  const API_URL = "http://localhost:3001/api/v1";

  const fetchData = async () => {
    try {
      const pRes = await fetch(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pRes.ok) setPatients(await pRes.json());

      const bRes = await fetch(`${API_URL}/beds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (bRes.ok) setBeds(await bRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessInfo(null);
    setErrorMsg(null);

    const payload = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dob,
      gender,
      blood_group: bloodGroup,
      phone,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      allergies: allergies ? allergies.split(",").map(a => a.trim()) : [],
      current_medications: medications ? medications.split(",").map(m => m.trim()) : [],
      insurance_provider: insuranceProvider,
      insurance_policy_number: insurancePolicy,
      triage_level: triageLevel,
      required_department_code: deptCode,
      needs_ventilator: needsVentilator
    };

    try {
      const res = await fetch(`${API_URL}/patients/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessInfo({ upid: data.upid, pin: data.pin });
        fetchData();
        // Clear fields
        setFirstName("");
        setLastName("");
        setDob("");
        setPhone("");
        setEmergencyName("");
        setEmergencyPhone("");
        setAllergies("");
        setMedications("");
        setInsuranceProvider("");
        setInsurancePolicy("");
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to register patient");
      }
    } catch (err) {
      setErrorMsg("Connection failure while admitting patient");
    }
  };

  const handleEmergencyAdmitBypass = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setFirstName("Jane");
    setLastName(`Doe-${randomSuffix}`);
    setDob("1980-01-01");
    setGender("Other");
    setBloodGroup("Unknown");
    setPhone("555-911-0000");
    setEmergencyName("EMS Transit Team");
    setEmergencyPhone("911");
    setAllergies("None");
    setMedications("None");
    setTriageLevel("1_resuscitation");
    setDeptCode("ICU");
    setNeedsVentilator(true);
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargingPatient) return;

    try {
      const res = await fetch(`${API_URL}/patients/${dischargingPatient.id}/discharge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          discharge_summary: dischargeSummary,
          primary_diagnosis: primaryDiagnosis
        })
      });

      if (res.ok) {
        setDischargingPatient(null);
        setDischargeSummary("");
        setPrimaryDiagnosis("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activePatients = patients.filter(p => p.status !== "discharged");
  const filteredPatients = activePatients.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.upid && p.upid.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.status === "occupied").length;
  const freeBeds = totalBeds - occupiedBeds;

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header bar */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <span className="bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
              Admissions & Reception Desk
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2 font-sans">Operations & Admissions Registry</h1>
            <p className="text-xs text-slate-500 mt-0.5">Authorized staff intake directory</p>
          </div>
          <div className="flex space-x-4 items-center">
            <div className="text-xs bg-slate-50 px-4 py-2 border border-slate-200 rounded-lg">
              <span className="text-slate-500 font-medium">Available Beds:</span>{" "}
              <strong className="text-slate-800 font-bold">{freeBeds} / {totalBeds}</strong>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Admission Form */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Patient Intake & Registration</h3>
              <p className="text-xs text-slate-500 mt-0.5">Generates a permanent cross-hospital UPID and temporary portal credentials.</p>
            </div>

            {successInfo && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl space-y-2">
                <p className="text-xs font-bold">✔ Patient Admitted Successfully!</p>
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 mt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Universal ID (UPID)</span>
                    <p className="font-mono text-slate-800 text-sm font-bold mt-1 select-all">{successInfo.upid}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Temporary Portal PIN</span>
                    <p className="font-mono text-blue-600 text-sm font-bold mt-1 select-all">{successInfo.pin}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">Provide the UPID and PIN to the patient to log in on their mobile device or home PC.</p>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs text-center font-bold">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Emergency Intake Bypass</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Admit unidentified or critical patients immediately with default bypass metadata.</p>
              </div>
              <button
                type="button"
                onClick={handleEmergencyAdmitBypass}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition active:scale-95"
              >
                Autofill Emergency Jane Doe
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sharma"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={e => setBloodGroup(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="O+">O+</option>
                    <option value="AB+">AB+</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Primary Phone</label>
                  <input
                    type="text"
                    placeholder="555-0199"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Emergency Contact</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      className="w-1/2 bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      className="w-1/2 bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Allergies (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Peanuts"
                    value={allergies}
                    onChange={e => setAllergies(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Medications</label>
                  <input
                    type="text"
                    placeholder="e.g. Metformin 500mg"
                    value={medications}
                    onChange={e => setMedications(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Triage Level</label>
                  <select
                    value={triageLevel}
                    onChange={e => setTriageLevel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="1_resuscitation">Level 1 - Resuscitation</option>
                    <option value="2_emergent">Level 2 - Emergent</option>
                    <option value="3_urgent">Level 3 - Urgent</option>
                    <option value="4_less_urgent">Level 4 - Less Urgent</option>
                    <option value="5_non_urgent">Level 5 - Non Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Required Ward</label>
                  <select
                    value={deptCode}
                    onChange={e => setDeptCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="general">General Ward</option>
                    <option value="ICU">Intensive Care Unit (ICU)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 pt-5">
                  <input
                    id="needsVentilatorCheck"
                    type="checkbox"
                    checked={needsVentilator}
                    onChange={e => setNeedsVentilator(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-white"
                  />
                  <label htmlFor="needsVentilatorCheck" className="text-xs font-bold text-slate-600">Needs Ventilator</label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg transition duration-150 active:scale-[0.98] mt-4"
              >
                Admit & Generate Portal Credentials
              </button>
            </form>
          </div>

          {/* Admitted census directory */}
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Active Census ({activePatients.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">Search and discharge admitted patients.</p>
            </div>

            <input
              type="text"
              placeholder="Search by Name or UPID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-300"
            />

            <div className="space-y-3 overflow-y-auto max-h-[450px] pr-1">
              {filteredPatients.map((p: any) => (
                <div key={p.id} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-start space-x-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{p.first_name} {p.last_name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.upid || "Legacy ID"}</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                      {p.triage_level.split("_")[1]} • {p.required_department_code}
                    </p>
                  </div>
                  <button
                    onClick={() => setDischargingPatient(p)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold px-2.5 py-1 rounded transition"
                  >
                    DISCHARGE
                  </button>
                </div>
              ))}
              {filteredPatients.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-6">No matching active patients.</p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Discharge Modal */}
      {dischargingPatient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-[9999]">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Discharge Patient</h3>
            <p className="text-xs text-slate-500">Completing discharge for <strong>{dischargingPatient.first_name} {dischargingPatient.last_name}</strong>. Their portal access will terminate immediately.</p>

            <form onSubmit={handleDischarge} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Primary Diagnosis / ICD Index</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Respiratory Distress"
                  value={primaryDiagnosis}
                  onChange={e => setPrimaryDiagnosis(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discharge Summary / Clinical Notes</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Patient fully stabilized. Prescribed medications reconciled."
                  value={dischargeSummary}
                  onChange={e => setDischargeSummary(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none resize-none"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDischargingPatient(null)}
                  className="flex-1 bg-white border border-slate-200 text-slate-500 font-bold py-2 rounded text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs transition"
                >
                  Confirm Discharge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
