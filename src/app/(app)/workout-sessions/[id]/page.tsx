import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import {
  getWorkoutSessionService,
  ServiceError,
} from "@/services/workout-sessions";
import { PageHeader } from "@/components/navigation/page-header";
import { PageHeaderSection } from "@/components/layout/page-header-section";
import {
  WorkoutSessionMetadata,
  WorkoutSessionActions,
  WorkoutSessionExercisesList,
} from "@/components/workout-sessions/details";

type WorkoutSessionDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function WorkoutSessionDetailsPage({
  params,
}: WorkoutSessionDetailsPageProps) {
  const { id } = await params;

  // Walidacja UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    redirect("/workout-sessions");
  }

  const userId = await requireAuth();

  let session;
  try {
    session = await getWorkoutSessionService(userId, id);
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "NOT_FOUND") {
        notFound();
      }

      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/workout-sessions");
      }
    }

    // Dla innych błędów również przekieruj do listy
    redirect("/workout-sessions");
  }

  const planName = session.plan_name_at_time || "Plan usunięty";

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeaderSection
        title={planName}
        description="Szczegóły sesji treningowej"
      />
      <PageHeader backHref="/workout-sessions" />

      <main className="mx-auto w-full max-w-5xl px-6 pb-10 pt-0 md:pt-10 sm:px-10">
        {/* Metadane sesji */}
        <section className="mb-6" aria-label="Metadane sesji treningowej">
          <WorkoutSessionMetadata session={session} />
        </section>

        {/* Akcje sesji */}
        <section className="mb-6" aria-label="Akcje sesji treningowej">
          <WorkoutSessionActions
            sessionId={session.id}
            status={session.status}
          />
        </section>

        {/* Lista ćwiczeń */}
        <section
          className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950"
          aria-label="Lista ćwiczeń w sesji"
        >
          <WorkoutSessionExercisesList
            exercises={session.exercises}
            sessionId={session.id}
          />
        </section>
      </main>
    </div>
  );
}
