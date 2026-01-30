"use client";

import { useState } from "react";
import { Calendar, Play, X, Clock10, Dumbbell } from "lucide-react";
import type { SessionDetailDTO } from "@/types";
import {
  formatSessionDuration,
  getExerciseCount,
  getExerciseCountText,
  getExerciseNames,
} from "@/lib/utils/session-format";
import { useResumeSession } from "@/hooks/use-resume-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ResumeSessionCardM3Props = {
  readonly session: SessionDetailDTO;
};

export function ResumeSessionCardM3({ session }: ResumeSessionCardM3Props) {
  const {
    handleResume,
    handleCancel,
    isResuming,
    isCancelling,
    isCancelDialogOpen,
    setIsCancelDialogOpen,
  } = useResumeSession(session, {
    redirectHref: `/m3/workout-sessions/${session.id}/active`,
  });

  const totalExercises = session.exercises.length;
  const currentExerciseNumber = Math.max(1, session.current_position ?? 0);
  const progressPercentage =
    totalExercises > 0
      ? Math.round((currentExerciseNumber / totalExercises) * 100)
      : 0;

  const formattedDate = new Date(session.started_at).toLocaleDateString(
    "en-US",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const duration = formatSessionDuration(session);
  const exerciseCount = getExerciseCount(session);
  const exerciseNames = getExerciseNames(session);
  const exerciseCountText = getExerciseCountText(exerciseCount);

  return (
    <Card className="border-primary bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-5" />
          Active workout session
        </CardTitle>
        <CardDescription>
          You have an ongoing session that you can resume
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Workout plan
          </p>
          <p className="text-lg font-semibold">{session.plan_name_at_time}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Started</p>
          <p className="text-base">{formattedDate}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Progress</p>
          <p className="text-base">
            Exercise {currentExerciseNumber} of {totalExercises} (
            {progressPercentage}%)
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Duration</p>
          <p className="flex items-center gap-2 text-base font-semibold">
            <Clock10 className="size-4" />
            {duration}
          </p>
        </div>
        {exerciseCount > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Dumbbell className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                {exerciseCount} {exerciseCountText}
              </p>
            </div>
            {exerciseNames.length > 0 && (
              <div className="ml-6 text-xs text-muted-foreground">
                {exerciseNames.join(", ")}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleResume}
          disabled={isResuming}
          className="m3-cta w-full sm:w-auto"
          aria-label="Resume workout"
        >
          {isResuming ? (
            <span className="mr-2">Resuming...</span>
          ) : (
            <>
              <Play className="mr-2 size-4" />
              Resume workout
            </>
          )}
        </Button>
        <AlertDialog
          open={isCancelDialogOpen}
          onOpenChange={setIsCancelDialogOpen}
        >
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              aria-label="Cancel session"
            >
              <X className="mr-2 size-4" />
              Cancel session
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel workout session?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this session? Progress will be
                saved, but the session will be marked as completed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isCancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isCancelling ? "Cancelling..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
