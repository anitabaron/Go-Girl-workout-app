"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import type { PlannedParamsState } from "@/types/workout-plan-form";

type PlannedParamsEditorM3Props = {
  params: PlannedParamsState;
  onChange: (field: string, value: number | null) => void;
  errors: Record<string, string>;
  disabled: boolean;
  /** Prefix for data-test-id on each field (e.g. workout-plan-exercise-item-xxx) */
  "data-test-id-prefix"?: string;
};

const PLANNED_PARAMS_CONFIG: Array<{
  key: keyof PlannedParamsState;
  label: string;
  min: number;
  conditional?: (params: PlannedParamsState) => boolean;
}> = [
  { key: "planned_sets", label: "Sets", min: 1 },
  {
    key: "planned_reps",
    label: "Reps",
    min: 1,
    conditional: (p) => p.planned_reps != null && p.planned_reps > 0,
  },
  {
    key: "planned_duration_seconds",
    label: "Duration (s)",
    min: 1,
    conditional: (p) =>
      p.planned_duration_seconds != null && p.planned_duration_seconds > 0,
  },
  {
    key: "planned_rest_seconds",
    label: "Rest between sets (s)",
    min: 0,
  },
  {
    key: "planned_rest_after_series_seconds",
    label: "Rest after sets (s)",
    min: 0,
  },
  {
    key: "estimated_set_time_seconds",
    label: "Estimated set time (s)",
    min: 1,
  },
];

function PlannedParamField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  min = 0,
  placeholder = "—",
  "data-test-id": dataTestId,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  disabled?: boolean;
  min?: number;
  placeholder?: string;
  "data-test-id"?: string;
}) {
  const errorId = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw.trim() === "") {
      onChange(null);
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num)) onChange(num);
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={min}
        step={1}
        value={value ?? ""}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        data-test-id={dataTestId}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PlannedParamsEditorM3({
  params,
  onChange,
  errors,
  disabled,
  "data-test-id-prefix": testIdPrefix,
}: Readonly<PlannedParamsEditorM3Props>) {
  const firstRowFields = PLANNED_PARAMS_CONFIG.slice(0, 4);
  const secondRowFields = PLANNED_PARAMS_CONFIG.slice(4);

  const renderField = (config: (typeof PLANNED_PARAMS_CONFIG)[number]) => {
    if (config.conditional && !config.conditional(params)) return null;

    const value = params[config.key];
    const error = errors[config.key];
    const keyKebab = config.key.replaceAll("_", "-");
    const dataTestId = testIdPrefix ? `${testIdPrefix}-${keyKebab}` : undefined;

    return (
      <PlannedParamField
        key={config.key}
        id={config.key}
        label={config.label}
        value={value}
        onChange={(v) => onChange(config.key, v)}
        error={error}
        disabled={disabled}
        min={config.min}
        data-test-id={dataTestId}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {firstRowFields.map(renderField)}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {secondRowFields.map(renderField)}
      </div>
    </div>
  );
}
