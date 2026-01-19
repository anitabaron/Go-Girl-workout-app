import Link from "next/link";
import type { ExerciseDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EXERCISE_PART_LABELS,
  EXERCISE_TYPE_LABELS,
} from "@/lib/constants";

type ExerciseCardProps = {
  readonly exercise: ExerciseDTO;
};

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="block h-full"
      aria-label={`Zobacz szczegóły ćwiczenia: ${exercise.title}`}
    >
      <Card className="h-full rounded-xl border border-border bg-secondary/70 transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card gap-2">
        <CardHeader>
          <CardTitle className="line-clamp-2 text-lg font-semibold">
            {exercise.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="bg-secondary text-destructive hover:bg-primary"
              >
                {EXERCISE_TYPE_LABELS[exercise.type]}
              </Badge>
              <Badge
                variant="outline"
                className="border-destructive text-destructive"
              >
                {EXERCISE_PART_LABELS[exercise.part]}
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
            {exercise.details && (
              <p className="text-sm font-light text-zinc-500 dark:text-zinc-500 line-clamp-2">
                {exercise.details}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
