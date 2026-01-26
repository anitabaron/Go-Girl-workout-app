"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { WorkoutPlanDTO } from "@/types";
import { WorkoutPlanCard } from "./workout-plan-card";
import { EmptyState } from "./empty-state";
import { LoadMoreButton } from "./load-more-button";
import { SkeletonLoader } from "./skeleton-loader";

type WorkoutPlansListProps = {
  initialPlans: (Omit<WorkoutPlanDTO, "exercises"> & { exercise_count?: number })[];
  initialNextCursor?: string | null;
  initialHasMore: boolean;
};

export function WorkoutPlansList({
  initialPlans,
  initialNextCursor,
  initialHasMore,
}: Readonly<WorkoutPlansListProps>) {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState(initialPlans);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset listy gdy zmieniają się filtry/sortowanie (brak kursora w URL)
  useEffect(() => {
    const currentCursor = searchParams.get("cursor");
    
    // Jeśli nie ma kursora w URL, resetujemy do początkowych wartości
    if (!currentCursor) {
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
      
      if (!response.ok) {
        throw new Error("Failed to load more plans");
      }

      const data = await response.json();
      
      // Append nowych planów do istniejącej listy
      startTransition(() => {
        setPlans((prev) => [...prev, ...data.items]);
        setNextCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      });
    } catch (error) {
      console.error("Error loading more plans:", error);
      throw error;
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDelete = async (planId: string) => {
    const response = await fetch(`/api/workout-plans/${planId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete plan");
    }

    // Usuń plan z listy
    startTransition(() => {
      setPlans((prev) => prev.filter((plan) => plan.id !== planId));
    });
  };

  if (plans.length === 0 && !isPending) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4" data-test-id="workout-plans-list">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {plans.map((plan) => (
          <WorkoutPlanCard
            key={plan.id}
            plan={plan}
            exerciseCount={plan.exercise_count}
            onDelete={handleDelete}
          />
        ))}
        {isLoadingMore && (
          <>
            <SkeletonLoader count={1} />
            <SkeletonLoader count={1} />
            <SkeletonLoader count={1} />
          </>
        )}
      </div>

      {hasMore && nextCursor && !isLoadingMore && (
        <div className="flex justify-center pt-4">
          <LoadMoreButton nextCursor={nextCursor} onLoadMore={handleLoadMore} />
        </div>
      )}
    </div>
  );
}
