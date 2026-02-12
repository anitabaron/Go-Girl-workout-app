import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExercisesList } from "@/components/exercises/exercises-list";
import type { ExerciseDTO } from "@/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/i18n/client", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/components/exercises/M3ExerciseCard", () => ({
  M3ExerciseCard: ({ exercise }: { exercise: ExerciseDTO }) => (
    <div data-testid={`exercise-card-${exercise.id}`}>{exercise.title}</div>
  ),
}));

vi.mock("@/components/layout/EmptyState", () => ({
  EmptyState: () => <div data-testid="exercises-empty-state">empty</div>,
}));

describe("ExercisesList", () => {
  const mockExercise: ExerciseDTO = {
    id: "exercise-1",
    title: "Przysiady",
    types: ["Main Workout"],
    parts: ["Legs"],
    type: "Main Workout",
    part: "Legs",
    is_unilateral: false,
    is_save_to_pr: false,
    series: 3,
    reps: 10,
    rest_in_between_seconds: 60,
    details: null,
    duration_seconds: null,
    estimated_set_time_seconds: null,
    level: null,
    rest_after_series_seconds: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  it("renders empty state when there are no exercises", () => {
    render(
      <ExercisesList
        initialExercises={[]}
        initialNextCursor={null}
        initialHasMore={false}
      />,
    );

    expect(screen.getByTestId("exercises-empty-state")).toBeInTheDocument();
  });

  it("renders exercise cards", () => {
    render(
      <ExercisesList
        initialExercises={[mockExercise]}
        initialNextCursor={null}
        initialHasMore={false}
      />,
    );

    expect(screen.getByTestId("exercise-card-exercise-1")).toBeInTheDocument();
    expect(screen.queryByTestId("exercises-empty-state")).not.toBeInTheDocument();
  });

  it("renders load more button when hasMore and cursor are set", () => {
    render(
      <ExercisesList
        initialExercises={[mockExercise]}
        initialNextCursor="cursor-1"
        initialHasMore={true}
      />,
    );

    expect(screen.getByRole("button", { name: "loadMoreAria" })).toBeVisible();
    expect(screen.getByText("loadMore")).toBeInTheDocument();
  });

  it("does not render load more button when cursor is missing", () => {
    render(
      <ExercisesList
        initialExercises={[mockExercise]}
        initialNextCursor={null}
        initialHasMore={true}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "loadMoreAria" }),
    ).not.toBeInTheDocument();
  });
});
