"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelSession } from "@/app/actions/workout-sessions";

export function useCancelSession(sessionId: string) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const cancel = useCallback(async () => {
    setIsCancelling(true);

    try {
      const result = await cancelSession(sessionId);

      if (result.success) {
        toast.success("Sesja została anulowana");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error cancelling session:", error);
      toast.error("Wystąpił błąd podczas anulowania sesji treningowej");
    } finally {
      setIsCancelling(false);
    }
  }, [sessionId, router]);

  return { cancel, isCancelling };
}
