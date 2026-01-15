import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { getPersonalRecordsByExerciseService, ServiceError } from "@/services/personal-records";
import { getExerciseService } from "@/services/exercises";
import { mapExercisePersonalRecordsToViewModel, typeLabels, partLabels } from "@/lib/personal-records/view-model";
import type { ExerciseType, ExercisePart } from "@/types";
import { ExerciseInfo } from "@/components/personal-records/exercise-info";
import { PersonalRecordDetails } from "@/components/personal-records/personal-record-details";

type ExercisePersonalRecordsPageProps = {
  params: Promise<{ exercise_id: string }>;
};

/**
 * Główny komponent strony rekordów osobistych dla konkretnego ćwiczenia.
 * Pobiera dane ćwiczenia i rekordów z API oraz renderuje strukturę widoku.
 * Obsługuje walidację UUID, przekierowania w przypadku błędów oraz layout strony.
 */
export default async function ExercisePersonalRecordsPage({
  params,
}: ExercisePersonalRecordsPageProps) {
  const { exercise_id } = await params;

  // Walidacja UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(exercise_id)) {
    redirect("/personal-records");
  }

  // Pobranie user ID
  const userId = await getUserId();

  // Pobranie rekordów dla ćwiczenia
  let viewModel;
  try {
    const result = await getPersonalRecordsByExerciseService(userId, exercise_id);
    viewModel = mapExercisePersonalRecordsToViewModel(result.items);
    
    // Jeśli brak rekordów, pobierz informacje o ćwiczeniu osobno
    if (!viewModel) {
      const exercise = await getExerciseService(userId, exercise_id);
      viewModel = {
        exercise: {
          id: exercise.id,
          title: exercise.title,
          type: typeLabels[exercise.type as ExerciseType],
          part: partLabels[exercise.part as ExercisePart],
        },
        records: [],
      };
    }
  } catch (error) {
    // Obsługa błędów - przekierowanie do listy rekordów
    if (error instanceof ServiceError) {
      if (
        error.code === "NOT_FOUND" ||
        error.code === "UNAUTHORIZED" ||
        error.code === "FORBIDDEN"
      ) {
        redirect("/personal-records");
      }
    }
    // Inne błędy również przekierowują do listy
    redirect("/personal-records");
  }

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10">
          <h1 className="text-3xl font-extrabold text-destructive">
            Rekordy osobiste
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <ExerciseInfo exercise={viewModel.exercise} />
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <PersonalRecordDetails records={viewModel.records} />
        </section>
      </main>
    </div>
  );
}
