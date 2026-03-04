import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { ExternalWorkoutDTO } from "@/types";

type DbClient = SupabaseClient<Database>;
type ExternalWorkoutRow =
  Database["public"]["Tables"]["external_workouts"]["Row"];

const externalWorkoutSelectColumns =
  "id,started_at,sport_type,duration_minutes,calories,hr_avg,hr_max,intensity_rpe,notes,source,external_id,raw_payload,created_at,updated_at,user_id";

function mapExternalWorkout(row: ExternalWorkoutRow): ExternalWorkoutDTO {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, ...rest } = row;
  return rest;
}

export async function listExternalWorkoutsByUserId(
  client: DbClient,
  userId: string,
  params: {
    from?: string;
    to?: string;
    limit: number;
  },
): Promise<{ data: ExternalWorkoutDTO[]; error: PostgrestError | null }> {
  let query = client
    .from("external_workouts")
    .select(externalWorkoutSelectColumns)
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(params.limit);

  if (params.from) query = query.gte("started_at", params.from);
  if (params.to) query = query.lte("started_at", params.to);

  const { data, error } = await query;

  if (error || !data) return { data: [], error };

  return {
    data: data.map((item) => mapExternalWorkout(item as ExternalWorkoutRow)),
    error: null,
  };
}

export async function insertExternalWorkout(
  client: DbClient,
  userId: string,
  input: Omit<
    Database["public"]["Tables"]["external_workouts"]["Insert"],
    "user_id"
  >,
): Promise<{ data: ExternalWorkoutDTO | null; error: PostgrestError | null }> {
  const { data, error } = await client
    .from("external_workouts")
    .insert({
      ...input,
      user_id: userId,
    })
    .select(externalWorkoutSelectColumns)
    .single();

  if (error || !data) return { data: null, error };

  return { data: mapExternalWorkout(data as ExternalWorkoutRow), error: null };
}

export async function listExternalWorkoutSportTypesByUserId(
  client: DbClient,
  userId: string,
): Promise<{ data: string[]; error: PostgrestError | null }> {
  const { data, error } = await client
    .from("external_workouts")
    .select("sport_type, started_at")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(1000);

  if (error || !data) return { data: [], error };

  const unique = new Set<string>();
  for (const row of data) {
    if (typeof row.sport_type === "string" && row.sport_type.trim().length > 0) {
      unique.add(row.sport_type.trim());
    }
  }

  return { data: Array.from(unique), error: null };
}
