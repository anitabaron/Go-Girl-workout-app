"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";

type CancelButtonProps = {
  hasUnsavedChanges: boolean;
};

export function CancelButton({
  hasUnsavedChanges,
}: Readonly<CancelButtonProps>) {
  const router = useRouter();

  return (
    <UnsavedChangesDialog
      hasUnsavedChanges={hasUnsavedChanges}
      onConfirmLeave={() => router.push("/exercises")}
    >
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        data-test-id="exercise-form-cancel-button"
      >
        Anuluj
      </Button>
    </UnsavedChangesDialog>
  );
}
