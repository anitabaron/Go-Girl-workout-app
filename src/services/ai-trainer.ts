import { createClient } from "@/db/supabase.server";
import { assertUser, mapDbError, parseOrThrow } from "@/lib/service-utils";
import {
  aiTrainerChatSchema,
  type AITrainerChatCommand,
} from "@/lib/validation/ai-trainer";

export type AITrainerChatResponse = {
  reply: string;
  recommendations: string[];
  context: {
    plans_count: number;
    plans_preview: string[];
    external_workouts_last_7d: number;
    external_duration_minutes_last_7d: number;
    top_sport_last_7d: string | null;
  };
};

type PlanPreview = {
  id: string;
  name: string;
  part: string | null;
};

type ExternalWorkoutPreview = {
  started_at: string;
  duration_minutes: number;
  sport_type: string;
};

function summarizeExternalWorkouts(
  workouts: ExternalWorkoutPreview[],
): Pick<
  AITrainerChatResponse["context"],
  | "external_workouts_last_7d"
  | "external_duration_minutes_last_7d"
  | "top_sport_last_7d"
> {
  const bySport = new Map<string, number>();
  let totalMinutes = 0;

  for (const workout of workouts) {
    totalMinutes += workout.duration_minutes;
    bySport.set(workout.sport_type, (bySport.get(workout.sport_type) ?? 0) + 1);
  }

  const topSport =
    Array.from(bySport.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    external_workouts_last_7d: workouts.length,
    external_duration_minutes_last_7d: totalMinutes,
    top_sport_last_7d: topSport,
  };
}

function buildRecommendations(
  input: AITrainerChatCommand,
  context: AITrainerChatResponse["context"],
): string[] {
  const recs: string[] = [];

  if (context.external_workouts_last_7d >= 3) {
    recs.push(
      "Ten tydzień jest już dość obciążony. Warto skrócić najbliższy trening o 10-15 minut i utrzymać RPE 6-7.",
    );
  } else {
    recs.push(
      "Możesz progresować objętość: dodaj 1 serię w głównym ćwiczeniu lub +2 powtórzenia w ostatniej serii.",
    );
  }

  if (input.workout_plan_id) {
    recs.push(
      "Dla wybranego planu przygotuj wariant A (standard) i B (lżejszy), aby szybko reagować na zmęczenie.",
    );
  } else {
    recs.push(
      "Trzymaj 2 uniwersalne szablony (Workout 1 i Workout 2), a sesję finalną dobieraj dynamicznie pod aktualny stan.",
    );
  }

  if (context.top_sport_last_7d) {
    recs.push(
      `Najczęstsza aktywność poza aplikacją: ${context.top_sport_last_7d}. Uwzględnij to przy doborze intensywności kolejnego treningu.`,
    );
  }

  return recs;
}

function buildReply(
  input: AITrainerChatCommand,
  context: AITrainerChatResponse["context"],
  recommendations: string[],
): string {
  const plansPreview =
    context.plans_preview.length > 0
      ? context.plans_preview.join(", ")
      : "brak planów";

  return [
    `Analiza kontekstu: masz ${context.plans_count} plan(ów) (${plansPreview}).`,
    `W ostatnich 7 dniach: ${context.external_workouts_last_7d} trening(i) spoza aplikacji, łącznie ${context.external_duration_minutes_last_7d} min.`,
    `Twoja wiadomość: "${input.message}".`,
    "Proponuję taki kierunek:",
    ...recommendations.map((rec, index) => `${index + 1}. ${rec}`),
  ].join("\n");
}

export async function aiTrainerChatService(
  userId: string,
  payload: unknown,
): Promise<AITrainerChatResponse> {
  assertUser(userId);
  const parsed = parseOrThrow(aiTrainerChatSchema, payload);
  const supabase = await createClient();

  const [{ data: plans, error: plansError }, { data: external, error: extError }] =
    await Promise.all([
      supabase
        .from("workout_plans")
        .select("id,name,part")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("external_workouts")
        .select("started_at,duration_minutes,sport_type")
        .eq("user_id", userId)
        .gte(
          "started_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("started_at", { ascending: false })
        .limit(100),
    ]);

  if (plansError) {
    throw mapDbError(plansError);
  }
  if (extError) {
    throw mapDbError(extError);
  }

  const plansRows = (plans ?? []) as PlanPreview[];
  const externalRows = (external ?? []) as ExternalWorkoutPreview[];
  const externalSummary = summarizeExternalWorkouts(externalRows);

  const context: AITrainerChatResponse["context"] = {
    plans_count: plansRows.length,
    plans_preview: plansRows.slice(0, 3).map((plan) => plan.name),
    ...externalSummary,
  };

  const recommendations = buildRecommendations(parsed, context);
  const reply = buildReply(parsed, context, recommendations);

  const requestType = parsed.workout_plan_id ? "optimize" : "generate";
  const response: AITrainerChatResponse = {
    reply,
    recommendations,
    context,
  };

  const { error: aiRequestError } = await supabase.from("ai_requests").insert({
    user_id: userId,
    request_type: requestType,
    workout_plan_id: parsed.workout_plan_id ?? null,
    input_params: parsed,
    response_json: response,
    is_system_error: false,
  });

  if (aiRequestError) {
    console.warn("[aiTrainerChatService] Failed to write ai_requests log:", aiRequestError);
  }

  return response;
}
