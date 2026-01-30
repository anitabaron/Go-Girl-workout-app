"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { SessionSummaryDTO } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { History } from "lucide-react";
import { WorkoutSessionCard } from "./workout-session-card";
import { LoadMoreButton } from "../workout-plans/load-more-button";
import { SkeletonLoader } from "../workout-plans/skeleton-loader";

type WorkoutSessionsListProps = {
  initialSessions: SessionSummaryDTO[];
  initialNextCursor?: string | null;
  initialHasMore: boolean;
};

export function WorkoutSessionsList({
  initialSessions,
  initialNextCursor,
  initialHasMore,
}: Readonly<WorkoutSessionsListProps>) {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState(initialSessions);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset listy gdy zmieniają się filtry/sortowanie (brak kursora w URL)
  useEffect(() => {
    const currentCursor = searchParams.get("cursor");

    // Jeśli nie ma kursora w URL, resetujemy do początkowych wartości
    if (!currentCursor) {
      setSessions(initialSessions);
      setNextCursor(initialNextCursor);
      setHasMore(initialHasMore);
    }
  }, [searchParams, initialSessions, initialNextCursor, initialHasMore]);

  const handleLoadMore = async (cursor: string) => {
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", cursor);

      const response = await fetch(
        `/api/workout-sessions?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load more sessions");
      }

      const data = await response.json();

      // Append nowych sesji do istniejącej listy
      startTransition(() => {
        setSessions((prev) => [...prev, ...data.items]);
        setNextCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      });
    } catch (error) {
      console.error("Error loading more sessions:", error);
      throw error;
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (sessions.length === 0 && !isPending) {
    return (
      <EmptyState
        icon={
          <History className="h-8 w-8 text-destructive" aria-hidden="true" />
        }
        title="Nie masz jeszcze żadnych sesji treningowych"
        description="Rozpocznij swój pierwszy trening, aby zobaczyć historię sesji"
        actionHref="/workout-sessions/start"
        actionLabel="Rozpocznij trening"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 ">
        {sessions.map((session) => (
          <WorkoutSessionCard key={session.id} session={session} />
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
