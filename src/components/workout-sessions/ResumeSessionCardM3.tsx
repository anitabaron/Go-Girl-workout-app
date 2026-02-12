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
import { useLocale, useTranslations } from "@/i18n/client";

type ResumeSessionCardM3Props = {
  readonly session: SessionDetailDTO;
};

export function ResumeSessionCardM3({ session }: ResumeSessionCardM3Props) {
  const t = useTranslations("resumeSessionCard");
  const { locale } = useLocale();
  const {
    handleResume,
    handleCancel,
    isResuming,
    isCancelling,
    isCancelDialogOpen,
    setIsCancelDialogOpen,
  } = useResumeSession(session, {
    redirectHref: `/workout-sessions/${session.id}/active`,
  });

  const totalExercises = session.exercises.length;
  const currentExerciseNumber = Math.max(1, session.current_position ?? 0);
  const progressPercentage =
    totalExercises > 0
      ? Math.round((currentExerciseNumber / totalExercises) * 100)
      : 0;

  const formattedDate = new Date(session.started_at).toLocaleDateString(
    locale,
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
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t("planLabel")}</p>
          <p className="text-lg font-semibold">{session.plan_name_at_time}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t("startedLabel")}</p>
          <p className="text-base">{formattedDate}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t("progressLabel")}</p>
          <p className="text-base">
            {t("exerciseLabel")} {currentExerciseNumber} {t("of")} {totalExercises} (
            {progressPercentage}%)
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t("durationLabel")}</p>
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
          aria-label={t("resumeAria")}
        >
          {isResuming ? (
            <span className="mr-2">{t("resuming")}</span>
          ) : (
            <>
              <Play className="mr-2 size-4" />
              {t("resumeCta")}
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
              className="w-full sm:w-auto rounded-[var(--m3-radius-lg)] border-[var(--m3-outline-variant)] bg-transparent text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-high)]"
              aria-label={t("cancelAria")}
            >
              <X className="mr-2 size-4" />
              {t("cancel")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("cancelDialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("cancelDialogDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>
                {t("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isCancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isCancelling ? t("cancelling") : t("confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
