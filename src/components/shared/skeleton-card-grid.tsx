import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type SkeletonCardGridProps = {
  count?: number;
};

/**
 * Siatka kart skeleton – wspólny layout dla loading states.
 * Bez "use client" – może być używany w Server Components (loading.tsx)
 * oraz importowany przez Client Components (SkeletonLoader).
 */
export function SkeletonCardGrid({
  count = 6,
}: Readonly<SkeletonCardGridProps>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="rounded-xl border border-border bg-secondary/70 dark:border-border dark:bg-card"
        >
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
