import { workoutPlanQuerySchema } from "@/lib/validation/workout-plans";
import { requireAuth } from "@/lib/auth";
import { listWorkoutPlansService } from "@/services/workout-plans";
import type { PlanQueryParams } from "@/types";
import { WorkoutPlansList } from "@/components/workout-plans/workout-plans-list";
import { WorkoutPlanFilters } from "@/components/workout-plans/workout-plan-filters";
import { WorkoutPlanSort } from "@/components/workout-plans/workout-plan-sort";
import { CreatePlanButton } from "@/components/workout-plans/create-plan-button";
import { PageHeader } from "@/components/navigation/page-header";
import { PageHeaderSection } from "@/components/layout/page-header-section";

export default async function WorkoutPlansPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const params = await searchParams;

  // Walidacja i parsowanie query params
  const parseResult = workoutPlanQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  // Fallback do domyślnych wartości przy błędzie walidacji
  const parsedQuery: PlanQueryParams = parseResult.success
    ? parseResult.data
    : workoutPlanQuerySchema.parse({});

  // Pobranie user ID (wymaga autoryzacji)
  const userId = await requireAuth();

  // Wywołanie service do pobrania danych
  const result = await listWorkoutPlansService(userId, parsedQuery);

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeaderSection
        title="Plany treningowe"
        description="Przeglądaj i zarządzaj swoimi planami treningowymi"
        actionButton={<CreatePlanButton variant="auto" />}
      />
      <PageHeader showBack={false} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <WorkoutPlanFilters />
            <WorkoutPlanSort />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <WorkoutPlansList
            initialPlans={result.items}
            initialNextCursor={result.nextCursor}
            initialHasMore={result.nextCursor !== null}
          />
        </section>
      </main>
    </div>
  );
}
