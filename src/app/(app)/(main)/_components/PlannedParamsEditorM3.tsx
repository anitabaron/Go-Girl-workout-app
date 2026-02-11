"use client";

import { useId } from "react";
import { ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PlannedParamsState } from "@/types/workout-plan-form";
import {
  calculateEstimatedSetTimeSeconds,
  getEstimatedSetTimeLabel,
} from "@/lib/exercises/estimated-set-time";
import { useTranslations } from "@/i18n/client";

type PlannedParamsEditorM3Props = {
  params: PlannedParamsState;
  onChange: (field: string, value: number | null) => void;
  errors: Record<string, string>;
  disabled: boolean;
  /** Czy ćwiczenie jest unilateralne (estimated set time ×2 dla czasu pracy). */
  isUnilateral?: boolean;
  /** Prefix for data-test-id on each field (e.g. workout-plan-exercise-item-xxx) */
  "data-test-id-prefix"?: string;
  /** Widoczność pól z wartości początkowych z bazy (gdy initial > 0). */
  showRepsField?: boolean;
  showDurationField?: boolean;
};

const PLANNED_PARAMS_CONFIG: Array<{
  key: keyof PlannedParamsState;
  label: string;
  labelFn?: (params: PlannedParamsState, isUnilateral?: boolean) => string;
  min: number;
  /** Klucz do sprawdzenia widoczności przez props (showRepsField / showDurationField). */
  visibilityKey?: "reps" | "duration";
}> = [
  { key: "planned_sets", label: "Sets", min: 1 },
  {
    key: "planned_reps",
    label: "Reps",
    min: 1,
    visibilityKey: "reps",
  },
  {
    key: "planned_duration_seconds",
    label: "Duration (s)",
    min: 1,
    visibilityKey: "duration",
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
    labelFn: (p, isUnilateral) =>
      getEstimatedSetTimeLabel(
        calculateEstimatedSetTimeSeconds({
          series: p.planned_sets ?? "",
          reps: p.planned_reps ?? null,
          duration_seconds: p.planned_duration_seconds ?? null,
          rest_in_between_seconds: p.planned_rest_seconds ?? null,
          rest_after_series_seconds:
            p.planned_rest_after_series_seconds ?? null,
          exercise_is_unilateral: isUnilateral ?? undefined,
        }),
        "s",
      ),
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
  suggestedValue,
  useEstimatedLabel,
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
  /** Gdy liczba – pokazuje przycisk strzałki w dół do wklejenia tej wartości w pole. */
  suggestedValue?: number | null;
  useEstimatedLabel: string;
}) {
  const errorId = useId();
  const canApplySuggested =
    suggestedValue != null &&
    Number.isFinite(suggestedValue) &&
    suggestedValue >= min;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw.trim() === "") {
      onChange(null);
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num)) onChange(num);
  };

  const handleApplySuggested = () => {
    if (canApplySuggested) onChange(Math.round(suggestedValue!));
  };

  return (
    <div>
      <div className="flex items-center gap-1">
        <label
          htmlFor={id}
          className="block text-xs font-medium text-muted-foreground"
        >
          {label}
        </label>
        {canApplySuggested && (
          <button
            type="button"
            onClick={handleApplySuggested}
            disabled={disabled}
            className="cursor-pointer inline-flex shrink-0 items-center justify-center rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title={`${useEstimatedLabel} (${suggestedValue} s)`}
            aria-label={`${useEstimatedLabel} ${suggestedValue} s`}
          >
            <ArrowDown className="size-3.5" />
          </button>
        )}
      </div>
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
  isUnilateral,
  "data-test-id-prefix": testIdPrefix,
  showRepsField = false,
  showDurationField = false,
}: Readonly<PlannedParamsEditorM3Props>) {
  const t = useTranslations("plannedParamsEditor");
  const firstRowFields = PLANNED_PARAMS_CONFIG.slice(0, 4);
  const secondRowFields = PLANNED_PARAMS_CONFIG.slice(4);

  const MIN_GREATER_THAN_ONE_MSG = t("minGreaterThanOne");

  const renderField = (config: (typeof PLANNED_PARAMS_CONFIG)[number]) => {
    if (config.visibilityKey === "reps" && !showRepsField) return null;
    if (config.visibilityKey === "duration" && !showDurationField) return null;

    const value = params[config.key];
    const serverError = errors[config.key];
    const isRepsOrDuration =
      config.key === "planned_reps" ||
      config.key === "planned_duration_seconds";
    const showMinWarning =
      isRepsOrDuration && (value === null || value === undefined || value < 1);
    const error =
      serverError ?? (showMinWarning ? MIN_GREATER_THAN_ONE_MSG : undefined);
    const keyKebab = config.key.replaceAll("_", "-");
    const dataTestId = testIdPrefix ? `${testIdPrefix}-${keyKebab}` : undefined;
    const rawLabel = config.labelFn
      ? config.labelFn(params, isUnilateral)
      : config.label;
    const labelMap: Record<string, string> = {
      Sets: t("sets"),
      Reps: t("reps"),
      "Duration (s)": t("duration"),
      "Rest between sets (s)": t("restBetween"),
      "Rest after sets (s)": t("restAfter"),
      "Estimated set time (s)": t("estimatedSetTime"),
    };
    const label = labelMap[rawLabel] ?? rawLabel;

    const suggestedValue =
      config.key === "estimated_set_time_seconds"
        ? calculateEstimatedSetTimeSeconds({
            series: params.planned_sets ?? "",
            reps: params.planned_reps ?? null,
            duration_seconds: params.planned_duration_seconds ?? null,
            rest_in_between_seconds: params.planned_rest_seconds ?? null,
            rest_after_series_seconds:
              params.planned_rest_after_series_seconds ?? null,
            exercise_is_unilateral: isUnilateral ?? undefined,
          })
        : undefined;

    return (
      <PlannedParamField
        key={config.key}
        id={config.key}
        label={label}
        value={value}
        onChange={(v) => onChange(config.key, v)}
        error={error}
        disabled={disabled}
        min={config.min}
        data-test-id={dataTestId}
        suggestedValue={suggestedValue}
        useEstimatedLabel={t("useEstimated")}
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
