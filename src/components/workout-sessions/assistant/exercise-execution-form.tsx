"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
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
  const initialFormData = useMemo(() => {
    const data = exerciseToFormData(exercise);
    
    // Jeśli nie ma serii, ale są dane planowane, utwórz wstępne serie z planu
    if (data.sets.length === 0 && exercise.planned_sets && exercise.planned_sets > 0) {
      const initialSets: SetLogFormData[] = [];
      for (let i = 1; i <= exercise.planned_sets; i++) {
        initialSets.push({
          set_number: i,
          reps: exercise.planned_reps ?? null,
          duration_seconds: exercise.planned_duration_seconds ?? null,
          weight_kg: null, // Waga nie jest planowana, więc pozostaje null
        });
      }
      data.sets = initialSets;
    }
    
    return data;
  }, [exercise]);

  const [formData, setFormData] = useState<ExerciseFormData>(
    initialFormData
  );

  // Ref do śledzenia poprzedniego ćwiczenia, aby uniknąć niepotrzebnych aktualizacji
  const prevExerciseIdRef = useRef<string | number | undefined>(exercise.id);

  // Obliczanie actual_* z set logs (jeśli nie są ręcznie edytowane)
  const calculateActuals = useCallback((sets: SetLogFormData[]) => {
    const actualCountSets = sets.length;
    
    // Oblicz sumę powtórzeń tylko jeśli ćwiczenie ma planowane powtórzenia
    // Jeśli planned_reps jest null, to ćwiczenie jest oparte na czasie, więc nie obliczamy sumy powtórzeń
    let actualSumReps: number | null = null;
    if (exercise.planned_reps !== null && exercise.planned_reps !== undefined) {
      const sum = sets.reduce(
        (sum, set) => sum + (set.reps ?? 0),
        0
      );
      actualSumReps = sum > 0 ? sum : null;
    }
    
    // Oblicz maksymalny czas tylko jeśli ćwiczenie ma planowany czas
    // Jeśli planned_duration_seconds jest null, to ćwiczenie jest oparte na powtórzeniach, więc nie obliczamy czasu
    let actualDurationSeconds: number | null = null;
    if (exercise.planned_duration_seconds !== null && exercise.planned_duration_seconds !== undefined) {
      const durations = sets
        .map((set) => set.duration_seconds)
        .filter((d): d is number => d !== null && d !== undefined);
      if (durations.length > 0) {
        actualDurationSeconds = Math.max(...durations);
      }
    }
    
    // actual_rest_seconds - można użyć planned_rest_seconds lub najdłuższej przerwy z serii
    const actualRestSeconds = exercise.planned_rest_seconds ?? null;

    return {
      actual_count_sets: actualCountSets > 0 ? actualCountSets : null,
      actual_sum_reps: actualSumReps,
      actual_duration_seconds: actualDurationSeconds,
      actual_rest_seconds: actualRestSeconds,
    };
  }, [exercise.planned_reps, exercise.planned_duration_seconds, exercise.planned_rest_seconds]);

  // Aktualizuj formData gdy zmienia się ćwiczenie
  useEffect(() => {
    // Sprawdź, czy ćwiczenie faktycznie się zmieniło
    if (prevExerciseIdRef.current === exercise.id) {
      return;
    }
    
    prevExerciseIdRef.current = exercise.id;
    
    // Użyj startTransition, aby opóźnić aktualizację stanu i uniknąć synchronicznego setState w efekcie
    startTransition(() => {
      const newData = exerciseToFormData(exercise);
      
      // Jeśli nie ma serii, ale są dane planowane, utwórz wstępne serie z planu
      if (newData.sets.length === 0 && exercise.planned_sets && exercise.planned_sets > 0) {
        const initialSets: SetLogFormData[] = [];
        for (let i = 1; i <= exercise.planned_sets; i++) {
          initialSets.push({
            set_number: i,
            reps: exercise.planned_reps ?? null,
            duration_seconds: exercise.planned_duration_seconds ?? null,
            weight_kg: null,
          });
        }
        newData.sets = initialSets;
        
        // Przelicz actual_* dla nowych serii
        const calculated = calculateActuals(initialSets);
        newData.actual_count_sets = calculated.actual_count_sets;
        newData.actual_sum_reps = calculated.actual_sum_reps;
        newData.actual_duration_seconds = calculated.actual_duration_seconds;
        newData.actual_rest_seconds = calculated.actual_rest_seconds;
      }
      
      setFormData(newData);
      onChange(newData);
    });
  }, [exercise, calculateActuals, onChange]);

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

  // Obliczanie wartości podsumowania z serii (tylko do wyświetlenia)
  const summaryValues = useMemo(() => {
    // Jeśli ćwiczenie jest pominięte, zwróć '-' dla wszystkich wartości
    if (formData.is_skipped) {
      return {
        count_sets: '-',
        sum_reps: '-',
        duration_seconds: '-',
        rest_seconds: '-',
      };
    }

    const countSets = formData.sets.length;
    const sumReps = formData.sets.reduce(
      (sum, set) => sum + (set.reps ?? 0),
      0
    );
    const maxDuration = formData.sets.reduce(
      (max, set) => Math.max(max, set.duration_seconds ?? 0),
      0
    );
    const restSeconds = exercise.planned_rest_seconds ?? null;

    return {
      count_sets: countSets > 0 ? countSets : 0,
      sum_reps: sumReps > 0 ? sumReps : 0,
      duration_seconds: maxDuration > 0 ? maxDuration : 0,
      rest_seconds: restSeconds,
    };
  }, [formData.sets, formData.is_skipped, exercise.planned_rest_seconds]);

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
    <div className="space-y-2 rounded-lg border border-border bg-white p-4 shadow-sm dark:border-border dark:bg-zinc-950">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Wykonanie ćwiczenia
      </h3>

      

      {/* Lista serii */}
      <SetLogsList
        sets={formData.sets}
        onAdd={handleSetAdd}
        onUpdate={handleSetUpdate}
        onRemove={handleSetRemove}
        errors={errors?.sets}
        showDuration={exercise.planned_duration_seconds !== null && exercise.planned_duration_seconds !== undefined}
        isSkipped={formData.is_skipped}
      />

     
{/* Podsumowanie - wartości obliczane z serii (tylko do wyświetlenia) */}
<div className="grid grid-cols-2 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Liczba serii
          </label>
          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-zinc-900 dark:text-zinc-50">
            {summaryValues.count_sets}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Suma powtórzeń
          </label>
          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-zinc-900 dark:text-zinc-50">
            {summaryValues.sum_reps}
          </div>
        </div>

        {/* Pokaż czas trwania tylko jeśli plan ma planned_duration_seconds */}
        {exercise.planned_duration_seconds !== null &&
          exercise.planned_duration_seconds !== undefined && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Czas trwania (sekundy)
              </label>
              <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-zinc-900 dark:text-zinc-50">
                {summaryValues.duration_seconds}
              </div>
            </div>
          )}
      </div>
 {/* Checkbox "Pomiń ćwiczenie" */}
 <div className="flex items-center gap-2">
        <input
          id="is_skipped"
          type="checkbox"
          checked={formData.is_skipped}
          onChange={(e) => handleSkipToggle(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-destructive focus:ring-2 focus:ring-destructive focus:ring-offset-2"
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
