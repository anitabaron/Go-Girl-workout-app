import type {
  SessionExerciseDTO,
  PersonalRecordWithExerciseDTO,
} from "@/types";
import { WorkoutSessionExerciseItem } from "./workout-session-exercise-item";

type WorkoutSessionExercisesListProps = {
  readonly exercises: SessionExerciseDTO[];
  readonly sessionId: string;
  readonly personalRecordsByExercise?: Map<
    string,
    PersonalRecordWithExerciseDTO[]
  >;
};

export function WorkoutSessionExercisesList({
  exercises,
  sessionId,
  personalRecordsByExercise = new Map(),
}: WorkoutSessionExercisesListProps) {
  if (exercises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">Sesja nie zawiera ćwiczeń.</p>
      </div>
    );
  }

  // Sortowanie ćwiczeń po exercise_order
  const sortedExercises = [...exercises].sort(
    (a, b) => a.exercise_order - b.exercise_order
  );

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold">Ćwiczenia w sesji</h2>
      <div className="space-y-6">
        {sortedExercises.map((exercise, index) => (
          <WorkoutSessionExerciseItem
            key={exercise.id}
            exercise={exercise}
            exerciseIndex={index}
            totalExercises={sortedExercises.length}
            sessionId={sessionId}
            personalRecords={exercise.exercise_id ? (personalRecordsByExercise.get(exercise.exercise_id) ?? []) : []}
          />
        ))}
      </div>
    </div>
  );
}
