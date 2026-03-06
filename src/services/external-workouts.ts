import { createClient } from "@/db/supabase.server";
import type { Json } from "@/db/database.types";
import type {
  ExternalWorkoutCreateCommand,
  ExternalWorkoutDTO,
  ExternalWorkoutListQueryParams,
} from "@/types";
import {
  externalWorkoutCreateSchema,
  externalWorkoutListQuerySchema,
} from "@/lib/validation/external-workouts";
import {
  assertUser,
  mapDbError,
  parseOrThrow,
  ServiceError,
} from "@/lib/service-utils";
import {
  deleteExternalWorkoutById,
  insertExternalWorkout,
  listExternalWorkoutSportTypesByUserId,
  listExternalWorkoutsByUserId,
  updateExternalWorkoutById,
} from "@/repositories/external-workouts";

export { ServiceError } from "@/lib/service-utils";

export async function createExternalWorkoutService(
  userId: string,
  payload: unknown,
): Promise<ExternalWorkoutDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(externalWorkoutCreateSchema, payload);
  const supabase = await createClient();

  const { data, error } = await insertExternalWorkout(supabase, userId, {
    started_at: parsed.started_at,
    sport_type: parsed.sport_type,
    duration_minutes: parsed.duration_minutes,
    calories: parsed.calories ?? null,
    hr_avg: parsed.hr_avg ?? null,
    hr_max: parsed.hr_max ?? null,
    intensity_rpe: parsed.intensity_rpe ?? null,
    notes: parsed.notes ?? null,
    source: parsed.source,
    external_id: parsed.external_id ?? null,
    raw_payload: (parsed.raw_payload ?? null) as Json | null,
  });

  if (error) {
    throw mapDbError(error);
  }

  if (!data) {
    throw new ServiceError("INTERNAL", "Nie udało się zapisać treningu.");
  }

  return data;
}

export async function listExternalWorkoutsService(
  userId: string,
  query: ExternalWorkoutListQueryParams,
): Promise<{
  items: ExternalWorkoutDTO[];
}> {
  assertUser(userId);
  const parsed = parseOrThrow(externalWorkoutListQuerySchema, query);
  const supabase = await createClient();

  const { data, error } = await listExternalWorkoutsByUserId(supabase, userId, {
    from: parsed.from,
    to: parsed.to,
    limit: parsed.limit,
  });

  if (error) {
    throw mapDbError(error);
  }

  return { items: data };
}

export async function listExternalWorkoutSportTypesService(
  userId: string,
): Promise<{ items: string[] }> {
  assertUser(userId);
  const supabase = await createClient();

  const { data, error } = await listExternalWorkoutSportTypesByUserId(
    supabase,
    userId,
  );

  if (error) {
    throw mapDbError(error);
  }

  return { items: data };
}

export async function updateExternalWorkoutService(
  userId: string,
  workoutId: string,
  payload: unknown,
): Promise<ExternalWorkoutDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(externalWorkoutCreateSchema, payload);
  const supabase = await createClient();

  const { data, error } = await updateExternalWorkoutById(
    supabase,
    userId,
    workoutId,
    {
      started_at: parsed.started_at,
      sport_type: parsed.sport_type,
      duration_minutes: parsed.duration_minutes,
      calories: parsed.calories ?? null,
      hr_avg: parsed.hr_avg ?? null,
      hr_max: parsed.hr_max ?? null,
      intensity_rpe: parsed.intensity_rpe ?? null,
      notes: parsed.notes ?? null,
      source: parsed.source,
      external_id: parsed.external_id ?? null,
      raw_payload: (parsed.raw_payload ?? null) as Json | null,
    },
  );

  if (error) {
    throw mapDbError(error);
  }

  if (!data) {
    throw new ServiceError("NOT_FOUND", "Nie znaleziono treningu spoza aplikacji.");
  }

  return data;
}

export async function deleteExternalWorkoutService(
  userId: string,
  workoutId: string,
): Promise<void> {
  assertUser(userId);
  const supabase = await createClient();

  const { error, deleted } = await deleteExternalWorkoutById(
    supabase,
    userId,
    workoutId,
  );

  if (error) {
    throw mapDbError(error);
  }

  if (!deleted) {
    throw new ServiceError("NOT_FOUND", "Nie znaleziono treningu spoza aplikacji.");
  }
}

export type ExternalWorkoutCreateInput = ExternalWorkoutCreateCommand;
