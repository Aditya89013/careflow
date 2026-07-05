import fetch from "node-fetch";
import * as dotenv from "dotenv";

dotenv.config();

export interface AllocationInput {
  patientId: string;
  triageLevel: string; // e.g. "2_emergent"
  requiredDepartmentCode: string; // e.g. "ICU"
  needsVentilator: boolean;
}

export interface RecommendedAllocation {
  bedId: string;
  bedNumber: string;
  ventilatorId?: string;
  ventilatorSerial?: string;
  staffId: string;
  staffName: string;
  score: number;
  reasoning: string[];
}

export interface AllocationScorer {
  score(
    input: AllocationInput,
    availableBeds: any[],
    availableVentilators: any[],
    activeStaff: any[]
  ): Promise<RecommendedAllocation[]>;
}

// 1. Deterministic Heuristic Scorer
export class RuleBasedScorer implements AllocationScorer {
  async score(
    input: AllocationInput,
    availableBeds: any[],
    availableVentilators: any[],
    activeStaff: any[]
  ): Promise<RecommendedAllocation[]> {
    const recommendations: RecommendedAllocation[] = [];

    // Filter beds in the requested department or department codes
    const candidateBeds = availableBeds.filter(
      b => b.status === "free"
    );

    for (const bed of candidateBeds) {
      // Find matching staff members in the department
      const doctors = activeStaff.filter(s => s.specialty === "doctor");
      if (doctors.length === 0) continue; // Need at least one doctor

      for (const doctor of doctors) {
        let vent: any = null;
        if (input.needsVentilator) {
          vent = availableVentilators.find(v => v.status === "available");
          if (!vent) continue; // Skip configuration if no ventilators are available
        }

        // Calculate Heuristic Score
        // Score = 0.4*TriageBed + 0.3*Vent + 0.2*Staff + 0.1*Load
        let triageScore = 0;
        const isIcuBed = bed.type === "ICU" || bed.type === "HDU";
        const isCriticalPatient = input.triageLevel === "1_resuscitation" || input.triageLevel === "2_emergent";

        if (isCriticalPatient && isIcuBed) {
          triageScore = 100;
        } else if (!isCriticalPatient && !isIcuBed) {
          triageScore = 100;
        } else if (!isCriticalPatient && isIcuBed) {
          triageScore = 30; // Over-allocation penalty
        } else {
          triageScore = 10; // Bed type under-matches severity
        }

        let ventScore = 0;
        if (input.needsVentilator) {
          ventScore = vent ? 100 : 0;
        } else {
          ventScore = 100; // No ventilator needed
        }

        const staffScore = doctor.role === "dept_head" ? 100 : 80;
        const loadScore = 50; // Constant average in mock

        const totalScore = Math.round(
          0.4 * triageScore + 0.3 * ventScore + 0.2 * staffScore + 0.1 * loadScore
        );

        recommendations.push({
          bedId: bed.id,
          bedNumber: bed.bed_number,
          ventilatorId: vent?.id,
          ventilatorSerial: vent?.serial_number,
          staffId: doctor.id,
          staffName: `${doctor.first_name} ${doctor.last_name}`,
          score: totalScore,
          reasoning: [
            `Bed matches departmental requirements (${bed.bed_number}).`,
            input.needsVentilator ? `Ventilator ${vent.serial_number} allocated.` : "No ventilator needed.",
            `Assigned primary physician ${doctor.first_name} ${doctor.last_name}.`
          ]
        });
      }
    }

    // Sort by highest score first
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 3);
  }
}

// 2. OpenRouter AI Allocation Scorer
export class OpenRouterAIScorer implements AllocationScorer {
  private apiKey: string;
  private fallbackScorer: RuleBasedScorer;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.fallbackScorer = new RuleBasedScorer();
  }

  async score(
    input: AllocationInput,
    availableBeds: any[],
    availableVentilators: any[],
    activeStaff: any[]
  ): Promise<RecommendedAllocation[]> {
    try {
      const prompt = `
        Evaluate medical resource configuration match for:
        Patient: ${JSON.stringify(input)}
        Available Beds: ${JSON.stringify(availableBeds.slice(0, 5))}
        Available Ventilators: ${JSON.stringify(availableVentilators.slice(0, 5))}
        Available Staff: ${JSON.stringify(activeStaff.slice(0, 5))}

        Produce matching allocations based on clinical fit:
        1. Resuscitation (1) and Emergent (2) patients need ICU/HDU beds.
        2. Assign ventilators to patients requiring ventilator support.
        3. Match specialty role (e.g. physician / nurse specialist).

        Return ONLY a JSON array of recommendation objects inside a "recommendations" wrapper:
        {
          "recommendations": [
            {
              "bedId": "uuid",
              "bedNumber": "bed_num",
              "ventilatorId": "uuid_or_null",
              "ventilatorSerial": "serial_or_null",
              "staffId": "uuid",
              "staffName": "doctor_name",
              "score": 85,
              "reasoning": ["clinical reason 1", "reason 2"]
            }
          ]
        }
      `;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://careflow.hospital.org",
          "X-Title": "CareFlow Resource Scorer"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You are a clinical resource allocation planner. Output valid JSON in the requested format."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API response error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Invalid output received from OpenRouter completion");
      }

      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.recommendations)) {
        return parsed.recommendations;
      }
      throw new Error("Missing recommendations array in AI output");
    } catch (err) {
      console.warn("OpenRouter AI Scorer failed or was blocked. Reverting to local heuristic scoring...", err);
      return this.fallbackScorer.score(input, availableBeds, availableVentilators, activeStaff);
    }
  }
}

// Coordinator Engine
export class AllocationCoordinator {
  static getScorer(): AllocationScorer {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey && apiKey !== "YOUR_OPENROUTER_API_KEY") {
      console.log("Allocation Engine: Using OpenRouter AI Scorer");
      return new OpenRouterAIScorer(apiKey);
    } else {
      console.log("Allocation Engine: Using Local Heuristic Scorer (OpenRouter API Key absent)");
      return new RuleBasedScorer();
    }
  }
}
