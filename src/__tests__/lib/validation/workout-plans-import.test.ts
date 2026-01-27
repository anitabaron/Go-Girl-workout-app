import { describe, it, expect } from "vitest";
import { workoutPlanImportSchema } from "@/lib/validation/workout-plans";

describe("workoutPlanImportSchema", () => {
  it("powinien zaakceptować plan z exercise_id", () => {
    const valid = {
      name: "Test Plan",
      exercises: [
        {
          exercise_id: "123e4567-e89b-12d3-a456-426614174000",
          section_type: "Main Workout",
          section_order: 1,
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien zaakceptować plan z snapshot", () => {
    const valid = {
      name: "Test Plan",
      exercises: [
        {
          exercise_title: "Przysiady",
          exercise_type: "Main Workout",
          exercise_part: "Legs",
          section_type: "Main Workout",
          section_order: 1,
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien zaakceptować plan z snapshot bez exercise_type (opcjonalne)", () => {
    const valid = {
      name: "Test Plan",
      exercises: [
        {
          exercise_title: "Przysiady",
          exercise_part: "Legs",
          section_type: "Main Workout",
          section_order: 1,
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien odrzucić plan bez exercise_id i snapshot", () => {
    const invalid = {
      name: "Test Plan",
      exercises: [
        {
          section_type: "Main Workout",
          section_order: 1,
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(invalid)).toThrow();
  });

  it("powinien odrzucić plan z jednocześnie exercise_id i snapshot", () => {
    const invalid = {
      name: "Test Plan",
      exercises: [
        {
          exercise_id: "123e4567-e89b-12d3-a456-426614174000",
          exercise_title: "Przysiady",
          exercise_type: "Main Workout",
          exercise_part: "Legs",
          section_type: "Main Workout",
          section_order: 1,
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(invalid)).toThrow();
  });

  it("powinien zaakceptować plan z mieszanką exercise_id i snapshot", () => {
    const valid = {
      name: "Test Plan",
      exercises: [
        {
          exercise_id: "123e4567-e89b-12d3-a456-426614174000",
          section_type: "Warm-up",
          section_order: 1,
        },
        {
          exercise_title: "Przysiady",
          exercise_type: "Main Workout",
          exercise_part: "Legs",
          section_type: "Main Workout",
          section_order: 1,
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien odrzucić plan bez ćwiczeń", () => {
    const invalid = {
      name: "Test Plan",
      exercises: [],
    };
    expect(() => workoutPlanImportSchema.parse(invalid)).toThrow();
  });

  it("powinien odrzucić plan z duplikatami section_order w tej samej sekcji", () => {
    const invalid = {
      name: "Test Plan",
      exercises: [
        {
          exercise_id: "123e4567-e89b-12d3-a456-426614174000",
          section_type: "Main Workout",
          section_order: 1,
        },
        {
          exercise_id: "223e4567-e89b-12d3-a456-426614174000",
          section_type: "Main Workout",
          section_order: 1, // Duplikat
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(invalid)).toThrow();
  });
});
