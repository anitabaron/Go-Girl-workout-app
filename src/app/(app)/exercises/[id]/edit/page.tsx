import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getExerciseService } from "@/services/exercises";
import { ExerciseForm } from "@/components/exercises/form/exercise-form";
import { PageHeader } from "@/components/navigation/page-header";
import type { ExerciseDTO } from "@/types";

export default async function EditExercisePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const userId = await requireAuth();

  let exercise: ExerciseDTO;

  try {
    exercise = await getExerciseService(userId, id);
  } catch {
    // Jeśli ćwiczenie nie zostało znalezione, przekieruj do listy
    redirect("/exercises");
  }

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary pt-[34px]">
        <div className="mx-auto w-full max-w-5xl px-6 pt-[52px] pb-8 sm:px-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
            Edytuj ćwiczenie
          </h1>
        </div>
      </header>
      <PageHeader backHref={`/exercises/${id}`} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <ExerciseForm mode="edit" initialData={exercise} />
        </section>
      </main>
    </div>
  );
}
