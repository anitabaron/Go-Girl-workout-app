import { personalRecordQuerySchema } from "@/lib/validation/personal-records";
import { requireAuth } from "@/lib/auth";
import { listPersonalRecordsService } from "@/services/personal-records";
import { listExerciseTitlesService } from "@/services/exercises";
import type { PersonalRecordQueryParams } from "@/types";
import { mapPersonalRecordsToViewModel } from "@/lib/personal-records/view-model";
import { PersonalRecordsHeader } from "@/components/personal-records/personal-records-header";
import { PersonalRecordFilters } from "@/components/personal-records/personal-record-filters";
import { PersonalRecordSort } from "@/components/personal-records/personal-record-sort";
import { PersonalRecordsList } from "@/components/personal-records/personal-records-list";
import { PageHeader } from "@/components/navigation/page-header";
import { PageHeaderSection } from "@/components/layout/page-header-section";

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

  // Pobranie listy tytułów ćwiczeń dla filtrów (id, title – lżejszy payload)
  let exercisesForFilters: { id: string; title: string }[] = [];
  try {
    exercisesForFilters = await listExerciseTitlesService(userId, 50);
  } catch (error) {
    console.error("Error loading exercises for filters:", error);
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
      error instanceof Error ? error.message : "Nie udało się pobrać rekordów.";
    personalRecords = { items: [], nextCursor: null };
  }

  // Mapowanie danych do ViewModel
  const viewModel = mapPersonalRecordsToViewModel(
    personalRecords.items,
    personalRecords.nextCursor,
  );

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeaderSection>
        <PersonalRecordsHeader />
      </PageHeaderSection>
      <PageHeader showBack={false} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PersonalRecordFilters exercises={exercisesForFilters} />
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
