import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getWorkoutPlanService, ServiceError } from "@/services/workout-plans";
import { WorkoutPlanForm } from "@/components/workout-plans/form/workout-plan-form";
import { PageHeader } from "@/components/navigation/page-header";

type EditWorkoutPlanPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditWorkoutPlanPage({
  params,
}: EditWorkoutPlanPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
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

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeader backHref={`/workout-plans/${id}`} />
      <header className="bg-primary">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
              Edytuj plan treningowy
            </h1>
            <p className="mt-2 text-xl font-semibold text-destructive sm:text-2xl">
              {workoutPlan.name}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <WorkoutPlanForm mode="edit" initialData={workoutPlan} />
        </section>
      </main>
    </div>
  );
}
