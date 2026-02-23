"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Play, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SessionDetailDTO, SessionSummaryDTO } from "@/types";
import { formatDateTime } from "@/lib/utils/date-format";
import { workoutSessionToExportFormat } from "@/lib/workout-sessions/session-to-export-format";
import {
  getExerciseCount,
  getExerciseCountText,
  getExerciseNames,
} from "@/lib/utils/session-format";
import { WorkoutSessionExercisesListM3 } from "./WorkoutSessionExercisesListM3";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";

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
  const t = useTranslations("workoutSessionDetailContent");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditFromUrl =
    searchParams.get("edit") === "1" && session.status === "completed";
  const [userToggledEdit, setUserToggledEdit] = useState(false);
  const isEditMode = isEditFromUrl || userToggledEdit;

  const planName = session.plan_name_at_time ?? t("planDeleted");
  const formattedStartedAt = formatDateTime(session.started_at);
  const formattedCompletedAt = session.completed_at
    ? formatDateTime(session.completed_at)
    : null;
  const exerciseCount = getExerciseCount(session);
  const exerciseNames = getExerciseNames(session);
  const exerciseCountText = getExerciseCountText(exerciseCount);
  const isInProgress = session.status === "in_progress";
  const isCompleted = session.status === "completed";

  const handleCancelEdit = () => {
    setUserToggledEdit(false);
    router.replace(`/workout-sessions/${session.id}`, { scroll: false });
  };

  const handleExportJson = () => {
    const payload = workoutSessionToExportFormat(session);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const baseName =
      session.plan_name_at_time?.replaceAll(/[^\p{L}\p{N}\s-]/gu, "").trim() ||
      "workout-session";
    const datePart = session.started_at.slice(0, 10);

    a.href = url;
    a.download = `${baseName}-${datePart}-${session.id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t("exportSuccess"));
  };

  return (
    <div className="space-y-8">
      <Card data-test-id="workout-session-details-metadata">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m3-title">{t("sessionInfoTitle")}</h2>
            <div className="flex items-center gap-2">
              {isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  aria-label={t("cancelEditAria")}
                >
                  <X className="mr-2 size-4" />
                  {t("cancelEdit")}
                </Button>
              )}
              {isCompleted && !isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportJson}
                  aria-label={t("exportSessionAria")}
                >
                  <Download className="mr-2 size-4" />
                  {t("exportJson")}
                </Button>
              )}
              {isCompleted && !isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserToggledEdit(true)}
                  aria-label={t("editSessionAria")}
                >
                  <Pencil className="mr-2 size-4" />
                  {t("editSession")}
                </Button>
              )}
              {isInProgress ? (
                <Badge
                  variant="default"
                  className="bg-primary text-primary-foreground"
                >
                  {t("inProgress")}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  data-test-id="workout-session-status-completed"
                >
                  {t("completed")}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("workoutPlanLabel")}
              </p>
              <p
                className="mt-1 font-semibold"
                data-test-id="workout-session-details-plan-name"
              >
                {planName}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("startedLabel")}
              </p>
              <p className="mt-1 font-semibold">{formattedStartedAt}</p>
            </div>
            {formattedCompletedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("completedLabel")}
                </p>
                <p className="mt-1 font-semibold">{formattedCompletedAt}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("durationLabel")}
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
                <Link href={`/workout-sessions/${session.id}/active`}>
                  <Play className="mr-2 size-4" />
                  {t("resumeWorkout")}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div data-test-id="workout-session-details-exercises-list">
        <h2 className="m3-headline mb-6">{t("exercisesInSession")}</h2>
        <WorkoutSessionExercisesListM3
          exercises={session.exercises}
          sessionId={session.id}
          isEditMode={isEditMode}
          onExerciseSaved={() => router.refresh()}
        />
      </div>
    </div>
  );
}
