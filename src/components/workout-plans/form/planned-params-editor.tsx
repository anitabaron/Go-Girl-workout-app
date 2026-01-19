"use client";

import { Input } from "@/components/ui/input";
import { useId } from "react";
import type { PlannedParamsEditorProps } from "@/types/workout-plan-form";

export function PlannedParamsEditor({
  params,
  onChange,
  errors,
  disabled,
}: PlannedParamsEditorProps) {
  const setsId = useId();
  const repsId = useId();
  const durationId = useId();
  const restId = useId();
  const setsErrorId = useId();
  const repsErrorId = useId();
  const durationErrorId = useId();
  const restErrorId = useId();

  const handleNumberChange = (
    field: string,
    value: string
  ) => {
    if (value === "" || value.trim() === "") {
      onChange(field, null);
      return;
    }

    const num = Number(value);
    if (!Number.isNaN(num)) {
      onChange(field, num);
    }
  };

  const estimatedTimeId = useId();
  const estimatedTimeErrorId = useId();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Planned Sets */}
        <div>
          <label
            htmlFor={setsId}
            className="block text-xs font-medium text-muted-foreground"
          >
            Serie
          </label>
          <Input
            id={setsId}
            type="number"
            min="1"
            step="1"
            value={params.planned_sets ?? ""}
            onChange={(e) => handleNumberChange("planned_sets", e.target.value)}
            disabled={disabled}
            placeholder="—"
            className="mt-1"
            aria-invalid={errors.planned_sets ? "true" : "false"}
            aria-describedby={errors.planned_sets ? setsErrorId : undefined}
          />
          {errors.planned_sets && (
            <p
              id={setsErrorId}
              className="mt-1 text-xs text-destructive"
              role="alert"
            >
              {errors.planned_sets}
            </p>
          )}
        </div>

        {/* Planned Reps */}
        <div>
          <label
            htmlFor={repsId}
            className="block text-xs font-medium text-muted-foreground"
          >
            Powtórzenia
          </label>
          <Input
            id={repsId}
            type="number"
            min="1"
            step="1"
            value={params.planned_reps ?? ""}
            onChange={(e) => handleNumberChange("planned_reps", e.target.value)}
            disabled={disabled}
            placeholder="—"
            className="mt-1"
            aria-invalid={errors.planned_reps ? "true" : "false"}
            aria-describedby={errors.planned_reps ? repsErrorId : undefined}
          />
          {errors.planned_reps && (
            <p
              id={repsErrorId}
              className="mt-1 text-xs text-destructive"
              role="alert"
            >
              {errors.planned_reps}
            </p>
          )}
        </div>

        {/* Planned Duration */}
        <div>
          <label
            htmlFor={durationId}
            className="block text-xs font-medium text-muted-foreground"
          >
            Czas (s)
          </label>
          <Input
            id={durationId}
            type="number"
            min="1"
            step="1"
            value={params.planned_duration_seconds ?? ""}
            onChange={(e) =>
              handleNumberChange("planned_duration_seconds", e.target.value)
            }
            disabled={disabled}
            placeholder="—"
            className="mt-1"
            aria-invalid={errors.planned_duration_seconds ? "true" : "false"}
            aria-describedby={
              errors.planned_duration_seconds ? durationErrorId : undefined
            }
          />
          {errors.planned_duration_seconds && (
            <p
              id={durationErrorId}
              className="mt-1 text-xs text-destructive"
              role="alert"
            >
              {errors.planned_duration_seconds}
            </p>
          )}
        </div>

        {/* Planned Rest Between Sets */}
        <div>
          <label
            htmlFor={restId}
            className="block text-xs font-medium text-muted-foreground"
          >
            Odpoczynek między seriami (s)
          </label>
          <Input
            id={restId}
            type="number"
            min="0"
            step="1"
            value={params.planned_rest_seconds ?? ""}
            onChange={(e) =>
              handleNumberChange("planned_rest_seconds", e.target.value)
            }
            disabled={disabled}
            placeholder="—"
            className="mt-1"
            aria-invalid={errors.planned_rest_seconds ? "true" : "false"}
            aria-describedby={errors.planned_rest_seconds ? restId : undefined}
          />
          {errors.planned_rest_seconds && (
            <p
              id={restErrorId}
              className="mt-1 text-xs text-destructive"
              role="alert"
            >
              {errors.planned_rest_seconds}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {/* Estimated Set Time */}
      <div>
        <label
          htmlFor={estimatedTimeId}
          className="block text-xs font-medium text-muted-foreground"
        >
          Szacunkowy czas zestawu (s)
        </label>
        <Input
          id={estimatedTimeId}
          type="number"
          min="1"
          step="1"
          value={params.estimated_set_time_seconds ?? ""}
          onChange={(e) =>
            handleNumberChange("estimated_set_time_seconds", e.target.value)
          }
          disabled={disabled}
          placeholder="—"
          className="mt-1"
          aria-invalid={errors.estimated_set_time_seconds ? "true" : "false"}
          aria-describedby={
            errors.estimated_set_time_seconds ? estimatedTimeErrorId : undefined
          }
        />
        {errors.estimated_set_time_seconds && (
          <p
            id={estimatedTimeErrorId}
            className="mt-1 text-xs text-destructive"
            role="alert"
          >
            {errors.estimated_set_time_seconds}
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
