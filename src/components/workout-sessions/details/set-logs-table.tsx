import type {
  SessionExerciseSetDTO,
  PersonalRecordWithExerciseDTO,
} from "@/types";

type SetLogsTableProps = {
  readonly sets: SessionExerciseSetDTO[];
  readonly isSkipped?: boolean;
  readonly plannedReps?: number | null;
  readonly plannedDurationSeconds?: number | null;
  readonly sessionId?: string;
  readonly personalRecords?: PersonalRecordWithExerciseDTO[];
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}min ${secs}s`;
  }
  return `${secs}s`;
}

export function SetLogsTable({ 
  sets, 
  isSkipped = false,
  plannedReps,
  plannedDurationSeconds,
  sessionId,
  personalRecords = [],
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
  const showDuration = plannedDurationSeconds !== null && plannedDurationSeconds !== undefined;

  // Sprawdź czy seria to rekord osobisty
  const isPersonalRecord = (setNumber: number): boolean => {
    if (!sessionId || personalRecords.length === 0) {
      return false;
    }
    return personalRecords.some(
      (pr) =>
        pr.achieved_in_session_id === sessionId &&
        pr.achieved_in_set_number === setNumber
    );
  };

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
            const isPR = isPersonalRecord(set.set_number);
            return (
              <tr
                key={set.set_number}
                className={`border-b border-border last:border-b-0 ${
                  isPR ? "bg-destructive/10" : ""
                }`}
              >
                <td
                  className={`px-4 py-1 text-center text-sm ${
                    isPR ? "font-bold text-destructive" : ""
                  }`}
                >
                  {set.set_number}
                </td>
                {showReps && (
                  <td
                    className={`px-4 text-center text-sm ${
                      isPR ? "font-bold text-destructive" : ""
                    }`}
                  >
                    {set.reps !== null ? set.reps : "-"}
                  </td>
                )}
                {showDuration && (
                  <td
                    className={`px-4 text-center text-sm ${
                      isPR ? "font-bold text-destructive" : ""
                    }`}
                  >
                    {formatDuration(set.duration_seconds)}
                  </td>
                )}
                <td
                  className={`px-4 text-center text-sm ${
                    isPR ? "font-bold text-destructive" : ""
                  }`}
                >
                  {set.weight_kg !== null ? `${set.weight_kg} kg` : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
