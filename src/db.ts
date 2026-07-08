import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { 
  HospitalRepository, Patient, Bed, Ventilator, StaffMember, Allocation, Shift, AuditEvent, UniversalPatient 
} from "./domain/entities";

dotenv.config();

const useMockDb = process.env.USE_MOCK_DB === "true" || !process.env.DATABASE_URL;

// Database Connection Pool for PostgreSQL
let pool: Pool | null = null;
if (!useMockDb && process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
  });
}

// In-Memory Database Structure for Fallback & Testing
export interface MockDbSchema {
  hospitals: any[];
  departments: any[];
  beds: any[];
  ventilators: any[];
  staff_members: any[];
  patients: any[];
  allocations: any[];
  shifts: any[];
  shift_histories: any[];
  inventory_items: any[];
  audit_logs: any[];
  universal_patients: UniversalPatient[];
  emergency_requests: any[];
  otp_verifications: any[];
  staff_contracts: any[];
  payroll_runs: any[];
  payroll_records: any[];
  attendance_connectors: any[];
  attendance_devices: any[];
  attendance_events: any[];
  infrastructure: any[];
  resources: any[];
  employees: any[];
  treatment_sessions: any[];
}

// Load OSM Delhi hospitals
let delhiHospitals: any[] = [];
try {
  const jsonPath = path.join(__dirname, "data", "delhi_hospitals.json");
  if (fs.existsSync(jsonPath)) {
    delhiHospitals = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  }
} catch (e) {
  console.warn("Could not load OSM hospitals database: " + e);
}

// AIIMS and Max Saket must be preserved as default hospitals for tests
const defaultHospitals = [
  {
    id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    name: "AIIMS New Delhi",
    latitude: 28.5672,
    longitude: 77.2100,
    address: "Ansari Nagar, New Delhi, Delhi 110029",
    contact_phone: "011-26588500"
  },
  {
    id: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
    name: "Max Super Speciality Hospital, Saket",
    latitude: 28.5276,
    longitude: 77.2114,
    address: "Press Enclave Rd, Saket, New Delhi, Delhi 110017",
    contact_phone: "011-26515050"
  }
];

// Merge unique hospitals, preferring defaults
const allHospitalsMap = new Map<string, any>();
delhiHospitals.forEach(h => allHospitalsMap.set(h.id, h));
defaultHospitals.forEach(h => allHospitalsMap.set(h.id, h));
const allHospitals = Array.from(allHospitalsMap.values());

const mockDepartments: any[] = [];
const mockBeds: any[] = [];
const mockVentilators: any[] = [];
const mockStaff: any[] = [];
const mockShifts: any[] = [];
const mockShiftHistories: any[] = [];
const mockInventoryItems: any[] = [];

allHospitals.forEach((hosp, idx) => {
  const deptICUId = hosp.id === "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d" ? "d2d2d2d2-e3e3-f4f4-0505-161616161616" : `dept-icu-${hosp.id}`;
  const deptERId = hosp.id === "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d" ? "e1e1e1e1-e2e2-e3e3-e4e4-e5e5e5e5e5e5" : `dept-er-${hosp.id}`;

  mockDepartments.push(
    { id: deptICUId, hospital_id: hosp.id, name: "Intensive Care Unit", code: "ICU" },
    { id: deptERId, hospital_id: hosp.id, name: "Emergency Room", code: "ER" }
  );

  // Default IDs for beds/ventilators/staff on the main testing hospital
  if (hosp.id === "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d") {
    mockBeds.push(
      { id: "b1", hospital_id: hosp.id, department_id: deptICUId, bed_number: "ICU-01", status: "free", type: "ICU" },
      { id: "b2", hospital_id: hosp.id, department_id: deptICUId, bed_number: "ICU-02", status: "free", type: "ICU" },
      { id: "b3", hospital_id: hosp.id, department_id: deptICUId, bed_number: "ICU-03", status: "occupied", type: "ICU" },
      { id: "b4", hospital_id: hosp.id, department_id: deptERId, bed_number: "ER-01", status: "free", type: "general" }
    );
    mockVentilators.push(
      { id: "v1", hospital_id: hosp.id, department_id: deptICUId, serial_number: "VNT-4048", status: "available", type: "invasive" },
      { id: "v2", hospital_id: hosp.id, department_id: deptICUId, serial_number: "VNT-9080", status: "in_use", type: "invasive" }
    );
    mockStaff.push(
      { id: "s1", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_smith", first_name: "Sarah", last_name: "Smith", role: "dept_head", specialty: "doctor", contact_number: "555-1234", is_active: true, email: "sarah@careflow.com", password_hash: "password123" },
      { id: "s2", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_connor", first_name: "John", last_name: "Connor", role: "staff", specialty: "nurse", contact_number: "555-5678", is_active: true, email: "john@careflow.com", password_hash: "password123" },
      { id: "s-receptionist", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_receptionist", first_name: "Rita", last_name: "Receptionist", role: "receptionist", specialty: "receptionist", contact_number: "555-0001", is_active: true, email: "receptionist@careflow.com", password_hash: "password123" },
      { id: "s-doctor", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_doctor", first_name: "Dr. Rajesh", last_name: "Kumar", role: "doctor", specialty: "doctor", contact_number: "555-0002", is_active: true, email: "doctor@careflow.com", password_hash: "password123" },
      { id: "s-nurse", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_nurse", first_name: "Priyanka", last_name: "Sharma", role: "nurse", specialty: "nurse", contact_number: "555-0003", is_active: true, email: "nurse@careflow.com", password_hash: "password123" },
      { id: "s-wardboy", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_wardboy", first_name: "Wayne", last_name: "Wardboy", role: "ward_boy", specialty: "support", contact_number: "555-0004", is_active: true, email: "wardboy@careflow.com", password_hash: "password123" },
      { id: "s-labtech", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_labtech", first_name: "Luke", last_name: "Labtech", role: "lab_tech", specialty: "support", contact_number: "555-0005", is_active: true, email: "labtech@careflow.com", password_hash: "password123" },
      { id: "s-pharmacist", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_pharmacist", first_name: "Phil", last_name: "Pharmacist", role: "pharmacist", specialty: "support", contact_number: "555-0006", is_active: true, email: "pharmacist@careflow.com", password_hash: "password123" },
      { id: "s-md", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_md", first_name: "Dr. Arthur", last_name: "Director", role: "medical_director", specialty: "doctor", contact_number: "555-0007", is_active: true, email: "md@careflow.com", password_hash: "password123" },
      { id: "s-admin", hospital_id: hosp.id, department_id: deptICUId, auth_user_id: "user_admin", first_name: "Adam", last_name: "Admin", role: "admin", specialty: "support", contact_number: "555-0008", is_active: true, email: "admin@careflow.com", password_hash: "password123" }
    );
    mockShifts.push(
      { id: "shift_1", hospital_id: hosp.id, staff_member_id: "s1", department_id: deptICUId, shift_date: "2026-07-03", type: "day", status: "scheduled", rationale: "Standard rotation" },
      { id: "shift_2", hospital_id: hosp.id, staff_member_id: "s2", department_id: deptICUId, shift_date: "2026-07-03", type: "night", status: "scheduled", rationale: "Standard rotation" }
    );
  } else {
    mockBeds.push(
      { id: `bed-icu-1-${hosp.id}`, hospital_id: hosp.id, department_id: deptICUId, bed_number: "ICU-01", status: "free", type: "ICU" },
      { id: `bed-icu-2-${hosp.id}`, hospital_id: hosp.id, department_id: deptICUId, bed_number: "ICU-02", status: "free", type: "ICU" },
      { id: `bed-er-1-${hosp.id}`, hospital_id: hosp.id, department_id: deptERId, bed_number: "ER-01", status: "free", type: "general" }
    );
    mockVentilators.push(
      { id: `vent-1-${hosp.id}`, hospital_id: hosp.id, department_id: deptICUId, serial_number: `VNT-4048-${idx}`, status: "available", type: "invasive" }
    );
    const docId = `staff-doc-${hosp.id}`;
    const nurseId = `staff-nurse-${hosp.id}`;
    mockStaff.push(
      { id: docId, hospital_id: hosp.id, department_id: deptICUId, auth_user_id: `user_doc_${idx}`, first_name: "Dr. Rajesh", last_name: "Kumar", role: "dept_head", specialty: "doctor", contact_number: "555-1234", is_active: true },
      { id: nurseId, hospital_id: hosp.id, department_id: deptICUId, auth_user_id: `user_nurse_${idx}`, first_name: "Priyanka", last_name: "Sharma", role: "staff", specialty: "nurse", contact_number: "555-5678", is_active: true }
    );
    mockShifts.push(
      { id: `shift-1-${hosp.id}`, hospital_id: hosp.id, staff_member_id: docId, department_id: deptICUId, shift_date: "2026-07-03", type: "day", status: "scheduled", rationale: "Standard rotation" }
    );
  }

  mockShiftHistories.push(
    { id: `sh-1-${hosp.id}`, hospital_id: hosp.id, staff_member_id: hosp.id === "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d" ? "s1" : `staff-doc-${hosp.id}`, worked_date: "2026-07-01", type: "day", hours_worked: 8.0 }
  );

  mockInventoryItems.push(
    { id: `inv-1-${hosp.id}`, hospital_id: hosp.id, name: "Propofol", category: "pharmaceutical", quantity_available: 100, min_threshold: 20, unit: "vials" },
    { id: `inv-2-${hosp.id}`, hospital_id: hosp.id, name: "PPE Kits", category: "consumable", quantity_available: 15, min_threshold: 50, unit: "boxes" }
  );
});

export const mockDb: MockDbSchema = {
  hospitals: allHospitals,
  departments: mockDepartments,
  beds: mockBeds,
  ventilators: mockVentilators,
  staff_members: mockStaff,
  patients: [
    {
      id: "p-mock-1",
      upid: "CF-2026-MOCKPT",
      first_name: "Sarah",
      last_name: "Connor",
      date_of_birth: "1985-11-10",
      triage_level: "2_very_urgent",
      required_department_code: "ICU",
      needs_ventilator: false,
      status: "admitted",
      admitted_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      vitals: { hr: "82", bp: "118/75", o2: "97%", oxygenation_source: "SpO2", is_delirious: false }
    }
  ],
  allocations: [
    {
      id: "a-mock-1",
      patient_id: "p-mock-1",
      bed_id: "b3",
      primary_doctor_id: "s-doctor",
      is_override: false,
      allocated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    }
  ],
  shifts: mockShifts,
  shift_histories: mockShiftHistories,
  inventory_items: mockInventoryItems,
  audit_logs: [],
  universal_patients: [
    {
      upid: "CF-2026-MOCKPT",
      pin_hash: "123456",
      account_active: true,
      admitted_hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      admitted_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      email: "patient@careflow.com",
      password_hash: "password123",
      first_name: "Sarah",
      last_name: "Connor",
      date_of_birth: "1985-11-10",
      gender: "Female",
      blood_group: "A_negative",
      phone: "555-0987",
      emergency_contact_name: "John Connor",
      emergency_contact_phone: "555-5678",
      allergies: ["Sulfa Drugs", "Penicillin"],
      chronic_conditions: ["Asthma"],
      current_medications: ["Albuterol Inhaler"],
      insurance_provider: "SarahCare",
      insurance_policy_number: "SC-99901",
      admission_history: [
        {
          id: "adm-mock-1",
          hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
          hospital_name: "AIIMS New Delhi",
          admitted_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          treating_physician: "Dr. Rajesh Kumar"
        }
      ]
    }
  ],
  emergency_requests: [],
  otp_verifications: [],
  staff_contracts: [
    { id: "c1", staff_member_id: "s1", hourly_rate: 60.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 },
    { id: "c2", staff_member_id: "s2", hourly_rate: 28.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 },
    { id: "c-rep", staff_member_id: "s-receptionist", hourly_rate: 22.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 },
    { id: "c-doc", staff_member_id: "s-doctor", hourly_rate: 55.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 },
    { id: "c-nur", staff_member_id: "s-nurse", hourly_rate: 32.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 },
    { id: "c-wb", staff_member_id: "s-wardboy", hourly_rate: 18.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 },
    { id: "c-lt", staff_member_id: "s-labtech", hourly_rate: 24.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 },
    { id: "c-ph", staff_member_id: "s-pharmacist", hourly_rate: 26.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 },
    { id: "c-md", staff_member_id: "s-md", hourly_rate: 75.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 },
    { id: "c-adm", staff_member_id: "s-admin", hourly_rate: 30.00, overtime_multiplier: 1.5, weekly_hours_limit: 40 }
  ],
  payroll_runs: [],
  payroll_records: [],
  attendance_connectors: [],
  attendance_devices: [],
  attendance_events: [],
  infrastructure: [
    { id: "ward-icu", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", type: "ICU", total_capacity: 10, current_occupancy: 2 },
    { id: "ward-ccu", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", type: "CCU", total_capacity: 5, current_occupancy: 1 },
    { id: "ward-general", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", type: "General", total_capacity: 30, current_occupancy: 5 }
  ],
  resources: [
    { id: "res-vent-1", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", ward_id: "ward-icu", type: "Ventilator", status: "In-Use" },
    { id: "res-vent-2", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", ward_id: "ward-icu", type: "Ventilator", status: "Available" },
    { id: "res-cyl-1", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", ward_id: "ward-general", type: "Oxygen Cylinder", status: "Available" },
    { id: "res-cyl-2", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", ward_id: "ward-general", type: "Oxygen Cylinder", status: "In-Use" }
  ],
  employees: [
    { id: "s1", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "Sarah Smith", email: "sarah.smith@careflow.com", role: "Doctor", current_shift: "Morning", assigned_ward_id: "ward-icu", password_hash: "doctor123" },
    { id: "s2", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "John Connor", email: "john.connor@careflow.com", role: "Nurse", current_shift: "Evening", assigned_ward_id: "ward-icu", password_hash: "nurse123" },
    { id: "s-receptionist", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "Rita Receptionist", email: "receptionist@careflow.com", role: "Receptionist", current_shift: "Morning", assigned_ward_id: "ward-general", password_hash: "receptionist123" },
    { id: "s-doctor", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "Rajesh Kumar", email: "doctor@careflow.com", role: "Doctor", current_shift: "Morning", assigned_ward_id: "ward-icu", password_hash: "doctor123" },
    { id: "s-nurse", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "Priyanka Nurse", email: "nurse@careflow.com", role: "Nurse", current_shift: "Night", assigned_ward_id: "ward-icu", password_hash: "nurse123" },
    { id: "s-wardboy", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "Wayne Wardboy", email: "wardboy@careflow.com", role: "Ward Boy", current_shift: "Morning", assigned_ward_id: "ward-general", password_hash: "wardboy123" },
    { id: "s-labtech", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "Larry Labtech", email: "labtech@careflow.com", role: "Lab Tech", current_shift: "Morning", assigned_ward_id: "ward-general", password_hash: "labtech123" },
    { id: "s-pharmacist", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "Peter Pharmacist", email: "pharmacist@careflow.com", role: "Pharmacist", current_shift: "Morning", assigned_ward_id: "ward-general", password_hash: "pharmacist123" },
    { id: "s-md", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "Milton Director", email: "md@careflow.com", role: "medical_director", current_shift: "Morning", assigned_ward_id: "ward-icu", password_hash: "md123" },
    { id: "s-admin", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", name: "Arthur Admin", email: "admin@careflow.com", role: "admin", current_shift: "Morning", assigned_ward_id: "ward-general", password_hash: "admin123" }
  ],
  treatment_sessions: [
    { id: "ts-mock-1", patient_id: "CF-2026-MOCKPT", hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", assigned_employee_id: "s-doctor", resource_used_ids: ["res-vent-1"], status: "Admitted", health_issue_description: "Patient has severe respiratory distress, oxygen level is 88%. Initiated invasive mechanical ventilation." }
  ]
};

// Database Query Executer
export async function executeQuery(
  hospitalId: string,
  queryText: string,
  params: any[] = []
): Promise<any> {
  if (useMockDb) {
    return resolveMockQuery(hospitalId, queryText, params);
  }

  if (!pool) {
    throw new Error("Database Pool not initialized");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_hospital_id', $1, true)", [hospitalId]);
    const res = await client.query(queryText, params);
    await client.query("COMMIT");
    return res;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Simple Mock Query Resolver
function resolveMockQuery(hospitalId: string, queryText: string, params: any[]): any {
  const query = queryText.toLowerCase();

  if (query.includes("select * from hospitals")) {
    return { rows: mockDb.hospitals };
  }
  
  if (query.includes("select * from departments")) {
    return { rows: mockDb.departments.filter(d => d.hospital_id === hospitalId) };
  }

  if (query.includes("select * from beds")) {
    return { rows: mockDb.beds.filter(b => b.hospital_id === hospitalId) };
  }

  if (query.includes("select * from ventilators")) {
    return { rows: mockDb.ventilators.filter(v => v.hospital_id === hospitalId) };
  }

  if (query.includes("select * from staff_members")) {
    return { rows: mockDb.staff_members.filter(s => s.hospital_id === hospitalId && s.is_active) };
  }

  if (query.includes("select * from patients") && query.includes("id = $1")) {
    const patient = mockDb.patients.find(p => p.id === params[0] && p.hospital_id === hospitalId);
    return { rows: patient ? [patient] : [] };
  }

  if (query.includes("insert into patients")) {
    const newPatient = {
      id: `p-${Date.now()}`,
      hospital_id: params[0],
      first_name: params[1],
      last_name: params[2],
      date_of_birth: params[3],
      triage_level: params[4],
      required_department_code: params[5],
      needs_ventilator: params[6],
      status: params[7],
      admitted_at: new Date().toISOString(),
      vitals: params[8] || { hr: "80", bp: "120/80", o2: "98%" }
    };
    mockDb.patients.push(newPatient);
    return { rows: [newPatient] };
  }

  if (query.includes("insert into allocations")) {
    const newAllocation = {
      id: `a-${Date.now()}`,
      hospital_id: params[0],
      patient_id: params[1],
      bed_id: params[2],
      ventilator_id: params[3],
      primary_doctor_id: params[4],
      allocated_by: params[5],
      is_override: params[6],
      override_reason: params[7],
      allocated_at: new Date().toISOString()
    };
    mockDb.allocations.push(newAllocation);
    
    const bed = mockDb.beds.find(b => b.id === params[2]);
    if (bed) bed.status = "occupied";
    
    if (params[3]) {
      const vent = mockDb.ventilators.find(v => v.id === params[3]);
      if (vent) vent.status = "in_use";
    }

    const patient = mockDb.patients.find(p => p.id === params[1]);
    if (patient) patient.status = "allocated";

    return { rows: [newAllocation] };
  }

  if (query.includes("insert into audit_logs")) {
    const newLog = {
      id: `al-${Date.now()}`,
      hospital_id: params[0],
      actor_id: params[1],
      action: params[2],
      entity_name: params[3],
      entity_id: params[4],
      payload_before: params[5],
      payload_after: params[6],
      created_at: new Date().toISOString()
    };
    mockDb.audit_logs.push(newLog);
    return { rows: [newLog] };
  }

  if (query.includes("select * from inventory_items")) {
    return { rows: mockDb.inventory_items.filter(i => i.hospital_id === hospitalId) };
  }

  if (query.includes("select * from patients") && !query.includes("id = $1")) {
    return { rows: mockDb.patients.filter(p => p.hospital_id === hospitalId) };
  }

  if (query.includes("select * from allocations")) {
    return { rows: mockDb.allocations.filter(a => a.hospital_id === hospitalId) };
  }

  if (query.includes("select * from audit_logs")) {
    const logs = mockDb.audit_logs
      .filter(l => l.hospital_id === hospitalId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rows: logs };
  }

  if (query.includes("select * from shifts") && !query.includes("insert into shifts")) {
    return { rows: mockDb.shifts.filter(s => s.hospital_id === hospitalId) };
  }

  if (query.includes("insert into shifts")) {
    const newShift = {
      id: `sft-${Date.now()}`,
      hospital_id: params[0],
      staff_member_id: params[1],
      department_id: params[2],
      shift_date: params[3],
      type: params[4],
      status: "scheduled",
      rationale: params[5] || "Auto-scheduled"
    };
    mockDb.shifts.push(newShift);
    return { rows: [newShift] };
  }

  return { rows: [] };
}

// SqlHospitalRepository Implementing clean HospitalRepository domain interface
export class SqlHospitalRepository implements HospitalRepository {
  constructor(private hospitalId: string) {}

  public async getPatients(): Promise<Patient[]> {
    if (useMockDb) {
      return mockDb.patients.filter(p => p.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM patients");
    return res.rows;
  }

  public async getPatientById(id: string): Promise<Patient | null> {
    if (useMockDb) {
      const patient = mockDb.patients.find(p => p.id === id && p.hospital_id === this.hospitalId);
      return patient || null;
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM patients WHERE id = $1", [id]);
    return res.rows[0] || null;
  }

  public async addPatient(patient: Patient): Promise<Patient> {
    if (useMockDb) {
      const dbPatient = {
        ...patient,
        hospital_id: this.hospitalId,
        status: "admitted"
      };
      mockDb.patients.push(dbPatient);
      return dbPatient;
    }
    const res = await executeQuery(this.hospitalId, 
      `INSERT INTO patients (id, hospital_id, upid, first_name, last_name, date_of_birth, triage_level, required_department_code, needs_ventilator, status, admitted_at, vitals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        patient.id || `p-${Date.now()}`,
        this.hospitalId, 
        patient.upid || null,
        patient.first_name, 
        patient.last_name, 
        patient.date_of_birth, 
        patient.triage_level, 
        patient.required_department_code, 
        patient.needs_ventilator, 
        "admitted", 
        patient.admitted_at,
        JSON.stringify(patient.vitals)
      ]
    );
    return res.rows[0];
  }

  public async getBeds(): Promise<Bed[]> {
    if (useMockDb) {
      return mockDb.beds.filter(b => b.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM beds");
    return res.rows;
  }

  public async updateBedStatus(id: string, status: Bed["status"]): Promise<void> {
    if (useMockDb) {
      const bed = mockDb.beds.find(b => b.id === id);
      if (bed) bed.status = status;
      return;
    }
    await executeQuery(this.hospitalId, "UPDATE beds SET status = $1 WHERE id = $2", [status, id]);
  }

  public async getVentilators(): Promise<Ventilator[]> {
    if (useMockDb) {
      return mockDb.ventilators.filter(v => v.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM ventilators");
    return res.rows;
  }

  public async updateVentilatorStatus(id: string, status: Ventilator["status"]): Promise<void> {
    if (useMockDb) {
      const vent = mockDb.ventilators.find(v => v.id === id);
      if (vent) vent.status = status;
      return;
    }
    await executeQuery(this.hospitalId, "UPDATE ventilators SET status = $1 WHERE id = $2", [status, id]);
  }

  public async getStaff(): Promise<StaffMember[]> {
    if (useMockDb) {
      return mockDb.staff_members.filter(s => s.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM staff_members WHERE is_active = true");
    return res.rows;
  }

  public async getAllocations(): Promise<Allocation[]> {
    if (useMockDb) {
      return mockDb.allocations.filter(a => a.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM allocations");
    return res.rows;
  }

  public async addAllocation(allocation: Allocation): Promise<Allocation> {
    if (useMockDb) {
      const dbAlloc = {
        ...allocation,
        hospital_id: this.hospitalId
      };
      mockDb.allocations.push(dbAlloc);
      
      // Sync status
      const bed = mockDb.beds.find(b => b.id === allocation.bed_id);
      if (bed) bed.status = "occupied";
      if (allocation.ventilator_id) {
        const vent = mockDb.ventilators.find(v => v.id === allocation.ventilator_id);
        if (vent) vent.status = "in_use";
      }
      const patient = mockDb.patients.find(p => p.id === allocation.patient_id);
      if (patient) patient.status = "allocated";

      return dbAlloc;
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO allocations (id, hospital_id, patient_id, bed_id, ventilator_id, primary_doctor_id, allocated_by, is_override, override_reason, allocated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        allocation.id || `a-${Date.now()}`,
        this.hospitalId,
        allocation.patient_id,
        allocation.bed_id,
        allocation.ventilator_id || null,
        allocation.primary_doctor_id,
        "admin",
        allocation.is_override,
        allocation.override_reason || null,
        allocation.allocated_at
      ]
    );
    return res.rows[0];
  }

  public async getShifts(): Promise<Shift[]> {
    if (useMockDb) {
      return mockDb.shifts.filter(s => s.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM shifts");
    return res.rows;
  }

  public async addShifts(shifts: Shift[]): Promise<Shift[]> {
    const saved: Shift[] = [];
    for (const shift of shifts) {
      if (useMockDb) {
        const dbShift = {
          ...shift,
          hospital_id: this.hospitalId,
          status: "scheduled"
        };
        mockDb.shifts.push(dbShift);
        saved.push(dbShift);
      } else {
        const res = await executeQuery(this.hospitalId,
          `INSERT INTO shifts (id, hospital_id, staff_member_id, department_id, shift_date, type, status, rationale)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            shift.id || `sft-${Math.random().toString(36).substr(2, 9)}`,
            this.hospitalId,
            shift.staff_member_id,
            "d2d2d2d2-e3e3-f4f4-0505-161616161616", // Default dept
            shift.shift_date,
            shift.type,
            "scheduled",
            shift.rationale
          ]
        );
        saved.push(res.rows[0]);
      }
    }
    return saved;
  }

  public async addAuditEvent(event: AuditEvent): Promise<AuditEvent> {
    if (useMockDb) {
      mockDb.audit_logs.push({
        ...event,
        hospital_id: this.hospitalId
      });
      return event;
    }

    let dbActorId: string | null = null;
    if (event.actor_id) {
      const checkRes = await executeQuery(this.hospitalId, "SELECT id FROM staff_members WHERE id = $1", [event.actor_id]);
      if (checkRes.rows.length > 0) {
        dbActorId = event.actor_id;
      }
    }

    await executeQuery(this.hospitalId,
      `INSERT INTO audit_logs (id, hospital_id, actor_id, action, entity_name, entity_id, payload_before, payload_after, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        event.id || `al-${Date.now()}`,
        this.hospitalId,
        dbActorId,
        event.action,
        "system",
        event.id,
        JSON.stringify(event.payload_before || {}),
        JSON.stringify(event.payload_after || {}),
        event.created_at
      ]
    );
    return event;
  }

  public async getAuditEvents(): Promise<AuditEvent[]> {
    if (useMockDb) {
      return mockDb.audit_logs
        .filter(l => l.hospital_id === this.hospitalId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM audit_logs ORDER BY created_at DESC");
    return res.rows.map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      action: row.action,
      payload_before: row.payload_before,
      payload_after: row.payload_after
    }));
  }

  public async getHospitals(): Promise<any[]> {
    if (useMockDb) {
      return mockDb.hospitals;
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM hospitals");
    return res.rows;
  }

  public async getUniversalPatientByUpid(upid: string): Promise<UniversalPatient | null> {
    if (useMockDb) {
      const patient = mockDb.universal_patients.find(p => p.upid === upid);
      return patient || null;
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM universal_patients WHERE upid = $1", [upid]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      allergies: typeof row.allergies === "string" ? JSON.parse(row.allergies) : row.allergies,
      chronic_conditions: typeof row.chronic_conditions === "string" ? JSON.parse(row.chronic_conditions) : row.chronic_conditions,
      current_medications: typeof row.current_medications === "string" ? JSON.parse(row.current_medications) : row.current_medications,
      admission_history: typeof row.admission_history === "string" ? JSON.parse(row.admission_history) : row.admission_history
    };
  }

  public async getUniversalPatientByDetails(firstName: string, lastName: string, dob: string): Promise<UniversalPatient | null> {
    if (useMockDb) {
      const patient = mockDb.universal_patients.find(
        p => p.first_name.toLowerCase() === firstName.toLowerCase() && 
             p.last_name.toLowerCase() === lastName.toLowerCase() && 
             p.date_of_birth === dob
      );
      return patient || null;
    }
    const res = await executeQuery(this.hospitalId, 
      "SELECT * FROM universal_patients WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2) AND date_of_birth = $3", 
      [firstName, lastName, dob]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      allergies: typeof row.allergies === "string" ? JSON.parse(row.allergies) : row.allergies,
      chronic_conditions: typeof row.chronic_conditions === "string" ? JSON.parse(row.chronic_conditions) : row.chronic_conditions,
      current_medications: typeof row.current_medications === "string" ? JSON.parse(row.current_medications) : row.current_medications,
      admission_history: typeof row.admission_history === "string" ? JSON.parse(row.admission_history) : row.admission_history
    };
  }

  public async addUniversalPatient(patient: UniversalPatient): Promise<UniversalPatient> {
    if (useMockDb) {
      mockDb.universal_patients.push(patient);
      return patient;
    }
    await executeQuery(this.hospitalId,
      `INSERT INTO universal_patients (upid, pin_hash, account_active, admitted_hospital_id, admitted_at, discharged_at, 
                                       first_name, last_name, date_of_birth, gender, blood_group, phone, 
                                       emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions, 
                                       current_medications, insurance_provider, insurance_policy_number, admission_history, current_status, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
      [
        patient.upid, patient.pin_hash, patient.account_active, patient.admitted_hospital_id || null, 
        patient.admitted_at || null, patient.discharged_at || null,
        patient.first_name, patient.last_name, patient.date_of_birth, patient.gender, patient.blood_group, patient.phone,
        patient.emergency_contact_name, patient.emergency_contact_phone,
        JSON.stringify(patient.allergies), JSON.stringify(patient.chronic_conditions), JSON.stringify(patient.current_medications),
        patient.insurance_provider || null, patient.insurance_policy_number || null,
        JSON.stringify(patient.admission_history),
        patient.current_status || "Discharged",
        patient.email || null,
        patient.password_hash || null
      ]
    );
    return patient;
  }

  public async updateUniversalPatient(patient: UniversalPatient): Promise<void> {
    if (useMockDb) {
      const idx = mockDb.universal_patients.findIndex(p => p.upid === patient.upid);
      if (idx !== -1) {
        mockDb.universal_patients[idx] = patient;
      }
      return;
    }
    await executeQuery(this.hospitalId,
      `UPDATE universal_patients SET pin_hash = $1, account_active = $2, admitted_hospital_id = $3, admitted_at = $4, 
                                     discharged_at = $5, first_name = $6, last_name = $7, date_of_birth = $8, gender = $9, 
                                     blood_group = $10, phone = $11, emergency_contact_name = $12, emergency_contact_phone = $13, 
                                     allergies = $14, chronic_conditions = $15, current_medications = $16, 
                                     insurance_provider = $17, insurance_policy_number = $18, admission_history = $19,
                                     current_status = $20
       WHERE upid = $21`,
      [
        patient.pin_hash, patient.account_active, patient.admitted_hospital_id || null, patient.admitted_at || null,
        patient.discharged_at || null, patient.first_name, patient.last_name, patient.date_of_birth, patient.gender,
        patient.blood_group, patient.phone, patient.emergency_contact_name, patient.emergency_contact_phone,
        JSON.stringify(patient.allergies), JSON.stringify(patient.chronic_conditions), JSON.stringify(patient.current_medications),
        patient.insurance_provider || null, patient.insurance_policy_number || null,
        JSON.stringify(patient.admission_history),
        patient.current_status || "Discharged",
        patient.upid
      ]
    );
  }

  public async addStaffMember(staff: any): Promise<any> {
    if (useMockDb) {
      const dbStaff = { ...staff, hospital_id: this.hospitalId, is_active: true };
      mockDb.staff_members.push(dbStaff);
      return dbStaff;
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO staff_members (id, hospital_id, auth_user_id, first_name, last_name, role, specialty, contact_number, email, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) RETURNING *`,
      [staff.id, this.hospitalId, staff.auth_user_id, staff.first_name, staff.last_name, staff.role, staff.specialty, staff.contact_number || null, staff.email, staff.password_hash]
    );
    return res.rows[0];
  }

  public async getStaffByEmailOrId(idOrEmail: string): Promise<any | null> {
    if (useMockDb) {
      const staff = mockDb.staff_members.find(
        s => (s.id.toLowerCase() === idOrEmail.toLowerCase() || s.email?.toLowerCase() === idOrEmail.toLowerCase()) && s.hospital_id === this.hospitalId
      );
      return staff || null;
    }
    const res = await executeQuery(this.hospitalId,
      `SELECT * FROM staff_members WHERE (id = $1 OR email = $1) AND hospital_id = $2 AND is_active = true`,
      [idOrEmail, this.hospitalId]
    );
    return res.rows[0] || null;
  }

  public async getStaffByEmail(email: string): Promise<any | null> {
    if (useMockDb) {
      const staff = mockDb.staff_members.find(s => s.email?.toLowerCase() === email.toLowerCase());
      return staff || null;
    }
    const res = await executeQuery("8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      `SELECT * FROM staff_members WHERE email = $1 AND is_active = true`,
      [email]
    );
    return res.rows[0] || null;
  }

  public async addEmergencyRequest(req: any): Promise<any> {
    if (useMockDb) {
      const dbReq = { ...req, id: req.id || `erq-${Date.now()}`, hospital_id: this.hospitalId, status: "pending", created_at: new Date().toISOString() };
      mockDb.emergency_requests.push(dbReq);
      return dbReq;
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO emergency_requests (id, hospital_id, patient_name, phone, symptoms, ward_required, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [req.id || `erq-${Date.now()}`, this.hospitalId, req.patient_name, req.phone, req.symptoms, req.ward_required]
    );
    return res.rows[0];
  }

  public async getEmergencyRequests(): Promise<any[]> {
    if (useMockDb) {
      return mockDb.emergency_requests.filter(r => r.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId,
      `SELECT * FROM emergency_requests WHERE hospital_id = $1 ORDER BY created_at DESC`,
      [this.hospitalId]
    );
    return res.rows;
  }

  public async updateEmergencyRequestStatus(id: string, status: string): Promise<void> {
    if (useMockDb) {
      const req = mockDb.emergency_requests.find(r => r.id === id);
      if (req) req.status = status;
      return;
    }
    await executeQuery(this.hospitalId,
      `UPDATE emergency_requests SET status = $1 WHERE id = $2`,
      [status, id]
    );
  }

  public async getUniversalPatientByEmail(email: string): Promise<UniversalPatient | null> {
    if (useMockDb) {
      const patient = mockDb.universal_patients.find(p => p.email?.toLowerCase() === email.toLowerCase());
      return patient || null;
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM universal_patients WHERE email = $1", [email]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      allergies: typeof row.allergies === "string" ? JSON.parse(row.allergies) : row.allergies,
      chronic_conditions: typeof row.chronic_conditions === "string" ? JSON.parse(row.chronic_conditions) : row.chronic_conditions,
      current_medications: typeof row.current_medications === "string" ? JSON.parse(row.current_medications) : row.current_medications,
      admission_history: typeof row.admission_history === "string" ? JSON.parse(row.admission_history) : row.admission_history
    };
  }

  public async addHospital(hosp: any): Promise<any> {
    if (useMockDb) {
      const dbHosp = { ...hosp, id: hosp.id || `hosp-${Date.now()}` };
      mockDb.hospitals.push(dbHosp);
      return dbHosp;
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO hospitals (id, name, latitude, longitude, address, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [hosp.id || `hosp-${Date.now()}`, hosp.name, hosp.latitude || 28.6139, hosp.longitude || 77.2090, hosp.address || "New Delhi", hosp.contact_phone || "555-0199"]
    );
    return res.rows[0];
  }

  public async saveOtp(email: string, otp: string, purpose: string, payload?: any): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    if (useMockDb) {
      mockDb.otp_verifications = mockDb.otp_verifications.filter(o => !(o.email === email && o.purpose === purpose));
      mockDb.otp_verifications.push({
        id: `otp-${Date.now()}`,
        email,
        otp,
        purpose,
        payload,
        expires_at: expiresAt
      });
      return;
    }
    await executeQuery(this.hospitalId,
      `DELETE FROM otp_verifications WHERE email = $1 AND purpose = $2`,
      [email, purpose]
    );
    await executeQuery(this.hospitalId,
      `INSERT INTO otp_verifications (email, otp, purpose, payload, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, otp, purpose, JSON.stringify(payload), expiresAt]
    );
  }

  public async verifyOtp(email: string, otp: string, purpose: string): Promise<any | null> {
    const now = new Date().toISOString();
    if (useMockDb) {
      const idx = mockDb.otp_verifications.findIndex(
        o => o.email === email && o.otp === otp && o.purpose === purpose && new Date(o.expires_at) > new Date()
      );
      if (idx === -1) return null;
      const record = mockDb.otp_verifications[idx];
      mockDb.otp_verifications.splice(idx, 1);
      return record.payload || {};
    }
    const res = await executeQuery(this.hospitalId,
      `SELECT * FROM otp_verifications WHERE email = $1 AND otp = $2 AND purpose = $3 AND expires_at > $4`,
      [email, otp, purpose, now]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    await executeQuery(this.hospitalId,
      `DELETE FROM otp_verifications WHERE id = $1`,
      [row.id]
    );
    return typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
  }

  public async getPatientsByRelativeContact(phoneOrEmailOrName: string): Promise<any[]> {
    if (useMockDb) {
      const matchingUpids = mockDb.universal_patients.filter(
        p => p.phone === phoneOrEmailOrName || 
             p.email?.toLowerCase() === phoneOrEmailOrName.toLowerCase() ||
             p.emergency_contact_phone === phoneOrEmailOrName ||
             `${p.first_name} ${p.last_name}`.toLowerCase().includes(phoneOrEmailOrName.toLowerCase())
      ).map(p => p.upid);

      return mockDb.patients.filter(p => p.upid && matchingUpids.includes(p.upid));
    }
    const res = await executeQuery(this.hospitalId,
      `SELECT p.* FROM patients p
       JOIN universal_patients up ON p.upid = up.upid
       WHERE up.phone = $1 OR up.email = $1 OR up.emergency_contact_phone = $1 OR (up.first_name || ' ' || up.last_name) ILIKE $2`,
      [phoneOrEmailOrName, `%${phoneOrEmailOrName}%`]
    );
    return res.rows;
  }

  public async updatePatientDietPlan(patientId: string, dietPlan: string): Promise<void> {
    if (useMockDb) {
      const patient = mockDb.patients.find(p => p.id === patientId);
      if (patient) patient.diet_plan = dietPlan;
      return;
    }
    await executeQuery(this.hospitalId,
      `UPDATE patients SET diet_plan = $1 WHERE id = $2`,
      [dietPlan, patientId]
    );
  }

  public async addBed(bed: any): Promise<any> {
    if (useMockDb) {
      const dbBed = { ...bed, hospital_id: this.hospitalId, status: bed.status || "free" };
      mockDb.beds.push(dbBed);
      return dbBed;
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO beds (id, hospital_id, department_id, bed_number, status, type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [bed.id, this.hospitalId, bed.department_id, bed.bed_number, bed.status || "free", bed.type || "general"]
    );
    return res.rows[0];
  }

  public async addVentilator(vent: any): Promise<any> {
    if (useMockDb) {
      const dbVent = { ...vent, hospital_id: this.hospitalId, status: vent.status || "available" };
      mockDb.ventilators.push(dbVent);
      return dbVent;
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO ventilators (id, hospital_id, department_id, serial_number, status, type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [vent.id, this.hospitalId, vent.department_id, vent.serial_number, vent.status || "available", vent.type || "invasive"]
    );
    return res.rows[0];
  }

  public async createDefaultDepartments(): Promise<any[]> {
    const depts = [
      { id: `dept-icu-${this.hospitalId}`, name: "Intensive Care Unit", code: "ICU" },
      { id: `dept-er-${this.hospitalId}`, name: "Emergency Room", code: "ER" }
    ];
    if (useMockDb) {
      depts.forEach(d => {
        if (!mockDb.departments.some(existing => existing.id === d.id)) {
          mockDb.departments.push({ ...d, hospital_id: this.hospitalId });
        }
      });
      return depts;
    }
    const created = [];
    for (const d of depts) {
      const res = await executeQuery(this.hospitalId,
        `INSERT INTO departments (id, hospital_id, name, code)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (hospital_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
        [d.id, this.hospitalId, d.name, d.code]
      );
      created.push(res.rows[0]);
    }
    return created;
  }

  public async getStaffContract(staffId: string): Promise<any | null> {
    if (useMockDb) {
      const contract = mockDb.staff_contracts.find(c => c.staff_member_id === staffId);
      return contract || null;
    }
    const res = await executeQuery(this.hospitalId,
      "SELECT * FROM staff_contracts WHERE staff_member_id = $1",
      [staffId]
    );
    return res.rows[0] || null;
  }

  public async upsertStaffContract(contract: any): Promise<void> {
    if (useMockDb) {
      const existingIdx = mockDb.staff_contracts.findIndex(c => c.staff_member_id === contract.staff_member_id);
      if (existingIdx !== -1) {
        mockDb.staff_contracts[existingIdx] = { ...mockDb.staff_contracts[existingIdx], ...contract };
      } else {
        mockDb.staff_contracts.push({ id: `c-${Date.now()}`, ...contract });
      }
      return;
    }
    await executeQuery(this.hospitalId,
      `INSERT INTO staff_contracts (staff_member_id, hourly_rate, overtime_multiplier, weekly_hours_limit)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (staff_member_id) DO UPDATE SET
         hourly_rate = EXCLUDED.hourly_rate,
         overtime_multiplier = EXCLUDED.overtime_multiplier,
         weekly_hours_limit = EXCLUDED.weekly_hours_limit,
         updated_at = CURRENT_TIMESTAMP`,
      [contract.staff_member_id, contract.hourly_rate, contract.overtime_multiplier || 1.5, contract.weekly_hours_limit || 40]
    );
  }

  public async getShiftHistoriesForPeriod(startDate: string, endDate: string): Promise<any[]> {
    if (useMockDb) {
      return mockDb.shift_histories.filter(sh => 
        sh.hospital_id === this.hospitalId &&
        sh.worked_date >= startDate &&
        sh.worked_date <= endDate
      );
    }
    const res = await executeQuery(this.hospitalId,
      `SELECT * FROM shift_histories 
       WHERE hospital_id = $1 AND worked_date >= $2 AND worked_date <= $3
       ORDER BY worked_date ASC`,
      [this.hospitalId, startDate, endDate]
    );
    return res.rows;
  }

  public async savePayrollRun(run: any, records: any[]): Promise<any> {
    const runId = run.id || `run-${Date.now()}`;
    if (useMockDb) {
      const dbRun = {
        id: runId,
        start_date: run.start_date,
        end_date: run.end_date,
        processed_at: new Date().toISOString(),
        total_amount: run.total_amount,
        status: run.status || "completed"
      };
      mockDb.payroll_runs.push(dbRun);

      records.forEach(r => {
        mockDb.payroll_records.push({
          id: `rec-${Date.now()}-${Math.random()}`,
          payroll_run_id: runId,
          staff_member_id: r.staff_member_id,
          base_hours: r.base_hours,
          overtime_hours: r.overtime_hours,
          base_pay: r.base_pay,
          overtime_pay: r.overtime_pay,
          net_pay: r.net_pay,
          created_at: new Date().toISOString()
        });
      });
      return dbRun;
    }

    const runRes = await executeQuery(this.hospitalId,
      `INSERT INTO payroll_runs (id, start_date, end_date, total_amount, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [runId, run.start_date, run.end_date, run.total_amount, run.status || "completed"]
    );

    for (const r of records) {
      await executeQuery(this.hospitalId,
        `INSERT INTO payroll_records (payroll_run_id, staff_member_id, base_hours, overtime_hours, base_pay, overtime_pay, net_pay)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [runId, r.staff_member_id, r.base_hours, r.overtime_hours, r.base_pay, r.overtime_pay, r.net_pay]
      );
    }
    return runRes.rows[0];
  }

  public async getPayrollHistory(): Promise<any[]> {
    if (useMockDb) {
      return mockDb.payroll_runs.sort((a, b) => b.processed_at.localeCompare(a.processed_at));
    }
    const res = await executeQuery(this.hospitalId,
      `SELECT * FROM payroll_runs ORDER BY processed_at DESC`
    );
    return res.rows;
  }

  // =========================================================================
  // ATTENDANCE INTEGRATION METHODS
  // =========================================================================

  public async getAttendanceConnectors(): Promise<any[]> {
    if (useMockDb) {
      return mockDb.attendance_connectors.filter(c => c.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId,
      `SELECT * FROM attendance_connectors WHERE hospital_id = $1 ORDER BY created_at DESC`,
      [this.hospitalId]
    );
    return res.rows;
  }

  public async upsertAttendanceConnector(data: any): Promise<any> {
    if (useMockDb) {
      const existing = mockDb.attendance_connectors.findIndex(c => c.id === data.id);
      const record = { ...data, id: data.id ?? `conn-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: 'inactive', records_synced: 0 };
      if (existing >= 0) {
        mockDb.attendance_connectors[existing] = { ...mockDb.attendance_connectors[existing], ...record };
        return mockDb.attendance_connectors[existing];
      }
      mockDb.attendance_connectors.push(record);
      return record;
    }
    if (data.id) {
      const res = await executeQuery(this.hospitalId,
        `UPDATE attendance_connectors SET name=$1, provider=$2, config=$3, sync_mode=$4, poll_interval_sec=$5, updated_at=NOW()
         WHERE id=$6 AND hospital_id=$7 RETURNING *`,
        [data.name, data.provider, JSON.stringify(data.config), data.sync_mode, data.poll_interval_sec, data.id, this.hospitalId]
      );
      return res.rows[0];
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO attendance_connectors (hospital_id, name, provider, config, sync_mode, poll_interval_sec)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [this.hospitalId, data.name, data.provider, JSON.stringify(data.config), data.sync_mode, data.poll_interval_sec]
    );
    return res.rows[0];
  }

  public async deleteAttendanceConnector(id: string, hospitalId: string): Promise<void> {
    if (useMockDb) {
      const idx = mockDb.attendance_connectors.findIndex(c => c.id === id && c.hospital_id === hospitalId);
      if (idx >= 0) mockDb.attendance_connectors.splice(idx, 1);
      return;
    }
    await executeQuery(this.hospitalId,
      `DELETE FROM attendance_connectors WHERE id=$1 AND hospital_id=$2`,
      [id, hospitalId]
    );
  }

  public async bulkInsertAttendanceEvents(hospitalId: string, connectorId: string, events: any[]): Promise<void> {
    if (useMockDb) {
      events.forEach(e => {
        const key = `${hospitalId}-${e.employee_code}-${e.punch_timestamp?.toISOString()}-${e.punch_type}`;
        const exists = mockDb.attendance_events.some(ev => `${ev.hospital_id}-${ev.employee_code}-${ev.punch_timestamp}-${ev.punch_type}` === key);
        if (!exists) {
          mockDb.attendance_events.push({ ...e, id: `ae-${Date.now()}-${Math.random()}`, hospital_id: hospitalId, connector_id: connectorId, created_at: new Date().toISOString() });
        }
      });
      return;
    }
    for (const e of events) {
      try {
        await executeQuery(this.hospitalId,
          `INSERT INTO attendance_events
           (hospital_id, connector_id, employee_code, employee_name, department, punch_timestamp, punch_type, punch_type_raw, verify_method, verify_method_raw, location_name, device_serial, temperature, source_system, source_event_id, raw_payload)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (hospital_id, employee_code, punch_timestamp, punch_type) DO NOTHING`,
          [hospitalId, connectorId, e.employee_code, e.employee_name, e.department,
           e.punch_timestamp, e.punch_type, e.punch_type_raw, e.verify_method, e.verify_method_raw,
           e.location_name, e.device_serial, e.temperature, e.source_system, e.source_event_id,
           e.raw_payload ? JSON.stringify(e.raw_payload) : null]
        );
      } catch (_) { /* skip duplicates */ }
    }
  }

  public async getAttendanceEvents(hospitalId: string, opts: { date?: Date; employee_code?: string; page: number; page_size: number }): Promise<{ data: any[]; total: number }> {
    const { date, employee_code, page, page_size } = opts;
    if (useMockDb) {
      let events = mockDb.attendance_events.filter(e => e.hospital_id === hospitalId);
      if (date) {
        const d = date.toISOString().split('T')[0];
        events = events.filter(e => String(e.punch_timestamp).startsWith(d));
      }
      if (employee_code) events = events.filter(e => e.employee_code === employee_code);
      events.sort((a, b) => String(b.punch_timestamp).localeCompare(String(a.punch_timestamp)));
      const start = (page - 1) * page_size;
      return { data: events.slice(start, start + page_size), total: events.length };
    }
    const dateFilter = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const params: any[] = [hospitalId, dateFilter];
    let empFilter = '';
    if (employee_code) { params.push(employee_code); empFilter = `AND employee_code = $${params.length}`; }
    const offset = (page - 1) * page_size;
    params.push(page_size, offset);
    const res = await executeQuery(this.hospitalId,
      `SELECT * FROM attendance_events
       WHERE hospital_id=$1 AND DATE(punch_timestamp)=$2 ${empFilter}
       ORDER BY punch_timestamp DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const countRes = await executeQuery(this.hospitalId,
      `SELECT COUNT(*) FROM attendance_events WHERE hospital_id=$1 AND DATE(punch_timestamp)=$2 ${empFilter}`,
      params.slice(0, employee_code ? 3 : 2)
    );
    return { data: res.rows, total: parseInt(countRes.rows[0].count) };
  }

  public async getAttendanceDevices(hospitalId: string): Promise<any[]> {
    if (useMockDb) {
      return mockDb.attendance_devices.filter(d => d.hospital_id === hospitalId);
    }
    const res = await executeQuery(this.hospitalId,
      `SELECT d.*, c.name as connector_name, c.provider FROM attendance_devices d
       LEFT JOIN attendance_connectors c ON c.id = d.connector_id
       WHERE d.hospital_id=$1 ORDER BY d.last_heartbeat_at DESC NULLS LAST`,
      [hospitalId]
    );
    return res.rows;
  }

  public async updateConnectorSyncState(connectorId: string, state: any): Promise<void> {
    if (useMockDb) {
      const idx = mockDb.attendance_connectors.findIndex(c => c.id === connectorId);
      if (idx >= 0) Object.assign(mockDb.attendance_connectors[idx], state);
      return;
    }
    await executeQuery(this.hospitalId,
      `UPDATE attendance_connectors
       SET last_sync_at=$1, last_sync_status=$2, last_error=$3, records_synced=records_synced+$4, updated_at=NOW()
       WHERE id=$5`,
      [state.last_sync_at, state.last_sync_status, state.last_error, state.records_synced ?? 0, connectorId]
    );
  }

  public async getInfrastructure(): Promise<any[]> {
    if (useMockDb) {
      return mockDb.infrastructure.filter(i => i.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM infrastructure WHERE hospital_id = $1", [this.hospitalId]);
    return res.rows;
  }

  public async addInfrastructure(inf: any): Promise<any> {
    if (useMockDb) {
      const newInf = { ...inf, id: inf.id || `inf-${Date.now()}`, hospital_id: this.hospitalId };
      mockDb.infrastructure.push(newInf);
      return newInf;
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO infrastructure (id, hospital_id, type, total_capacity, current_occupancy)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [inf.id || `inf-${Date.now()}`, this.hospitalId, inf.type, inf.total_capacity, inf.current_occupancy || 0]
    );
    return res.rows[0];
  }

  public async getResources(): Promise<any[]> {
    if (useMockDb) {
      return mockDb.resources.filter(r => r.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM resources WHERE hospital_id = $1", [this.hospitalId]);
    return res.rows;
  }

  public async addResource(res: any): Promise<any> {
    if (useMockDb) {
      const newRes = { ...res, id: res.id || `res-${Date.now()}`, hospital_id: this.hospitalId };
      mockDb.resources.push(newRes);
      return newRes;
    }
    const dbRes = await executeQuery(this.hospitalId,
      `INSERT INTO resources (id, hospital_id, ward_id, type, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [res.id || `res-${Date.now()}`, this.hospitalId, res.ward_id || null, res.type, res.status || "Available"]
    );
    return dbRes.rows[0];
  }

  public async updateResourceStatus(id: string, status: string): Promise<void> {
    if (useMockDb) {
      const r = mockDb.resources.find(res => res.id === id);
      if (r) r.status = status;
      return;
    }
    await executeQuery(this.hospitalId, "UPDATE resources SET status = $1 WHERE id = $2", [status, id]);
  }

  public async getEmployees(): Promise<any[]> {
    if (useMockDb) {
      return mockDb.employees.filter(e => e.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM employees WHERE hospital_id = $1", [this.hospitalId]);
    return res.rows;
  }

  public async addEmployee(emp: any): Promise<any> {
    if (useMockDb) {
      const newEmp = { ...emp, id: emp.id || `EMP-${Date.now()}`, hospital_id: this.hospitalId };
      mockDb.employees.push(newEmp);
      return newEmp;
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO employees (id, hospital_id, name, email, role, current_shift, assigned_ward_id, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [emp.id || `EMP-${Date.now()}`, this.hospitalId, emp.name, emp.email, emp.role, emp.current_shift || "Morning", emp.assigned_ward_id || null, emp.password_hash]
    );
    return res.rows[0];
  }

  public async getEmployeeById(id: string): Promise<any | null> {
    if (useMockDb) {
      const emp = mockDb.employees.find(e => e.id === id && e.hospital_id === this.hospitalId);
      return emp || null;
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM employees WHERE id = $1 AND hospital_id = $2", [id, this.hospitalId]);
    return res.rows[0] || null;
  }

  public async getEmployeeByEmail(email: string): Promise<any | null> {
    if (useMockDb) {
      const emp = mockDb.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
      return emp || null;
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM employees WHERE LOWER(email) = LOWER($1)", [email]);
    return res.rows[0] || null;
  }

  public async getTreatmentSessions(): Promise<any[]> {
    if (useMockDb) {
      return mockDb.treatment_sessions.filter(ts => ts.hospital_id === this.hospitalId);
    }
    const res = await executeQuery(this.hospitalId, "SELECT * FROM treatment_sessions WHERE hospital_id = $1", [this.hospitalId]);
    return res.rows.map((row: any) => ({
      ...row,
      resource_used_ids: typeof row.resource_used_ids === "string" ? JSON.parse(row.resource_used_ids) : row.resource_used_ids
    }));
  }

  public async addTreatmentSession(ts: any): Promise<any> {
    if (useMockDb) {
      const newTs = { ...ts, id: ts.id || `ts-${Date.now()}`, hospital_id: this.hospitalId };
      mockDb.treatment_sessions.push(newTs);
      return newTs;
    }
    const res = await executeQuery(this.hospitalId,
      `INSERT INTO treatment_sessions (id, patient_id, hospital_id, assigned_employee_id, resource_used_ids, status, health_issue_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        ts.id || `ts-${Date.now()}`,
        ts.patient_id,
        this.hospitalId,
        ts.assigned_employee_id || null,
        JSON.stringify(ts.resource_used_ids || []),
        ts.status || "Admitted",
        ts.health_issue_description || ""
      ]
    );
    return res.rows[0];
  }

  public async updateTreatmentSessionStatus(id: string, status: string): Promise<void> {
    if (useMockDb) {
      const ts = mockDb.treatment_sessions.find(t => t.id === id);
      if (ts) ts.status = status;
      return;
    }
    await executeQuery(this.hospitalId, "UPDATE treatment_sessions SET status = $1 WHERE id = $2", [status, id]);
  }

  public async updateUniversalPatientPassword(email: string, passwordHash: string): Promise<void> {
    if (useMockDb) {
      const patient = mockDb.universal_patients.find(p => p.email?.toLowerCase() === email.toLowerCase());
      if (patient) {
        patient.password_hash = passwordHash;
      }
      return;
    }
    await executeQuery(this.hospitalId,
      `UPDATE universal_patients SET password_hash = $1 WHERE email = $2`,
      [passwordHash, email]
    );
  }
}

export async function seedDatabase(): Promise<void> {
  if (useMockDb || !pool) {
    console.log("[CareFlow Seed] Skipping PostgreSQL database seeding (running in mock DB or pool not initialized).");
    return;
  }

  const client = await pool.connect();
  try {
    console.log("[CareFlow Seed] Starting database seeding...");

    // 0. Ensure schema migrations for recent additions
    await client.query(`
      ALTER TABLE universal_patients ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
      ALTER TABLE universal_patients ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    `);

    // 1. Hospitals
    await client.query(`
      INSERT INTO hospitals (id, name, latitude, longitude, address, contact_phone)
      VALUES ('8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'AIIMS New Delhi Regional Complex', 28.567200, 77.210000, 'Ansari Nagar, New Delhi, Delhi 110029', '011-26588500')
      ON CONFLICT (id) DO NOTHING
    `);

    // 2. Departments
    await client.query(`
      INSERT INTO departments (id, hospital_id, name, code)
      VALUES 
      ('d2d2d2d2-e3e3-f4f4-0505-161616161616', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Intensive Care Unit', 'ICU'),
      ('e1e1e1e1-e2e2-e3e3-e4e4-e5e5e5e5e5e5', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Emergency Room', 'ER')
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. Staff Members
    await client.query(`
      INSERT INTO staff_members (id, hospital_id, department_id, auth_user_id, first_name, last_name, role, specialty, contact_number, email, password_hash, is_active)
      VALUES
      ('s1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_smith', 'Sarah', 'Smith', 'dept_head', 'doctor', '555-1234', 'sarah@careflow.com', 'password123', true),
      ('s2', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_connor', 'John', 'Connor', 'staff', 'nurse', '555-5678', 'john@careflow.com', 'password123', true),
      ('s-receptionist', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_receptionist', 'Rita', 'Receptionist', 'receptionist', 'support', '555-0001', 'receptionist@careflow.com', 'password123', true),
      ('s-doctor', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_doctor', 'Dr. Rajesh', 'Kumar', 'doctor', 'doctor', '555-0002', 'doctor@careflow.com', 'password123', true),
      ('s-nurse', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_nurse', 'Priyanka', 'Sharma', 'nurse', 'nurse', '555-0003', 'nurse@careflow.com', 'password123', true),
      ('s-wardboy', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_wardboy', 'Wayne', 'Wardboy', 'ward_boy', 'support', '555-0004', 'wardboy@careflow.com', 'password123', true),
      ('s-admin', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_admin', 'Adam', 'Admin', 'admin', 'support', '555-0008', 'admin@careflow.com', 'password123', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // 4. Universal Patients
    await client.query(`
      INSERT INTO universal_patients (upid, pin_hash, account_active, admitted_hospital_id, admitted_at, first_name, last_name, date_of_birth, gender, blood_group, phone, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions, current_medications, insurance_provider, insurance_policy_number, admission_history, email, password_hash)
      VALUES
      ('CF-2026-MOCKPT', '123456', true, '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', NOW() - INTERVAL '24 hours', 'Sarah', 'Connor', '1985-11-10', 'Female', 'A_negative', '555-0987', 'John Connor', '555-5678', '["Sulfa Drugs", "Penicillin"]'::jsonb, '["Asthma"]'::jsonb, '["Albuterol Inhaler"]'::jsonb, 'SarahCare', 'SC-99901', '[{"id": "adm-mock-1", "hospital_id": "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", "hospital_name": "AIIMS New Delhi", "admitted_at": "2026-07-04T15:00:00Z", "treating_physician": "Dr. Rajesh Kumar"}]'::jsonb, 'patient@careflow.com', 'password123')
      ON CONFLICT (upid) DO UPDATE SET email = 'patient@careflow.com', password_hash = 'password123'
    `);

    // 5. Patients
    await client.query(`
      INSERT INTO patients (id, hospital_id, upid, first_name, last_name, date_of_birth, triage_level, required_department_code, needs_ventilator, status, vitals, admitted_at)
      VALUES
      ('p-mock-1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'CF-2026-MOCKPT', 'Sarah', 'Connor', '1985-11-10', '2_emergent', 'ICU', false, 'admitted', '{"hr": "82", "bp": "118/75", "o2": "97%", "oxygenation_source": "SpO2", "is_delirious": false}'::jsonb, NOW() - INTERVAL '24 hours')
      ON CONFLICT (id) DO NOTHING
    `);

    // 6. Infrastructure
    await client.query(`
      INSERT INTO infrastructure (id, hospital_id, type, total_capacity, current_occupancy)
      VALUES
      ('ward-icu', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'ICU', 10, 2),
      ('ward-ccu', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'CCU', 5, 1),
      ('ward-general', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'General', 30, 5)
      ON CONFLICT (id) DO NOTHING
    `);

    // 7. Resources
    await client.query(`
      INSERT INTO resources (id, hospital_id, ward_id, type, status)
      VALUES
      ('res-vent-1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'ward-icu', 'Ventilator', 'In-Use'),
      ('res-vent-2', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'ward-icu', 'Ventilator', 'Available'),
      ('res-cyl-1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'ward-general', 'Oxygen Cylinder', 'Available'),
      ('res-cyl-2', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'ward-general', 'Oxygen Cylinder', 'In-Use')
      ON CONFLICT (id) DO NOTHING
    `);

    // 8. Employees
    await client.query(`
      INSERT INTO employees (id, hospital_id, name, email, role, current_shift, assigned_ward_id, password_hash)
      VALUES
      ('s1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Sarah Smith', 'sarah.smith@careflow.com', 'Doctor', 'Morning', 'ward-icu', 'doctor123'),
      ('s2', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'John Connor', 'john.connor@careflow.com', 'Nurse', 'Evening', 'ward-icu', 'nurse123'),
      ('s-receptionist', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Rita Receptionist', 'receptionist@careflow.com', 'Receptionist', 'Morning', 'ward-general', 'receptionist123'),
      ('s-doctor', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Rajesh Kumar', 'doctor@careflow.com', 'Doctor', 'Morning', 'ward-icu', 'doctor123'),
      ('s-nurse', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Priyanka Nurse', 'nurse@careflow.com', 'Nurse', 'Night', 'ward-icu', 'nurse123'),
      ('s-wardboy', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Wayne Wardboy', 'wardboy@careflow.com', 'Ward Boy', 'Morning', 'ward-general', 'wardboy123'),
      ('s-labtech', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Larry Labtech', 'labtech@careflow.com', 'Lab Tech', 'Morning', 'ward-general', 'labtech123'),
      ('s-pharmacist', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Peter Pharmacist', 'pharmacist@careflow.com', 'Pharmacist', 'Morning', 'ward-general', 'pharmacist123'),
      ('s-md', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Milton Director', 'md@careflow.com', 'medical_director', 'Morning', 'ward-icu', 'md123'),
      ('s-admin', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Arthur Admin', 'admin@careflow.com', 'admin', 'Morning', 'ward-general', 'admin123')
      ON CONFLICT (id) DO NOTHING
    `);

    // 9. Treatment Sessions
    await client.query(`
      INSERT INTO treatment_sessions (id, patient_id, hospital_id, assigned_employee_id, resource_used_ids, status, health_issue_description)
      VALUES
      ('ts-mock-1', 'CF-2026-MOCKPT', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 's-doctor', '["res-vent-1"]'::jsonb, 'Admitted', 'Patient has severe respiratory distress, oxygen level is 88%. Initiated invasive mechanical ventilation.')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log("[CareFlow Seed] Database seeded successfully!");
  } catch (err) {
    console.error("[CareFlow Seed] Error seeding database:", err);
  } finally {
    client.release();
  }
}

// Auto-seed database once when module is loaded in serverless environments
(async () => {
  try {
    await seedDatabase();
  } catch (err) {
    console.error("[CareFlow Seed] Database auto-seeding failed on module load:", err);
  }
})();

