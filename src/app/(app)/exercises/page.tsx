import { exerciseQuerySchema } from "@/lib/validation/exercises";
import { requireAuth } from "@/lib/auth";
import { listExercisesService } from "@/services/exercises";
import type { ExerciseQueryParams } from "@/types";
import { ExercisesList } from "@/components/exercises/exercises-list";
import { ExerciseFilters } from "@/components/exercises/exercise-filters";
import { ExerciseSort } from "@/components/exercises/exercise-sort";
import { AddExerciseButton } from "@/components/exercises/add-exercise-button";
import { PageHeader } from "@/components/navigation/page-header";

export default async function ExercisesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const params = await searchParams;

  // Walidacja i parsowanie query params
  const parseResult = exerciseQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  // Fallback do domyślnych wartości przy błędzie walidacji
  const parsedQuery: ExerciseQueryParams = parseResult.success
    ? parseResult.data
    : exerciseQuerySchema.parse({});

  // Pobranie user ID (wymaga autoryzacji)
  const userId = await requireAuth();

  // Wywołanie service do pobrania danych
  const result = await listExercisesService(userId, parsedQuery);

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary pt-0 md:pt-[34px]">
        <div className="mx-auto w-full max-w-5xl px-6 pt-[52px] pb-8 sm:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
                Biblioteka ćwiczeń
              </h1>
              <p className="mt-2 text-xl font-semibold text-destructive sm:text-2xl">
                Przeglądaj i zarządzaj swoimi ćwiczeniami
              </p>
            </div>
            <AddExerciseButton variant="auto" />
          </div>
        </div>
      </header>
      <PageHeader showBack={false} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <ExerciseFilters />
            <ExerciseSort />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <ExercisesList
            exercises={result.items}
            nextCursor={result.nextCursor}
            hasMore={result.nextCursor !== null}
          />
        </section>
      </main>
    </div>
  );
}
