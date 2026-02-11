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
import {
  EXERCISE_LABELS_NAMESPACE,
  getExercisePartLabel,
} from "@/lib/exercises/labels";

type ExerciseSlot =
  | { type: "single"; items: PlanExerciseSummary[] }
  | {
      type: "scope";
      scopeRepeatCount: number;
      items: PlanExerciseSummary[];
    };

function groupSummariesIntoSlots(
  summaries: PlanExerciseSummary[]
): ExerciseSlot[] {
  const slots: ExerciseSlot[] = [];
  let i = 0;
  while (i < summaries.length) {
    const ex = summaries[i];
    if (ex.scope_id != null && ex.scope_repeat_count != null) {
      const scopeId = ex.scope_id;
      const items: PlanExerciseSummary[] = [];
      while (
        i < summaries.length &&
        (summaries[i] as PlanExerciseSummary).scope_id === scopeId
      ) {
        items.push(summaries[i]);
        i += 1;
      }
      slots.push({
        type: "scope",
        scopeRepeatCount: ex.scope_repeat_count,
        items,
      });
    } else {
      slots.push({ type: "single", items: [ex] });
      i += 1;
    }
  }
  return slots;
}
import {
  formatDuration,
  formatTotalDuration,
} from "@/lib/utils/time-format";
import { formatDateTime } from "@/lib/utils/date-format";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";

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
  const t = useTranslations("workoutPlanCard");
  const tExerciseLabel = useTranslations(EXERCISE_LABELS_NAMESPACE);
  const formatRepsOrDurationLabel = (
    reps: number | null | undefined,
    durationSeconds: number | null | undefined,
  ): string => {
    if (reps != null && reps > 0) return `${reps} ${t("repsUnit")}`;
    if (durationSeconds != null && durationSeconds > 0) {
      return formatDuration(durationSeconds);
    }
    return "-";
  };
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
    if (count === 1) return t("exerciseSingular");
    return t("exercisePlural");
  }, [exerciseCount, plan.exercise_count, t]);
  const finalExerciseCount = exerciseCount ?? plan.exercise_count ?? 0;

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/workout-plans/${plan.id}/edit`);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/workout-plans/new?duplicate=${plan.id}`);
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
      toast.error(t("emptyPlanError"));
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
          toast.error(msg ?? t("invalidInput"));
        } else if (response.status === 404) {
          toast.error(t("planNotFound"));
        } else if (response.status === 409) {
          toast.error(t("activeSessionExists"));
          router.refresh();
        } else if (response.status === 401 || response.status === 403) {
          toast.error(t("unauthorized"));
          router.push("/login");
        } else {
          toast.error(msg ?? t("startFailed"));
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
            aria-label={`${t("startAria")} ${plan.name}`}
          >
            <Play className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleEdit}
            aria-label={`${t("editAria")} ${plan.name}`}
          >
            <Pencil className="size-4" />
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
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label={`${t("deleteAria")} ${plan.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <Link
          href={`/workout-plans/${plan.id}`}
          className="block h-full"
          aria-label={`${t("detailsAria")} ${plan.name}`}
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
                    {getExercisePartLabel(tExerciseLabel, plan.part)}
                  </Badge>
                )}
                {plan.has_missing_exercises && (
                  <Badge
                    variant="outline"
                    className="border-amber-500 text-amber-600"
                  >
                    <AlertCircle className="mr-1 size-3" />
                    {t("missingExercises")}
                  </Badge>
                )}
              </div>
              {plan.estimated_total_time_seconds != null && (
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock10 className="size-4" />
                  <span>
                    {t("durationLabel")}{" "}
                    {formatTotalDuration(plan.estimated_total_time_seconds)}
                  </span>
                </div>
              )}
              {finalExerciseCount > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Dumbbell className="size-4" />
                    <span className="font-medium">
                      {finalExerciseCount} {exerciseCountText}
                    </span>
                  </div>
                  {plan.exercise_summaries &&
                  plan.exercise_summaries.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[280px] text-xs text-muted-foreground">
                        <thead>
                          <tr className="border-b border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-high)] text-foreground">
                            <th className="w-8 shrink-0 py-1 pr-1" aria-label={t("scopeRepeatsAria")} />
                            <th className="py-1 pr-2 text-left font-medium">
                              {t("tableExercise")}
                            </th>
                            <th className="py-1 pr-2 text-left font-medium">
                              {t("tableRepsTime")}
                            </th>
                            <th className="py-1 pr-2 text-left font-medium">
                              S
                            </th>
                            <th className="py-1 text-left font-medium">
                              {t("tableRest")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupSummariesIntoSlots(plan.exercise_summaries).map(
                            (slot, slotIdx) =>
                              slot.type === "single" ? (
                                <tr
                                  key={`single-${slotIdx}-${slot.items[0].title}`}
                                  className="border-b border-[var(--m3-outline-variant)] last:border-0"
                                >
                                  <td className="w-8 shrink-0 py-1 pr-1" />
                                  <td className="py-1 pr-2 font-medium">
                                    {slot.items[0].title}
                                  </td>
                                  <td className="py-1 pr-2">
                                    {formatRepsOrDurationLabel(
                                      slot.items[0].planned_reps,
                                      slot.items[0].planned_duration_seconds
                                    )}
                                  </td>
                                  <td className="py-1 pr-2">
                                    {slot.items[0].planned_sets != null &&
                                    slot.items[0].planned_sets > 0
                                      ? `${slot.items[0].planned_sets}`
                                      : "-"}
                                  </td>
                                  <td className="py-1">
                                    {slot.items[0].planned_rest_seconds != null &&
                                    slot.items[0].planned_rest_seconds > 0
                                      ? `${slot.items[0].planned_rest_seconds}s`
                                      : "-"}
                                  </td>
                                </tr>
                              ) : (
                                slot.items.map((ex, rowIdx) => (
                                  <tr
                                    key={`scope-${slotIdx}-${rowIdx}-${ex.title}`}
                                    className="border-b border-[var(--m3-outline-variant)] last:border-0"
                                  >
                                    {rowIdx === 0 ? (
                                      <td
                                        rowSpan={slot.items.length}
                                        className="w-8 shrink-0 border-l-4 border-[var(--m3-primary)] bg-[var(--m3-surface-container)] py-1 pr-1 text-center align-middle text-sm font-semibold text-[var(--m3-on-surface)]"
                                      >
                                        {slot.scopeRepeatCount}
                                      </td>
                                    ) : null}
                                    <td className="py-1 pr-2 font-medium">
                                      {ex.title}
                                    </td>
                                    <td className="py-1 pr-2">
                                      {formatRepsOrDurationLabel(
                                        ex.planned_reps,
                                        ex.planned_duration_seconds
                                      )}
                                    </td>
                                    <td className="py-1 pr-2">
                                      {ex.planned_sets != null &&
                                      ex.planned_sets > 0
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
                                ))
                              )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    plan.exercise_names &&
                    plan.exercise_names.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {plan.exercise_names.join(", ")}
                      </div>
                    )
                  )}
                </>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {t("createdLabel")} {formattedDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("updatedLabel")} {formattedUpdatedDate}
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
