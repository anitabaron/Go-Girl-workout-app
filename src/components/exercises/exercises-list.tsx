import type { ExerciseDTO } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { Dumbbell } from "lucide-react";
import { ExerciseCard } from "./exercise-card";

type ExercisesListProps = {
  readonly exercises: ExerciseDTO[];
  readonly nextCursor?: string | null;
  readonly hasMore: boolean;
  readonly hasActiveFilters?: boolean;
};

export function ExercisesList({
  exercises,
  nextCursor,
  hasMore,
  hasActiveFilters = false,
}: ExercisesListProps) {
  if (exercises.length === 0) {
    if (hasActiveFilters) {
      return (
        <div
          className="rounded-lg border border-dashed border-border p-8 text-center"
          data-test-id="exercises-no-results"
        >
          <p className="text-muted-foreground">
            Brak ćwiczeń spełniających kryteria
          </p>
        </div>
      );
    }
    return (
      <EmptyState
        icon={
          <Dumbbell className="h-8 w-8 text-destructive" aria-hidden="true" />
        }
        title="Nie masz jeszcze żadnych ćwiczeń"
        description="Dodaj pierwsze ćwiczenie, aby rozpocząć budowanie swojej biblioteki treningowej"
        actionHref="/exercises/new"
        actionLabel="Dodaj pierwsze ćwiczenie"
        testId="exercises-empty-state"
      />
    );
  }

  return (
    <div className="space-y-4" data-test-id="exercises-list">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>

      {hasMore && nextCursor && (
        <div className="flex justify-center pt-4">
          {/* TODO: Implementacja przycisku "Load more" w następnym kroku */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Więcej ćwiczeń dostępne (paginacja w przygotowaniu)
          </p>
        </div>
      )}
    </div>
  );
}
