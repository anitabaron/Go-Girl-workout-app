import { Skeleton } from "@/components/ui/skeleton";

export default function ExerciseDetailsLoading() {
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10">
          <Skeleton className="h-10 w-64" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="space-y-6">
            {/* Skeleton dla podstawowych informacji */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>

            {/* Skeleton dla metryk */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>

            {/* Skeleton dla powiązań */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>

            {/* Skeleton dla przycisków akcji */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Skeleton className="h-10 w-full sm:w-24" />
              <Skeleton className="h-10 w-full sm:w-24" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
