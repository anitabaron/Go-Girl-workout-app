import type {
  SessionDetailDTO,
  SessionExerciseDTO,
  SessionExerciseSetCommand,
} from "../types";

/**
 * ViewModel dla formularza wykonania ćwiczenia.
 */
export type ExerciseFormData = {
  actual_count_sets: number | null;
  actual_sum_reps: number | null;
  actual_duration_seconds: number | null;
  actual_rest_seconds: number | null;
  sets: SetLogFormData[];
  is_skipped: boolean;
};

/**
 * Dane pojedynczej serii w formularzu.
 */
export type SetLogFormData = {
  set_number: number;
  reps: number | null;
  duration_seconds: number | null;
  weight_kg: number | null;
};

/**
 * Błędy walidacji formularza.
 */
export type FormErrors = {
  actual_count_sets?: string;
  actual_sum_reps?: string;
  actual_duration_seconds?: string;
  actual_rest_seconds?: string;
  sets?: Record<number, string>; // klucz: index serii, wartość: komunikat błędu
  _form?: string[]; // błędy globalne
};

/**
 * Status autosave.
 */
export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Stan głównego komponentu asystenta.
 */
export type WorkoutSessionAssistantState = {
  session: SessionDetailDTO;
  currentExerciseIndex: number;
  isPaused: boolean;
  formData: ExerciseFormData;
  autosaveStatus: AutosaveStatus;
  autosaveError?: string;
};

/**
 * Funkcje pomocnicze do konwersji między DTO a ViewModel.
 */

/**
 * Konwertuje SessionExerciseDTO do ExerciseFormData.
 */
export function exerciseToFormData(
  exercise: SessionExerciseDTO
): ExerciseFormData {
  return {
    actual_count_sets: exercise.actual_count_sets,
    actual_sum_reps: exercise.actual_sum_reps,
    actual_duration_seconds: exercise.actual_duration_seconds,
    actual_rest_seconds: exercise.actual_rest_seconds,
    sets: exercise.sets.map((set) => ({
      set_number: set.set_number,
      reps: set.reps,
      duration_seconds: set.duration_seconds,
      weight_kg: set.weight_kg,
    })),
    is_skipped: exercise.is_skipped,
  };
}

/**
 * Konwertuje ExerciseFormData do SessionExerciseAutosaveCommand.
 * Uwaga: actual_rest_seconds nie jest obsługiwane przez API (nie jest potrzebne).
 */
export function formDataToAutosaveCommand(
  formData: ExerciseFormData,
  advanceCursor?: boolean
): {
  actual_count_sets?: number | null;
  actual_sum_reps?: number | null;
  actual_duration_seconds?: number | null;
  is_skipped?: boolean;
  sets?: SessionExerciseSetCommand[];
  advance_cursor_to_next?: boolean;
} {
  const command: {
    actual_count_sets?: number | null;
    actual_sum_reps?: number | null;
    actual_duration_seconds?: number | null;
    is_skipped?: boolean;
    sets?: SessionExerciseSetCommand[];
    advance_cursor_to_next?: boolean;
  } = {
    actual_count_sets: formData.actual_count_sets,
    actual_sum_reps: formData.actual_sum_reps,
    actual_duration_seconds: formData.actual_duration_seconds,
    // actual_rest_seconds nie jest obsługiwane przez API
    is_skipped: formData.is_skipped,
    advance_cursor_to_next: advanceCursor,
  };

  // Jeśli sets nie jest puste, wyślij zmapowane sets
  // Jeśli sets jest puste, ale ćwiczenie jest pominięte, wyślij pustą tablicę aby wyczyścić istniejące serie
  // Jeśli sets jest puste i ćwiczenie nie jest pominięte, nie wysyłaj sets (undefined = opcjonalne pole nie jest wysyłane)
  if (formData.sets.length > 0) {
    command.sets = formData.sets.map((set) => ({
      set_number: set.set_number,
      reps: set.reps,
      duration_seconds: set.duration_seconds,
      weight_kg: set.weight_kg,
    }));
  } else if (formData.is_skipped) {
    // Gdy ćwiczenie jest pominięte i sets jest puste, wyślij pustą tablicę aby wyczyścić istniejące serie
    command.sets = [];
  }

  return command;
}
