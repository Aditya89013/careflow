import { Router, Request, Response } from "express";
import { SqlHospitalRepository } from "../db";
import { authMiddleware } from "../middleware/auth";
import { callOpenRouterWithFallback } from "./chatbot";

const router = Router();
const DEFAULT_HOSPITAL_ID = "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";

// ──────────────────────────────────────────────────────────────────
// 1. Find & Rank Hospitals for Emergency
// ──────────────────────────────────────────────────────────────────
router.post("/emergency/find-hospitals", async (req: Request, res: Response) => {
  const { symptoms, ward_required } = req.body;

  if (!symptoms || !ward_required) {
    return res.status(400).json({ error: "Symptoms and ward requirements are required" });
  }

  try {
    const mainRepo = new SqlHospitalRepository(DEFAULT_HOSPITAL_ID);
    const hospitals = await mainRepo.getHospitals();

    // Query resource capacities for each hospital
    const hospitalCapacities = [];
    for (const hosp of hospitals) {
      const repo = new SqlHospitalRepository(hosp.id);
      const beds = await repo.getBeds();
      const ventilators = await repo.getVentilators();

      const totalBeds = beds.filter(b => b.type.toLowerCase() === ward_required.toLowerCase()).length;
      const freeBeds = beds.filter(b => b.type.toLowerCase() === ward_required.toLowerCase() && b.status === "free").length;
      
      const totalVents = ventilators.length;
      const availableVents = ventilators.filter(v => v.status === "available").length;

      hospitalCapacities.push({
        id: hosp.id,
        name: hosp.name,
        address: hosp.address,
        phone: hosp.contact_phone,
        total_beds: totalBeds,
        free_beds: freeBeds,
        total_vents: totalVents,
        available_vents: availableVents
      });
    }

    // Call AI to rank/recommend hospitals
    const systemPrompt = `You are CareFlow AI, an emergency dispatch coordinator. 
Your task is to rank a list of hospitals based on a patient's emergency symptoms, ward requirement, and each hospital's real-time resource capacity.
Rank the hospitals putting the most suitable ones at the top. Considerations:
- Urgency: High-risk symptoms require hospitals with active ICU beds and available ventilators.
- Resource Availability: Prioritize hospitals with available/free beds of the requested type. If general beds are full, suggest alternative wards.
- Reasoning: Provide a short, 1-2 sentence clinical explanation of the ranking.

You MUST respond ONLY with a valid JSON object matching this structure:
{
  "rankings": [
    { "hospital_id": "string-uuid", "rank": 1, "reason": "string" }
  ]
}`;

    const userPrompt = `Patient Symptoms: "${symptoms}"
Requested Ward Type: "${ward_required}"
Available Hospitals Capacities:
${JSON.stringify(hospitalCapacities, null, 2)}`;

    let rankings: any[] = [];
    try {
      const data = await callOpenRouterWithFallback({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });

      const responseText = data.choices?.[0]?.message?.content;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        rankings = parsed.rankings || parsed.preferred_hospitals || [];
      }
    } catch (aiErr: any) {
      console.warn("AI ranking failed, falling back to local capacity sorting:", aiErr.message);
      // Fallback: simple sorting by free beds descending
      rankings = hospitalCapacities
        .sort((a, b) => b.free_beds - a.free_beds)
        .map((h, i) => ({
          hospital_id: h.id,
          rank: i + 1,
          reason: `Recommended based on local sorting: ${h.free_beds} free ${ward_required} beds available.`
        }));
    }

    // Map AI rankings back to full hospital details
    const rankedHospitals = rankings.map((rankItem: any) => {
      const hospDetails = hospitalCapacities.find(h => h.id === rankItem.hospital_id);
      return {
        ...hospDetails,
        rank: rankItem.rank,
        reason: rankItem.reason
      };
    }).filter(h => h.id) // Filter out any mismatched items
      .sort((a, b) => a.rank - b.rank);

    return res.status(200).json(rankedHospitals);
  } catch (err: any) {
    console.error("Emergency hospital finder error:", err);
    return res.status(500).json({ error: "Failed to rank hospitals for emergency", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 2. Request Emergency Care
// ──────────────────────────────────────────────────────────────────
router.post("/emergency/request", async (req: Request, res: Response) => {
  const { hospital_id, patient_name, phone, symptoms, ward_required } = req.body;

  if (!hospital_id || !patient_name || !phone || !symptoms || !ward_required) {
    return res.status(400).json({ error: "Missing required emergency request fields" });
  }

  try {
    const repo = new SqlHospitalRepository(hospital_id);
    const request = await repo.addEmergencyRequest({
      patient_name,
      phone,
      symptoms,
      ward_required
    });

    return res.status(201).json(request);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to submit emergency request", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 3. List Emergency Requests (Hospital Panel)
// ──────────────────────────────────────────────────────────────────
router.get("/emergency/list", authMiddleware, async (req: Request, res: Response) => {
  const hospitalId = req.user!.hospitalId;
  try {
    const repo = new SqlHospitalRepository(hospitalId);
    const list = await repo.getEmergencyRequests();
    return res.status(200).json(list);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to retrieve emergency requests", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 4. Update Request Status (Triage Accept/Reject)
// ──────────────────────────────────────────────────────────────────
router.post("/emergency/update-status", authMiddleware, async (req: Request, res: Response) => {
  const { id, status } = req.body;
  const hospitalId = req.user!.hospitalId;

  if (!id || !status) {
    return res.status(400).json({ error: "ID and status are required" });
  }

  try {
    const repo = new SqlHospitalRepository(hospitalId);
    await repo.updateEmergencyRequestStatus(id, status);
    return res.status(200).json({ message: "Emergency request status updated successfully" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update status", details: err.message });
  }
});

export default router;
