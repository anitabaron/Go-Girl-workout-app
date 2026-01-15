import { PlannedSection } from "./planned-section";
import { ActualSection } from "./actual-section";

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

type PlannedVsActualComparisonProps = {
  readonly planned: PlannedParams;
  readonly actual: ActualParams;
};

export function PlannedVsActualComparison({
  planned,
  actual,
}: PlannedVsActualComparisonProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <PlannedSection params={planned} />
      <ActualSection params={actual} planned={planned} />
    </div>
  );
}
