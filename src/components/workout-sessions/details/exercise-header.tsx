import type { SessionExerciseDTO, ExerciseType, ExercisePart } from "@/types";
import { Badge } from "@/components/ui/badge";

type ExerciseHeaderProps = {
  readonly exercise: SessionExerciseDTO;
  readonly index: number;
  readonly total: number;
};

const typeLabels: Record<ExerciseType, string> = {
  "Warm-up": "Rozgrzewka",
  "Main Workout": "Główny trening",
  "Cool-down": "Schłodzenie",
};

const partLabels: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

export function ExerciseHeader({
  exercise,
  index,
  total,
}: ExerciseHeaderProps) {
  if (!exercise.exercise_title_at_time) {
    return null;
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-lg font-semibold">{exercise.exercise_title_at_time}</h3>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Ćwiczenie {index + 1} z {total}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {typeLabels[exercise.exercise_type_at_time] ||
            exercise.exercise_type_at_time}
        </Badge>
        <Badge variant="outline">
          {partLabels[exercise.exercise_part_at_time] ||
            exercise.exercise_part_at_time}
        </Badge>
      </div>
    </div>
  );
}
