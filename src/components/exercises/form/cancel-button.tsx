"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CancelButtonProps = {
  hasUnsavedChanges: boolean;
};

export function CancelButton({ hasUnsavedChanges }: CancelButtonProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowDialog(true);
    } else {
      router.push("/exercises");
    }
  };

  const handleConfirm = () => {
    setShowDialog(false);
    router.push("/exercises");
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        className="w-full sm:w-auto"
        data-test-id="exercise-form-cancel-button"
      >
        Anuluj
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Niezapisane zmiany</DialogTitle>
            <DialogDescription>
              Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Zostań
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirm}>
              Opuszczam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
