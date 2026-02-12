"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { toast } from "sonner";
import type { ExerciseDTO } from "@/types";
import { EmptyState } from "@/components/layout/EmptyState";
import { M3ExerciseCard } from "./M3ExerciseCard";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

type ExercisesListProps = {
  initialExercises: ExerciseDTO[];
  initialNextCursor?: string | null;
  initialHasMore: boolean;
};

export function ExercisesList({
  initialExercises,
  initialNextCursor,
  initialHasMore,
}: Readonly<ExercisesListProps>) {
  const t = useTranslations("exercisesList");
  const searchParams = useSearchParams();
  const [exercises, setExercises] = useState(initialExercises);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!searchParams.get("cursor")) {
      setExercises(initialExercises);
      setNextCursor(initialNextCursor);
      setHasMore(initialHasMore);
    }
  }, [searchParams, initialExercises, initialNextCursor, initialHasMore]);

  const handleLoadMore = async (cursor: string) => {
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", cursor);
      const response = await fetch(`/api/exercises?${params.toString()}`);
      if (!response.ok) throw new Error(t("loadMoreError"));
      const data = await response.json();
      startTransition(() => {
        setExercises((prev) => [...prev, ...data.items]);
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

  if (exercises.length === 0) {
    return (
      <div data-test-id="exercises-empty-state">
        <EmptyState
          icon={<Dumbbell className="size-12 text-muted-foreground" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-test-id="exercises-list">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {exercises.map((exercise) => (
          <M3ExerciseCard key={exercise.id} exercise={exercise} />
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
