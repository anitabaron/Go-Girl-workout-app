"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const M3_DIALOG_CONTENT =
  "ui-m3 fixed top-[50%] left-[50%] z-50 grid w-full min-w-[320px] max-w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 p-6 outline-none overflow-y-auto sm:max-w-lg " +
  "bg-[var(--m3-surface-container-high)] border border-[var(--m3-outline-variant)] rounded-[var(--m3-radius-large)] shadow-[var(--m3-shadow-2)] " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200";

type DeleteWorkoutPlanDialogM3Props = {
  readonly planId: string;
  readonly planName: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDelete?: (planId: string) => Promise<void>;
};

export function DeleteWorkoutPlanDialogM3({
  planId,
  planName,
  open,
  onOpenChange,
  onDelete,
}: DeleteWorkoutPlanDialogM3Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(planId);
      } else {
        const response = await fetch(`/api/workout-plans/${planId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          if (response.status === 404) toast.error("Workout plan not found");
          else if (response.status === 401 || response.status === 403) {
            toast.error("Unauthorized. Please log in again.");
            router.push("/login");
          } else toast.error("Failed to delete workout plan");
          return;
        }
      }
      toast.success("Workout plan deleted");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("An error occurred while deleting the workout plan");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby="delete-plan-description"
          className={M3_DIALOG_CONTENT}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <DialogPrimitive.Title className="m3-title">
                Delete workout plan
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                id="delete-plan-description"
                className="m3-body text-[var(--m3-on-surface-variant)] break-words"
              >
                Are you sure you want to delete &quot;{planName}&quot;? This
                action cannot be undone.
              </DialogPrimitive.Description>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-busy={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-[var(--m3-radius-sm)] opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--m3-primary)] focus:ring-offset-2 disabled:pointer-events-none [&_svg]:size-4"
            aria-label="Close"
          >
            <XIcon />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
