import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workoutPlanQuerySchema } from "@/lib/validation/workout-plans";
import { requireAuth } from "@/lib/auth";
import { listWorkoutPlansService } from "@/services/workout-plans";
import type { PlanQueryParams } from "@/types";
import {
  PageHeader,
  Surface,
  WorkoutPlansToolbar,
  WorkoutPlansListM3,
  ImportPlanButtonM3,
} from "../_components";

export default async function WorkoutPlansPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const params = await searchParams;

  const parseResult = workoutPlanQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  const parsedQuery: PlanQueryParams = parseResult.success
    ? parseResult.data
    : workoutPlanQuerySchema.parse({});

  const userId = await requireAuth();
  const result = await listWorkoutPlansService(userId, parsedQuery);
  const plans = result.items;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workout plans"
        description="Browse and manage your workout plans."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <span className="m3-chip">{plans.length} plans</span>
            <Button asChild className="m3-cta">
              <Link href="/m3/workout-plans/new">
                <Plus className="mr-2 size-4" />
                Create plan
              </Link>
            </Button>
            <ImportPlanButtonM3 />
          </div>
        }
      />

      <Surface variant="high">
        <Suspense
          fallback={<div className="h-14 animate-pulse rounded-lg bg-muted" />}
        >
          <WorkoutPlansToolbar
            part={parsedQuery.part ?? null}
            sort={parsedQuery.sort}
            order={parsedQuery.order}
          />
        </Suspense>

        <div className="mt-8">
          <WorkoutPlansListM3
            initialPlans={plans}
            initialNextCursor={result.nextCursor}
            initialHasMore={result.nextCursor !== null}
          />
        </div>
      </Surface>
    </div>
  );
}
