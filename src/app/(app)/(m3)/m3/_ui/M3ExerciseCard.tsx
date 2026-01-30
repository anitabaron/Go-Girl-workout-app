"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EXERCISE_PART_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import type { ExerciseDTO } from "@/types";

type M3ExerciseCardProps = {
  readonly exercise: ExerciseDTO;
};

export function M3ExerciseCard({ exercise }: M3ExerciseCardProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const params: string[] = [`Serie: ${exercise.series}`];
  if (exercise.reps) params.push(`Powtórzenia: ${exercise.reps}`);
  if (exercise.duration_seconds)
    params.push(`Czas: ${exercise.duration_seconds}s`);

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/m3/exercises/${exercise.id}/edit`);
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
      setIsDeleteDialogOpen(false);
      router.refresh();
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
    <>
      <Card className="group relative h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleEdit}
            aria-label={`Edit exercise: ${exercise.title}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label={`Delete exercise: ${exercise.title}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <Link
          href={`/m3/exercises/${exercise.id}`}
          className="block h-full"
          aria-label={`Zobacz szczegóły ćwiczenia: ${exercise.title}`}
        >
          <CardHeader className="pb-1.5 pt-3 px-4">
            <h3 className="m3-card-title line-clamp-2 pr-16">
              {exercise.title}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="m3-card-meta px-1.5 py-0.5 rounded bg-[var(--m3-surface-container-high)]">
                {EXERCISE_TYPE_LABELS[exercise.type]}
              </span>
              <span className="m3-card-meta px-1.5 py-0.5 rounded bg-[var(--m3-surface-container-high)]">
                {EXERCISE_PART_LABELS[exercise.part]}
              </span>
              {exercise.level && (
                <span className="m3-card-meta px-1.5 py-0.5 rounded bg-[var(--m3-surface-container-high)]">
                  {exercise.level}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3 space-y-1.5">
            <p className="m3-card-meta">{params.join(" · ")}</p>
            {exercise.details && (
              <p className="m3-card-body line-clamp-2">{exercise.details}</p>
            )}
          </CardContent>
        </Link>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent aria-describedby="delete-exercise-description">
          <DialogHeader>
            <DialogTitle>Delete exercise</DialogTitle>
            <DialogDescription id="delete-exercise-description">
              Are you sure you want to delete &quot;{exercise.title}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              aria-label="Cancel deletion"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label={`Confirm delete: ${exercise.title}`}
              aria-busy={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
