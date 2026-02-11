"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Clock10, Dumbbell } from "lucide-react";
import type { WorkoutPlanDTO, ExercisePart } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import { formatTotalDuration } from "@/lib/utils/time-format";
import { useTranslations } from "@/i18n/client";

type WorkoutPlanStartCardM3Props = {
  plan: Omit<WorkoutPlanDTO, "exercises"> & {
    exercise_count?: number;
    exercise_names?: string[];
  };
  exerciseCount?: number;
};

function getPartLabel(part: ExercisePart | null): string | null {
  if (!part) return null;
  return EXERCISE_PART_LABELS[part] ?? part;
}

export function WorkoutPlanStartCardM3({
  plan,
  exerciseCount,
}: WorkoutPlanStartCardM3Props) {
  const t = useTranslations("workoutPlanStartCard");
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const partLabel = getPartLabel(plan.part);
  const finalExerciseCount = exerciseCount ?? plan.exercise_count ?? 0;
  const exerciseCountText = useMemo(() => {
    if (finalExerciseCount === 0) return "";
    if (finalExerciseCount === 1) return t("exerciseSingular");
    return t("exercisePlural");
  }, [finalExerciseCount, t]);

  const handleStart = async () => {
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
    <Card
      className="transition-shadow hover:shadow-md"
      data-test-id={`workout-plan-start-card-${plan.id}`}
    >
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {partLabel && (
            <Badge variant="outline" className="border-primary text-primary">
              {partLabel}
            </Badge>
          )}
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Dumbbell className="size-4" />
                <span className="font-medium">
                  {finalExerciseCount} {exerciseCountText}
                </span>
              </div>
              {plan.exercise_names && plan.exercise_names.length > 0 && (
                <div className="ml-6 text-xs text-muted-foreground">
                  {plan.exercise_names.join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleStart}
          disabled={isStarting}
          className="m3-cta w-full"
          aria-label={`${t("startAria")} ${plan.name}`}
        >
          {isStarting ? (
            t("starting")
          ) : (
            <>
              <Play className="mr-2 size-4" />
              {t("start")}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
