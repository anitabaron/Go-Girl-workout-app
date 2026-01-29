import { describe, it, expect } from "vitest";
import {
  formatSessionDuration,
  getExerciseCountText,
  getExerciseNames,
  getExerciseCount,
} from "@/lib/utils/session-format";
import type { SessionDetailDTO, SessionSummaryDTO } from "@/types";

describe("formatSessionDuration", () => {
  it("returns 'X min z Y min' for in_progress session with estimated time", () => {
    const session: SessionSummaryDTO = {
      id: "1",
      status: "in_progress",
      started_at: "2025-01-01T10:00:00Z",
      completed_at: null,
      active_duration_seconds: 300,
      estimated_total_time_seconds: 1800,
    } as SessionSummaryDTO;
    expect(formatSessionDuration(session)).toBe("5 min z 30 min");
  });

  it("returns 'X min' for in_progress session without estimated time", () => {
    const session: SessionSummaryDTO = {
      id: "1",
      status: "in_progress",
      started_at: "2025-01-01T10:00:00Z",
      completed_at: null,
      active_duration_seconds: 120,
    } as SessionSummaryDTO;
    expect(formatSessionDuration(session)).toBe("2 min");
  });

  it("returns 'Xh Ymin' for completed session over 1 hour", () => {
    const session: SessionSummaryDTO = {
      id: "1",
      status: "completed",
      started_at: "2025-01-01T10:00:00Z",
      completed_at: "2025-01-01T11:30:00Z",
    } as SessionSummaryDTO;
    expect(formatSessionDuration(session)).toBe("1h 30min");
  });

  it("returns 'Ymin' for completed session under 1 hour", () => {
    const session: SessionSummaryDTO = {
      id: "1",
      status: "completed",
      started_at: "2025-01-01T10:00:00Z",
      completed_at: "2025-01-01T10:45:00Z",
    } as SessionSummaryDTO;
    expect(formatSessionDuration(session)).toBe("45min");
  });
});

describe("getExerciseCountText", () => {
  it("returns empty string for 0", () => {
    expect(getExerciseCountText(0)).toBe("");
  });

  it("returns 'ćwiczenie' for 1", () => {
    expect(getExerciseCountText(1)).toBe("ćwiczenie");
  });

  it("returns 'ćwiczenia' for 2-4", () => {
    expect(getExerciseCountText(2)).toBe("ćwiczenia");
    expect(getExerciseCountText(3)).toBe("ćwiczenia");
    expect(getExerciseCountText(4)).toBe("ćwiczenia");
  });

  it("returns 'ćwiczeń' for 5+", () => {
    expect(getExerciseCountText(5)).toBe("ćwiczeń");
    expect(getExerciseCountText(10)).toBe("ćwiczeń");
  });
});

describe("getExerciseNames", () => {
  it("returns exercise_names when available", () => {
    const session = {
      exercise_names: ["Przysiady", "Pompki"],
      exercises: [],
    } as unknown as SessionDetailDTO;
    expect(getExerciseNames(session)).toEqual(["Przysiady", "Pompki"]);
  });

  it("extracts names from exercises when exercise_names is empty", () => {
    const session = {
      exercise_names: [],
      exercises: [
        { exercise_title_at_time: "Przysiady" },
        { exercise_title_at_time: "Pompki" },
      ],
    } as unknown as SessionDetailDTO;
    expect(getExerciseNames(session)).toEqual(["Przysiady", "Pompki"]);
  });

  it("filters out null/undefined titles", () => {
    const session = {
      exercise_names: [],
      exercises: [
        { exercise_title_at_time: "Przysiady" },
        { exercise_title_at_time: null },
        { exercise_title_at_time: undefined },
      ],
    } as unknown as SessionDetailDTO;
    expect(getExerciseNames(session)).toEqual(["Przysiady"]);
  });
});

describe("getExerciseCount", () => {
  it("returns exercise_count when available and > 0", () => {
    const session = {
      exercise_count: 5,
      exercises: [{}, {}],
    } as unknown as SessionDetailDTO;
    expect(getExerciseCount(session)).toBe(5);
  });

  it("returns exercises.length when exercise_count is 0", () => {
    const session = {
      exercise_count: 0,
      exercises: [{}, {}, {}],
    } as unknown as SessionDetailDTO;
    expect(getExerciseCount(session)).toBe(3);
  });

  it("returns exercises.length when exercise_count is undefined", () => {
    const session = {
      exercises: [{}, {}],
    } as unknown as SessionDetailDTO;
    expect(getExerciseCount(session)).toBe(2);
  });
});
