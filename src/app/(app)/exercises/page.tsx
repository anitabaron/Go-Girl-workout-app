import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exerciseQuerySchema } from "@/lib/validation/exercises";
import { requireAuth } from "@/lib/auth";
import {
  listExercisesService,
  listExerciseTitlesService,
} from "@/services/exercises";
import type { ExerciseQueryParams } from "@/types";
import {
  PageHeader,
  Surface,
  EmptyState,
  ExercisesToolbar,
} from "@/components";
import { M3ExerciseCard } from "@/components";
import { getTranslations } from "@/i18n/server";

export default async function ExercisesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const t = await getTranslations("exercisesPage");
  const params = await searchParams;

  const parseResult = exerciseQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  const parsedQuery: ExerciseQueryParams = parseResult.success
    ? parseResult.data
    : exerciseQuerySchema.parse({});

  const userId = await requireAuth();

  let exercisesForFilters: { id: string; title: string }[] = [];
  try {
    exercisesForFilters = await listExerciseTitlesService(userId, 50);
  } catch (error) {
    console.error("Error loading exercises for filters:", error);
  }

  const result = await listExercisesService(userId, parsedQuery);
  const exercises = result.items;
  const isEmpty = exercises.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-3">
            <span className="m3-chip">
              {exercises.length} {t("countLabel")}
            </span>
            <Button
              asChild
              className="m3-cta"
              data-test-id="add-exercise-button"
            >
              <Link href="/exercises/new">
                <Plus className="mr-2 size-4" />
                {t("addCta")}
              </Link>
            </Button>
          </div>
        }
      />

      <Surface variant="high">
        <Suspense
          fallback={<div className="h-14 animate-pulse rounded-lg bg-muted" />}
        >
          <ExercisesToolbar
            exercises={exercisesForFilters}
            search={parsedQuery.search}
            part={parsedQuery.part ?? null}
            type={parsedQuery.type ?? null}
            exerciseId={parsedQuery.exercise_id ?? null}
          />
        </Suspense>

        <div className="mt-8">
          {isEmpty ? (
            <div data-test-id="exercises-empty-state">
              <EmptyState
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                icon={<Plus className="text-muted-foreground" />}
              />
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2"
              data-test-id="exercises-list"
            >
              {exercises.map((ex) => (
                <M3ExerciseCard key={ex.id} exercise={ex} />
              ))}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}
