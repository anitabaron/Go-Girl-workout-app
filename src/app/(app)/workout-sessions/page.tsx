import { requireAuth } from "@/lib/auth";
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

  console.log("[WorkoutSessionsPage] Raw searchParams:", params);

  // Walidacja i parsowanie query params
  const parseResult = sessionListQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  console.log("[WorkoutSessionsPage] Parse result:", {
    success: parseResult.success,
    data: parseResult.success ? parseResult.data : null,
    error: parseResult.success ? null : parseResult.error.issues,
  });

  // Fallback do domyślnych wartości przy błędzie walidacji
  const parsedQuery: SessionListQueryParams = parseResult.success
    ? parseResult.data
    : sessionListQuerySchema.parse({});

  console.log("[WorkoutSessionsPage] Final parsedQuery:", parsedQuery);

  // Weryfikacja autoryzacji - automatyczne przekierowanie niezalogowanych użytkowników
  const userId = await requireAuth();

  // Pobierz dane - obsługa błędów przez zwrócenie pustych danych
  let sessionsData = {
    items: [] as Awaited<ReturnType<typeof listWorkoutSessionsService>>["items"],
    nextCursor: null as string | null,
  };

  try {
    // Pobierz wszystkie sesje (lub zgodnie z filtrami)
    console.log("[WorkoutSessionsPage] Fetching sessions with query:", parsedQuery);
    const result = await listWorkoutSessionsService(userId, parsedQuery);
    console.log("[WorkoutSessionsPage] Received sessions:", {
      count: result.items.length,
      items: result.items.map((s) => ({
        id: s.id,
        status: s.status,
        started_at: s.started_at,
        completed_at: s.completed_at,
      })),
      nextCursor: result.nextCursor,
    });
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
      <header className="bg-primary pt-[34px]">
        <div className="mx-auto w-full max-w-5xl px-6 pt-[52px] pb-8 sm:px-10">
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
