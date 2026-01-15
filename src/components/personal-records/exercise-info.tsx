import { Badge } from "@/components/ui/badge";

type ExerciseInfoProps = {
  exercise: {
    id: string;
    title: string;
    type: string;
    part: string;
  };
};

/**
 * Komponent wyświetlający podstawowe informacje o ćwiczeniu:
 * tytuł, typ i partię mięśniową.
 */
export function ExerciseInfo({ exercise }: ExerciseInfoProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
        {exercise.title}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-secondary text-destructive hover:bg-primary"
        >
          {exercise.type}
        </Badge>
        <Badge
          variant="outline"
          className="border-destructive text-destructive"
        >
          {exercise.part}
        </Badge>
      </div>
    </div>
  );
}
