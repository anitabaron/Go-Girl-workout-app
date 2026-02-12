"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Download, Edit, Loader2, Play, Trash2 } from "lucide-react";
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
import {
  EXERCISE_LABELS_NAMESPACE,
  getExercisePartLabel,
} from "@/lib/exercises/labels";
import { formatDuration, formatTotalDuration } from "@/lib/utils/time-format";
import {
  getEstimatedSetTimeLabel,
} from "@/lib/exercises/estimated-set-time";
import {
  calculateScopeEstimatedTimeSeconds,
  getExerciseEstimatedTimeSeconds,
} from "@/lib/workout-plans/estimated-time";
import { toast } from "sonner";
import { workoutPlanToImportFormat } from "@/lib/workout-plans/plan-to-import-format";
import type { WorkoutPlanDTO, WorkoutPlanExerciseDTO } from "@/types";
import { AddSnapshotExerciseButtonM3 } from "./AddSnapshotExerciseButtonM3";
import { ExerciseLibraryBadgeM3 } from "./ExerciseLibraryBadgeM3";
import { useTranslations } from "@/i18n/client";

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
  const t = useTranslations("workoutPlanDetailContent");
  const tExerciseLabel = useTranslations(EXERCISE_LABELS_NAMESPACE);
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const sortedExercises = [...plan.exercises].sort((a, b) => {
    const typeDiff =
      (SECTION_TYPE_ORDER[a.section_type] ?? 999) -
      (SECTION_TYPE_ORDER[b.section_type] ?? 999);
    if (typeDiff !== 0) return typeDiff;
    if (a.section_order !== b.section_order)
      return a.section_order - b.section_order;
    const aNr = a.in_scope_nr ?? 0;
    const bNr = b.in_scope_nr ?? 0;
    return aNr - bNr;
  });

  type ExerciseSlot =
    | { kind: "single"; exercise: WorkoutPlanExerciseDTO }
    | {
        kind: "scope";
        scopeId: string;
        repeatCount: number;
        exercises: WorkoutPlanExerciseDTO[];
      };

  const slots = ((): ExerciseSlot[] => {
    const result: ExerciseSlot[] = [];
    let i = 0;
    while (i < sortedExercises.length) {
      const ex = sortedExercises[i];
      if (ex.scope_id != null && ex.in_scope_nr != null) {
        const scopeId = ex.scope_id;
        const repeatCount = ex.scope_repeat_count ?? 1;
        const scopeExercises = sortedExercises
          .filter((e) => e.scope_id === scopeId)
          .sort((a, b) => (a.in_scope_nr ?? 0) - (b.in_scope_nr ?? 0));
        result.push({
          kind: "scope",
          scopeId,
          repeatCount,
          exercises: scopeExercises,
        });
        i += scopeExercises.length;
      } else {
        result.push({ kind: "single", exercise: ex });
        i += 1;
      }
    }
    return result;
  })();

  const estimatedTotalTime = plan.estimated_total_time_seconds ?? 0;

  const handleEdit = () => {
    router.push(`/workout-plans/${plan.id}/edit`);
  };

  const handleDuplicate = () => {
    router.push(`/workout-plans/new?duplicate=${plan.id}`);
  };

  const handleExportJson = () => {
    const payload = workoutPlanToImportFormat(plan);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.name.replaceAll(/[^\p{L}\p{N}\s-]/gu, "").trim() || "workout-plan"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t("exportSuccess"));
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
          toast.error(t("planNotFound"));
        } else if (response.status === 401 || response.status === 403) {
          toast.error(t("unauthorized"));
          router.push("/login");
        } else {
          toast.error(
            (errorData as { message?: string }).message ??
              t("startFailed"),
          );
        }
        return;
      }

      const data = await response.json();
      const sessionId = data.id ?? (data.data as { id?: string })?.id;

      if (sessionId) {
        toast.success(t("startSuccess"));
        router.push(`/workout-sessions/${sessionId}/active`);
      } else {
        toast.error(t("sessionIdMissing"));
      }
    } catch (error) {
      console.error("Error starting workout:", error);
      toast.error(t("startGenericError"));
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
          toast.error(t("planNotFound"));
        } else if (response.status === 401 || response.status === 403) {
          toast.error(t("unauthorized"));
          router.push("/login");
        } else {
          toast.error(t("deleteFailed"));
        }
        return;
      }

      toast.success(t("deleteSuccess"));
      setIsDeleteDialogOpen(false);
      router.push("/workout-plans");
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error(t("deleteGenericError"));
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
            aria-label={t("startAria")}
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
            aria-label={`${t("editAria")} ${plan.name}`}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDuplicate}
            aria-label={`${t("duplicateAria")} ${plan.name}`}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleExportJson}
            aria-label={t("exportAria")}
          >
            <Download className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            aria-label={`${t("deleteAria")} ${plan.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="m3-label text-muted-foreground mb-1">{t("planName")}</p>
            <p className="m3-body">{plan.name}</p>
          </div>
          {plan.description && (
            <div>
              <p className="m3-label text-muted-foreground mb-1">
                {t("descriptionOptional")}
              </p>
              <p className="m3-body m3-prose whitespace-pre-wrap text-muted-foreground">
                {plan.description}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {plan.part && (
              <Badge variant="outline">
                {getExercisePartLabel(tExerciseLabel, plan.part)}
              </Badge>
            )}
            <Badge variant="secondary">
              {plan.exercises.length}{" "}
              {plan.exercises.length === 1
                ? t("exerciseSingular")
                : t("exercisePlural")}
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
        <h2 className="m3-title">{t("exercisesInPlan")}</h2>

        {slots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--m3-outline-variant)] p-6 text-center">
            <p className="text-muted-foreground">{t("emptyExercises")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map((slot, slotIndex) => {
              if (slot.kind === "single") {
                return (
                  <ExerciseCard
                    key={slot.exercise.id}
                    exercise={slot.exercise}
                    index={slotIndex}
                    planId={plan.id}
                    t={t}
                  />
                );
              }

              const scopeEstimatedTime = calculateScopeEstimatedTimeSeconds(
                slot.exercises,
                slot.repeatCount,
              );
              return (
                <div
                  key={`scope-${slot.scopeId}`}
                  className="rounded-xl border-2 border-[var(--m3-outline-variant)] bg-[var(--m3-raw-primary-container)] p-4"
                >
                  <div className="mb-3 flex items-center gap-2 border-b border-[var(--m3-outline-variant)] pb-2">
                    <span className="m3-title text-[var(--m3-on-surface-variant)]">
                      {t("scope")} × {slot.repeatCount}
                    </span>
                    {scopeEstimatedTime != null && (
                      <span className="text-sm font-medium text-[var(--m3-on-surface-variant)]">
                        • {t("estimatedScopeTimeLabel")}: ~
                        {formatTotalDuration(scopeEstimatedTime)}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      ({slot.exercises.length}{" "}
                      {slot.exercises.length === 1
                        ? t("exerciseSingular")
                        : t("exercisePlural")}
                      )
                    </span>
                  </div>
                  <div className="space-y-3">
                    {slot.exercises.map((exercise, idx) => (
                      <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        index={slotIndex * 10 + idx}
                        planId={plan.id}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialogDescription")} &quot;{plan.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("deleting") : t("delete")}
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
  t,
}: {
  exercise: WorkoutPlanExerciseDTO;
  index: number;
  planId: string;
  t: (key: string) => string;
}) {
  const estimatedSetTimeHint = getExerciseEstimatedTimeSeconds(exercise);
  const estimatedSetTimeLabel = getEstimatedSetTimeLabel(
    estimatedSetTimeHint,
    "s",
    t("estimatedSetTime"),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="m3-title">
              {exercise.exercise_title ?? `${t("exerciseLabel")} #${index + 1}`}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ExerciseTypeBadge type={exercise.section_type} />
              <span className="text-xs text-muted-foreground">
                {t("orderLabel")}: {exercise.section_order}
              </span>
              <ExerciseLibraryBadgeM3 exercise={exercise} />
              {exercise.exercise_is_unilateral && (
                <Badge variant="secondary" className="text-xs">
                  {t("unilateral")}
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
              <p className="text-xs font-medium text-muted-foreground">
                {t("sets")}
              </p>
              <p className="m3-body mt-1">{exercise.planned_sets}</p>
            </div>
          )}
          {exercise.planned_reps != null && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("reps")}
              </p>
              <p className="m3-body mt-1">{exercise.planned_reps}</p>
            </div>
          )}
          {exercise.planned_duration_seconds != null && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("duration")}
              </p>
              <p className="m3-body mt-1">
                {formatDuration(exercise.planned_duration_seconds)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("restBetween")}
            </p>
            <p className="m3-body mt-1">
              {exercise.planned_rest_seconds == null
                ? "—"
                : formatDuration(exercise.planned_rest_seconds)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("restAfter")}
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
              {estimatedSetTimeHint == null
                ? "—"
                : formatDuration(estimatedSetTimeHint)}
            </p>
          </div>
        </div>

        {exercise.exercise_details && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t("details")}
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
