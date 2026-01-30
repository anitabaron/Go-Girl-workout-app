"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SessionDetailDTO, SessionSummaryDTO } from "@/types";
import { formatDateTime } from "@/lib/utils/date-format";
import {
  formatSessionDuration,
  getExerciseCount,
  getExerciseCountText,
  getExerciseNames,
} from "@/lib/utils/session-format";
import { WorkoutSessionExercisesListM3 } from "./WorkoutSessionExercisesListM3";

type WorkoutSessionDetailContentProps = {
  readonly session: SessionDetailDTO;
};

function SessionDurationDisplay({
  startedAt,
  completedAt,
  status,
}: {
  startedAt: string;
  completedAt: string | null;
  status: SessionSummaryDTO["status"];
}) {
  const start = new Date(startedAt);
  const end =
    status === "completed" && completedAt ? new Date(completedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;

  if (hours > 0) {
    return (
      <span>
        {hours}h {minutes}min
      </span>
    );
  }
  return <span>{minutes}min</span>;
}

export function WorkoutSessionDetailContent({
  session,
}: WorkoutSessionDetailContentProps) {
  const planName = session.plan_name_at_time ?? "Plan deleted";
  const formattedStartedAt = formatDateTime(session.started_at);
  const formattedCompletedAt = session.completed_at
    ? formatDateTime(session.completed_at)
    : null;
  const exerciseCount = getExerciseCount(session);
  const exerciseNames = getExerciseNames(session);
  const exerciseCountText = getExerciseCountText(exerciseCount);
  const isInProgress = session.status === "in_progress";

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="m3-title">Session info</h2>
            {isInProgress ? (
              <Badge
                variant="default"
                className="bg-primary text-primary-foreground"
              >
                In progress
              </Badge>
            ) : (
              <Badge variant="secondary">Completed</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Workout plan
              </p>
              <p className="mt-1 font-semibold">{planName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Started
              </p>
              <p className="mt-1 font-semibold">{formattedStartedAt}</p>
            </div>
            {formattedCompletedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Completed
                </p>
                <p className="mt-1 font-semibold">{formattedCompletedAt}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Duration
              </p>
              <p className="mt-1 font-semibold">
                <SessionDurationDisplay
                  startedAt={session.started_at}
                  completedAt={session.completed_at}
                  status={session.status}
                />
              </p>
            </div>
          </div>

          {exerciseCount > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">
                {exerciseCount} {exerciseCountText}
              </p>
              {exerciseNames.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {exerciseNames.join(", ")}
                </p>
              )}
            </div>
          )}

          {isInProgress && (
            <div className="mt-6">
              <Button asChild className="m3-cta">
                <Link href={`/m3/workout-sessions/${session.id}/active`}>
                  <Play className="mr-2 size-4" />
                  Resume workout
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="m3-headline mb-6">Exercises in session</h2>
        <WorkoutSessionExercisesListM3
          exercises={session.exercises}
          sessionId={session.id}
        />
      </div>
    </div>
  );
}
