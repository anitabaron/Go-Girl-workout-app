import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "lucide-react";
import { formatDuration } from "@/lib/utils/time-format";

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

function compareValues(
  planned: number | null,
  actual: number | null
): "up" | "down" | "match" | "na" {
  if (planned === null || actual === null) {
    return "na";
  }
  if (planned === actual) {
    return "match";
  }
  return actual > planned ? "up" : "down";
}

export function ActualSection({ params, planned }: ActualSectionProps) {
  if (params.is_skipped) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-4 opacity-60">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold">Wykonanie</h4>
          <Badge variant="secondary" className="bg-zinc-500 hidden sm:block">
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
  const repsComparison = compareValues(planned.reps !== null && planned.reps !== undefined && planned.sets !== null && planned.sets !== undefined ? planned.reps * planned.sets : null, params.sum_reps);
  const durationComparison = compareValues(
    planned.duration_seconds,
    params.duration_seconds
  );
  const restComparison = compareValues(planned.rest_seconds, params.rest_seconds);

  const getTextColor = (comparison: "up" | "down" | "match" | "na") => {
    if (comparison === "up" || comparison === "down") {
      return "text-destructive";
    }
    return "";
  };

  const getArrowIcon = (comparison: "up" | "down" | "match" | "na") => {
    if (comparison === "up") {
      return <ArrowUp className="ml-1 inline-block size-4" />;
    }
    if (comparison === "down") {
      return <ArrowDown className="ml-1 inline-block size-4" />;
    }
    return null;
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-4">
      <h4 className="mb-4 text-lg font-semibold">Wykonanie</h4>
      <dl className="space-y-3">
        <div>
          <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Serie
          </dt>
          <dd
            className={`mt-1 rounded text-lg font-semibold ${getTextColor(setsComparison)}`}
          >
            {params.count_sets ?? "-"}
            {getArrowIcon(setsComparison)}
          </dd>
        </div>
        {/* Pokaż powtórzenia tylko jeśli ćwiczenie ma planowane powtórzenia */}
        {planned.reps !== null && planned.reps !== undefined && (
          <div>
            <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Suma powtórzeń
            </dt>
            <dd
              className={`mt-1 rounded  text-lg font-semibold ${getTextColor(repsComparison)}`}
            >
              {params.sum_reps ?? "-"}
              {getArrowIcon(repsComparison)}
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
              {getArrowIcon(durationComparison)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
