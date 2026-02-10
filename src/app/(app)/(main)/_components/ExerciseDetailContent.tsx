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
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import type { ExerciseDTO } from "@/types";

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
          toast.error(
            "Cannot delete exercise because it is used in workout history",
          );
        } else if (response.status === 404) {
          toast.error("Exercise not found");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Unauthorized. Please log in again.");
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error("Failed to delete exercise");
        }
        return;
      }

      toast.success("Exercise deleted");
      router.push("/exercises");
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error(
          "No internet connection. Check your connection and try again.",
        );
      } else {
        toast.error("An error occurred while deleting the exercise");
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
          label="Title"
          value={exercise.title}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <p className="m3-label text-muted-foreground">Type</p>
            <div className="flex flex-wrap gap-2">
              {exercise.types.map((t) => (
                <ExerciseTypeBadge key={t} type={t} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="m3-label text-muted-foreground">Part</p>
            <div className="flex flex-wrap gap-2">
              {exercise.parts.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="border-primary text-primary"
                >
                  {EXERCISE_PART_LABELS[p]}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="m3-label text-muted-foreground">Level</p>
            <div className="flex flex-wrap gap-2">
              {exercise.level && (
                <Badge variant="outline">{exercise.level}</Badge>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="m3-label text-muted-foreground">Unilateral</p>
            <div className="flex flex-wrap gap-2">
              {exercise.is_unilateral ? (
                <Badge variant="secondary">Unilateral</Badge>
              ) : (
                <Badge variant="outline">No</Badge>
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
                  PR — results saved
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-muted-foreground/50 text-muted-foreground"
                >
                  PR — not saved
                </Badge>
              )}
            </div>
          </div>
        </div>

        {exercise.details && (
          <ReadOnlyField
            id="exercise-detail-details"
            label="Details"
            value={
              <span className="whitespace-pre-wrap">{exercise.details}</span>
            }
          />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {exercise.reps != null && (
            <ReadOnlyField
              id="exercise-detail-reps"
              label="Reps"
              value={exercise.reps}
            />
          )}
          {exercise.duration_seconds != null && (
            <ReadOnlyField
              id="exercise-detail-duration"
              label="Duration (sec)"
              value={exercise.duration_seconds}
            />
          )}
          <ReadOnlyField
            id="exercise-detail-series"
            label="Series"
            value={exercise.series}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exercise.rest_in_between_seconds != null && (
            <ReadOnlyField
              id="exercise-detail-rest-between"
              label="Rest between sets (sec)"
              value={exercise.rest_in_between_seconds}
            />
          )}
          {exercise.rest_after_series_seconds != null && (
            <ReadOnlyField
              id="exercise-detail-rest-after"
              label="Rest after series (sec)"
              value={exercise.rest_after_series_seconds}
            />
          )}
          {exercise.estimated_set_time_seconds != null && (
            <ReadOnlyField
              id="exercise-detail-estimated-set-time"
              label="Estimated set time (sec)"
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
            Exercise cannot be deleted because it is used in{" "}
            {relationsData.plansCount > 0 && (
              <>
                {relationsData.plansCount}{" "}
                {relationsData.plansCount === 1
                  ? "workout plan"
                  : "workout plans"}
                {relationsData.sessionsCount > 0 ? " and " : ""}
              </>
            )}
            {relationsData.sessionsCount > 0 && (
              <>
                {relationsData.sessionsCount}{" "}
                {relationsData.sessionsCount === 1 ? "session" : "sessions"}
              </>
            )}
            .
          </p>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button variant="default" className="flex-1 m3-cta" asChild>
          <Link href={`/exercises/${exercise.id}/edit`}>Edit</Link>
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
                  aria-label={`Delete exercise: ${exercise.title}`}
                  aria-describedby={
                    relationsData.hasRelations
                      ? "delete-disabled-tooltip"
                      : undefined
                  }
                >
                  Delete
                </Button>
              </span>
            </TooltipTrigger>
            {relationsData.hasRelations && (
              <TooltipContent id="delete-disabled-tooltip">
                <p>
                  Cannot delete exercise because it is used in workout history
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent aria-describedby="delete-dialog-description">
          <DialogHeader>
            <DialogTitle>Delete exercise</DialogTitle>
            <DialogDescription id="delete-dialog-description">
              Are you sure you want to delete &quot;{exercise.title}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsDeleteDialogOpen(false)}
              variant="outline"
              disabled={isDeleting}
              aria-label="Cancel delete"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={isDeleting}
              aria-label={`Confirm delete: ${exercise.title}`}
              aria-busy={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
