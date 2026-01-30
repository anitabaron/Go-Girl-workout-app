import type { SessionExerciseDTO } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils/time-format";

type WorkoutSessionExerciseItemM3Props = {
  readonly exercise: SessionExerciseDTO;
  readonly exerciseIndex: number;
  readonly totalExercises: number;
};

export function WorkoutSessionExerciseItemM3({
  exercise,
  exerciseIndex,
  totalExercises,
}: WorkoutSessionExerciseItemM3Props) {
  const title =
    exercise.exercise_title_at_time ?? `Exercise ${exerciseIndex + 1}`;

  return (
    <Card>
      <CardHeader>
        <div className="mb-3 flex items-start justify-between">
          <h3 className="m3-title">{title}</h3>
          <span className="text-sm text-muted-foreground">
            {exerciseIndex + 1} of {totalExercises}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {exercise.exercise_type_at_time && (
            <ExerciseTypeBadge type={exercise.exercise_type_at_time} />
          )}
          {exercise.exercise_part_at_time && (
            <Badge variant="outline">
              {EXERCISE_PART_LABELS[exercise.exercise_part_at_time] ??
                exercise.exercise_part_at_time}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--m3-outline-variant)] p-4">
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              Planned
            </h4>
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">Sets</dt>
                <dd className="font-semibold">
                  {exercise.planned_sets ?? "-"}
                </dd>
              </div>
              {exercise.planned_reps != null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Reps</dt>
                  <dd className="font-semibold">{exercise.planned_reps}</dd>
                </div>
              )}
              {exercise.planned_duration_seconds != null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Duration</dt>
                  <dd className="font-semibold">
                    {formatDuration(exercise.planned_duration_seconds)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Rest</dt>
                <dd className="font-semibold">
                  {formatDuration(exercise.planned_rest_seconds)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-lg border border-[var(--m3-outline-variant)] p-4">
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              Actual
            </h4>
            {exercise.is_skipped ? (
              <p className="text-sm text-muted-foreground">Skipped</p>
            ) : (
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Sets</dt>
                  <dd className="font-semibold">
                    {exercise.actual_count_sets ?? "-"}
                  </dd>
                </div>
                {exercise.planned_reps != null && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Reps</dt>
                    <dd className="font-semibold">
                      {exercise.actual_sum_reps ?? "-"}
                    </dd>
                  </div>
                )}
                {exercise.planned_duration_seconds != null && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Duration</dt>
                    <dd className="font-semibold">
                      {formatDuration(exercise.actual_duration_seconds)}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>

        {!exercise.is_skipped && exercise.sets && exercise.sets.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--m3-outline-variant)]">
                  <th className="px-3 py-2 text-left font-medium">Set</th>
                  <th className="px-3 py-2 text-center font-medium">Reps</th>
                  <th className="px-3 py-2 text-center font-medium">Time</th>
                  <th className="px-3 py-2 text-center font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {[...exercise.sets]
                  .sort((a, b) => a.set_number - b.set_number)
                  .map((set) => (
                    <tr
                      key={set.set_number}
                      className="border-b border-[var(--m3-outline-variant)] last:border-b-0"
                    >
                      <td className="px-3 py-2">{set.set_number}</td>
                      <td className="px-3 py-2 text-center">
                        {set.reps ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {formatDuration(set.duration_seconds)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {set.weight_kg != null ? `${set.weight_kg} kg` : "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
