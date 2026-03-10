import { describe, expect, it } from "vitest";

import { inferMovementKey } from "@/lib/training/movement-keys";

describe("inferMovementKey", () => {
  it("maps hold-based core drills to core_hold", () => {
    expect(inferMovementKey({ title: "Tuck L-sit Hold", part: "Core" })).toBe(
      "core_hold",
    );
  });

  it("maps handstand drills to handstand_support", () => {
    expect(
      inferMovementKey({ title: "Wall Lean Handstand Hold", part: "Arms" }),
    ).toBe("handstand_support");
  });

  it("falls back to general_strength when no heuristic matches", () => {
    expect(inferMovementKey({ title: "Custom Drill", part: "Core" })).toBe(
      "general_strength",
    );
  });
});
