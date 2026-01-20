import { Badge } from "@/components/ui/badge";

type PlannedParams = {
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
};

type ActualParams = {
  count_sets: number | null;
  sum_reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  is_skipped: boolean;
};

type ActualSectionProps = {
  readonly params: ActualParams;
  readonly planned: PlannedParams;
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

function compareValues(
  planned: number | null,
  actual: number | null
): "match" | "diff" | "na" {
  if (planned === null || actual === null) {
    return "na";
  }
  return planned === actual ? "match" : "diff";
}

export function ActualSection({ params, planned }: ActualSectionProps) {
  if (params.is_skipped) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-4 opacity-60">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold">Wykonanie</h4>
          <Badge variant="secondary" className="bg-zinc-500">
            Pominięte
          </Badge>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          To ćwiczenie zostało pominięte podczas treningu.
        </p>
      </div>
    );
  }

  const setsComparison = compareValues(planned.sets, params.count_sets);
  const repsComparison = compareValues(planned.reps, params.sum_reps);
  const durationComparison = compareValues(
    planned.duration_seconds,
    params.duration_seconds
  );
  const restComparison = compareValues(planned.rest_seconds, params.rest_seconds);

  const getTextColor = (comparison: "match" | "diff" | "na") => {
    if (comparison === "diff") {
      return "text-destructive";
    }
    return "";
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-4">
      <h4 className="mb-4 text-lg font-semibold">Wykonanie</h4>
      <dl className="space-y-3">
        <div>
          <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Serii
          </dt>
          <dd
            className={`mt-1 rounded text-lg font-semibold ${getTextColor(setsComparison)}`}
          >
            {params.count_sets !== null ? params.count_sets : "-"}
          </dd>
        </div>
        {/* Pokaż powtórzenia tylko jeśli ćwiczenie ma planowane powtórzenia */}
        {planned.reps !== null && planned.reps !== undefined && (
          <div>
            <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Powtórzeń
            </dt>
            <dd
              className={`mt-1 rounded  text-lg font-semibold ${getTextColor(repsComparison)}`}
            >
              {params.sum_reps !== null ? params.sum_reps : "-"}
            </dd>
          </div>
        )}
        {/* Pokaż czas trwania tylko jeśli ćwiczenie ma planowany czas */}
        {planned.duration_seconds !== null && planned.duration_seconds !== undefined && (
          <div>
            <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Czas trwania
            </dt>
            <dd
              className={`mt-1 rounded text-lg font-semibold ${getTextColor(durationComparison)}`}
            >
              {formatDuration(params.duration_seconds)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Przerwa między seriami
          </dt>
          <dd
            className={`mt-1 rounded  text-lg font-semibold ${getTextColor(restComparison)}`}
          >
            {params.rest_seconds !== null ? `${params.rest_seconds} s` : "-"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
