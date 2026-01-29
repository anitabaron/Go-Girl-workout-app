"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/db/supabase.server";
import {
  updateWorkoutSessionStatusService,
  ServiceError,
} from "@/services/workout-sessions";

export type CancelSessionResult =
  | { success: true }
  | { success: false; error: string };

export async function cancelSession(
  sessionId: string,
): Promise<CancelSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { success: false, error: "Brak autoryzacji. Zaloguj się ponownie." };
  }

  try {
    await updateWorkoutSessionStatusService(user.id, sessionId, {
      status: "completed",
    });
    revalidatePath("/workout-sessions");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        return {
          success: false,
          error: "Brak autoryzacji. Zaloguj się ponownie.",
        };
      }
      if (error.code === "NOT_FOUND") {
        return {
          success: false,
          error: "Sesja treningowa nie została znaleziona",
        };
      }
      if (error.code === "BAD_REQUEST") {
        return {
          success: false,
          error: error.message || "Nie można anulować ukończonej sesji",
        };
      }
    }
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error:
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.",
      };
    }
    return {
      success: false,
      error: "Wystąpił błąd podczas anulowania sesji treningowej",
    };
  }
}
