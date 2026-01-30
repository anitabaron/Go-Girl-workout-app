"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      router.push("/m3/exercises");
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error("No internet connection. Check your connection and try again.");
      } else {
        toast.error("An error occurred while deleting the exercise");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="m3-title">Basic information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h2 className="m3-headline" id="exercise-title">
            {exercise.title}
          </h2>
          <div className="flex flex-wrap gap-2">
            <ExerciseTypeBadge type={exercise.type} />
            <Badge variant="outline">{EXERCISE_PART_LABELS[exercise.part]}</Badge>
            {exercise.level && (
              <Badge variant="outline">{exercise.level}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="m3-title">Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {exercise.reps != null && (
              <div>
                <p className="m3-label text-muted-foreground mb-1">Reps</p>
                <p className="m3-headline" aria-label={`${exercise.reps} reps`}>
                  {exercise.reps}
                </p>
              </div>
            )}
            {exercise.duration_seconds != null && (
              <div>
                <p className="m3-label text-muted-foreground mb-1">
                  Duration (seconds)
                </p>
                <p
                  className="m3-headline"
                  aria-label={`${exercise.duration_seconds} seconds`}
                >
                  {exercise.duration_seconds}
                </p>
              </div>
            )}
            <div>
              <p className="m3-label text-muted-foreground mb-1">Series</p>
              <p
                className="m3-headline"
                aria-label={`${exercise.series} series`}
              >
                {exercise.series}
              </p>
            </div>
            {exercise.rest_in_between_seconds != null && (
              <div>
                <p className="m3-label text-muted-foreground mb-1">
                  Rest between sets (seconds)
                </p>
                <p
                  className="m3-headline"
                  aria-label={`${exercise.rest_in_between_seconds} seconds rest`}
                >
                  {exercise.rest_in_between_seconds}
                </p>
              </div>
            )}
            {exercise.rest_after_series_seconds != null && (
              <div>
                <p className="m3-label text-muted-foreground mb-1">
                  Rest after series (seconds)
                </p>
                <p
                  className="m3-headline"
                  aria-label={`${exercise.rest_after_series_seconds} seconds rest`}
                >
                  {exercise.rest_after_series_seconds}
                </p>
              </div>
            )}
            {exercise.estimated_set_time_seconds != null && (
              <div>
                <p className="m3-label text-muted-foreground mb-1">
                  Estimated set time (seconds)
                </p>
                <p
                  className="m3-headline"
                  aria-label={`${exercise.estimated_set_time_seconds} seconds`}
                >
                  {exercise.estimated_set_time_seconds}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional info */}
      {(exercise.level || exercise.details) && (
        <Card>
          <CardHeader>
            <CardTitle className="m3-title">Additional information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercise.level && (
              <div>
                <p className="m3-label text-muted-foreground mb-1">Level</p>
                <p className="m3-body">{exercise.level}</p>
              </div>
            )}
            {exercise.details && (
              <div>
                <p className="m3-label text-muted-foreground mb-1">Details</p>
                <p className="m3-body whitespace-pre-wrap">{exercise.details}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Relations info */}
      {relationsData.hasRelations && (
        <Card role="region" aria-labelledby="exercise-relations-title">
          <CardHeader>
            <CardTitle className="m3-title" id="exercise-relations-title">
              Relations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relationsData.plansCount > 0 && (
              <p className="m3-label text-muted-foreground">
                Used in {relationsData.plansCount}{" "}
                {relationsData.plansCount === 1 ? "workout plan" : "workout plans"}
              </p>
            )}
            {relationsData.sessionsCount > 0 && (
              <p className="m3-label text-muted-foreground">
                Used in {relationsData.sessionsCount}{" "}
                {relationsData.sessionsCount === 1 ? "session" : "sessions"}
              </p>
            )}
            <p className="m3-label text-destructive mt-2" role="alert">
              Exercise cannot be deleted because it is used in workout history.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button variant="default" className="flex-1 m3-cta" asChild>
          <Link href={`/m3/exercises/${exercise.id}/edit`}>Edit</Link>
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
