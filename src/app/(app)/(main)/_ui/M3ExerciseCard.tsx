"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EXERCISE_LABELS_NAMESPACE,
  getExercisePartLabel,
} from "@/lib/exercises/labels";
import { formatDuration } from "@/lib/utils/time-format";
import { toast } from "sonner";
import type { ExerciseDTO } from "@/types";
import { useTranslations } from "@/i18n/client";

type M3ExerciseCardProps = {
  readonly exercise: ExerciseDTO;
};

export function M3ExerciseCard({ exercise }: M3ExerciseCardProps) {
  const t = useTranslations("exerciseCard");
  const tExerciseLabel = useTranslations(EXERCISE_LABELS_NAMESPACE);
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/exercises/${exercise.id}/edit`);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/exercises/new?duplicate=${exercise.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

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
      setIsDeleteDialogOpen(false);
      router.refresh();
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
    <>
      <Card
        className="group relative h-full overflow-hidden transition-shadow hover:shadow-md"
        data-test-id={`exercise-card-${exercise.id}`}
      >
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDuplicate}
            aria-label={`${t("duplicateAria")} ${exercise.title}`}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleEdit}
            aria-label={`${t("editAria")} ${exercise.title}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label={`${t("deleteAria")} ${exercise.title}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <Link
          href={`/exercises/${exercise.id}`}
          className="block h-full"
          aria-label={`${t("detailsAria")} ${exercise.title}`}
        >
          <CardHeader className="pb-1.5 pt-3 px-4">
            <h3 className="m3-card-title line-clamp-2 pr-16">
              {exercise.title}
            </h3>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {exercise.types.map((t) => (
                <ExerciseTypeBadge key={t} type={t} />
              ))}
              {exercise.parts.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="border-primary text-primary"
                >
                  {getExercisePartLabel(tExerciseLabel, p)}
                </Badge>
              ))}
              {exercise.level && (
                <Badge variant="outline">{exercise.level}</Badge>
              )}
              {exercise.is_unilateral && (
                <Badge variant="secondary">{t("unilateral")}</Badge>
              )}
              {exercise.is_save_to_pr === true ? (
                <Badge variant="secondary" className="bg-primary/15 text-primary">
                  PR
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-muted-foreground/50 text-muted-foreground line-through"
                  title={t("prNotSavedTitle")}
                >
                  PR
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3 space-y-2.5">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span>
                <span className="text-muted-foreground">{t("sets")} </span>
                <span className="font-semibold text-foreground">
                  {exercise.series}
                </span>
              </span>
              {exercise.reps != null && (
                <span>
                  <span className="text-muted-foreground">{t("reps")} </span>
                  <span className="font-semibold text-foreground">
                    {exercise.reps}
                  </span>
                </span>
              )}
              {exercise.duration_seconds != null && (
                <span>
                  <span className="text-muted-foreground">{t("duration")} </span>
                  <span className="font-semibold text-foreground">
                    {exercise.duration_seconds}s
                  </span>
                </span>
              )}
              {exercise.rest_in_between_seconds != null && (
                <span>
                  <span className="text-muted-foreground">{t("restBetween")} </span>
                  <span className="font-medium text-foreground">
                    {formatDuration(exercise.rest_in_between_seconds)}
                  </span>
                </span>
              )}
              {exercise.rest_after_series_seconds != null && (
                <span>
                  <span className="text-muted-foreground">{t("restAfter")} </span>
                  <span className="font-medium text-foreground">
                    {formatDuration(exercise.rest_after_series_seconds)}
                  </span>
                </span>
              )}
            </div>
            {exercise.details && (
              <p className="text-[0.8125rem] leading-relaxed text-muted-foreground line-clamp-2">
                {exercise.details}
              </p>
            )}
          </CardContent>
        </Link>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent aria-describedby="delete-exercise-description">
          <DialogHeader>
            <DialogTitle>{t("deleteDialogTitle")}</DialogTitle>
            <DialogDescription id="delete-exercise-description">
              {t("deleteDialogDescriptionStart")} &quot;{exercise.title}&quot;?{" "}
              {t("deleteDialogDescriptionEnd")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              aria-label={t("cancelAria")}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label={`${t("confirmDeleteAria")} ${exercise.title}`}
              aria-busy={isDeleting}
            >
              {isDeleting ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
