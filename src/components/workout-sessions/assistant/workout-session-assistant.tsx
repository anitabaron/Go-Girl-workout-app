"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SessionDetailDTO } from "@/types";
import {
  type ExerciseFormData,
  type FormErrors,
  type AutosaveStatus,
  exerciseToFormData,
  formDataToAutosaveCommand,
} from "@/types/workout-session-assistant";
import { WorkoutTimer } from "./workout-timer";
import { CurrentExerciseInfo } from "./current-exercise-info";
import { ExerciseExecutionForm } from "./exercise-execution-form";
import { NavigationButtons } from "./navigation-buttons";
import { AutosaveIndicator } from "./autosave-indicator";
import { ExitSessionButton } from "./exit-session-button";

export type WorkoutSessionAssistantProps = {
  readonly sessionId: string;
  readonly initialSession: SessionDetailDTO;
};

/**
 * Główny komponent asystenta treningowego.
 * Zarządza stanem sesji, synchronizacją z API, nawigacją między ćwiczeniami
 * oraz koordynacją wszystkich podkomponentów.
 */
export function WorkoutSessionAssistant({
  sessionId,
  initialSession,
}: Readonly<WorkoutSessionAssistantProps>) {
  const router = useRouter();

  // Stan sesji
  const [session, setSession] = useState<SessionDetailDTO>(initialSession);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(
    () => {
      // Ustaw currentExerciseIndex na podstawie current_position lub 0
      const position = session.current_position ?? 0;
      return position > 0
        ? Math.min(position - 1, session.exercises.length - 1)
        : 0;
    }
  );
  const [isPaused, setIsPaused] = useState(false);
  const [formData, setFormData] = useState<ExerciseFormData>(() =>
    exerciseToFormData(
      session.exercises[currentExerciseIndex] || session.exercises[0]
    )
  );
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [autosaveError, setAutosaveError] = useState<string | undefined>();
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Bieżące ćwiczenie
  const currentExercise = useMemo(
    () => session.exercises[currentExerciseIndex],
    [session.exercises, currentExerciseIndex]
  );

  // Walidacja formularza
  const validateForm = useCallback((data: ExerciseFormData): FormErrors => {
    const errors: FormErrors = {};

    // Jeśli ćwiczenie jest pominięte, walidacja nie jest wymagana
    if (data.is_skipped) {
      return errors;
    }

    // Walidacja set logs: każda seria musi mieć co najmniej jedną metrykę >= 0
    if (data.sets.length === 0) {
      errors._form = [
        "Dodaj co najmniej jedną serię lub zaznacz 'Pomiń ćwiczenie'",
      ];
      return errors;
    }

    const setErrors: Record<number, string> = {};
    let hasValidSet = false;

    data.sets.forEach((set, index) => {
      const hasReps = set.reps !== null && set.reps >= 0;
      const hasDuration =
        set.duration_seconds !== null && set.duration_seconds >= 0;
      const hasWeight = set.weight_kg !== null && set.weight_kg >= 0;

      if (!hasReps && !hasDuration && !hasWeight) {
        setErrors[index] =
          "Podaj co najmniej jedną metrykę (powtórzenia, czas lub wagę)";
      } else {
        hasValidSet = true;
      }

      // Walidacja wartości >= 0
      if (set.reps !== null && set.reps < 0) {
        setErrors[index] = "Liczba powtórzeń nie może być ujemna";
      }
      if (set.duration_seconds !== null && set.duration_seconds < 0) {
        setErrors[index] = "Czas trwania nie może być ujemny";
      }
      if (set.weight_kg !== null && set.weight_kg < 0) {
        setErrors[index] = "Waga nie może być ujemna";
      }
    });

    if (Object.keys(setErrors).length > 0) {
      errors.sets = setErrors;
    }

    if (!hasValidSet) {
      errors._form = [
        "Dodaj co najmniej jedną serię z metrykami lub zaznacz 'Pomiń ćwiczenie'",
      ];
    }

    return errors;
  }, []);

  // Aktualizacja formData przy zmianie ćwiczenia
  useEffect(() => {
    if (currentExercise) {
      setFormData(exerciseToFormData(currentExercise));
      setFormErrors({});
    }
  }, [currentExercise]);

  // Zapisywanie stanu ćwiczenia przez API
  const saveExercise = useCallback(
    async (
      data: ExerciseFormData,
      advanceCursor: boolean
    ): Promise<boolean> => {
      setAutosaveStatus("saving");
      setAutosaveError(undefined);

      try {
        const command = formDataToAutosaveCommand(data, advanceCursor);

        const response = await fetch(
          `/api/workout-sessions/${sessionId}/exercises/${currentExercise.order}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(command),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Błąd zapisu ćwiczenia");
        }

        const result = await response.json();
        const updatedExercise = result.data;

        // Aktualizuj sesję z odpowiedzi
        setSession((prev) => ({
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.order === currentExercise.order ? updatedExercise : ex
          ),
          current_position:
            result.data.cursor?.current_position ?? prev.current_position,
        }));

        setAutosaveStatus("saved");
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Błąd zapisu ćwiczenia";
        setAutosaveError(errorMessage);
        setAutosaveStatus("error");
        toast.error(errorMessage);
        return false;
      }
    },
    [sessionId, currentExercise.order]
  );

  // Obsługa nawigacji next
  const handleNext = useCallback(async () => {
    // Walidacja przed zapisem
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0 && !formData.is_skipped) {
      setFormErrors(errors);
      toast.error("Popraw błędy w formularzu przed zapisem");
      return;
    }

    // Zapisz i przejdź dalej
    const success = await saveExercise(formData, true);
    if (!success) {
      return;
    }

    // Przejście do następnego ćwiczenia
    if (currentExerciseIndex < session.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Ostatnie ćwiczenie - zakończ sesję
      try {
        const response = await fetch(
          `/api/workout-sessions/${sessionId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "completed" }),
          }
        );

        if (response.ok) {
          toast.success("Sesja treningowa zakończona!");
          router.push(`/workout-sessions/${sessionId}`);
        } else {
          toast.error("Błąd podczas zakończenia sesji");
        }
      } catch {
        toast.error("Błąd podczas zakończenia sesji");
      }
    }
  }, [
    formData,
    validateForm,
    saveExercise,
    currentExerciseIndex,
    session.exercises.length,
    sessionId,
    router,
  ]);

  // Obsługa nawigacji previous
  const handlePrevious = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setFormErrors({});
    }
  }, [currentExerciseIndex]);

  // Obsługa pause
  const handlePause = useCallback(async () => {
    // Zapisz stan bez przesuwania kursora
    await saveExercise(formData, false);

    // Aktualizuj status sesji
    try {
      const response = await fetch(
        `/api/workout-sessions/${sessionId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "in_progress" }),
        }
      );

      if (response.ok) {
        setIsPaused(true);
      } else {
        toast.error("Błąd podczas pauzowania sesji");
      }
    } catch {
      toast.error("Błąd podczas pauzowania sesji");
    }
  }, [formData, saveExercise, sessionId]);

  // Obsługa resume
  const handleResume = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/workout-sessions/${sessionId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "in_progress" }),
        }
      );

      if (response.ok) {
        setIsPaused(false);
      } else {
        toast.error("Błąd podczas wznawiania sesji");
      }
    } catch {
      toast.error("Błąd podczas wznawiania sesji");
    }
  }, [sessionId]);

  // Obsługa skip
  const handleSkip = useCallback(async () => {
    // Przy skip, ustawiamy is_skipped: true i możemy mieć puste sets
    const skippedData: ExerciseFormData = {
      actual_count_sets: null,
      actual_sum_reps: null,
      actual_duration_seconds: null,
      actual_rest_seconds: null,
      sets: [], // Skip może być wykonany z pustymi set logs
      is_skipped: true,
    };

    const success = await saveExercise(skippedData, true);
    if (!success) {
      return;
    }

    // Przejście do następnego ćwiczenia
    if (currentExerciseIndex < session.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Ostatnie ćwiczenie - zakończ sesję
      try {
        const response = await fetch(
          `/api/workout-sessions/${sessionId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "completed" }),
          }
        );

        if (response.ok) {
          toast.success("Sesja treningowa zakończona!");
          router.push(`/workout-sessions/${sessionId}`);
        } else {
          toast.error("Błąd podczas zakończenia sesji");
        }
      } catch {
        toast.error("Błąd podczas zakończenia sesji");
      }
    }
  }, [
    saveExercise,
    currentExerciseIndex,
    session.exercises.length,
    sessionId,
    router,
  ]);

  // Obsługa wyjścia
  const handleExit = useCallback(() => {
    router.push("/workout-sessions");
  }, [router]);

  // Obliczanie czy można przejść dalej
  const canGoNext = useMemo(() => {
    // Jeśli ćwiczenie jest pominięte, zawsze można przejść dalej
    if (formData.is_skipped) return true;

    // Jeśli nie ma serii, nie można przejść dalej (chyba że skip)
    if (formData.sets.length === 0) return false;

    // Walidacja: wszystkie serie muszą mieć co najmniej jedną metrykę
    const errors = validateForm(formData);
    return Object.keys(errors).length === 0;
  }, [formData, validateForm]);

  const canGoPrevious = currentExerciseIndex > 0;

  if (!currentExercise) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-secondary">
        <p className="text-lg">Brak ćwiczeń w sesji</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-secondary overflow-hidden">
      {/* Exit button */}
      <ExitSessionButton onExit={handleExit} />

      {/* Autosave indicator */}
      <AutosaveIndicator status={autosaveStatus} errorMessage={autosaveError} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
          {/* Timer */}
          <WorkoutTimer
            startedAt={session.started_at}
            isPaused={isPaused}
            currentExerciseName={currentExercise.exercise_title_at_time}
            currentSetNumber={
              formData.sets.length > 0
                ? formData.sets.at(-1)?.set_number ?? 1
                : 1
            }
            currentExerciseIndex={currentExerciseIndex}
            totalExercises={session.exercises.length}
          />

          {/* Exercise info */}
          <CurrentExerciseInfo exercise={currentExercise} />

          {/* Exercise form */}
          <ExerciseExecutionForm
            exercise={currentExercise}
            onChange={setFormData}
            errors={formErrors}
          />
        </div>
      </div>

      {/* Navigation buttons - fixed at bottom */}
      <div className="border-t border-border bg-white p-4 dark:border-border dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-4xl">
          <NavigationButtons
            onPrevious={handlePrevious}
            onPause={handlePause}
            onResume={handleResume}
            onSkip={handleSkip}
            onNext={handleNext}
            isPaused={isPaused}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            isLoading={autosaveStatus === "saving"}
          />
        </div>
      </div>
    </div>
  );
}
