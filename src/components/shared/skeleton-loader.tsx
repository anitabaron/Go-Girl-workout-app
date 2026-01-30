"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SkeletonLoaderProps = {
  /** Number of skeleton items. When 1, renders a single Skeleton (className applies). */
  count?: number;
  /** Optional className for single-skeleton mode or container */
  className?: string;
  /** Layout variant: card (grid) or compact (stacked) */
  variant?: "card" | "compact";
};

export function SkeletonLoader({
  count = 6,
  className,
  variant = "card",
}: Readonly<SkeletonLoaderProps>) {
  if (count === 1) {
    return <Skeleton className={cn("h-4 w-full", className)} />;
  }

  if (variant === "compact") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <div className="mt-2 flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
