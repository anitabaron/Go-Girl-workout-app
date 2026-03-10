import { createClient } from "@/db/supabase.server";
import {
  assertUser,
  mapDbError,
  parseOrThrow,
  ServiceError,
} from "@/lib/service-utils";
import { aiCoachProfilePatchSchema } from "@/lib/validation/ai-coach-profile";
import {
  findCoachProfileByUserId,
  insertCoachProfile,
  updateCoachProfileByUserId,
} from "@/repositories/ai-coach-profiles";
import type { AICoachProfileDTO } from "@/types";

export { ServiceError } from "@/lib/service-utils";

export async function getOrCreateAICoachProfileService(
  userId: string,
): Promise<AICoachProfileDTO> {
  assertUser(userId);
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await findCoachProfileByUserId(
    supabase,
    userId,
  );
  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (existing) return existing;

  const { data: created, error: createError } = await insertCoachProfile(
    supabase,
    userId,
  );
  if (createError) {
    throw mapDbError(createError);
  }
  if (!created) {
    throw new ServiceError("INTERNAL", "Nie udało się utworzyć profilu AI.");
  }

  return created;
}

export async function patchAICoachProfileService(
  userId: string,
  payload: unknown,
): Promise<AICoachProfileDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(aiCoachProfilePatchSchema, payload);
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await findCoachProfileByUserId(
    supabase,
    userId,
  );
  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (!existing) {
    const { data: created, error: createError } = await insertCoachProfile(
      supabase,
      userId,
      parsed,
    );
    if (createError) throw mapDbError(createError);
    if (!created) {
      throw new ServiceError("INTERNAL", "Nie udało się utworzyć profilu AI.");
    }
    return created;
  }

  const { data: updated, error: updateError } = await updateCoachProfileByUserId(
    supabase,
    userId,
    parsed,
  );
  if (updateError) {
    throw mapDbError(updateError);
  }
  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Profil AI nie został znaleziony.");
  }

  return updated;
}
