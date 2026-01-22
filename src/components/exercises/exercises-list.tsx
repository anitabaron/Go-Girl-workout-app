import type { ExerciseDTO } from "@/types";
import { ExerciseCard } from "./exercise-card";
import { EmptyState } from "./empty-state";

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
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            Brak ćwiczeń spełniających kryteria
          </p>
        </div>
      );
    }
    return <EmptyState />;
  }

  console.log("exercises", exercises);

  return (
    <div className="space-y-4">
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
