"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useMemo, useState } from "react";
import {
  Clock10,
  Copy,
  Dumbbell,
  AlertCircle,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteWorkoutPlanDialogM3 } from "../_components/DeleteWorkoutPlanDialogM3";
import type { PlanExerciseSummary, WorkoutPlanDTO } from "@/types";
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import {
  formatTotalDuration,
  formatRepsOrDuration,
} from "@/lib/utils/time-format";
import { formatDateTime } from "@/lib/utils/date-format";
import { toast } from "sonner";

type M3WorkoutPlanCardProps = {
  readonly plan: Omit<WorkoutPlanDTO, "exercises"> & {
    exercise_count?: number;
    exercise_names?: string[];
    exercise_summaries?: PlanExerciseSummary[];
    has_missing_exercises?: boolean;
  };
  readonly exerciseCount?: number;
  readonly onDelete?: (planId: string) => Promise<void>;
};

function M3WorkoutPlanCardComponent({
  plan,
  exerciseCount,
  onDelete,
}: Readonly<M3WorkoutPlanCardProps>) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

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
    if (count === 1) return "exercise";
    return "exercises";
  }, [exerciseCount, plan.exercise_count]);
  const finalExerciseCount = exerciseCount ?? plan.exercise_count ?? 0;

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/m3/workout-plans/${plan.id}/edit`);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/m3/workout-plans/new?duplicate=${plan.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (finalExerciseCount === 0) {
      toast.error("Add exercises to the plan before starting");
      return;
    }
    setIsStarting(true);
    try {
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_plan_id: plan.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = (errorData as { message?: string }).message;

        if (response.status === 400) {
          toast.error(msg ?? "Invalid input. Check plan selection.");
        } else if (response.status === 404) {
          toast.error("Workout plan not found or does not belong to you.");
        } else if (response.status === 409) {
          toast.error("You already have an active session. Resume it.");
          router.refresh();
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Unauthorized. Please log in again.");
          router.push("/login");
        } else {
          toast.error(msg ?? "Failed to start workout session");
        }
        return;
      }

      const data = await response.json();
      const sessionId = data.id ?? (data.data as { id?: string })?.id;

      if (sessionId) {
        toast.success("Workout session started");
        router.push(`/m3/workout-sessions/${sessionId}/active`);
      } else {
        toast.error("Failed to get session ID");
      }
    } catch (error) {
      console.error("Error starting workout:", error);
      toast.error("An error occurred while starting the workout");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>
      <Card
        className="group relative h-full overflow-hidden transition-shadow hover:shadow-md"
        data-test-id={`workout-plan-card-${plan.id}`}
      >
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full !bg-[var(--m3-primary)] !text-[var(--m3-on-primary)] hover:!bg-[var(--m3-primary)] hover:!opacity-90"
            onClick={handleStart}
            disabled={isStarting || finalExerciseCount === 0}
            aria-label={`Start workout: ${plan.name}`}
          >
            <Play className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDuplicate}
            aria-label={`Duplicate plan: ${plan.name}`}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleEdit}
            aria-label={`Edit plan: ${plan.name}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label={`Delete plan: ${plan.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <Link
          href={`/m3/workout-plans/${plan.id}`}
          className="block h-full"
          aria-label={`View plan details: ${plan.name}`}
        >
          <CardHeader>
            <h3 className="m3-headline line-clamp-2 pr-28">{plan.name}</h3>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {plan.part && (
                  <Badge
                    variant="outline"
                    className="border-primary text-primary"
                  >
                    {EXERCISE_PART_LABELS[plan.part]}
                  </Badge>
                )}
                {plan.has_missing_exercises && (
                  <Badge
                    variant="outline"
                    className="border-amber-500 text-amber-600"
                  >
                    <AlertCircle className="mr-1 size-3" />
                    Contains exercises outside library
                  </Badge>
                )}
              </div>
              {plan.estimated_total_time_seconds != null && (
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock10 className="size-4" />
                  <span>
                    Duration:{" "}
                    {formatTotalDuration(plan.estimated_total_time_seconds)}
                  </span>
                </div>
              )}
              {finalExerciseCount > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Dumbbell className="size-4" />
                    <span className="font-medium">
                      {finalExerciseCount} {exerciseCountText}
                    </span>
                  </div>
                  {plan.exercise_summaries &&
                  plan.exercise_summaries.length > 0 ? (
                    <div className="ml-6 overflow-x-auto">
                      <table className="w-full min-w-[280px] text-xs text-muted-foreground">
                        <thead>
                          <tr className="border-b border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-high)] text-foreground">
                            <th className="py-1 pr-3 text-left font-medium">
                              Exercise
                            </th>
                            <th className="py-1 pr-3 text-left font-medium">
                              Reps/time
                            </th>
                            <th className="py-1 pr-3 text-left font-medium">
                              Sets
                            </th>
                            <th className="py-1 text-left font-medium">
                              Rest
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.exercise_summaries.map((ex, i) => (
                            <tr
                              key={`${ex.title}-${i}`}
                              className="border-b border-[var(--m3-outline-variant)] last:border-0"
                            >
                              <td className="py-1 pr-3 font-medium">
                                {ex.title}
                              </td>
                              <td className="py-1 pr-3">
                                {formatRepsOrDuration(
                                  ex.planned_reps,
                                  ex.planned_duration_seconds
                                )}
                              </td>
                              <td className="py-1 pr-3">
                                {ex.planned_sets != null && ex.planned_sets > 0
                                  ? `${ex.planned_sets}`
                                  : "-"}
                              </td>
                              <td className="py-1">
                                {ex.planned_rest_seconds != null &&
                                ex.planned_rest_seconds > 0
                                  ? `${ex.planned_rest_seconds}s`
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    plan.exercise_names &&
                    plan.exercise_names.length > 0 && (
                      <div className="ml-6 text-xs text-muted-foreground">
                        {plan.exercise_names.join(", ")}
                      </div>
                    )
                  )}
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Created: {formattedDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  Updated: {formattedUpdatedDate}
                </p>
              </div>
              {plan.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>

      <DeleteWorkoutPlanDialogM3
        planId={plan.id}
        planName={plan.name}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDelete={onDelete}
      />
    </>
  );
}

export const M3WorkoutPlanCard = memo(M3WorkoutPlanCardComponent);
