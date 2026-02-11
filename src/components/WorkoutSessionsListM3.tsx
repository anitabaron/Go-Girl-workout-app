"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { History } from "lucide-react";
import type { SessionSummaryDTO } from "@/types";
import { EmptyState } from "./EmptyState";
import { M3WorkoutSessionCard } from "./M3WorkoutSessionCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";

type WorkoutSessionsListM3Props = {
  initialSessions: SessionSummaryDTO[];
  initialNextCursor?: string | null;
  initialHasMore: boolean;
};

export function WorkoutSessionsListM3({
  initialSessions,
  initialNextCursor,
  initialHasMore,
}: Readonly<WorkoutSessionsListM3Props>) {
  const t = useTranslations("workoutSessionsList");
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState(initialSessions);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!searchParams.get("cursor")) {
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
      if (!response.ok) throw new Error(t("loadMoreError"));
      const data = await response.json();
      startTransition(() => {
        setSessions((prev) => [...prev, ...data.items]);
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

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<History className="size-12 text-muted-foreground" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {sessions.map((session) => (
          <M3WorkoutSessionCard key={session.id} session={session} />
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
