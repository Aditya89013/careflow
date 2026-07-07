import { Router, Request, Response } from "express";
import * as https from "https";
import fetch from "node-fetch";
import { SqlHospitalRepository } from "../db";
import { AllocationService, SchedulingService } from "../application/services";
import { authMiddleware } from "../middleware/auth";
import { broadcastHospitalEvent } from "../ws_events";
const router = Router();
// ──────────────────────────────────────────────────────────────────
// OpenRouter Multiple Keys Fallback (Secure Environment Variables)
// ──────────────────────────────────────────────────────────────────
const OPENROUTER_KEYS = [
  process.env.OPENROUTER_KEY_1,
  process.env.OPENROUTER_KEY_2,
  process.env.OPENROUTER_KEY_3,
  process.env.OPENROUTER_KEY_4
].filter(Boolean) as string[];
let currentKeyIndex = 0;
export async function callOpenRouterWithFallback(payload: any): Promise<any> {
  if (OPENROUTER_KEYS.length === 0) {
    throw new Error("No OpenRouter API keys configured in environment variables.");
  }
  let attempts = 0;
  while (attempts < OPENROUTER_KEYS.length) {
    const activeKey = OPENROUTER_KEYS[currentKeyIndex];
    try {
      console.log(`[CareFlow AI] Trying OpenRouter Key Index: ${currentKeyIndex}`);
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${activeKey}`,
          "Content-Type":  "application/json",
          "HTTP-Referer":  "http://localhost:3000",
          "X-Title":       "CareFlow Command Hub"
        },
        body: JSON.stringify(payload)
      });
      if (orResponse.ok) {
        return await orResponse.json();
      }
      
      console.warn(`[CareFlow AI] Key Index ${currentKeyIndex} failed with status: ${orResponse.status}`);
    } catch (err) {
      console.warn(`[CareFlow AI] Key Index ${currentKeyIndex} network error.`);
    }
    
    // Switch to next key on failure
    currentKeyIndex = (currentKeyIndex + 1) % OPENROUTER_KEYS.length;
    attempts++;
  }
  throw new Error("All configured OpenRouter API keys have failed or exhausted.");
}
// ──────────────────────────────────────────────────────────────────
// Agentic Tool Schema (OpenRouter / OpenAI function-calling format)
// ──────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "admitPatient",
      description: "Registers and triages a new patient in the hospital database. Accepts clinical vitals and returns the created patient record with a generated ID.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Patient first name" },
          last_name:  { type: "string", description: "Patient last name" },
          date_of_birth: { type: "string", description: "YYYY-MM-DD" },
          triage_level: {
            type: "string",
            enum: ["1_resuscitation", "2_emergent", "3_urgent", "4_less_urgent"],
            description: "Emergency Severity Index triage level"
          },
          required_department_code: {
            type: "string",
            enum: ["ICU", "general"],
            description: "Requested ward for patient placement"
          },
          needs_ventilator: { type: "boolean", description: "Patient requires mechanical ventilation" },
          hr:  { type: "string", description: "Heart rate, e.g. '95'" },
          bp:  { type: "string", description: "Blood pressure, e.g. '120/80'" },
          o2:  { type: "string", description: "Oxygen saturation %, e.g. '94%'" },
          oxygenation_source: { type: "string", enum: ["SpO2", "PaO2"], description: "Vitals O2 measurement method" },
          is_delirious: { type: "boolean", description: "Positive delirium screen" }
        },
        required: ["triage_level", "required_department_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getAllocationRecommendations",
      description: "Runs the SOFA-2 multi-principle matching algorithm for a waiting patient and returns up to 3 ranked bed-ventilator-clinician recommendations.",
      parameters: {
        type: "object",
        properties: {
          patient_id: { type: "string", description: "Patient ID. Use 'last_patient' to select the most recently admitted patient." }
        },
        required: ["patient_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "confirmAllocation",
      description: "Locks in a bed assignment and primary physician for a patient. Updates bed/ventilator status and broadcasts a live WebSocket event.",
      parameters: {
        type: "object",
        properties: {
          patient_id:       { type: "string" },
          bed_id:           { type: "string" },
          ventilator_id:    { type: "string", description: "Optional – include if ventilator is required" },
          primary_doctor_id: { type: "string", description: "Staff member ID for the primary physician" },
          is_override:      { type: "boolean", description: "True when bypassing the recommended placement" },
          override_reason:  { type: "string",  description: "Mandatory if is_override is true" }
        },
        required: ["patient_id", "bed_id", "primary_doctor_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generateShifts",
      description: "Builds an optimised shift schedule protecting circadian forward rotation for a date range. Persists shifts in the database and broadcasts the event.",
      parameters: {
        type: "object",
        properties: {
          start_date:    { type: "string", description: "YYYY-MM-DD start of window" },
          end_date:      { type: "string", description: "YYYY-MM-DD end of window" }
        },
        required: ["start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getHospitalStatus",
      description: "Returns a real-time snapshot of bed capacity, active patients queue size, and registered clinician count.",
      parameters: { type: "object", properties: {} }
    }
  }
];
// ──────────────────────────────────────────────────────────────────
// POST /api/chatbot/chat
// ──────────────────────────────────────────────────────────────────
router.post("/chatbot/chat", authMiddleware, async (req: Request, res: Response) => {
  const { message, history } = req.body as { message: string; history: { role: string; content: string }[] };
  const hospitalId = req.user!.hospitalId;
  if (!message?.trim()) {
    return res.status(400).json({ error: "Message content is required" });
  }
  try {
    const repo              = new SqlHospitalRepository(hospitalId);
    const allocationService = new AllocationService(repo);
    const schedulingService = new SchedulingService(repo);
    const systemPrompt = `You are CareFlow AI Guide — a fully agentic enterprise clinical operations assistant embedded in a hospital management platform.
    
You have access to execution tools that interface directly with the database:
• admitPatient
• getAllocationRecommendations
• confirmAllocation
• generateShifts
• getHospitalStatus
Always prioritize tool execution if the intent matches. Respond in brief, technical, professional clinical summaries. Never use introductory fluff.`;
    let toolName   = "";
    let toolResult: any = null;
    const messages = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message }
    ];
    // Main Multi-Key Fallback Execution
    const data = await callOpenRouterWithFallback({
      model: "google/gemini-2.5-flash",
      messages,
      tools: TOOLS,
      tool_choice: "auto"
    });
    const choice    = data.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;
    if (toolCalls?.length) {
      const call = toolCalls[0];
      const args = JSON.parse(call.function.arguments);
      toolName   = call.function.name;
      
      // Execute local service layer
      toolResult = await dispatch(toolName, args, repo, allocationService, schedulingService, hospitalId);
      const followMessages = [
        ...messages,
        { role: "assistant", content: null, tool_calls: toolCalls },
        { role: "tool", tool_call_id: call.id, content: JSON.stringify(toolResult) }
      ];
      const followData = await callOpenRouterWithFallback({
        model: "google/gemini-2.5-flash",
        messages: followMessages
      });
      const text = followData.choices?.[0]?.message?.content;
      if (text) return res.status(200).json({ reply: text, tool_used: toolName, tool_result: toolResult });
    } else {
      const text = choice?.message?.content;
      if (text) return res.status(200).json({ reply: text });
    }
    if (!toolName) {
      const lower = message.toLowerCase();
      if (/\b(admit|intake|register|check.?in)\b/.test(lower)) toolName = "admitPatient";
      else if (/\b(recommend|match|find bed|sof(a)?)\b/.test(lower)) toolName = "getAllocationRecommendations";
      else if (/\b(allocat|confirm|assign|place)\b/.test(lower)) toolName = "confirmAllocation";
      else if (/\b(schedule|shift|roster)\b/.test(lower)) toolName = "generateShifts";
      else if (/\b(status|stats|capacity|overview|census)\b/.test(lower)) toolName = "getHospitalStatus";
      if (toolName) {
        toolResult = await dispatch(toolName, {}, repo, allocationService, schedulingService, hospitalId).catch(() => null);
      }
    }
    if (toolName && toolResult) {
      const reply = buildReply(toolName, toolResult);
      return res.status(200).json({ reply, tool_used: toolName, tool_result: toolResult });
    }
    return res.status(200).json({
      reply: `**CareFlow Operation Command Center Actions Matrix**

| Operational Target | Execution Parameter Context Phrase |
| :--- | :--- |
| 🏥 Patient Admission & Triage | *"Admit critical patient John Doe to ICU with ventilator"* |
| 🔬 SOFA-2 Allocation Matcher | *"Get SOFA-2 recommendations for patient p-123"* |
| ✅ Roster/Bed Finalization | *"Assign patient p-123 to bed b2"* |
| 📅 Forward Circadian Rostering | *"Generate shifts for next 3 days"* |
| 📊 Real-Time Census State | *"Show current capacity and queue"* | `

    });
  } catch (err: any) {
    console.error("[CareFlow AI] Error processing request:", err.message);
    return res.status(500).json({ error: "Failed to process chat system routine", details: err.message });
  }
});

async function dispatch(
  name: string,
  args: Record<string, any>,
  repo: SqlHospitalRepository,
  allocationService: AllocationService,
  schedulingService: SchedulingService,
  hospitalId: string
): Promise<any> {
  console.log(`[CareFlow Agent] Executing tool "${name}"`, args);

  switch (name) {
    // ── admitPatient ──────────────────────────────────────────────
    case "admitPatient": {
      const patient = await repo.addPatient({
        id:                       `p-${Date.now()}`,
        first_name:               args.first_name ?? "EMS",
        last_name:                args.last_name  ?? "Intake",
        date_of_birth:            args.date_of_birth ?? "1990-01-01",
        triage_level:             args.triage_level  ?? "2_emergent",
        required_department_code: args.required_department_code ?? "general",
        needs_ventilator:         Boolean(args.needs_ventilator),
        admitted_at:              new Date().toISOString(),
        vitals: {
          hr:                args.hr   ?? "80",
          bp:                args.bp   ?? "120/80",
          o2:                args.o2   ?? "98%",
          oxygenation_source: args.oxygenation_source ?? "SpO2",
          is_delirious:      Boolean(args.is_delirious)
        }
      });

      await repo.addAuditEvent({
        id:         `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action:     "PATIENT_INTAKE",
        payload_after: patient
      });

      broadcastHospitalEvent(hospitalId, { type: "PATIENT_INTAKE", patient });
      return patient;
    }

    // ── getAllocationRecommendations ──────────────────────────────
    case "getAllocationRecommendations": {
      let patientId = args.patient_id as string;

      if (patientId === "last_patient") {
        const patients = await repo.getPatients();
        patientId = patients[patients.length - 1]?.id ?? "";
      }

      if (!patientId) throw new Error("No patients in the system yet.");

      const recommendations = await allocationService.getRecommendations(patientId);
      return { patient_id: patientId, recommendations };
    }

    // ── confirmAllocation ─────────────────────────────────────────
    case "confirmAllocation": {
      let patientId = args.patient_id as string;

      if (patientId === "last_patient") {
        const patients = await repo.getPatients();
        patientId = patients[patients.length - 1]?.id ?? "";
      }

      if (!patientId) throw new Error("No patients in the system yet.");

      if (args.is_override && !args.override_reason) {
        throw new Error("override_reason is required when is_override is true.");
      }

      const allocation = await repo.addAllocation({
        id:                `a-${Date.now()}`,
        patient_id:        patientId,
        bed_id:            args.bed_id,
        ventilator_id:     args.ventilator_id,
        primary_doctor_id: args.primary_doctor_id,
        is_override:       Boolean(args.is_override),
        override_reason:   args.override_reason ?? undefined,
        allocated_at:      new Date().toISOString()
      });

      await repo.addAuditEvent({
        id:         `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action:     args.is_override ? "MANUAL_OVERRIDE_ALLOCATION" : "RECOMMENDED_ALLOCATION",
        payload_after: allocation
      });

      broadcastHospitalEvent(hospitalId, { type: "RESOURCE_ALLOCATION", allocation });
      return allocation;
    }

    // ── generateShifts ────────────────────────────────────────────
    case "generateShifts": {
      const startDate = args.start_date as string;
      const endDate   = args.end_date   as string;

      const generated = await schedulingService.generateShiftSchedule(startDate, endDate);
      const saved     = await repo.addShifts(generated);

      await repo.addAuditEvent({
        id:         `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action:     "SCHEDULE_GENERATED",
        payload_after: { count: saved.length, start_date: startDate, end_date: endDate }
      });

      broadcastHospitalEvent(hospitalId, { type: "SCHEDULE_GENERATED", count: saved.length });
      return { start_date: startDate, end_date: endDate, shifts: saved };
    }

    // ── getHospitalStatus ─────────────────────────────────────────
    case "getHospitalStatus": {
      const [patients, beds, ventilators, staff] = await Promise.all([
        repo.getPatients(),
        repo.getBeds(),
        repo.getVentilators(),
        repo.getStaff()
      ]);

      return {
        total_beds:      beds.length,
        occupied_beds:   beds.filter(b => b.status === "occupied").length,
        free_beds:       beds.filter(b => b.status === "free").length,
        total_vents:     ventilators.length,
        available_vents: ventilators.filter(v => v.status === "available").length,
        total_patients:  patients.length,
        waiting_patients: patients.filter(p => !p.status || p.status === "admitted" || p.status === "waiting").length,
        allocated_patients: patients.filter(p => p.status === "allocated").length,
        staff_count:     staff.length
      };
    }

    default:
      throw new Error(`Unknown tool: "${name}"`);
  }
}

// ──────────────────────────────────────────────────────────────────
// Rich markdown response builder for local-fallback replies
// ──────────────────────────────────────────────────────────────────
function buildReply(toolName: string, result: any): string {
  switch (toolName) {
    case "admitPatient":
      return `✅ **Patient Admitted**

| Field | Value |
|-------|-------|
| **ID** | \`${result.id}\` |
| **Name** | ${result.first_name} ${result.last_name} |
| **Triage Level** | ${result.triage_level} |
| **Department** | ${result.required_department_code} |
| **Ventilator needed** | ${result.needs_ventilator ? "Yes" : "No"} |
| **Admitted at** | ${new Date(result.admitted_at).toLocaleString()} |
| **Vitals** | HR: ${result.vitals?.hr} bpm · BP: ${result.vitals?.bp} mmHg · O₂: ${result.vitals?.o2} (${result.vitals?.oxygenation_source}) |

The patient has been registered and is queued for resource allocation.`;

    case "getAllocationRecommendations": {
      const recs = result.recommendations ?? [];
      if (!recs.length) return "⚠️ No matching beds found. All beds may be occupied or no suitable clinicians are available.";

      const rows = recs
        .map((r: any, i: number) =>
          `**${i + 1}. Bed ${r.bedNumber}** (Score: ${r.score}%) · Dr. ${r.staffName}\n${r.reasoning.map((ln: string) => `   - ${ln}`).join("\n")}`
        )
        .join("\n\n");

      return `🔬 **SOFA-2 Allocation Recommendations** for patient \`${result.patient_id}\`\n\n${rows}\n\n*Use "confirm allocation" with your chosen bed and physician to proceed.*`;
    }

    case "confirmAllocation":
      return `✅ **Allocation Confirmed**

| Field | Value |
|-------|-------|
| **Allocation ID** | \`${result.id}\` |
| **Patient** | \`${result.patient_id}\` |
| **Bed** | \`${result.bed_id}\` |
| **Physician** | \`${result.primary_doctor_id}\` |
| **Override** | ${result.is_override ? `Yes — ${result.override_reason}` : "No (recommended)"} |

Bed status set to **occupied**. WebSocket event broadcast to all connected dashboards.`;

    case "generateShifts":
      return `📅 **Shift Schedule Generated**

| Field | Value |
|-------|-------|
| **Date Range** | ${result.start_date} → ${result.end_date} |
| **Total Shifts** | ${result.shifts.length} |

All shifts follow circadian **forward rotation** (Day → Night), enforcing minimum 12-hour rest windows and preventing clopening fatigue.`;

    case "getHospitalStatus":
      return `📊 **Hospital Real-Time Status**

| Metric | Value |
|--------|-------|
| 🛏 Total Beds | ${result.total_beds} |
| 🟢 Free Beds | ${result.free_beds} |
| 🔴 Occupied Beds | ${result.occupied_beds} |
| 🫁 Available Ventilators | ${result.available_vents} / ${result.total_vents} |
| 🧑‍⚕️ Registered Staff | ${result.staff_count} |
| ⏳ Waiting Patients | ${result.waiting_patients} |
| ✅ Allocated Patients | ${result.allocated_patients} |`;

    default:
      return JSON.stringify(result, null, 2);
  }
}

export default router;
