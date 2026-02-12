import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { listWorkoutSessionsService } from "@/services/workout-sessions";
import { sessionListQuerySchema } from "@/lib/validation/workout-sessions";
import type { SessionListQueryParams } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/layout/Surface";
import { WorkoutSessionsListM3 } from "@/components/workout-sessions/WorkoutSessionsListM3";
import { getTranslations } from "@/i18n/server";

export default async function WorkoutSessionsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const t = await getTranslations("workoutSessionsPage");
  const params = await searchParams;

  const parseResult = sessionListQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  const parsedQuery: SessionListQueryParams = parseResult.success
    ? parseResult.data
    : sessionListQuerySchema.parse({});

  let sessionsData = {
    items: [] as Awaited<
      ReturnType<typeof listWorkoutSessionsService>
    >["items"],
    nextCursor: null as string | null,
  };

  try {
    const userId = await requireAuth();
    const result = await listWorkoutSessionsService(userId, parsedQuery);
    sessionsData = result;
  } catch (error) {
    console.error("Error fetching workout sessions:", error);
  }

  const sessions = sessionsData.items;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-3">
            <span className="m3-chip">
              {sessions.length} {t("countLabel")}
            </span>
            <Button asChild className="m3-cta">
              <Link href="/workout-sessions/start">
                <Play className="mr-2 size-4" />
                {t("startCta")}
              </Link>
            </Button>
          </div>
        }
      />

      <Surface variant="high">
        <WorkoutSessionsListM3
          initialSessions={sessions}
          initialNextCursor={sessionsData.nextCursor}
          initialHasMore={sessionsData.nextCursor !== null}
        />
      </Surface>
    </div>
  );
}
