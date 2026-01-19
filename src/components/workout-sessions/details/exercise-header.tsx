import type { SessionExerciseDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  EXERCISE_PART_LABELS,
  EXERCISE_TYPE_LABELS,
} from "@/lib/constants";

type ExerciseHeaderProps = {
  readonly exercise: SessionExerciseDTO;
  readonly index: number;
  readonly total: number;
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
          {EXERCISE_TYPE_LABELS[exercise.exercise_type_at_time] ||
            exercise.exercise_type_at_time}
        </Badge>
        <Badge variant="outline">
          {EXERCISE_PART_LABELS[exercise.exercise_part_at_time] ||
            exercise.exercise_part_at_time}
        </Badge>
      </div>
    </div>
  );
}
