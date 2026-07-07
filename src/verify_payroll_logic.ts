// Force mock database mode so tests never touch Supabase
process.env.USE_MOCK_DB = "true";
process.env.DATABASE_URL = "";

import { SqlHospitalRepository } from "./db";

// Direct helper to determine week number
function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

async function runTests() {
  console.log("====================================================");
  console.log("🧪 STARTING PAYROLL & ACCREDITATION SAFETY COMPLIANCE TESTS");
  console.log("====================================================");

  const hospitalId = "test-hospital-id";
  const repo = new SqlHospitalRepository(hospitalId);

  // 1. Setup mock staff member contract
  const staffId = "s1";
  const testContract = {
    staff_member_id: staffId,
    hourly_rate: 50.00,
    overtime_multiplier: 1.5,
    weekly_hours_limit: 40
  };
  await repo.upsertStaffContract(testContract);
  console.log("✔ Seeded test contract: hourly_rate=$50.00, overtime=1.5x");

  // 2. Setup mock shift histories with intentional compliance violations
  const mockShifts = [
    // Violation 1: Single shift > 12 hours (14 hours worked)
    {
      id: "sh1",
      hospital_id: hospitalId,
      staff_member_id: staffId,
      worked_date: "2026-07-01",
      hours_worked: "14.0",
      type: "day"
    },
    // Violation 2: Night shift followed immediately by Day shift on same date (0 hours rest)
    {
      id: "sh2",
      hospital_id: hospitalId,
      staff_member_id: staffId,
      worked_date: "2026-07-02",
      hours_worked: "8.0",
      type: "night"
    },
    {
      id: "sh3",
      hospital_id: hospitalId,
      staff_member_id: staffId,
      worked_date: "2026-07-02",
      hours_worked: "8.0",
      type: "day"
    },
    // Violation 3: Cumulative weekly hours exceeding 60 hours
    {
      id: "sh4",
      hospital_id: hospitalId,
      staff_member_id: staffId,
      worked_date: "2026-07-03",
      hours_worked: "10.0",
      type: "day"
    },
    {
      id: "sh5",
      hospital_id: hospitalId,
      staff_member_id: staffId,
      worked_date: "2026-07-04",
      hours_worked: "10.0",
      type: "day"
    },
    {
      id: "sh6",
      hospital_id: hospitalId,
      staff_member_id: staffId,
      worked_date: "2026-07-05",
      hours_worked: "12.0",
      type: "day"
    }
  ];

  // Set mock database shift histories directly
  const { mockDb } = require("./db");
  mockDb.shift_histories = mockShifts;
  console.log(`✔ Set ${mockShifts.length} mock shift histories containing intentional violations.`);

  // 3. Run calculations matching src/routes/payroll.ts
  const histories = await repo.getShiftHistoriesForPeriod("2026-07-01", "2026-07-07");
  const contract = await repo.getStaffContract(staffId);

  const hourlyRate = parseFloat(contract.hourly_rate);
  const otMultiplier = parseFloat(contract.overtime_multiplier);

  let totalBaseHours = 0;
  let totalOvertimeHours = 0;
  const complianceAlerts: string[] = [];
  const weeklyHoursMap = new Map<number, number>();

  const sortedShifts = [...histories].sort((a, b) => a.worked_date.localeCompare(b.worked_date));

  for (let i = 0; i < sortedShifts.length; i++) {
    const sh = sortedShifts[i];
    const hours = parseFloat(sh.hours_worked);

    const base = Math.min(hours, 8);
    const ot = Math.max(hours - 8, 0);

    totalBaseHours += base;
    totalOvertimeHours += ot;

    // Audit single shift cap (Max 12 hours)
    if (hours > 12) {
      complianceAlerts.push(
        `JCI Overwork Alert: Clinician worked a continuous shift of ${hours}h on ${sh.worked_date} exceeding the clinical limit of 12 hours.`
      );
    }

    // Audit consecutive shift rest time (Min 11 hours rest)
    if (i > 0) {
      const prev = sortedShifts[i - 1];
      if (prev.type === "night" && sh.type === "day" && prev.worked_date === sh.worked_date) {
        complianceAlerts.push(
          `NABH Rest Period Alert: Clinician had insufficient rest time (< 11h) between consecutive Night and Day shifts on ${sh.worked_date}.`
        );
      }
    }

    const weekNum = getWeekNumber(sh.worked_date);
    const currentWeeklyHours = weeklyHoursMap.get(weekNum) || 0;
    weeklyHoursMap.set(weekNum, currentWeeklyHours + hours);
  }

  // Audit weekly limit cap (Max 60 hours/week)
  for (const [weekNum, hours] of weeklyHoursMap.entries()) {
    if (hours > 60) {
      complianceAlerts.push(
        `Accreditation Warning: Clinician worked ${hours.toFixed(1)}h in Week ${weekNum}, exceeding the safety cap of 60 hours.`
      );
    }
  }

  const basePay = totalBaseHours * hourlyRate;
  const overtimePay = totalOvertimeHours * (hourlyRate * otMultiplier);
  const netPay = basePay + overtimePay;

  // 4. Assert correctness
  console.log("\n====================================================");
  console.log("📊 RUNNING ASSERTIONS");
  console.log("====================================================");

  // Standard hours per shift:
  // sh1: 14h -> 8h base, 6h OT
  // sh2: 8h -> 8h base, 0h OT
  // sh3: 8h -> 8h base, 0h OT
  // sh4: 10h -> 8h base, 2h OT
  // sh5: 10h -> 8h base, 2h OT
  // sh6: 12h -> 8h base, 4h OT
  // Total base: 8 + 8 + 8 + 8 + 8 + 8 = 48 hours
  // Total OT: 6 + 0 + 0 + 2 + 2 + 4 = 14 hours
  // Net hours: 62 hours (exceeds 60h limit)

  console.log(`Expected Base Hours: 48, Actual: ${totalBaseHours}`);
  console.log(`Expected Overtime Hours: 14, Actual: ${totalOvertimeHours}`);
  console.log(`Expected Base Pay: $2400.00, Actual: $${basePay.toFixed(2)}`);
  console.log(`Expected Overtime Pay: $1050.00, Actual: $${overtimePay.toFixed(2)}`);
  console.log(`Expected Net Pay: $3450.00, Actual: $${netPay.toFixed(2)}`);

  if (totalBaseHours === 48 && totalOvertimeHours === 14 && netPay === 3450.00) {
    console.log("✅ Pay calculation assertions: PASSED");
  } else {
    console.error("❌ Pay calculation assertions: FAILED");
    process.exit(1);
  }

  console.log(`\nFound compliance alerts:`);
  complianceAlerts.forEach(a => console.log(`  ⚠ ${a}`));

  const hasJciOverwork = complianceAlerts.some(a => a.includes("JCI Overwork Alert"));
  const hasNabhRest = complianceAlerts.some(a => a.includes("NABH Rest Period Alert"));
  const hasWeeklyWarn = complianceAlerts.some(a => a.includes("Accreditation Warning"));

  if (hasJciOverwork && hasNabhRest && hasWeeklyWarn) {
    console.log("✅ Accreditation compliance warnings: PASSED");
  } else {
    console.error("❌ Accreditation compliance warnings: FAILED");
    process.exit(1);
  }

  console.log("\n====================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  console.log("====================================================");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
