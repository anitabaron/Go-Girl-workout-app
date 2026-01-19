import { requireAuth } from "@/lib/auth";
import { WorkoutPlanForm } from "@/components/workout-plans/form/workout-plan-form";
import { PageHeader } from "@/components/navigation/page-header";
import { PageHeaderSection } from "@/components/layout/page-header-section";

export default async function NewWorkoutPlanPage() {
  // Weryfikacja autoryzacji - automatyczne przekierowanie niezalogowanych użytkowników
  await requireAuth();

  // W trybie tworzenia nie potrzebujemy pobierać danych
  // Formularz będzie pusty

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeaderSection
        title="Dodaj plan treningowy"
        description="Utwórz nowy plan treningowy z ćwiczeniami"
      />
      <PageHeader backHref="/workout-plans" />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <WorkoutPlanForm mode="create" />
        </section>
      </main>
    </div>
  );
}
