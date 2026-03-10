import { createClient } from "@/db/supabase.server";
import type { Json } from "@/db/database.types";
import { getOpenAIClient } from "@/lib/openai";
import {
  ServiceError,
  assertUser,
  mapDbError,
  parseOrThrow,
} from "@/lib/service-utils";
import {
  aiTrainerActionExecuteSchema,
  aiTrainerChatSchema,
  type AITrainerActionExecuteCommand,
  type AITrainerChatCommand,
} from "@/lib/validation/ai-trainer";
import { createProgramSystemNoteService } from "@/services/training-programs";

export type AITrainerChatResponse = {
  conversation_id: string | null;
  usage: {
    limit: number;
    used: number;
    remaining: number;
  };
  reply: string;
  recommendations: string[];
  actions: Array<{
    id: string;
    type:
      | "APPLY_LIGHT_VERSION"
      | "ADD_DELOAD_WEEK"
      | "ADD_RECOVERY_DAY"
      | "GENERATE_PROGRAM";
    label: string;
    description: string;
    requires_confirmation: boolean;
    payload: Record<string, unknown>;
  }>;
  context_used: {
    profile_id: string | null;
    profile_persona_name: string | null;
    attachments_count: number;
    attached_program_ids: string[];
    attached_program_names: string[];
    includes_recent_performance: boolean;
    includes_recent_feedback: boolean;
  };
  context: {
    plans_count: number;
    plans_preview: string[];
    external_workouts_last_7d: number;
    external_duration_minutes_last_7d: number;
    top_sport_last_7d: string | null;
  };
};

export type AITrainerActionExecuteResponse = {
  message: string;
  program_id: string;
  updated_sessions: number;
  touched_session_ids: string[];
  note_id: string | null;
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

type AIUsageRow = {
  id: string;
  usage_count: number;
};

type AICoachProfilePreview = {
  id: string;
  persona_name: string;
  tone: "calm" | "motivating" | "direct";
  strictness: "low" | "medium" | "high";
  verbosity: "short" | "balanced" | "detailed";
  focus: string | null;
  risk_tolerance: string | null;
  contraindications: string | null;
  preferred_methodology: string | null;
  rules: Record<string, unknown> | null;
};

type AIProgramAttachmentContext = {
  id: string;
  name: string;
  duration_months: number;
  sessions_per_week: number;
  status: string;
  next_sessions: Array<{
    scheduled_date: string;
    workout_plan_name: string;
    status: string;
  }>;
};

const AI_DAILY_LIMIT = 20;
const DEV_AI_LIMIT = 999;

function isUsageLimitEnforced(): boolean {
  if (process.env.DISABLE_AI_LIMITS === "1") return false;
  return process.env.NODE_ENV === "production";
}

function isMissingDbObjectError(error: {
  code?: string;
  message?: string;
  details?: string;
}): boolean {
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return (
    message.includes("does not exist") ||
    message.includes("not found in the schema cache") ||
    message.includes("could not find the table") ||
    message.includes("could not find the relation")
  );
}

function isUsageLimitConstraintError(error: { code?: string; message?: string }): boolean {
  if (error.code !== "23514") return false;
  return (error.message ?? "").includes("ai_usage_usage_count_check");
}

function isProgramNotesUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { message?: string; details?: string };
  const combined = `${maybe.message ?? ""} ${maybe.details ?? ""}`.toLowerCase();
  return (
    combined.includes("program_notes") &&
    (combined.includes("does not exist") ||
      combined.includes("schema cache") ||
      combined.includes("could not find the table"))
  );
}

async function tryCreateProgramSystemNote(params: {
  userId: string;
  programId: string;
  input: {
    program_session_id?: string | null;
    note_text: string;
    fatigue_level?: number | null;
    vitality_level?: number | null;
    source?: "ai_action" | "ai_summary" | "user";
  };
}): Promise<string | null> {
  try {
    const note = await createProgramSystemNoteService(
      params.userId,
      params.programId,
      params.input,
    );
    return note.id;
  } catch (error) {
    if (isProgramNotesUnavailableError(error)) {
      console.warn(
        "[aiTrainerAction] program_notes unavailable, skipping note write",
        error,
      );
      return null;
    }
    throw error;
  }
}

function conversationTitleFromMessage(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "Nowa konwersacja";
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
}

function getDayIso(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

async function getCurrentAIUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ rowId: string | null; used: number }> {
  const dayKey = getDayIso();
  const { data, error } = await supabase
    .from("ai_usage")
    .select("id,usage_count")
    .eq("user_id", userId)
    .eq("month_year", dayKey)
    .maybeSingle();

  if (error) {
    throw mapDbError(error);
  }

  const row = data as AIUsageRow | null;
  return { rowId: row?.id ?? null, used: row?.usage_count ?? 0 };
}

async function incrementAIUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  current: { rowId: string | null; used: number },
): Promise<number> {
  const dayKey = getDayIso();

  if (current.rowId) {
    const { error } = await supabase
      .from("ai_usage")
      .update({ usage_count: current.used + 1 })
      .eq("id", current.rowId)
      .eq("user_id", userId);
    if (error) {
      if (isUsageLimitConstraintError(error)) {
        throw new ServiceError(
          "FORBIDDEN",
          "Wykorzystałaś limit Trenera AI w bieżącym okresie rozliczeniowym.",
        );
      }
      throw mapDbError(error);
    }
    return current.used + 1;
  }

  const { error } = await supabase.from("ai_usage").insert({
    user_id: userId,
    month_year: dayKey,
    usage_count: 1,
  });

  if (!error) return 1;

  if (isUsageLimitConstraintError(error)) {
    throw new ServiceError(
      "FORBIDDEN",
      "Wykorzystałaś limit Trenera AI w bieżącym okresie rozliczeniowym.",
    );
  }

  // Row might have been created concurrently.
  if (error.code === "23505") {
    const fresh = await getCurrentAIUsage(supabase, userId);
    if (!fresh.rowId) {
      throw new ServiceError("INTERNAL", "Nie udało się odczytać limitu AI.");
    }
    if (fresh.used >= AI_DAILY_LIMIT) {
      throw new ServiceError(
        "FORBIDDEN",
        `Wykorzystałaś dzienny limit Trenera AI (${AI_DAILY_LIMIT}/${AI_DAILY_LIMIT}).`,
      );
    }
    const { error: updateError } = await supabase
      .from("ai_usage")
      .update({ usage_count: fresh.used + 1 })
      .eq("id", fresh.rowId)
      .eq("user_id", userId);
    if (updateError) {
      if (isUsageLimitConstraintError(updateError)) {
        throw new ServiceError(
          "FORBIDDEN",
          "Wykorzystałaś limit Trenera AI w bieżącym okresie rozliczeniowym.",
        );
      }
      throw mapDbError(updateError);
    }
    return fresh.used + 1;
  }

  throw mapDbError(error);
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

function formatRulesForPrompt(
  rules: Record<string, unknown> | null | undefined,
): string | null {
  if (!rules) return null;
  try {
    const serialized = JSON.stringify(rules);
    if (!serialized || serialized === "{}") return null;
    const maxChars = 1800;
    return serialized.length > maxChars
      ? `${serialized.slice(0, maxChars - 3)}...`
      : serialized;
  } catch {
    return null;
  }
}

async function generateAIReply(
  input: AITrainerChatCommand,
  context: AITrainerChatResponse["context"],
  profile: AICoachProfilePreview | null,
  attachmentContextLines: string[],
): Promise<string> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const openai = getOpenAIClient();

  const plansPreview =
    context.plans_preview.length > 0 ? context.plans_preview.join(", ") : "brak";
  const rulesForPrompt = formatRulesForPrompt(profile?.rules);
  const prompt = [
    "Jesteś trenerem AI w aplikacji treningowej.",
    "Twórz krótkie, konkretne odpowiedzi po polsku.",
    "Uwzględniaj regenerację, ryzyko przeciążenia i treningi poza aplikacją.",
    "Stosuj realistyczne zakresy treningowe:",
    "- ćwiczenia izometryczne (np. L-sit, handstand hold): zwykle 10-45 s/serię",
    "- liczba serii w ćwiczeniu głównym: zwykle 2-6",
    "- nie proponuj skoków >15% tydzień do tygodnia",
    "Na końcu dodaj sekcję 'Rekomendacje:' z 2-3 punktami (lista).",
    "Nigdy nie twierdź, że zmiany zostały już wprowadzone w aplikacji.",
    "Możesz proponować zmiany, ale wdrożenie następuje dopiero po wykonaniu akcji systemowej.",
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
    profile
      ? `- profil trenera: ${profile.persona_name}, ton=${profile.tone}, rygor=${profile.strictness}, szczegółowość=${profile.verbosity}`
      : "- profil trenera: domyślny",
    profile?.focus ? `- fokus trenera: ${profile.focus}` : "",
    profile?.risk_tolerance
      ? `- tolerancja ryzyka: ${profile.risk_tolerance}`
      : "",
    profile?.contraindications
      ? `- przeciwwskazania: ${profile.contraindications}`
      : "",
    profile?.preferred_methodology
      ? `- preferowana metodologia: ${profile.preferred_methodology}`
      : "",
    rulesForPrompt ? `- dodatkowe zasady/profil: ${rulesForPrompt}` : "",
    attachmentContextLines.length > 0 ? "Kontekst z załączników:" : "",
    ...attachmentContextLines.map((line) => `- ${line}`),
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

function buildSuggestedActions(
  input: AITrainerChatCommand,
  context: AITrainerChatResponse["context"],
  targetProgramId: string | null,
): AITrainerChatResponse["actions"] {
  const text = input.message.toLowerCase();
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const actions: AITrainerChatResponse["actions"] = [];

  if (
    text.includes("zmęcz") ||
    normalized.includes("zmecz") ||
    text.includes("obola") ||
    normalized.includes("obola") ||
    text.includes("lżejs") ||
    normalized.includes("lzejs") ||
    normalized.includes("nie dam rady") ||
    normalized.includes("za duzo") ||
    text.includes("za dużo") ||
    normalized.includes("za trudne")
  ) {
    const looksLikeHardBlock =
      normalized.includes("nie dam rady") ||
      normalized.includes("za duzo") ||
      text.includes("za dużo") ||
      normalized.includes("za trudne");
    const reductionPercent = looksLikeHardBlock ? 25 : 20;
    actions.push({
      id: "apply-light-version",
      type: "APPLY_LIGHT_VERSION",
      label: "Zastosuj lżejszą wersję planu",
      description:
        "Zmniejszy obciążenie i objętość w najbliższych treningach programu.",
      requires_confirmation: true,
      payload: {
        reduction_percent: reductionPercent,
        based_on: "fatigue_signal",
        target_program_id: targetProgramId,
        apply_scope: "whole_program",
      },
    });
  }

  if (
    normalized.includes("deload") ||
    normalized.includes("regenerac") ||
    context.external_workouts_last_7d >= 4
  ) {
    actions.push({
      id: "add-deload-week",
      type: "ADD_DELOAD_WEEK",
      label: "Dodaj deload na ten tydzień",
      description:
        "Wprowadzi tydzień lżejszy (mniejsza objętość i intensywność) dla regeneracji.",
      requires_confirmation: true,
      payload: {
        volume_reduction_percent: 15,
        load_reduction_percent: 10,
        target_program_id: targetProgramId,
      },
    });
  }

  if (normalized.includes("regener") || normalized.includes("odpoczy")) {
    actions.push({
      id: "add-recovery-day",
      type: "ADD_RECOVERY_DAY",
      label: "Wpisz dzień regeneracji do kalendarza",
      description:
        "Doda planowany dzień regeneracji bez obciążenia siłowego.",
      requires_confirmation: true,
      payload: {
        day_type: "recovery",
        target_program_id: targetProgramId,
        shift_days: 1,
      },
    });
  }

  const asksForProgram =
    normalized.includes("program") ||
    normalized.includes("na 1 miesiac") ||
    normalized.includes("na 2 miesiac") ||
    normalized.includes("na 3 miesiac") ||
    normalized.includes("miesiac") ||
    normalized.includes("miesiace") ||
    normalized.includes("miesiecy") ||
    normalized.includes("8 tyg") ||
    normalized.includes("12 tyg") ||
    (normalized.includes("rozpisz") && normalized.includes("plan")) ||
    (normalized.includes("plan") && normalized.includes("cel"));

  if (asksForProgram) {
    actions.push({
      id: "generate-program",
      type: "GENERATE_PROGRAM",
      label: "Utwórz program treningowy",
      description:
        "Wygeneruje draft programu 1-3 miesiące z harmonogramem sesji tygodniowych.",
      requires_confirmation: true,
      payload: {
        duration_months: 1,
        sessions_per_week: 2,
      },
    });
  }

  return actions.slice(0, 4);
}

function extractProgramAttachmentIds(input: AITrainerChatCommand): string[] {
  const ids = new Set<string>();
  for (const attachment of input.attachments ?? []) {
    if (attachment.type !== "program") continue;
    let rawId: string | null = null;
    if (typeof attachment.value.program_id === "string") {
      rawId = attachment.value.program_id;
    } else if (typeof attachment.value.id === "string") {
      rawId = attachment.value.id;
    }
    if (rawId) ids.add(rawId);
  }
  return Array.from(ids);
}

function mapProgramContextToPromptLines(
  programs: AIProgramAttachmentContext[],
): string[] {
  if (programs.length === 0) return [];
  return programs.flatMap((program) => {
    const header = `${program.name} (id=${program.id}, ${program.duration_months} mies., ${program.sessions_per_week}/tydz., status=${program.status})`;
    const sessions = program.next_sessions.map(
      (session) =>
        `${session.scheduled_date}: ${session.workout_plan_name} (${session.status})`,
    );
    return sessions.length > 0
      ? [header, ...sessions.slice(0, 6).map((line) => `sesja ${line}`)]
      : [header, "brak zaplanowanych sesji"];
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseProgressionOverrides(
  value: Json | null | undefined,
): {
  load_adjustment_percent: number;
  volume_adjustment_percent: number;
  emphasis: string | null;
  [key: string]: Json | undefined;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      load_adjustment_percent: 0,
      volume_adjustment_percent: 0,
      emphasis: null,
    };
  }
  const obj = value as Record<string, Json>;
  const load =
    typeof obj.load_adjustment_percent === "number"
      ? clamp(obj.load_adjustment_percent, -30, 40)
      : 0;
  const volume =
    typeof obj.volume_adjustment_percent === "number"
      ? clamp(obj.volume_adjustment_percent, -30, 40)
      : 0;
  const emphasis = typeof obj.emphasis === "string" ? obj.emphasis : null;
  return {
    ...obj,
    load_adjustment_percent: load,
    volume_adjustment_percent: volume,
    emphasis,
  };
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function resolveTargetProgramId(command: AITrainerActionExecuteCommand): string | null {
  const raw = command.payload;
  const candidates = [raw.target_program_id, raw.program_id];
  return candidates.find((v): v is string => typeof v === "string") ?? null;
}

type PlannedSession = {
  id: string;
  training_program_id: string;
  scheduled_date: string;
  week_index: number;
  progression_overrides: Json | null;
  status: "planned" | "completed";
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function handleApplyLightVersion(
  supabase: SupabaseClient,
  userId: string,
  targetProgramId: string,
  programName: string,
  parsed: AITrainerActionExecuteCommand,
  planned: PlannedSession[],
): Promise<AITrainerActionExecuteResponse> {
  const reduction = clamp(
    typeof parsed.payload.reduction_percent === "number" ? parsed.payload.reduction_percent : 20,
    10,
    30,
  );
  const applyWholeProgram = parsed.payload.apply_scope === "whole_program";
  const sessionsToAdjust = applyWholeProgram
    ? planned.length
    : typeof parsed.payload.sessions_to_adjust === "number"
      ? clamp(parsed.payload.sessions_to_adjust, 1, planned.length)
      : planned.length;
  const targets = planned.slice(0, sessionsToAdjust);

  for (const session of targets) {
    const overrides = parseProgressionOverrides(session.progression_overrides);
    const nextOverrides = {
      ...overrides,
      // Light version should set a moderate cap, not stack reductions repeatedly.
      load_adjustment_percent: -Math.abs(reduction),
      volume_adjustment_percent: -Math.abs(reduction),
      emphasis: "light",
    };
    const { error: updateError } = await supabase
      .from("program_sessions")
      .update({ progression_overrides: nextOverrides })
      .eq("user_id", userId)
      .eq("id", session.id);
    if (updateError) throw mapDbError(updateError);
  }

  const noteId = await tryCreateProgramSystemNote({
    userId,
    programId: targetProgramId,
    input: {
      note_text: `Zastosowano lżejszą wersję programu (-${reduction}% obciążenia/objętości) dla ${targets.length} najbliższych sesji.`,
      fatigue_level:
        typeof parsed.payload.fatigue_level === "number"
          ? clamp(parsed.payload.fatigue_level, 1, 10)
          : null,
      vitality_level:
        typeof parsed.payload.vitality_level === "number"
          ? clamp(parsed.payload.vitality_level, 1, 10)
          : null,
      source: "ai_action",
    },
  });

  return {
    message: `Wdrożono lżejszy wariant dla ${targets.length} sesji programu „${programName}”.`,
    program_id: targetProgramId,
    updated_sessions: targets.length,
    touched_session_ids: targets.map((item) => item.id),
    note_id: noteId,
  };
}

async function handleAddDeloadWeek(
  supabase: SupabaseClient,
  userId: string,
  targetProgramId: string,
  programName: string,
  parsed: AITrainerActionExecuteCommand,
  planned: PlannedSession[],
): Promise<AITrainerActionExecuteResponse> {
  const first = planned[0];
  if (!first) throw new ServiceError("CONFLICT", "Brak sesji do deloadu.");
  const targetWeek = first.week_index;
  const targets = planned.filter((session) => session.week_index === targetWeek);
  if (targets.length === 0) {
    throw new ServiceError("CONFLICT", "Brak sesji do deloadu w najbliższym tygodniu.");
  }

  const loadReduction = clamp(
    typeof parsed.payload.load_reduction_percent === "number"
      ? parsed.payload.load_reduction_percent
      : 10,
    5,
    30,
  );
  const volumeReduction = clamp(
    typeof parsed.payload.volume_reduction_percent === "number"
      ? parsed.payload.volume_reduction_percent
      : 15,
    5,
    40,
  );

  for (const session of targets) {
    const overrides = parseProgressionOverrides(session.progression_overrides);
    const nextOverrides = {
      ...overrides,
      load_adjustment_percent: -Math.abs(loadReduction),
      volume_adjustment_percent: -Math.abs(volumeReduction),
      emphasis: "deload",
    };
    const { error: updateError } = await supabase
      .from("program_sessions")
      .update({ progression_overrides: nextOverrides })
      .eq("user_id", userId)
      .eq("id", session.id);
    if (updateError) throw mapDbError(updateError);
  }

  const noteId = await tryCreateProgramSystemNote({
    userId,
    programId: targetProgramId,
    input: {
      note_text: `Dodano tydzień deload (tydzień ${targetWeek}): obciążenie -${Math.abs(loadReduction)}%, objętość -${Math.abs(volumeReduction)}%.`,
      source: "ai_action",
    },
  });

  return {
    message: `Dodano deload dla tygodnia ${targetWeek} w programie „${programName}”.`,
    program_id: targetProgramId,
    updated_sessions: targets.length,
    touched_session_ids: targets.map((item) => item.id),
    note_id: noteId,
  };
}

async function handleAddRecoveryDay(
  supabase: SupabaseClient,
  userId: string,
  targetProgramId: string,
  programName: string,
  parsed: AITrainerActionExecuteCommand,
  planned: PlannedSession[],
): Promise<AITrainerActionExecuteResponse> {
  const shiftDays = clamp(
    typeof parsed.payload.shift_days === "number" ? parsed.payload.shift_days : 1,
    1,
    3,
  );
  const nextSession = planned[0];
  if (!nextSession) throw new ServiceError("CONFLICT", "Brak sesji do przesunięcia.");
  const nextDate = addDaysToIsoDate(nextSession.scheduled_date, shiftDays);
  const currentOverrides = parseProgressionOverrides(nextSession.progression_overrides);
  const recoveryOverrides = {
    ...currentOverrides,
    load_adjustment_percent: Math.min(currentOverrides.load_adjustment_percent, -20),
    volume_adjustment_percent: Math.min(currentOverrides.volume_adjustment_percent, -20),
    emphasis: "recovery",
  };

  const { error: updateSessionError } = await supabase
    .from("program_sessions")
    .update({
      scheduled_date: nextDate,
      progression_overrides: recoveryOverrides,
    })
    .eq("user_id", userId)
    .eq("id", nextSession.id);
  if (updateSessionError) throw mapDbError(updateSessionError);

  const noteId = await tryCreateProgramSystemNote({
    userId,
    programId: targetProgramId,
    input: {
      program_session_id: nextSession.id,
      note_text: `Dodano dzień regeneracji: sesję z ${nextSession.scheduled_date} przesunięto na ${nextDate} i ustawiono tryb recovery.`,
      source: "ai_action",
    },
  });

  return {
    message: `Dodano dzień regeneracji. Najbliższa sesja programu „${programName}” została przesunięta na ${nextDate}.`,
    program_id: targetProgramId,
    updated_sessions: 1,
    touched_session_ids: [nextSession.id],
    note_id: noteId,
  };
}

export async function executeAITrainerActionService(
  userId: string,
  payload: unknown,
): Promise<AITrainerActionExecuteResponse> {
  assertUser(userId);
  const parsed = parseOrThrow(aiTrainerActionExecuteSchema, payload);

  if (parsed.type === "GENERATE_PROGRAM") {
    throw new ServiceError(
      "BAD_REQUEST",
      "Akcja generowania programu jest wykonywana osobnym przepływem.",
    );
  }

  const targetProgramId = resolveTargetProgramId(parsed);
  if (!targetProgramId) {
    throw new ServiceError(
      "BAD_REQUEST",
      "Dodaj kontekst programu i ponów akcję, aby zastosować zmiany.",
    );
  }

  const supabase = await createClient();
  const { data: program, error: programError } = await supabase
    .from("training_programs")
    .select("id,name")
    .eq("user_id", userId)
    .eq("id", targetProgramId)
    .maybeSingle();
  if (programError) throw mapDbError(programError);
  if (!program) {
    throw new ServiceError("NOT_FOUND", "Program treningowy nie został znaleziony.");
  }

  const todayIso = getDayIso();
  const { data: upcomingSessions, error: sessionsError } = await supabase
    .from("program_sessions")
    .select("id,training_program_id,scheduled_date,week_index,progression_overrides,status")
    .eq("user_id", userId)
    .eq("training_program_id", targetProgramId)
    .eq("status", "planned")
    .gte("scheduled_date", todayIso)
    .order("scheduled_date", { ascending: true })
    .order("session_index", { ascending: true })
    .limit(64);
  if (sessionsError) throw mapDbError(sessionsError);

  const planned = (upcomingSessions ?? []) as PlannedSession[];

  if (planned.length === 0) {
    throw new ServiceError(
      "CONFLICT",
      "Brak nadchodzących sesji planned w tym programie.",
    );
  }

  if (parsed.type === "APPLY_LIGHT_VERSION") {
    return handleApplyLightVersion(
      supabase,
      userId,
      targetProgramId,
      program.name,
      parsed,
      planned,
    );
  }

  if (parsed.type === "ADD_DELOAD_WEEK") {
    return handleAddDeloadWeek(
      supabase,
      userId,
      targetProgramId,
      program.name,
      parsed,
      planned,
    );
  }

  return handleAddRecoveryDay(
    supabase,
    userId,
    targetProgramId,
    program.name,
    parsed,
    planned,
  );
}

async function ensureConversationAndMessage(
  supabase: SupabaseClient,
  userId: string,
  parsed: AITrainerChatCommand,
): Promise<{ conversationId: string | null; canPersist: boolean }> {
  let conversationId = parsed.conversation_id ?? null;
  let canPersist = true;

  try {
    if (conversationId) {
      const { data: existing, error } = await supabase
        .from("ai_chat_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .single();
      if (error || !existing) conversationId = null;
    }

    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("ai_chat_conversations")
        .insert({
          user_id: userId,
          title: conversationTitleFromMessage(parsed.message),
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error || !created) canPersist = false;
      else conversationId = created.id;
    }

    if (canPersist && conversationId) {
      const { error: msgError } = await supabase
        .from("ai_chat_messages")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: "user",
          content: parsed.message,
        });
      if (msgError) canPersist = false;
    }
  } catch (error) {
    canPersist = false;
    conversationId = null;
    console.warn("[aiTrainerChatService] Conversation persistence disabled:", error);
  }

  return { conversationId, canPersist };
}

async function loadChatContextData(
  supabase: SupabaseClient,
  userId: string,
  profileId: string | null,
) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const coachQuery = profileId
    ? supabase
        .from("ai_coach_profiles")
        .select(
          "id,persona_name,tone,strictness,verbosity,focus,risk_tolerance,contraindications,preferred_methodology,rules",
        )
        .eq("user_id", userId)
        .eq("id", profileId)
        .maybeSingle()
    : supabase
        .from("ai_coach_profiles")
        .select(
          "id,persona_name,tone,strictness,verbosity,focus,risk_tolerance,contraindications,preferred_methodology,rules",
        )
        .eq("user_id", userId)
        .maybeSingle();

  const [plansRes, externalRes, coachRes] = await Promise.all([
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
      .gte("started_at", sevenDaysAgo)
      .order("started_at", { ascending: false })
      .limit(100),
    coachQuery,
  ]);

  if (plansRes.error) {
    if (isMissingDbObjectError(plansRes.error)) {
      console.warn(
        "[aiTrainerChatService] workout_plans unavailable, using empty plans context",
        plansRes.error,
      );
      return {
        plans: [],
        external: (externalRes.data ?? []) as ExternalWorkoutPreview[],
        coachProfile: (coachRes.data ?? null) as AICoachProfilePreview | null,
      };
    }
    throw mapDbError(plansRes.error);
  }
  if (externalRes.error) {
    if (isMissingDbObjectError(externalRes.error)) {
      console.warn(
        "[aiTrainerChatService] external_workouts unavailable, using empty external context",
        externalRes.error,
      );
      return {
        plans: (plansRes.data ?? []) as PlanPreview[],
        external: [],
        coachProfile: (coachRes.data ?? null) as AICoachProfilePreview | null,
      };
    }
    throw mapDbError(externalRes.error);
  }
  if (coachRes.error) {
    if (isMissingDbObjectError(coachRes.error)) {
      console.warn(
        "[aiTrainerChatService] ai_coach_profiles unavailable, using default coach profile",
        coachRes.error,
      );
      return {
        plans: (plansRes.data ?? []) as PlanPreview[],
        external: (externalRes.data ?? []) as ExternalWorkoutPreview[],
        coachProfile: null,
      };
    }
    throw mapDbError(coachRes.error);
  }

  return {
    plans: (plansRes.data ?? []) as PlanPreview[],
    external: (externalRes.data ?? []) as ExternalWorkoutPreview[],
    coachProfile: (coachRes.data ?? null) as AICoachProfilePreview | null,
  };
}

async function loadAttachedProgramsContext(
  supabase: SupabaseClient,
  userId: string,
  attachedProgramIds: string[],
): Promise<AIProgramAttachmentContext[]> {
  if (attachedProgramIds.length === 0) return [];

  const [{ data: programsData, error: programsError }, { data: sessionsData, error: sessionsError }] =
    await Promise.all([
      supabase
        .from("training_programs")
        .select("id,name,duration_months,sessions_per_week,status")
        .eq("user_id", userId)
        .in("id", attachedProgramIds),
      supabase
        .from("program_sessions")
        .select("training_program_id,scheduled_date,status,workout_plans(name)")
        .eq("user_id", userId)
        .in("training_program_id", attachedProgramIds)
        .order("scheduled_date", { ascending: true }),
    ]);

  if (programsError) {
    if (isMissingDbObjectError(programsError)) {
      console.warn(
        "[aiTrainerChatService] training_programs unavailable, skipping attached programs context",
        programsError,
      );
      return [];
    }
    throw mapDbError(programsError);
  }
  if (sessionsError) {
    if (isMissingDbObjectError(sessionsError)) {
      console.warn(
        "[aiTrainerChatService] program_sessions unavailable, skipping attached programs context",
        sessionsError,
      );
      return [];
    }
    throw mapDbError(sessionsError);
  }

  const now = new Date();
  const sessionsByProgram = new Map<string, AIProgramAttachmentContext["next_sessions"]>();
  const sessionRows = (sessionsData ?? []) as Array<{
    training_program_id: string;
    scheduled_date: string;
    status: string;
    workout_plans: { name: string } | { name: string }[] | null;
  }>;

  for (const row of sessionRows) {
    const scheduledDate = new Date(row.scheduled_date);
    if (Number.isNaN(scheduledDate.getTime())) continue;
    if (scheduledDate < now && row.status !== "planned") continue;
    const planNameRaw = Array.isArray(row.workout_plans)
      ? row.workout_plans[0]?.name
      : row.workout_plans?.name;
    const current = sessionsByProgram.get(row.training_program_id) ?? [];
    current.push({
      scheduled_date: row.scheduled_date,
      status: row.status,
      workout_plan_name: planNameRaw ?? "Plan treningowy",
    });
    sessionsByProgram.set(row.training_program_id, current);
  }

  const programs = (programsData ?? []) as Array<{
    id: string;
    name: string;
    duration_months: number;
    sessions_per_week: number;
    status: string;
  }>;
  return programs.map((program) => ({
    ...program,
    next_sessions: (sessionsByProgram.get(program.id) ?? []).slice(0, 8),
  }));
}

async function loadAttachedNotesContext(
  supabase: SupabaseClient,
  userId: string,
  attachedProgramIds: string[],
  programNameById: Map<string, string>,
): Promise<string[]> {
  if (attachedProgramIds.length === 0) return [];

  const { data: notesData, error: notesError } = await supabase
    .from("program_notes")
    .select("training_program_id,program_session_id,note_text,fatigue_level,vitality_level,source,created_at")
    .eq("user_id", userId)
    .in("training_program_id", attachedProgramIds)
    .order("created_at", { ascending: false })
    .limit(12);

  if (notesError) {
    const missingTable =
      notesError.code === "42P01" ||
      notesError.message.toLowerCase().includes("program_notes");
    if (missingTable) {
      console.warn(
        "[aiTrainerChatService] program_notes table unavailable, skipping notes context",
        notesError,
      );
      return [];
    }
    throw mapDbError(notesError);
  }

  const notes = (notesData ?? []) as Array<{
    training_program_id: string;
    program_session_id: string | null;
    note_text: string;
    fatigue_level: number | null;
    vitality_level: number | null;
    source: string;
    created_at: string;
  }>;

  return notes.map((note) => {
    const programName = programNameById.get(note.training_program_id) ?? note.training_program_id;
    const fatigue = typeof note.fatigue_level === "number" ? `zmęczenie ${note.fatigue_level}/10` : "";
    const vitality = typeof note.vitality_level === "number" ? `witalność ${note.vitality_level}/10` : "";
    const metrics = [fatigue, vitality].filter(Boolean).join(", ");
    const metricsPart = metrics ? ` (${metrics})` : "";
    const shortText = note.note_text.length > 180 ? `${note.note_text.slice(0, 177)}...` : note.note_text;
    return `${programName} [${note.created_at.slice(0, 10)}]${metricsPart}: ${shortText}`;
  });
}

export async function aiTrainerChatService(
  userId: string,
  payload: unknown,
): Promise<AITrainerChatResponse> {
  assertUser(userId);
  const parsed = parseOrThrow(aiTrainerChatSchema, payload);
  const supabase = await createClient();
  const usageLimitEnforced = isUsageLimitEnforced();
  let usageBefore = { rowId: null as string | null, used: 0 };
  let usageTrackingEnabled = usageLimitEnforced;
  if (usageLimitEnforced) {
    try {
      usageBefore = await getCurrentAIUsage(supabase, userId);
      if (usageBefore.used >= AI_DAILY_LIMIT) {
        throw new ServiceError(
          "FORBIDDEN",
          `Wykorzystałaś dzienny limit Trenera AI (${AI_DAILY_LIMIT}/${AI_DAILY_LIMIT}).`,
        );
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        isMissingDbObjectError(error as { code?: string; message?: string })
      ) {
        usageTrackingEnabled = false;
        usageBefore = { rowId: null, used: 0 };
        console.warn(
          "[aiTrainerChatService] ai_usage unavailable, usage tracking disabled",
          error,
        );
      } else {
        throw error;
      }
    }
  }

  const { conversationId, canPersist: canPersistConversation } =
    await ensureConversationAndMessage(supabase, userId, parsed);

  const { plans: plansRows, external: externalRows, coachProfile: coachProfileRow } =
    await loadChatContextData(supabase, userId, parsed.profile_id ?? null);

  const externalSummary = summarizeExternalWorkouts(externalRows);
  const context: AITrainerChatResponse["context"] = {
    plans_count: plansRows.length,
    plans_preview: plansRows.slice(0, 3).map((plan) => plan.name),
    ...externalSummary,
  };

  const attachedProgramIds = extractProgramAttachmentIds(parsed);
  const attachedProgramsContext = await loadAttachedProgramsContext(
    supabase,
    userId,
    attachedProgramIds,
  );
  const programNameById = new Map(
    attachedProgramsContext.map((program) => [program.id, program.name]),
  );
  const attachedNotesContextLines = await loadAttachedNotesContext(
    supabase,
    userId,
    attachedProgramIds,
    programNameById,
  );
  const attachmentContextLines = mapProgramContextToPromptLines(attachedProgramsContext);

  let reply = "";
  let recommendations: string[] = [];
  const actions = buildSuggestedActions(
    parsed,
    context,
    attachedProgramsContext[0]?.id ?? null,
  );
  let isSystemError = false;
  try {
    reply = await generateAIReply(
      parsed,
      context,
      coachProfileRow,
      [...attachmentContextLines, ...attachedNotesContextLines],
    );
    recommendations = extractRecommendations(reply);
    if (recommendations.length === 0) {
      recommendations = buildFallbackRecommendations(parsed, context);
    }
  } catch (error) {
    isSystemError = true;
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
  let usageAfter = usageBefore.used;
  if (!isSystemError && usageTrackingEnabled && usageLimitEnforced) {
    try {
      usageAfter = await incrementAIUsage(supabase, userId, usageBefore);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        isMissingDbObjectError(error as { code?: string; message?: string })
      ) {
        usageTrackingEnabled = false;
        usageAfter = usageBefore.used;
        console.warn(
          "[aiTrainerChatService] ai_usage unavailable during increment, skipping usage update",
          error,
        );
      } else {
        throw error;
      }
    }
  }
  const response: AITrainerChatResponse = {
    conversation_id: canPersistConversation ? conversationId : null,
    usage: {
      limit: usageLimitEnforced ? AI_DAILY_LIMIT : DEV_AI_LIMIT,
      used: usageAfter,
      remaining: usageLimitEnforced
        ? Math.max(0, AI_DAILY_LIMIT - usageAfter)
        : DEV_AI_LIMIT,
    },
    reply,
    recommendations,
    actions,
    context_used: {
      profile_id: coachProfileRow?.id ?? null,
      profile_persona_name: coachProfileRow?.persona_name ?? null,
      attachments_count: parsed.attachments?.length ?? 0,
      attached_program_ids: attachedProgramsContext.map((item) => item.id),
      attached_program_names: attachedProgramsContext.map((item) => item.name),
      includes_recent_performance: true,
      includes_recent_feedback: attachedNotesContextLines.length > 0,
    },
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
    input_params: parsed as unknown as Json,
    response_json: response as unknown as Json,
    is_system_error: isSystemError,
  });

  if (aiRequestError) {
    console.warn("[aiTrainerChatService] Failed to write ai_requests log:", aiRequestError);
  }

  return response;
}

export async function getAITrainerUsageService(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  assertUser(userId);
  if (!isUsageLimitEnforced()) {
    return {
      limit: DEV_AI_LIMIT,
      used: 0,
      remaining: DEV_AI_LIMIT,
    };
  }
  const supabase = await createClient();
  const usage = await getCurrentAIUsage(supabase, userId);
  return {
    limit: AI_DAILY_LIMIT,
    used: usage.used,
    remaining: Math.max(0, AI_DAILY_LIMIT - usage.used),
  };
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

export async function deleteAITrainerConversationService(
  userId: string,
  conversationId: string,
): Promise<void> {
  assertUser(userId);
  const supabase = await createClient();

  const { data: deleted, error } = await supabase
    .from("ai_chat_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw mapDbError(error);
  }
  if (!deleted) {
    throw new ServiceError("NOT_FOUND", "Konwersacja nie została znaleziona.");
  }
}
