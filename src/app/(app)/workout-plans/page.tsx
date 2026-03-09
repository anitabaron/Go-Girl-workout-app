import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workoutPlanQuerySchema } from "@/lib/validation/workout-plans";
import { requireAuth } from "@/lib/auth";
import { listWorkoutPlansService } from "@/services/workout-plans";
import { listTrainingProgramsService } from "@/services/training-programs";
import type { PlanQueryParams } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/layout/Surface";
import { WorkoutPlansToolbar } from "@/components/workout-plans/WorkoutPlansToolbar";
import { WorkoutPlansListM3 } from "@/components/workout-plans/WorkoutPlansListM3";
import { ImportPlanButtonM3 } from "@/components/workout-plans/ImportPlanButtonM3";
import { ProgramsListClient } from "@/components/programs/ProgramsListClient";
import { getTranslations } from "@/i18n/server";

type PlansOrProgramsSection = "plans" | "programs";

export default async function WorkoutPlansPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const t = await getTranslations("workoutPlansPage");
  const tNav = await getTranslations("nav");
  const params = await searchParams;
  const activeSection: PlansOrProgramsSection =
    params.section === "programs" ? "programs" : "plans";
  const queryWithoutSection = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "section"),
  );

  const parseResult = workoutPlanQuerySchema.safeParse({
    ...queryWithoutSection,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  const parsedQuery: PlanQueryParams = parseResult.success
    ? parseResult.data
    : workoutPlanQuerySchema.parse({});

  const userId = await requireAuth();
  const plansResult =
    activeSection === "plans"
      ? await listWorkoutPlansService(userId, parsedQuery)
      : { items: [], nextCursor: null };
  const plans = plansResult.items;
  const programsResult =
    activeSection === "programs"
      ? await listTrainingProgramsService(userId, { limit: 50 })
      : { items: [] };
  const programs = programsResult.items;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex flex-col gap-3 items-end">
            <div className="flex flex-wrap items-center justify-end gap-3">
              {activeSection === "plans" ? (
                <>
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
                </>
              ) : null}
            </div>
            {activeSection === "plans" ? <ImportPlanButtonM3 /> : null}
          </div>
        }
      />

      <div className="inline-flex rounded-full border border-border bg-card p-1">
        <Link
          href="/workout-plans?section=plans"
          className={[
            "rounded-full px-6 py-1.5 text-sm font-medium transition-colors",
            activeSection === "plans"
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent",
          ].join(" ")}
        >
          {tNav("plans")}
        </Link>
        <Link
          href="/workout-plans?section=programs"
          className={[
            "rounded-full px-6 py-1.5 text-sm font-medium transition-colors",
            activeSection === "programs"
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent",
          ].join(" ")}
        >
          {tNav("programs")}
        </Link>
      </div>

      <Surface variant="high">
        {activeSection === "plans" ? (
          <>
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
                initialNextCursor={plansResult.nextCursor}
                initialHasMore={plansResult.nextCursor !== null}
              />
            </div>
          </>
        ) : (
          <ProgramsListClient items={programs} />
        )}
      </Surface>
    </div>
  );
}
