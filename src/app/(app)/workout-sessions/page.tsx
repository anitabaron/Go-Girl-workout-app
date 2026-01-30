import { requireAuth } from "@/lib/auth";
import { listWorkoutSessionsService } from "@/services/workout-sessions";
import { sessionListQuerySchema } from "@/lib/validation/workout-sessions";
import type { SessionListQueryParams } from "@/types";
import { WorkoutSessionsList } from "@/components/workout-sessions/workout-sessions-list";
import { PageHeader } from "@/components/navigation/page-header";
import { PageHeaderSection } from "@/components/layout/page-header-section";

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

  // Weryfikacja autoryzacji - automatyczne przekierowanie niezalogowanych użytkowników
  const userId = await requireAuth();

  // Pobierz dane - obsługa błędów przez zwrócenie pustych danych
  let sessionsData = {
    items: [] as Awaited<
      ReturnType<typeof listWorkoutSessionsService>
    >["items"],
    nextCursor: null as string | null,
  };

  try {
    // Pobierz wszystkie sesje (lub zgodnie z filtrami)
    const result = await listWorkoutSessionsService(userId, parsedQuery);

    sessionsData = result;
  } catch (error) {
    // Loguj błędy dla debugowania
    console.error("Error fetching workout sessions:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      parsedQuery,
    });
    // W przypadku błędu, użyj pustych danych (sessionsData już ma wartości domyślne)
    // Error boundary lub error.tsx obsłuży błędy renderowania
  }

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeaderSection
        title="Historia sesji treningowych"
        description="Przeglądaj historię swoich treningów"
      />
      <PageHeader showBack={false} />

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
