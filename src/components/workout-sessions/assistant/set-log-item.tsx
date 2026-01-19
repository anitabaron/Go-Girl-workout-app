"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SetLogFormData } from "@/types/workout-session-assistant";

type SetLogItemProps = {
  set: SetLogFormData;
  onChange: (set: SetLogFormData) => void;
  onRemove: () => void;
  error?: string;
  showDuration?: boolean; // czy pokazać pole czasu trwania
};

/**
 * Komponent reprezentujący pojedynczą serię ćwiczenia.
 * Zawiera pola: set_number (read-only), reps, duration_seconds, weight_kg.
 * Walidacja: co najmniej jedna metryka (reps/duration/weight) z wartością >= 0.
 */
export function SetLogItem({ set, onChange, onRemove, error, showDuration = true }: SetLogItemProps) {
  const handleChange = (field: keyof SetLogFormData, value: string) => {
    const numValue = value === "" ? null : Number.parseFloat(value);
    onChange({
      ...set,
      [field]: numValue,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:border-border dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Numer serii (read-only badge) */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Seria:
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-destructive">
              {set.set_number}
            </span>
          </div>

          {/* Pola metryk */}
          <div className={`grid grid-cols-2 gap-3 ${showDuration ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div>
              <label
                htmlFor={`reps-${set.set_number}`}
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Powtórzenia
              </label>
              <Input
                id={`reps-${set.set_number}`}
                type="number"
                min="0"
                step="1"
                value={set.reps ?? ""}
                onChange={(e) => handleChange("reps", e.target.value)}
                placeholder="0"
                aria-label={`Powtórzenia dla serii ${set.set_number}`}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? `error-${set.set_number}` : undefined}
              />
            </div>

            {showDuration && (
              <div>
                <label
                  htmlFor={`duration-${set.set_number}`}
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Czas (sekundy)
                </label>
                <Input
                  id={`duration-${set.set_number}`}
                  type="number"
                  min="0"
                  step="1"
                  value={set.duration_seconds ?? ""}
                  onChange={(e) => handleChange("duration_seconds", e.target.value)}
                  placeholder="0"
                  aria-label={`Czas trwania dla serii ${set.set_number}`}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? `error-${set.set_number}` : undefined}
                />
              </div>
            )}

            <div>
              <label
                htmlFor={`weight-${set.set_number}`}
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Waga (kg)
              </label>
              <Input
                id={`weight-${set.set_number}`}
                type="number"
                min="0"
                step="0.1"
                value={set.weight_kg ?? ""}
                onChange={(e) => handleChange("weight_kg", e.target.value)}
                placeholder="0"
                aria-label={`Waga dla serii ${set.set_number}`}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? `error-${set.set_number}` : undefined}
              />
            </div>
          </div>

          {/* Komunikat błędu walidacji */}
          {error && (
            <p
              id={`error-${set.set_number}`}
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        {/* Przycisk usunięcia serii */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label={`Usuń serię ${set.set_number}`}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
