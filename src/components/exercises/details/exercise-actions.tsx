"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteExerciseDialog } from "./delete-exercise-dialog";

type ExerciseActionsProps = {
  readonly exerciseId: string;
  readonly exerciseTitle: string;
  readonly hasRelations: boolean;
};

export function ExerciseActions({
  exerciseId,
  exerciseTitle,
  hasRelations,
}: ExerciseActionsProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEdit = () => {
    router.push(`/exercises/${exerciseId}/edit`);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Button
        onClick={handleEdit}
        variant="default"
        className="flex-1"
        aria-label={`Edytuj ćwiczenie: ${exerciseTitle}`}
      >
        Edytuj
      </Button>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1">
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
                disabled={hasRelations}
                className="w-full"
                aria-label={`Usuń ćwiczenie: ${exerciseTitle}`}
                aria-describedby={hasRelations ? "delete-disabled-tooltip" : undefined}
              >
                Usuń
              </Button>
            </span>
          </TooltipTrigger>
          {hasRelations && (
            <TooltipContent id="delete-disabled-tooltip">
              <p>
                Nie można usunąć ćwiczenia, ponieważ jest używane w historii
                treningów
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DeleteExerciseDialog
        exerciseId={exerciseId}
        exerciseTitle={exerciseTitle}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </div>
  );
}
