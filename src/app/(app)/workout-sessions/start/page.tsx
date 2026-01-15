import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth";
import {
  listWorkoutSessionsService,
  getWorkoutSessionService,
  ServiceError,
} from "@/services/workout-sessions";
import { listWorkoutPlansService } from "@/services/workout-plans";
import type { SessionDetailDTO } from "@/types";
import { ResumeSessionCard } from "@/components/workout-sessions/start/resume-session-card";
import { WorkoutPlanSelector } from "@/components/workout-sessions/start/workout-plan-selector";
import { EmptyState } from "@/components/workout-sessions/start/empty-state";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata: Metadata = {
  title: "Rozpocznij trening | Go Girl Workout",
  description: "Wybierz plan treningowy lub wznów istniejącą sesję treningową",
};

/**
 * Server Component dla widoku startu sesji treningowej.
 * Pobiera dane o istniejącej sesji in_progress oraz listę planów treningowych.
 * Decyduje, który komponent wyświetlić na podstawie stanu danych.
 */
export default async function StartWorkoutSessionPage() {
  const userId = await getUserId();

  // Pobierz sesję in_progress (limit=1, bo może być tylko jedna)
  let inProgressSession: SessionDetailDTO | null = null;

  try {
    const sessionsResult = await listWorkoutSessionsService(userId, {
      status: "in_progress",
      limit: 1,
    });

    if (sessionsResult.items.length > 0) {
      // Pobierz pełne szczegóły sesji
      inProgressSession = await getWorkoutSessionService(
        userId,
        sessionsResult.items[0].id
      );
    }
  } catch (error) {
    if (error instanceof ServiceError) {
      // Jeśli błąd autoryzacji, przekieruj do logowania
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/login");
      }
    }
    // Dla innych błędów kontynuuj - wyświetlimy listę planów
    console.error("Error fetching in-progress session:", error);
  }

  // Jeśli istnieje sesja in_progress, wyświetl kartę wznowienia
  if (inProgressSession && inProgressSession.status === "in_progress") {
    return (
      <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
        <PageHeader backHref="/workout-sessions" />
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-6 text-3xl font-bold">Rozpocznij trening</h1>
          <ResumeSessionCard session={inProgressSession} />
        </div>
      </div>
    );
  }

  // Pobierz listę planów treningowych
  let plansResult: {
    items: Array<Omit<import("@/types").WorkoutPlanDTO, "exercises">>;
    nextCursor: string | null;
  } | null = null;

  try {
    plansResult = await listWorkoutPlansService(userId, {
      sort: "created_at",
      order: "desc",
      limit: 20,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      // Jeśli błąd autoryzacji, przekieruj do logowania
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/login");
      }
    }
    // Dla innych błędów wyświetl pusty stan
    console.error("Error fetching workout plans:", error);
  }

  // Jeśli brak planów, wyświetl pusty stan
  if (!plansResult || plansResult.items.length === 0) {
    return (
      <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
        <PageHeader backHref="/workout-sessions" />
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-6 text-3xl font-bold">Rozpocznij trening</h1>
          <EmptyState />
        </div>
      </div>
    );
  }

  // Wyświetl selektor planów
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeader backHref="/workout-sessions" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Rozpocznij trening</h1>
        <WorkoutPlanSelector
          plans={plansResult.items}
          nextCursor={plansResult.nextCursor}
        />
      </div>
    </div>
  );
}
