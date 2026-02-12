"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const M3_DIALOG_CONTENT =
  "fixed top-[50%] left-[50%] z-50 grid w-full min-w-[320px] max-w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 p-6 outline-none overflow-y-auto sm:max-w-lg " +
  "bg-[var(--m3-surface-container-high)] border border-[var(--m3-outline-variant)] rounded-[var(--m3-radius-large)] shadow-[var(--m3-shadow-2)] " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200";

type ConfirmActionDialogM3Props = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: ReactNode;
  readonly cancelLabel: string;
  readonly confirmLabel: string;
  readonly confirmingLabel?: string;
  readonly onConfirm: () => void | Promise<void>;
  readonly isConfirming?: boolean;
  readonly confirmVariant?: "default" | "destructive";
  readonly confirmAriaLabel?: string;
  readonly descriptionId?: string;
  readonly showCloseButton?: boolean;
  readonly closeAriaLabel?: string;
};

export function ConfirmActionDialogM3({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmingLabel,
  onConfirm,
  isConfirming = false,
  confirmVariant = "default",
  confirmAriaLabel,
  descriptionId = "confirm-action-description",
  showCloseButton = false,
  closeAriaLabel,
}: Readonly<ConfirmActionDialogM3Props>) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={descriptionId}
          className={M3_DIALOG_CONTENT}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <DialogPrimitive.Title className="m3-title">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                id={descriptionId}
                className="m3-body break-words text-[var(--m3-on-surface-variant)]"
              >
                {description}
              </DialogPrimitive.Description>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isConfirming}
              >
                {cancelLabel}
              </Button>
              <Button
                variant={confirmVariant}
                onClick={onConfirm}
                disabled={isConfirming}
                aria-busy={isConfirming}
                aria-label={confirmAriaLabel}
              >
                {isConfirming ? (confirmingLabel ?? confirmLabel) : confirmLabel}
              </Button>
            </div>
          </div>
          {showCloseButton && (
            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-[var(--m3-radius-sm)] opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--m3-primary)] focus:ring-offset-2 disabled:pointer-events-none [&_svg]:size-4"
              aria-label={closeAriaLabel}
            >
              <XIcon />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
