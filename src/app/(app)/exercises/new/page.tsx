import { requireAuth } from "@/lib/auth";
import { ExerciseForm } from "@/components/exercises/form/exercise-form";
import { PageHeader } from "@/components/navigation/page-header";

export default async function NewExercisePage() {
  // Weryfikacja autoryzacji - automatyczne przekierowanie niezalogowanych użytkowników
  await requireAuth();
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary pt-[34px]">
        <div className="mx-auto w-full max-w-5xl px-6 pt-[52px] pb-8 sm:px-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
            Dodaj ćwiczenie
          </h1>
        </div>
      </header>
      <PageHeader backHref="/exercises" />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <ExerciseForm mode="create" />
        </section>
      </main>
    </div>
  );
}
