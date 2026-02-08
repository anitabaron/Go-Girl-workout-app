"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useMemo, useState } from "react";
import {
  Calendar,
  Play,
  CheckCircle2,
  CalendarCheck,
  Dumbbell,
  Clock10,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteWorkoutSessionDialogM3 } from "../_components/DeleteWorkoutSessionDialogM3";
import { CancelWorkoutSessionDialogM3 } from "../_components/CancelWorkoutSessionDialogM3";
import type { SessionSummaryDTO } from "@/types";
import { formatDateTime } from "@/lib/utils/date-format";
import { formatSessionDuration } from "@/lib/utils/session-format";

type M3WorkoutSessionCardProps = {
  readonly session: SessionSummaryDTO;
};

function M3WorkoutSessionCardComponent({ session }: M3WorkoutSessionCardProps) {
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
  const planName = session.plan_name_at_time ?? "Plan deleted";
  const exerciseCountText = useMemo(() => {
    const count = session.exercise_count ?? 0;
    if (count === 0) return "";
    if (count === 1) return "exercise";
    return "exercises";
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

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(
      isInProgress
        ? `/workout-sessions/${session.id}/active`
        : `/workout-sessions/${session.id}?edit=1`,
    );
  };

  return (
    <>
      <Card className="group relative h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleEdit}
            aria-label={
              isInProgress
                ? `Resume session: ${planName}`
                : `Edit session: ${planName}`
            }
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label={`Delete session: ${planName}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <Link
          href={
            isInProgress
              ? `/workout-sessions/${session.id}/active`
              : `/workout-sessions/${session.id}`
          }
          className="block h-full"
          aria-label={`View session details: ${planName}`}
        >
          <CardHeader>
            <div className="flex flex-col items-start gap-2">
              <h3 className="m3-headline line-clamp-2 pr-10">{planName}</h3>
              {isInProgress ? (
                <Badge
                  variant="default"
                  className="bg-primary text-primary-foreground"
                >
                  <Play className="mr-1 size-3" />
                  In progress
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <CheckCircle2 className="mr-1 size-3" />
                  Completed
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                <span>Started: {formattedStartedAt}</span>
              </div>
              {formattedCompletedAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarCheck className="size-4" />
                  <span>Completed: {formattedCompletedAt}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock10 className="size-4" />
                <span>Duration: {duration}</span>
              </div>
              {session.exercise_count != null && session.exercise_count > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Dumbbell className="size-4" />
                    <span className="font-medium">
                      {session.exercise_count} {exerciseCountText}
                    </span>
                  </div>
                  {session.exercise_names &&
                    session.exercise_names.length > 0 && (
                      <div className="ml-6 text-xs text-muted-foreground">
                        {session.exercise_names.join(", ")}
                      </div>
                    )}
                </div>
              )}
            </div>
          </CardContent>
        </Link>

        {isInProgress && (
          <CardFooter className="flex gap-3 pt-0">
            <Button
              onClick={handleResume}
              size="sm"
              className="m3-cta flex-1"
              aria-label="Resume workout"
            >
              <Play className="mr-2 size-4" />
              Resume
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCancelDialogOpen(true);
              }}
              aria-label="Cancel"
            >
              <X className="mr-2 size-4" />
              Cancel
            </Button>
          </CardFooter>
        )}
      </Card>

      <DeleteWorkoutSessionDialogM3
        session={session}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />

      <CancelWorkoutSessionDialogM3
        sessionId={session.id}
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}

export const M3WorkoutSessionCard = memo(M3WorkoutSessionCardComponent);
