import { describe, expect, it } from "vitest";

import {
  buildDefaultExercisePrescriptionConfig,
  exercisePrescriptionConfigSchema,
  resolveExercisePrescriptionConfig,
} from "@/lib/training/exercise-prescription";

describe("exercise prescription config", () => {
  it("builds reps-based defaults from rep exercise data", () => {
    const config = buildDefaultExercisePrescriptionConfig({
      title: "Scapula Push-up",
      reps: 10,
      duration_seconds: null,
      series: 3,
      rest_in_between_seconds: 60,
    });

    expect(config.prescription_mode).toBe("reps_based");
    expect(config.min_reps).toBe(6);
    expect(config.max_reps).toBe(14);
    expect(config.progression_step_reps).toBe(2);
    expect(config.min_duration_seconds).toBeNull();
  });

  it("builds stricter isometric defaults for hold-based exercises", () => {
    const config = buildDefaultExercisePrescriptionConfig({
      title: "Tuck L-sit Hold",
      reps: null,
      duration_seconds: 20,
      series: 4,
      rest_in_between_seconds: 75,
    });

    expect(config.prescription_mode).toBe("duration_based_isometric");
    expect(config.max_duration_seconds).toBeLessThanOrEqual(45);
    expect(config.progression_step_duration_seconds).toBe(2);
    expect(config.min_reps).toBeNull();
  });

  it("rejects invalid mixed reps and duration config", () => {
    const result = exercisePrescriptionConfigSchema.safeParse({
      prescription_mode: "reps_based",
      min_sets: 2,
      max_sets: 4,
      min_reps: 6,
      max_reps: 12,
      min_duration_seconds: 10,
      max_duration_seconds: 20,
      min_rest_seconds: 30,
      max_rest_seconds: 90,
      progression_step_reps: 2,
      progression_step_duration_seconds: 2,
      progression_step_load_percent: 5,
    });

    expect(result.success).toBe(false);
  });

  it("falls back to safe derived defaults when provided config is invalid", () => {
    const config = resolveExercisePrescriptionConfig({
      title: "Wall Lean Handstand Hold",
      duration_seconds: 25,
      series: 5,
      rest_in_between_seconds: 75,
      prescription_config: {
        prescription_mode: "duration_based_isometric",
        min_sets: 5,
        max_sets: 2,
        min_reps: null,
        max_reps: null,
        min_duration_seconds: 15,
        max_duration_seconds: 60,
        min_rest_seconds: 30,
        max_rest_seconds: 90,
        progression_step_reps: null,
        progression_step_duration_seconds: 2,
        progression_step_load_percent: 5,
      },
    });

    expect(config.max_sets).toBeGreaterThanOrEqual(config.min_sets);
    expect(config.max_duration_seconds).toBeLessThanOrEqual(45);
  });
});
