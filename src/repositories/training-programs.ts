import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/db/database.types";
import type {
  ProgramSessionCreateCommand,
  ProgramSessionListQueryParams,
  ProgramSessionUpdateCommand,
  ProgramListQueryParams,
  ProgramUpdateCommand,
} from "@/types";

type DbClient = SupabaseClient<Database>;

const programSelectColumns =
  "id,name,goal_text,duration_months,weeks_count,sessions_per_week,status,source,coach_profile_snapshot,created_at,updated_at";

const programSessionSelectColumns =
  "id,training_program_id,workout_plan_id,scheduled_date,week_index,session_index,status,progression_overrides,linked_workout_session_id,created_at,updated_at";

export async function listTrainingProgramsByUserId(
  client: DbClient,
  userId: string,
  query: Required<Pick<ProgramListQueryParams, "limit">> & ProgramListQueryParams,
) {
  let builder = client
    .from("training_programs")
    .select(programSelectColumns)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(query.limit);

  if (query.status) {
    builder = builder.eq("status", query.status);
  }
  if (query.source) {
    builder = builder.eq("source", query.source);
  }

  return await builder;
}

export async function findTrainingProgramById(
  client: DbClient,
  userId: string,
  id: string,
) {
  return await client
    .from("training_programs")
    .select(programSelectColumns)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
}

export async function insertTrainingProgram(
  client: DbClient,
  userId: string,
  input: {
    name: string;
    goal_text: string | null;
    duration_months: number;
    weeks_count: number;
    sessions_per_week: number;
    status: Database["public"]["Enums"]["training_program_status"];
    source: Database["public"]["Enums"]["training_program_source"];
    coach_profile_snapshot?: Json | null;
  },
) {
  return await client
    .from("training_programs")
    .insert({
      user_id: userId,
      name: input.name,
      goal_text: input.goal_text,
      duration_months: input.duration_months,
      weeks_count: input.weeks_count,
      sessions_per_week: input.sessions_per_week,
      status: input.status,
      source: input.source,
      coach_profile_snapshot: input.coach_profile_snapshot ?? null,
    })
    .select(programSelectColumns)
    .single();
}

export async function updateTrainingProgramById(
  client: DbClient,
  userId: string,
  id: string,
  patch: ProgramUpdateCommand & { weeks_count?: number },
) {
  const dbPatch = {
    ...patch,
    coach_profile_snapshot:
      patch.coach_profile_snapshot === undefined
        ? undefined
        : ((patch.coach_profile_snapshot ?? null) as Json | null),
  };
  return await client
    .from("training_programs")
    .update(dbPatch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(programSelectColumns)
    .maybeSingle();
}

export async function insertProgramSessions(
  client: DbClient,
  userId: string,
  programId: string,
  sessions: ProgramSessionCreateCommand[],
) {
  return await client
    .from("program_sessions")
    .insert(
      sessions.map((session) => ({
        user_id: userId,
        training_program_id: programId,
        workout_plan_id: session.workout_plan_id,
        scheduled_date: session.scheduled_date,
        week_index: session.week_index,
        session_index: session.session_index,
        status: session.status ?? "planned",
        progression_overrides: (session.progression_overrides ?? null) as Json | null,
      })),
    )
    .select(programSessionSelectColumns);
}

export async function listProgramSessionsByUserId(
  client: DbClient,
  userId: string,
  query: ProgramSessionListQueryParams,
) {
  let builder = client
    .from("program_sessions")
    .select(programSessionSelectColumns)
    .eq("user_id", userId)
    .order("scheduled_date", { ascending: true })
    .order("session_index", { ascending: true });

  if (query.from) {
    builder = builder.gte("scheduled_date", query.from);
  }

  if (query.to) {
    builder = builder.lte("scheduled_date", query.to);
  }

  if (query.status) {
    builder = builder.eq("status", query.status);
  }

  return await builder;
}

export async function findProgramSessionById(
  client: DbClient,
  userId: string,
  id: string,
) {
  return await client
    .from("program_sessions")
    .select(programSessionSelectColumns)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
}

export async function updateProgramSessionById(
  client: DbClient,
  userId: string,
  id: string,
  patch: ProgramSessionUpdateCommand,
) {
  const dbPatch = {
    ...patch,
    progression_overrides:
      patch.progression_overrides === undefined
        ? undefined
        : ((patch.progression_overrides ?? null) as Json | null),
  };
  return await client
    .from("program_sessions")
    .update(dbPatch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(programSessionSelectColumns)
    .maybeSingle();
}

export async function linkProgramSessionToWorkoutSession(
  client: DbClient,
  userId: string,
  programSessionId: string,
  workoutSessionId: string,
) {
  return await client
    .from("program_sessions")
    .update({ linked_workout_session_id: workoutSessionId })
    .eq("user_id", userId)
    .eq("id", programSessionId)
    .select(programSessionSelectColumns)
    .maybeSingle();
}

export async function markProgramSessionCompletedByWorkoutSessionId(
  client: DbClient,
  userId: string,
  workoutSessionId: string,
) {
  return await client
    .from("program_sessions")
    .update({ status: "completed" })
    .eq("user_id", userId)
    .eq("linked_workout_session_id", workoutSessionId)
    .select("id")
    .limit(1)
    .maybeSingle();
}

export async function listWorkoutPlansForProgramGeneration(
  client: DbClient,
  userId: string,
  limit = 12,
) {
  return await client
    .from("workout_plans")
    .select("id,name,part")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
}
