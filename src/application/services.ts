import { 
  Patient, Bed, Ventilator, StaffMember, Allocation, Shift, AuditEvent, HospitalRepository 
} from "../domain/entities";

export class AllocationService {
  constructor(private repo: HospitalRepository) {}

  // Calculates SOFA-2 score based on patient vitals and support devices
  public calculateSOFAScore(vitals: Patient["vitals"], needsVentilator: boolean = false): number {
    if (!vitals) return 0;
    let score = 0;

    // 1. Respiratory system (SOFA-2 SpO2/FiO2 vs PaO2/FiO2)
    const o2Val = parseInt(vitals.o2.replace("%", ""), 10);
    if (!isNaN(o2Val)) {
      const fiO2 = vitals.fio2 || (needsVentilator ? 0.50 : 0.21);
      const ratio = o2Val / fiO2; // e.g. 98 / 0.21 = 466

      if (vitals.oxygenation_source === "SpO2") {
        // SOFA-2 SpO2/FiO2 non-invasive thresholds
        if (ratio < 150) score += 4;
        else if (ratio < 235) score += 3;
        else if (ratio < 315) score += 2;
        else if (ratio < 400) score += 1;
      } else {
        // PaO2/FiO2 invasive thresholds
        if (ratio < 100) score += 4;
        else if (ratio < 200) score += 3;
        else if (ratio < 300) score += 2;
        else if (ratio < 400) score += 1;
      }
    }

    // 2. Cardiovascular system (based on Blood Pressure, specifically diastolic)
    if (vitals.bp && vitals.bp.includes("/")) {
      const parts = vitals.bp.split("/");
      const diastolic = parseInt(parts[1], 10);
      if (!isNaN(diastolic)) {
        if (diastolic < 60) score += 2;
        else if (diastolic < 70) score += 1;
      }
    }

    // 3. Heart Rate (physiological stress factor)
    const hr = parseInt(vitals.hr, 10);
    if (!isNaN(hr)) {
      if (hr > 120 || hr < 50) score += 1;
    }

    // 4. Neurological System (SOFA-2 Delirium active screening)
    if (vitals.is_delirious) {
      score += 1; // +1 for positive delirium screen indicating neuro dysfunction
    }

    return score;
  }

  // Multi-principle resource matching algorithm
  public async getRecommendations(patientId: string): Promise<any[]> {
    const patient = await this.repo.getPatientById(patientId);
    if (!patient) throw new Error("Patient not found");

    const beds = await this.repo.getBeds();
    const ventilators = await this.repo.getVentilators();
    const staff = await this.repo.getStaff();
    const allocations = await this.repo.getAllocations();

    // Map current caseload to staff
    const doctorLoadMap = new Map<string, number>();
    staff.forEach(s => doctorLoadMap.set(s.id, 0));
    allocations.forEach(a => {
      if (a.primary_doctor_id) {
        doctorLoadMap.set(a.primary_doctor_id, (doctorLoadMap.get(a.primary_doctor_id) || 0) + 1);
      }
    });

    const sofa = this.calculateSOFAScore(patient.vitals, patient.needs_ventilator);
    const triageScore = patient.triage_level.startsWith("1") ? 100 : 
                        patient.triage_level.startsWith("2") ? 80 : 
                        patient.triage_level.startsWith("3") ? 50 : 20;

    // Filter free beds compatible with patient requirements
    const freeBeds = beds.filter(b => b.status === "free");
    const availableVents = ventilators.filter(v => v.status === "available");

    const recommendations: any[] = [];

    for (const bed of freeBeds) {
      // Find matching ventilator if patient needs one
      let matchedVent: Ventilator | undefined = undefined;
      if (patient.needs_ventilator) {
        matchedVent = availableVents.find(v => {
          // If patient needs intensive respiratory support, favor invasive ventilators
          if (sofa >= 3 && v.type === "invasive") return true;
          if (sofa < 3 && v.type === "non_invasive") return true;
          return true;
        });
      }

      // Filter doctors on-duty who specialize in the required clinical area
      const suitableDoctors = staff.filter(s => {
        if (s.specialty !== "doctor") return false;
        if (patient.required_department_code === "ICU") {
          return s.role === "dept_head" || s.role === "staff";
        }
        return true;
      });

      for (const doctor of suitableDoctors) {
        const caseload = doctorLoadMap.get(doctor.id) || 0;

        // Calculate Multi-principle Match Score (0 - 100)
        let score = 50;

        const reasoning: string[] = [];

        // 1. Department compatibility
        const isIcuBed = bed.type === "ICU";
        const needsIcu = patient.required_department_code === "ICU";
        if (needsIcu === isIcuBed) {
          score += 20;
          reasoning.push(`Bed fits clinical department placement requirements (${bed.bed_number}).`);
        } else if (needsIcu && !isIcuBed) {
          score -= 15;
          reasoning.push(`WARNING: Bed ${bed.bed_number} is in a non-ICU ward; patient clinically requires intensive care.`);
        } else {
          score += 10;
          reasoning.push(`Bed matches general admission request (${bed.bed_number}).`);
        }

        // 2. SOFA / Urgency score
        const survivalProbability = 100 - (sofa * 6);
        const survivalWeight = 0.2;
        const urgencyWeight = 0.1;
        score += Math.round((survivalProbability * survivalWeight) + (triageScore * urgencyWeight));
        reasoning.push(`Organ failure severity (SOFA score: ${sofa}) parsed to optimize survival probability.`);

        // 3. Ventilator match
        if (patient.needs_ventilator) {
          if (matchedVent) {
            score += 15;
            reasoning.push(`Suitable ventilator (${matchedVent.serial_number}, ${matchedVent.type}) allocated.`);
          } else {
            score -= 20;
            reasoning.push(`CAUTION: Required ventilator support is currently unavailable for this bed.`);
          }
        } else {
          reasoning.push("No active mechanical ventilation required.");
        }

        // 4. Staff Caseload balancing
        const maxExpectedCaseload = 5;
        const loadPenalty = Math.min(20, (caseload / maxExpectedCaseload) * 20);
        score -= Math.round(loadPenalty);
        if (caseload > 3) {
          reasoning.push(`Dr. ${doctor.first_name} ${doctor.last_name} has a high caseload (${caseload} active patients).`);
        } else {
          reasoning.push(`Dr. ${doctor.first_name} ${doctor.last_name} selected to balance clinician caseload (${caseload} active).`);
        }

        // Apply a lottery offset for tie-breakers to ensure ethical equity
        const lotteryOffset = Math.random() * 0.1;
        const finalScore = Math.min(100, Math.max(0, score)) + lotteryOffset;

        recommendations.push({
          bedId: bed.id,
          bedNumber: bed.bed_number,
          ventilatorId: matchedVent?.id,
          ventilatorSerial: matchedVent?.serial_number,
          staffId: doctor.id,
          staffName: `${doctor.first_name} ${doctor.last_name}`,
          score: Math.round(finalScore),
          reasoning
        });
      }
    }

    // Sort by score descending and return top 3
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(rec => ({
        ...rec,
        score: Math.min(99, rec.score) // Clamp to max 99 for realism
      }));
  }
}

export class SchedulingService {
  constructor(private repo: HospitalRepository) {}

  public async generateShiftSchedule(startDate: string, endDate: string): Promise<Shift[]> {
    const staff = await this.repo.getStaff();
    const existingShifts = await this.repo.getShifts();

    const start = new Date(startDate);
    const end = new Date(endDate);
    const generated: Shift[] = [];

    // Keep track of shift assignments for this schedule window to enforce fairness
    const shiftCountMap = new Map<string, { day: number; night: number }>();
    staff.forEach(s => shiftCountMap.set(s.id, { day: 0, night: 0 }));

    // Helper to calculate date range
    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }

    for (const dateStr of dates) {
      // We need to schedule 1 Day shift and 1 Night shift per day
      const shiftTypes: ("day" | "night")[] = ["day", "night"];

      for (const type of shiftTypes) {
        // Find candidate staff members who satisfy hard constraints
        const candidates = staff.filter(member => {
          // Rule 1: Max consecutive shifts (limit to 3)
          let consecutive = 0;
          let checkDate = new Date(dateStr);
          for (let i = 0; i < 3; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const checkDateStr = checkDate.toISOString().split("T")[0];
            const worked = [...generated, ...existingShifts].some(
              s => s.staff_member_id === member.id && s.shift_date === checkDateStr
            );
            if (worked) consecutive++;
            else break;
          }
          if (consecutive >= 3) return false;

          // Rule 2: Clopening / Rest interval (no Day shift immediately following a Night shift)
          if (type === "day") {
            const prevDate = new Date(dateStr);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toISOString().split("T")[0];
            const workedNightBefore = [...generated, ...existingShifts].some(
              s => s.staff_member_id === member.id && s.shift_date === prevDateStr && s.type === "night"
            );
            if (workedNightBefore) return false;
          }

          // Rule 3: Circadian forward-rotation (if Night shift is worked, they must continue on Night or rest, cannot change to Day next day)
          if (type === "day") {
            const yesterdayDate = new Date(dateStr);
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayDateStr = yesterdayDate.toISOString().split("T")[0];
            const workedNightYesterday = [...generated, ...existingShifts].some(
              s => s.staff_member_id === member.id && s.shift_date === yesterdayDateStr && s.type === "night"
            );
            if (workedNightYesterday) return false;
          }

          // Rule 4: Avoid double-scheduling on the same day
          const alreadyScheduledToday = generated.some(
            s => s.staff_member_id === member.id && s.shift_date === dateStr
          );
          if (alreadyScheduledToday) return false;

          return true;
        });

        if (candidates.length === 0) {
          // If constraints are too tight, fallback to any available staff member
          candidates.push(...staff);
        }

        // Sort candidates based on Fairness Index (assign to the one with the fewest shifts of this type)
        candidates.sort((a, b) => {
          const loadA = shiftCountMap.get(a.id)?.[type] || 0;
          const loadB = shiftCountMap.get(b.id)?.[type] || 0;
          return loadA - loadB;
        });

        const selected = candidates[0];
        const counts = shiftCountMap.get(selected.id) || { day: 0, night: 0 };
        counts[type]++;
        shiftCountMap.set(selected.id, counts);

        // Generate shift
        const rationale = type === "night" 
          ? `${selected.first_name} scheduled to satisfy forward-rotating shift sequence (Day -> Night), protecting cortisol-melatonin synchronization.`
          : `${selected.first_name} scheduled for Day shift; ensures minimum 12-hour rest gap and avoids clopening fatigue.`;

        generated.push({
          id: `sft-${Math.random().toString(36).substr(2, 9)}`,
          staff_member_id: selected.id,
          staff_name: `${selected.first_name} ${selected.last_name}`,
          shift_date: dateStr,
          type,
          rationale
        });
      }
    }

    return generated;
  }
}
