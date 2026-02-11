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
import { useTranslations } from "@/i18n/client";

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
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsavedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("unsavedDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("stay")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
