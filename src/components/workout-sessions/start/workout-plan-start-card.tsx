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

type WorkoutPlanStartCardProps = {
  plan: Omit<WorkoutPlanDTO, "exercises"> & {
    exercise_count?: number;
    exercise_names?: string[];
  };
  exerciseCount?: number;
};

/**
 * Mapuje ExercisePart na czytelną etykietę.
 */
function getPartLabel(part: ExercisePart | null): string | null {
  if (!part) {
    return null;
  }

  return EXERCISE_PART_LABELS[part] ?? part;
}

/**
 * Client Component renderujący kartę pojedynczego planu treningowego z przyciskiem "Rozpocznij".
 * Wyświetla podstawowe informacje o planie (nazwa, part, liczba ćwiczeń).
 */
export function WorkoutPlanStartCard({
  plan,
  exerciseCount,
}: WorkoutPlanStartCardProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const partLabel = getPartLabel(plan.part);

  const finalExerciseCount = useMemo(() => {
    return exerciseCount ?? plan.exercise_count ?? 0;
  }, [exerciseCount, plan.exercise_count]);

  const exerciseCountText = useMemo(() => {
    if (finalExerciseCount === 0) return "";
    if (finalExerciseCount === 1) return "ćwiczenie";
    if (finalExerciseCount < 5) return "ćwiczenia";
    return "ćwiczeń";
  }, [finalExerciseCount]);

  const handleStart = async () => {
    setIsStarting(true);

    try {
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workout_plan_id: plan.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 400) {
          toast.error(
            errorData.message ||
              "Nieprawidłowe dane wejściowe. Sprawdź wybór planu.",
          );
        } else if (response.status === 404) {
          toast.error(
            "Plan treningowy nie został znaleziony lub nie należy do Ciebie.",
          );
        } else if (response.status === 409) {
          toast.error(
            "Masz już aktywną sesję treningową. Wznów istniejącą sesję.",
          );
          // Odśwież stronę, aby wyświetlić kartę wznowienia
          router.refresh();
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Brak autoryzacji. Zaloguj się ponownie.");
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error(
            errorData.message ||
              "Wystąpił błąd serwera. Spróbuj ponownie później.",
          );
        } else {
          toast.error(
            errorData.message || "Nie udało się rozpocząć sesji treningowej",
          );
        }
        return;
      }

      const data = await response.json();
      const sessionId = data.id || data.data?.id;

      if (sessionId) {
        toast.success("Sesja treningowa rozpoczęta");
        router.push(`/workout-sessions/${sessionId}/active`);
      } else {
        console.error("No sessionId found in response:", data);
        toast.error("Nie udało się pobrać ID sesji treningowej");
      }
    } catch (error) {
      console.error("Error starting workout session:", error);
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.",
        );
      } else {
        toast.error("Wystąpił błąd podczas rozpoczynania sesji treningowej");
      }
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
          <div className="flex flex-wrap gap-2">
            {partLabel && (
              <Badge
                variant="outline"
                className="border-destructive text-destructive"
                aria-label={`Part: ${partLabel}`}
              >
                {partLabel}
              </Badge>
            )}
          </div>
          {plan.estimated_total_time_seconds && (
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              <Clock10 className="h-4 w-4" />
              <span>
                Czas trwania:{" "}
                {formatTotalDuration(plan.estimated_total_time_seconds)}
              </span>
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
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleStart}
          disabled={isStarting}
          variant="default"
          size="lg"
          className="w-full"
          aria-label={`Rozpocznij trening z planem ${plan.name}`}
          data-test-id={`start-plan-button-${plan.id}`}
        >
          {isStarting ? (
            "Rozpoczynanie..."
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Rozpocznij
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
