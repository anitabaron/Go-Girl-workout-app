import { describe, expect, it } from "vitest";

import {
  buildExerciseTitleAliases,
  buildExerciseTitleSignature,
  resolveExerciseLibraryMatch,
} from "@/lib/training/exercise-title-aliases";

describe("exercise title aliases", () => {
  it("builds aliases without parentheses and generic suffixes", () => {
    const aliases = buildExerciseTitleAliases('Tuck L-sit Hold (parallettes)');

    expect(aliases).toContain("tuck l sit hold");
    expect(aliases).toContain("tuck l sit");
  });

  it("builds a stripped signature for fuzzy matching", () => {
    expect(buildExerciseTitleSignature("90/90 Hip Flow")).toBe("90 90 hip");
    expect(buildExerciseTitleSignature("Wall Lean Handstand Hold")).toBe(
      "wall lean handstand",
    );
  });

  it("matches generated exercise titles to library variants", () => {
    const match = resolveExerciseLibraryMatch("Tuck L-sit Hold (parallettes)", [
      { id: "1", title: "Tuck L Sit" },
      { id: "2", title: "Hollow Body Hold" },
    ]);

    expect(match?.id).toBe("1");
  });

  it("matches by signature when generic words differ", () => {
    const match = resolveExerciseLibraryMatch("Scapular Wall Slides", [
      { id: "1", title: "Scapula Wall Slide" },
      { id: "2", title: "Dead Hang" },
    ]);

    expect(match?.id).toBe("1");
  });

  it("returns null when fuzzy match is ambiguous", () => {
    const match = resolveExerciseLibraryMatch("Hip Stretch", [
      { id: "1", title: "Hip Flexor Stretch" },
      { id: "2", title: "Hip Mobility" },
    ]);

    expect(match).toBeNull();
  });
});
