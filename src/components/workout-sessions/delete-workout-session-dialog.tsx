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

type DeleteWorkoutSessionDialogProps = {
  readonly sessionId: string;
  readonly sessionName: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDeleted?: () => void;
};

export function DeleteWorkoutSessionDialog({
  sessionId,
  sessionName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteWorkoutSessionDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/workout-sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Sesja treningowa nie została znaleziona");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Brak autoryzacji. Zaloguj się ponownie.");
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
        } else {
          toast.error("Nie udało się usunąć sesji treningowej");
        }
        return;
      }

      toast.success("Sesja treningowa została usunięta");
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił błąd podczas usuwania sesji treningowej");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="delete-dialog-description">
        <DialogHeader>
          <DialogTitle>Usuń sesję treningową</DialogTitle>
          <DialogDescription id="delete-dialog-description">
            Czy na pewno chcesz usunąć sesję treningową &quot;{sessionName}&quot;?
            Tej operacji nie można cofnąć. Wszystkie ćwiczenia i serie z tej sesji
            również zostaną usunięte.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={isDeleting}
            aria-label="Anuluj usuwanie sesji treningowej"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isDeleting}
            aria-label={`Potwierdź usunięcie sesji treningowej: ${sessionName}`}
            aria-busy={isDeleting}
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
