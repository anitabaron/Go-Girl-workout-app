"use client";

import { useCancelSession } from "@/hooks/use-cancel-session";
import { useTranslations } from "@/i18n/client";
import { ConfirmActionDialogM3 } from "@/components/shared/ConfirmActionDialogM3";

type CancelWorkoutSessionDialogM3Props = {
  readonly sessionId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSuccess?: () => void;
};

export function CancelWorkoutSessionDialogM3({
  sessionId,
  open,
  onOpenChange,
  onSuccess,
}: CancelWorkoutSessionDialogM3Props) {
  const t = useTranslations("cancelWorkoutSessionDialog");
  const { cancel, isCancelling } = useCancelSession(sessionId);

  const handleConfirm = async () => {
    await cancel();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <ConfirmActionDialogM3
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      cancelLabel={t("cancel")}
      confirmLabel={t("confirm")}
      confirmingLabel={t("cancelling")}
      onConfirm={handleConfirm}
      isConfirming={isCancelling}
    />
  );
}
