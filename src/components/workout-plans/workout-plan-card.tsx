"use client";

import React, { memo, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock10, Dumbbell } from "lucide-react";
import type { WorkoutPlanDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardActionButtons } from "@/components/ui/card-action-buttons";
import { DeleteWorkoutPlanDialog } from "@/components/workout-plans/delete-workout-plan-dialog";
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import { formatTotalDuration } from "@/lib/utils/time-format";
import { formatDateTime } from "@/lib/utils/date-format";

type WorkoutPlanCardProps = {
  readonly plan: Omit<WorkoutPlanDTO, "exercises"> & {
    exercise_count?: number;
    exercise_names?: string[];
  };
  readonly exerciseCount?: number;
  readonly onDelete?: (planId: string) => Promise<void>;
};



function WorkoutPlanCardComponent({
  plan,
  exerciseCount,
  onDelete,
}: Readonly<WorkoutPlanCardProps>) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Memoizacja formatowania daty
  const formattedDate = useMemo(
    () => formatDateTime(plan.created_at),
    [plan.created_at]
  );

  const formattedUpdatedDate = useMemo(
    () => formatDateTime(plan.updated_at),
    [plan.updated_at]
  );

  const exerciseCountText = useMemo(() => {
    const count = exerciseCount ?? plan.exercise_count ?? 0;
    if (count === 0) return "";
    if (count === 1) return "ćwiczenie";
    if (count < 5) return "ćwiczenia";
    return "ćwiczeń";
  }, [exerciseCount, plan.exercise_count]);

  const finalExerciseCount = exerciseCount ?? plan.exercise_count ?? 0;

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/workout-plans/${plan.id}/edit`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleted = () => {
    router.refresh();
  };

  return (
    <>
      <Card className="group relative h-full rounded-xl border border-border bg-secondary/30 transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card" data-test-id={`workout-plan-card-${plan.id}`}>
        <CardActionButtons
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          editAriaLabel={`Edytuj plan: ${plan.name}`}
          deleteAriaLabel={`Usuń plan: ${plan.name}`}
        />

        <Link
          href={`/workout-plans/${plan.id}`}
          className="block h-full"
          aria-label={`Zobacz szczegóły planu: ${plan.name}`}
        >
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
                    {EXERCISE_PART_LABELS[plan.part]}
                  </Badge>
                )}
              </div>
              {plan.estimated_total_time_seconds && (
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  <Clock10 className="h-4 w-4" /> <span>Czas trwania: {formatTotalDuration(plan.estimated_total_time_seconds)}</span>
                </div>
              )}
              {finalExerciseCount > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Dumbbell className="h-4 w-4" />
                    <span className="font-medium">
                      {finalExerciseCount} {exerciseCountText}
                    </span>
                  </div>
                  {plan.exercise_names && plan.exercise_names.length > 0 && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-500 ml-6">
                      {plan.exercise_names.join(", ")}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Utworzono: {formattedDate}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Zaktualizowano: {formattedUpdatedDate}
                </p>
              </div>
              {plan.description && (
                <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {plan.description}
                </p>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>

      <DeleteWorkoutPlanDialog
        planId={plan.id}
        planName={plan.name}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={handleDeleted}
        onDelete={onDelete}
      />
    </>
  );
}

// Memoizacja komponentu dla redukcji niepotrzebnych re-renderów
export const WorkoutPlanCard = memo(WorkoutPlanCardComponent);
