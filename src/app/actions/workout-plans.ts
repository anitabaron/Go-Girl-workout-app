"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/db/supabase.server";
import {
  createWorkoutPlanService,
  updateWorkoutPlanService,
  ServiceError,
} from "@/services/workout-plans";
import type {
  WorkoutPlanCreateCommand,
  WorkoutPlanUpdateCommand,
} from "@/types";

export type CreatePlanResult =
  | { success: true; id: string }
  | { success: false; error: string; code?: string; details?: string };

export type UpdatePlanResult =
  | { success: true }
  | { success: false; error: string; code?: string; details?: string };

export async function createWorkoutPlan(
  payload: WorkoutPlanCreateCommand,
): Promise<CreatePlanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { success: false, error: "Brak autoryzacji. Zaloguj się ponownie." };
  }

  try {
    const plan = await createWorkoutPlanService(user.id, payload);
    revalidatePath("/workout-plans");
    return { success: true, id: plan.id };
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
          error: "Niektóre ćwiczenia nie istnieją lub nie należą do Ciebie.",
        };
      }
      if (error.code === "BAD_REQUEST") {
        return {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
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
      error: "Wystąpił błąd podczas tworzenia planu treningowego",
    };
  }
}

export async function updateWorkoutPlan(
  id: string,
  payload: WorkoutPlanUpdateCommand,
): Promise<UpdatePlanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { success: false, error: "Brak autoryzacji. Zaloguj się ponownie." };
  }

  try {
    await updateWorkoutPlanService(user.id, id, payload);
    revalidatePath("/workout-plans");
    revalidatePath(`/workout-plans/${id}`);
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
          error: "Plan treningowy nie został znaleziony.",
        };
      }
      if (error.code === "BAD_REQUEST") {
        return {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        };
      }
      if (error.code === "CONFLICT") {
        return {
          success: false,
          error: error.message,
          code: error.code,
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
      error: "Wystąpił błąd podczas aktualizacji planu treningowego",
    };
  }
}
