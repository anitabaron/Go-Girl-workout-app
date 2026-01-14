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

type DeleteExerciseDialogProps = {
  readonly exerciseId: string;
  readonly exerciseTitle: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
};

export function DeleteExerciseDialog({
  exerciseId,
  exerciseTitle,
  open,
  onOpenChange,
}: DeleteExerciseDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 409) {
          toast.error(
            "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"
          );
        } else if (response.status === 404) {
          toast.error("Ćwiczenie nie zostało znalezione");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Brak autoryzacji. Zaloguj się ponownie.");
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
        } else {
          toast.error("Nie udało się usunąć ćwiczenia");
        }
        return;
      }

      toast.success("Ćwiczenie zostało usunięte");
      router.push("/exercises");
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił błąd podczas usuwania ćwiczenia");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="delete-dialog-description">
        <DialogHeader>
          <DialogTitle>Usuń ćwiczenie</DialogTitle>
          <DialogDescription id="delete-dialog-description">
            Czy na pewno chcesz usunąć ćwiczenie &quot;{exerciseTitle}&quot;?
            Tej operacji nie można cofnąć.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={isDeleting}
            aria-label="Anuluj usuwanie ćwiczenia"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isDeleting}
            aria-label={`Potwierdź usunięcie ćwiczenia: ${exerciseTitle}`}
            aria-busy={isDeleting}
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
