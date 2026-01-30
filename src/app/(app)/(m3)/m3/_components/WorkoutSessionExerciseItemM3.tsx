import type { SessionExerciseDTO } from "@/types";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils/time-format";

type Comparison = "up" | "down" | "match" | "na";

function compareValues(
  planned: number | null,
  actual: number | null,
): Comparison {
  if (planned === null || actual === null) return "na";
  if (planned === actual) return "match";
  return actual > planned ? "up" : "down";
}

function getArrowIcon(comparison: Comparison) {
  if (comparison === "up")
    return (
      <ArrowUp className="ml-1 inline-block size-4 text-[var(--m3-primary)]" />
    );
  if (comparison === "down")
    return (
      <ArrowDown className="ml-1 inline-block size-4 text-[var(--m3-primary)]" />
    );
  return null;
}

function getComparisonClass(comparison: Comparison) {
  if (comparison === "up" || comparison === "down")
    return "text-[var(--m3-primary)]";
  return "";
}

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

  const plannedRepsTotal =
    exercise.planned_reps != null && exercise.planned_sets != null
      ? exercise.planned_reps * exercise.planned_sets
      : null;
  const setsComparison = compareValues(
    exercise.planned_sets,
    exercise.actual_count_sets,
  );
  const repsComparison = compareValues(
    plannedRepsTotal,
    exercise.actual_sum_reps,
  );
  const durationComparison = compareValues(
    exercise.planned_duration_seconds,
    exercise.actual_duration_seconds,
  );

  const showReps =
    exercise.planned_reps != null && exercise.planned_reps !== undefined;
  const showDuration =
    exercise.planned_duration_seconds != null &&
    exercise.planned_duration_seconds !== undefined &&
    !showReps;

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
        <div className="grid grid-cols-2 gap-4">
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
              {exercise.planned_duration_seconds != null &&
                exercise.planned_reps == null && (
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
          <div
            className={`rounded-lg border border-[var(--m3-outline-variant)] p-4 ${exercise.is_skipped ? "bg-muted/50 opacity-60" : ""}`}
          >
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              Actual
            </h4>
            {exercise.is_skipped ? (
              <p className="text-sm text-muted-foreground">Skipped</p>
            ) : (
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Sets</dt>
                  <dd
                    className={`flex items-center font-semibold ${getComparisonClass(setsComparison)}`}
                  >
                    {exercise.actual_count_sets ?? "-"}
                    {getArrowIcon(setsComparison)}
                  </dd>
                </div>
                {exercise.planned_reps != null && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Reps</dt>
                    <dd
                      className={`flex items-center font-semibold ${getComparisonClass(repsComparison)}`}
                    >
                      {exercise.actual_sum_reps ?? "-"}
                      {getArrowIcon(repsComparison)}
                    </dd>
                  </div>
                )}
                {exercise.planned_duration_seconds != null &&
                  exercise.planned_reps == null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Duration
                      </dt>
                      <dd
                        className={`flex items-center font-semibold ${getComparisonClass(durationComparison)}`}
                      >
                        {formatDuration(exercise.actual_duration_seconds)}
                        {getArrowIcon(durationComparison)}
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
                  {showReps && (
                    <th className="px-3 py-2 text-center font-medium">Reps</th>
                  )}
                  {showDuration && (
                    <th className="px-3 py-2 text-center font-medium">Time</th>
                  )}
                  <th className="px-3 py-2 text-center font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sortedSets = [...exercise.sets].sort(
                    (a, b) => a.set_number - b.set_number,
                  );
                  const maxReps =
                    showReps && sortedSets.length > 0
                      ? Math.max(...sortedSets.map((s) => s.reps ?? 0))
                      : 0;
                  const maxDuration =
                    showDuration && sortedSets.length > 0
                      ? Math.max(
                          ...sortedSets.map((s) => s.duration_seconds ?? 0),
                        )
                      : 0;
                  const maxWeight =
                    sortedSets.length > 0
                      ? Math.max(...sortedSets.map((s) => s.weight_kg ?? 0))
                      : 0;
                  const isBestReps = (reps: number | null) =>
                    showReps && reps != null && reps > 0 && reps === maxReps;
                  const isBestDuration = (duration: number | null) =>
                    showDuration &&
                    duration != null &&
                    duration > 0 &&
                    duration === maxDuration;
                  const isBestWeight = (weight: number | null) =>
                    weight != null && weight > 0 && weight === maxWeight;
                  const recordRowClass = "bg-primary/10";
                  const recordCellClass = "font-bold text-[var(--m3-primary)]";

                  return sortedSets.map((set) => {
                    const bestReps = isBestReps(set.reps);
                    const bestDuration = isBestDuration(set.duration_seconds);
                    const bestWeight = isBestWeight(set.weight_kg);
                    const hasHighlight = bestReps || bestDuration || bestWeight;

                    return (
                      <tr
                        key={set.set_number}
                        className={`border-b border-[var(--m3-outline-variant)] last:border-b-0 ${hasHighlight ? recordRowClass : ""}`}
                      >
                        <td className="px-3 py-2">{set.set_number}</td>
                        {showReps && (
                          <td
                            className={`px-3 py-2 text-center ${bestReps ? recordCellClass : ""}`}
                          >
                            {set.reps ?? "-"}
                          </td>
                        )}
                        {showDuration && (
                          <td
                            className={`px-3 py-2 text-center ${bestDuration ? recordCellClass : ""}`}
                          >
                            {formatDuration(set.duration_seconds)}
                          </td>
                        )}
                        <td
                          className={`px-3 py-2 text-center ${bestWeight ? recordCellClass : ""}`}
                        >
                          {set.weight_kg != null ? `${set.weight_kg} kg` : "-"}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
