"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  patchWorkoutSessionStatus,
  ApiError,
} from "@/lib/api/workout-sessions";
import type { SessionDetailDTO } from "@/types";

type UseResumeSessionOptions = {
  /** Where to redirect on resume. Default legacy path. Use /m3/workout-sessions/[id]/active for M3. */
  redirectHref?: string;
};

export function useResumeSession(
  session: SessionDetailDTO,
  options?: UseResumeSessionOptions,
) {
  const router = useRouter();
  const [isResuming, setIsResuming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const redirectHref =
    options?.redirectHref ?? `/workout-sessions/${session.id}/active`;

  const handleResume = useCallback(async () => {
    setIsResuming(true);
    try {
      router.push(redirectHref);
    } catch (error) {
      console.error("Error resuming session:", error);
      toast.error("Nie udało się wznowić sesji treningowej");
    } finally {
      setIsResuming(false);
    }
  }, [router, redirectHref]);

  const handleCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      await patchWorkoutSessionStatus(session.id, { status: "completed" });
      toast.success("Sesja została anulowana");
      setIsCancelDialogOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.",
        );
      } else if (error instanceof ApiError) {
        if (error.status === 400) {
          toast.error(error.message || "Nie można anulować ukończonej sesji");
        } else if (error.status === 404) {
          toast.error("Sesja treningowa nie została znaleziona");
        } else if (error.status === 401 || error.status === 403) {
          toast.error("Brak autoryzacji. Zaloguj się ponownie.");
          router.push("/login");
        } else if (error.status >= 500) {
          toast.error(
            error.message || "Wystąpił błąd serwera. Spróbuj ponownie później.",
          );
        } else {
          toast.error(
            error.message || "Nie udało się anulować sesji treningowej",
          );
        }
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Nie udało się anulować sesji treningowej";
        toast.error(message);
      }
    } finally {
      setIsCancelling(false);
    }
  }, [session.id, router]);

  return {
    handleResume,
    handleCancel,
    isResuming,
    isCancelling,
    isCancelDialogOpen,
    setIsCancelDialogOpen,
  };
}
