import { exerciseQuerySchema } from "@/lib/validation/exercises";
import { getUserId } from "@/lib/auth";
import { listExercisesService } from "@/services/exercises";
import type { ExerciseQueryParams } from "@/types";
import { ExercisesList } from "@/components/exercises/exercises-list";
import { ExerciseFilters } from "@/components/exercises/exercise-filters";
import { ExerciseSort } from "@/components/exercises/exercise-sort";
import { AddExerciseButton } from "@/components/exercises/add-exercise-button";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Walidacja i parsowanie query params
  let parsedQuery: ExerciseQueryParams;
  try {
    parsedQuery = exerciseQuerySchema.parse({
      ...params,
      limit: params.limit ? Number(params.limit) : undefined,
    });
  } catch (error) {
    // Fallback do domyślnych wartości przy błędzie walidacji
    parsedQuery = exerciseQuerySchema.parse({});
  }

  // Pobranie user ID
  const userId = await getUserId();

  // Wywołanie service do pobrania danych
  const result = await listExercisesService(userId, parsedQuery);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Biblioteka ćwiczeń
          </h1>
          <p className="mt-2 text-muted-foreground">
            Przeglądaj i zarządzaj swoimi ćwiczeniami
          </p>
        </div>
        <AddExerciseButton variant="auto" />
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ExerciseFilters />
        <ExerciseSort />
      </div>

      <ExercisesList
        exercises={result.items}
        nextCursor={result.nextCursor}
        hasMore={result.nextCursor !== null}
      />
    </div>
  );
}
