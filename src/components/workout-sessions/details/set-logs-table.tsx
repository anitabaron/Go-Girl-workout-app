import type { SessionExerciseSetDTO } from "@/types";
import { formatDuration } from "@/lib/utils/time-format";

type SetLogsTableProps = {
  readonly sets: SessionExerciseSetDTO[];
  readonly isSkipped?: boolean;
  readonly highlightReps?: boolean;
  readonly highlightDuration?: boolean;
  readonly highlightWeight?: boolean;
  readonly plannedReps?: number | null;
  readonly plannedDurationSeconds?: number | null;
};

export function SetLogsTable({
  sets,
  isSkipped = false,
  highlightReps = false,
  highlightDuration = false,
  highlightWeight = false,
  plannedReps,
  plannedDurationSeconds,
}: SetLogsTableProps) {
  if (isSkipped) {
    return null;
  }

  if (sets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">Brak zapisanych serii</p>
      </div>
    );
  }

  // Sortowanie serii po set_number
  const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number);

  const showReps = plannedReps !== null && plannedReps !== undefined;
  const showDuration =
    plannedDurationSeconds !== null && plannedDurationSeconds !== undefined;

  // Najwyższe wartości w serii (do wyróżnienia – analogicznie do personal-record-metric-item)
  const maxReps =
    showReps && sortedSets.length > 0
      ? Math.max(...sortedSets.map((s) => s.reps ?? 0))
      : 0;
  const maxDuration =
    showDuration && sortedSets.length > 0
      ? Math.max(...sortedSets.map((s) => s.duration_seconds ?? 0))
      : 0;
  const maxWeight =
    sortedSets.length > 0
      ? Math.max(...sortedSets.map((s) => s.weight_kg ?? 0))
      : 0;

  const isBestReps = (reps: number | null) =>
    showReps && reps !== null && reps > 0 && reps === maxReps;
  const isBestDuration = (duration: number | null) =>
    showDuration &&
    duration !== null &&
    duration > 0 &&
    duration === maxDuration;
  const isBestWeight = (weight: number | null) =>
    weight !== null && weight > 0 && weight === maxWeight;

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse"
        aria-label="Tabela serii ćwiczenia"
      >
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-1 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Seria
            </th>
            {showReps && (
              <th className="px-4 py-1 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Powtórzenia
              </th>
            )}
            {showDuration && (
              <th className="px-4 py-1 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Czas
              </th>
            )}
            <th className="px-4 py-1 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Obciążenie
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSets.map((set) => {
            const bestReps = isBestReps(set.reps);
            const bestDuration = isBestDuration(set.duration_seconds);
            const bestWeight = isBestWeight(set.weight_kg);
            const hasHighlight =
              (highlightReps && bestReps) ||
              (highlightDuration && bestDuration) ||
              (highlightWeight && bestWeight);
            const rowHighlightClass = hasHighlight ? "bg-destructive/10" : "";
            const repsClass =
              highlightReps && bestReps
                ? "font-bold text-destructive"
                : bestReps
                  ? "font-normal text-foreground"
                  : "";
            const durationClass =
              highlightDuration && bestDuration
                ? "font-bold text-destructive"
                : bestDuration
                  ? "font-normal text-foreground"
                  : "";
            const weightClass =
              highlightWeight && bestWeight
                ? "font-bold text-destructive"
                : bestWeight
                  ? "font-normal text-foreground"
                  : "";
            return (
              <tr
                key={set.set_number}
                className={`border-b border-border last:border-b-0 ${rowHighlightClass}`}
              >
                <td className="px-4 py-1 text-center text-sm">
                  {set.set_number}
                </td>
                {showReps && (
                  <td
                    className={`px-4 text-center text-sm ${repsClass}`}
                  >
                    {set.reps ?? "-"}
                  </td>
                )}
                {showDuration && (
                  <td
                    className={`px-4 text-center text-sm ${durationClass}`}
                  >
                    {formatDuration(set.duration_seconds)}
                  </td>
                )}
                <td
                  className={`px-4 text-center text-sm ${weightClass}`}
                >
                  {set.weight_kg === null ? "-" : `${set.weight_kg} kg`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
