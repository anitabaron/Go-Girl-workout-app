import type { SessionDetailDTO, SessionExerciseDTO } from "@/types";

export type WorkoutSessionExportPayload = {
  export_type: "workout_session";
  export_version: 1;
  exported_at: string;
  session: {
    id: string;
    status: SessionDetailDTO["status"];
    workout_plan_id: string | null;
    plan_name_at_time: string | null;
    started_at: string;
    completed_at: string | null;
    active_duration_seconds: number | null;
    estimated_total_time_seconds: number | null;
    exercise_count: number;
    current_position: number | null;
  };
  exercises: Array<{
    id: string;
    order: number;
    title: string;
    type: SessionExerciseDTO["exercise_type_at_time"];
    part: SessionExerciseDTO["exercise_part_at_time"];
    exercise_id: string | null;
    is_unilateral: boolean;
    is_skipped: boolean;
    planned: {
      sets: number | null;
      reps: number | null;
      duration_seconds: number | null;
      rest_between_sets_seconds: number | null;
      rest_after_series_seconds: number | null;
    };
    actual: {
      count_sets: number | null;
      sum_reps: number | null;
      duration_seconds: number | null;
      rest_seconds: number | null;
    };
    sets: Array<{
      set_number: number;
      side_number: number | null;
      reps: number | null;
      duration_seconds: number | null;
      weight_kg: number | null;
    }>;
  }>;
};

export function workoutSessionToExportFormat(
  session: SessionDetailDTO,
): WorkoutSessionExportPayload {
  return {
    export_type: "workout_session",
    export_version: 1,
    exported_at: new Date().toISOString(),
    session: {
      id: session.id,
      status: session.status,
      workout_plan_id: session.workout_plan_id,
      plan_name_at_time: session.plan_name_at_time,
      started_at: session.started_at,
      completed_at: session.completed_at,
      active_duration_seconds: session.active_duration_seconds ?? null,
      estimated_total_time_seconds: session.estimated_total_time_seconds ?? null,
      exercise_count: session.exercises.length,
      current_position: session.current_position ?? null,
    },
    exercises: [...session.exercises]
      .sort((a, b) => a.exercise_order - b.exercise_order)
      .map((exercise) => ({
        id: exercise.id,
        order: exercise.exercise_order,
        title: exercise.exercise_title_at_time,
        type: exercise.exercise_type_at_time,
        part: exercise.exercise_part_at_time,
        exercise_id: exercise.exercise_id ?? null,
        is_unilateral: Boolean(exercise.exercise_is_unilateral_at_time),
        is_skipped: exercise.is_skipped,
        planned: {
          sets: exercise.planned_sets ?? null,
          reps: exercise.planned_reps ?? null,
          duration_seconds: exercise.planned_duration_seconds ?? null,
          rest_between_sets_seconds: exercise.planned_rest_seconds ?? null,
          rest_after_series_seconds:
            exercise.planned_rest_after_series_seconds ??
            exercise.rest_after_series_seconds ??
            null,
        },
        actual: {
          count_sets: exercise.actual_count_sets ?? null,
          sum_reps: exercise.actual_sum_reps ?? null,
          duration_seconds: exercise.actual_duration_seconds ?? null,
          rest_seconds: exercise.actual_rest_seconds ?? null,
        },
        sets: [...exercise.sets]
          .sort((a, b) => {
            if (a.set_number !== b.set_number) {
              return a.set_number - b.set_number;
            }
            return (a.side_number ?? 0) - (b.side_number ?? 0);
          })
          .map((set) => ({
            set_number: set.set_number,
            side_number: set.side_number ?? null,
            reps: set.reps ?? null,
            duration_seconds: set.duration_seconds ?? null,
            weight_kg: set.weight_kg ?? null,
          })),
      })),
  };
}
