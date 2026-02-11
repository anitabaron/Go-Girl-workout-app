import { Suspense } from "react";
import { personalRecordQuerySchema } from "@/lib/validation/personal-records";
import { requireAuth } from "@/lib/auth";
import { listPersonalRecordsService } from "@/services/personal-records";
import { listExerciseTitlesService } from "@/services/exercises";
import type { PersonalRecordQueryParams } from "@/types";
import { mapPersonalRecordsToViewModel } from "@/lib/personal-records/view-model";
import { getTranslations } from "@/i18n/server";
import {
  PageHeader,
  Surface,
  PersonalRecordsToolbar,
  PersonalRecordsListM3,
} from "@/components";

export default async function PersonalRecordsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const t = await getTranslations("personalRecordsPage");
  const params = await searchParams;

  const parseResult = personalRecordQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  const parsedQuery: PersonalRecordQueryParams = parseResult.success
    ? parseResult.data
    : personalRecordQuerySchema.parse({});

  const userId = await requireAuth();

  let exercisesForFilters: { id: string; title: string }[] = [];
  try {
    exercisesForFilters = await listExerciseTitlesService(userId, 50);
  } catch (error) {
    console.error("Error loading exercises for filters:", error);
  }

  let personalRecords;
  let errorMessage: string | null = null;

  try {
    const result = await listPersonalRecordsService(userId, parsedQuery);
    personalRecords = result;
  } catch (error) {
    console.error("Error loading personal records:", error);
    errorMessage =
      error instanceof Error ? error.message : t("fetchError");
    personalRecords = { items: [], nextCursor: null };
  }

  const viewModel = mapPersonalRecordsToViewModel(
    personalRecords.items,
    personalRecords.nextCursor,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <Surface variant="high">
        <Suspense
          fallback={<div className="h-14 animate-pulse rounded-lg bg-muted" />}
        >
          <PersonalRecordsToolbar
            exercises={exercisesForFilters}
            exerciseId={parsedQuery.exercise_id ?? null}
            metricType={parsedQuery.metric_type ?? null}
            sort={parsedQuery.sort}
            order={parsedQuery.order}
          />
        </Suspense>

        <div className="mt-4">
          <PersonalRecordsListM3
            initialData={viewModel}
            errorMessage={errorMessage}
          />
        </div>
      </Surface>
    </div>
  );
}
