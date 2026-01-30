"use client";

import type { SummaryValues } from "@/hooks/use-exercise-execution-form";

function SummaryField({
  label,
  value,
}: Readonly<{ label: string; value: number | string | null }>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
    </div>
  );
}

type ExecutionSummaryDisplayProps = {
  values: SummaryValues;
  showDuration: boolean;
};

export function ExecutionSummaryDisplay({
  values,
  showDuration,
}: Readonly<ExecutionSummaryDisplayProps>) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
      <SummaryField label="Liczba serii" value={values.count_sets} />
      <SummaryField label="Suma powtórzeń" value={values.sum_reps} />
      {showDuration && (
        <SummaryField
          label="Czas trwania (sekundy)"
          value={values.duration_seconds}
        />
      )}
    </div>
  );
}
