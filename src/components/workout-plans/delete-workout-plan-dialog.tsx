"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DeleteWorkoutPlanDialogProps = {
  readonly planId: string;
  readonly planName: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDeleted?: () => void;
  readonly onDelete?: (planId: string) => Promise<void>;
};

export function DeleteWorkoutPlanDialog({
  planId,
  planName,
  open,
  onOpenChange,
  onDeleted,
  onDelete,
}: DeleteWorkoutPlanDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      if (onDelete) {
        await onDelete(planId);
      } else {
        const response = await fetch(`/api/workout-plans/${planId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Plan treningowy nie został znaleziony");
          } else if (response.status === 401 || response.status === 403) {
            toast.error("Brak autoryzacji. Zaloguj się ponownie.");
            router.push("/login");
          } else if (response.status >= 500) {
            toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
          } else {
            toast.error("Nie udało się usunąć planu treningowego");
          }
          return;
        }
      }

      toast.success("Plan treningowy został usunięty");
      onDeleted?.();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił błąd podczas usuwania planu treningowego");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="delete-dialog-description">
        <DialogHeader>
          <DialogTitle>Usuń plan treningowy</DialogTitle>
          <DialogDescription id="delete-dialog-description">
            Czy na pewno chcesz usunąć plan treningowy &quot;{planName}&quot;?
            Tej operacji nie można cofnąć.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={isDeleting}
            aria-label="Anuluj usuwanie planu treningowego"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isDeleting}
            aria-label={`Potwierdź usunięcie planu: ${planName}`}
            aria-busy={isDeleting}
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
