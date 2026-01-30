"use client";

import { useState } from "react";
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

type CancelButtonM3Props = {
  hasUnsavedChanges: boolean;
  onConfirmLeave: () => void;
};

export function CancelButtonM3({
  hasUnsavedChanges,
  onConfirmLeave,
}: Readonly<CancelButtonM3Props>) {
  const [showDialog, setShowDialog] = useState(false);

  const handleClick = () => {
    if (hasUnsavedChanges) {
      setShowDialog(true);
    } else {
      onConfirmLeave();
    }
  };

  const handleConfirm = () => {
    setShowDialog(false);
    onConfirmLeave();
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={handleClick}>
        Cancel
      </Button>
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? All
              unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
