import { describe, it, expect } from "vitest";
import { workoutSessionImportSchema } from "@/lib/validation/workout-sessions";

describe("workoutSessionImportSchema", () => {
  it("powinien zaakceptować sesję z exercise_id", () => {
    const valid = {
      name: "Trening siłowy",
      exercises: [
        {
          exercise_id: "123e4567-e89b-12d3-a456-426614174000",
          planned_sets: 3,
          planned_reps: 10,
        },
      ],
    };
    expect(() => workoutSessionImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien zaakceptować sesję z match_by_name", () => {
    const valid = {
      name: "Trening siłowy",
      exercises: [
        {
          match_by_name: "Romanian Deadlift",
          planned_sets: 4,
          planned_reps: 10,
        },
      ],
    };
    expect(() => workoutSessionImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien zaakceptować sesję z nowym ćwiczeniem (exercise_title snapshot)", () => {
    const valid = {
      name: "Trening siłowy",
      part: "Full Body",
      exercises: [
        {
          exercise_title: "Air Bike",
          exercise_part: "Cardio",
          exercise_type: "Warm-up",
          planned_sets: 3,
          planned_duration_seconds: 30,
        },
      ],
    };
    expect(() => workoutSessionImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien odrzucić ćwiczenie bez exercise_id, match_by_name i exercise_title", () => {
    const invalid = {
      name: "Trening siłowy",
      exercises: [
        {
          planned_sets: 3,
          planned_reps: 10,
        },
      ],
    };
    expect(() => workoutSessionImportSchema.parse(invalid)).toThrow();
  });

  it("powinien odrzucić jednoczesne podanie exercise_id i match_by_name", () => {
    const invalid = {
      name: "Trening siłowy",
      exercises: [
        {
          exercise_id: "123e4567-e89b-12d3-a456-426614174000",
          match_by_name: "Dips",
        },
      ],
    };
    expect(() => workoutSessionImportSchema.parse(invalid)).toThrow();
  });

  it("powinien odrzucić pustą listę ćwiczeń", () => {
    const invalid = {
      name: "Trening siłowy",
      exercises: [],
    };
    expect(() => workoutSessionImportSchema.parse(invalid)).toThrow();
  });

  it("powinien odrzucić brak nazwy sesji", () => {
    const invalid = {
      exercises: [
        {
          exercise_title: "Air Bike",
          planned_sets: 3,
          planned_duration_seconds: 30,
        },
      ],
    };
    expect(() => workoutSessionImportSchema.parse(invalid)).toThrow();
  });

  it("powinien zaakceptować part 'Cardio' i 'Full Body' po rozszerzeniu enuma", () => {
    const valid = {
      name: "Trening całego ciała",
      part: "Full Body",
      exercises: [
        {
          exercise_title: "Air Bike",
          exercise_part: "Cardio",
          planned_sets: 3,
          planned_duration_seconds: 30,
        },
      ],
    };
    expect(() => workoutSessionImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien zignorować (zaakceptować) pola scope_id/in_scope_nr z importu planu bez ich egzekwowania", () => {
    const valid = {
      name: "Trening siłowy",
      exercises: [
        {
          exercise_title: "Air Bike",
          exercise_part: "Cardio",
          planned_sets: 3,
          planned_duration_seconds: 30,
          scope_id: "123e4567-e89b-12d3-a456-426614174000",
          in_scope_nr: 1,
          scope_repeat_count: 2,
        },
      ],
    };
    expect(() => workoutSessionImportSchema.parse(valid)).not.toThrow();
  });
});
