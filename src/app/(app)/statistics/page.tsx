import { requireAuth } from "@/lib/auth";
import { getTranslations } from "@/i18n/server";
import { listExternalWorkoutsService } from "@/services/external-workouts";
import { listWorkoutSessionsService } from "@/services/workout-sessions";
import type {
  ExternalWorkoutSource,
  ExternalWorkoutSportType,
  SessionSummaryDTO,
} from "@/types";
import { StatisticsDashboardM3 } from "@/components/statistics/StatisticsDashboardM3";

const MAX_PAGES = 8;
const SESSIONS_LOOKBACK_MONTHS = 12;

type StatisticsSessionBase = Pick<
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

type StatisticsSession = StatisticsSessionBase & {
  entry_type: "session" | "external";
  external_workout_id?: string;
  external_sport_type?: ExternalWorkoutSportType;
  external_source?: ExternalWorkoutSource;
  external_calories?: number | null;
  external_hr_avg?: number | null;
  external_hr_max?: number | null;
  external_intensity_rpe?: number | null;
  external_notes?: string | null;
};

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

    allItems.push(
      ...result.items.map((item) => ({
        ...item,
        entry_type: "session" as const,
      })),
    );
    cursor = result.nextCursor;

    if (!cursor) break;
  }

  let externalWorkouts: Awaited<ReturnType<typeof listExternalWorkoutsService>> = {
    items: [],
  };
  try {
    externalWorkouts = await listExternalWorkoutsService(userId, {
      from: from.toISOString(),
      limit: 500,
    });
  } catch (error) {
    console.warn("[statistics] external workouts unavailable", error);
  }

  const mappedExternal = externalWorkouts.items.map<StatisticsSession>(
    (workout) => {
      const startedAt = new Date(workout.started_at);
      const completedAt = new Date(
        startedAt.getTime() + workout.duration_minutes * 60 * 1000,
      );

      return {
        id: `external-${workout.id}`,
        entry_type: "external",
        external_workout_id: workout.id,
        workout_plan_id: null,
        plan_name_at_time: null,
        started_at: workout.started_at,
        completed_at: completedAt.toISOString(),
        active_duration_seconds: workout.duration_minutes * 60,
        exercise_count: 0,
        exercise_names: [],
        external_sport_type: workout.sport_type,
        external_source: workout.source,
        external_calories: workout.calories,
        external_hr_avg: workout.hr_avg,
        external_hr_max: workout.hr_max,
        external_intensity_rpe: workout.intensity_rpe,
        external_notes: workout.notes,
      };
    },
  );

  return [...allItems, ...mappedExternal].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );
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
