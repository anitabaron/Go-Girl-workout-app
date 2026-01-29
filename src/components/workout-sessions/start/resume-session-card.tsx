"use client";

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

type ResumeSessionCardProps = {
  readonly session: SessionDetailDTO;
};

/**
 * Client Component wyświetlający kartę z informacją o istniejącej sesji in_progress.
 * Zawiera szczegóły sesji oraz przyciski do wznowienia lub anulowania sesji.
 */
export function ResumeSessionCard({ session }: ResumeSessionCardProps) {
  const {
    handleResume,
    handleCancel,
    isResuming,
    isCancelling,
    isCancelDialogOpen,
    setIsCancelDialogOpen,
  } = useResumeSession(session);

  const totalExercises = session.exercises.length;
  const currentExerciseNumber = Math.max(1, session.current_position ?? 0);
  const progressPercentage =
    totalExercises > 0
      ? Math.round((currentExerciseNumber / totalExercises) * 100)
      : 0;

  const startedAtDate = new Date(session.started_at);
  const formattedDate = startedAtDate.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const duration = formatSessionDuration(session);
  const exerciseCount = getExerciseCount(session);
  const exerciseNames = getExerciseNames(session);
  const exerciseCountText = getExerciseCountText(exerciseCount);

  return (
    <Card className="border-destructive bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Aktywna sesja treningowa
        </CardTitle>
        <CardDescription>
          Masz rozpoczętą sesję treningową, którą możesz wznowić
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Plan treningowy
          </p>
          <p className="text-lg font-semibold">{session.plan_name_at_time}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Rozpoczęto
          </p>
          <p className="text-base">{formattedDate}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Postęp</p>
          <p className="text-base">
            Ćwiczenie {currentExerciseNumber} z {totalExercises} (
            {progressPercentage}%)
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Czas trwania
          </p>
          <p className="text-base font-semibold flex items-center gap-2">
            <Clock10 className="h-4 w-4" />
            {duration}
          </p>
        </div>
        {exerciseCount > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                {exerciseCount} {exerciseCountText}
              </p>
            </div>
            {exerciseNames.length > 0 && (
              <div className="text-xs text-muted-foreground ml-6">
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
          variant="default"
          size="lg"
          className="w-full sm:w-auto"
          aria-label="Wznów trening"
        >
          {isResuming ? (
            <span className="mr-2">Wznawianie...</span>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Wznów trening
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
              aria-label="Anuluj sesję"
            >
              <X className="mr-2 h-4 w-4" />
              Anuluj sesję
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anuluj sesję treningową?</AlertDialogTitle>
              <AlertDialogDescription>
                Czy na pewno chcesz anulować tę sesję treningową? Postęp
                zostanie zapisany, ale sesja zostanie oznaczona jako ukończona.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>
                Anuluj
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isCancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isCancelling ? "Anulowanie..." : "Potwierdź"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
