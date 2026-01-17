import { SkeletonLoader } from "@/components/workout-plans/skeleton-loader";

export default function WorkoutPlansLoading() {
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary pt-[34px]">
        <div className="mx-auto w-full max-w-5xl px-6 pt-[52px] pb-8 sm:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SkeletonLoader count={1} className="h-10 w-64 mb-2" />
              <SkeletonLoader count={1} className="h-6 w-96" />
            </div>
            <SkeletonLoader count={1} className="h-10 w-32" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SkeletonLoader count={1} className="h-10 w-[180px]" />
            <SkeletonLoader count={1} className="h-10 w-[180px]" />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <SkeletonLoader count={6} />
        </section>
      </main>
    </div>
  );
}
