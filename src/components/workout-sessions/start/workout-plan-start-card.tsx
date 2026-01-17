"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";

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

type WorkoutPlanStartCardProps = {
  plan: Omit<WorkoutPlanDTO, "exercises">;
  exerciseCount?: number;
};

/**
 * Mapuje ExercisePart na czytelną etykietę.
 */
function getPartLabel(part: ExercisePart | null): string | null {
  if (!part) {
    return null;
  }

  const labels: Record<ExercisePart, string> = {
    Legs: "Nogi",
    Arms: "Ręce",
    Back: "Plecy",
    Chest: "Klatka",
    Core: "Brzuch",
  };

  return labels[part] ?? part;
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
              "Nieprawidłowe dane wejściowe. Sprawdź wybór planu."
          );
        } else if (response.status === 404) {
          toast.error(
            "Plan treningowy nie został znaleziony lub nie należy do Ciebie."
          );
        } else if (response.status === 409) {
          toast.error(
            "Masz już aktywną sesję treningową. Wznów istniejącą sesję."
          );
          // Odśwież stronę, aby wyświetlić kartę wznowienia
          router.refresh();
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Brak autoryzacji. Zaloguj się ponownie.");
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error(
            errorData.message ||
              "Wystąpił błąd serwera. Spróbuj ponownie później."
          );
        } else {
          toast.error(
            errorData.message || "Nie udało się rozpocząć sesji treningowej"
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
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił błąd podczas rozpoczynania sesji treningowej");
      }
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {partLabel && (
          <Badge variant="secondary" aria-label={`Part: ${partLabel}`}>
            {partLabel}
          </Badge>
        )}
        {exerciseCount !== undefined && (
          <Badge variant="outline" aria-label={`Liczba ćwiczeń: ${exerciseCount}`}>
            {exerciseCount} {exerciseCount === 1 ? "ćwiczenie" : "ćwiczeń"}
          </Badge>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleStart}
          disabled={isStarting}
          variant="default"
          size="lg"
          className="w-full"
          aria-label={`Rozpocznij trening z planem ${plan.name}`}
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
