import { ZodError } from "zod";

import { createClient } from "@/db/supabase.server";
import type { Database } from "@/db/database.types";
import type { ExerciseDTO, ExerciseQueryParams } from "@/types";
import {
  exerciseCreateSchema,
  exerciseQuerySchema,
  exerciseUpdateSchema,
  normalizeTitle,
  validateExerciseBusinessRules,
} from "@/lib/validation/exercises";
import {
  deleteExercise,
  findById,
  findByNormalizedTitle,
  insertExercise,
  listExercises,
  mapToDTO,
  updateExercise,
} from "@/repositories/exercises";
import type { PostgrestError } from "@supabase/supabase-js";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

export type ServiceErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INTERNAL";

export class ServiceError extends Error {
  code: ServiceErrorCode;
  details?: string;

  constructor(code: ServiceErrorCode, message: string, details?: string) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function createExerciseService(
  userId: string,
  payload: unknown
): Promise<ExerciseDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(exerciseCreateSchema, payload);
  const domainErrors = validateExerciseBusinessRules(parsed);

  if (domainErrors.length) {
    throw new ServiceError("BAD_REQUEST", domainErrors.join(" "));
  }

  const supabase = await createClient();
  const titleNormalized = normalizeTitle(parsed.title);

  const { data: existing, error: existingError } = await findByNormalizedTitle(
    supabase,
    userId,
    titleNormalized
  );

  if (existingError) {
    throw mapDbError(existingError);
  }

  if (existing) {
    throw new ServiceError(
      "CONFLICT",
      "Ćwiczenie o podanym tytule już istnieje."
    );
  }

  const { data, error } = await insertExercise(supabase, userId, {
    ...parsed,
    title_normalized: titleNormalized,
  });

  if (error) {
    throw mapDbError(error);
  }

  if (!data) {
    throw new ServiceError("INTERNAL", "Nie udało się utworzyć ćwiczenia.");
  }

  return data;
}

export async function listExercisesService(
  userId: string,
  query: ExerciseQueryParams
): Promise<{ items: ExerciseDTO[]; nextCursor: string | null }> {
  assertUser(userId);
  const parsed = parseOrThrow(exerciseQuerySchema, query);

  const supabase = await createClient();

  try {
    const { data, nextCursor, error } = await listExercises(
      supabase,
      userId,
      parsed
    );

    if (error) {
      throw mapDbError(error);
    }

    return {
      items: data ?? [],
      nextCursor: nextCursor ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CURSOR") {
      throw new ServiceError("BAD_REQUEST", "Nieprawidłowy kursor paginacji.");
    }

    throw error;
  }
}

export async function getExerciseService(
  userId: string,
  id: string
): Promise<ExerciseDTO> {
  assertUser(userId);
  const supabase = await createClient();
  const { data, error } = await findById(supabase, userId, id);

  if (error) {
    throw mapDbError(error);
  }

  if (!data) {
    throw new ServiceError("NOT_FOUND", "Ćwiczenie nie zostało znalezione.");
  }

  return mapToDTO(data);
}

export async function updateExerciseService(
  userId: string,
  id: string,
  payload: unknown
): Promise<ExerciseDTO> {
  assertUser(userId);
  const patch = parseOrThrow(exerciseUpdateSchema, payload);
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await findById(
    supabase,
    userId,
    id
  );

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Ćwiczenie nie zostało znalezione.");
  }

  const merged = mergeExercise(existing, patch);
  const domainErrors = validateExerciseBusinessRules(merged);

  if (domainErrors.length) {
    throw new ServiceError("BAD_REQUEST", domainErrors.join(" "));
  }

  const titleNormalized = normalizeTitle(merged.title);

  if (titleNormalized !== existing.title_normalized) {
    const { data: duplicate, error: duplicateError } = await findByNormalizedTitle(
      supabase,
      userId,
      titleNormalized,
      id
    );

    if (duplicateError) {
      throw mapDbError(duplicateError);
    }

    if (duplicate) {
      throw new ServiceError(
        "CONFLICT",
        "Ćwiczenie o podanym tytule już istnieje."
      );
    }
  }

  const { data, error } = await updateExercise(supabase, userId, id, {
    ...patch,
    title_normalized: titleNormalized,
  });

  if (error) {
    throw mapDbError(error);
  }

  if (!data) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się zaktualizować ćwiczenia."
    );
  }

  return data;
}

export async function deleteExerciseService(userId: string, id: string) {
  assertUser(userId);
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await findById(
    supabase,
    userId,
    id
  );

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Ćwiczenie nie zostało znalezione.");
  }

  const { error } = await deleteExercise(supabase, userId, id);

  if (error) {
    throw mapDbError(error);
  }
}

function mergeExercise(
  existing: ExerciseRow,
  patch: ReturnType<typeof exerciseUpdateSchema.parse>
) {
  return {
    title: pickValue(patch, "title", existing.title),
    type: pickValue(patch, "type", existing.type),
    part: pickValue(patch, "part", existing.part),
    level: pickValue(patch, "level", existing.level),
    details: pickValue(patch, "details", existing.details),
    reps: pickValue(patch, "reps", existing.reps),
    duration_seconds: pickValue(
      patch,
      "duration_seconds",
      existing.duration_seconds
    ),
    series: pickValue(patch, "series", existing.series),
    rest_in_between_seconds: pickValue(
      patch,
      "rest_in_between_seconds",
      existing.rest_in_between_seconds
    ),
    rest_after_series_seconds: pickValue(
      patch,
      "rest_after_series_seconds",
      existing.rest_after_series_seconds
    ),
  };
}

function pickValue<T extends object, K extends keyof T, V>(
  obj: T,
  key: K,
  fallback: V
): T[K] | V {
  if (!Object.hasOwn(obj, key)) {
    return fallback;
  }

  const value = obj[key];

  if (value === undefined) {
    return fallback;
  }

  return value;
}

function parseOrThrow<T>(schema: { parse: (payload: unknown) => T }, payload: unknown): T {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ServiceError(
        "BAD_REQUEST",
        error.issues.map((issue) => issue.message).join("; ")
      );
    }

    throw error;
  }
}

function mapDbError(error: PostgrestError) {
  if (error.code === "23505") {
    return new ServiceError(
      "CONFLICT",
      "Ćwiczenie o podanym tytule już istnieje.",
      error.message
    );
  }

  if (error.code === "23503") {
    return new ServiceError(
      "CONFLICT",
      "Operacja narusza istniejące powiązania.",
      error.message
    );
  }

  if (error.code === "BAD_REQUEST") {
    return new ServiceError("BAD_REQUEST", error.message, error.details ?? "");
  }

  return new ServiceError("INTERNAL", "Wystąpił błąd serwera.", error.message);
}

function assertUser(userId: string) {
  if (!userId) {
    throw new ServiceError("UNAUTHORIZED", "Brak aktywnej sesji.");
  }
}
