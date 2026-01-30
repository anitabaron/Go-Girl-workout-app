import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, Surface, Toolbar } from "../_components";

export default function ExercisesLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercises"
        description="Browse and manage your exercise library."
        actions={<Skeleton className="h-9 w-28" />}
      />

      <Surface>
        <Toolbar>
          <Skeleton className="h-9 w-full sm:max-w-xs" />
          <Skeleton className="h-9 w-full sm:w-[180px]" />
        </Toolbar>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="m3-skeleton-card h-32" />
          ))}
        </div>
      </Surface>
    </div>
  );
}
