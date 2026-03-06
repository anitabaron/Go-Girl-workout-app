import { createClient } from "@/db/supabase.server";
import { getOpenAIClient } from "@/lib/openai";
import {
  ServiceError,
  assertUser,
  mapDbError,
  parseOrThrow,
} from "@/lib/service-utils";
import {
  aiTrainerChatSchema,
  type AITrainerChatCommand,
} from "@/lib/validation/ai-trainer";

export type AITrainerChatResponse = {
  conversation_id: string | null;
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

export type AIConversationListItem = {
  id: string;
  title: string;
  preview: string;
  updated_at: string;
};

export type AIConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type AIConversationDetails = {
  id: string;
  title: string;
  messages: AIConversationMessage[];
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

type AIConversationRow = {
  id: string;
  title: string;
  updated_at: string;
};

type AIMessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function conversationTitleFromMessage(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "Nowa konwersacja";
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
}

function getErrorSummary(error: unknown): string {
  if (error && typeof error === "object") {
    const maybe = error as {
      status?: number;
      code?: string;
      type?: string;
      message?: string;
    };
    const parts = [
      maybe.status ? `status=${maybe.status}` : "",
      maybe.code ? `code=${maybe.code}` : "",
      maybe.type ? `type=${maybe.type}` : "",
      maybe.message ? `message=${maybe.message}` : "",
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }
  return error instanceof Error ? error.message : String(error);
}

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

function buildFallbackRecommendations(
  input: AITrainerChatCommand,
  context: AITrainerChatResponse["context"],
): string[] {
  const recommendations: string[] = [];

  if (context.external_workouts_last_7d >= 3) {
    recommendations.push(
      "Ogranicz intensywność najbliższego treningu i utrzymaj RPE w przedziale 6-7.",
    );
  } else {
    recommendations.push(
      "Możesz lekko progresować objętość: +1 seria w ćwiczeniu głównym.",
    );
  }

  if (input.workout_plan_id) {
    recommendations.push(
      "Dla bieżącego planu przygotuj wariant standard i lżejszy zależnie od regeneracji.",
    );
  } else {
    recommendations.push(
      "Utrzymuj dwa szablony bazowe: Workout 1 oraz Workout 2.",
    );
  }

  if (context.top_sport_last_7d) {
    recommendations.push(
      `Uwzględnij obciążenie z aktywności: ${context.top_sport_last_7d}.`,
    );
  }

  return recommendations.slice(0, 3);
}

function extractRecommendations(reply: string): string[] {
  const lines = reply
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bulletLines = lines
    .filter((line) => /^[-*\d.]/.test(line))
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);

  if (bulletLines.length >= 2) {
    return bulletLines.slice(0, 3);
  }
  return [];
}

async function generateAIReply(
  input: AITrainerChatCommand,
  context: AITrainerChatResponse["context"],
): Promise<string> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const openai = getOpenAIClient();

  const plansPreview =
    context.plans_preview.length > 0 ? context.plans_preview.join(", ") : "brak";
  const prompt = [
    "Jesteś trenerem AI w aplikacji treningowej.",
    "Twórz krótkie, konkretne odpowiedzi po polsku.",
    "Uwzględniaj regenerację, ryzyko przeciążenia i treningi poza aplikacją.",
    "Na końcu dodaj sekcję 'Rekomendacje:' z 2-3 punktami (lista).",
    "",
    "Kontekst użytkownika:",
    `- liczba planów: ${context.plans_count}`,
    `- podgląd planów: ${plansPreview}`,
    `- treningi poza aplikacją (7 dni): ${context.external_workouts_last_7d}`,
    `- czas treningów poza aplikacją (7 dni): ${context.external_duration_minutes_last_7d} min`,
    `- najczęstszy sport (7 dni): ${context.top_sport_last_7d ?? "brak"}`,
    input.workout_plan_id
      ? `- tryb: optymalizacja planu ${input.workout_plan_id}`
      : "- tryb: generowanie wskazówek do planu",
    "",
    `Wiadomość użytkownika: ${input.message}`,
  ].join("\n");

  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "Jesteś ekspertem planowania treningu siłowego i kondycyjnego. Nie udzielasz porad medycznych.",
      },
      { role: "user", content: prompt },
    ],
  });

  const reply = response.output_text?.trim();
  if (!reply) {
    throw new ServiceError("INTERNAL", "Model nie zwrócił treści odpowiedzi.");
  }
  return reply;
}

export async function aiTrainerChatService(
  userId: string,
  payload: unknown,
): Promise<AITrainerChatResponse> {
  assertUser(userId);
  const parsed = parseOrThrow(aiTrainerChatSchema, payload);
  const supabase = await createClient();

  let conversationId = parsed.conversation_id ?? null;
  let canPersistConversation = true;

  try {
    if (conversationId) {
      const { data: existingConversation, error: existingConversationError } =
        await supabase
          .from("ai_chat_conversations")
          .select("id")
          .eq("id", conversationId)
          .eq("user_id", userId)
          .single();
      if (existingConversationError || !existingConversation) {
        conversationId = null;
      }
    }

    if (!conversationId) {
      const { data: createdConversation, error: createConversationError } =
        await supabase
          .from("ai_chat_conversations")
          .insert({
            user_id: userId,
            title: conversationTitleFromMessage(parsed.message),
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single();

      if (createConversationError || !createdConversation) {
        canPersistConversation = false;
      } else {
        conversationId = createdConversation.id;
      }
    }

    if (canPersistConversation && conversationId) {
      const { error: userMessageError } = await supabase
        .from("ai_chat_messages")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: "user",
          content: parsed.message,
        });
      if (userMessageError) {
        canPersistConversation = false;
      }
    }
  } catch (error) {
    canPersistConversation = false;
    conversationId = null;
    console.warn("[aiTrainerChatService] Conversation persistence disabled:", error);
  }

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

  let reply = "";
  let recommendations: string[] = [];
  try {
    reply = await generateAIReply(parsed, context);
    recommendations = extractRecommendations(reply);
    if (recommendations.length === 0) {
      recommendations = buildFallbackRecommendations(parsed, context);
    }
  } catch (error) {
    console.error("[aiTrainerChatService] OpenAI call failed, using fallback", error);
    recommendations = buildFallbackRecommendations(parsed, context);
    const diagnostic = getErrorSummary(error);
    const diagnosticLine =
      process.env.NODE_ENV === "production"
        ? ""
        : `\n[diag] ${diagnostic}`;
    reply = [
      "Nie udało się pobrać pełnej odpowiedzi modelu, dlatego używam bezpiecznego trybu fallback.",
      diagnosticLine,
      "Rekomendacje:",
      ...recommendations.map((item, index) => `${index + 1}. ${item}`),
    ]
      .filter(Boolean)
      .join("\n");
  }

  const requestType = parsed.workout_plan_id ? "optimize" : "generate";
  const response: AITrainerChatResponse = {
    conversation_id: canPersistConversation ? conversationId : null,
    reply,
    recommendations,
    context,
  };

  if (canPersistConversation && conversationId) {
    const [{ error: assistantMessageError }, { error: conversationUpdateError }] =
      await Promise.all([
        supabase.from("ai_chat_messages").insert({
          conversation_id: conversationId,
          user_id: userId,
          role: "assistant",
          content: reply,
        }),
        supabase
          .from("ai_chat_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId)
          .eq("user_id", userId),
      ]);

    if (assistantMessageError) {
      console.warn(
        "[aiTrainerChatService] Failed to write ai_chat_messages assistant row:",
        assistantMessageError,
      );
    }
    if (conversationUpdateError) {
      console.warn(
        "[aiTrainerChatService] Failed to update ai_chat_conversations row:",
        conversationUpdateError,
      );
    }
  }

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

export async function listAITrainerConversationsService(
  userId: string,
): Promise<AIConversationListItem[]> {
  assertUser(userId);
  const supabase = await createClient();

  const { data: conversations, error: conversationsError } = await supabase
    .from("ai_chat_conversations")
    .select("id,title,updated_at")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (conversationsError) {
    throw mapDbError(conversationsError);
  }

  const rows = (conversations ?? []) as AIConversationRow[];
  if (rows.length === 0) return [];

  const conversationIds = rows.map((row) => row.id);
  const { data: messages, error: messagesError } = await supabase
    .from("ai_chat_messages")
    .select("conversation_id,content,created_at")
    .in("conversation_id", conversationIds)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (messagesError) {
    throw mapDbError(messagesError);
  }

  const latestMessageByConversation = new Map<
    string,
    { content: string; created_at: string }
  >();
  for (const message of messages ?? []) {
    if (!latestMessageByConversation.has(message.conversation_id)) {
      latestMessageByConversation.set(message.conversation_id, {
        content: message.content,
        created_at: message.created_at,
      });
    }
  }

  return rows.map((row) => {
    const latest = latestMessageByConversation.get(row.id);
    const preview = latest?.content?.trim() ?? "";
    return {
      id: row.id,
      title: row.title,
      preview: preview.length > 140 ? `${preview.slice(0, 137)}...` : preview,
      updated_at: latest?.created_at ?? row.updated_at,
    };
  });
}

export async function getAITrainerConversationDetailsService(
  userId: string,
  conversationId: string,
): Promise<AIConversationDetails> {
  assertUser(userId);
  const supabase = await createClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("ai_chat_conversations")
    .select("id,title")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (conversationError || !conversation) {
    throw new ServiceError("NOT_FOUND", "Konwersacja nie została znaleziona.");
  }

  const { data: messages, error: messagesError } = await supabase
    .from("ai_chat_messages")
    .select("id,role,content,created_at,conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw mapDbError(messagesError);
  }

  return {
    id: conversation.id,
    title: conversation.title,
    messages: ((messages ?? []) as AIMessageRow[]).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
    })),
  };
}
