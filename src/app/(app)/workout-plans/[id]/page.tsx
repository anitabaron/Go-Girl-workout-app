import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getWorkoutPlanService, ServiceError } from "@/services/workout-plans";
import type { ExercisePart } from "@/types";
import { Badge } from "@/components/ui/badge";
import { WorkoutPlanActions } from "@/components/workout-plans/details/workout-plan-actions";
import { PageHeader } from "@/components/navigation/page-header";

type WorkoutPlanDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const partLabels: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

const sectionTypeLabels: Record<string, string> = {
  Warm_up: "Rozgrzewka",
  Main_workout: "Główny trening",
  Cool_down: "Schłodzenie",
};

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}min ${secs}s`;
  }
  return `${secs}s`;
}

export default async function WorkoutPlanDetailsPage({
  params,
}: WorkoutPlanDetailsPageProps) {
  const { id } = await params;

  // Walidacja UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    redirect("/workout-plans");
  }

  let workoutPlan;
  try {
    const userId = await requireAuth();
    workoutPlan = await getWorkoutPlanService(userId, id);
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "NOT_FOUND") {
        notFound();
      }

      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/workout-plans");
      }
    }

    // Dla innych błędów również przekieruj do listy
    redirect("/workout-plans");
  }

  // Sortowanie ćwiczeń według section_type i section_order
  const sortedExercises = [...workoutPlan.exercises].sort((a, b) => {
    if (a.section_type !== b.section_type) {
      return a.section_type.localeCompare(b.section_type);
    }
    return a.section_order - b.section_order;
  });

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary pt-0 md:pt-[34px]">
        <div className="mx-auto w-full max-w-5xl px-6 pt-[52px] pb-8 sm:px-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
              {workoutPlan.name}
            </h1>
            <p className="mt-2 text-xl font-semibold text-destructive sm:text-2xl">
              Szczegóły planu treningowego
            </p>
          </div>
        </div>
      </header>
      <PageHeader backHref="/workout-plans" />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        {/* Metadane planu */}
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              {workoutPlan.part && (
                <Badge
                  variant="outline"
                  className="border-destructive text-destructive"
                >
                  {partLabels[workoutPlan.part]}
                </Badge>
              )}
              <Badge variant="secondary">
                {workoutPlan.exercises.length}{" "}
                {workoutPlan.exercises.length === 1 ? "ćwiczenie" : "ćwiczeń"}
              </Badge>
            </div>

            {workoutPlan.description && (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Opis</h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {workoutPlan.description}
                </p>
              </div>
            )}

            <div className="pt-4">
              <WorkoutPlanActions planId={id} planName={workoutPlan.name} />
            </div>
          </div>
        </section>

        {/* Lista ćwiczeń */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <h2 className="mb-6 text-2xl font-semibold">Ćwiczenia w planie</h2>

          {sortedExercises.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">Brak ćwiczeń w planie.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedExercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {sectionTypeLabels[exercise.section_type] ||
                            exercise.section_type}
                        </Badge>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          Pozycja: {exercise.section_order}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold">
                        Ćwiczenie #{index + 1}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {exercise.planned_sets !== null &&
                      exercise.planned_sets !== undefined && (
                        <div>
                          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Serii
                          </p>
                          <p className="text-lg font-semibold">
                            {exercise.planned_sets}
                          </p>
                        </div>
                      )}

                    {exercise.planned_reps !== null &&
                      exercise.planned_reps !== undefined && (
                        <div>
                          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Powtórzeń
                          </p>
                          <p className="text-lg font-semibold">
                            {exercise.planned_reps}
                          </p>
                        </div>
                      )}

                    {exercise.planned_duration_seconds !== null &&
                      exercise.planned_duration_seconds !== undefined && (
                        <div>
                          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Czas trwania
                          </p>
                          <p className="text-lg font-semibold">
                            {formatDuration(exercise.planned_duration_seconds)}
                          </p>
                        </div>
                      )}

                    {exercise.planned_rest_seconds !== null &&
                      exercise.planned_rest_seconds !== undefined && (
                        <div>
                          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Odpoczynek
                          </p>
                          <p className="text-lg font-semibold">
                            {formatDuration(exercise.planned_rest_seconds)}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
