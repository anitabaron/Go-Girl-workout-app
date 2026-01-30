"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import type { CancelButtonProps } from "@/types/workout-plan-form";

export function CancelButton({
  hasUnsavedChanges,
  onCancel,
}: Readonly<CancelButtonProps>) {
  const router = useRouter();

  const handleConfirmLeave = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/workout-plans");
    }
  };

  return (
    <UnsavedChangesDialog
      hasUnsavedChanges={hasUnsavedChanges}
      onConfirmLeave={handleConfirmLeave}
      description="Masz niezapisane zmiany w formularzu. Czy na pewno chcesz opuścić tę stronę? Wszystkie niezapisane zmiany zostaną utracone."
      cancelLabel="Pozostań"
      confirmLabel="Opuść stronę"
    >
      <Button
        type="button"
        variant="outline"
        data-test-id="workout-plan-form-cancel-button"
      >
        Anuluj
      </Button>
    </UnsavedChangesDialog>
  );
}
