import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExercisesList } from "@/components/exercises/exercises-list";
import type { ExerciseDTO } from "@/types";

/**
 * Testy jednostkowe dla komponentu ExercisesList
 *
 * Priorytet: ŚREDNI
 * Testuje logikę warunkową renderowania (3 różne stany)
 * Server Component - wymaga specjalnego podejścia do testowania
 */

// Mock komponentów potomnych
vi.mock("@/components/exercises/exercise-card", () => ({
  ExerciseCard: ({ exercise }: { exercise: ExerciseDTO }) => (
    <div data-testid={`exercise-card-${exercise.id}`}>{exercise.title}</div>
  ),
}));

vi.mock("@/components/shared/empty-state", () => ({
  EmptyState: () => (
    <div data-testid="exercises-empty-state">
      Nie masz jeszcze żadnych ćwiczeń
    </div>
  ),
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

  const mockExercise2: ExerciseDTO = {
    id: "exercise-2",
    title: "Pompki",
    types: ["Main Workout"],
    parts: ["Chest"],
    type: "Main Workout",
    part: "Chest",
    is_unilateral: false,
    series: 3,
    reps: 15,
    rest_in_between_seconds: 45,
    details: null,
    duration_seconds: null,
    estimated_set_time_seconds: null,
    level: null,
    rest_after_series_seconds: null,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  };

  beforeEach(() => {
    // Wycisz console.log w komponencie
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("renderowanie pustej listy", () => {
    it("should render EmptyState when exercises array is empty and no active filters", () => {
      // Arrange
      const props = {
        exercises: [],
        hasMore: false,
        hasActiveFilters: false,
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(screen.getByTestId("exercises-empty-state")).toBeInTheDocument();
      expect(
        screen.getByText(/Nie masz jeszcze żadnych ćwiczeń/),
      ).toBeInTheDocument();
    });

    it("should render filter message when exercises array is empty but filters are active", () => {
      // Arrange
      const props = {
        exercises: [],
        hasMore: false,
        hasActiveFilters: true,
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(
        screen.queryByTestId("exercises-empty-state"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(/Brak ćwiczeń spełniających kryteria/),
      ).toBeInTheDocument();
    });

    it("should use default value false for hasActiveFilters when not provided", () => {
      // Arrange
      const props = {
        exercises: [],
        hasMore: false,
        // hasActiveFilters not provided - should default to false
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(screen.getByTestId("exercises-empty-state")).toBeInTheDocument();
    });
  });

  describe("renderowanie listy ćwiczeń", () => {
    it("should render single exercise card when one exercise provided", () => {
      // Arrange
      const props = {
        exercises: [mockExercise],
        hasMore: false,
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(
        screen.getByTestId("exercise-card-exercise-1"),
      ).toBeInTheDocument();
      expect(screen.getByText("Przysiady")).toBeInTheDocument();
      expect(
        screen.queryByTestId("exercises-empty-state"),
      ).not.toBeInTheDocument();
    });

    it("should render multiple exercise cards when multiple exercises provided", () => {
      // Arrange
      const props = {
        exercises: [mockExercise, mockExercise2],
        hasMore: false,
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(
        screen.getByTestId("exercise-card-exercise-1"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("exercise-card-exercise-2"),
      ).toBeInTheDocument();
      expect(screen.getByText("Przysiady")).toBeInTheDocument();
      expect(screen.getByText("Pompki")).toBeInTheDocument();
    });

    it("should render exercise cards in grid layout", () => {
      // Arrange
      const props = {
        exercises: [mockExercise],
        hasMore: false,
      };

      // Act
      const { container } = render(<ExercisesList {...props} />);

      // Assert
      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe("renderowanie komunikatu paginacji", () => {
    it("should render pagination message when hasMore is true and nextCursor exists", () => {
      // Arrange
      const props = {
        exercises: [mockExercise],
        hasMore: true,
        nextCursor: "cursor-123",
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(screen.getByText(/Więcej ćwiczeń dostępne/)).toBeInTheDocument();
      expect(screen.getByText(/paginacja w przygotowaniu/)).toBeInTheDocument();
    });

    it("should not render pagination message when hasMore is false", () => {
      // Arrange
      const props = {
        exercises: [mockExercise],
        hasMore: false,
        nextCursor: "cursor-123",
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(
        screen.queryByText(/Więcej ćwiczeń dostępne/),
      ).not.toBeInTheDocument();
    });

    it("should not render pagination message when nextCursor is null", () => {
      // Arrange
      const props = {
        exercises: [mockExercise],
        hasMore: true,
        nextCursor: null,
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(
        screen.queryByText(/Więcej ćwiczeń dostępne/),
      ).not.toBeInTheDocument();
    });

    it("should not render pagination message when nextCursor is undefined", () => {
      // Arrange
      const props = {
        exercises: [mockExercise],
        hasMore: true,
        // nextCursor is undefined
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(
        screen.queryByText(/Więcej ćwiczeń dostępne/),
      ).not.toBeInTheDocument();
    });

    it("should render pagination message only when both hasMore and nextCursor are truthy", () => {
      // Arrange
      const props = {
        exercises: [mockExercise, mockExercise2],
        hasMore: true,
        nextCursor: "cursor-456",
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(
        screen.getByTestId("exercise-card-exercise-1"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("exercise-card-exercise-2"),
      ).toBeInTheDocument();
      expect(screen.getByText(/Więcej ćwiczeń dostępne/)).toBeInTheDocument();
    });
  });

  describe("warunki brzegowe", () => {
    it("should handle empty string as nextCursor", () => {
      // Arrange
      const props = {
        exercises: [mockExercise],
        hasMore: true,
        nextCursor: "",
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      // Empty string is falsy, so pagination should not render
      expect(
        screen.queryByText(/Więcej ćwiczeń dostępne/),
      ).not.toBeInTheDocument();
    });

    it("should handle large number of exercises", () => {
      // Arrange
      const manyExercises = Array.from({ length: 50 }, (_, i) => ({
        ...mockExercise,
        id: `exercise-${i}`,
        title: `Exercise ${i}`,
      }));

      const props = {
        exercises: manyExercises,
        hasMore: false,
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      expect(
        screen.getByTestId("exercise-card-exercise-0"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("exercise-card-exercise-49"),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("exercises-empty-state"),
      ).not.toBeInTheDocument();
    });

    it("should prioritize active filters over empty state when both conditions are true", () => {
      // Arrange
      // Edge case: exercises.length === 0 AND hasActiveFilters === true
      const props = {
        exercises: [],
        hasMore: false,
        hasActiveFilters: true,
      };

      // Act
      render(<ExercisesList {...props} />);

      // Assert
      // Should show filter message, not empty state
      expect(
        screen.queryByTestId("exercises-empty-state"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(/Brak ćwiczeń spełniających kryteria/),
      ).toBeInTheDocument();
    });
  });
});
