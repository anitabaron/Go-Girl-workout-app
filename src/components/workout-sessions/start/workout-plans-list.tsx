"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { WorkoutPlanDTO } from "@/types";
import { WorkoutPlanStartCard } from "./workout-plan-start-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type WorkoutPlansListProps = {
  initialPlans: Array<
    Omit<WorkoutPlanDTO, "exercises"> & {
      exercise_count?: number;
      exercise_names?: string[];
    }
  >;
  initialNextCursor?: string | null;
};

/**
 * Client Component renderujący listę kart planów treningowych.
 * Obsługuje paginację i wyświetlanie stanu ładowania.
 */
export function WorkoutPlansList({
  initialPlans,
  initialNextCursor,
}: Readonly<WorkoutPlansListProps>) {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState(initialPlans);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      // Pobierz parametry z URL (jeśli istnieją)
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", nextCursor);

      const response = await fetch(`/api/workout-plans?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to load more plans");
      }

      const data = await response.json();

      // Dodaj nowe plany do istniejącej listy
      startTransition(() => {
        setPlans((prev) => [...prev, ...data.items]);
        setNextCursor(data.nextCursor ?? null);
      });
    } catch (error) {
      console.error("Error loading more plans:", error);
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.",
        );
      } else {
        toast.error("Nie udało się załadować kolejnych planów treningowych");
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-4" data-test-id="workout-session-start-plans-list">
      {plans.map((plan) => (
        <WorkoutPlanStartCard
          key={plan.id}
          plan={plan}
          exerciseCount={plan.exercise_count}
        />
      ))}
      {isLoadingMore && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
      {nextCursor && !isLoadingMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            disabled={isPending}
          >
            {isPending ? "Ładowanie..." : "Załaduj więcej"}
          </Button>
        </div>
      )}
    </div>
  );
}
