import type { ProgramGeneratedPlanTemplate } from "@/types";
import type { ProgramPlanViolation } from "@/lib/training/program-plan-validator";
import type { ProgramPlanRepairLog } from "@/lib/training/program-plan-repairer";

export type ProgramPlanRealismScore = {
  score: number;
  reasons: string[];
};

export function scoreProgramTemplatesRealism(params: {
  templates: ProgramGeneratedPlanTemplate[];
  violations: ProgramPlanViolation[];
  repairLog: ProgramPlanRepairLog[];
  readinessScore: number;
}): ProgramPlanRealismScore {
  let score = 100;
  const reasons: string[] = [];

  const errorCount = params.violations.filter(
    (violation) => violation.severity === "error",
  ).length;
  const warningCount = params.violations.filter(
    (violation) => violation.severity === "warning",
  ).length;

  if (errorCount > 0) {
    score -= errorCount * 15;
    reasons.push(`Wykryto ${errorCount} krytyczne naruszenia walidatora.`);
  }
  if (warningCount > 0) {
    score -= warningCount * 5;
    reasons.push(`Wykryto ${warningCount} ostrzeżeń planu.`);
  }
  if (params.repairLog.length > 0) {
    score -= Math.min(15, params.repairLog.length * 3);
    reasons.push("Plan wymagał automatycznych napraw.");
  }
  if (params.readinessScore < 60) {
    score -= 10;
    reasons.push("Start programu jest obciążony niską gotowością.");
  }

  const mainExerciseCounts = params.templates.map(
    (template) =>
      template.exercises.filter((exercise) => exercise.section_type === "Main Workout")
        .length,
  );
  if (mainExerciseCounts.some((count) => count >= 5)) {
    score -= 5;
    reasons.push("Co najmniej jeden szablon jest blisko górnego limitu objętości.");
  }

  return {
    score: Math.max(0, score),
    reasons,
  };
}
