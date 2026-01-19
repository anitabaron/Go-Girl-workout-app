import { requireAuth } from "@/lib/auth";
import { ExerciseForm } from "@/components/exercises/form/exercise-form";
import { PageHeader } from "@/components/navigation/page-header";
import { PageHeaderSection } from "@/components/layout/page-header-section";

export default async function NewExercisePage() {
  // Weryfikacja autoryzacji - automatyczne przekierowanie niezalogowanych użytkowników
  await requireAuth();
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeaderSection title="Dodaj ćwiczenie" />
      <PageHeader backHref="/exercises" />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <ExerciseForm mode="create" />
        </section>
      </main>
    </div>
  );
}
