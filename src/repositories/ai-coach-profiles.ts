import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/db/database.types";
import type { AICoachProfilePatchCommand } from "@/types";

type DbClient = SupabaseClient<Database>;

const coachProfileSelectColumns =
  "id,persona_name,tone,strictness,verbosity,focus,risk_tolerance,contraindications,preferred_methodology,rules,created_at,updated_at";

export async function findCoachProfileByUserId(client: DbClient, userId: string) {
  return await client
    .from("ai_coach_profiles")
    .select(coachProfileSelectColumns)
    .eq("user_id", userId)
    .maybeSingle();
}

export async function insertCoachProfile(
  client: DbClient,
  userId: string,
  input?: AICoachProfilePatchCommand,
) {
  return await client
    .from("ai_coach_profiles")
    .insert({
      user_id: userId,
      persona_name: input?.persona_name ?? "Wspierający",
      tone: input?.tone ?? "calm",
      strictness: input?.strictness ?? "medium",
      verbosity: input?.verbosity ?? "balanced",
      focus: input?.focus ?? null,
      risk_tolerance: input?.risk_tolerance ?? null,
      contraindications: input?.contraindications ?? null,
      preferred_methodology: input?.preferred_methodology ?? null,
      rules: (input?.rules ?? null) as Json | null,
    })
    .select(coachProfileSelectColumns)
    .single();
}

export async function updateCoachProfileByUserId(
  client: DbClient,
  userId: string,
  patch: AICoachProfilePatchCommand,
) {
  return await client
    .from("ai_coach_profiles")
    .update({
      ...patch,
      rules: (patch.rules ?? undefined) as Json | undefined,
    })
    .eq("user_id", userId)
    .select(coachProfileSelectColumns)
    .maybeSingle();
}
