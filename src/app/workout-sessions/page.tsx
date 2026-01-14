import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth";
import {
  listWorkoutSessionsService,
  ServiceError,
} from "@/services/workout-sessions";

/**
 * Widok listy sesji treningowych.
 * TODO: Pełna implementacja w przyszłości - na razie przekierowuje do workout-plans.
 */
export default async function WorkoutSessionsPage() {
  try {
    const userId = await getUserId();
    
    // Pobierz sesje in_progress
    const result = await listWorkoutSessionsService(userId, {
      status: "in_progress",
      limit: 1,
    });

    // Jeśli jest sesja in_progress, przekieruj do niej
    if (result.items.length > 0) {
      const session = result.items[0];
      redirect(`/workout-sessions/${session.id}/active`);
    }
  } catch (error) {
    // W przypadku błędu, przekieruj do workout-plans
    if (error instanceof ServiceError) {
      // Ignoruj błędy - przekieruj do workout-plans
    }
  }

  // Jeśli nie ma sesji in_progress, przekieruj do workout-plans
  redirect("/workout-plans");
}
