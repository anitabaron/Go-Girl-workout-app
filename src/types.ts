import type {
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./db/database.types";

/**
 * Enum re-exports to keep API types aligned with DB schema.
 */
export type ExercisePart = Enums<"exercise_part">;
export type ExerciseType = Enums<"exercise_type">;
export type WorkoutSessionStatus = Enums<"workout_session_status">;
export type PRMetricType = Enums<"pr_metric_type">;
export type AIRequestType = Enums<"ai_request_type">;

/**
 * Base entity aliases for convenience.
 */
export type ExerciseEntity = Tables<"exercises">;
export type WorkoutPlanEntity = Tables<"workout_plans">;
export type WorkoutPlanExerciseEntity = Tables<"workout_plan_exercises">;
export type WorkoutSessionEntity = Tables<"workout_sessions">;
export type WorkoutSessionExerciseEntity = Tables<"workout_session_exercises">;
export type WorkoutSessionSetEntity = Tables<"workout_session_sets">;
export type PersonalRecordEntity = Tables<"personal_records">;
export type AIUsageEntity = Tables<"ai_usage">;
export type AIRequestEntity = Tables<"ai_requests">;

/**
 * API response helpers.
 */
export type ApiError = {
  code: string;
  message: string;
  details?: string;
};

export type ApiResponse<TData> = {
  data: TData;
  error?: ApiError | null;
};

export type CursorPage<TItem> = {
  items: TItem[];
  nextCursor?: string | null;
};

/**
 * Exercises
 */
export type ExerciseCreateCommand = Pick<
  TablesInsert<"exercises">,
  | "title"
  | "type"
  | "part"
  | "level"
  | "details"
  | "reps"
  | "duration_seconds"
  | "series"
  | "rest_in_between_seconds"
  | "rest_after_series_seconds"
  | "estimated_set_time_seconds"
>;

export type ExerciseUpdateCommand = Partial<ExerciseCreateCommand>;

export type ExerciseQueryParams = {
  search?: string;
  part?: ExercisePart;
  type?: ExerciseType;
  sort?: "created_at" | "title" | "part" | "type";
  order?: "asc" | "desc";
  limit?: number;
  cursor?: string | null;
};

export type ExerciseDTO = Omit<ExerciseEntity, "user_id" | "title_normalized">;

/**
 * Workout Plans
 */
export type WorkoutPlanExerciseInput = Pick<
  TablesInsert<"workout_plan_exercises">,
  | "exercise_id"
  | "section_type"
  | "section_order"
  | "planned_sets"
  | "planned_reps"
  | "planned_duration_seconds"
  | "planned_rest_seconds"
> & {
  planned_rest_after_series_seconds?: number | null;
  estimated_set_time_seconds?: number | null;
};

export type WorkoutPlanCreateCommand = Pick<
  TablesInsert<"workout_plans">,
  "name" | "description" | "part"
> & {
  exercises: WorkoutPlanExerciseInput[];
};

export type WorkoutPlanExerciseUpdateOrCreate = WorkoutPlanExerciseInput & {
  id?: string; // Opcjonalne id - jeśli podane, to aktualizacja; jeśli nie, to dodanie
};

export type WorkoutPlanUpdateCommand = Partial<
  Pick<TablesUpdate<"workout_plans">, "name" | "description" | "part">
> & {
  exercises?: WorkoutPlanExerciseUpdateOrCreate[];
};

export type WorkoutPlanExerciseDTO = Omit<
  WorkoutPlanExerciseEntity,
  "plan_id" | "created_at"
> & {
  exercise_title?: string | null;
  exercise_type?: ExerciseType | null;
  exercise_part?: ExercisePart | null;
  exercise_estimated_set_time_seconds?: number | null;
  exercise_rest_after_series_seconds?: number | null;
  planned_rest_after_series_seconds?: number | null;
};

export type WorkoutPlanDTO = Omit<WorkoutPlanEntity, "user_id"> & {
  exercises: WorkoutPlanExerciseDTO[];
};

export type PlanQueryParams = {
  part?: ExercisePart;
  sort?: "created_at" | "name";
  order?: "asc" | "desc";
  limit?: number;
  cursor?: string | null;
};

/**
 * Workout Sessions
 */
export type SessionStartCommand = {
  workout_plan_id: WorkoutPlanEntity["id"];
};

export type SessionStatusUpdateCommand = Pick<
  TablesUpdate<"workout_sessions">,
  "status"
>;

export type SessionListQueryParams = {
  status?: WorkoutSessionStatus;
  plan_id?: WorkoutPlanEntity["id"];
  from?: string;
  to?: string;
  sort?: "started_at" | "completed_at" | "status";
  order?: "asc" | "desc";
  limit?: number;
  cursor?: string | null;
};

export type SessionSummaryDTO = Omit<
  WorkoutSessionEntity,
  "user_id" | "last_action_at"
>;

export type SessionExerciseSetDTO = Omit<
  WorkoutSessionSetEntity,
  "session_exercise_id" | "created_at" | "updated_at"
>;

export type SessionExerciseDTO = Omit<
  WorkoutSessionExerciseEntity,
  "session_id" | "created_at" | "updated_at" | "actual_sets" | "actual_reps"
> & {
  // Mapowanie nazw z bazy danych na nazwy API
  actual_count_sets: number | null; // Liczba wykonanych serii
  actual_sum_reps: number | null; // Suma reps ze wszystkich serii
  sets: SessionExerciseSetDTO[];
  // Planned rest after series (from workout plan or exercise default)
  planned_rest_after_series_seconds?: number | null;
  // Rest values from exercise (snapshot at session start)
  rest_in_between_seconds?: number | null;
  rest_after_series_seconds?: number | null;
};

export type SessionDetailDTO = SessionSummaryDTO & {
  exercises: SessionExerciseDTO[];
};

export type SessionExerciseSetCommand = Pick<
  TablesInsert<"workout_session_sets">,
  "set_number" | "reps" | "duration_seconds" | "weight_kg"
>;

export type SessionExerciseAutosaveCommand = {
  // Agregaty na poziomie ćwiczenia (opcjonalne, obliczane automatycznie z serii)
  actual_count_sets?: number | null; // Liczba wykonanych serii
  actual_sum_reps?: number | null; // Suma reps ze wszystkich serii
  actual_duration_seconds?: number | null; // Maksymalny czas z pojedynczej serii
  // Parametry planowane (opcjonalne)
  planned_sets?: number | null;
  planned_reps?: number | null;
  planned_duration_seconds?: number | null;
  planned_rest_seconds?: number | null;
  // Flaga pominięcia
  is_skipped?: boolean;
  // Serie ćwiczenia
  sets?: SessionExerciseSetCommand[];
  // Flaga przesunięcia kursora
  advance_cursor_to_next?: boolean;
};

export type SessionExerciseAutosaveResponse = SessionExerciseDTO & {
  cursor: {
    current_position: number;
    last_action_at: string;
  };
};

/**
 * Personal Records
 */
export type PersonalRecordDTO = Omit<PersonalRecordEntity, "user_id">;

export type PersonalRecordQueryParams = {
  exercise_id?: ExerciseEntity["id"];
  metric_type?: PRMetricType;
  sort?: "achieved_at" | "value";
  order?: "asc" | "desc";
  limit?: number;
  cursor?: string | null;
};

export type PersonalRecordWithExerciseDTO = PersonalRecordDTO & {
  exercise: {
    id: string;
    title: string;
    type: ExerciseType;
    part: ExercisePart;
  };
};

/**
 * AI usage and plan generation/optimization
 */
export type AIUsageDTO = {
  month: AIUsageEntity["month_year"];
  used: AIUsageEntity["usage_count"];
  remaining: number; // derived from monthly cap (e.g., 5 - used, non-negative)
  reset_at: string; // computed client/server-side from month boundary
};

export type AIGeneratePlanCommand = {
  goal: string;
  level: string;
  duration_minutes: number;
  parts: ExercisePart[];
  equipment?: string[];
};

export type AIOptimizePlanCommand = {
  workout_plan_id: WorkoutPlanEntity["id"];
  goal?: string;
  level?: string;
  duration_minutes?: number;
  parts?: ExercisePart[];
  equipment?: string[];
};
