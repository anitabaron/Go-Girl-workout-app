import { describe, expect, it } from "vitest";

import { summarizeTrainingState } from "@/services/training-state";

describe("summarizeTrainingState", () => {
  it("lowers readiness when external load, fatigue and pain flags are high", () => {
    const snapshot = summarizeTrainingState({
      external: [
        {
          started_at: "2026-03-09T10:00:00Z",
          duration_minutes: 90,
          intensity_rpe: 8,
          sport_type: "pole_dance",
        },
        {
          started_at: "2026-03-08T10:00:00Z",
          duration_minutes: 70,
          intensity_rpe: 7,
          sport_type: "pole_dance",
        },
        {
          started_at: "2026-03-07T10:00:00Z",
          duration_minutes: 40,
          intensity_rpe: 7,
          sport_type: "calisthenics",
        },
      ],
      notes: [
        {
          fatigue_level: 8,
          vitality_level: 3,
          note_text: "Za ciężko",
          created_at: "2026-03-09T10:00:00Z",
        },
      ],
      capabilities: [
        {
          id: "cap-1",
          movement_key: "handstand_support",
          comfort_max_reps: null,
          comfort_max_duration_seconds: 20,
          comfort_max_load_kg: null,
          best_recent_reps: null,
          best_recent_duration_seconds: 18,
          best_recent_load_kg: null,
          confidence_score: 55,
          current_level: "beginner",
          exercise_id: null,
          pain_flag: true,
          pain_notes: "bark",
          per_session_progression_cap_duration_seconds: 2,
          per_session_progression_cap_reps: null,
          weekly_progression_cap_percent: 15,
          updated_from: "manual",
          created_at: "2026-03-09T10:00:00Z",
          updated_at: "2026-03-09T10:00:00Z",
        },
      ],
    });

    expect(snapshot.external_workouts_last_7d).toBe(3);
    expect(snapshot.fatigue_notes_last_14d).toBe(1);
    expect(snapshot.readiness_score).toBeLessThan(70);
    expect(snapshot.readiness_drivers.length).toBeGreaterThan(0);
  });
});
