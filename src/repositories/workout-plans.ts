import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
  ExercisePart,
  ExerciseType,
  PlanQueryParams,
  WorkoutPlanCreateCommand,
  WorkoutPlanDTO,
  WorkoutPlanExerciseDTO,
  WorkoutPlanExerciseInput,
} from "@/types";
import {
  WORKOUT_PLAN_DEFAULT_LIMIT,
  WORKOUT_PLAN_MAX_LIMIT,
  decodeCursor,
  encodeCursor,
  workoutPlanOrderValues,
  workoutPlanSortFields,
} from "@/lib/validation/workout-plans";

type DbClient = SupabaseClient<Database>;
type WorkoutPlanRow = Database["public"]["Tables"]["workout_plans"]["Row"];
type WorkoutPlanExerciseRow =
  Database["public"]["Tables"]["workout_plan_exercises"]["Row"];
type SortField = (typeof workoutPlanSortFields)[number];
type SortOrder = (typeof workoutPlanOrderValues)[number];

const planSelectColumns = "id,name,description,part,estimated_total_time_seconds,created_at,updated_at";

type CursorPayload = {
  sort: SortField;
  order: SortOrder;
  value: string | number;
  id: string;
};

/**
 * Pobiera plan treningowy po ID i user_id.
 */
export async function findWorkoutPlanById(
  client: DbClient,
  userId: string,
  id: string
) {
  const { data, error } = await client
    .from("workout_plans")
    .select(planSelectColumns)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  return { data, error };
}

/**
 * Pobiera listę planów treningowych użytkownika z filtrami, sortowaniem i paginacją.
 */
export async function findWorkoutPlansByUserId(
  client: DbClient,
  userId: string,
  params: Required<Pick<PlanQueryParams, "sort" | "order" | "limit">> &
    PlanQueryParams
): Promise<{
  data?: (Omit<WorkoutPlanDTO, "exercises"> & { exercise_count?: number; exercise_names?: string[] })[];
  nextCursor?: string | null;
  error?: PostgrestError | null;
}> {
  const limit = Math.min(
    params.limit ?? WORKOUT_PLAN_DEFAULT_LIMIT,
    WORKOUT_PLAN_MAX_LIMIT
  );
  const sort = params.sort ?? "created_at";
  const order = params.order ?? "desc";

  let query = client
    .from("workout_plans")
    .select(planSelectColumns)
    .eq("user_id", userId);

  if (params.part) {
    query = query.eq("part", params.part);
  }

  if (params.cursor) {
    const cursor = decodeCursor(params.cursor);

    if (cursor.sort !== sort || cursor.order !== order) {
      return {
        error: {
          message: "Cursor nie pasuje do aktualnych parametrów sortowania.",
          details: "sort/order mismatch",
          code: "BAD_REQUEST",
          hint: "Użyj kursora z tymi samymi parametrami sort/order.",
        } as unknown as PostgrestError,
      };
    }

    query = applyCursorFilter(query, sort, order, cursor);
  }

  query = query
    .order(sort, { ascending: order === "asc" })
    .order("id", { ascending: order === "asc" })
    .limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    return { error };
  }

  const items = data ?? [];
  let nextCursor: string | null = null;

  if (items.length > limit) {
    const tail = items.pop()!;

    // sort może być tylko "created_at" lub "name" (z workoutPlanSortFields)
    const sortValue = sort === "created_at" 
      ? tail.created_at 
      : sort === "name" 
        ? tail.name 
        : tail.created_at; // fallback
    nextCursor = encodeCursor({
      sort,
      order,
      value: sortValue,
      id: tail.id,
    });
  }

  // Pobierz liczbę ćwiczeń i nazwy ćwiczeń dla wszystkich planów
  const planIds = items.map((item) => item.id);
  const exerciseCounts: Record<string, number> = {};
  const exercisesByPlanId = new Map<string, string[]>();
  
  if (planIds.length > 0) {
    const { data: exercisesData, error: exercisesError } = await client
      .from("workout_plan_exercises")
      .select("plan_id, exercises(title)")
      .in("plan_id", planIds)
      .order("section_type", { ascending: true })
      .order("section_order", { ascending: true });

    if (!exercisesError && exercisesData) {
      for (const row of exercisesData) {
        const planId = row.plan_id;
        const exerciseTitle = (row.exercises as { title: string } | null)?.title;
        
        // Policz ćwiczenia
        exerciseCounts[planId] = (exerciseCounts[planId] ?? 0) + 1;
        
        // Zbierz nazwy ćwiczeń
        if (exerciseTitle) {
          if (!exercisesByPlanId.has(planId)) {
            exercisesByPlanId.set(planId, []);
          }
          exercisesByPlanId.get(planId)!.push(exerciseTitle);
        }
      }
    }
  }

  return {
    data: items.map((item) => ({
      ...mapToDTO(item),
      exercise_count: exerciseCounts[item.id] ?? 0,
      exercise_names: exercisesByPlanId.get(item.id) ?? [],
    })),
    nextCursor,
    error: null,
  };
}

/**
 * Wstawia nowy plan treningowy (bez ćwiczeń).
 */
export async function insertWorkoutPlan(
  client: DbClient,
  userId: string,
  input: Pick<WorkoutPlanCreateCommand, "name" | "description" | "part"> & {
    estimated_total_time_seconds?: number | null;
  }
) {
  const { data, error } = await client
    .from("workout_plans")
    .insert({
      name: input.name,
      description: input.description ?? null,
      part: input.part ?? null,
      estimated_total_time_seconds: input.estimated_total_time_seconds ?? null,
      user_id: userId,
    })
    .select(planSelectColumns)
    .single();

  return { data: data ? mapToDTO(data) : null, error };
}

/**
 * Wstawia ćwiczenia do planu treningowego (batch insert) - obsługuje snapshot.
 */
export async function insertWorkoutPlanExercises(
  client: DbClient,
  planId: string,
  exercises: Array<WorkoutPlanExerciseInput & {
    exercise_title?: string | null;
    exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
    exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
  }>
) {
  const exercisesToInsert = exercises.map((exercise) => ({
    plan_id: planId,
    exercise_id: exercise.exercise_id ?? null,
    exercise_title: exercise.exercise_title ?? null,
    exercise_type: exercise.exercise_type ?? null,
    exercise_part: exercise.exercise_part ?? null,
    section_type: exercise.section_type,
    section_order: exercise.section_order,
    planned_sets: exercise.planned_sets ?? null,
    planned_reps: exercise.planned_reps ?? null,
    planned_duration_seconds: exercise.planned_duration_seconds ?? null,
    planned_rest_seconds: exercise.planned_rest_seconds ?? null,
    ...(exercise.planned_rest_after_series_seconds !== undefined && {
      planned_rest_after_series_seconds: exercise.planned_rest_after_series_seconds,
    }),
    ...(exercise.estimated_set_time_seconds !== undefined && {
      estimated_set_time_seconds: exercise.estimated_set_time_seconds,
    }),
  }));

  // Type assertion - pola snapshot są w bazie, ale jeszcze nie w typach TypeScript
  const { data, error } = await client
    .from("workout_plan_exercises")
    .insert(exercisesToInsert as unknown as Database["public"]["Tables"]["workout_plan_exercises"]["Insert"][])
    .select();

  return { data, error };
}

/**
 * Aktualizuje metadane planu treningowego.
 */
export async function updateWorkoutPlan(
  client: DbClient,
  userId: string,
  id: string,
  input: Partial<Pick<WorkoutPlanCreateCommand, "name" | "description" | "part"> & {
    estimated_total_time_seconds?: number | null;
  }>
) {
  const updateData: {
    name?: string;
    description?: string | null;
    part?: "Legs" | "Core" | "Back" | "Arms" | "Chest" | null;
    estimated_total_time_seconds?: number | null;
  } = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.part !== undefined) {
    updateData.part = input.part;
  }

  if (input.estimated_total_time_seconds !== undefined) {
    updateData.estimated_total_time_seconds = input.estimated_total_time_seconds;
  }

  if (Object.keys(updateData).length === 0) {
    // Brak zmian do wykonania
    const { data } = await findWorkoutPlanById(client, userId, id);
    return { data: data ? mapToDTO(data) : null, error: null };
  }

  const { data, error } = await client
    .from("workout_plans")
    .update(updateData)
    .eq("user_id", userId)
    .eq("id", id)
    .select(planSelectColumns)
    .single();

  return { data: data ? mapToDTO(data) : null, error };
}

/**
 * Aktualizuje pojedyncze ćwiczenie w planie treningowym.
 */
export async function updateWorkoutPlanExercise(
  client: DbClient,
  planId: string,
  exerciseId: string,
  input: {
    exercise_id?: string | null;
    exercise_title?: string | null;
    exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
    exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
    section_type?: Database["public"]["Enums"]["exercise_type"];
    section_order?: number;
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
    planned_rest_after_series_seconds?: number | null;
    estimated_set_time_seconds?: number | null;
  }
) {
  const updateData: Database["public"]["Tables"]["workout_plan_exercises"]["Update"] & {
    planned_rest_after_series_seconds?: number | null;
    estimated_set_time_seconds?: number | null;
    exercise_title?: string | null;
    exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
    exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
  } = {};

  if (input.exercise_id !== undefined) {
    updateData.exercise_id = input.exercise_id ?? null;
  }
  if (input.exercise_title !== undefined) {
    updateData.exercise_title = input.exercise_title ?? null;
  }
  if (input.exercise_type !== undefined) {
    updateData.exercise_type = input.exercise_type ?? null;
  }
  if (input.exercise_part !== undefined) {
    updateData.exercise_part = input.exercise_part ?? null;
  }
  if (input.section_type !== undefined) {
    updateData.section_type = input.section_type;
  }
  if (input.section_order !== undefined) {
    updateData.section_order = input.section_order;
  }
  if (input.planned_sets !== undefined) {
    updateData.planned_sets = input.planned_sets;
  }
  if (input.planned_reps !== undefined) {
    updateData.planned_reps = input.planned_reps;
  }
  if (input.planned_duration_seconds !== undefined) {
    updateData.planned_duration_seconds = input.planned_duration_seconds;
  }
  if (input.planned_rest_seconds !== undefined) {
    updateData.planned_rest_seconds = input.planned_rest_seconds;
  }
  if (input.planned_rest_after_series_seconds !== undefined) {
    updateData.planned_rest_after_series_seconds = input.planned_rest_after_series_seconds;
  }
  if (input.estimated_set_time_seconds !== undefined) {
    updateData.estimated_set_time_seconds = input.estimated_set_time_seconds;
  }

  if (Object.keys(updateData).length === 0) {
    // Brak zmian do wykonania
    return { data: null, error: null };
  }

  const { data, error } = await client
    .from("workout_plan_exercises")
    .update(updateData)
    .eq("plan_id", planId)
    .eq("id", exerciseId)
    .select()
    .single();

  return { data, error };
}

/**
 * Usuwa wszystkie ćwiczenia z planu treningowego.
 */
export async function deleteWorkoutPlanExercises(client: DbClient, planId: string) {
  const { error } = await client
    .from("workout_plan_exercises")
    .delete()
    .eq("plan_id", planId);

  return { error };
}

/**
 * Pobiera ćwiczenia planu treningowego z informacją o snapshot.
 */
export async function listWorkoutPlanExercises(
  client: DbClient,
  planId: string
): Promise<{
  data?: WorkoutPlanExerciseDTO[];
  error?: PostgrestError | null;
}> {
  const { data, error } = await client
    .from("workout_plan_exercises")
    .select(`
      *,
      exercises (
        id,
        title,
        type,
        part,
        estimated_set_time_seconds,
        rest_after_series_seconds
      )
    `)
    .eq("plan_id", planId)
    .order("section_type", { ascending: true })
    .order("section_order", { ascending: true });

  if (error) {
    return { error };
  }

  const exercises = (data ?? []).map((row) => {
    const exercise = row.exercises as {
      id: string;
      title: string;
      type: Database["public"]["Enums"]["exercise_type"];
      part: Database["public"]["Enums"]["exercise_part"];
      estimated_set_time_seconds: number | null;
      rest_after_series_seconds: number | null;
    } | null;

    // Type assertion dla pól snapshot (dodanych w migracji, ale jeszcze nie w typach)
    const rowWithSnapshot = row as WorkoutPlanExerciseRow & {
      exercise_title?: string | null;
      exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
      exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
      estimated_set_time_seconds?: number | null;
      planned_rest_after_series_seconds?: number | null;
    };

    // Użyj snapshot jeśli exercise_id jest NULL, w przeciwnym razie użyj danych z exercises
    const exerciseTitle = row.exercise_id
      ? (exercise?.title ?? null)
      : (rowWithSnapshot.exercise_title ?? null);
    const exerciseType = row.exercise_id
      ? (exercise?.type ?? null)
      : (rowWithSnapshot.exercise_type ?? null);
    const exercisePart = row.exercise_id
      ? (exercise?.part ?? null)
      : (rowWithSnapshot.exercise_part ?? null);

    // Use override value from workout_plan_exercises if available, otherwise fall back to exercise default
    const finalEstimatedSetTime = rowWithSnapshot.estimated_set_time_seconds !== undefined 
      ? rowWithSnapshot.estimated_set_time_seconds 
      : exercise?.estimated_set_time_seconds ?? null;
    
    const finalRestAfterSeries = rowWithSnapshot.planned_rest_after_series_seconds !== undefined
      ? rowWithSnapshot.planned_rest_after_series_seconds
      : exercise?.rest_after_series_seconds ?? null;

    return {
      id: row.id,
      exercise_id: row.exercise_id,
      section_type: row.section_type,
      section_order: row.section_order,
      planned_sets: row.planned_sets,
      planned_reps: row.planned_reps,
      planned_duration_seconds: row.planned_duration_seconds,
      planned_rest_seconds: row.planned_rest_seconds,
      estimated_set_time_seconds: finalEstimatedSetTime, // Pole z workout_plan_exercises
      exercise_title: exerciseTitle,
      exercise_type: exerciseType,
      exercise_part: exercisePart,
      exercise_estimated_set_time_seconds: finalEstimatedSetTime,
      exercise_rest_after_series_seconds: exercise?.rest_after_series_seconds ?? null,
      planned_rest_after_series_seconds: finalRestAfterSeries,
      is_exercise_in_library: row.exercise_id !== null,
    };
  });

  return { data: exercises, error: null };
}

/**
 * Batch weryfikacja własności ćwiczeń - sprawdza czy wszystkie exercise_id należą do użytkownika.
 */
export async function findExercisesByIds(
  client: DbClient,
  userId: string,
  exerciseIds: string[]
) {
  if (exerciseIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await client
    .from("exercises")
    .select("id")
    .eq("user_id", userId)
    .in("id", exerciseIds);

  return { data, error };
}

/**
 * Mapuje wiersz z bazy danych na DTO planu (bez ćwiczeń).
 */
type WorkoutPlanSelectResult = Omit<WorkoutPlanRow, "user_id">;

export function mapToDTO(row: WorkoutPlanRow | WorkoutPlanSelectResult): Omit<WorkoutPlanDTO, "exercises"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, ...rest } = row as WorkoutPlanRow;
  return rest;
}

/**
 * Mapuje wiersz z bazy danych na DTO ćwiczenia w planie.
 * @deprecated Używaj bezpośrednio listWorkoutPlanExercises, która zwraca już poprawnie zmapowane DTO.
 */
export function mapExerciseToDTO(
  row: WorkoutPlanExerciseRow & {
    exercises?: { title: string; type?: string; part?: string; estimated_set_time_seconds?: number | null; rest_after_series_seconds?: number | null } | null;
    estimated_set_time_seconds?: number | null; // Override value from workout_plan_exercises
    planned_rest_after_series_seconds?: number | null; // Override value from workout_plan_exercises
  }
): WorkoutPlanExerciseDTO {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { plan_id, created_at, exercises, estimated_set_time_seconds, planned_rest_after_series_seconds, ...rest } = row;
  
  // Type assertion dla pól snapshot (dodanych w migracji, ale jeszcze nie w typach)
  const rowWithSnapshot = row as WorkoutPlanExerciseRow & {
    exercise_title?: string | null;
    exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
    exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
    estimated_set_time_seconds?: number | null;
    planned_rest_after_series_seconds?: number | null;
  };
  
  // Use override value from workout_plan_exercises if available, otherwise fall back to exercise default
  const finalEstimatedSetTime = estimated_set_time_seconds !== undefined 
    ? estimated_set_time_seconds 
    : exercises?.estimated_set_time_seconds ?? null;
  
  const finalRestAfterSeries = planned_rest_after_series_seconds !== undefined
    ? planned_rest_after_series_seconds
    : exercises?.rest_after_series_seconds ?? null;
  
  // Użyj snapshot jeśli exercise_id jest NULL, w przeciwnym razie użyj danych z exercises
  const exerciseTitle = rest.exercise_id
    ? (exercises?.title ?? null)
    : (rowWithSnapshot.exercise_title ?? null);
  const exerciseType = rest.exercise_id
    ? ((exercises?.type as ExerciseType | undefined) ?? null)
    : (rowWithSnapshot.exercise_type ?? null);
  const exercisePart = rest.exercise_id
    ? ((exercises?.part as ExercisePart | undefined) ?? null)
    : (rowWithSnapshot.exercise_part ?? null);
  
  return {
    ...rest,
    estimated_set_time_seconds: finalEstimatedSetTime, // Pole z workout_plan_exercises
    exercise_title: exerciseTitle,
    exercise_type: exerciseType,
    exercise_part: exercisePart,
    exercise_estimated_set_time_seconds: finalEstimatedSetTime,
    exercise_rest_after_series_seconds: exercises?.rest_after_series_seconds ?? null,
    planned_rest_after_series_seconds: finalRestAfterSeries,
    is_exercise_in_library: rest.exercise_id !== null,
  };
}

/**
 * Zastosowuje filtr kursora do zapytania.
 */
function applyCursorFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort: SortField,
  order: SortOrder,
  cursor: CursorPayload
) {
  const direction = order === "asc" ? "gt" : "lt";
  const encodedValue = encodeURIComponent(String(cursor.value));
  const encodedId = encodeURIComponent(cursor.id);

  return query.or(
    `${sort}.${direction}.${encodedValue},and(${sort}.eq.${encodedValue},id.${direction}.${encodedId})`
  );
}
