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
  exercise_id: string; // ID ćwiczenia z biblioteki
  // Metadane ćwiczenia (tylko do wyświetlenia, nie edytowalne w formularzu)
  exercise_title?: string; // Nazwa ćwiczenia (z ExerciseDTO)
  exercise_type?: ExerciseType; // Type ćwiczenia (z ExerciseDTO)
  exercise_part?: ExercisePart; // Part ćwiczenia (z ExerciseDTO)
  // Parametry planu
  section_type: ExerciseType; // Warm-up | Main Workout | Cool-down
  section_order: number; // Kolejność w sekcji (> 0)
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
};

/**
 * ViewModel - stan parametrów planowanych
 */
export type PlannedParamsState = {
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
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
  errors: Record<string, string>;
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
    exercise: Partial<WorkoutPlanExerciseItemState>
  ) => void;
  errors: Record<string, string>;
  disabled: boolean;
};

/**
 * Props dla WorkoutPlanExerciseItem
 */
export type WorkoutPlanExerciseItemProps = {
  exercise: WorkoutPlanExerciseItemState;
  index: number;
  onChange: (updates: Partial<WorkoutPlanExerciseItemState>) => void;
  onRemove: () => void;
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
};

/**
 * Props dla AddExerciseDialog
 */
export type AddExerciseDialogProps = {
  onAddExercise: (exercise: ExerciseDTO) => void;
  disabled: boolean;
  existingExerciseIds?: string[];
};

/**
 * Props dla ExerciseSelector
 */
export type ExerciseSelectorProps = {
  onSelectExercise: (exercise: ExerciseDTO) => void;
  excludedExerciseIds?: string[];
};

/**
 * Props dla ValidationErrors
 */
export type ValidationErrorsProps = {
  errors: string[];
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
export function dtoToFormState(
  dto?: WorkoutPlanDTO
): WorkoutPlanFormState {
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
      section_type: exercise.section_type,
      section_order: exercise.section_order,
      planned_sets: exercise.planned_sets,
      planned_reps: exercise.planned_reps,
      planned_duration_seconds: exercise.planned_duration_seconds,
      planned_rest_seconds: exercise.planned_rest_seconds,
    })),
  };
}

/**
 * Funkcja pomocnicza do konwersji WorkoutPlanExerciseDTO na WorkoutPlanExerciseItemState
 * Wymaga ExerciseDTO do pobrania metadanych ćwiczenia
 */
export function exerciseDtoToItemState(
  exerciseDto: WorkoutPlanExerciseDTO,
  exerciseMetadata?: ExerciseDTO
): WorkoutPlanExerciseItemState {
  return {
    id: exerciseDto.id,
    exercise_id: exerciseDto.exercise_id,
    exercise_title: exerciseMetadata?.title,
    exercise_type: exerciseMetadata?.type,
    exercise_part: exerciseMetadata?.part,
    section_type: exerciseDto.section_type,
    section_order: exerciseDto.section_order,
    planned_sets: exerciseDto.planned_sets,
    planned_reps: exerciseDto.planned_reps,
    planned_duration_seconds: exerciseDto.planned_duration_seconds,
    planned_rest_seconds: exerciseDto.planned_rest_seconds,
  };
}
