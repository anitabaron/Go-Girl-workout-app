import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
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

const planSelectColumns = "id,name,description,part,created_at,updated_at";

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
  data?: Omit<WorkoutPlanDTO, "exercises">[];
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

  return {
    data: items.map(mapToDTO),
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
  input: Pick<WorkoutPlanCreateCommand, "name" | "description" | "part">
) {
  const { data, error } = await client
    .from("workout_plans")
    .insert({
      name: input.name,
      description: input.description ?? null,
      part: input.part ?? null,
      user_id: userId,
    })
    .select(planSelectColumns)
    .single();

  return { data: data ? mapToDTO(data) : null, error };
}

/**
 * Wstawia ćwiczenia do planu treningowego (batch insert).
 */
export async function insertWorkoutPlanExercises(
  client: DbClient,
  planId: string,
  exercises: WorkoutPlanExerciseInput[]
) {
  const   exercisesToInsert = exercises.map((exercise) => ({
    plan_id: planId,
    exercise_id: exercise.exercise_id,
    section_type: exercise.section_type,
    section_order: exercise.section_order,
    planned_sets: exercise.planned_sets ?? null,
    planned_reps: exercise.planned_reps ?? null,
    planned_duration_seconds: exercise.planned_duration_seconds ?? null,
    planned_rest_seconds: exercise.planned_rest_seconds ?? null,
  }));

  const { data, error } = await client
    .from("workout_plan_exercises")
    .insert(exercisesToInsert)
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
  input: Partial<Pick<WorkoutPlanCreateCommand, "name" | "description" | "part">>
) {
  const updateData: {
    name?: string;
    description?: string | null;
    part?: "Legs" | "Core" | "Back" | "Arms" | "Chest" | null;
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
    exercise_id?: string;
    section_type?: Database["public"]["Enums"]["exercise_type"];
    section_order?: number;
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
  }
) {
  const updateData: Database["public"]["Tables"]["workout_plan_exercises"]["Update"] = {};

  if (input.exercise_id !== undefined) {
    updateData.exercise_id = input.exercise_id;
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
 * Pobiera wszystkie ćwiczenia planu treningowego posortowane po section_type i section_order.
 */
export async function listWorkoutPlanExercises(
  client: DbClient,
  planId: string
) {
  const { data, error } = await client
    .from("workout_plan_exercises")
    .select("*, exercises(title)")
    .eq("plan_id", planId)
    .order("section_type", { ascending: true })
    .order("section_order", { ascending: true });

  if (error) {
    return { data: null, error };
  }

  return {
    data: data ? data.map(mapExerciseToDTO) : [],
    error: null,
  };
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
 */
export function mapExerciseToDTO(
  row: WorkoutPlanExerciseRow & {
    exercises?: { title: string } | null;
  }
): WorkoutPlanExerciseDTO {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { plan_id, created_at, exercises, ...rest } = row;
  return {
    ...rest,
    exercise_title: exercises?.title ?? null,
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
