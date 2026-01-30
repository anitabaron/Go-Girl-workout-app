"use client";

import type { SessionExerciseDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils/time-format";

type CurrentExerciseInfoM3Props = {
  exercise: SessionExerciseDTO;
};

export function CurrentExerciseInfoM3({
  exercise,
}: Readonly<CurrentExerciseInfoM3Props>) {
  return (
    <div className="space-y-4 rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-high)] p-4 shadow-sm">
      <h2 className="m3-headline">
        {exercise.exercise_title_at_time || "Brak nazwy"}
      </h2>

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
        {exercise.planned_sets !== null &&
          exercise.planned_sets !== undefined && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Serii planowanych
              </p>
              <p className="m3-title">{exercise.planned_sets}</p>
            </div>
          )}

        {exercise.planned_reps !== null &&
          exercise.planned_reps !== undefined && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Powtórzeń planowanych
              </p>
              <p className="m3-title">{exercise.planned_reps}</p>
            </div>
          )}

        {exercise.planned_duration_seconds !== null &&
          exercise.planned_duration_seconds !== undefined && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Czas trwania planowany
              </p>
              <p className="m3-title">
                {formatDuration(exercise.planned_duration_seconds)}
              </p>
            </div>
          )}

        {exercise.rest_in_between_seconds !== null &&
          exercise.rest_in_between_seconds !== undefined && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Przerwa między seriami
              </p>
              <p className="m3-title">
                {formatDuration(exercise.rest_in_between_seconds)}
              </p>
            </div>
          )}

        {exercise.rest_after_series_seconds !== null &&
          exercise.rest_after_series_seconds !== undefined && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Przerwa po zakończonych seriach
              </p>
              <p className="m3-title">
                {formatDuration(exercise.rest_after_series_seconds)}
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
