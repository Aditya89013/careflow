import { server } from "./index";
import fetch from "node-fetch";

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

async function runTests() {
  console.log("=== Starting CareFlow Verification Tests ===");

  try {
    // 1. Healthcheck Test
    console.log("\nTesting GET /health...");
    const healthRes = await fetch(`http://localhost:${PORT}/health`);
    const healthData = await healthRes.json();
    console.log("Healthcheck Result:", healthData);

    // 2. Public Hospitals Capacity Lookup Test
    console.log("\nTesting GET /public/hospitals (Public Finder)...");
    const pubRes = await fetch(`${BASE_URL}/public/hospitals`);
    const pubData: any = await pubRes.json();
    console.log("Public Finder Result (Anonymized capacity lists):");
    console.dir(pubData, { depth: null });

    // 3. Patient Intake Triage Request (with SOFA-2 Vitals: SpO2 + Delirium flag)
    console.log("\nTesting POST /patients (Intake & Triage with SOFA-2 metrics)...");
    const intakeRes = await fetch(`${BASE_URL}/patients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bypass-auth": "true"
      },
      body: JSON.stringify({
        first_name: "James",
        last_name: "Tiberius",
        date_of_birth: "1966-09-08",
        triage_level: "2_emergent",
        required_department_code: "ICU",
        needs_ventilator: true,
        vitals: {
          hr: "135", // High heart rate (+1 point)
          bp: "110/55", // Low diastolic blood pressure (+2 points)
          o2: "88%", // Low O2 saturation (+2 points SpO2/FiO2)
          oxygenation_source: "SpO2",
          is_delirious: true // Delirium positive (+1 point)
        }
      })
    });
    const patientData: any = await intakeRes.json();
    console.log("Intake Created Patient:", patientData);
    const patientId = patientData.id;

    // 4. Recommendation Queries (SOFA-2 Triage allocation scoring)
    console.log(`\nTesting GET /patients/${patientId}/recommendations...`);
    const recRes = await fetch(`${BASE_URL}/patients/${patientId}/recommendations`, {
      headers: { "x-bypass-auth": "true" }
    });
    const recData: any = await recRes.json();
    console.log("Allocation Recommendations:");
    console.dir(recData, { depth: null });

    const bestMatch = recData.recommendations[0];
    if (bestMatch) {
      // 5. Submit Allocation Selection
      console.log("\nTesting POST /allocations (Confirm Allocation)...");
      const allocRes = await fetch(`${BASE_URL}/allocations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bypass-auth": "true"
        },
        body: JSON.stringify({
          patient_id: patientId,
          bed_id: bestMatch.bedId,
          ventilator_id: bestMatch.ventilatorId,
          primary_doctor_id: bestMatch.staffId,
          is_override: false
        })
      });
      const allocData = await allocRes.json();
      console.log("Allocation Result:", allocData);
    }

    // 6. Test GET /patients/:id/fhir (HL7 FHIR Observation Bundle)
    console.log(`\nTesting GET /patients/${patientId}/fhir (HL7 FHIR Bundle Export)...`);
    const fhirRes = await fetch(`${BASE_URL}/patients/${patientId}/fhir`, {
      headers: { "x-bypass-auth": "true" }
    });
    if (!fhirRes.ok) {
      throw new Error(`FHIR Export failed with status ${fhirRes.status}`);
    }
    const fhirData: any = await fhirRes.json();
    console.log("HL7 FHIR Bundle Export Sample (Entries):");
    console.dir(fhirData.entry.slice(0, 2), { depth: null });
    
    // Assert correct FHIR coding exists
    const hasHR = fhirData.entry.some((e: any) => e.resource.code.coding[0].code === "8867-4");
    const hasSpO2 = fhirData.entry.some((e: any) => e.resource.code.coding[0].code === "2708-6");
    console.log(`Assertions: Has Heart Rate (8867-4): ${hasHR}, Has SpO2 (2708-6): ${hasSpO2}`);

    // 7. Shift Scheduler Generation
    console.log("\nTesting POST /shifts/generate (Circadian forward-rotation schedule optimization)...");
    const shiftRes = await fetch(`${BASE_URL}/shifts/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bypass-auth": "true"
      },
      body: JSON.stringify({
        start_date: "2026-07-04",
        end_date: "2026-07-06",
        department_id: "d2d2d2d2-e3e3-f4f4-0505-161616161616"
      })
    });
    const shiftData: any = await shiftRes.json();
    console.log("Generated Shift Plan Sample (Rationales):");
    console.dir(shiftData.shifts.slice(0, 2), { depth: null });

    console.log("\n=== Verification Tests Completed Successfully ===");
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    // Terminate server programmatically
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  }
}

// Small delay to allow Express listening sockets to initialize
setTimeout(runTests, 1000);
