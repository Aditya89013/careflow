export interface Bed {
  id: string;
  bed_number: string;
  status: "free" | "occupied" | "cleaning" | "maintenance";
  type: "general" | "ICU" | "HDU" | "isolation";
}

export interface Ventilator {
  id: string;
  serial_number: string;
  status: "available" | "in_use" | "maintenance";
  type: "invasive" | "non_invasive";
}

export type StaffRole = 
  | "admin"
  | "receptionist"
  | "doctor"
  | "nurse"
  | "ward_boy"
  | "lab_tech"
  | "pharmacist"
  | "medical_director"
  | "dept_head" // for backward compatibility
  | "staff";     // for backward compatibility

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  specialty: string;
  contact_number: string;
  current_caseload?: number;
  email?: string;
  password_hash?: string;
}

export interface PatientVitals {
  hr: string;    // Heart Rate (bpm)
  bp: string;    // Blood Pressure (mmHg, e.g. "120/80")
  o2: string;    // Oxygen Saturation (%)
  oxygenation_source: "SpO2" | "PaO2"; // SpO2 (non-invasive) vs PaO2 (invasive ABG)
  is_delirious: boolean;          // Neurological delirium screening flag
  fio2?: number;                  // Fraction of Inspired Oxygen (optional, e.g. 0.21 to 1.0)
}

export interface AdmissionRecord {
  id: string;
  hospital_id: string;
  hospital_name: string;
  admitted_at: string;
  discharged_at?: string;
  primary_diagnosis?: string;
  treating_physician?: string;
  vitals_summary?: PatientVitals;
  discharge_summary?: string;
}

export interface UniversalPatient {
  upid: string;              // CF-YYYY-XXXXXXXX
  pin_hash: string;          // Hashed PIN for temporary portal login
  account_active: boolean;   // true if currently admitted, false if discharged
  admitted_hospital_id?: string;
  admitted_at?: string;
  discharged_at?: string;
  // Demographics
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  // Medical history
  allergies: string[];
  chronic_conditions: string[];
  current_medications: string[];
  insurance_provider?: string;
  insurance_policy_number?: string;
  // History across all hospitals
  admission_history: AdmissionRecord[];
}

export interface Patient {
  id: string;
  upid?: string; // Links to the UniversalPatient record
  first_name: string;
  last_name: string;
  date_of_birth: string;
  triage_level: string; // e.g. "1_resuscitation", "2_emergent", "3_urgent", "4_less_urgent"
  required_department_code: string; // "ICU" | "general"
  needs_ventilator: boolean;
  admitted_at: string;
  vitals?: PatientVitals;
  status?: string;
}

export interface Allocation {
  id: string;
  patient_id: string;
  bed_id: string;
  ventilator_id?: string;
  primary_doctor_id: string;
  is_override: boolean;
  override_reason?: string;
  allocated_at: string;
}

export interface Shift {
  id: string;
  staff_member_id: string;
  staff_name: string;
  shift_date: string; // "YYYY-MM-DD"
  type: "day" | "night";
  rationale: string;
}

export interface AuditEvent {
  id: string;
  created_at: string;
  action: "PATIENT_INTAKE" | "RECOMMENDED_ALLOCATION" | "MANUAL_OVERRIDE_ALLOCATION" | "SHIFT_SWAP_REQUEST" | "EMS_INCOMING_ALERT" | string;
  payload_before?: any;
  payload_after?: any;
}

export interface HospitalRepository {
  getPatients(): Promise<Patient[]>;
  getPatientById(id: string): Promise<Patient | null>;
  addPatient(patient: Patient): Promise<Patient>;
  getBeds(): Promise<Bed[]>;
  updateBedStatus(id: string, status: Bed["status"]): Promise<void>;
  getVentilators(): Promise<Ventilator[]>;
  updateVentilatorStatus(id: string, status: Ventilator["status"]): Promise<void>;
  getStaff(): Promise<StaffMember[]>;
  getAllocations(): Promise<Allocation[]>;
  addAllocation(allocation: Allocation): Promise<Allocation>;
  getShifts(): Promise<Shift[]>;
  addShifts(shifts: Shift[]): Promise<Shift[]>;
  addAuditEvent(event: AuditEvent): Promise<AuditEvent>;
  getAuditEvents(): Promise<AuditEvent[]>;
  getHospitals(): Promise<any[]>;
  // Universal Patient Database access functions
  getUniversalPatientByUpid(upid: string): Promise<UniversalPatient | null>;
  getUniversalPatientByDetails(firstName: string, lastName: string, dob: string): Promise<UniversalPatient | null>;
  addUniversalPatient(patient: UniversalPatient): Promise<UniversalPatient>;
  updateUniversalPatient(patient: UniversalPatient): Promise<void>;
}

