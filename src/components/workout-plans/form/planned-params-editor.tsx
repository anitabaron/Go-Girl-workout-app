"use client";

import { PlannedParamField } from "./planned-param-field";
import type {
  PlannedParamsEditorProps,
  PlannedParamsState,
} from "@/types/workout-plan-form";

type FieldConfig = {
  key: keyof PlannedParamsState;
  label: string;
  min: number;
  conditional?: (params: PlannedParamsState) => boolean;
};

const PLANNED_PARAMS_CONFIG: FieldConfig[] = [
  { key: "planned_sets", label: "Serie", min: 1 },
  {
    key: "planned_reps",
    label: "Powtórzenia",
    min: 1,
    conditional: (p) => p.planned_reps != null && p.planned_reps > 0,
  },
  {
    key: "planned_duration_seconds",
    label: "Czas (s)",
    min: 1,
    conditional: (p) =>
      p.planned_duration_seconds != null && p.planned_duration_seconds > 0,
  },
  {
    key: "planned_rest_seconds",
    label: "Odpoczynek między seriami (s)",
    min: 0,
  },
  {
    key: "planned_rest_after_series_seconds",
    label: "Odpoczynek po seriach (s)",
    min: 0,
  },
  {
    key: "estimated_set_time_seconds",
    label: "Szacunkowy czas zestawu (s)",
    min: 1,
  },
];

export function PlannedParamsEditor({
  params,
  onChange,
  errors,
  disabled,
  "data-test-id-prefix": testIdPrefix,
}: Readonly<PlannedParamsEditorProps>) {
  const firstRowFields = PLANNED_PARAMS_CONFIG.slice(0, 4);
  const secondRowFields = PLANNED_PARAMS_CONFIG.slice(4);

  const renderField = (config: FieldConfig) => {
    if (config.conditional && !config.conditional(params)) {
      return null;
    }

    const value = params[config.key];
    const error = errors[config.key];
    // Use kebab-case for data-test-id (matches E2E expectations: planned-sets, planned-reps, etc.)
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
