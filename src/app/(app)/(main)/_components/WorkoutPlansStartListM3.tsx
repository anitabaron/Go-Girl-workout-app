"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { WorkoutPlanDTO } from "@/types";
import { WorkoutPlanStartCardM3 } from "./WorkoutPlanStartCardM3";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

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
  const t = useTranslations("workoutPlansStartList");
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
      if (!response.ok) throw new Error(t("loadMoreError"));
      const data = await response.json();
      startTransition(() => {
        setPlans((prev) => [...prev, ...data.items]);
        setNextCursor(data.nextCursor ?? null);
      });
    } catch (error) {
      console.error("Error loading more:", error);
      toast.error(t("loadMoreToast"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6" data-test-id="workout-session-start-plans-list">
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
            {isLoadingMore ? t("loading") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
