import { createClient } from "@/db/supabase.server";
import type { Database } from "@/db/database.types";
import type { ExerciseDTO, ExerciseQueryParams } from "@/types";
import {
  exerciseCreateSchema,
  exerciseQuerySchema,
  exerciseUpdateSchema,
  normalizeTitleForDbLookup,
  validateExerciseBusinessRules,
} from "@/lib/validation/exercises";
import {
  buildDefaultExercisePrescriptionConfig,
  type ExercisePrescriptionConfig,
} from "@/lib/training/exercise-prescription";
import {
  assertUser,
  mapDbError as mapDbErrorBase,
  parseOrThrow,
  ServiceError,
} from "@/lib/service-utils";
import {
  deleteExercise,
  findById,
  findByNormalizedTitle,
  findExerciseByNormalizedTitle,
  insertExercise,
  listExerciseTitles,
  listExercises,
  mapToDTO,
  updateExercise,
} from "@/repositories/exercises";

export { ServiceError } from "@/lib/service-utils";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

const MAP_DB_ERROR_OVERRIDES = {
  "23505": {
    code: "CONFLICT" as const,
    message: "Ćwiczenie o podanym tytule już istnieje.",
  },
  "23503": {
    code: "CONFLICT" as const,
    message: "Operacja narusza istniejące powiązania.",
  },
};

function mapDbError(error: Parameters<typeof mapDbErrorBase>[0]) {
  return mapDbErrorBase(error, MAP_DB_ERROR_OVERRIDES);
}

export async function createExerciseService(
  userId: string,
  payload: unknown,
): Promise<ExerciseDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(exerciseCreateSchema, payload);
  const normalizedPayload = withNormalizedPrescriptionConfig(parsed);
  const domainErrors = validateExerciseBusinessRules(parsed);

  if (domainErrors.length) {
    throw new ServiceError("BAD_REQUEST", domainErrors.join(" "));
  }

  const supabase = await createClient();
  const titleNormalized = normalizeTitleForDbLookup(normalizedPayload.title);

  const { data: existing, error: existingError } = await findByNormalizedTitle(
    supabase,
    userId,
    titleNormalized,
  );

  if (existingError) {
    throw mapDbError(existingError);
  }

  if (existing) {
    throw new ServiceError(
      "CONFLICT",
      "Ćwiczenie o podanym tytule już istnieje.",
    );
  }

  const { data, error } = await insertExercise(supabase, userId, normalizedPayload);

  if (error) {
    throw mapDbError(error);
  }

  if (!data) {
    throw new ServiceError("INTERNAL", "Nie udało się utworzyć ćwiczenia.");
  }

  return data;
}

export type ExerciseTitleDTO = { id: string; title: string };

export async function listExerciseTitlesService(
  userId: string,
  limit = 50,
): Promise<ExerciseTitleDTO[]> {
  assertUser(userId);
  const supabase = await createClient();
  const { data, error } = await listExerciseTitles(supabase, userId, limit);

  if (error) {
    throw mapDbError(error);
  }

  return data;
}

export async function listExercisesService(
  userId: string,
  query: ExerciseQueryParams,
): Promise<{ items: ExerciseDTO[]; nextCursor: string | null }> {
  assertUser(userId);
  const parsed = parseOrThrow(exerciseQuerySchema, query);

  const supabase = await createClient();

  try {
    const { data, nextCursor, error } = await listExercises(
      supabase,
      userId,
      parsed,
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
  id: string,
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

export async function getExerciseByTitleService(
  userId: string,
  title: string,
): Promise<ExerciseDTO | null> {
  assertUser(userId);
  const supabase = await createClient();
  const titleNormalized = normalizeTitleForDbLookup(title);
  const { data, error } = await findExerciseByNormalizedTitle(
    supabase,
    userId,
    titleNormalized,
  );

  if (error) {
    throw mapDbError(error);
  }

  return data;
}

export async function updateExerciseService(
  userId: string,
  id: string,
  payload: unknown,
): Promise<ExerciseDTO> {
  assertUser(userId);
  const patch = parseOrThrow(exerciseUpdateSchema, payload);
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await findById(
    supabase,
    userId,
    id,
  );

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Ćwiczenie nie zostało znalezione.");
  }

  const merged = mergeExercise(existing, patch);
  const normalizedPatch = withResolvedUpdatedPrescriptionConfig(existing, patch, merged);
  const domainErrors = validateExerciseBusinessRules(merged);

  if (domainErrors.length) {
    throw new ServiceError("BAD_REQUEST", domainErrors.join(" "));
  }

  if (!merged.title) {
    throw new Error("Title is required");
  }
  const titleNormalized = normalizeTitleForDbLookup(merged.title);

  if (titleNormalized !== existing.title_normalized) {
    const { data: duplicate, error: duplicateError } =
      await findByNormalizedTitle(supabase, userId, titleNormalized, id);

    if (duplicateError) {
      throw mapDbError(duplicateError);
    }

    if (duplicate) {
      throw new ServiceError(
        "CONFLICT",
        "Ćwiczenie o podanym tytule już istnieje.",
      );
    }
  }

  const { data, error } = await updateExercise(supabase, userId, id, normalizedPatch);

  if (error) {
    throw mapDbError(error);
  }

  if (!data) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się zaktualizować ćwiczenia.",
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
    id,
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
  patch: ReturnType<typeof exerciseUpdateSchema.parse>,
) : {
  title: string;
  types: ExerciseRow["types"];
  parts: ExerciseRow["parts"];
  level: string | null;
  details: string | null;
  reps: number | null;
  duration_seconds: number | null;
  series: number;
  rest_in_between_seconds: number | null;
  rest_after_series_seconds: number | null;
  prescription_config: ExercisePrescriptionConfig;
} {
  const title = pickValue(patch, "title", existing.title) as string;
  const reps = pickValue(patch, "reps", existing.reps) as number | null;
  const durationSeconds = pickValue(
    patch,
    "duration_seconds",
    existing.duration_seconds,
  ) as number | null;
  const series = pickValue(patch, "series", existing.series) as number;
  const restInBetweenSeconds = pickValue(
    patch,
    "rest_in_between_seconds",
    existing.rest_in_between_seconds,
  ) as number | null;

  return {
    title,
    types: pickValue(patch, "types", existing.types ?? []) as ExerciseRow["types"],
    parts: pickValue(patch, "parts", existing.parts ?? []) as ExerciseRow["parts"],
    level: pickValue(patch, "level", existing.level) as string | null,
    details: pickValue(patch, "details", existing.details) as string | null,
    reps,
    duration_seconds: durationSeconds,
    series,
    rest_in_between_seconds: restInBetweenSeconds,
    rest_after_series_seconds: pickValue(
      patch,
      "rest_after_series_seconds",
      existing.rest_after_series_seconds,
    ) as number | null,
    prescription_config: resolvePrescriptionConfigPatch(
      existing,
      patch,
      {
        title,
        reps,
        duration_seconds: durationSeconds,
        series,
        rest_in_between_seconds: restInBetweenSeconds,
      },
    ),
  };
}

function withNormalizedPrescriptionConfig(
  payload: ReturnType<typeof exerciseCreateSchema.parse>,
) {
  return {
    ...payload,
    prescription_config:
      payload.prescription_config ??
      buildDefaultExercisePrescriptionConfig(payload),
  };
}

function withResolvedUpdatedPrescriptionConfig(
  existing: ExerciseRow,
  patch: ReturnType<typeof exerciseUpdateSchema.parse>,
  merged: ReturnType<typeof mergeExercise>,
) {
  return {
    ...patch,
    prescription_config: resolvePrescriptionConfigPatch(existing, patch, merged),
  };
}

function resolvePrescriptionConfigPatch(
  existing: Pick<
    ExerciseRow,
    | "title"
    | "reps"
    | "duration_seconds"
    | "series"
    | "rest_in_between_seconds"
    | "prescription_config"
  >,
  patch: { prescription_config?: ExercisePrescriptionConfig | null },
  merged: {
    title: string;
    reps: number | null;
    duration_seconds: number | null;
    series: number;
    rest_in_between_seconds: number | null;
  },
): ExercisePrescriptionConfig {
  if (Object.hasOwn(patch, "prescription_config")) {
    return (
      patch.prescription_config ??
      buildDefaultExercisePrescriptionConfig(merged)
    );
  }

  return (
    (existing.prescription_config as ExercisePrescriptionConfig | null) ??
    buildDefaultExercisePrescriptionConfig(existing)
  );
}

function pickValue<T extends object, K extends keyof T, V>(
  obj: T,
  key: K,
  fallback: V,
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
