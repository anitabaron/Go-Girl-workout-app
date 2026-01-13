import Link from "next/link";
import type { ExerciseDTO, ExercisePart, ExerciseType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ExerciseCardProps = {
  exercise: ExerciseDTO;
};

const partLabels: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

const typeLabels: Record<ExerciseType, string> = {
  "Warm-up": "Rozgrzewka",
  "Main Workout": "Główny trening",
  "Cool-down": "Schłodzenie",
};

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="block h-full"
      aria-label={`Zobacz szczegóły ćwiczenia: ${exercise.title}`}
    >
      <Card className="h-full rounded-xl border border-border bg-secondary/70 transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card">
        <CardHeader>
          <CardTitle className="line-clamp-2 text-lg font-semibold">
            {exercise.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="bg-secondary text-destructive hover:bg-primary"
            >
              {typeLabels[exercise.type]}
            </Badge>
            <Badge
              variant="outline"
              className="border-destructive text-destructive"
            >
              {partLabels[exercise.part]}
            </Badge>
            {exercise.level && (
              <Badge
                variant="outline"
                className="border-destructive text-destructive"
              >
                {exercise.level}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
