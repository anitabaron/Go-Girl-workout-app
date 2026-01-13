import type { ExerciseDTO } from "@/types";
import { ExerciseCard } from "./exercise-card";
import { EmptyState } from "./empty-state";

type ExercisesListProps = {
  exercises: ExerciseDTO[];
  nextCursor?: string | null;
  hasMore: boolean;
};

export function ExercisesList({
  exercises,
  nextCursor,
  hasMore,
}: ExercisesListProps) {
  if (exercises.length === 0) {
    return <EmptyState />;
  }

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
