import type { ProgramGeneratedPlanTemplate } from "@/types";

export type ProgramPlanViolation = {
  code:
    | "MISSING_WARMUP"
    | "MISSING_COOLDOWN"
    | "TOO_MANY_MAIN_EXERCISES"
    | "INVALID_MAIN_EXERCISE_METRIC"
    | "DUPLICATE_MAIN_EXERCISE"
    | "READINESS_CONFLICT";
  severity: "error" | "warning";
  template_key: string;
  exercise_title?: string;
  message: string;
};

export type ProgramPlanValidationResult = {
  valid: boolean;
  violations: ProgramPlanViolation[];
};

export function validateProgramTemplates(params: {
  templates: ProgramGeneratedPlanTemplate[];
  readinessScore: number;
}): ProgramPlanValidationResult {
  const violations: ProgramPlanViolation[] = [];

  for (const template of params.templates) {
    const warmupCount = template.exercises.filter(
      (exercise) => exercise.section_type === "Warm-up",
    ).length;
    const cooldownCount = template.exercises.filter(
      (exercise) => exercise.section_type === "Cool-down",
    ).length;
    const mainExercises = template.exercises.filter(
      (exercise) => exercise.section_type === "Main Workout",
    );

    if (warmupCount === 0) {
      violations.push({
        code: "MISSING_WARMUP",
        severity: "error",
        template_key: template.template_key,
        message: "Szablon nie zawiera rozgrzewki.",
      });
    }

    if (cooldownCount === 0) {
      violations.push({
        code: "MISSING_COOLDOWN",
        severity: "error",
        template_key: template.template_key,
        message: "Szablon nie zawiera schłodzenia.",
      });
    }

    if (mainExercises.length > 5) {
      violations.push({
        code: "TOO_MANY_MAIN_EXERCISES",
        severity: "warning",
        template_key: template.template_key,
        message: "Szablon zawiera zbyt wiele ćwiczeń głównych.",
      });
    }

    const seenTitles = new Set<string>();
    for (const exercise of mainExercises) {
      const titleKey = exercise.exercise_title.trim().toLowerCase();
      if (seenTitles.has(titleKey)) {
        violations.push({
          code: "DUPLICATE_MAIN_EXERCISE",
          severity: "warning",
          template_key: template.template_key,
          exercise_title: exercise.exercise_title,
          message: "To samo ćwiczenie główne pojawia się wielokrotnie w jednym szablonie.",
        });
      }
      seenTitles.add(titleKey);

      const hasReps = typeof exercise.planned_reps === "number";
      const hasDuration = typeof exercise.planned_duration_seconds === "number";
      if (hasReps === hasDuration) {
        violations.push({
          code: "INVALID_MAIN_EXERCISE_METRIC",
          severity: "error",
          template_key: template.template_key,
          exercise_title: exercise.exercise_title,
          message:
            "Ćwiczenie główne musi mieć dokładnie jeden tryb prescription: reps albo duration.",
        });
      }
    }

    if (params.readinessScore < 45 && mainExercises.length >= 4) {
      violations.push({
        code: "READINESS_CONFLICT",
        severity: "warning",
        template_key: template.template_key,
        message:
          "Przy niskiej gotowości szablon powinien być prostszy lub bardziej zachowawczy.",
      });
    }
  }

  return {
    valid: violations.every((violation) => violation.severity !== "error"),
    violations,
  };
}
