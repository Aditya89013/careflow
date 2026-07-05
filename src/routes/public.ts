import { Router, Request, Response } from "express";
import { SqlHospitalRepository, mockDb } from "../db";
import { broadcastHospitalEvent } from "../ws_events";

const router = Router();

// 1. Search/Browse Hospitals (Anonymized aggregated count indices)
router.get("/public/hospitals", async (req: Request, res: Response) => {
  try {
    const repo = new SqlHospitalRepository("8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d");
    const hospitals = await repo.getHospitals();

    const results = [];
    for (const hospital of hospitals) {
      const hospitalRepo = new SqlHospitalRepository(hospital.id);
      const beds = await hospitalRepo.getBeds();
      const vents = await hospitalRepo.getVentilators();

      const totalBeds = beds.length;
      const occupiedBeds = beds.filter(b => b.status === "occupied").length;
      const freeBeds = totalBeds - occupiedBeds;

      const totalVents = vents.length;
      const inUseVents = vents.filter(v => v.status === "in_use").length;
      const freeVents = totalVents - inUseVents;

      const bedDescriptor = freeBeds >= 10 ? "High Availability (10+)" : freeBeds > 0 ? `Limited Availability (${freeBeds})` : "At Capacity (0)";
      const ventDescriptor = freeVents >= 5 ? "High Availability (5+)" : freeVents > 0 ? `Limited Availability (${freeVents})` : "At Capacity (0)";

      let status = "Green";
      if (freeBeds === 0) {
        status = "Red";
      } else if (freeBeds < 3) {
        status = "Yellow";
      }

      results.push({
        id: hospital.id,
        name: hospital.name,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        address: hospital.address,
        distance_km: 1.5,
        capacity: {
          ICU_beds: bedDescriptor,
          ventilators: ventDescriptor,
          status
        },
        last_updated: new Date().toISOString()
      });
    }

    return res.status(200).json({ hospitals: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to query public hospital indices" });
  }
});

// 2. EMS / Public Incoming Notification Flow
router.post("/public/hospitals/:id/notify-arrival", async (req: Request, res: Response) => {
  const hospitalId = req.params.id;
  const { estimated_arrival_minutes, critical_needs, severity } = req.body;

  if (!estimated_arrival_minutes || !severity) {
    return res.status(400).json({ error: "Missing emergency notification parameters" });
  }

  try {
    const repo = new SqlHospitalRepository(hospitalId);

    // Save alert in audit logs
    const alertData = { 
      estimated_arrival_minutes, 
      critical_needs: Array.isArray(critical_needs) ? critical_needs : (critical_needs ? [critical_needs] : []), 
      severity 
    };
    await repo.addAuditEvent({
      id: `al-${Date.now()}`,
      created_at: new Date().toISOString(),
      action: "EMS_INCOMING_ALERT",
      payload_after: alertData
    });

    // Broadcast WebSocket notification
    const alert = {
      id: `al-${Date.now()}`,
      estimated_arrival_minutes: Number(estimated_arrival_minutes),
      critical_needs: alertData.critical_needs,
      severity,
      timestamp: new Date().toISOString(),
      incident_protocol: req.body.incident_protocol || "EMS Emergency"
    };
    
    broadcastHospitalEvent(hospitalId, {
      type: "EMS_INCOMING_ALERT",
      alert
    });

    return res.status(200).json({
      token: `arrival_ack_token_${Date.now()}`,
      status: "acknowledged",
      message: "Hospital intake queues alerted successfully."
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to dispatch incoming emergency notification" });
  }
});

export default router;
