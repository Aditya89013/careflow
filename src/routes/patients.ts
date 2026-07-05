import { Router, Request, Response } from "express";
import { SqlHospitalRepository, mockDb, executeQuery } from "../db";
import { AllocationService } from "../application/services";
import { authMiddleware, requireRole } from "../middleware/auth";
import { broadcastHospitalEvent } from "../index";
import { UniversalPatient, AdmissionRecord } from "../domain/entities";

const router = Router();

// Staff Roles list helper for common accesses
const ALL_STAFF_ROLES = [
  "admin", "receptionist", "doctor", "nurse", "ward_boy", "lab_tech", "pharmacist", "medical_director", "staff", "dept_head"
];

const CLINICAL_STAFF_ROLES = [
  "admin", "doctor", "nurse", "lab_tech", "pharmacist", "medical_director", "staff", "dept_head"
];

// 1. Patient Intake & Triage Tagging (Fallback / legacy route)
router.post(
  "/patients",
  authMiddleware,
  requireRole(["receptionist", "staff", "dept_head", "admin"]),
  async (req: Request, res: Response) => {
    const { first_name, last_name, date_of_birth, triage_level, required_department_code, needs_ventilator, vitals } = req.body;
    const hospitalId = req.user!.hospitalId;

    if (!triage_level || !required_department_code) {
      return res.status(400).json({ error: "Missing required triage parameter details" });
    }

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const patient = await repo.addPatient({
        id: `p-${Date.now()}`,
        first_name: first_name || "Unknown",
        last_name: last_name || "Patient",
        date_of_birth: date_of_birth || "1990-01-01",
        triage_level,
        required_department_code,
        needs_ventilator: !!needs_ventilator,
        admitted_at: new Date().toISOString(),
        vitals: vitals ? {
          hr: vitals.hr || "80",
          bp: vitals.bp || "120/80",
          o2: vitals.o2 || "98%",
          oxygenation_source: vitals.oxygenation_source || "SpO2",
          is_delirious: !!vitals.is_delirious
        } : { hr: "80", bp: "120/80", o2: "98%", oxygenation_source: "SpO2", is_delirious: false }
      });

      // Audit Log write
      await repo.addAuditEvent({
        id: `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: "PATIENT_INTAKE",
        payload_after: patient
      });

      // Broadcast WebSocket notification
      broadcastHospitalEvent(hospitalId, { type: "PATIENT_INTAKE", patient });

      return res.status(201).json(patient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error during patient intake" });
    }
  }
);

// 2. Patient Registration with Universal Patient ID (New Intake Flow)
router.post(
  "/patients/register",
  authMiddleware,
  requireRole(["receptionist", "admin", "staff", "dept_head"]),
  async (req: Request, res: Response) => {
    const { 
      first_name, last_name, date_of_birth, gender, blood_group, phone, 
      emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions, 
      current_medications, insurance_provider, insurance_policy_number,
      triage_level, required_department_code, needs_ventilator, vitals
    } = req.body;

    const hospitalId = req.user!.hospitalId;

    if (!first_name || !last_name || !date_of_birth || !triage_level || !required_department_code) {
      return res.status(400).json({ error: "Missing required patient registration fields" });
    }

    try {
      const repo = new SqlHospitalRepository(hospitalId);

      // Check if patient already exists in cross-hospital registry
      let uniPatient = await repo.getUniversalPatientByDetails(first_name, last_name, date_of_birth);
      const pin = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6 digit pin

      if (uniPatient) {
        // Patient exists - update active status and admission history
        uniPatient.account_active = true;
        uniPatient.admitted_hospital_id = hospitalId;
        uniPatient.admitted_at = new Date().toISOString();
        uniPatient.pin_hash = pin; // Store new pin for this admission
        
        const newAdmission: AdmissionRecord = {
          id: `adm-${Date.now()}`,
          hospital_id: hospitalId,
          hospital_name: "AIIMS New Delhi",
          admitted_at: new Date().toISOString(),
          treating_physician: req.body.treating_physician || "Dr. Rajesh Kumar"
        };
        uniPatient.admission_history.push(newAdmission);

        await repo.updateUniversalPatient(uniPatient);
      } else {
        // Patient does not exist - create universal identity
        const year = new Date().getFullYear();
        const randHex = Math.random().toString(36).substring(2, 10).toUpperCase();
        const upid = `CF-${year}-${randHex}`;

        const newAdmission: AdmissionRecord = {
          id: `adm-${Date.now()}`,
          hospital_id: hospitalId,
          hospital_name: "AIIMS New Delhi",
          admitted_at: new Date().toISOString(),
          treating_physician: req.body.treating_physician || "Dr. Rajesh Kumar"
        };

        uniPatient = {
          upid,
          pin_hash: pin,
          account_active: true,
          admitted_hospital_id: hospitalId,
          admitted_at: new Date().toISOString(),
          first_name,
          last_name,
          date_of_birth,
          gender: gender || "Other",
          blood_group: blood_group || "Unknown",
          phone: phone || "",
          emergency_contact_name: emergency_contact_name || "",
          emergency_contact_phone: emergency_contact_phone || "",
          allergies: allergies || [],
          chronic_conditions: chronic_conditions || [],
          current_medications: current_medications || [],
          insurance_provider: insurance_provider || "",
          insurance_policy_number: insurance_policy_number || "",
          admission_history: [newAdmission]
        };

        await repo.addUniversalPatient(uniPatient);
      }

      // Create active local hospital patient entry
      const patientId = `p-${Date.now()}`;
      const patient = await repo.addPatient({
        id: patientId,
        upid: uniPatient.upid,
        first_name: uniPatient.first_name,
        last_name: uniPatient.last_name,
        date_of_birth: uniPatient.date_of_birth,
        triage_level,
        required_department_code,
        needs_ventilator: !!needs_ventilator,
        admitted_at: uniPatient.admitted_at!,
        vitals: vitals ? {
          hr: vitals.hr || "80",
          bp: vitals.bp || "120/80",
          o2: vitals.o2 || "98%",
          oxygenation_source: vitals.oxygenation_source || "SpO2",
          is_delirious: !!vitals.is_delirious
        } : { hr: "80", bp: "120/80", o2: "98%", oxygenation_source: "SpO2", is_delirious: false }
      });

      // Audit Log write
      await repo.addAuditEvent({
        id: `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: "PATIENT_INTAKE",
        payload_after: patient
      });

      // Broadcast WebSocket notification
      broadcastHospitalEvent(hospitalId, { type: "PATIENT_INTAKE", patient });

      return res.status(201).json({
        patient,
        upid: uniPatient.upid,
        pin,
        message: "Patient registered and admitted successfully"
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error during patient registration" });
    }
  }
);

// 3. Patient Discharge Flow
router.post(
  "/patients/:id/discharge",
  authMiddleware,
  requireRole(["receptionist", "doctor", "admin", "staff", "dept_head"]),
  async (req: Request, res: Response) => {
    const patientId = req.params.id;
    const hospitalId = req.user!.hospitalId;
    const { discharge_summary, primary_diagnosis } = req.body;

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const patient = await repo.getPatientById(patientId);

      if (!patient) {
        return res.status(404).json({ error: "Patient not found in this hospital" });
      }

      // Update patient status in active database
      patient.status = "discharged";
      const mockPatient = mockDb.patients.find(p => p.id === patientId);
      if (mockPatient) {
        mockPatient.status = "discharged";
        mockPatient.discharged_at = new Date().toISOString();
      }

      // Deallocate associated bed and ventilator if any
      const allocation = mockDb.allocations.find(a => a.patient_id === patientId && a.hospital_id === hospitalId);
      if (allocation) {
        const bed = mockDb.beds.find(b => b.id === allocation.bed_id);
        if (bed) bed.status = "free";

        if (allocation.ventilator_id) {
          const vent = mockDb.ventilators.find(v => v.id === allocation.ventilator_id);
          if (vent) vent.status = "available";
        }
        mockDb.allocations = mockDb.allocations.filter(a => a.patient_id !== patientId);
      }

      // Update universal patient history
      if (patient.upid) {
        const uniPatient = await repo.getUniversalPatientByUpid(patient.upid);
        if (uniPatient) {
          uniPatient.account_active = false;
          uniPatient.discharged_at = new Date().toISOString();
          
          if (uniPatient.admission_history.length > 0) {
            const lastAdm = uniPatient.admission_history[uniPatient.admission_history.length - 1];
            lastAdm.discharged_at = uniPatient.discharged_at;
            lastAdm.discharge_summary = discharge_summary || "Routine discharge";
            lastAdm.primary_diagnosis = primary_diagnosis || patient.triage_level;
            lastAdm.vitals_summary = patient.vitals;
          }
          await repo.updateUniversalPatient(uniPatient);
        }
      }

      // Audit Log write
      await repo.addAuditEvent({
        id: `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: "PATIENT_DISCHARGE",
        payload_after: { patientId, upid: patient.upid }
      });

      // Broadcast WebSocket notification
      broadcastHospitalEvent(hospitalId, { type: "PATIENT_DISCHARGE", patientId });

      return res.status(200).json({ message: "Patient discharged successfully", patientId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error during patient discharge" });
    }
  }
);

// 4. Clinical History Lookup
router.get(
  "/patients/:upid/history",
  authMiddleware,
  requireRole(CLINICAL_STAFF_ROLES),
  async (req: Request, res: Response) => {
    const { upid } = req.params;
    const hospitalId = req.user!.hospitalId;

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const uniPatient = await repo.getUniversalPatientByUpid(upid);

      if (!uniPatient) {
        return res.status(404).json({ error: "Universal Patient record not found" });
      }

      // Audit clinical history lookup (HIPAA requirement)
      await repo.addAuditEvent({
        id: `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: "CLINICAL_HISTORY_LOOKUP",
        payload_after: { accessed_upid: upid, accessed_by: req.user!.userId }
      });

      return res.status(200).json(uniPatient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error fetching patient history" });
    }
  }
);

// 5. Patient Self-View Profile
router.get(
  "/patients/me",
  authMiddleware,
  requireRole(["patient"]),
  async (req: Request, res: Response) => {
    const upid = req.user!.upid;
    const hospitalId = req.user!.hospitalId;

    if (!upid) {
      return res.status(400).json({ error: "Authenticated session is not a patient session" });
    }

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const uniPatient = await repo.getUniversalPatientByUpid(upid);

      if (!uniPatient) {
        return res.status(404).json({ error: "Patient record not found" });
      }

      let activeAdmission = null;
      if (uniPatient.account_active) {
        const patients = await repo.getPatients();
        const activePt = patients.find(p => p.upid === upid);
        if (activePt) {
          const allocations = await repo.getAllocations();
          const alloc = allocations.find(a => a.patient_id === activePt.id);
          
          let bedNumber = null;
          if (alloc) {
            const beds = await repo.getBeds();
            const bed = beds.find(b => b.id === alloc.bed_id);
            if (bed) bedNumber = bed.bed_number;
          }

          activeAdmission = {
            ...activePt,
            bed_number: bedNumber
          };
        }
      }

      return res.status(200).json({
        profile: uniPatient,
        activeAdmission
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error fetching patient profile" });
    }
  }
);

// 5b. Update Patient Vitals (Bedside Charting)
router.put(
  "/patients/:id/vitals",
  authMiddleware,
  requireRole(["nurse", "doctor", "admin", "staff", "dept_head"]),
  async (req: Request, res: Response) => {
    const patientId = req.params.id;
    const hospitalId = req.user!.hospitalId;
    const { hr, bp, o2, oxygenation_source, is_delirious, fio2 } = req.body;

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const patient = await repo.getPatientById(patientId);

      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      patient.vitals = {
        hr: hr || patient.vitals?.hr || "80",
        bp: bp || patient.vitals?.bp || "120/80",
        o2: o2 || patient.vitals?.o2 || "98%",
        oxygenation_source: oxygenation_source || patient.vitals?.oxygenation_source || "SpO2",
        is_delirious: is_delirious !== undefined ? !!is_delirious : !!patient.vitals?.is_delirious,
        fio2: fio2 !== undefined ? Number(fio2) : patient.vitals?.fio2
      };

      // In-Memory mock DB synchronization
      const mockPatient = mockDb.patients.find(p => p.id === patientId);
      if (mockPatient) {
        mockPatient.vitals = patient.vitals;
      }

      const useMockDb = process.env.USE_MOCK_DB === "true" || !process.env.DATABASE_URL;
      if (!useMockDb) {
        await executeQuery(hospitalId, "UPDATE patients SET vitals = $1 WHERE id = $2", [JSON.stringify(patient.vitals), patientId]);
      }

      // Add audit log event
      await repo.addAuditEvent({
        id: `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: "PATIENT_VITALS_UPDATE",
        payload_after: { patientId, vitals: patient.vitals }
      });

      // Broadcast update
      broadcastHospitalEvent(hospitalId, { type: "PATIENT_VITALS_UPDATE", patientId, vitals: patient.vitals });

      return res.status(200).json(patient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to update patient vitals" });
    }
  }
);

// 6. Query Recommendations from Allocation Engine
router.get(
  "/patients/:id/recommendations",
  authMiddleware,
  requireRole(CLINICAL_STAFF_ROLES),
  async (req: Request, res: Response) => {
    const patientId = req.params.id;
    const hospitalId = req.user!.hospitalId;

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const service = new AllocationService(repo);
      const recommendations = await service.getRecommendations(patientId);

      return res.status(200).json({
        patient_id: patientId,
        recommendations
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error fetching recommendations" });
    }
  }
);

// 7. Execute Bed & Staff Allocation
router.post(
  "/allocations",
  authMiddleware,
  requireRole(CLINICAL_STAFF_ROLES),
  async (req: Request, res: Response) => {
    const { patient_id, bed_id, ventilator_id, primary_doctor_id, is_override, override_reason } = req.body;
    const hospitalId = req.user!.hospitalId;

    if (is_override && !override_reason) {
      return res.status(400).json({ error: "Override reason is mandatory for manual overrides" });
    }

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const allocation = await repo.addAllocation({
        id: `a-${Date.now()}`,
        patient_id,
        bed_id,
        ventilator_id: ventilator_id || undefined,
        primary_doctor_id,
        is_override: !!is_override,
        override_reason: override_reason || undefined,
        allocated_at: new Date().toISOString()
      });

      await repo.addAuditEvent({
        id: `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: is_override ? "MANUAL_OVERRIDE_ALLOCATION" : "RECOMMENDED_ALLOCATION",
        payload_after: allocation
      });

      broadcastHospitalEvent(hospitalId, {
        type: "RESOURCE_ALLOCATION",
        allocation,
        patient_id,
        bed_id,
        ventilator_id
      });

      return res.status(200).json({
        allocation_id: allocation.id,
        status: "allocated"
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to process allocation" });
    }
  }
);

// 8. GET /patients
router.get(
  "/patients",
  authMiddleware,
  requireRole(ALL_STAFF_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const patients = await repo.getPatients();
      return res.status(200).json(patients);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch patients" });
    }
  }
);

// 9. GET /beds
router.get(
  "/beds",
  authMiddleware,
  requireRole(ALL_STAFF_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const beds = await repo.getBeds();
      return res.status(200).json(beds);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch beds" });
    }
  }
);

// 10. GET /ventilators
router.get(
  "/ventilators",
  authMiddleware,
  requireRole(ALL_STAFF_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const ventilators = await repo.getVentilators();
      return res.status(200).json(ventilators);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch ventilators" });
    }
  }
);

// 11. GET /staff
router.get(
  "/staff",
  authMiddleware,
  requireRole(["admin", "medical_director", "staff", "dept_head", "doctor", "nurse"]),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const staff = await repo.getStaff();
      return res.status(200).json(staff);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch staff members" });
    }
  }
);

// 12. GET /allocations
router.get(
  "/allocations",
  authMiddleware,
  requireRole(ALL_STAFF_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const allocations = await repo.getAllocations();
      return res.status(200).json(allocations);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch allocations" });
    }
  }
);

// 13. GET /audit-logs
router.get(
  "/audit-logs",
  authMiddleware,
  requireRole(["admin", "medical_director", "dept_head"]),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const logs = await repo.getAuditEvents();
      return res.status(200).json(logs);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }
);

function buildFHIRObservationsBundle(patient: any): any {
  const patientRef = `Patient/${patient.id}`;
  const encounterRef = `Encounter/enc-${patient.id}`;
  const timestamp = patient.admitted_at || new Date().toISOString();

  const entries: any[] = [];

  if (patient.vitals) {
    const { hr, bp, o2, oxygenation_source } = patient.vitals;

    if (hr) {
      entries.push({
        resource: {
          resourceType: "Observation",
          id: `obs-hr-${patient.id}`,
          status: "final",
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "vital-signs",
                  display: "Vital Signs"
                }
              ]
            }
          ],
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "8867-4",
                display: "Heart rate"
              }
            ],
            text: "Heart Rate"
          },
          subject: { reference: patientRef },
          encounter: { reference: encounterRef },
          effectiveDateTime: timestamp,
          valueQuantity: {
            value: Number(hr),
            unit: "beats/minute",
            system: "http://unitsofmeasure.org",
            code: "/min"
          }
        }
      });
    }

    if (o2) {
      const isSpO2 = oxygenation_source === "SpO2";
      entries.push({
        resource: {
          resourceType: "Observation",
          id: `obs-o2-${patient.id}`,
          status: "final",
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "vital-signs",
                  display: "Vital Signs"
                }
              ]
            }
          ],
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: isSpO2 ? "2708-6" : "2703-7",
                display: isSpO2 ? "Oxygen saturation in Arterial blood by Pulse oximetry" : "Oxygen partial pressure in Arterial blood"
              }
            ],
            text: isSpO2 ? "Pulse Oximetry SpO2" : "Arterial Blood Gas PaO2"
          },
          subject: { reference: patientRef },
          encounter: { reference: encounterRef },
          effectiveDateTime: timestamp,
          valueQuantity: {
            value: Number(o2.replace("%", "")),
            unit: isSpO2 ? "%" : "mmHg",
            system: "http://unitsofmeasure.org",
            code: isSpO2 ? "%" : "mm[Hg]"
          }
        }
      });
    }

    if (bp && bp.includes("/")) {
      const [sys, dia] = bp.split("/").map(Number);
      if (!isNaN(sys) && !isNaN(dia)) {
        entries.push({
          resource: {
            resourceType: "Observation",
            id: `obs-bp-${patient.id}`,
            status: "final",
            category: [
              {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/observation-category",
                    code: "vital-signs",
                    display: "Vital Signs"
                  }
                ]
              }
            ],
            code: {
              coding: [
                {
                  system: "http://loinc.org",
                  code: "85354-9",
                  display: "Blood pressure panel with all children optional"
                }
              ],
              text: "Blood Pressure"
            },
            subject: { reference: patientRef },
            encounter: { reference: encounterRef },
            effectiveDateTime: timestamp,
            component: [
              {
                code: {
                  coding: [
                    {
                      system: "http://loinc.org",
                      code: "8480-6",
                      display: "Systolic blood pressure"
                    }
                  ]
                },
                valueQuantity: {
                  value: sys,
                  unit: "mmHg",
                  system: "http://unitsofmeasure.org",
                  code: "mm[Hg]"
                }
              },
              {
                code: {
                  coding: [
                    {
                      system: "http://loinc.org",
                      code: "8462-4",
                      display: "Diastolic blood pressure"
                    }
                  ]
                },
                valueQuantity: {
                  value: dia,
                  unit: "mmHg",
                  system: "http://unitsofmeasure.org",
                  code: "mm[Hg]"
                }
              }
            ]
          }
        });
      }
    }
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: entries
  };
}

// 14. GET /patients/:id/fhir
router.get(
  "/patients/:id/fhir",
  authMiddleware,
  requireRole(["staff", "dept_head", "admin", "doctor", "medical_director"]),
  async (req: Request, res: Response) => {
    const patientId = req.params.id;
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const patient = await repo.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const bundle = buildFHIRObservationsBundle(patient);
      return res.status(200).json(bundle);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to export FHIR bundle" });
    }
  }
);

export default router;
