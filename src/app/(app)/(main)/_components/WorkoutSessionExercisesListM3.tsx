import type { SessionExerciseDTO } from "@/types";
import { WorkoutSessionExerciseItemM3 } from "./WorkoutSessionExerciseItemM3";
import { WorkoutSessionExerciseItemEditableM3 } from "./WorkoutSessionExerciseItemEditableM3";

type WorkoutSessionExercisesListM3Props = {
  readonly exercises: SessionExerciseDTO[];
  readonly sessionId: string;
  readonly isEditMode?: boolean;
  readonly onExerciseSaved?: () => void;
};

export function WorkoutSessionExercisesListM3({
  exercises,
  sessionId,
  isEditMode = false,
  onExerciseSaved,
}: WorkoutSessionExercisesListM3Props) {
  if (exercises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--m3-outline-variant)] p-8 text-center">
        <p className="text-muted-foreground">No exercises in session.</p>
      </div>
    );
  }

  const sortedExercises = [...exercises].sort(
    (a, b) => a.exercise_order - b.exercise_order,
  );

  return (
    <div className="space-y-6">
      {sortedExercises.map((exercise, index) =>
        isEditMode ? (
          <WorkoutSessionExerciseItemEditableM3
            key={exercise.id}
            exercise={exercise}
            exerciseIndex={index}
            totalExercises={sortedExercises.length}
            sessionId={sessionId}
            onSaved={onExerciseSaved}
          />
        ) : (
          <WorkoutSessionExerciseItemM3
            key={exercise.id}
            exercise={exercise}
            exerciseIndex={index}
            totalExercises={sortedExercises.length}
          />
        ),
      )}
    </div>
  );
}
