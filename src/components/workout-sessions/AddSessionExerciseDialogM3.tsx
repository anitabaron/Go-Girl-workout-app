"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import type { ExerciseDTO } from "@/types";
import { ExerciseSelectorM3 } from "@/components/exercises/ExerciseSelectorM3";
import { postWorkoutSessionExercise } from "@/lib/api/workout-sessions";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";

type AddSessionExerciseDialogM3Props = {
  readonly sessionId: string;
  readonly existingExerciseIds?: string[];
  readonly onAdded?: () => void;
};

export function AddSessionExerciseDialogM3({
  sessionId,
  existingExerciseIds = [],
  onAdded,
}: AddSessionExerciseDialogM3Props) {
  const t = useTranslations("addSessionExerciseDialog");
  const [open, setOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDTO | null>(
    null,
  );
  const [isAdding, setIsAdding] = useState(false);

  const handleToggleExercise = (exercise: ExerciseDTO) => {
    setSelectedExercise((prev) =>
      prev?.id === exercise.id ? null : exercise,
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedExercise(null);
    }
    setOpen(isOpen);
  };

  const handleAdd = async () => {
    if (!selectedExercise) return;
    setIsAdding(true);
    try {
      await postWorkoutSessionExercise(sessionId, selectedExercise.id);
      toast.success(t("addedSuccess"));
      setSelectedExercise(null);
      setOpen(false);
      onAdded?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("addFailed");
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          data-test-id="workout-session-add-exercise-button"
        >
          <Plus className="size-4" />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100vh-2rem)] max-w-[400px] flex-col overflow-hidden rounded-[var(--m3-radius-large)] p-4 sm:p-6 md:max-w-[600px] lg:max-w-[1000px]"
        data-test-id="workout-session-add-exercise-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-1">
          <ExerciseSelectorM3
            selectedExerciseIds={selectedExercise ? [selectedExercise.id] : []}
            onToggleExercise={handleToggleExercise}
            excludedExerciseIds={existingExerciseIds}
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isAdding}
            data-test-id="workout-session-add-exercise-dialog-cancel"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!selectedExercise || isAdding}
            aria-busy={isAdding}
            data-test-id="workout-session-add-exercise-dialog-confirm"
          >
            {isAdding ? t("adding") : t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
