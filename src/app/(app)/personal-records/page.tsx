import { personalRecordQuerySchema } from "@/lib/validation/personal-records";
import { requireAuth } from "@/lib/auth";
import { listPersonalRecordsService } from "@/services/personal-records";
import { listExercisesService } from "@/services/exercises";
import type { PersonalRecordQueryParams, ExerciseQueryParams } from "@/types";
import { mapPersonalRecordsToViewModel } from "@/lib/personal-records/view-model";
import { PersonalRecordsHeader } from "@/components/personal-records/personal-records-header";
import { PersonalRecordFilters } from "@/components/personal-records/personal-record-filters";
import { PersonalRecordSort } from "@/components/personal-records/personal-record-sort";
import { PersonalRecordsList } from "@/components/personal-records/personal-records-list";
import { PageHeader } from "@/components/navigation/page-header";

export default async function PersonalRecordsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const params = await searchParams;

  // Walidacja i parsowanie query params
  const parseResult = personalRecordQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  // Fallback do domyślnych wartości przy błędzie walidacji
  const parsedQuery: PersonalRecordQueryParams = parseResult.success
    ? parseResult.data
    : personalRecordQuerySchema.parse({});

  // Pobranie user ID (wymaga autoryzacji)
  const userId = await requireAuth();

  // Pobranie listy ćwiczeń dla filtrów (opcjonalnie, z obsługą błędów)
  let exercises: Awaited<ReturnType<typeof listExercisesService>>["items"] =
    [];
  try {
    const exercisesQuery: ExerciseQueryParams = {
      sort: "title",
      order: "asc",
      limit: 50, // Maksymalny limit zgodny z EXERCISE_MAX_LIMIT
    };
    const exercisesResult = await listExercisesService(userId, exercisesQuery);
    exercises = exercisesResult.items;
  } catch (error) {
    console.error("Error loading exercises for filters:", error);
    // Kontynuujemy bez listy ćwiczeń w filtrze
  }

  // Pobranie rekordów osobistych
  let personalRecords;
  let errorMessage: string | null = null;

  try {
    const result = await listPersonalRecordsService(userId, parsedQuery);
    personalRecords = result;
  } catch (error) {
    console.error("Error loading personal records:", error);
    errorMessage =
      error instanceof Error
        ? error.message
        : "Nie udało się pobrać rekordów.";
    personalRecords = { items: [], nextCursor: null };
  }

  // Mapowanie danych do ViewModel
  const viewModel = mapPersonalRecordsToViewModel(
    personalRecords.items,
    personalRecords.nextCursor
  );

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary pt-[34px]">
        <div className="mx-auto w-full max-w-5xl px-6 pt-[52px] pb-8 sm:px-10">
          <PersonalRecordsHeader />
        </div>
      </header>
      <PageHeader showBack={false} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PersonalRecordFilters exercises={exercises} />
            <PersonalRecordSort />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <PersonalRecordsList
            initialData={viewModel}
            errorMessage={errorMessage}
          />
        </section>
      </main>
    </div>
  );
}
