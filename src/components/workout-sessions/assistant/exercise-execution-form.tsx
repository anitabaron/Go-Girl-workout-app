"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { SetLogsList } from "./set-logs-list";
import type { SessionExerciseDTO } from "@/types";
import type {
  ExerciseFormData,
  FormErrors,
  SetLogFormData,
} from "@/types/workout-session-assistant";
import { exerciseToFormData } from "@/types/workout-session-assistant";

type ExerciseExecutionFormProps = {
  exercise: SessionExerciseDTO;
  onChange: (data: ExerciseFormData) => void;
  errors?: FormErrors;
};

/**
 * Formularz wprowadzania faktycznego wykonania ćwiczenia.
 * Zawiera pola actual_*, listę set logs oraz checkbox do pominięcia ćwiczenia.
 */
export function ExerciseExecutionForm({
  exercise,
  onChange,
  errors,
}: ExerciseExecutionFormProps) {
  // Inicjalizacja formData z danych ćwiczenia
  const initialFormData = useMemo(
    () => exerciseToFormData(exercise),
    [exercise]
  );

  const [formData, setFormData] = useState<ExerciseFormData>(
    initialFormData
  );

  // Aktualizuj formData gdy zmienia się ćwiczenie
  useEffect(() => {
    setFormData(exerciseToFormData(exercise));
  }, [exercise]);

  // Obliczanie actual_* z set logs (jeśli nie są ręcznie edytowane)
  const calculateActuals = useCallback((sets: SetLogFormData[]) => {
    const actualCountSets = sets.length;
    const actualSumReps = sets.reduce(
      (sum, set) => sum + (set.reps ?? 0),
      0
    );
    const actualDurationSeconds = sets.reduce(
      (max, set) => Math.max(max, set.duration_seconds ?? 0),
      0
    );
    // actual_rest_seconds - można użyć planned_rest_seconds lub najdłuższej przerwy z serii
    const actualRestSeconds = exercise.planned_rest_seconds ?? null;

    return {
      actual_count_sets: actualCountSets > 0 ? actualCountSets : null,
      actual_sum_reps: actualSumReps > 0 ? actualSumReps : null,
      actual_duration_seconds: actualDurationSeconds > 0 ? actualDurationSeconds : null,
      actual_rest_seconds: actualRestSeconds,
    };
  }, [exercise.planned_rest_seconds]);

  // Aktualizacja formData i wywołanie onChange
  const updateFormData = useCallback(
    (updates: Partial<ExerciseFormData>) => {
      const newFormData = { ...formData, ...updates };
      
      // Jeśli zaktualizowano sets, przelicz actual_*
      if (updates.sets !== undefined) {
        const calculated = calculateActuals(updates.sets);
        newFormData.actual_count_sets = calculated.actual_count_sets;
        newFormData.actual_sum_reps = calculated.actual_sum_reps;
        newFormData.actual_duration_seconds = calculated.actual_duration_seconds;
        newFormData.actual_rest_seconds = calculated.actual_rest_seconds;
      }

      setFormData(newFormData);
      onChange(newFormData);
    },
    [formData, onChange, calculateActuals]
  );

  // Obsługa zmian w polach actual_*
  const handleActualChange = useCallback(
    (field: keyof ExerciseFormData, value: string) => {
      const numValue = value === "" ? null : Number.parseFloat(value);
      updateFormData({ [field]: numValue });
    },
    [updateFormData]
  );

  // Obsługa dodania nowej serii
  const handleSetAdd = useCallback(() => {
    const nextSetNumber =
      formData.sets.length > 0
        ? Math.max(...formData.sets.map((s) => s.set_number)) + 1
        : 1;

    const newSet: SetLogFormData = {
      set_number: nextSetNumber,
      reps: null,
      duration_seconds: null,
      weight_kg: null,
    };

    updateFormData({
      sets: [...formData.sets, newSet],
    });
  }, [formData.sets, updateFormData]);

  // Obsługa aktualizacji serii
  const handleSetUpdate = useCallback(
    (index: number, set: SetLogFormData) => {
      const newSets = [...formData.sets];
      newSets[index] = set;
      updateFormData({ sets: newSets });
    },
    [formData.sets, updateFormData]
  );

  // Obsługa usunięcia serii
  const handleSetRemove = useCallback(
    (index: number) => {
      const newSets = formData.sets.filter((_, i) => i !== index);
      updateFormData({ sets: newSets });
    },
    [formData.sets, updateFormData]
  );

  // Obsługa przełączenia checkboxa skip
  const handleSkipToggle = useCallback(
    (checked: boolean) => {
      updateFormData({ is_skipped: checked });
    },
    [updateFormData]
  );

  return (
    <div className="space-y-6 rounded-lg border border-border bg-white p-4 shadow-sm dark:border-border dark:bg-zinc-950">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Wykonanie ćwiczenia
      </h3>

      {/* Pola actual_* (opcjonalne, obliczane automatycznie z set logs, ale możliwe do ręcznej edycji) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label
            htmlFor="actual_count_sets"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Liczba serii
          </label>
          <Input
            id="actual_count_sets"
            type="number"
            min="0"
            step="1"
            value={formData.actual_count_sets ?? ""}
            onChange={(e) => handleActualChange("actual_count_sets", e.target.value)}
            placeholder="0"
            aria-label="Liczba wykonanych serii"
            aria-invalid={errors?.actual_count_sets ? "true" : "false"}
            aria-describedby={errors?.actual_count_sets ? "error-actual_count_sets" : undefined}
          />
          {errors?.actual_count_sets && (
            <p
              id="error-actual_count_sets"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.actual_count_sets}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="actual_sum_reps"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Suma powtórzeń
          </label>
          <Input
            id="actual_sum_reps"
            type="number"
            min="0"
            step="1"
            value={formData.actual_sum_reps ?? ""}
            onChange={(e) => handleActualChange("actual_sum_reps", e.target.value)}
            placeholder="0"
            aria-label="Suma powtórzeń"
            aria-invalid={errors?.actual_sum_reps ? "true" : "false"}
            aria-describedby={errors?.actual_sum_reps ? "error-actual_sum_reps" : undefined}
          />
          {errors?.actual_sum_reps && (
            <p
              id="error-actual_sum_reps"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.actual_sum_reps}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="actual_duration_seconds"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Czas trwania (sekundy)
          </label>
          <Input
            id="actual_duration_seconds"
            type="number"
            min="0"
            step="1"
            value={formData.actual_duration_seconds ?? ""}
            onChange={(e) => handleActualChange("actual_duration_seconds", e.target.value)}
            placeholder="0"
            aria-label="Czas trwania w sekundach"
            aria-invalid={errors?.actual_duration_seconds ? "true" : "false"}
            aria-describedby={errors?.actual_duration_seconds ? "error-actual_duration_seconds" : undefined}
          />
          {errors?.actual_duration_seconds && (
            <p
              id="error-actual_duration_seconds"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.actual_duration_seconds}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="actual_rest_seconds"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Przerwa (sekundy)
          </label>
          <Input
            id="actual_rest_seconds"
            type="number"
            min="0"
            step="1"
            value={formData.actual_rest_seconds ?? ""}
            onChange={(e) => handleActualChange("actual_rest_seconds", e.target.value)}
            placeholder="0"
            aria-label="Czas przerwy w sekundach"
            aria-invalid={errors?.actual_rest_seconds ? "true" : "false"}
            aria-describedby={errors?.actual_rest_seconds ? "error-actual_rest_seconds" : undefined}
          />
          {errors?.actual_rest_seconds && (
            <p
              id="error-actual_rest_seconds"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.actual_rest_seconds}
            </p>
          )}
        </div>
      </div>

      {/* Lista serii */}
      <SetLogsList
        sets={formData.sets}
        onAdd={handleSetAdd}
        onUpdate={handleSetUpdate}
        onRemove={handleSetRemove}
        errors={errors?.sets}
      />

      {/* Checkbox "Pomiń ćwiczenie" */}
      <div className="flex items-center gap-2">
        <input
          id="is_skipped"
          type="checkbox"
          checked={formData.is_skipped}
          onChange={(e) => handleSkipToggle(e.target.checked)}
          className="h-4 w-4 rounded border-border text-destructive focus:ring-2 focus:ring-destructive focus:ring-offset-2"
          aria-label="Pomiń ćwiczenie"
        />
        <label
          htmlFor="is_skipped"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Pomiń ćwiczenie
        </label>
      </div>

      {/* Błędy globalne formularza */}
      {errors?._form && errors._form.length > 0 && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">Błędy formularza:</p>
          <ul className="mt-1 list-disc list-inside text-sm text-destructive">
            {errors._form.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
