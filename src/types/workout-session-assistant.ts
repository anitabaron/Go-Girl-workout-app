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
 * Typy dla timera ćwiczenia.
 */

/**
 * Stan timera ćwiczenia (discriminated union).
 */
export type ExerciseTimerState =
  | { type: "waiting" } // Oczekiwanie na rozpoczęcie
  | { type: "set_countdown"; setNumber: number; remainingSeconds: number } // Odliczanie czasu serii
  | { type: "reps_display"; setNumber: number; reps: number } // Wyświetlanie powtórzeń
  | { type: "rest_between_sets"; remainingSeconds: number } // Przerwa między seriami
  | { type: "rest_after_series"; remainingSeconds: number }; // Przerwa po seriach

/**
 * Props głównego komponentu timera ćwiczenia.
 */
export type ExerciseTimerProps = {
  exercise: SessionExerciseDTO;
  currentSetNumber: number;
  isPaused: boolean;
  onSetComplete: () => void;
  onRestBetweenComplete: () => void;
  onRestAfterSeriesComplete: () => void;
  onRepsComplete: () => void;
  /** Nazwa kolejnego ćwiczenia (przekazywana do timera przerwy po seriach). */
  nextExerciseName?: string | null;
  /** Czy to ostatnie ćwiczenie w treningu. */
  isLastExercise?: boolean;
};

/**
 * Props komponentu odliczania czasu serii.
 */
export type SetCountdownTimerProps = {
  durationSeconds: number;
  isPaused: boolean;
  sideLabel?: UnilateralSide | null;
  onComplete: () => void;
};

/**
 * Strona dla ćwiczeń unilateralnych.
 */
export type UnilateralSide = "one_side" | "other_side";

/**
 * Props komponentu wyświetlania powtórzeń.
 */
export type RepsDisplayProps = {
  reps: number;
  setNumber: number;
  sideLabel?: UnilateralSide | null;
  onComplete: () => void;
};

/**
 * Props komponentu odliczania przerwy między seriami.
 */
export type RestBetweenSetsTimerProps = {
  restSeconds: number;
  isPaused: boolean;
  onComplete: () => void;
};

/**
 * Props komponentu odliczania przerwy po seriach.
 */
export type RestAfterSeriesTimerProps = {
  restSeconds: number;
  isPaused: boolean;
  onComplete: () => void;
  /** Nazwa kolejnego ćwiczenia (np. do komunikatu "Get ready: …"). */
  nextExerciseName?: string | null;
  /** Czy to ostatnie ćwiczenie w treningu (wyświetl "End of workout"). */
  isLastExercise?: boolean;
};

/**
 * Funkcje pomocnicze do konwersji między DTO a ViewModel.
 */

function mapSetsFromExercise(exercise: SessionExerciseDTO): SetLogFormData[] {
  if (exercise.sets && exercise.sets.length > 0) {
    return exercise.sets.map((set) => ({
      set_number: set.set_number,
      reps: set.reps,
      duration_seconds: set.duration_seconds,
      weight_kg: set.weight_kg,
    }));
  }
  if (exercise.planned_sets != null && exercise.planned_sets > 0) {
    return Array.from({ length: exercise.planned_sets }, (_, i) => ({
      set_number: i + 1,
      reps: exercise.planned_reps ?? null,
      duration_seconds: exercise.planned_duration_seconds ?? null,
      weight_kg: null,
    }));
  }
  return [];
}

function computeActualsFromSets(
  sets: SetLogFormData[],
  exercise: SessionExerciseDTO,
): {
  actual_count_sets: number | null;
  actual_sum_reps: number | null;
  actual_duration_seconds: number | null;
} {
  let actual_count_sets = exercise.actual_count_sets;
  let actual_sum_reps = exercise.actual_sum_reps;
  let actual_duration_seconds = exercise.actual_duration_seconds;

  if (sets.length === 0) {
    return { actual_count_sets, actual_sum_reps, actual_duration_seconds };
  }

  actual_count_sets ??= sets.length;
  if (actual_sum_reps == null) {
    const sum = sets.reduce((acc, s) => acc + (s.reps ?? 0), 0);
    actual_sum_reps = sum > 0 ? sum : null;
  }
  if (actual_duration_seconds == null) {
    const durations = sets
      .map((s) => s.duration_seconds)
      .filter((d): d is number => d != null);
    actual_duration_seconds =
      durations.length > 0 ? Math.max(...durations) : null;
  }

  return { actual_count_sets, actual_sum_reps, actual_duration_seconds };
}

/**
 * Konwertuje SessionExerciseDTO do ExerciseFormData.
 * Gdy exercise.sets jest puste, ale są dane planowane (planned_sets > 0),
 * tworzy wstępne serie z planowanych wartości - pozwala to na aktywny przycisk
 * Next od początku treningu (zatwierdzenie treningu zgodnego z planem).
 */
export function exerciseToFormData(
  exercise: SessionExerciseDTO,
): ExerciseFormData {
  const sets = mapSetsFromExercise(exercise);
  const { actual_count_sets, actual_sum_reps, actual_duration_seconds } =
    computeActualsFromSets(sets, exercise);

  return {
    actual_count_sets,
    actual_sum_reps,
    actual_duration_seconds,
    actual_rest_seconds: exercise.actual_rest_seconds,
    sets,
    is_skipped: exercise.is_skipped ?? false,
  };
}

/**
 * Konwertuje ExerciseFormData do SessionExerciseAutosaveCommand.
 * Uwaga: actual_rest_seconds nie jest obsługiwane przez API (nie jest potrzebne).
 *
 * Gdy actual_count_sets/actual_sum_reps/actual_duration_seconds są null, ale mamy serie,
 * oblicza agregaty z serii - zapewnia zapis do DB i wyświetlanie w PlannedVsActualComparison.
 */
export function formDataToAutosaveCommand(
  formData: ExerciseFormData,
  advanceCursor?: boolean,
): {
  actual_count_sets?: number | null;
  actual_sum_reps?: number | null;
  actual_duration_seconds?: number | null;
  is_skipped?: boolean;
  sets?: SessionExerciseSetCommand[];
  advance_cursor_to_next?: boolean;
} {
  let actual_count_sets = formData.actual_count_sets;
  let actual_sum_reps = formData.actual_sum_reps;
  let actual_duration_seconds = formData.actual_duration_seconds;

  // Oblicz agregaty z serii gdy są null (np. przy zatwierdzeniu planowanych wartości przez Next)
  if (formData.sets.length > 0) {
    actual_count_sets ??= formData.sets.length;
    if (actual_sum_reps == null) {
      const sum = formData.sets.reduce((acc, set) => acc + (set.reps ?? 0), 0);
      actual_sum_reps = sum > 0 ? sum : null;
    }
    if (actual_duration_seconds == null) {
      const durations = formData.sets
        .map((s) => s.duration_seconds)
        .filter((d): d is number => d != null);
      actual_duration_seconds =
        durations.length > 0 ? Math.max(...durations) : null;
    }
  }

  const command: {
    actual_count_sets?: number | null;
    actual_sum_reps?: number | null;
    actual_duration_seconds?: number | null;
    is_skipped?: boolean;
    sets?: SessionExerciseSetCommand[];
    advance_cursor_to_next?: boolean;
  } = {
    actual_count_sets,
    actual_sum_reps,
    actual_duration_seconds,
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
