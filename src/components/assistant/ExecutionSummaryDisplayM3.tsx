"use client";

import type { SummaryValues } from "@/hooks/use-exercise-execution-form";
import { useTranslations } from "@/i18n/client";

function SummaryFieldM3({
  label,
  value,
}: Readonly<{ label: string; value: number | string | null }>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground">
        {value}
      </div>
    </div>
  );
}

type ExecutionSummaryDisplayM3Props = {
  values: SummaryValues;
  showDuration: boolean;
};

export function ExecutionSummaryDisplayM3({
  values,
  showDuration,
}: Readonly<ExecutionSummaryDisplayM3Props>) {
  const t = useTranslations("executionSummaryDisplay");
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
      <SummaryFieldM3 label={t("numberOfSets")} value={values.count_sets} />
      {!showDuration && (
        <SummaryFieldM3 label={t("totalReps")} value={values.sum_reps} />
      )}
      {showDuration && (
        <SummaryFieldM3
          label={t("durationSeconds")}
          value={values.duration_seconds}
        />
      )}
    </div>
  );
}
