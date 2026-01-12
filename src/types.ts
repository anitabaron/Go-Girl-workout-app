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
  | "section_position"
  | "planned_sets"
  | "planned_reps"
  | "planned_duration_seconds"
  | "planned_rest_seconds"
>;

export type WorkoutPlanCreateCommand = Pick<
  TablesInsert<"workout_plans">,
  "name" | "description" | "part"
> & {
  exercises: WorkoutPlanExerciseInput[];
};

export type WorkoutPlanUpdateCommand = WorkoutPlanCreateCommand;

export type WorkoutPlanExerciseDTO = Omit<
  WorkoutPlanExerciseEntity,
  "plan_id" | "created_at"
>;

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
  "session_id" | "created_at" | "updated_at"
> & {
  sets: SessionExerciseSetDTO[];
};

export type SessionDetailDTO = SessionSummaryDTO & {
  exercises: SessionExerciseDTO[];
};

export type SessionExerciseSetCommand = Pick<
  TablesInsert<"workout_session_sets">,
  "set_number" | "reps" | "duration_seconds" | "weight_kg"
>;

export type SessionExerciseAutosaveCommand = Partial<
  Pick<
    TablesUpdate<"workout_session_exercises">,
    | "actual_duration_seconds"
    | "actual_reps"
    | "actual_rest_seconds"
    | "actual_sets"
    | "planned_duration_seconds"
    | "planned_reps"
    | "planned_rest_seconds"
    | "planned_sets"
    | "is_skipped"
  >
> & {
  sets?: SessionExerciseSetCommand[];
  advance_cursor_to_next?: boolean;
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
