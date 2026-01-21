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

type DeletePersonalRecordsDialogProps = {
  readonly exerciseId: string;
  readonly exerciseTitle: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDeleted?: () => void;
};

export function DeletePersonalRecordsDialog({
  exerciseId,
  exerciseTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeletePersonalRecordsDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/personal-records/${exerciseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Rekordy nie zostały znalezione");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Brak autoryzacji. Zaloguj się ponownie.");
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
        } else {
          const data = await response.json().catch(() => ({}));
          toast.error(data.message || "Nie udało się usunąć rekordów");
        }
        return;
      }

      toast.success("Rekordy zostały usunięte");
      onDeleted?.();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił błąd podczas usuwania rekordów");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="delete-dialog-description">
        <DialogHeader>
          <DialogTitle>Usuń rekordy osobiste</DialogTitle>
          <DialogDescription id="delete-dialog-description">
            Czy na pewno chcesz usunąć wszystkie rekordy osobiste dla ćwiczenia &quot;{exerciseTitle}&quot;?
            Tej operacji nie można cofnąć.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={isDeleting}
            aria-label="Anuluj usuwanie rekordów osobistych"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isDeleting}
            aria-label={`Potwierdź usunięcie rekordów dla: ${exerciseTitle}`}
            aria-busy={isDeleting}
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
