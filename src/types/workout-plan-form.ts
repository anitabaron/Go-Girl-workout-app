import type {
  WorkoutPlanDTO,
  WorkoutPlanExerciseDTO,
  ExerciseDTO,
  ExercisePart,
  ExerciseType,
} from "@/types";

/**
 * ViewModel - stan pojedynczego ćwiczenia w planie treningowym
 */
export type WorkoutPlanExerciseItemState = {
  // Identyfikatory
  id?: string; // ID ćwiczenia w planie (tylko w trybie edycji)
  exercise_id: string | null; // ID ćwiczenia z biblioteki (może być null dla importowanych planów)
  // Metadane ćwiczenia (tylko do wyświetlenia, nie edytowalne w formularzu)
  exercise_title?: string; // Nazwa ćwiczenia (z ExerciseDTO)
  exercise_type?: ExerciseType; // Type ćwiczenia (z ExerciseDTO)
  exercise_part?: ExercisePart; // Part ćwiczenia (z ExerciseDTO)
  exercise_is_unilateral?: boolean; // Czy ćwiczenie jest unilateralne
  // Parametry planu
  section_type: ExerciseType; // Warm-up | Main Workout | Cool-down
  section_order: number; // Kolejność w sekcji (> 0)
  scope_id?: string | null; // Scope block id; null = single exercise
  in_scope_nr?: number | null; // Order within scope (1,2,3…); null = not in scope
  scope_repeat_count?: number | null; // How many times to repeat scope
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  planned_rest_after_series_seconds: number | null;
  estimated_set_time_seconds: number | null;
};

/**
 * ViewModel - stan parametrów planowanych
 */
export type PlannedParamsState = {
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  planned_rest_after_series_seconds: number | null;
  estimated_set_time_seconds: number | null;
};

/**
 * ViewModel - stan formularza planu treningowego
 */
export type WorkoutPlanFormState = {
  name: string;
  description: string | null;
  part: ExercisePart | null;
  exercises: WorkoutPlanExerciseItemState[];
};

/**
 * Błędy walidacji formularza
 */
export type WorkoutPlanFormErrors = {
  name?: string;
  description?: string;
  part?: string;
  exercises?: Record<string, string>; // Błędy per ćwiczenie (klucz: index)
  _form?: string[]; // Błędy na poziomie formularza (reguły biznesowe)
};

/**
 * Props dla WorkoutPlanForm
 */
export type WorkoutPlanFormProps = {
  initialData?: WorkoutPlanDTO;
  mode: "create" | "edit";
};

/**
 * Props dla WorkoutPlanMetadataFields
 */
export type WorkoutPlanMetadataFieldsProps = {
  fields: {
    name: string;
    description: string | null;
    part: ExercisePart | null;
  };
  errors: {
    name?: string;
    description?: string;
    part?: string;
  };
  onChange: (field: string, value: unknown) => void;
  onBlur: (field: string) => void;
  disabled: boolean;
};

/**
 * Props dla WorkoutPlanExercisesList
 */
export type WorkoutPlanExercisesListProps = {
  exercises: WorkoutPlanExerciseItemState[];
  onRemoveExercise: (index: number) => void;
  onUpdateExercise: (
    index: number,
    exercise: Partial<WorkoutPlanExerciseItemState>,
  ) => void;
  onMoveExercise: (index: number, direction: "up" | "down") => void;
  errors: Record<string, string>;
  disabled: boolean;
  "data-test-id"?: string;
};

/**
 * Props dla WorkoutPlanExerciseItem
 */
export type WorkoutPlanExerciseItemProps = {
  exercise: WorkoutPlanExerciseItemState;
  index: number;
  exercises: WorkoutPlanExerciseItemState[]; // Wszystkie ćwiczenia, aby sprawdzić możliwość przesunięcia
  onChange: (updates: Partial<WorkoutPlanExerciseItemState>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  errors: Record<string, string>;
  disabled: boolean;
};

/**
 * Props dla PlannedParamsEditor
 */
export type PlannedParamsEditorProps = {
  params: PlannedParamsState;
  onChange: (field: string, value: number | null) => void;
  errors: Record<string, string>;
  disabled: boolean;
  "data-test-id-prefix"?: string;
};

/**
 * Props dla AddExerciseDialog
 */
export type AddExerciseDialogProps = {
  onAddExercise: (exercises: ExerciseDTO[]) => void;
  disabled: boolean;
  existingExerciseIds?: string[];
};

/**
 * Props dla ExerciseSelector
 */
export type ExerciseSelectorProps = {
  selectedExerciseIds: string[];
  onToggleExercise: (exercise: ExerciseDTO) => void;
  excludedExerciseIds?: string[];
};

/**
 * Props dla SaveButton
 */
export type SaveButtonProps = {
  isLoading: boolean;
  disabled: boolean;
};

/**
 * Props dla CancelButton
 */
export type CancelButtonProps = {
  hasUnsavedChanges: boolean;
  onCancel?: () => void;
};

/**
 * Funkcja pomocnicza do konwersji WorkoutPlanDTO na WorkoutPlanFormState
 */
export function dtoToFormState(dto?: WorkoutPlanDTO): WorkoutPlanFormState {
  if (!dto) {
    return {
      name: "",
      description: null,
      part: null,
      exercises: [],
    };
  }

  return {
    name: dto.name,
    description: dto.description,
    part: dto.part,
    exercises: dto.exercises.map((exercise) => ({
      id: exercise.id,
      exercise_id: exercise.exercise_id,
      exercise_title: exercise.exercise_title ?? undefined,
      exercise_type: exercise.exercise_type ?? undefined,
      exercise_part: exercise.exercise_part ?? undefined,
      exercise_is_unilateral: exercise.exercise_is_unilateral ?? undefined,
      section_type: exercise.section_type,
      section_order: exercise.section_order,
      scope_id: exercise.scope_id ?? undefined,
      in_scope_nr: exercise.in_scope_nr ?? undefined,
      scope_repeat_count: exercise.scope_repeat_count ?? undefined,
      planned_sets: exercise.planned_sets,
      planned_reps: exercise.planned_reps,
      planned_duration_seconds: exercise.planned_duration_seconds,
      planned_rest_seconds: exercise.planned_rest_seconds,
      planned_rest_after_series_seconds:
        exercise.planned_rest_after_series_seconds ??
        exercise.exercise_rest_after_series_seconds ??
        null,
      estimated_set_time_seconds:
        exercise.exercise_estimated_set_time_seconds ?? null,
    })),
  };
}

/**
 * Funkcja pomocnicza do konwersji WorkoutPlanExerciseDTO na WorkoutPlanExerciseItemState
 * Wymaga ExerciseDTO do pobrania metadanych ćwiczenia
 */
export function exerciseDtoToItemState(
  exerciseDto: WorkoutPlanExerciseDTO,
  exerciseMetadata?: ExerciseDTO,
): WorkoutPlanExerciseItemState {
  return {
    id: exerciseDto.id,
    exercise_id: exerciseDto.exercise_id,
    exercise_title: exerciseMetadata?.title,
    exercise_type: exerciseMetadata?.type,
    exercise_part: exerciseMetadata?.part,
    exercise_is_unilateral: exerciseMetadata?.is_unilateral,
    section_type: exerciseDto.section_type,
    section_order: exerciseDto.section_order,
    scope_id: exerciseDto.scope_id ?? undefined,
    in_scope_nr: exerciseDto.in_scope_nr ?? undefined,
    scope_repeat_count: exerciseDto.scope_repeat_count ?? undefined,
    planned_sets: exerciseDto.planned_sets,
    planned_reps: exerciseDto.planned_reps,
    planned_duration_seconds: exerciseDto.planned_duration_seconds,
    planned_rest_seconds: exerciseDto.planned_rest_seconds,
    planned_rest_after_series_seconds:
      exerciseDto.planned_rest_after_series_seconds ?? null,
    estimated_set_time_seconds:
      exerciseMetadata?.estimated_set_time_seconds ?? null,
  };
}
