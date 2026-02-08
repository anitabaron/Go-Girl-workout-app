"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Edit, Loader2, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import { formatDuration, formatTotalDuration } from "@/lib/utils/time-format";
import {
  calculateEstimatedSetTimeSeconds,
  getEstimatedSetTimeLabel,
} from "@/lib/exercises/estimated-set-time";
import { toast } from "sonner";
import type { WorkoutPlanDTO, WorkoutPlanExerciseDTO } from "@/types";
import { AddSnapshotExerciseButtonM3 } from "./AddSnapshotExerciseButtonM3";
import { ExerciseLibraryBadgeM3 } from "./ExerciseLibraryBadgeM3";

type WorkoutPlanDetailContentProps = {
  readonly plan: WorkoutPlanDTO;
};

const SECTION_TYPE_ORDER: Record<string, number> = {
  "Warm-up": 1,
  "Main Workout": 2,
  "Cool-down": 3,
};

export function WorkoutPlanDetailContent({
  plan,
}: WorkoutPlanDetailContentProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const sortedExercises = [...plan.exercises].sort((a, b) => {
    const typeDiff =
      (SECTION_TYPE_ORDER[a.section_type] ?? 999) -
      (SECTION_TYPE_ORDER[b.section_type] ?? 999);
    if (typeDiff !== 0) return typeDiff;
    return a.section_order - b.section_order;
  });

  const estimatedTotalTime = plan.estimated_total_time_seconds ?? 0;

  const handleEdit = () => {
    router.push(`/workout-plans/${plan.id}/edit`);
  };

  const handleStartWorkout = async () => {
    setIsStarting(true);
    try {
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_plan_id: plan.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          toast.error("Workout plan not found");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Unauthorized. Please log in again.");
          router.push("/login");
        } else {
          toast.error(
            (errorData as { message?: string }).message ??
              "Failed to start workout session",
          );
        }
        return;
      }

      const data = await response.json();
      const sessionId = data.id ?? (data.data as { id?: string })?.id;

      if (sessionId) {
        toast.success("Workout session started");
        router.push(`/workout-sessions/${sessionId}/active`);
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workout-plans/${plan.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Workout plan not found");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Unauthorized. Please log in again.");
          router.push("/login");
        } else {
          toast.error("Failed to delete workout plan");
        }
        return;
      }

      toast.success("Workout plan deleted");
      setIsDeleteDialogOpen(false);
      router.push("/workout-plans");
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("An error occurred while deleting the plan");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan actions and details - compact like edit form */}
      <section className="space-y-1">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStartWorkout}
            disabled={isStarting}
            className="h-8 w-8 rounded-full !bg-[var(--m3-primary)] !text-[var(--m3-on-primary)] hover:!bg-[var(--m3-primary)] hover:!opacity-90"
            aria-label="Start workout with this plan"
            aria-busy={isStarting}
          >
            {isStarting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleEdit}
            aria-label={`Edit plan: ${plan.name}`}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            aria-label={`Delete plan: ${plan.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="m3-label text-muted-foreground mb-1">Plan name</p>
            <p className="m3-body">{plan.name}</p>
          </div>
          {plan.description && (
            <div>
              <p className="m3-label text-muted-foreground mb-1">
                Description (optional)
              </p>
              <p className="m3-body m3-prose whitespace-pre-wrap text-muted-foreground">
                {plan.description}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {plan.part && (
              <Badge variant="outline">{EXERCISE_PART_LABELS[plan.part]}</Badge>
            )}
            <Badge variant="secondary">
              {plan.exercises.length}{" "}
              {plan.exercises.length === 1 ? "exercise" : "exercises"}
            </Badge>
            {estimatedTotalTime > 0 && (
              <Badge variant="secondary">
                {formatTotalDuration(estimatedTotalTime)}
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Exercises list - compact like edit form */}
      <section className="space-y-4">
        <h2 className="m3-title">Exercises in plan</h2>

        {sortedExercises.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--m3-outline-variant)] p-6 text-center">
            <p className="text-muted-foreground">No exercises in plan.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedExercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                planId={plan.id}
              />
            ))}
          </div>
        )}
      </section>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workout plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{plan.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
  planId,
}: {
  exercise: WorkoutPlanExerciseDTO;
  index: number;
  planId: string;
}) {
  const estimatedSetTimeHint = calculateEstimatedSetTimeSeconds({
    series: exercise.planned_sets ?? "",
    reps: exercise.planned_reps ?? null,
    duration_seconds: exercise.planned_duration_seconds ?? null,
    rest_in_between_seconds: exercise.planned_rest_seconds ?? null,
    rest_after_series_seconds:
      exercise.planned_rest_after_series_seconds ?? null,
    exercise_is_unilateral: exercise.exercise_is_unilateral ?? undefined,
  });
  const estimatedSetTimeLabel = getEstimatedSetTimeLabel(
    estimatedSetTimeHint,
    "s",
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="m3-title">
              {exercise.exercise_title ?? `Exercise #${index + 1}`}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ExerciseTypeBadge type={exercise.section_type} />
              <span className="text-xs text-muted-foreground">
                Order: {exercise.section_order}
              </span>
              <ExerciseLibraryBadgeM3 exercise={exercise} />
              {exercise.exercise_is_unilateral && (
                <Badge variant="secondary" className="text-xs">
                  Unilateral
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {exercise.planned_sets != null && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sets</p>
              <p className="m3-body mt-1">{exercise.planned_sets}</p>
            </div>
          )}
          {exercise.planned_reps != null && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Reps</p>
              <p className="m3-body mt-1">{exercise.planned_reps}</p>
            </div>
          )}
          {exercise.planned_duration_seconds != null && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Duration (s)
              </p>
              <p className="m3-body mt-1">
                {formatDuration(exercise.planned_duration_seconds)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Rest between sets (s)
            </p>
            <p className="m3-body mt-1">
              {exercise.planned_rest_seconds == null
                ? "—"
                : formatDuration(exercise.planned_rest_seconds)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Rest after sets (s)
            </p>
            <p className="m3-body mt-1">
              {exercise.planned_rest_after_series_seconds == null
                ? "—"
                : formatDuration(exercise.planned_rest_after_series_seconds)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {estimatedSetTimeLabel}
            </p>
            <p className="m3-body mt-1">
              {exercise.exercise_estimated_set_time_seconds == null
                ? "—"
                : formatDuration(exercise.exercise_estimated_set_time_seconds)}
            </p>
          </div>
        </div>

        {exercise.exercise_details && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Details
            </p>
            <p className="m3-body whitespace-pre-wrap text-sm">
              {exercise.exercise_details}
            </p>
          </div>
        )}

        <AddSnapshotExerciseButtonM3 exercise={exercise} planId={planId} />
      </CardContent>
    </Card>
  );
}
