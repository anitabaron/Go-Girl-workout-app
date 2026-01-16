import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import {
  getWorkoutSessionService,
  ServiceError,
} from "@/services/workout-sessions";
import type { SessionDetailDTO } from "@/types";
import { WorkoutSessionAssistant } from "@/components/workout-sessions/assistant";
import { PageHeader } from "@/components/navigation/page-header";

type WorkoutSessionActivePageProps = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Server Component dla widoku asystenta treningowego.
 * Pobiera dane sesji i waliduje, czy sesja może być używana w asystencie.
 */
export default async function WorkoutSessionActivePage({
  params,
}: WorkoutSessionActivePageProps) {
  const { id } = await params;

  // Walidacja UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    redirect("/workout-sessions");
  }

  let session: SessionDetailDTO;

  try {
    const userId = await requireAuth();
    session = await getWorkoutSessionService(userId, id);
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "NOT_FOUND") {
        // Sesja nie znaleziona lub nie należy do użytkowniczki
        redirect("/workout-sessions");
      }

      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        // Brak autoryzacji - przekierowanie do logowania (lub listy sesji)
        redirect("/workout-sessions");
      }
    }

    // Dla innych błędów również przekieruj do listy sesji
    redirect("/workout-sessions");
  }

  // Walidacja statusu sesji - tylko sesje in_progress mogą używać asystenta
  if (session.status !== "in_progress") {
    // Jeśli sesja jest completed, opcjonalnie można przekierować do widoku szczegółów
    // Dla MVP przekierowujemy do listy sesji
    redirect("/workout-sessions");
  }

  // Walidacja, czy sesja ma ćwiczenia
  if (!session.exercises || session.exercises.length === 0) {
    redirect("/workout-sessions");
  }

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeader backHref="/workout-sessions" />
      <WorkoutSessionAssistant sessionId={id} initialSession={session} />
    </div>
  );
}
