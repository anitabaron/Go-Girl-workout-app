"use client";

import type { SessionExerciseDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils/time-format";

type CurrentExerciseInfoProps = {
  exercise: SessionExerciseDTO;
};

/**
 * Komponent wyświetlający informacje o bieżącym ćwiczeniu:
 * tytuł, typ, partię oraz parametry planowane (planned_*).
 */
export function CurrentExerciseInfo({
  exercise,
}: Readonly<CurrentExerciseInfoProps>) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-white p-4 shadow-sm dark:border-border dark:bg-zinc-950">
      {/* Tytuł ćwiczenia */}
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {exercise.exercise_title_at_time || "Brak nazwy"}
      </h2>

      {/* Badge z typem i partią */}
      <div className="flex flex-wrap gap-2">
        {exercise.exercise_type_at_time && (
          <ExerciseTypeBadge type={exercise.exercise_type_at_time} />
        )}
        {exercise.exercise_part_at_time && (
          <Badge
            variant="outline"
            className="border-destructive text-destructive"
          >
            {EXERCISE_PART_LABELS[exercise.exercise_part_at_time] ||
              exercise.exercise_part_at_time}
          </Badge>
        )}
      </div>

      {/* Parametry planowane */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
        {exercise.planned_sets !== null &&
          exercise.planned_sets !== undefined && (
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Serii planowanych
              </p>
              <p className="text-lg font-semibold">{exercise.planned_sets}</p>
            </div>
          )}

        {exercise.planned_reps !== null &&
          exercise.planned_reps !== undefined && (
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Powtórzeń planowanych
              </p>
              <p className="text-lg font-semibold">{exercise.planned_reps}</p>
            </div>
          )}

        {exercise.planned_duration_seconds !== null &&
          exercise.planned_duration_seconds !== undefined && (
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Czas trwania planowany
              </p>
              <p className="text-lg font-semibold">
                {formatDuration(exercise.planned_duration_seconds)}
              </p>
            </div>
          )}

        {exercise.rest_in_between_seconds !== null &&
          exercise.rest_in_between_seconds !== undefined && (
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Przerwa między seriami
              </p>
              <p className="text-lg font-semibold">
                {formatDuration(exercise.rest_in_between_seconds)}
              </p>
            </div>
          )}

        {exercise.rest_after_series_seconds !== null &&
          exercise.rest_after_series_seconds !== undefined && (
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Przerwa po zakończonych seriach
              </p>
              <p className="text-lg font-semibold">
                {formatDuration(exercise.rest_after_series_seconds)}
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
