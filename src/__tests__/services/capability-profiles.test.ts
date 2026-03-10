import { describe, expect, it } from "vitest";

import {
  deriveCapabilityProfileFromSessionResult,
  detectCapabilityFeedbackSignal,
} from "@/services/capability-profiles";

describe("detectCapabilityFeedbackSignal", () => {
  it("flags pain and hard-block notes for adjustment", () => {
    const result = detectCapabilityFeedbackSignal(
      "Nie dam rady, bark boli przy handstand hold",
      8,
      3,
    );

    expect(result.shouldAdjust).toBe(true);
    expect(result.looksLikePain).toBe(true);
    expect(result.looksLikeHardBlock).toBe(true);
    expect(result.highFatigue).toBe(true);
    expect(result.lowVitality).toBe(true);
    expect(result.movementKey).toBe("handstand_support");
  });

  it("ignores neutral notes without fatigue signal", () => {
    const result = detectCapabilityFeedbackSignal(
      "Dobra sesja, technika była ok",
      4,
      7,
    );

    expect(result.shouldAdjust).toBe(false);
    expect(result.looksLikePain).toBe(false);
  });

  it("derives session result adjustment toward handstand capability", () => {
    const result = deriveCapabilityProfileFromSessionResult(null, {
      movementKey: "handstand_support",
      plannedSets: 4,
      plannedReps: null,
      plannedDurationSeconds: 20,
      actualSetCount: 4,
      bestSetReps: null,
      bestSetDurationSeconds: 25,
      actualReps: null,
      actualDurationSeconds: 25,
      isSkipped: false,
    });

    expect(result?.movement_key).toBe("handstand_support");
    expect(result?.comfort_max_duration_seconds).toBe(25);
    expect(result?.best_recent_duration_seconds).toBe(25);
    expect(result?.confidence_score).toBe(66);
  });

  it("uses best set reps instead of total reps and downscales after underperformance", () => {
    const result = deriveCapabilityProfileFromSessionResult(
      {
        id: "cap-1",
        movement_key: "vertical_pull",
        exercise_id: null,
        current_level: null,
        comfort_max_reps: 8,
        comfort_max_duration_seconds: null,
        comfort_max_load_kg: null,
        best_recent_reps: 8,
        best_recent_duration_seconds: null,
        best_recent_load_kg: null,
        weekly_progression_cap_percent: 15,
        per_session_progression_cap_reps: 1,
        per_session_progression_cap_duration_seconds: 2,
        confidence_score: 70,
        pain_flag: false,
        pain_notes: null,
        updated_from: "manual",
        created_at: "2026-03-10T10:00:00.000Z",
        updated_at: "2026-03-10T10:00:00.000Z",
      },
      {
        movementKey: "vertical_pull",
        plannedSets: 4,
        plannedReps: 8,
        plannedDurationSeconds: null,
        actualSetCount: 2,
        bestSetReps: 5,
        bestSetDurationSeconds: null,
        actualReps: 10,
        actualDurationSeconds: null,
        isSkipped: false,
      },
    );

    expect(result?.comfort_max_reps).toBe(5);
    expect(result?.best_recent_reps).toBe(8);
    expect(result?.confidence_score).toBe(62);
    expect(result?.weekly_progression_cap_percent).toBe(12);
  });
});
