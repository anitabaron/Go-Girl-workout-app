import type { SessionExerciseDTO } from "@/types";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import {
  EXERCISE_LABELS_NAMESPACE,
  getExercisePartLabel,
} from "@/lib/exercises/labels";
import { formatDuration } from "@/lib/utils/time-format";
import { useTranslations } from "@/i18n/client";
import { AddSessionSnapshotExerciseButtonM3 } from "./AddSessionSnapshotExerciseButtonM3";

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
  readonly sessionId?: string;
};

export function WorkoutSessionExerciseItemM3({
  exercise,
  exerciseIndex,
  totalExercises,
  sessionId,
}: WorkoutSessionExerciseItemM3Props) {
  const t = useTranslations("workoutSessionExerciseItem");
  const tExerciseLabel = useTranslations(EXERCISE_LABELS_NAMESPACE);
  const title =
    exercise.exercise_title_at_time ??
    `${t("exerciseLabel")} ${exerciseIndex + 1}`;

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

  // Sesje zaimportowane jako już ukończone nie mają "planu" (planned_* = null,
  // patrz importWorkoutSessionService) — więc o tym, którą kolumnę/metrykę
  // pokazać, decyduje obecność danych rzeczywistych (sets / actual_*), a nie
  // tylko planned_*.
  const hasActualReps =
    exercise.actual_sum_reps != null ||
    (exercise.sets ?? []).some((set) => set.reps != null);
  const hasActualDuration =
    exercise.actual_duration_seconds != null ||
    (exercise.sets ?? []).some((set) => set.duration_seconds != null);
  const showReps = exercise.planned_reps != null || hasActualReps;
  const showDuration =
    (exercise.planned_duration_seconds != null || hasActualDuration) &&
    !showReps;
  const achievedMetrics = new Set(exercise.achieved_pr_metrics ?? []);
  const highlightReps =
    exercise.is_save_to_pr === true && achievedMetrics.has("total_reps");
  const highlightDuration =
    exercise.is_save_to_pr === true && achievedMetrics.has("max_duration");
  const highlightWeight =
    exercise.is_save_to_pr === true && achievedMetrics.has("max_weight");
  const repsLabel = (
    <>
      <span className="sm:hidden">{t("repsShort")}</span>
      <span className="hidden sm:inline">{t("reps")}</span>
    </>
  );
  const totalRepsLabel = (
    <>
      <span className="sm:hidden">{t("totalShort")}</span>
      <span className="hidden sm:inline">{t("totalReps")}</span>
    </>
  );

  // Sesje zaimportowane jako już ukończone nie mają "planu" — planned_* jest
  // wtedy null dla wszystkich pól i karta "Planowane" nie ma nic do pokazania.
  const hasPlan =
    exercise.planned_sets != null ||
    exercise.planned_reps != null ||
    exercise.planned_duration_seconds != null ||
    exercise.planned_rest_seconds != null;

  return (
    <Card data-test-id="workout-session-exercise-item">
      <CardHeader>
        <div className="mb-3 flex items-start justify-between">
          <h3 className="m3-title min-w-0 flex-1">{title}</h3>
          <span className="shrink-0 whitespace-nowrap pl-3 text-sm text-muted-foreground">
            {exerciseIndex + 1} {t("of")} {totalExercises}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {exercise.exercise_type_at_time && (
            <ExerciseTypeBadge type={exercise.exercise_type_at_time} />
          )}
          {exercise.exercise_part_at_time && (
            <Badge variant="outline">
              {getExercisePartLabel(tExerciseLabel, exercise.exercise_part_at_time)}
            </Badge>
          )}
          {exercise.exercise_is_unilateral_at_time && (
            <Badge variant="secondary">{t("unilateral")}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-4 ${hasPlan ? "grid-cols-2" : "grid-cols-1"}`}>
          {hasPlan && (
            <div className="rounded-lg border border-[var(--m3-outline-variant)] p-4">
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                {t("planned")}
              </h4>
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("sets")}</dt>
                  <dd className="font-semibold">
                    {exercise.planned_sets ?? "-"}
                  </dd>
                </div>
                {exercise.planned_reps != null &&
                  exercise.planned_sets != null && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {repsLabel}
                        </dt>
                        <dd className="font-semibold">
                          {exercise.planned_reps}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {totalRepsLabel}
                        </dt>
                        <dd className="font-semibold">
                          {exercise.planned_reps * exercise.planned_sets}
                        </dd>
                      </div>
                    </div>
                  )}
                {exercise.planned_duration_seconds != null &&
                  exercise.planned_reps == null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t("duration")}
                      </dt>
                      <dd className="font-semibold">
                        {formatDuration(exercise.planned_duration_seconds)}
                      </dd>
                    </div>
                  )}
                {exercise.planned_rest_seconds != null && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {t("rest")}
                    </dt>
                    <dd className="font-semibold">
                      {formatDuration(exercise.planned_rest_seconds)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          <div
            className={`rounded-lg border border-[var(--m3-outline-variant)] p-4 ${
              exercise.is_skipped ? "bg-muted/50 opacity-60" : ""
            }`}
          >
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              {t("actual")}
            </h4>
            {exercise.is_skipped ? (
              <p className="text-sm text-muted-foreground">{t("skipped")}</p>
            ) : (
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("sets")}</dt>
                  <dd
                    className={`flex items-center font-semibold ${getComparisonClass(
                      setsComparison,
                    )}`}
                  >
                    {exercise.actual_count_sets ?? "-"}
                    {getArrowIcon(setsComparison)}
                  </dd>
                </div>
                {showReps && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {totalRepsLabel}
                    </dt>
                    <dd
                      className={`flex items-center font-semibold ${getComparisonClass(
                        repsComparison,
                      )}`}
                    >
                      {exercise.actual_sum_reps ?? "-"}
                      {getArrowIcon(repsComparison)}
                    </dd>
                  </div>
                )}
                {showDuration && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t("duration")}
                      </dt>
                      <dd
                        className={`flex items-center font-semibold ${getComparisonClass(
                          durationComparison,
                        )}`}
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
                  <th className="px-3 py-2 text-left font-medium">
                    {t("set")}
                  </th>
                  {showReps && (
                    <th className="px-3 py-2 text-center font-medium">
                      {repsLabel}
                    </th>
                  )}
                  {showDuration && (
                    <th className="px-3 py-2 text-center font-medium">
                      {t("time")}
                    </th>
                  )}
                  <th className="px-3 py-2 text-center font-medium">
                    {t("weight")}
                  </th>
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
                  return sortedSets.map((set) => {
                    const bestReps = isBestReps(set.reps);
                    const bestDuration = isBestDuration(set.duration_seconds);
                    const bestWeight = isBestWeight(set.weight_kg);
                    const hasHighlight =
                      (highlightReps && bestReps) ||
                      (highlightDuration && bestDuration) ||
                      (highlightWeight && bestWeight);
                    const repsClass =
                      highlightReps && bestReps
                        ? "font-bold text-[var(--m3-primary)]"
                        : bestReps
                          ? "font-normal text-foreground"
                          : "";
                    const durationClass =
                      highlightDuration && bestDuration
                        ? "font-bold text-[var(--m3-primary)]"
                        : bestDuration
                          ? "font-normal text-foreground"
                          : "";
                    const weightClass =
                      highlightWeight && bestWeight
                        ? "font-bold text-[var(--m3-primary)]"
                        : bestWeight
                          ? "font-normal text-foreground"
                          : "";

                    return (
                      <tr
                        key={set.set_number}
                        className={`border-b border-[var(--m3-outline-variant)] last:border-b-0 ${
                          hasHighlight ? recordRowClass : ""
                        }`}
                      >
                        <td className="px-3 py-2">{set.set_number}</td>
                        {showReps && (
                          <td
                            className={`px-3 py-2 text-center ${repsClass}`}
                          >
                            {set.reps ?? "-"}
                          </td>
                        )}
                        {showDuration && (
                          <td
                            className={`px-3 py-2 text-center ${durationClass}`}
                          >
                            {formatDuration(set.duration_seconds)}
                          </td>
                        )}
                        <td
                          className={`px-3 py-2 text-center ${weightClass}`}
                        >
                          {set.weight_kg == null ? "-" : `${set.weight_kg} kg`}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
        {sessionId && (
          <AddSessionSnapshotExerciseButtonM3
            exercise={exercise}
            sessionId={sessionId}
          />
        )}
      </CardContent>
    </Card>
  );
}
