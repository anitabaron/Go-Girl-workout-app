import { describe, expect, it } from "vitest";
import { validateWorkoutPlanFormBusinessRules } from "@/lib/validation/workout-plan-form";
import { validateWorkoutPlanBusinessRules } from "@/lib/validation/workout-plans";

describe("scope/single duplicate validation", () => {
  it("does not report single-duplicate when all duplicates belong to one scope in form rules", () => {
    const scopeId = "123e4567-e89b-12d3-a456-426614174000";

    const errors = validateWorkoutPlanFormBusinessRules([
      {
        exercise_id: "111e4567-e89b-12d3-a456-426614174000",
        section_type: "Main Workout",
        section_order: 3,
        scope_id: scopeId,
        in_scope_nr: null,
        scope_repeat_count: 2,
        planned_sets: null,
        planned_reps: null,
        planned_duration_seconds: null,
        planned_rest_seconds: null,
        planned_rest_after_series_seconds: null,
        estimated_set_time_seconds: null,
      },
      {
        exercise_id: "222e4567-e89b-12d3-a456-426614174000",
        section_type: "Main Workout",
        section_order: 3,
        scope_id: scopeId,
        in_scope_nr: 2,
        scope_repeat_count: 2,
        planned_sets: null,
        planned_reps: null,
        planned_duration_seconds: null,
        planned_rest_seconds: null,
        planned_rest_after_series_seconds: null,
        estimated_set_time_seconds: null,
      },
    ]);

    expect(
      errors.some((e) =>
        e.includes(
          "W slocie może być tylko jedno ćwiczenie bez zestawu",
        ),
      ),
    ).toBe(false);
  });

  it("does not report single-duplicate when all duplicates belong to one scope in API rules", () => {
    const scopeId = "123e4567-e89b-12d3-a456-426614174000";

    const errors = validateWorkoutPlanBusinessRules([
      {
        exercise_id: "111e4567-e89b-12d3-a456-426614174000",
        section_type: "Main Workout",
        section_order: 3,
        scope_id: scopeId,
        in_scope_nr: null,
      },
      {
        exercise_id: "222e4567-e89b-12d3-a456-426614174000",
        section_type: "Main Workout",
        section_order: 3,
        scope_id: scopeId,
        in_scope_nr: 2,
      },
    ]);

    expect(
      errors.some((e) =>
        e.includes(
          "W slocie może być tylko jedno ćwiczenie bez zestawu",
        ),
      ),
    ).toBe(false);
  });
});
