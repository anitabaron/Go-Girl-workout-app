"use client";

import { useState } from "react";
import { ConfirmActionDialogM3 } from "@/components/shared/ConfirmActionDialogM3";

export type UnsavedChangesDialogProps = {
  hasUnsavedChanges: boolean;
  onConfirmLeave: () => void;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  children: React.ReactNode;
};

/**
 * Wrapper pokazujący dialog potwierdzenia przy próbie opuszczenia strony z niezapisanymi zmianami.
 * Używa AlertDialog dla spójności z resztą aplikacji.
 */
export function UnsavedChangesDialog({
  hasUnsavedChanges,
  onConfirmLeave,
  title = "Niezapisane zmiany",
  description = "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?",
  cancelLabel = "Zostań",
  confirmLabel = "Opuszczam",
  children,
}: Readonly<UnsavedChangesDialogProps>) {
  const [showDialog, setShowDialog] = useState(false);

  const handleTriggerClick = () => {
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
      <div className="contents" onClick={handleTriggerClick}>
        {children}
      </div>

      <ConfirmActionDialogM3
        open={showDialog}
        onOpenChange={setShowDialog}
        title={title}
        description={description}
        cancelLabel={cancelLabel}
        confirmLabel={confirmLabel}
        onConfirm={handleConfirm}
        confirmVariant="destructive"
      />
    </>
  );
}
