"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";
import { ConfirmActionDialogM3 } from "@/components/shared/ConfirmActionDialogM3";

type CancelButtonM3Props = {
  hasUnsavedChanges: boolean;
  onConfirmLeave: () => void;
};

export function CancelButtonM3({
  hasUnsavedChanges,
  onConfirmLeave,
}: Readonly<CancelButtonM3Props>) {
  const t = useTranslations("cancelButton");
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
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        data-test-id="workout-plan-form-cancel-button"
      >
        {t("cancel")}
      </Button>
      <ConfirmActionDialogM3
        open={showDialog}
        onOpenChange={setShowDialog}
        title={t("unsavedTitle")}
        description={t("unsavedDescription")}
        cancelLabel={t("stay")}
        confirmLabel={t("leave")}
        onConfirm={handleConfirm}
        confirmVariant="destructive"
      />
    </>
  );
}
