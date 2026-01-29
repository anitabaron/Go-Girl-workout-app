import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getWorkoutPlanService, ServiceError } from "@/services/workout-plans";
import { Badge } from "@/components/ui/badge";
import { WorkoutPlanActions } from "@/components/workout-plans/details/workout-plan-actions";
import { AddSnapshotExerciseButton } from "@/components/workout-plans/details/add-snapshot-exercise-button";
import { ExerciseLibraryBadge } from "@/components/workout-plans/details/exercise-library-badge";
import { PageHeader } from "@/components/navigation/page-header";
import { PageHeaderSection } from "@/components/layout/page-header-section";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import { EXERCISE_PART_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";
import { formatDuration, formatTotalDuration } from "@/lib/utils/time-format";

type WorkoutPlanDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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
    // Najpierw sortuj według section_type (Warm-up, Main Workout, Cool-down)
    const typeOrder: Record<string, number> = {
      "Warm-up": 1,
      "Main Workout": 2,
      "Cool-down": 3,
    };
    const typeDiff =
      (typeOrder[a.section_type] || 999) - (typeOrder[b.section_type] || 999);
    if (typeDiff !== 0) return typeDiff;

    // Następnie sortuj według section_order
    return a.section_order - b.section_order;
  });

  // Użyj szacunkowego czasu treningu z bazy danych
  const estimatedTotalTime = workoutPlan.estimated_total_time_seconds ?? 0;

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeaderSection
        title={workoutPlan.name}
        description="Szczegóły planu treningowego"
      />
      <PageHeader backHref="/workout-plans" />

      <main className="mx-auto w-full max-w-5xl px-6 pb-10 pt-0 sm:px-10 md:pt-10">
        {/* Metadane planu */}
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              {workoutPlan.part && (
                <Badge
                  variant="outline"
                  className="border-destructive text-destructive"
                >
                  {EXERCISE_PART_LABELS[workoutPlan.part]}
                </Badge>
              )}
              <Badge variant="secondary">
                {workoutPlan.exercises.length}{" "}
                {workoutPlan.exercises.length === 1 ? "ćwiczenie" : "ćwiczeń"}
              </Badge>
              {estimatedTotalTime > 0 && (
                <Badge variant="secondary">
                  Szacunkowy czas treningu:{" "}
                  {formatTotalDuration(estimatedTotalTime)}
                </Badge>
              )}
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
                        <ExerciseTypeBadge type={exercise.section_type} />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          Pozycja: {exercise.section_order}
                        </span>
                        <ExerciseLibraryBadge exercise={exercise} />
                      </div>
                      <h3 className="text-lg font-semibold">
                        {exercise.exercise_title || `Ćwiczenie #${index + 1}`}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
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

                    <div>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Odpoczynek między seriami
                      </p>
                      <p className="text-lg font-semibold">
                        {exercise.planned_rest_seconds !== null &&
                        exercise.planned_rest_seconds !== undefined
                          ? formatDuration(exercise.planned_rest_seconds)
                          : "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Odpoczynek po seriach
                      </p>
                      <p className="text-lg font-semibold">
                        {exercise.planned_rest_after_series_seconds !== null &&
                        exercise.planned_rest_after_series_seconds !== undefined
                          ? formatDuration(
                              exercise.planned_rest_after_series_seconds,
                            )
                          : "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Szacunkowy czas zestawu
                      </p>
                      <p className="text-lg font-semibold">
                        {exercise.exercise_estimated_set_time_seconds !==
                          null &&
                        exercise.exercise_estimated_set_time_seconds !==
                          undefined
                          ? formatDuration(
                              exercise.exercise_estimated_set_time_seconds,
                            )
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Szczegóły ćwiczenia */}
                  {exercise.exercise_details && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                        Szczegóły
                      </p>
                      <p className="text-base whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">
                        {exercise.exercise_details}
                      </p>
                    </div>
                  )}

                  {/* Przycisk do dodawania ćwiczenia ze snapshotu do bazy */}
                  <AddSnapshotExerciseButton exercise={exercise} planId={id} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
