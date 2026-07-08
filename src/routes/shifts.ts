import { Router, Request, Response } from "express";
import { SqlHospitalRepository } from "../db";
import { SchedulingService } from "../application/services";
import { authMiddleware, requireRole } from "../middleware/auth";
import { broadcastHospitalEvent } from "../ws_events";

const router = Router();

const ALL_STAFF_ROLES = [
  "admin", "receptionist", "doctor", "nurse", "ward_boy", "lab_tech", "pharmacist", "medical_director", "staff", "dept_head"
];

// 1. Constraint-Based Shift Scheduler Generator
router.post(
  "/shifts/generate",
  authMiddleware,
  requireRole(["admin", "medical_director", "dept_head", "doctor", "nurse", "receptionist"]),
  async (req: Request, res: Response) => {
    const { start_date, end_date } = req.body;
    const hospitalId = req.user!.hospitalId;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: "Missing scheduling generation boundaries" });
    }

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const service = new SchedulingService(repo);
      const generatedShifts = await service.generateShiftSchedule(start_date, end_date);
      
      // Save shifts in database
      const savedShifts = await repo.addShifts(generatedShifts);

      // Log the event
      await repo.addAuditEvent({
        id: `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: "SHIFTS_GENERATED",
        actor_id: req.user!.userId,
        payload_after: savedShifts
      });

      // Broadcast WebSocket notification
      broadcastHospitalEvent(hospitalId, { type: "SHIFTS_GENERATED", shifts: savedShifts });

      return res.status(202).json({
        message: "Scheduler run complete. Shifts generated successfully.",
        shifts: savedShifts
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to generate staff schedule" });
    }
  }
);

// 2. Submit a Shift Swap Request
router.post(
  "/shifts/swaps",
  authMiddleware,
  requireRole(ALL_STAFF_ROLES),
  async (req: Request, res: Response) => {
    const { shift_id, target_staff_member_id, reason } = req.body;
    const hospitalId = req.user!.hospitalId;

    if (!shift_id || !target_staff_member_id) {
      return res.status(400).json({ error: "Missing required parameters for shift swap request" });
    }

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      
      // Log audit
      await repo.addAuditEvent({
        id: `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: "SHIFT_SWAP_REQUEST",
        actor_id: req.user!.userId,
        payload_after: { shift_id, target_staff_member_id, reason }
      });

      return res.status(201).json({
        message: "Shift swap request registered. Awaiting manager approval.",
        status: "pending_approval"
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to submit shift swap request" });
    }
  }
);

// 2.5 GET /shifts/my
router.get(
  "/shifts/my",
  authMiddleware,
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    const employeeId = req.user!.userId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const shifts = await repo.getShifts();
      const myShifts = shifts.filter(s => s.staff_member_id === employeeId);
      return res.status(200).json(myShifts);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch my shifts" });
    }
  }
);

// 3. GET /shifts
router.get(
  "/shifts",
  authMiddleware,
  requireRole(ALL_STAFF_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const shifts = await repo.getShifts();
      return res.status(200).json(shifts);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch shifts" });
    }
  }
);

export default router;
