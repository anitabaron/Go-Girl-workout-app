import { createClient } from "@/db/supabase.server";
import type { Json } from "@/db/database.types";
import {
  assertUser,
  mapDbError,
  parseOrThrow,
  ServiceError,
} from "@/lib/service-utils";
import {
  programCreateSchema,
  programGenerateSchema,
  programListQuerySchema,
  programSessionListQuerySchema,
  programSessionUpdateSchema,
  programUpdateSchema,
} from "@/lib/validation/training-programs";
import {
  findTrainingProgramById,
  findProgramSessionById,
  insertProgramSessions,
  insertTrainingProgram,
  linkProgramSessionToWorkoutSession,
  listProgramSessionsByUserId,
  listTrainingProgramsByUserId,
  listWorkoutPlansForProgramGeneration,
  updateProgramSessionById,
  updateTrainingProgramById,
} from "@/repositories/training-programs";
import { getOrCreateAICoachProfileService } from "@/services/ai-coach-profiles";
import { startWorkoutSessionService } from "@/services/workout-sessions";
import type {
  ProgramListQueryParams,
  ProgramSessionListQueryParams,
  ProgramUpdateCommand,
  TrainingProgramDTO,
} from "@/types";

export { ServiceError } from "@/lib/service-utils";

type PlanPreview = {
  id: string;
  name: string;
  part: string | null;
};

type ProgramGeneratedSession = {
  workout_plan_id: string;
  workout_plan_name: string;
  scheduled_date: string;
  week_index: number;
  session_index: number;
  status: "planned";
  progression_overrides: {
    load_adjustment_percent: number;
    volume_adjustment_percent: number;
    emphasis: string;
  };
};

export type ProgramGenerateResponse = {
  program: {
    name: string;
    goal_text: string;
    duration_months: 1 | 2 | 3;
    weeks_count: number;
    sessions_per_week: number;
    source: "ai";
    status: "draft";
    coach_profile_snapshot: Record<string, unknown> | null;
  };
  sessions: ProgramGeneratedSession[];
  recommendations: string[];
};

const DEFAULT_WEEKDAY_MAP: Record<number, number[]> = {
  1: [2],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

function getWeeksCount(durationMonths: 1 | 2 | 3): number {
  if (durationMonths === 1) return 4;
  if (durationMonths === 2) return 8;
  return 12;
}

function dateToIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfCurrentWeekMonday(baseDate = new Date()): Date {
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date;
}

function buildProgramName(goal: string): string {
  const normalized = goal.replace(/\s+/g, " ").trim();
  if (normalized.length <= 50) {
    return `Program: ${normalized}`;
  }
  return `Program: ${normalized.slice(0, 47)}...`;
}

function buildRecommendations(
  weeksCount: number,
  sessionsPerWeek: number,
  plans: PlanPreview[],
): string[] {
  const recs = [
    `Realizuj ${sessionsPerWeek} treningi tygodniowo przez ${weeksCount} tygodni bez nadrabiania opuszczonych dni pod rząd.`,
    "Po każdym 3-4 tygodniu oceń regenerację i jakość snu, zanim zwiększysz obciążenie.",
  ];

  if (plans.length > 1) {
    recs.push("Rotuj jednostki treningowe, żeby rozłożyć obciążenie grup mięśniowych w skali tygodnia.");
  } else {
    recs.push("Przy jednym planie używaj lżejszej i cięższej wersji tej samej jednostki dla lepszej regeneracji.");
  }

  return recs;
}

function generateProgramSchedule(
  plans: PlanPreview[],
  durationMonths: 1 | 2 | 3,
  sessionsPerWeek: number,
): ProgramGeneratedSession[] {
  const weeksCount = getWeeksCount(durationMonths);
  const weekdays = DEFAULT_WEEKDAY_MAP[sessionsPerWeek] ?? DEFAULT_WEEKDAY_MAP[2];
  const weekStart = startOfCurrentWeekMonday();
  const sessions: ProgramGeneratedSession[] = [];
  let sessionIndex = 1;

  for (let week = 1; week <= weeksCount; week += 1) {
    const loadAdjustment = Math.min(12, (week - 1) * 2);
    const volumeAdjustment = Math.min(10, (week - 1) * 2);
    const emphasis = week % 4 === 0 ? "deload" : "progressive";

    for (let i = 0; i < weekdays.length; i += 1) {
      const dayOffset = weekdays[i]!;
      const plan = plans[(sessionIndex - 1) % plans.length]!;
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + (week - 1) * 7 + dayOffset);

      sessions.push({
        workout_plan_id: plan.id,
        workout_plan_name: plan.name,
        scheduled_date: dateToIsoDate(dayDate),
        week_index: week,
        session_index: sessionIndex,
        status: "planned",
        progression_overrides: {
          load_adjustment_percent: loadAdjustment,
          volume_adjustment_percent: emphasis === "deload" ? -15 : volumeAdjustment,
          emphasis,
        },
      });

      sessionIndex += 1;
    }
  }

  return sessions;
}

async function getProgramWithSessions(
  userId: string,
  programId: string,
): Promise<TrainingProgramDTO> {
  const supabase = await createClient();

  const { data: program, error: programError } = await findTrainingProgramById(
    supabase,
    userId,
    programId,
  );
  if (programError) throw mapDbError(programError);
  if (!program) {
    throw new ServiceError("NOT_FOUND", "Program treningowy nie został znaleziony.");
  }

  const { data: sessions, error: sessionsError } = await listProgramSessionsByUserId(
    supabase,
    userId,
    {},
  );
  if (sessionsError) throw mapDbError(sessionsError);

  return {
    ...program,
    sessions: (sessions ?? []).filter((item) => item.training_program_id === program.id),
  };
}

export async function generateAIProgramService(
  userId: string,
  payload: unknown,
): Promise<ProgramGenerateResponse> {
  assertUser(userId);
  const parsed = parseOrThrow(programGenerateSchema, payload);
  const supabase = await createClient();

  const { data: plans, error: plansError } = await listWorkoutPlansForProgramGeneration(
    supabase,
    userId,
    12,
  );
  if (plansError) throw mapDbError(plansError);

  const planRows = (plans ?? []) as PlanPreview[];
  if (planRows.length === 0) {
    throw new ServiceError(
      "CONFLICT",
      "Brak planów treningowych. Utwórz co najmniej jeden plan, aby wygenerować program.",
    );
  }

  const coachProfile = await getOrCreateAICoachProfileService(userId);
  const sessions = generateProgramSchedule(
    planRows,
    parsed.duration_months,
    parsed.sessions_per_week,
  );
  const weeksCount = getWeeksCount(parsed.duration_months);

  return {
    program: {
      name: buildProgramName(parsed.goal_text),
      goal_text: parsed.goal_text,
      duration_months: parsed.duration_months,
      weeks_count: weeksCount,
      sessions_per_week: parsed.sessions_per_week,
      source: "ai",
      status: "draft",
      coach_profile_snapshot: {
        profile_id: coachProfile.id,
        persona_name: coachProfile.persona_name,
        tone: coachProfile.tone,
        strictness: coachProfile.strictness,
        verbosity: coachProfile.verbosity,
        focus: coachProfile.focus,
        risk_tolerance: coachProfile.risk_tolerance,
        contraindications: coachProfile.contraindications,
        preferred_methodology: coachProfile.preferred_methodology,
        rules: coachProfile.rules,
        constraints: parsed.constraints ?? null,
      },
    },
    sessions,
    recommendations: buildRecommendations(
      weeksCount,
      parsed.sessions_per_week,
      planRows,
    ),
  };
}

export async function createTrainingProgramService(
  userId: string,
  payload: unknown,
): Promise<TrainingProgramDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(programCreateSchema, payload);
  const supabase = await createClient();

  const weeksCount = getWeeksCount(parsed.duration_months);

  const { data: insertedProgram, error: insertProgramError } =
    await insertTrainingProgram(supabase, userId, {
      name: parsed.name,
      goal_text: parsed.goal_text ?? null,
      duration_months: parsed.duration_months,
      weeks_count: weeksCount,
      sessions_per_week: parsed.sessions_per_week,
      status: parsed.status,
      source: parsed.source,
      coach_profile_snapshot: (parsed.coach_profile_snapshot ?? null) as Json | null,
    });

  if (insertProgramError) throw mapDbError(insertProgramError);
  if (!insertedProgram) {
    throw new ServiceError("INTERNAL", "Nie udało się utworzyć programu treningowego.");
  }

  const { data: insertedSessions, error: insertSessionsError } =
    await insertProgramSessions(
      supabase,
      userId,
      insertedProgram.id,
      parsed.sessions.map((session) => ({
        ...session,
        status: session.status,
      })),
    );

  if (insertSessionsError) throw mapDbError(insertSessionsError);

  return {
    ...insertedProgram,
    sessions: insertedSessions ?? [],
  };
}

export async function listTrainingProgramsService(
  userId: string,
  query: ProgramListQueryParams,
): Promise<{ items: TrainingProgramDTO[] }> {
  assertUser(userId);
  const parsed = parseOrThrow(programListQuerySchema, {
    ...query,
    limit: query.limit ?? 30,
  });
  const supabase = await createClient();

  const { data, error } = await listTrainingProgramsByUserId(supabase, userId, parsed);
  if (error) throw mapDbError(error);

  const items = await Promise.all(
    (data ?? []).map(async (program) => {
      const detailed = await getProgramWithSessions(userId, program.id);
      return detailed;
    }),
  );

  return { items };
}

export async function getTrainingProgramService(
  userId: string,
  id: string,
): Promise<TrainingProgramDTO> {
  assertUser(userId);
  return await getProgramWithSessions(userId, id);
}

export async function patchTrainingProgramService(
  userId: string,
  id: string,
  payload: unknown,
): Promise<TrainingProgramDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(programUpdateSchema, payload);
  const supabase = await createClient();

  const patch: ProgramUpdateCommand & { weeks_count?: number } = {
    ...parsed,
  };
  if (parsed.duration_months) {
    patch.duration_months = parsed.duration_months;
    patch.weeks_count = getWeeksCount(parsed.duration_months);
  }

  const { data: updated, error } = await updateTrainingProgramById(
    supabase,
    userId,
    id,
    patch,
  );

  if (error) throw mapDbError(error);
  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Program treningowy nie został znaleziony.");
  }

  return await getProgramWithSessions(userId, updated.id);
}

export async function listProgramSessionsService(
  userId: string,
  query: ProgramSessionListQueryParams,
): Promise<{ items: Array<TrainingProgramDTO["sessions"][number]> }> {
  assertUser(userId);
  const parsed = parseOrThrow(programSessionListQuerySchema, query);
  const supabase = await createClient();

  const { data, error } = await listProgramSessionsByUserId(supabase, userId, parsed);
  if (error) throw mapDbError(error);

  return { items: data ?? [] };
}

export async function patchProgramSessionService(
  userId: string,
  id: string,
  payload: unknown,
): Promise<TrainingProgramDTO["sessions"][number]> {
  assertUser(userId);
  const parsed = parseOrThrow(programSessionUpdateSchema, payload);
  const supabase = await createClient();

  const { data: updated, error } = await updateProgramSessionById(
    supabase,
    userId,
    id,
    parsed,
  );
  if (error) throw mapDbError(error);
  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Sesja programu nie została znaleziona.");
  }

  return updated;
}

export async function startProgramSessionService(
  userId: string,
  id: string,
): Promise<{
  program_session: TrainingProgramDTO["sessions"][number];
  workout_session: Awaited<ReturnType<typeof startWorkoutSessionService>>["session"];
  is_new_session: boolean;
}> {
  assertUser(userId);
  const supabase = await createClient();

  const { data: programSession, error: fetchError } = await findProgramSessionById(
    supabase,
    userId,
    id,
  );
  if (fetchError) throw mapDbError(fetchError);
  if (!programSession) {
    throw new ServiceError("NOT_FOUND", "Sesja programu nie została znaleziona.");
  }

  const { session, isNew } = await startWorkoutSessionService(userId, {
    workout_plan_id: programSession.workout_plan_id,
  });

  const { data: linked, error: linkError } = await linkProgramSessionToWorkoutSession(
    supabase,
    userId,
    programSession.id,
    session.id,
  );
  if (linkError) throw mapDbError(linkError);
  if (!linked) {
    throw new ServiceError("INTERNAL", "Nie udało się podpiąć sesji programu do sesji treningowej.");
  }

  return {
    program_session: linked,
    workout_session: session,
    is_new_session: isNew,
  };
}
