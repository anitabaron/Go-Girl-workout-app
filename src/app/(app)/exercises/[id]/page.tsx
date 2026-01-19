import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getExerciseService } from "@/services/exercises";
import { createClient } from "@/db/supabase.server";
import { getExerciseRelations } from "@/repositories/exercises";
import { ExerciseDetails } from "@/components/exercises/details/exercise-details";
import { ExerciseRelationsInfo } from "@/components/exercises/details/exercise-relations-info";
import { ExerciseActions } from "@/components/exercises/details/exercise-actions";
import { PageHeader } from "@/components/navigation/page-header";
import type { ExerciseDTO } from "@/types";

export default async function ExerciseDetailsPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const userId = await requireAuth();

  // Walidacja UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    redirect("/exercises");
  }

  let exercise: ExerciseDTO;
  let relationsData: {
    plansCount: number;
    sessionsCount: number;
    hasRelations: boolean;
  };

  try {
    // Pobranie danych ćwiczenia
    exercise = await getExerciseService(userId, id);

    // Pobranie informacji o powiązaniach
    const supabase = await createClient();
    relationsData = await getExerciseRelations(supabase, id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // Jeśli ćwiczenie nie zostało znalezione lub brak autoryzacji, przekieruj do listy
    redirect("/exercises");
  }

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary pt-0 md:pt-[34px]">
        <div className="mx-auto w-full max-w-5xl px-6 pt-[52px] pb-8 sm:px-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
            Szczegóły ćwiczenia
          </h1>
        </div>
      </header>
      <PageHeader backHref="/exercises" />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="space-y-6">
            <ExerciseDetails exercise={exercise} />

            <ExerciseRelationsInfo
              exerciseId={id}
              userId={userId}
              relationsData={relationsData}
            />

            <ExerciseActions
              exerciseId={id}
              exerciseTitle={exercise.title}
              hasRelations={relationsData.hasRelations}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
