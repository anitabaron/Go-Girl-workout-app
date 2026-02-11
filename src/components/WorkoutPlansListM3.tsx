"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import type { WorkoutPlanDTO } from "@/types";
import { EmptyState } from "./EmptyState";
import { M3WorkoutPlanCard } from "./M3WorkoutPlanCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";

type WorkoutPlansListM3Props = {
  initialPlans: (Omit<WorkoutPlanDTO, "exercises"> & {
    exercise_count?: number;
    has_missing_exercises?: boolean;
  })[];
  initialNextCursor?: string | null;
  initialHasMore: boolean;
};

export function WorkoutPlansListM3({
  initialPlans,
  initialNextCursor,
  initialHasMore,
}: Readonly<WorkoutPlansListM3Props>) {
  const t = useTranslations("workoutPlansList");
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState(initialPlans);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!searchParams.get("cursor")) {
      setPlans(initialPlans);
      setNextCursor(initialNextCursor);
      setHasMore(initialHasMore);
    }
  }, [searchParams, initialPlans, initialNextCursor, initialHasMore]);

  const handleLoadMore = async (cursor: string) => {
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", cursor);
      const response = await fetch(`/api/workout-plans?${params.toString()}`);
      if (!response.ok) throw new Error(t("loadMoreError"));
      const data = await response.json();
      startTransition(() => {
        setPlans((prev) => [...prev, ...data.items]);
        setNextCursor(data.nextCursor);
        setHasMore(data.nextCursor != null);
      });
    } catch (error) {
      console.error("Error loading more:", error);
      toast.error(t("loadMoreToast"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDelete = async (planId: string) => {
    const response = await fetch(`/api/workout-plans/${planId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete plan");
    startTransition(() => {
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    });
  };

  if (plans.length === 0) {
    return (
      <div data-test-id="workout-plans-empty-state">
        <EmptyState
          icon={<Calendar className="size-12 text-muted-foreground" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-test-id="workout-plans-list">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {plans.map((plan) => (
          <M3WorkoutPlanCard
            key={plan.id}
            plan={plan}
            exerciseCount={plan.exercise_count}
            onDelete={handleDelete}
          />
        ))}
      </div>
      {hasMore && nextCursor && !isLoadingMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => handleLoadMore(nextCursor)}
            disabled={isLoadingMore}
            aria-label={t("loadMoreAria")}
          >
            {isLoadingMore ? t("loading") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
