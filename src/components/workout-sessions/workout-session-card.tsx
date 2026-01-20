"use client";

import React, { memo, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Play, CheckCircle2, CalendarCheck, Dumbbell, Clock10, Trash2 } from "lucide-react";
import type { SessionSummaryDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteWorkoutSessionDialog } from "@/components/workout-sessions/delete-workout-session-dialog";

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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

  const exerciseCountText = useMemo(() => {
    if (!session.exercise_count || session.exercise_count === 0) return "";
    const count = session.exercise_count;
    if (count === 1) return "ćwiczenie";
    if (count < 5) return "ćwiczenia";
    return "ćwiczeń";
  }, [session.exercise_count]);

  const handleResume = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/workout-sessions/${session.id}/active`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleted = () => {
    router.refresh();
  };

  return (
    <>
      <Card className="group relative h-full rounded-xl border border-border bg-white transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card">
        <div className="absolute right-1 top-4 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label={`Usuń sesję treningową: ${planName}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
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
              <Badge variant="default" className="ml-1 bg-destructive text-destructive-foreground">
                <Play className="mr-1 h-3 w-3" />
                W trakcie
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-1">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Zakończony
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
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
               <CalendarCheck className="h-4 w-4" /> <span >Zakończono: {formattedCompletedAt}</span> 
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
             <Clock10 className="h-4 w-4" /> <span>Czas trwania: {duration}</span>
            </div>
            {session.exercise_count !== undefined && session.exercise_count > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <Dumbbell className="h-4 w-4" />
                  <span className="font-medium">
                    {session.exercise_count} {exerciseCountText}
                  </span>
                </div>
                {session.exercise_names && session.exercise_names.length > 0 && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-500 ml-6">
                    {session.exercise_names.join(", ")}
                  </div>
                )}
              </div>
            )}
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

      <DeleteWorkoutSessionDialog
        sessionId={session.id}
        sessionName={planName}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={handleDeleted}
      />
    </>
  );
}

// Memoizacja komponentu dla redukcji niepotrzebnych re-renderów
export const WorkoutSessionCard = memo(WorkoutSessionCardComponent);
