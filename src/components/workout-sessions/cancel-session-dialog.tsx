"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCancelSession } from "@/hooks/use-cancel-session";

type CancelSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onCancelled?: () => void;
  trigger: React.ReactNode;
};

export function CancelSessionDialog({
  open,
  onOpenChange,
  sessionId,
  onCancelled,
  trigger,
}: Readonly<CancelSessionDialogProps>) {
  const { cancel, isCancelling } = useCancelSession(sessionId);

  const handleCancel = async () => {
    await cancel();
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anuluj sesję treningową?</AlertDialogTitle>
          <AlertDialogDescription>
            Czy na pewno chcesz anulować tę sesję treningową? Postęp zostanie
            zapisany, ale sesja zostanie oznaczona jako ukończona.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isCancelling}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isCancelling ? "Anulowanie..." : "Potwierdź"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
