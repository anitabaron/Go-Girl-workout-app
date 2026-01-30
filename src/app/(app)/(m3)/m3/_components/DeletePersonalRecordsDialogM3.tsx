"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeletePersonalRecordsDialogM3Props = {
  readonly exerciseId: string;
  readonly exerciseTitle: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDeleted?: () => void;
};

export function DeletePersonalRecordsDialogM3({
  exerciseId,
  exerciseTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeletePersonalRecordsDialogM3Props) {
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
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.",
        );
      } else {
        toast.error("Wystąpił błąd podczas usuwania rekordów");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent aria-describedby="delete-dialog-description">
        <AlertDialogHeader>
          <AlertDialogTitle>Usuń rekordy osobiste</AlertDialogTitle>
          <AlertDialogDescription id="delete-dialog-description">
            Czy na pewno chcesz usunąć wszystkie rekordy osobiste dla ćwiczenia
            &quot;{exerciseTitle}&quot;? Tej operacji nie można cofnąć.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            aria-label={`Potwierdź usunięcie rekordów dla: ${exerciseTitle}`}
            aria-busy={isDeleting}
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
