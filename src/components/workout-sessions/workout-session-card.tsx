"use client";

import React, { memo, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Play,
  CheckCircle2,
  CalendarCheck,
  Dumbbell,
  Clock10,
  X,
} from "lucide-react";
import type { SessionSummaryDTO } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardActionButtons } from "@/components/ui/card-action-buttons";
import { DeleteWorkoutSessionDialog } from "@/components/workout-sessions/delete-workout-session-dialog";
import { CancelSessionDialog } from "@/components/workout-sessions/cancel-session-dialog";
import { formatDateTime } from "@/lib/utils/date-format";
import {
  formatSessionDuration,
  getExerciseCountText,
} from "@/lib/utils/session-format";

type WorkoutSessionCardProps = {
  readonly session: SessionSummaryDTO;
};

function WorkoutSessionCardComponent({ session }: WorkoutSessionCardProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const isInProgress = session.status === "in_progress";

  const formattedStartedAt = useMemo(
    () => formatDateTime(session.started_at),
    [session.started_at],
  );

  const formattedCompletedAt = useMemo(
    () => (session.completed_at ? formatDateTime(session.completed_at) : null),
    [session.completed_at],
  );

  const duration = useMemo(() => formatSessionDuration(session), [session]);

  const planName = session.plan_name_at_time || "Plan usunięty";

  const exerciseCountText = useMemo(
    () => getExerciseCountText(session.exercise_count ?? 0),
    [session.exercise_count],
  );

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
      <Card className="group relative h-full rounded-xl border border-border bg-secondary/30 transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card">
        <CardActionButtons
          onDelete={handleDeleteClick}
          editAriaLabel={`Edytuj sesję treningową: ${planName}`}
          deleteAriaLabel={`Usuń sesję treningową: ${planName}`}
          editDisabled
        />
        <Link
          href={
            isInProgress
              ? `/workout-sessions/${session.id}/active`
              : `/workout-sessions/${session.id}`
          }
          className="block h-full"
          aria-label={`Zobacz szczegóły sesji: ${planName}`}
        >
          <CardHeader>
            <div className="flex flex-col items-start gap-2">
              <CardTitle className="line-clamp-2 text-lg font-semibold flex-1">
                {planName}
              </CardTitle>
              {isInProgress ? (
                <Badge
                  variant="default"
                  className=" bg-destructive text-destructive-foreground"
                >
                  <Play className="mr-1 h-3 w-3" />W trakcie
                </Badge>
              ) : (
                <Badge variant="secondary">
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
                  <CalendarCheck className="h-4 w-4" />
                  <span>Zakończono: {formattedCompletedAt}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                <Clock10 className="h-4 w-4" />
                <span>Czas trwania: {duration}</span>
              </div>
              {session.exercise_count !== undefined &&
                session.exercise_count > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Dumbbell className="h-4 w-4" />
                      <span className="font-medium">
                        {session.exercise_count} {exerciseCountText}
                      </span>
                    </div>
                    {session.exercise_names &&
                      session.exercise_names.length > 0 && (
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
          <CardFooter className="pt-0 flex gap-3">
            <Button
              onClick={handleResume}
              variant="default"
              size="sm"
              className="flex-1"
              aria-label="Wznów trening"
            >
              <Play className="mr-2 h-4 w-4" />
              Wznów
            </Button>
            <CancelSessionDialog
              open={isCancelDialogOpen}
              onOpenChange={setIsCancelDialogOpen}
              sessionId={session.id}
              onCancelled={() => router.refresh()}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  aria-label="Anuluj sesję"
                >
                  <X className="mr-2 h-4 w-4" />
                  Anuluj sesję
                </Button>
              }
            />
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

export const WorkoutSessionCard = memo(WorkoutSessionCardComponent);
