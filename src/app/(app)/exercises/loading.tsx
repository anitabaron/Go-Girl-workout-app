import { SkeletonLoader } from "@/components/shared/skeleton-loader";
import { PageHeaderSection } from "@/components/layout/page-header-section";
import { PageHeader } from "@/components/navigation/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExercisesLoading() {
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeaderSection
        title="Biblioteka ćwiczeń"
        actionButton={<Skeleton className="h-10 w-32" />}
      >
        <div>
          <Skeleton className="h-6 w-96" />
        </div>
      </PageHeaderSection>

      <PageHeader showBack={false} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[180px]" />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <SkeletonLoader count={6} />
        </section>
      </main>
    </div>
  );
}
