import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import {
  getWorkoutSessionService,
  ServiceError,
} from "@/services/workout-sessions";
import { PageHeader } from "@/components/navigation/page-header";
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

  let session;
  try {
    const userId = await getUserId();
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
      <PageHeader backHref="/workout-sessions" />
      <header className="bg-primary">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
              {planName}
            </h1>
            <p className="mt-2 text-xl font-semibold text-destructive sm:text-2xl">
              Szczegóły sesji treningowej
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        {/* Metadane sesji */}
        <section
          className="mb-6"
          aria-label="Metadane sesji treningowej"
        >
          <WorkoutSessionMetadata session={session} />
        </section>

        {/* Akcje sesji */}
        <section
          className="mb-6"
          aria-label="Akcje sesji treningowej"
        >
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
          <WorkoutSessionExercisesList exercises={session.exercises} />
        </section>
      </main>
    </div>
  );
}
