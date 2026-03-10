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
      actualReps: null,
      actualDurationSeconds: 25,
      isSkipped: false,
    });

    expect(result?.movement_key).toBe("handstand_support");
    expect(result?.comfort_max_duration_seconds).toBe(25);
    expect(result?.best_recent_duration_seconds).toBe(25);
    expect(result?.confidence_score).toBe(64);
  });
});
