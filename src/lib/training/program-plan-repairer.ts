import type { ProgramGeneratedPlanTemplate } from "@/types";
import type { ProgramPlanViolation } from "@/lib/training/program-plan-validator";

export type ProgramPlanRepairLog = {
  template_key: string;
  action: "ADD_WARMUP" | "ADD_COOLDOWN" | "DROP_EXTRA_MAIN_EXERCISES";
  reason: string;
};

export function repairProgramTemplates(params: {
  templates: ProgramGeneratedPlanTemplate[];
  violations: ProgramPlanViolation[];
}): {
  templates: ProgramGeneratedPlanTemplate[];
  repairLog: ProgramPlanRepairLog[];
} {
  const repairLog: ProgramPlanRepairLog[] = [];

  const repairedTemplates = params.templates.map((template) => {
    let exercises = [...template.exercises];
    const templateViolations = params.violations.filter(
      (violation) => violation.template_key === template.template_key,
    );

    if (templateViolations.some((violation) => violation.code === "MISSING_WARMUP")) {
      exercises = [
        {
          section_type: "Warm-up",
          section_order: 1,
          exercise_title: "AI Warm-up Activation",
          exercise_type: "Warm-up",
          exercise_part: template.part ?? "Core",
          planned_sets: 1,
          planned_duration_seconds: 240,
          planned_reps: null,
          planned_rest_seconds: 30,
          planned_rest_after_series_seconds: null,
          estimated_set_time_seconds: null,
          exercise_is_unilateral: null,
          exercise_details: "Automatycznie dodana rozgrzewka przez walidator.",
        },
        ...exercises,
      ];
      repairLog.push({
        template_key: template.template_key,
        action: "ADD_WARMUP",
        reason: "Dodano brakującą rozgrzewkę.",
      });
    }

    if (templateViolations.some((violation) => violation.code === "MISSING_COOLDOWN")) {
      exercises = [
        ...exercises,
        {
          section_type: "Cool-down",
          section_order: exercises.length + 1,
          exercise_title: "AI Cool-down Mobility",
          exercise_type: "Cool-down",
          exercise_part: template.part ?? "Core",
          planned_sets: 1,
          planned_duration_seconds: 180,
          planned_reps: null,
          planned_rest_seconds: 20,
          planned_rest_after_series_seconds: null,
          estimated_set_time_seconds: null,
          exercise_is_unilateral: null,
          exercise_details: "Automatycznie dodane schłodzenie przez walidator.",
        },
      ];
      repairLog.push({
        template_key: template.template_key,
        action: "ADD_COOLDOWN",
        reason: "Dodano brakujące schłodzenie.",
      });
    }

    const mainExercises = exercises.filter(
      (exercise) => exercise.section_type === "Main Workout",
    );
    if (mainExercises.length > 5) {
      let dropped = 0;
      exercises = exercises.filter((exercise) => {
        if (exercise.section_type !== "Main Workout") return true;
        if (dropped >= 5) return false;
        dropped += 1;
        return true;
      });
      repairLog.push({
        template_key: template.template_key,
        action: "DROP_EXTRA_MAIN_EXERCISES",
        reason: "Ograniczono liczbę ćwiczeń głównych do 5.",
      });
    }

    return {
      ...template,
      exercises: exercises.map((exercise, index) => ({
        ...exercise,
        section_order: index + 1,
      })),
    };
  });

  return { templates: repairedTemplates, repairLog };
}
