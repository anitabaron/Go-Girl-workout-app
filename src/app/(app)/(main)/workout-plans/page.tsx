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
import { getTranslations } from "@/i18n/server";

export default async function WorkoutPlansPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const t = await getTranslations("workoutPlansPage");
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
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex flex-col gap-3 items-end">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="m3-chip">
                {plans.length} {t("countLabel")}
              </span>
              <Button
                asChild
                className="m3-cta"
                data-test-id="create-workout-plan-button"
              >
                <Link href="/workout-plans/new">
                  <Plus className="mr-2 size-4" />
                  {t("createCta")}
                </Link>
              </Button>
            </div>
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
