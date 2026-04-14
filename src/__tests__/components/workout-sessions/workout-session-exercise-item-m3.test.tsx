import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SessionExerciseDTO } from "@/types";
import { WorkoutSessionExerciseItemM3 } from "@/components/workout-sessions/WorkoutSessionExerciseItemM3";

vi.mock("@/i18n/client", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("WorkoutSessionExerciseItemM3", () => {
  const baseExercise: SessionExerciseDTO = {
    id: "session-exercise-1",
    exercise_id: "exercise-1",
    exercise_order: 0,
    exercise_title_at_time: "Rozgrzewka B",
    exercise_type_at_time: "Warm-up",
    exercise_part_at_time: "Legs",
    exercise_is_unilateral_at_time: false,
    planned_sets: 2,
    planned_reps: 10,
    planned_duration_seconds: null,
    planned_rest_seconds: 30,
    planned_rest_after_series_seconds: null,
    actual_count_sets: 2,
    actual_sum_reps: 20,
    actual_duration_seconds: null,
    actual_rest_seconds: null,
    is_skipped: false,
    is_save_to_pr: true,
    achieved_pr_metrics: ["total_reps", "max_weight"],
    sets: [
      {
        id: "set-1",
        set_number: 1,
        side_number: null,
        reps: 8,
        duration_seconds: null,
        weight_kg: 10,
      },
      {
        id: "set-2",
        set_number: 2,
        side_number: null,
        reps: 10,
        duration_seconds: null,
        weight_kg: 12.5,
      },
    ],
    rest_in_between_seconds: 30,
    rest_after_series_seconds: null,
  };

  it("highlights best set rows for exercises saved to PR", () => {
    const { container } = render(
      <WorkoutSessionExerciseItemM3
        exercise={baseExercise}
        exerciseIndex={0}
        totalExercises={1}
      />,
    );

    expect(container.querySelector("tr.bg-primary\\/10")).not.toBeNull();
    expect(screen.getByText("12.5 kg")).toHaveClass(
      "font-bold",
      "text-[var(--m3-primary)]",
    );
  });

  it("does not highlight best set rows when exercise is excluded from PR", () => {
    const exercise = { ...baseExercise, is_save_to_pr: false };
    const { container } = render(
      <WorkoutSessionExerciseItemM3
        exercise={exercise}
        exerciseIndex={0}
        totalExercises={1}
      />,
    );

    expect(container.querySelector("tr.bg-primary\\/10")).toBeNull();
    expect(screen.getByText("12.5 kg")).not.toHaveClass(
      "text-[var(--m3-primary)]",
    );
  });

  it("does not highlight best set rows when session did not produce a new PR", () => {
    const exercise = { ...baseExercise, achieved_pr_metrics: [] };
    const { container } = render(
      <WorkoutSessionExerciseItemM3
        exercise={exercise}
        exerciseIndex={0}
        totalExercises={1}
      />,
    );

    expect(container.querySelector("tr.bg-primary\\/10")).toBeNull();
    expect(container.querySelector("td.font-normal.text-foreground")).not.toBeNull();
    expect(screen.getByText("12.5 kg")).not.toHaveClass(
      "text-[var(--m3-primary)]",
    );
  });
});
