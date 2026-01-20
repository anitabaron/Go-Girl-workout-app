import type { SessionExerciseDTO } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExerciseHeader } from "./exercise-header";
import { PlannedVsActualComparison } from "./planned-vs-actual-comparison";
import { SetLogsTable } from "./set-logs-table";

type WorkoutSessionExerciseItemProps = {
  readonly exercise: SessionExerciseDTO;
  readonly exerciseIndex: number;
  readonly totalExercises: number;
};

export function WorkoutSessionExerciseItem({
  exercise,
  exerciseIndex,
  totalExercises,
}: WorkoutSessionExerciseItemProps) {
  return (
    <Card className="rounded-lg border border-border bg-white dark:border-border dark:bg-zinc-950">
      <CardHeader>
        <ExerciseHeader
          exercise={exercise}
          index={exerciseIndex}
          total={totalExercises}
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <PlannedVsActualComparison
            planned={{
              sets: exercise.planned_sets,
              reps: exercise.planned_reps,
              duration_seconds: exercise.planned_duration_seconds,
              rest_seconds: exercise.planned_rest_seconds,
            }}
            actual={{
              count_sets: exercise.actual_count_sets,
              sum_reps: exercise.actual_sum_reps,
              duration_seconds: exercise.actual_duration_seconds,
              rest_seconds: exercise.actual_rest_seconds,
              is_skipped: exercise.is_skipped,
            }}
          />
          <SetLogsTable 
            sets={exercise.sets} 
            isSkipped={exercise.is_skipped}
            plannedReps={exercise.planned_reps}
            plannedDurationSeconds={exercise.planned_duration_seconds}
          />
        </div>
      </CardContent>
    </Card>
  );
}
