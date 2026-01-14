import { WorkoutPlanForm } from "@/components/workout-plans/form/workout-plan-form";

export default async function NewWorkoutPlanPage() {
  // W trybie tworzenia nie potrzebujemy pobierać danych
  // Formularz będzie pusty

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
              Dodaj plan treningowy
            </h1>
            <p className="mt-2 text-xl font-semibold text-destructive sm:text-2xl">
              Utwórz nowy plan treningowy z ćwiczeniami
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <WorkoutPlanForm mode="create" />
        </section>
      </main>
    </div>
  );
}
