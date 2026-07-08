import { Router, Request, Response } from "express";
import { SqlHospitalRepository } from "../db";
import { authMiddleware } from "../middleware/auth";
import { callOpenRouterWithFallback } from "./chatbot";

const router = Router();
const DEFAULT_HOSPITAL_ID = "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";

// ──────────────────────────────────────────────────────────────────
// Fetch Patient & Relatives Active Stays & Treatments
// ──────────────────────────────────────────────────────────────────
router.get("/patient-portal/treatments", authMiddleware, async (req: Request, res: Response) => {
  if (req.user!.role !== "patient" || !req.user!.upid) {
    return res.status(403).json({ error: "Only patients/customers can access the patient portal" });
  }

  const upid = req.user!.upid;

  try {
    const mainRepo = new SqlHospitalRepository(DEFAULT_HOSPITAL_ID);
    
    // Fetch logged-in universal patient details
    const customer = await mainRepo.getUniversalPatientByUpid(upid);
    if (!customer) {
      return res.status(404).json({ error: "Universal Patient record not found" });
    }

    // We will search for admissions matching:
    // 1. Customer's own UPID
    // 2. Relative's phone number, email, or last name
    // Let's query all hospitals for active patients
    const hospitals = await mainRepo.getHospitals();
    const activeTreatments = [];

    for (const hosp of hospitals) {
      const repo = new SqlHospitalRepository(hosp.id);
      
      // Get all patients in this hospital
      const allPatients = await repo.getPatients();
      
      // Filter patients that belong to the customer or close relatives
      const matchedPatients = allPatients.filter(p => {
        // Own stay
        if (p.upid === upid) return true;
        
        // Relative stay: matches by phone, emergency contact phone, or last name
        if (p.upid) {
          // Find the universal patient details for this patient to check relations
          // We can do it mock/local style or simple mapping
          if (p.last_name && p.last_name.toLowerCase() === customer.last_name.toLowerCase()) return true;
        }
        return false;
      });

      // For each matched patient, if they are active (not discharged), retrieve allocation & clinician details
      for (const p of matchedPatients) {
        if (p.status === "discharged") continue;

        // Fetch allocations
        const allocations = await repo.getAllocations();
        const alloc = allocations.find(a => a.patient_id === p.id);

        let bedNumber = "Not assigned";
        let doctorName = "Not assigned";
        let staffRoster: any[] = [];

        // Fetch bed details
        if (alloc?.bed_id) {
          const beds = await repo.getBeds();
          const bed = beds.find(b => b.id === alloc.bed_id);
          if (bed) bedNumber = bed.bed_number;
        }

        // Fetch doctor details
        const staffList = await repo.getStaff();
        if (alloc?.primary_doctor_id) {
          const doc = staffList.find(s => s.id === alloc.primary_doctor_id);
          if (doc) doctorName = `Dr. ${doc.first_name} ${doc.last_name} (${doc.specialty})`;
        }

        // Fetch currently active nursing staff in the same department (ICU/ER/General)
        const shifts = await repo.getShifts();
        const activeShifts = shifts.filter(s => (s as any).status === "scheduled" || (s as any).status === "completed");
        
        activeShifts.forEach(shift => {
          const staff = staffList.find(st => st.id === shift.staff_member_id);
          if (staff && staff.role === "nurse") {
            staffRoster.push({
              name: `${staff.first_name} ${staff.last_name}`,
              specialty: staff.specialty,
              shift_type: shift.type
            });
          }
        });

        // Resolve or generate Diet Plan
        let dietPlan = p.diet_plan;
        if (!dietPlan) {
          // Call AI to generate a clinical diet recommendation based on triage level and vitals
          const systemPrompt = `You are a clinical dietitian at CareFlow Hospital. 
Generate a short 1-2 sentence diet recommendation for a patient.
Format the output as a clean bulleted list or single short paragraph. 
Do not include any greeting or conversational text. Just the diet recommendation.`;
          
          const userPrompt = `Patient Name: ${p.first_name} ${p.last_name}
Required Department: ${p.required_department_code}
Triage Level: ${p.triage_level}
Vitals: ${JSON.stringify(p.vitals || {})}`;

          try {
            const data = await callOpenRouterWithFallback({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ]
            });
            dietPlan = data.choices?.[0]?.message?.content || "Regular soft diet. Limit sodium, stay hydrated.";
            
            // Save it back to db so we don't regenerate repeatedly
            await repo.updatePatientDietPlan(p.id, dietPlan as string);
          } catch {
            dietPlan = "Standard clinical diet: Low sodium, balanced hydration, soft foods.";
          }
        } else {
          // ensure it has type string to satisfy typescript compiler
          dietPlan = dietPlan as string;
        }

        activeTreatments.push({
          patient_id: p.id,
          upid: p.upid,
          first_name: p.first_name,
          last_name: p.last_name,
          status: p.status || "admitted",
          triage_level: p.triage_level,
          admitted_at: p.admitted_at,
          vitals: p.vitals,
          hospital_name: hosp.name,
          bed_number: bedNumber,
          doctor_name: doctorName,
          diet_plan: dietPlan,
          nurses: staffRoster
        });
      }
    }
    // Retrieve active treatment sessions for the logged-in customer
    const treatmentSessions = await mainRepo.getTreatmentSessions();
    const mySessions = treatmentSessions.filter(ts => ts.patient_id === upid);

    return res.status(200).json({
      customer: {
        first_name: customer.first_name,
        last_name: customer.last_name,
        upid: customer.upid,
        phone: customer.phone,
        email: customer.email
      },
      treatments: activeTreatments,
      treatment_sessions: mySessions
    });
  } catch (err: any) {
    console.error("Patient treatments error:", err);
    return res.status(500).json({ error: "Failed to load treatments dashboard data", details: err.message });
  }
});

export default router;
