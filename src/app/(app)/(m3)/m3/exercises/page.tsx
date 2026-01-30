import Link from "next/link";

export default function ExercisesPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/m3"
            className="m3-label mb-1 block text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            Back
          </Link>
          <h1 className="m3-headline">Exercises</h1>
        </div>
      </header>

      <section className="m3-surface-container p-6">
        <h2 className="m3-title">Exercise library</h2>
        <p className="m3-body mt-2 text-neutral-600 dark:text-neutral-400">
          Browse and manage your exercises. M3 foundation with neutral surfaces.
        </p>
      </section>
    </div>
  );
}
