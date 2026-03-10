import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/db/database.types";

type DbClient = SupabaseClient<Database>;

const aiPlanDecisionSelectColumns =
  "id,training_program_id,request_type,planner_source,input_snapshot,planner_output,validation_result,repair_log,final_output,guardrail_events,realism_score,accepted,created_at,updated_at";

export async function insertAIPlanDecision(
  client: DbClient,
  userId: string,
  input: {
    training_program_id?: string | null;
    request_type?: Database["public"]["Enums"]["ai_request_type"];
    planner_source: string;
    input_snapshot: Json;
    planner_output: Json;
    validation_result: Json;
    repair_log: Json;
    final_output: Json;
    guardrail_events: Json;
    realism_score: number;
    accepted: boolean;
  },
) {
  return await client
    .from("ai_plan_decisions")
    .insert({
      user_id: userId,
      training_program_id: input.training_program_id ?? null,
      request_type: input.request_type ?? "generate",
      planner_source: input.planner_source,
      input_snapshot: input.input_snapshot,
      planner_output: input.planner_output,
      validation_result: input.validation_result,
      repair_log: input.repair_log,
      final_output: input.final_output,
      guardrail_events: input.guardrail_events,
      realism_score: input.realism_score,
      accepted: input.accepted,
    })
    .select(aiPlanDecisionSelectColumns)
    .single();
}

export async function updateAIPlanDecisionById(
  client: DbClient,
  userId: string,
  id: string,
  patch: {
    training_program_id?: string | null;
    final_output?: Json;
    accepted?: boolean;
  },
) {
  return await client
    .from("ai_plan_decisions")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(aiPlanDecisionSelectColumns)
    .maybeSingle();
}
