"use client";

import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { CancelButtonProps } from "@/types/workout-plan-form";

export function CancelButton({
  hasUnsavedChanges,
  onCancel,
}: CancelButtonProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowDialog(true);
    } else {
      handleConfirmCancel();
    }
  };

  const handleConfirmCancel = () => {
    setShowDialog(false);
    if (onCancel) {
      onCancel();
    } else {
      router.push("/workout-plans");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        disabled={showDialog}
        data-test-id="workout-plan-form-cancel-button"
      >
        Anuluj
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Niezapisane zmiany</AlertDialogTitle>
            <AlertDialogDescription>
              Masz niezapisane zmiany w formularzu. Czy na pewno chcesz opuścić
              tę stronę? Wszystkie niezapisane zmiany zostaną utracone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDialog(false)}>
              Pozostań
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Opuść stronę
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
