import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
  UserCapabilityProfilePatchCommand,
  UserCapabilityProfileUpsertCommand,
} from "@/types";

type DbClient = SupabaseClient<Database>;

const capabilitySelectColumns =
  "id,movement_key,exercise_id,current_level,comfort_max_reps,comfort_max_duration_seconds,comfort_max_load_kg,best_recent_reps,best_recent_duration_seconds,best_recent_load_kg,weekly_progression_cap_percent,per_session_progression_cap_reps,per_session_progression_cap_duration_seconds,confidence_score,pain_flag,pain_notes,updated_from,created_at,updated_at";

export async function listCapabilityProfilesByUserId(
  client: DbClient,
  userId: string,
) {
  return await client
    .from("user_capability_profiles")
    .select(capabilitySelectColumns)
    .eq("user_id", userId)
    .order("movement_key", { ascending: true })
    .order("updated_at", { ascending: false });
}

export async function findCapabilityProfileByScope(
  client: DbClient,
  userId: string,
  movementKey: string,
  exerciseId?: string | null,
) {
  let query = client
    .from("user_capability_profiles")
    .select(capabilitySelectColumns)
    .eq("user_id", userId)
    .eq("movement_key", movementKey);

  query =
    exerciseId === undefined
      ? query.is("exercise_id", null)
      : exerciseId === null
        ? query.is("exercise_id", null)
        : query.eq("exercise_id", exerciseId);

  return await query.maybeSingle();
}

export async function insertCapabilityProfile(
  client: DbClient,
  userId: string,
  input: UserCapabilityProfileUpsertCommand,
) {
  return await client
    .from("user_capability_profiles")
    .insert({
      user_id: userId,
      ...input,
    })
    .select(capabilitySelectColumns)
    .single();
}

export async function updateCapabilityProfileById(
  client: DbClient,
  userId: string,
  id: string,
  patch: UserCapabilityProfilePatchCommand,
) {
  return await client
    .from("user_capability_profiles")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(capabilitySelectColumns)
    .maybeSingle();
}
