import Link from "next/link";
import type { WorkoutPlanDTO, ExercisePart } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type WorkoutPlanCardProps = {
  readonly plan: Omit<WorkoutPlanDTO, "exercises">;
  readonly exerciseCount?: number;
};

const partLabels: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function WorkoutPlanCard({
  plan,
  exerciseCount,
}: WorkoutPlanCardProps) {
  return (
    <Link
      href={`/workout-plans/${plan.id}`}
      className="block h-full"
      aria-label={`Zobacz szczegóły planu: ${plan.name}`}
    >
      <Card className="h-full rounded-xl border border-border bg-secondary/70 transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card">
        <CardHeader>
          <CardTitle className="line-clamp-2 text-lg font-semibold">
            {plan.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {plan.part && (
                <Badge
                  variant="outline"
                  className="border-destructive text-destructive"
                >
                  {partLabels[plan.part]}
                </Badge>
              )}
              {exerciseCount !== undefined && (
                <Badge
                  variant="secondary"
                  className="bg-secondary text-destructive hover:bg-primary"
                >
                  {exerciseCount} {exerciseCount === 1 ? "ćwiczenie" : "ćwiczeń"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Utworzono: {formatDate(plan.created_at)}
            </p>
            {plan.description && (
              <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
