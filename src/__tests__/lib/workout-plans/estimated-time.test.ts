import { describe, expect, it } from "vitest";
import {
  calculatePlanEstimatedTotalTimeSeconds,
  calculateScopeEstimatedTimeSeconds,
  getExerciseEstimatedTimeSeconds,
} from "@/lib/workout-plans/estimated-time";

describe("workout-plans estimated time", () => {
  it("prefers explicit estimated_set_time_seconds", () => {
    const result = getExerciseEstimatedTimeSeconds({
      estimated_set_time_seconds: 95,
      planned_sets: 3,
      planned_reps: 10,
      planned_rest_seconds: 30,
    });

    expect(result).toBe(95);
  });

  it("falls back to planned params calculation when explicit estimate is missing", () => {
    const result = getExerciseEstimatedTimeSeconds({
      planned_sets: 2,
      planned_duration_seconds: 20,
      planned_rest_seconds: 10,
      planned_rest_after_series_seconds: 15,
      exercise_is_unilateral: true,
    });

    // (20 * 2 * 2) + (2 - 1) * 10 + 15 = 105
    expect(result).toBe(105);
  });

  it("calculates scope estimate as sum(exercises) * repeatCount", () => {
    const result = calculateScopeEstimatedTimeSeconds(
      [
        { estimated_set_time_seconds: 60 },
        { estimated_set_time_seconds: 45 },
      ],
      3,
    );

    expect(result).toBe(315);
  });

  it("calculates plan total using scope multiplier once per scope block", () => {
    const result = calculatePlanEstimatedTotalTimeSeconds([
      { estimated_set_time_seconds: 30 },
      {
        scope_id: "scope-1",
        scope_repeat_count: 3,
        estimated_set_time_seconds: 40,
      },
      {
        scope_id: "scope-1",
        scope_repeat_count: 3,
        estimated_set_time_seconds: 20,
      },
    ]);

    // single: 30, scope: (40 + 20) * 3 = 180
    expect(result).toBe(210);
  });
});
