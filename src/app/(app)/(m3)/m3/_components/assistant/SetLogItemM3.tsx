"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SetLogFormData } from "@/types/workout-session-assistant";

type SetLogItemM3Props = {
  set: SetLogFormData;
  onChange: (set: SetLogFormData) => void;
  onRemove: () => void;
  error?: string;
  showDuration?: boolean;
  showReps?: boolean;
  isSkipped?: boolean;
};

export function SetLogItemM3({
  set,
  onChange,
  onRemove,
  error,
  showDuration,
  showReps,
  isSkipped = false,
}: Readonly<SetLogItemM3Props>) {
  const handleChange = (field: keyof SetLogFormData, value: string) => {
    const numValue = value === "" ? null : Number.parseFloat(value);
    onChange({
      ...set,
      [field]: numValue,
    });
  };

  return (
    <div className="rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-high)] p-4 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="shrink-0">
            <span
              className="mb-1 block text-sm font-medium text-foreground"
              aria-hidden
            >
              Set
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--m3-raw-primary-container)] text-sm font-semibold text-destructive"
              aria-label={`Set ${set.set_number}`}
            >
              {set.set_number}
            </div>
          </div>

          {showReps && (
            <div className="min-w-0 flex-1 basis-20">
              <label
                htmlFor={`reps-${set.set_number}`}
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Reps
              </label>
              <Input
                id={`reps-${set.set_number}`}
                type="number"
                min="0"
                step="1"
                value={set.reps ?? ""}
                onChange={(e) => handleChange("reps", e.target.value)}
                placeholder="0"
                disabled={isSkipped}
                aria-label={`Reps for set ${set.set_number}`}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={
                  error ? `error-${set.set_number}` : undefined
                }
              />
            </div>
          )}

          {showDuration && (
            <div className="min-w-0 flex-1 basis-24">
              <label
                htmlFor={`duration-${set.set_number}`}
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Time (seconds)
              </label>
              <Input
                id={`duration-${set.set_number}`}
                type="number"
                min="0"
                step="1"
                value={set.duration_seconds ?? ""}
                onChange={(e) =>
                  handleChange("duration_seconds", e.target.value)
                }
                placeholder="0"
                disabled={isSkipped}
                aria-label={`Duration for set ${set.set_number}`}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={
                  error ? `error-${set.set_number}` : undefined
                }
              />
            </div>
          )}

          <div className="min-w-0 flex-1 basis-24">
            <label
              htmlFor={`weight-${set.set_number}`}
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Weight (kg)
            </label>
            <Input
              id={`weight-${set.set_number}`}
              type="number"
              min="0"
              step="0.1"
              value={set.weight_kg ?? ""}
              onChange={(e) => handleChange("weight_kg", e.target.value)}
              placeholder="0"
              disabled={isSkipped}
              aria-label={`Weight for set ${set.set_number}`}
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? `error-${set.set_number}` : undefined}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={isSkipped}
          className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label={`Remove set ${set.set_number}`}
        >
          <X className="size-4" />
        </Button>
      </div>

      {error && (
        <p
          id={`error-${set.set_number}`}
          className="mt-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
