import { describe, expect, it } from "vitest";
import { workoutPlanUpdateSchema } from "@/lib/validation/workout-plans";

describe("workoutPlanUpdateSchema", () => {
  it("accepts adding a new scope with two exercises in edit payload", () => {
    const scopeId = "123e4567-e89b-12d3-a456-426614174000";
    const payload = {
      name: "Plan po edycji",
      exercises: [
        {
          id: "323e4567-e89b-12d3-a456-426614174000",
          exercise_id: "423e4567-e89b-12d3-a456-426614174000",
          section_type: "Main Workout",
          section_order: 1,
        },
        {
          exercise_id: "523e4567-e89b-12d3-a456-426614174000",
          section_type: "Main Workout",
          section_order: 4,
          scope_id: scopeId,
          in_scope_nr: 1,
          scope_repeat_count: 2,
        },
        {
          exercise_id: "623e4567-e89b-12d3-a456-426614174000",
          section_type: "Main Workout",
          section_order: 4,
          scope_id: scopeId,
          in_scope_nr: 2,
          scope_repeat_count: 2,
        },
      ],
    };

    expect(() => workoutPlanUpdateSchema.parse(payload)).not.toThrow();
  });
});
