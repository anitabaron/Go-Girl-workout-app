import { requireAuth } from "@/lib/auth";
import { getTranslations } from "@/i18n/server";
import {
  listExternalWorkoutSportTypesService,
  listExternalWorkoutsService,
} from "@/services/external-workouts";
import { listWorkoutSessionsService } from "@/services/workout-sessions";
import { listProgramSessionsService } from "@/services/training-programs";
import { listWorkoutPlansService } from "@/services/workout-plans";
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
  entry_type: "session" | "external" | "planned";
  external_workout_id?: string;
  external_sport_type?: ExternalWorkoutSportType;
  external_source?: ExternalWorkoutSource;
  external_calories?: number | null;
  external_hr_avg?: number | null;
  external_hr_max?: number | null;
  external_intensity_rpe?: number | null;
  external_notes?: string | null;
  program_session_id?: string;
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

  let plannedSessions: Awaited<ReturnType<typeof listProgramSessionsService>> = {
    items: [],
  };
  try {
    plannedSessions = await listProgramSessionsService(userId, {
      from: toDateOnly(new Date()),
      status: "planned",
    });
  } catch (error) {
    console.warn("[statistics] program planned sessions unavailable", error);
  }

  const plansResult = await listWorkoutPlansService(userId, {
    sort: "created_at",
    order: "desc",
    limit: 100,
  });
  const planNameById = new Map(
    plansResult.items.map((plan) => [plan.id, plan.name]),
  );

  const mappedPlanned = plannedSessions.items.map<StatisticsSession>((session) => {
    const startedAt = new Date(`${session.scheduled_date}T12:00:00`);
    return {
      id: `planned-${session.id}`,
      entry_type: "planned",
      program_session_id: session.id,
      workout_plan_id: session.workout_plan_id,
      plan_name_at_time:
        planNameById.get(session.workout_plan_id) ?? "Program treningowy",
      started_at: startedAt.toISOString(),
      completed_at: null,
      active_duration_seconds: null,
      exercise_count: 0,
      exercise_names: [],
    };
  });

  return [...allItems, ...mappedExternal, ...mappedPlanned].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );
}

function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function StatisticsPage() {
  const t = await getTranslations("statisticsPage");
  const userId = await requireAuth();
  const [sessions, availableExternalSportTypes] = await Promise.all([
    fetchStatisticsSessions(userId),
    listExternalWorkoutSportTypesService(userId).then((result) => result.items),
  ]);

  return (
    <StatisticsDashboardM3
      title={t("title")}
      description={t("description")}
      sessions={sessions}
      availableExternalSportTypes={availableExternalSportTypes}
    />
  );
}
