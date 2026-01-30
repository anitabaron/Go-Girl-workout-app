import type { Database } from "@/db/database.types";
import type {
  SessionDetailDTO,
  SessionExerciseDTO,
  SessionExerciseSetDTO,
  SessionSummaryDTO,
} from "@/types";

type WorkoutSessionRow =
  Database["public"]["Tables"]["workout_sessions"]["Row"];
type WorkoutSessionExerciseRow =
  Database["public"]["Tables"]["workout_session_exercises"]["Row"];
type WorkoutSessionSetRow =
  Database["public"]["Tables"]["workout_session_sets"]["Row"];

type ExerciseInfo = {
  exercise_count: number;
  exercise_names: string[];
  estimated_total_time_seconds?: number | null;
};

/**
 * Mapuje wiersz z bazy danych na SessionSummaryDTO.
 */
export function mapToSummaryDTO(
  row: WorkoutSessionRow,
  exerciseInfo?: ExerciseInfo,
): SessionSummaryDTO {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, last_action_at, ...rest } = row;
  return {
    ...rest,
    exercise_count: exerciseInfo?.exercise_count,
    exercise_names: exerciseInfo?.exercise_names,
    estimated_total_time_seconds: exerciseInfo?.estimated_total_time_seconds,
  };
}

/**
 * Mapuje wiersz z bazy danych na SessionDetailDTO z ćwiczeniami i seriami.
 */
export function mapToDetailDTO(
  session: WorkoutSessionRow,
  exercises: Array<
    WorkoutSessionExerciseRow & {
      exercises?: {
        rest_in_between_seconds: number | null;
        rest_after_series_seconds: number | null;
      } | null;
    }
  >,
  sets: WorkoutSessionSetRow[],
  exerciseInfo?: ExerciseInfo,
): SessionDetailDTO {
  const sessionSummary = mapToSummaryDTO(session, exerciseInfo);

  const setsByExerciseId = new Map<string, WorkoutSessionSetRow[]>();
  for (const set of sets) {
    const exerciseId = set.session_exercise_id;
    if (!setsByExerciseId.has(exerciseId)) {
      setsByExerciseId.set(exerciseId, []);
    }
    setsByExerciseId.get(exerciseId)!.push(set);
  }

  const exerciseDTOs: SessionExerciseDTO[] = exercises.map((exercise) => {
    const {
      session_id,
      created_at,
      updated_at,
      actual_sets,
      actual_reps,
      exercises: exerciseData,
      ...exerciseRest
    } = exercise;

    const setDTOs: SessionExerciseSetDTO[] = (
      setsByExerciseId.get(exercise.id) ?? []
    ).map((set) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { session_exercise_id, created_at, updated_at, ...setRest } = set;
      return setRest;
    });

    const restInBetweenSeconds = exerciseData?.rest_in_between_seconds ?? null;
    const restAfterSeriesSeconds =
      exerciseData?.rest_after_series_seconds ?? null;

    return {
      ...exerciseRest,
      actual_count_sets: actual_sets,
      actual_sum_reps: actual_reps,
      sets: setDTOs,
      rest_in_between_seconds: restInBetweenSeconds,
      rest_after_series_seconds: restAfterSeriesSeconds,
    };
  });

  return {
    ...sessionSummary,
    exercises: exerciseDTOs,
  };
}

/**
 * Mapuje pojedyncze ćwiczenie sesji z seriami na SessionExerciseDTO.
 */
export function mapExerciseToDTO(
  exercise: WorkoutSessionExerciseRow & {
    exercises?: {
      rest_in_between_seconds: number | null;
      rest_after_series_seconds: number | null;
    } | null;
  },
  sets: WorkoutSessionSetRow[],
): SessionExerciseDTO {
  const {
    session_id,
    created_at,
    updated_at,
    actual_sets,
    actual_reps,
    exercises: exerciseData,
    ...exerciseRest
  } = exercise;

  const setDTOs: SessionExerciseSetDTO[] = sets
    .filter((set) => set.session_exercise_id === exercise.id)
    .map((set) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { session_exercise_id, created_at, updated_at, ...setRest } = set;
      return setRest;
    })
    .sort((a, b) => a.set_number - b.set_number);

  const restInBetweenSeconds = exerciseData?.rest_in_between_seconds ?? null;
  const restAfterSeriesSeconds =
    exerciseData?.rest_after_series_seconds ?? null;

  return {
    ...exerciseRest,
    actual_count_sets: actual_sets,
    actual_sum_reps: actual_reps,
    sets: setDTOs,
    rest_in_between_seconds: restInBetweenSeconds,
    rest_after_series_seconds: restAfterSeriesSeconds,
  };
}
