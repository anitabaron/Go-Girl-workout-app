import { createClient } from "@/db/supabase.server";
import {
  assertUser,
  mapDbError,
  parseOrThrow,
  ServiceError,
} from "@/lib/service-utils";
import {
  capabilityProfilePatchSchema,
  capabilityProfileUpsertSchema,
} from "@/lib/validation/capability-profiles";
import { inferMovementKey } from "@/lib/training/movement-keys";
import {
  findCapabilityProfileByScope,
  insertCapabilityProfile,
  listCapabilityProfilesByUserId,
  updateCapabilityProfileById,
} from "@/repositories/capability-profiles";
import type {
  UserCapabilityProfileDTO,
  UserCapabilityProfilePatchCommand,
  UserCapabilityProfileUpsertCommand,
} from "@/types";

export async function listCapabilityProfilesService(
  userId: string,
): Promise<UserCapabilityProfileDTO[]> {
  assertUser(userId);
  const supabase = await createClient();
  const { data, error } = await listCapabilityProfilesByUserId(supabase, userId);
  if (error) throw mapDbError(error);
  return (data ?? []) as UserCapabilityProfileDTO[];
}

export async function upsertCapabilityProfileService(
  userId: string,
  payload: unknown,
): Promise<UserCapabilityProfileDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(capabilityProfileUpsertSchema, payload);
  return await upsertCapabilityProfileInternal(userId, {
    ...parsed,
    exercise_id: parsed.exercise_id ?? null,
  });
}

export async function patchCapabilityProfileService(
  userId: string,
  id: string,
  payload: unknown,
): Promise<UserCapabilityProfileDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(capabilityProfilePatchSchema, payload);
  const supabase = await createClient();
  const { data, error } = await updateCapabilityProfileById(
    supabase,
    userId,
    id,
    parsed,
  );
  if (error) throw mapDbError(error);
  if (!data) {
    throw new ServiceError(
      "NOT_FOUND",
      "Profil możliwości nie został znaleziony.",
    );
  }
  return data as UserCapabilityProfileDTO;
}

export async function upsertCapabilityProfileInternal(
  userId: string,
  input: UserCapabilityProfileUpsertCommand,
): Promise<UserCapabilityProfileDTO> {
  const supabase = await createClient();
  const { data: existing, error: existingError } =
    await findCapabilityProfileByScope(
      supabase,
      userId,
      input.movement_key,
      input.exercise_id ?? null,
    );
  if (existingError) throw mapDbError(existingError);

  if (!existing) {
    const { data, error } = await insertCapabilityProfile(supabase, userId, input);
    if (error) throw mapDbError(error);
    if (!data) {
      throw new ServiceError(
        "INTERNAL",
        "Nie udało się utworzyć profilu możliwości.",
      );
    }
    return data as UserCapabilityProfileDTO;
  }

  const patch: UserCapabilityProfilePatchCommand = {
    exercise_id: input.exercise_id ?? null,
    current_level: input.current_level ?? null,
    comfort_max_reps: input.comfort_max_reps ?? null,
    comfort_max_duration_seconds: input.comfort_max_duration_seconds ?? null,
    comfort_max_load_kg: input.comfort_max_load_kg ?? null,
    best_recent_reps: input.best_recent_reps ?? null,
    best_recent_duration_seconds: input.best_recent_duration_seconds ?? null,
    best_recent_load_kg: input.best_recent_load_kg ?? null,
    weekly_progression_cap_percent: input.weekly_progression_cap_percent,
    per_session_progression_cap_reps:
      input.per_session_progression_cap_reps ?? null,
    per_session_progression_cap_duration_seconds:
      input.per_session_progression_cap_duration_seconds ?? null,
    confidence_score: input.confidence_score,
    pain_flag: input.pain_flag,
    pain_notes: input.pain_notes ?? null,
    updated_from: input.updated_from,
  };

  const { data, error } = await updateCapabilityProfileById(
    supabase,
    userId,
    existing.id,
    patch,
  );
  if (error) throw mapDbError(error);
  if (!data) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się zaktualizować profilu możliwości.",
    );
  }
  return data as UserCapabilityProfileDTO;
}

export async function applyCapabilityFeedbackSignal(params: {
  userId: string;
  noteText: string;
  fatigueLevel?: number | null;
  vitalityLevel?: number | null;
}): Promise<UserCapabilityProfileDTO | null> {
  const signal = detectCapabilityFeedbackSignal(
    params.noteText,
    params.fatigueLevel ?? null,
    params.vitalityLevel ?? null,
  );

  if (!signal.shouldAdjust) {
    return null;
  }

  const movementKey = signal.movementKey;
  const existingProfiles = await listCapabilityProfilesService(params.userId);
  const existing = existingProfiles.find(
    (profile) => profile.movement_key === movementKey && profile.exercise_id === null,
  );

  const nextConfidence = Math.max(
    20,
    (existing?.confidence_score ?? 60) - (signal.looksLikePain ? 20 : 10),
  );
  const nextReps =
    existing?.comfort_max_reps != null
      ? Math.max(1, existing.comfort_max_reps - 1)
      : null;
  const nextDuration =
    existing?.comfort_max_duration_seconds != null
      ? Math.max(10, existing.comfort_max_duration_seconds - 3)
      : null;

  return await upsertCapabilityProfileInternal(params.userId, {
    movement_key: movementKey,
    exercise_id: null,
    current_level: existing?.current_level ?? null,
    comfort_max_reps: nextReps,
    comfort_max_duration_seconds: nextDuration,
    comfort_max_load_kg: existing?.comfort_max_load_kg ?? null,
    best_recent_reps: existing?.best_recent_reps ?? null,
    best_recent_duration_seconds: existing?.best_recent_duration_seconds ?? null,
    best_recent_load_kg: existing?.best_recent_load_kg ?? null,
    weekly_progression_cap_percent: Math.max(
      5,
      (existing?.weekly_progression_cap_percent ?? 15) - 5,
    ),
    per_session_progression_cap_reps:
      existing?.per_session_progression_cap_reps ?? 1,
    per_session_progression_cap_duration_seconds:
      existing?.per_session_progression_cap_duration_seconds ?? 2,
    confidence_score: nextConfidence,
    pain_flag: signal.looksLikePain || existing?.pain_flag || false,
    pain_notes: signal.looksLikePain
      ? params.noteText.slice(0, 1000)
      : existing?.pain_notes ?? null,
    updated_from: "ai_feedback",
  });
}

export async function applyCapabilitySessionResult(params: {
  userId: string;
  exerciseTitle: string;
  exercisePart?: string | null;
  plannedSets?: number | null;
  plannedReps?: number | null;
  plannedDurationSeconds?: number | null;
  actualSetCount?: number | null;
  bestSetReps?: number | null;
  bestSetDurationSeconds?: number | null;
  actualReps?: number | null;
  actualDurationSeconds?: number | null;
  isSkipped?: boolean;
}): Promise<UserCapabilityProfileDTO | null> {
  const movementKey = inferMovementKey({
    title: params.exerciseTitle,
    part: params.exercisePart ?? null,
  });
  const existingProfiles = await listCapabilityProfilesService(params.userId);
  const existing = existingProfiles.find(
    (profile) => profile.movement_key === movementKey && profile.exercise_id === null,
  );
  const nextProfile = deriveCapabilityProfileFromSessionResult(existing ?? null, {
    movementKey,
    plannedSets: params.plannedSets ?? null,
    plannedReps: params.plannedReps ?? null,
    plannedDurationSeconds: params.plannedDurationSeconds ?? null,
    actualSetCount: params.actualSetCount ?? null,
    bestSetReps: params.bestSetReps ?? null,
    bestSetDurationSeconds: params.bestSetDurationSeconds ?? null,
    actualReps: params.actualReps ?? null,
    actualDurationSeconds: params.actualDurationSeconds ?? null,
    isSkipped: params.isSkipped ?? false,
  });

  if (!nextProfile) {
    return null;
  }

  return await upsertCapabilityProfileInternal(params.userId, nextProfile);
}

export function deriveCapabilityProfileFromSessionResult(
  existing: UserCapabilityProfileDTO | null,
  params: {
    movementKey: UserCapabilityProfileDTO["movement_key"];
    plannedSets: number | null;
    plannedReps: number | null;
    plannedDurationSeconds: number | null;
    actualSetCount: number | null;
    bestSetReps: number | null;
    bestSetDurationSeconds: number | null;
    actualReps: number | null;
    actualDurationSeconds: number | null;
    isSkipped: boolean;
  },
): UserCapabilityProfileUpsertCommand | null {
  if (
    !params.isSkipped &&
    params.actualReps == null &&
    params.actualDurationSeconds == null &&
    params.bestSetReps == null &&
    params.bestSetDurationSeconds == null
  ) {
    return null;
  }

  const currentConfidence = existing?.confidence_score ?? 60;
  const observedReps = params.bestSetReps ?? params.actualReps ?? null;
  const observedDuration =
    params.bestSetDurationSeconds ?? params.actualDurationSeconds ?? null;
  const setRatio =
    params.plannedSets && params.actualSetCount != null
      ? params.actualSetCount / Math.max(params.plannedSets, 1)
      : null;
  const repRatio =
    params.plannedReps && observedReps != null
      ? observedReps / Math.max(params.plannedReps, 1)
      : null;
  const durationRatio =
    params.plannedDurationSeconds && observedDuration != null
      ? observedDuration / Math.max(params.plannedDurationSeconds, 1)
      : null;

  const performanceRatios = [setRatio, repRatio, durationRatio].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  const weakestRatio =
    performanceRatios.length > 0 ? Math.min(...performanceRatios) : null;
  const strongestRatio =
    performanceRatios.length > 0 ? Math.max(...performanceRatios) : null;

  const underperformed =
    !params.isSkipped && weakestRatio != null && weakestRatio < 0.75;
  const exceededPlan =
    !params.isSkipped &&
    strongestRatio != null &&
    strongestRatio >= 1.05 &&
    (setRatio == null || setRatio >= 0.9);

  const nextConfidence = params.isSkipped
    ? Math.max(20, currentConfidence - 12)
    : underperformed
      ? Math.max(25, currentConfidence - 8)
      : exceededPlan
        ? Math.min(100, currentConfidence + 6)
        : Math.min(100, currentConfidence + 2);

  const nextComfortReps = (() => {
    const current = existing?.comfort_max_reps ?? null;
    if (observedReps == null) {
      return params.isSkipped ? Math.max(1, (current ?? 2) - 1) : current;
    }
    if (params.isSkipped) {
      return Math.max(1, (current ?? observedReps) - 1);
    }
    if (underperformed) {
      return current == null ? observedReps : Math.max(1, Math.min(current, observedReps));
    }
    return Math.max(current ?? 1, observedReps);
  })();

  const nextComfortDuration = (() => {
    const current = existing?.comfort_max_duration_seconds ?? null;
    if (observedDuration == null) {
      return params.isSkipped ? Math.max(10, (current ?? 12) - 3) : current;
    }
    if (params.isSkipped) {
      return Math.max(10, (current ?? observedDuration) - 3);
    }
    if (underperformed) {
      return current == null
        ? Math.max(10, observedDuration)
        : Math.max(10, Math.min(current, observedDuration));
    }
    return Math.max(current ?? 10, observedDuration);
  })();

  return {
    movement_key: params.movementKey,
    exercise_id: null,
    current_level: existing?.current_level ?? null,
    comfort_max_reps: nextComfortReps,
    comfort_max_duration_seconds: nextComfortDuration,
    comfort_max_load_kg: existing?.comfort_max_load_kg ?? null,
    best_recent_reps:
      observedReps != null
        ? Math.max(existing?.best_recent_reps ?? 0, observedReps)
        : (existing?.best_recent_reps ?? null),
    best_recent_duration_seconds:
      observedDuration != null
        ? Math.max(
            existing?.best_recent_duration_seconds ?? 0,
            observedDuration,
          )
        : (existing?.best_recent_duration_seconds ?? null),
    best_recent_load_kg: existing?.best_recent_load_kg ?? null,
    weekly_progression_cap_percent: params.isSkipped
      ? Math.max(5, (existing?.weekly_progression_cap_percent ?? 15) - 5)
      : underperformed
        ? Math.max(5, (existing?.weekly_progression_cap_percent ?? 15) - 3)
        : exceededPlan
          ? Math.min(20, (existing?.weekly_progression_cap_percent ?? 15) + 1)
          : (existing?.weekly_progression_cap_percent ?? 15),
    per_session_progression_cap_reps:
      existing?.per_session_progression_cap_reps ?? 1,
    per_session_progression_cap_duration_seconds:
      existing?.per_session_progression_cap_duration_seconds ?? 2,
    confidence_score: nextConfidence,
    pain_flag: existing?.pain_flag ?? false,
    pain_notes: existing?.pain_notes ?? null,
    updated_from: "session_result",
  };
}

export function detectCapabilityFeedbackSignal(
  noteText: string,
  fatigueLevel: number | null,
  vitalityLevel: number | null,
): {
  shouldAdjust: boolean;
  looksLikePain: boolean;
  looksLikeHardBlock: boolean;
  highFatigue: boolean;
  lowVitality: boolean;
  movementKey: UserCapabilityProfileDTO["movement_key"];
} {
  const normalized = noteText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const looksLikePain =
    normalized.includes("bol") ||
    normalized.includes("bark") ||
    normalized.includes("kolan") ||
    normalized.includes("nadgarst") ||
    normalized.includes("pain");
  const looksLikeHardBlock =
    normalized.includes("nie dam rady") ||
    normalized.includes("za trudne") ||
    normalized.includes("za duzo") ||
    normalized.includes("za ciezko");
  const highFatigue = (fatigueLevel ?? 0) >= 7;
  const lowVitality = vitalityLevel !== null && vitalityLevel !== undefined
    ? vitalityLevel <= 4
    : false;

  return {
    shouldAdjust: looksLikePain || looksLikeHardBlock || highFatigue || lowVitality,
    looksLikePain,
    looksLikeHardBlock,
    highFatigue,
    lowVitality,
    movementKey: inferMovementKey({ title: noteText, part: null }),
  };
}
