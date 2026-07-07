import { Router, Request, Response } from "express";
import { SqlHospitalRepository } from "../db";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const DEFAULT_HOSPITAL_ID = "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";

// Helper to determine week number from a date string (simple ISO-8601 week number calculation)
function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ──────────────────────────────────────────────────────────────────
// 1. GET /payroll/summary
// Calculates shifts, overtime, and checks accreditation constraints
// ──────────────────────────────────────────────────────────────────
router.get("/payroll/summary", authMiddleware, async (req: Request, res: Response) => {
  const { start_date, end_date } = req.query;
  const hospitalId = req.user?.hospitalId || DEFAULT_HOSPITAL_ID;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: "start_date and end_date queries are required (YYYY-MM-DD)" });
  }

  try {
    const repo = new SqlHospitalRepository(hospitalId);
    
    // Fetch all active staff members
    const staffMembers = await repo.getStaff();
    
    // Fetch all shift histories for the target period
    const histories = await repo.getShiftHistoriesForPeriod(start_date as string, end_date as string);

    const summaries: any[] = [];
    let totalGrossPayout = 0;

    for (const staff of staffMembers) {
      // 1. Get contract pay configuration or use defaults
      let contract = await repo.getStaffContract(staff.id);
      if (!contract) {
        contract = {
          hourly_rate: 25.00,
          overtime_multiplier: 1.5,
          weekly_hours_limit: 40
        };
      }

      const hourlyRate = parseFloat(contract.hourly_rate);
      const otMultiplier = parseFloat(contract.overtime_multiplier);

      // 2. Filter shift histories for this staff member
      const staffHistories = histories.filter(h => h.staff_member_id === staff.id);

      let totalBaseHours = 0;
      let totalOvertimeHours = 0;
      const complianceAlerts: string[] = [];

      // Group hours worked by week to audit weekly limit checks
      const weeklyHoursMap = new Map<number, number>();

      // Sort shifts by worked_date to audit consecutive rest periods
      const sortedShifts = [...staffHistories].sort((a, b) => a.worked_date.localeCompare(b.worked_date));

      for (let i = 0; i < sortedShifts.length; i++) {
        const sh = sortedShifts[i];
        const hours = parseFloat(sh.hours_worked);

        // Standard 8 hour shift calculation
        const base = Math.min(hours, 8);
        const ot = Math.max(hours - 8, 0);

        totalBaseHours += base;
        totalOvertimeHours += ot;

        // --- NABH/JCI Accreditation Auditing Constraints ---
        
        // Constraint 1: Single shift length check (Max 12 hours)
        if (hours > 12) {
          complianceAlerts.push(
            `JCI Overwork Alert: Clinician worked a continuous shift of ${hours}h on ${sh.worked_date} exceeding the clinical limit of 12 hours.`
          );
        }

        // Constraint 2: Consecutive shifts rest period (Min 11 hours rest)
        // If they worked night shift on day 1 (ends day 2 morning) and work day shift on day 2
        if (i > 0) {
          const prev = sortedShifts[i - 1];
          if (prev.type === "night" && sh.type === "day" && prev.worked_date === sh.worked_date) {
            complianceAlerts.push(
              `NABH Rest Period Alert: Clinician had insufficient rest time (< 11h) between consecutive Night and Day shifts on ${sh.worked_date}.`
            );
          }
        }

        // Accumulate weekly hours
        const weekNum = getWeekNumber(sh.worked_date);
        const currentWeeklyHours = weeklyHoursMap.get(weekNum) || 0;
        weeklyHoursMap.set(weekNum, currentWeeklyHours + hours);
      }

      // Constraint 3: Weekly cumulative hours audit (Max 60 hours/week)
      for (const [weekNum, hours] of weeklyHoursMap.entries()) {
        if (hours > 60) {
          complianceAlerts.push(
            `Accreditation Warning: Clinician worked ${hours.toFixed(1)}h in Week ${weekNum}, exceeding the safety cap of 60 hours.`
          );
        }
      }

      // 3. Compute pay breakdowns
      const basePay = totalBaseHours * hourlyRate;
      const overtimePay = totalOvertimeHours * (hourlyRate * otMultiplier);
      const grossPay = basePay + overtimePay;

      totalGrossPayout += grossPay;

      summaries.push({
        staff_member_id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: staff.role,
        hourly_rate: hourlyRate,
        overtime_multiplier: otMultiplier,
        base_hours: totalBaseHours,
        overtime_hours: totalOvertimeHours,
        base_pay: basePay,
        overtime_pay: overtimePay,
        net_pay: grossPay,
        compliance_alerts: complianceAlerts,
        is_compliant: complianceAlerts.length === 0
      });
    }

    return res.status(200).json({
      start_date,
      end_date,
      total_gross_payout: totalGrossPayout,
      employees: summaries
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to calculate payroll summary", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 2. POST /payroll/process
// Saves a payroll run and commits payslips to history
// ──────────────────────────────────────────────────────────────────
router.post("/payroll/process", authMiddleware, async (req: Request, res: Response) => {
  const { start_date, end_date, total_amount, records } = req.body;
  const hospitalId = req.user?.hospitalId || DEFAULT_HOSPITAL_ID;

  if (!start_date || !end_date || total_amount === undefined || !records) {
    return res.status(400).json({ error: "Missing required payroll processing fields" });
  }

  try {
    const repo = new SqlHospitalRepository(hospitalId);
    
    const run = await repo.savePayrollRun({
      start_date,
      end_date,
      total_amount
    }, records);

    return res.status(201).json({
      message: "Payroll run processed and payslips committed successfully",
      run
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to process payroll run", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 3. GET /payroll/history
// Retrieves all completed payroll runs
// ──────────────────────────────────────────────────────────────────
router.get("/payroll/history", authMiddleware, async (req: Request, res: Response) => {
  const hospitalId = req.user?.hospitalId || DEFAULT_HOSPITAL_ID;

  try {
    const repo = new SqlHospitalRepository(hospitalId);
    const history = await repo.getPayrollHistory();
    return res.status(200).json(history);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch payroll history", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 4. POST /payroll/contract
// Updates or creates an hourly contract rate for an employee
// ──────────────────────────────────────────────────────────────────
router.post("/payroll/contract", authMiddleware, async (req: Request, res: Response) => {
  const { staff_member_id, hourly_rate, overtime_multiplier, weekly_hours_limit } = req.body;
  const hospitalId = req.user?.hospitalId || DEFAULT_HOSPITAL_ID;

  if (!staff_member_id || hourly_rate === undefined) {
    return res.status(400).json({ error: "staff_member_id and hourly_rate are required" });
  }

  try {
    const repo = new SqlHospitalRepository(hospitalId);
    await repo.upsertStaffContract({
      staff_member_id,
      hourly_rate,
      overtime_multiplier,
      weekly_hours_limit
    });
    return res.status(200).json({ message: "Staff contract updated successfully" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update staff contract", details: err.message });
  }
});

export default router;
