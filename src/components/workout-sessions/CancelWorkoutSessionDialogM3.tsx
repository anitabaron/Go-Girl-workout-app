"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import { useCancelSession } from "@/hooks/use-cancel-session";
import { useTranslations } from "@/i18n/client";

const M3_ALERT_CONTENT =
  "fixed top-[50%] left-[50%] z-50 grid w-full min-w-[320px] max-w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 p-6 outline-none overflow-y-auto sm:max-w-lg " +
  "bg-[var(--m3-surface-container-high)] border border-[var(--m3-outline-variant)] rounded-[var(--m3-radius-large)] shadow-[var(--m3-shadow-2)] " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200";

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

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await cancel();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <AlertDialogPrimitive.Content className={M3_ALERT_CONTENT}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <AlertDialogPrimitive.Title className="m3-title">
                {t("title")}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="m3-body text-[var(--m3-on-surface-variant)] break-words">
                {t("description")}
              </AlertDialogPrimitive.Description>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="outline" disabled={isCancelling}>
                  {t("cancel")}
                </Button>
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action asChild>
                <Button
                  onClick={handleConfirm}
                  disabled={isCancelling}
                  aria-busy={isCancelling}
                >
                  {isCancelling ? t("cancelling") : t("confirm")}
                </Button>
              </AlertDialogPrimitive.Action>
            </div>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
