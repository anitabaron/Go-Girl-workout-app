"use client";

import React, { memo, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Play, CheckCircle2 } from "lucide-react";
import type { SessionSummaryDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type WorkoutSessionCardProps = {
  readonly session: SessionSummaryDTO;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "W trakcie";
  
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

function WorkoutSessionCardComponent({ session }: WorkoutSessionCardProps) {
  const router = useRouter();
  const formattedStartedAt = useMemo(
    () => formatDate(session.started_at),
    [session.started_at]
  );

  const formattedCompletedAt = useMemo(
    () => session.completed_at ? formatDate(session.completed_at) : null,
    [session.completed_at]
  );

  const duration = useMemo(
    () => formatDuration(session.started_at, session.completed_at),
    [session.started_at, session.completed_at]
  );

  const isInProgress = session.status === "in_progress";
  const planName = session.plan_name_at_time || "Plan usunięty";

  const handleResume = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/workout-sessions/${session.id}/active`);
  };

  return (
    <Card className="group relative h-full rounded-xl border border-border bg-secondary/70 transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card">
      <Link
        href={isInProgress ? `/workout-sessions/${session.id}/active` : `/workout-sessions/${session.id}`}
        className="block h-full"
        aria-label={`Zobacz szczegóły sesji: ${planName}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="line-clamp-2 text-lg font-semibold flex-1">
              {planName}
            </CardTitle>
            {isInProgress ? (
              <Badge variant="default" className="ml-2 bg-destructive text-destructive-foreground">
                <Play className="mr-1 h-3 w-3" />
                W trakcie
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Zakończona
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Calendar className="h-4 w-4" />
              <span>Rozpoczęto: {formattedStartedAt}</span>
            </div>
            {formattedCompletedAt && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Zakończono: {formattedCompletedAt}
              </div>
            )}
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Czas trwania: {duration}
            </div>
          </div>
        </CardContent>
      </Link>
      {isInProgress && (
        <CardFooter className="pt-0">
          <Button
            onClick={handleResume}
            variant="default"
            size="sm"
            className="w-full"
            aria-label="Wznów trening"
          >
            <Play className="mr-2 h-4 w-4" />
            Wznów
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// Memoizacja komponentu dla redukcji niepotrzebnych re-renderów
export const WorkoutSessionCard = memo(WorkoutSessionCardComponent);
