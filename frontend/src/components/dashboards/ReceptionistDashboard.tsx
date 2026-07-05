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

  const fetchData = async () => {
    try {
      const pRes = await fetch("http://localhost:3001/api/v1/patients", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pRes.ok) setPatients(await pRes.json());

      const bRes = await fetch("http://localhost:3001/api/v1/beds", {
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
      const res = await fetch("http://localhost:3001/api/v1/patients/register", {
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
      const res = await fetch(`http://localhost:3001/api/v1/patients/${dischargingPatient.id}/discharge`, {
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
    <div className="space-y-8 font-sans">
      
      {/* Header bar */}
      <div className="bg-gradient-to-r from-amber-900/30 to-amber-950/15 border border-amber-800/40 p-6 rounded-2xl flex justify-between items-center shadow-lg">
        <div>
          <span className="bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            RECEPTION & CHECK-IN DESK
          </span>
          <h2 className="text-xl font-black text-white mt-3">Operations & Admissions Registry</h2>
          <p className="text-slate-400 text-xs mt-1">AIIMS Admissions Desk simulator</p>
        </div>
        <div className="flex space-x-4">
          <div className="text-right text-xs bg-slate-950/40 px-4 py-2 border border-slate-800 rounded-xl">
            <span className="text-slate-400">Available Beds:</span>{" "}
            <strong className="text-amber-400 font-black">{freeBeds} / {totalBeds}</strong>
          </div>
          <button
            onClick={logout}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-95"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Admission Form */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">Patient Intake & Registration</h3>
            <p className="text-slate-400 text-xs mt-0.5">Generates a permanent cross-hospital UPID & temporary PIN credentials.</p>
          </div>

          {successInfo && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl space-y-2">
              <p className="text-xs font-bold">✔ Patient Admitted Successfully!</p>
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800/60 mt-1">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Universal ID (UPID)</span>
                  <p className="font-mono text-white text-sm font-bold mt-1 select-all">{successInfo.upid}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Temporary Portal PIN</span>
                  <p className="font-mono text-amber-400 text-sm font-bold mt-1 select-all">{successInfo.pin}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Give the UPID and PIN to the patient to log in on their mobile device.</p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center font-bold">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-between items-center bg-red-950/20 border border-red-900/35 p-4 rounded-xl mb-4">
            <div>
              <h4 className="text-xs font-bold text-red-400">Emergency Intake Bypass</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Use this to admit an unidentified or critical patient immediately.</p>
            </div>
            <button
              type="button"
              onClick={handleEmergencyAdmitBypass}
              className="bg-red-900/80 hover:bg-red-900 border border-red-700 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg transition active:scale-95"
            >
              Autofill Jane Doe
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">First Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={e => setBloodGroup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
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
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Primary Phone</label>
                <input
                  type="text"
                  placeholder="555-0199"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Emergency Contact</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={emergencyName}
                    onChange={e => setEmergencyName(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={emergencyPhone}
                    onChange={e => setEmergencyPhone(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Allergies (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts"
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Current Medications</label>
                <input
                  type="text"
                  placeholder="e.g. Metformin 500mg"
                  value={medications}
                  onChange={e => setMedications(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-800/80 pt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Triage Level</label>
                <select
                  value={triageLevel}
                  onChange={e => setTriageLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="1_resuscitation">Level 1 - Resuscitation</option>
                  <option value="2_emergent">Level 2 - Emergent</option>
                  <option value="3_urgent">Level 3 - Urgent</option>
                  <option value="4_less_urgent">Level 4 - Less Urgent</option>
                  <option value="5_non_urgent">Level 5 - Non Urgent</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Required Ward</label>
                <select
                  value={deptCode}
                  onChange={e => setDeptCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
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
                  className="rounded border-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                />
                <label htmlFor="needsVentilatorCheck" className="text-xs font-bold text-slate-300">Needs Ventilator</label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl transition duration-150 active:scale-[0.98] mt-4"
            >
              Admit & Generate Admission credentials
            </button>
          </form>
        </div>

        {/* Admitted census directory */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">Active Census ({activePatients.length})</h3>
            <p className="text-slate-400 text-xs mt-0.5">Search and discharge admitted patients.</p>
          </div>

          <input
            type="text"
            placeholder="Search by Name or UPID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
          />

          <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
            {filteredPatients.map((p: any) => (
              <div key={p.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-start space-x-2">
                <div>
                  <h4 className="text-xs font-bold text-white">{p.first_name} {p.last_name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.upid || "Legacy ID"}</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">{p.triage_level.split("_")[1]} • {p.required_department_code}</p>
                </div>
                <button
                  onClick={() => setDischargingPatient(p)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-[10px] font-black px-2 py-1 rounded"
                >
                  DISCHARGE
                </button>
              </div>
            ))}
            {filteredPatients.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-6">No matching active patients.</p>
            )}
          </div>
        </div>

      </div>

      {/* Discharge Modal */}
      {dischargingPatient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 z-[9999]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Discharge Patient</h3>
            <p className="text-xs text-slate-400">Completing discharge for <strong>{dischargingPatient.first_name} {dischargingPatient.last_name}</strong>. Their portal access will terminate immediately.</p>

            <form onSubmit={handleDischarge} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Primary Diagnosis / ICD Index</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Respiratory Distress"
                  value={primaryDiagnosis}
                  onChange={e => setPrimaryDiagnosis(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Discharge Summary / Clinical Notes</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Patient fully stabilized. Prescribed medications reconciled."
                  value={dischargeSummary}
                  onChange={e => setDischargeSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDischargingPatient(null)}
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-400 font-bold py-2 rounded-xl text-xs hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs"
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
