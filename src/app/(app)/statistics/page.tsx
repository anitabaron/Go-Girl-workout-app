import { requireAuth } from "@/lib/auth";
import { getTranslations } from "@/i18n/server";
import { listWorkoutSessionsService } from "@/services/workout-sessions";
import type { SessionSummaryDTO } from "@/types";
import { StatisticsDashboardM3 } from "@/components/statistics/StatisticsDashboardM3";

const MAX_PAGES = 8;
const SESSIONS_LOOKBACK_MONTHS = 12;

type StatisticsSession = Pick<
  SessionSummaryDTO,
  | "id"
  | "workout_plan_id"
  | "plan_name_at_time"
  | "started_at"
  | "completed_at"
  | "active_duration_seconds"
  | "exercise_count"
  | "exercise_names"
>;

async function fetchStatisticsSessions(
  userId: string,
): Promise<StatisticsSession[]> {
  const from = new Date();
  from.setMonth(from.getMonth() - SESSIONS_LOOKBACK_MONTHS);

  let cursor: string | null = null;
  const allItems: StatisticsSession[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await listWorkoutSessionsService(userId, {
      status: "completed",
      sort: "started_at",
      order: "desc",
      from: from.toISOString(),
      limit: 100,
      cursor,
    });

    allItems.push(...result.items);
    cursor = result.nextCursor;

    if (!cursor) break;
  }

  return allItems;
}

export default async function StatisticsPage() {
  const t = await getTranslations("statisticsPage");
  const userId = await requireAuth();
  const sessions = await fetchStatisticsSessions(userId);

  return (
    <StatisticsDashboardM3
      title={t("title")}
      description={t("description")}
      sessions={sessions}
    />
  );
}
