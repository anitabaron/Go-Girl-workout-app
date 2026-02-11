"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import {
  EXERCISE_LABELS_NAMESPACE,
  getExercisePartLabel,
} from "@/lib/exercises/labels";
import type { ExerciseDTO } from "@/types";
import { useTranslations } from "@/i18n/client";

type RelationsData = {
  plansCount: number;
  sessionsCount: number;
  hasRelations: boolean;
};

type ExerciseDetailContentProps = {
  readonly exercise: ExerciseDTO;
  readonly relationsData: RelationsData;
};

function ReadOnlyField({
  label,
  value,
  id,
}: {
  label: string;
  value: React.ReactNode;
  id: string;
}) {
  return (
    <div className="space-y-2">
      <p id={id} className="m3-label text-muted-foreground">
        {label}
      </p>
      <p className="m3-body">{value}</p>
    </div>
  );
}

export function ExerciseDetailContent({
  exercise,
  relationsData,
}: ExerciseDetailContentProps) {
  const t = useTranslations("exerciseDetailContent");
  const tExerciseLabel = useTranslations(EXERCISE_LABELS_NAMESPACE);
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/exercises/${exercise.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 409) {
          toast.error(t("deleteConflict"));
        } else if (response.status === 404) {
          toast.error(t("deleteNotFound"));
        } else if (response.status === 401 || response.status === 403) {
          toast.error(t("unauthorized"));
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error(t("serverError"));
        } else {
          toast.error(t("deleteFailed"));
        }
        return;
      }

      toast.success(t("deleteSuccess"));
      router.push("/exercises");
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error(t("offlineError"));
      } else {
        toast.error(t("deleteGenericError"));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact layout matching ExerciseFormM3 */}
      <div className="space-y-4">
        <ReadOnlyField
          id="exercise-detail-title"
          label={t("titleLabel")}
          value={exercise.title}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <p className="m3-label text-muted-foreground">{t("typeLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {exercise.types.map((t) => (
                <ExerciseTypeBadge key={t} type={t} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="m3-label text-muted-foreground">{t("partLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {exercise.parts.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="border-primary text-primary"
                >
                  {getExercisePartLabel(tExerciseLabel, p)}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="m3-label text-muted-foreground">{t("levelLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {exercise.level && (
                <Badge variant="outline">{exercise.level}</Badge>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="m3-label text-muted-foreground">{t("unilateralLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {exercise.is_unilateral ? (
                <Badge variant="secondary">{t("unilateral")}</Badge>
              ) : (
                <Badge variant="outline">{t("no")}</Badge>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="m3-label text-muted-foreground">PR</p>
            <div className="flex flex-wrap gap-2">
              {exercise.is_save_to_pr === true ? (
                <Badge
                  variant="secondary"
                  className="bg-primary/15 text-primary"
                >
                  {t("prSaved")}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-muted-foreground/50 text-muted-foreground"
                >
                  {t("prNotSaved")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {exercise.details && (
          <ReadOnlyField
            id="exercise-detail-details"
            label={t("detailsLabel")}
            value={
              <span className="whitespace-pre-wrap">{exercise.details}</span>
            }
          />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {exercise.reps != null && (
            <ReadOnlyField
              id="exercise-detail-reps"
              label={t("repsLabel")}
              value={exercise.reps}
            />
          )}
          {exercise.duration_seconds != null && (
            <ReadOnlyField
              id="exercise-detail-duration"
              label={t("durationSecLabel")}
              value={exercise.duration_seconds}
            />
          )}
          <ReadOnlyField
            id="exercise-detail-series"
            label={t("seriesLabel")}
            value={exercise.series}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exercise.rest_in_between_seconds != null && (
            <ReadOnlyField
              id="exercise-detail-rest-between"
              label={t("restBetweenLabel")}
              value={exercise.rest_in_between_seconds}
            />
          )}
          {exercise.rest_after_series_seconds != null && (
            <ReadOnlyField
              id="exercise-detail-rest-after"
              label={t("restAfterLabel")}
              value={exercise.rest_after_series_seconds}
            />
          )}
          {exercise.estimated_set_time_seconds != null && (
            <ReadOnlyField
              id="exercise-detail-estimated-set-time"
              label={t("estimatedSetTimeLabel")}
              value={exercise.estimated_set_time_seconds}
            />
          )}
        </div>
      </div>

      {/* Relations info - at the end */}
      {relationsData.hasRelations && (
        <section
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
          aria-labelledby="exercise-relations-title"
        >
          <p
            id="exercise-relations-title"
            className="m3-label text-destructive"
            role="alert"
          >
            {t("relationPrefix")}{" "}
            {relationsData.plansCount > 0 && (
              <>
                {relationsData.plansCount}{" "}
                {relationsData.plansCount === 1
                  ? t("workoutPlanSingular")
                  : t("workoutPlanPlural")}
                {relationsData.sessionsCount > 0 ? ` ${t("and")} ` : ""}
              </>
            )}
            {relationsData.sessionsCount > 0 && (
              <>
                {relationsData.sessionsCount}{" "}
                {relationsData.sessionsCount === 1
                  ? t("sessionSingular")
                  : t("sessionPlural")}
              </>
            )}
            .
          </p>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button variant="default" className="flex-1 m3-cta" asChild>
          <Link href={`/exercises/${exercise.id}/edit`}>{t("edit")}</Link>
        </Button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1">
                <Button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  variant="destructive"
                  disabled={relationsData.hasRelations}
                  className="w-full"
                  aria-label={`${t("deleteAria")} ${exercise.title}`}
                  aria-describedby={
                    relationsData.hasRelations
                      ? "delete-disabled-tooltip"
                      : undefined
                  }
                >
                  {t("delete")}
                </Button>
              </span>
            </TooltipTrigger>
            {relationsData.hasRelations && (
              <TooltipContent id="delete-disabled-tooltip">
                <p>{t("deleteConflict")}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent aria-describedby="delete-dialog-description">
          <DialogHeader>
            <DialogTitle>{t("deleteDialogTitle")}</DialogTitle>
            <DialogDescription id="delete-dialog-description">
              {t("deleteDialogDescriptionStart")} &quot;{exercise.title}&quot;?{" "}
              {t("deleteDialogDescriptionEnd")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsDeleteDialogOpen(false)}
              variant="outline"
              disabled={isDeleting}
              aria-label={t("cancelAria")}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={isDeleting}
              aria-label={`${t("confirmDeleteAria")} ${exercise.title}`}
              aria-busy={isDeleting}
            >
              {isDeleting ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
