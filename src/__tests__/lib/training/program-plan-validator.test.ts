import { describe, expect, it } from "vitest";

import { validateProgramTemplates } from "@/lib/training/program-plan-validator";
import { repairProgramTemplates } from "@/lib/training/program-plan-repairer";
import { scoreProgramTemplatesRealism } from "@/lib/training/program-plan-realism";
import type { ProgramGeneratedPlanTemplate } from "@/types";

const invalidTemplate: ProgramGeneratedPlanTemplate = {
  template_key: "invalid-template",
  name: "Invalid Template",
  part: "Core",
  exercises: [
    {
      section_type: "Main Workout",
      section_order: 1,
      exercise_title: "Tuck L-sit Hold",
      exercise_type: "Main Workout",
      exercise_part: "Core",
      planned_sets: 4,
      planned_reps: null,
      planned_duration_seconds: 20,
      planned_rest_seconds: 60,
    },
  ],
};

describe("program plan validator", () => {
  it("detects missing warm-up and cool-down", () => {
    const result = validateProgramTemplates({
      templates: [invalidTemplate],
      readinessScore: 80,
    });

    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "MISSING_WARMUP")).toBe(true);
    expect(result.violations.some((v) => v.code === "MISSING_COOLDOWN")).toBe(true);
  });

  it("repairs missing sections and improves validation outcome", () => {
    const validation = validateProgramTemplates({
      templates: [invalidTemplate],
      readinessScore: 80,
    });
    const repaired = repairProgramTemplates({
      templates: [invalidTemplate],
      violations: validation.violations,
    });
    const postRepair = validateProgramTemplates({
      templates: repaired.templates,
      readinessScore: 80,
    });

    expect(repaired.repairLog.length).toBeGreaterThan(0);
    expect(postRepair.violations.some((v) => v.code === "MISSING_WARMUP")).toBe(false);
    expect(postRepair.violations.some((v) => v.code === "MISSING_COOLDOWN")).toBe(false);
  });

  it("lowers realism score for repaired or low-readiness plans", () => {
    const validation = validateProgramTemplates({
      templates: [invalidTemplate],
      readinessScore: 40,
    });
    const repaired = repairProgramTemplates({
      templates: [invalidTemplate],
      violations: validation.violations,
    });
    const realism = scoreProgramTemplatesRealism({
      templates: repaired.templates,
      violations: validation.violations,
      repairLog: repaired.repairLog,
      readinessScore: 40,
    });

    expect(realism.score).toBeLessThan(100);
    expect(realism.reasons.length).toBeGreaterThan(0);
  });
});
