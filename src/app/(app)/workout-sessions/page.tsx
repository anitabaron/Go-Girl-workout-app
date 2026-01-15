import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth";
import { listWorkoutSessionsService } from "@/services/workout-sessions";
import { sessionListQuerySchema } from "@/lib/validation/workout-sessions";
import type { SessionListQueryParams } from "@/types";
import { WorkoutSessionsList } from "@/components/workout-sessions/workout-sessions-list";
import { PageHeader } from "@/components/navigation/page-header";

/**
 * Widok listy sesji treningowych.
 */
export default async function WorkoutSessionsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const params = await searchParams;

  // Walidacja i parsowanie query params
  const parseResult = sessionListQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  // Fallback do domyślnych wartości przy błędzie walidacji
  const parsedQuery: SessionListQueryParams = parseResult.success
    ? parseResult.data
    : sessionListQuerySchema.parse({});

  // Pobierz dane - obsługa błędów przez zwrócenie pustych danych
  let sessionsData = {
    items: [] as Awaited<ReturnType<typeof listWorkoutSessionsService>>["items"],
    nextCursor: null as string | null,
  };

  try {
    const userId = await getUserId();

    // Pobierz sesje in_progress
    const inProgressResult = await listWorkoutSessionsService(userId, {
      status: "in_progress",
      limit: 1,
    });

    // Jeśli jest sesja in_progress, przekieruj do niej
    if (inProgressResult.items.length > 0) {
      const session = inProgressResult.items[0];
      redirect(`/workout-sessions/${session.id}/active`);
    }

    // Pobierz wszystkie sesje (lub zgodnie z filtrami)
    const result = await listWorkoutSessionsService(userId, parsedQuery);
    sessionsData = result;
  } catch {
    // W przypadku błędu, użyj pustych danych (sessionsData już ma wartości domyślne)
    // Error boundary lub error.tsx obsłuży błędy renderowania
  }

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeader showBack={false} />
      <header className="bg-primary">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
              Historia sesji treningowych
            </h1>
            <p className="mt-2 text-xl font-semibold text-destructive sm:text-2xl">
              Przeglądaj historię swoich treningów
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <WorkoutSessionsList
            initialSessions={sessionsData.items}
            initialNextCursor={sessionsData.nextCursor}
            initialHasMore={sessionsData.nextCursor !== null}
          />
        </section>
      </main>
    </div>
  );
}
