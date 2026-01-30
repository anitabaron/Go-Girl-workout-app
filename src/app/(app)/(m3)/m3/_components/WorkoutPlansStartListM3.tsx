"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { WorkoutPlanDTO } from "@/types";
import { WorkoutPlanStartCardM3 } from "./WorkoutPlanStartCardM3";
import { Button } from "@/components/ui/button";

type WorkoutPlansStartListM3Props = {
  plans: Array<
    Omit<WorkoutPlanDTO, "exercises"> & {
      exercise_count?: number;
      exercise_names?: string[];
    }
  >;
  nextCursor?: string | null;
};

export function WorkoutPlansStartListM3({
  plans: initialPlans,
  nextCursor: initialNextCursor,
}: Readonly<WorkoutPlansStartListM3Props>) {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState(initialPlans);
  const [nextCursor, setNextCursor] = useState(initialNextCursor ?? null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", nextCursor);
      const response = await fetch(`/api/workout-plans?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load more plans");
      const data = await response.json();
      startTransition(() => {
        setPlans((prev) => [...prev, ...data.items]);
        setNextCursor(data.nextCursor ?? null);
      });
    } catch (error) {
      console.error("Error loading more:", error);
      toast.error("Failed to load more plans. Try again.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {plans.map((plan) => (
          <WorkoutPlanStartCardM3
            key={plan.id}
            plan={plan}
            exerciseCount={plan.exercise_count}
          />
        ))}
      </div>
      {nextCursor && !isLoadingMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
