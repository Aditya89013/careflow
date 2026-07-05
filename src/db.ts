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
      `INSERT INTO patients (hospital_id, first_name, last_name, date_of_birth, triage_level, required_department_code, needs_ventilator, status, admitted_at, vitals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        this.hospitalId, 
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
      `INSERT INTO allocations (hospital_id, patient_id, bed_id, ventilator_id, primary_doctor_id, allocated_by, is_override, override_reason, allocated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
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
          `INSERT INTO shifts (hospital_id, staff_member_id, department_id, shift_date, type, status, rationale)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
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
    await executeQuery(this.hospitalId,
      `INSERT INTO audit_logs (hospital_id, actor_id, action, entity_name, entity_id, payload_before, payload_after, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        this.hospitalId,
        "admin",
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
                                       current_medications, insurance_provider, insurance_policy_number, admission_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        patient.upid, patient.pin_hash, patient.account_active, patient.admitted_hospital_id || null, 
        patient.admitted_at || null, patient.discharged_at || null,
        patient.first_name, patient.last_name, patient.date_of_birth, patient.gender, patient.blood_group, patient.phone,
        patient.emergency_contact_name, patient.emergency_contact_phone,
        JSON.stringify(patient.allergies), JSON.stringify(patient.chronic_conditions), JSON.stringify(patient.current_medications),
        patient.insurance_provider || null, patient.insurance_policy_number || null,
        JSON.stringify(patient.admission_history)
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
                                     insurance_provider = $17, insurance_policy_number = $18, admission_history = $19
       WHERE upid = $20`,
      [
        patient.pin_hash, patient.account_active, patient.admitted_hospital_id || null, patient.admitted_at || null,
        patient.discharged_at || null, patient.first_name, patient.last_name, patient.date_of_birth, patient.gender,
        patient.blood_group, patient.phone, patient.emergency_contact_name, patient.emergency_contact_phone,
        JSON.stringify(patient.allergies), JSON.stringify(patient.chronic_conditions), JSON.stringify(patient.current_medications),
        patient.insurance_provider || null, patient.insurance_policy_number || null,
        JSON.stringify(patient.admission_history),
        patient.upid
      ]
    );
  }
}
