# Plan implementacji: Import planów treningowych z JSON

## 1. Przegląd funkcjonalności

### 1.1 Cel
Umożliwienie użytkownikom importowania planów treningowych z plików JSON, gdzie ćwiczenia mogą być określone przez:
- `exercise_id` (UUID) - jeśli ćwiczenie istnieje w bazie użytkownika
- `exercise_title` + `exercise_type` + `exercise_part` - jeśli ćwiczenie nie istnieje w bazie (snapshot)

### 1.2 Zakres
- Import planów treningowych z plików JSON
- Obsługa ćwiczeń istniejących w bazie (przez `exercise_id`)
- Obsługa ćwiczeń nieistniejących w bazie (przez snapshot: `exercise_title`, `exercise_type`, `exercise_part`)
- Plan zostaje utworzony z wszystkimi ćwiczeniami, niezależnie od tego czy istnieją w bazie
- Wizualne oznaczenie ćwiczeń bez `exercise_id` w UI
- Możliwość wykonania treningu z planem zawierającym ćwiczenia bez `exercise_id`

### 1.3 Kluczowe założenia
- Ćwiczenia bez `exercise_id` są przechowywane jako snapshot (podobnie jak w `workout_session_exercises`)
- Plan z ćwiczeniami bez `exercise_id` może być użyty do rozpoczęcia sesji treningowej
- Sesja treningowa będzie miała snapshot ćwiczenia (bez `exercise_id` w `workout_session_exercises`)

## 2. Analiza zmian w bazie danych

### 2.1 Obecna struktura `workout_plan_exercises`

```sql
CREATE TABLE workout_plan_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    section_type exercise_type NOT NULL,
    section_order INTEGER NOT NULL CHECK (section_order > 0),
    planned_sets INTEGER CHECK (planned_sets IS NULL OR planned_sets > 0),
    planned_reps INTEGER CHECK (planned_reps IS NULL OR planned_reps > 0),
    planned_duration_seconds INTEGER CHECK (planned_duration_seconds IS NULL OR planned_duration_seconds > 0),
    planned_rest_seconds INTEGER CHECK (planned_rest_seconds IS NULL OR planned_rest_seconds >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT workout_plan_exercises_unique_order
        UNIQUE (plan_id, section_type, section_order)
);
```

**Problem:** `exercise_id` jest NOT NULL i ma FK constraint, co uniemożliwia przechowywanie ćwiczeń bez istniejącego `exercise_id`.

### 2.2 Wzorzec z `workout_session_exercises`

W sesjach treningowych używamy snapshot pól:
- `exercise_id` (NOT NULL, ale może wskazywać na usunięte ćwiczenie)
- `exercise_title_at_time` (NOT NULL) - snapshot tytułu
- `exercise_type_at_time` (NOT NULL) - snapshot typu
- `exercise_part_at_time` (NOT NULL) - snapshot partii

**Różnica:** W sesjach `exercise_id` jest zawsze wymagane, ale snapshot jest używany do wyświetlania, nawet jeśli ćwiczenie zostało usunięte.

### 2.3 Proponowana struktura `workout_plan_exercises`

```sql
CREATE TABLE workout_plan_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    -- exercise_id może być NULL dla importowanych ćwiczeń bez istniejącego exercise_id
    exercise_id UUID NULL REFERENCES exercises(id) ON DELETE SET NULL,
    -- Snapshot pól dla ćwiczeń bez exercise_id (wymagane jeśli exercise_id IS NULL)
    exercise_title TEXT NULL,
    exercise_type exercise_type NULL,
    exercise_part exercise_part NULL,
    section_type exercise_type NOT NULL,
    section_order INTEGER NOT NULL CHECK (section_order > 0),
    planned_sets INTEGER CHECK (planned_sets IS NULL OR planned_sets > 0),
    planned_reps INTEGER CHECK (planned_reps IS NULL OR planned_reps > 0),
    planned_duration_seconds INTEGER CHECK (planned_duration_seconds IS NULL OR planned_duration_seconds > 0),
    planned_rest_seconds INTEGER CHECK (planned_rest_seconds IS NULL OR planned_rest_seconds >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unikalność kolejności w sekcji
    CONSTRAINT workout_plan_exercises_unique_order
        UNIQUE (plan_id, section_type, section_order),
    
    -- Constraint: jeśli exercise_id IS NULL, to snapshot musi być wypełniony
    CONSTRAINT workout_plan_exercises_snapshot_check CHECK (
        (exercise_id IS NOT NULL) OR 
        (exercise_title IS NOT NULL AND exercise_type IS NOT NULL AND exercise_part IS NOT NULL)
    )
);
```

### 2.4 Wpływ na `workout_session_exercises`

**Obecna struktura:**
- `exercise_id` jest NOT NULL
- Snapshot pól są zawsze wypełnione

**Proponowana zmiana:**
- `exercise_id` może być NULL (dla ćwiczeń z planu bez `exercise_id`)
- Snapshot pól są wymagane (zawsze wypełnione)

**Uzasadnienie:** Pozwala na rozpoczęcie sesji z planu zawierającego ćwiczenia bez `exercise_id`.

## 3. Migracja bazy danych

### 3.1 Migracja dla `workout_plan_exercises`

**Plik:** `supabase/migrations/YYYYMMDDHHMMSS_add_snapshot_to_workout_plan_exercises.sql`

```sql
-- Migracja: Dodanie snapshot pól do workout_plan_exercises
-- Umożliwia przechowywanie ćwiczeń bez istniejącego exercise_id

-- 1. Dodaj kolumny snapshot
ALTER TABLE workout_plan_exercises
  ADD COLUMN exercise_title TEXT NULL,
  ADD COLUMN exercise_type exercise_type NULL,
  ADD COLUMN exercise_part exercise_part NULL;

-- 2. Wypełnij snapshot dla istniejących rekordów (z tabeli exercises)
UPDATE workout_plan_exercises wpe
SET 
  exercise_title = e.title,
  exercise_type = e.type,
  exercise_part = e.part
FROM exercises e
WHERE wpe.exercise_id = e.id;

-- 3. Zmień exercise_id na nullable
ALTER TABLE workout_plan_exercises
  ALTER COLUMN exercise_id DROP NOT NULL;

-- 4. Usuń stary FK constraint
ALTER TABLE workout_plan_exercises
  DROP CONSTRAINT workout_plan_exercises_exercise_id_fkey;

-- 5. Dodaj nowy FK constraint z ON DELETE SET NULL
ALTER TABLE workout_plan_exercises
  ADD CONSTRAINT workout_plan_exercises_exercise_id_fkey
  FOREIGN KEY (exercise_id)
  REFERENCES exercises(id)
  ON DELETE SET NULL;

-- 6. Dodaj constraint wymagający snapshot jeśli exercise_id IS NULL
ALTER TABLE workout_plan_exercises
  ADD CONSTRAINT workout_plan_exercises_snapshot_check CHECK (
    (exercise_id IS NOT NULL) OR 
    (exercise_title IS NOT NULL AND exercise_type IS NOT NULL AND exercise_part IS NOT NULL)
  );

-- 7. Dodaj komentarze
COMMENT ON COLUMN workout_plan_exercises.exercise_id IS 
  'ID ćwiczenia z biblioteki użytkownika. Może być NULL dla importowanych planów z nieistniejącymi ćwiczeniami.';
COMMENT ON COLUMN workout_plan_exercises.exercise_title IS 
  'Tytuł ćwiczenia (snapshot). Wymagany jeśli exercise_id IS NULL.';
COMMENT ON COLUMN workout_plan_exercises.exercise_type IS 
  'Typ ćwiczenia (snapshot). Wymagany jeśli exercise_id IS NULL.';
COMMENT ON COLUMN workout_plan_exercises.exercise_part IS 
  'Partia mięśniowa (snapshot). Wymagany jeśli exercise_id IS NULL.';
```

### 3.2 Migracja dla `workout_session_exercises`

**Plik:** `supabase/migrations/YYYYMMDDHHMMSS_allow_null_exercise_id_in_workout_session_exercises.sql`

```sql
-- Migracja: Pozwolenie na NULL exercise_id w workout_session_exercises
-- Umożliwia rozpoczęcie sesji z planu zawierającego ćwiczenia bez exercise_id

-- 1. Zmień exercise_id na nullable
ALTER TABLE workout_session_exercises
  ALTER COLUMN exercise_id DROP NOT NULL;

-- 2. Usuń stary FK constraint
ALTER TABLE workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_exercise_id_fkey;

-- 3. Dodaj nowy FK constraint z ON DELETE SET NULL
ALTER TABLE workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_exercise_id_fkey
  FOREIGN KEY (exercise_id)
  REFERENCES exercises(id)
  ON DELETE SET NULL;

-- 4. Dodaj constraint wymagający snapshot (zawsze wymagany)
ALTER TABLE workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_snapshot_check CHECK (
    exercise_title_at_time IS NOT NULL AND 
    exercise_type_at_time IS NOT NULL AND 
    exercise_part_at_time IS NOT NULL
  );

-- 5. Dodaj komentarz
COMMENT ON COLUMN workout_session_exercises.exercise_id IS 
  'ID ćwiczenia z biblioteki użytkownika. Może być NULL dla ćwiczeń z planu bez exercise_id.';
```

## 4. Format JSON do importu

### 4.1 Struktura pliku JSON

```json
{
  "name": "Trening nóg z rozgrzewką",
  "description": "Kompleksowy plan treningowy skupiający się na nogach",
  "part": "Legs",
  "exercises": [
    {
      "exercise_id": "ab5fd7bc-0653-4145-817f-39f39e596791",
      "section_type": "Warm-up",
      "section_order": 1,
      "planned_sets": 2,
      "planned_reps": 15,
      "planned_rest_seconds": 10
    },
    {
      "exercise_title": "Przysiady",
      "exercise_type": "Main Workout",
      "exercise_part": "Legs",
      "section_type": "Main Workout",
      "section_order": 1,
      "planned_sets": 4,
      "planned_reps": 10,
      "planned_rest_seconds": 60
    }
  ]
}
```

### 4.2 Walidacja formatu JSON

**Wymagane pola dla planu:**
- `name` (string, max 120 znaków)
- `description` (string | null, opcjonalne)
- `part` (enum: "Legs" | "Core" | "Back" | "Arms" | "Chest" | null)
- `exercises` (array, min 1 element)

**Dla każdego ćwiczenia - opcja A (istniejące ćwiczenie):**
- `exercise_id` (UUID string, wymagane)
- `section_type` (enum: "Warm-up" | "Main Workout" | "Cool-down")
- `section_order` (number > 0, unikalne w ramach sekcji)
- `planned_sets` (number > 0 | null, opcjonalne)
- `planned_reps` (number > 0 | null, opcjonalne)
- `planned_duration_seconds` (number > 0 | null, opcjonalne)
- `planned_rest_seconds` (number >= 0 | null, opcjonalne)
- `planned_rest_after_series_seconds` (number >= 0 | null, opcjonalne)
- `estimated_set_time_seconds` (number > 0 | null, opcjonalne)

**Dla każdego ćwiczenia - opcja B (nowe ćwiczenie przez snapshot):**
- `exercise_title` (string, max 120 znaków, wymagane)
- `exercise_type` (enum: "Warm-up" | "Main Workout" | "Cool-down", wymagane)
- `exercise_part` (enum: "Legs" | "Core" | "Back" | "Arms" | "Chest", wymagane)
- `section_type` (enum: "Warm-up" | "Main Workout" | "Cool-down")
- `section_order` (number > 0, unikalne w ramach sekcji)
- `planned_sets` (number > 0 | null, opcjonalne)
- `planned_reps` (number > 0 | null, opcjonalne)
- `planned_duration_seconds` (number > 0 | null, opcjonalne)
- `planned_rest_seconds` (number >= 0 | null, opcjonalne)
- `planned_rest_after_series_seconds` (number >= 0 | null, opcjonalne)
- `estimated_set_time_seconds` (number > 0 | null, opcjonalne)

**Walidacja biznesowa:**
- Co najmniej jedno ćwiczenie
- Unikalność `section_order` w ramach każdej sekcji (`section_type`)
- Pozytywne wartości dla `planned_*` (jeśli podane)
- Format UUID dla `exercise_id` (jeśli podane)
- Dla opcji A: `exercise_id` jest wymagane
- Dla opcji B: `exercise_title`, `exercise_type`, `exercise_part` są wymagane
- Nie można mieć jednocześnie `exercise_id` i snapshot pól (wzajemnie wykluczające się)

## 5. Implementacja - Backend

### 5.1 Aktualizacja typów TypeScript

**Plik:** `src/db/database.types.ts`

Po migracji, typy będą automatycznie zaktualizowane przez Supabase CLI. Sprawdź czy:
- `workout_plan_exercises.exercise_id` jest `string | null`
- `workout_plan_exercises.exercise_title` jest `string | null`
- `workout_plan_exercises.exercise_type` jest `exercise_type | null`
- `workout_plan_exercises.exercise_part` jest `exercise_part | null`
- `workout_session_exercises.exercise_id` jest `string | null`

**Plik:** `src/types.ts`

```typescript
// Aktualizacja WorkoutPlanExerciseInput
export type WorkoutPlanExerciseInput = Pick<
  TablesInsert<"workout_plan_exercises">,
  | "exercise_id"  // Teraz nullable
  | "section_type"
  | "section_order"
  | "planned_sets"
  | "planned_reps"
  | "planned_duration_seconds"
  | "planned_rest_seconds"
> & {
  planned_rest_after_series_seconds?: number | null;
  estimated_set_time_seconds?: number | null;
  // Snapshot pól dla importu
  exercise_title?: string | null;
  exercise_type?: ExerciseType | null;
  exercise_part?: ExercisePart | null;
};

// Aktualizacja WorkoutPlanExerciseDTO
export type WorkoutPlanExerciseDTO = Omit<
  WorkoutPlanExerciseEntity,
  "plan_id" | "created_at"
> & {
  exercise_title?: string | null;  // Z snapshot lub z exercises
  exercise_type?: ExerciseType | null;
  exercise_part?: ExercisePart | null;
  exercise_estimated_set_time_seconds?: number | null;
  exercise_rest_after_series_seconds?: number | null;
  planned_rest_after_series_seconds?: number | null;
  // Flaga wskazująca czy ćwiczenie istnieje w bazie
  is_exercise_in_library?: boolean;
};
```

### 5.2 Nowy schema walidacji dla importu

**Plik:** `src/lib/validation/workout-plans.ts`

```typescript
/**
 * Schema dla ćwiczenia w planie przy imporcie (obsługuje exercise_id lub snapshot).
 */
export const workoutPlanExerciseImportSchema = z
  .object({
    // Opcja A: istniejące ćwiczenie przez exercise_id
    exercise_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID"
      )
      .optional()
      .nullable(),
    // Opcja B: nowe ćwiczenie przez snapshot
    exercise_title: z.string().trim().min(1).max(120).optional().nullable(),
    exercise_type: sectionTypeSchema.optional().nullable(),
    exercise_part: z.enum(exercisePartValues).optional().nullable(),
    // Wspólne pola
    section_type: sectionTypeSchema,
    section_order: sectionOrderSchema,
    planned_sets: plannedSetsSchema,
    planned_reps: plannedRepsSchema,
    planned_duration_seconds: plannedDurationSchema,
    planned_rest_seconds: plannedRestSchema,
    planned_rest_after_series_seconds: plannedRestAfterSeriesSchema,
    estimated_set_time_seconds: estimatedSetTimeSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasExerciseId = data.exercise_id !== undefined && data.exercise_id !== null;
    const hasSnapshot = 
      data.exercise_title !== undefined && data.exercise_title !== null &&
      data.exercise_type !== undefined && data.exercise_type !== null &&
      data.exercise_part !== undefined && data.exercise_part !== null;

    // Musi być albo exercise_id, albo snapshot
    if (!hasExerciseId && !hasSnapshot) {
      ctx.addIssue({
        code: "custom",
        message: "Musisz podać albo exercise_id, albo exercise_title + exercise_type + exercise_part",
        path: ["exercise_id"],
      });
    }

    // Nie można mieć jednocześnie exercise_id i snapshot
    if (hasExerciseId && hasSnapshot) {
      ctx.addIssue({
        code: "custom",
        message: "Nie można podać jednocześnie exercise_id i snapshot pól (exercise_title, exercise_type, exercise_part)",
        path: ["exercise_id"],
      });
    }
  });

/**
 * Schema dla importu planu treningowego z JSON.
 */
export const workoutPlanImportSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    part: partSchema,
    exercises: z
      .array(workoutPlanExerciseImportSchema)
      .min(1, "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Walidacja reguł biznesowych (unikalność pozycji, wartości dodatnie)
    const exercisesForBusinessRules: WorkoutPlanExerciseInput[] = data.exercises.map((e) => ({
      exercise_id: e.exercise_id ?? undefined,
      section_type: e.section_type,
      section_order: e.section_order,
      planned_sets: e.planned_sets,
      planned_reps: e.planned_reps,
      planned_duration_seconds: e.planned_duration_seconds,
      planned_rest_seconds: e.planned_rest_seconds,
      planned_rest_after_series_seconds: e.planned_rest_after_series_seconds,
      estimated_set_time_seconds: e.estimated_set_time_seconds,
    }));

    const errors = validateWorkoutPlanBusinessRules(exercisesForBusinessRules);
    errors.forEach((message) =>
      ctx.addIssue({
        code: "custom",
        message,
      })
    );
  });
```

### 5.3 Aktualizacja repository

**Plik:** `src/repositories/workout-plans.ts`

```typescript
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
  }));

  const { data, error } = await client
    .from("workout_plan_exercises")
    .insert(exercisesToInsert)
    .select();

  return { data, error };
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

    // Użyj snapshot jeśli exercise_id jest NULL, w przeciwnym razie użyj danych z exercises
    const exerciseTitle = row.exercise_id
      ? (exercise?.title ?? null)
      : (row.exercise_title ?? null);
    const exerciseType = row.exercise_id
      ? (exercise?.type ?? null)
      : (row.exercise_type ?? null);
    const exercisePart = row.exercise_id
      ? (exercise?.part ?? null)
      : (row.exercise_part ?? null);

    return {
      id: row.id,
      exercise_id: row.exercise_id,
      section_type: row.section_type,
      section_order: row.section_order,
      planned_sets: row.planned_sets,
      planned_reps: row.planned_reps,
      planned_duration_seconds: row.planned_duration_seconds,
      planned_rest_seconds: row.planned_rest_seconds,
      exercise_title: exerciseTitle,
      exercise_type: exerciseType,
      exercise_part: exercisePart,
      exercise_estimated_set_time_seconds: exercise?.estimated_set_time_seconds ?? null,
      exercise_rest_after_series_seconds: exercise?.rest_after_series_seconds ?? null,
      is_exercise_in_library: row.exercise_id !== null,
    };
  });

  return { data: exercises, error: null };
}
```

### 5.4 Nowy service dla importu

**Plik:** `src/services/workout-plans.ts`

```typescript
/**
 * Importuje plan treningowy z JSON.
 * Obsługuje ćwiczenia istniejące w bazie (przez exercise_id) oraz nowe (przez snapshot).
 */
export async function importWorkoutPlanService(
  userId: string,
  payload: unknown
): Promise<WorkoutPlanDTO & { warnings?: { missing_exercises?: string[] } }> {
  assertUser(userId);
  const parsed = parseOrThrow(workoutPlanImportSchema, payload);

  // Walidacja domenowa
  const domainErrors = validateWorkoutPlanBusinessRules(
    parsed.exercises.map((e) => ({
      exercise_id: e.exercise_id ?? undefined,
      section_type: e.section_type,
      section_order: e.section_order,
      planned_sets: e.planned_sets,
      planned_reps: e.planned_reps,
      planned_duration_seconds: e.planned_duration_seconds,
      planned_rest_seconds: e.planned_rest_seconds,
      planned_rest_after_series_seconds: e.planned_rest_after_series_seconds,
      estimated_set_time_seconds: e.estimated_set_time_seconds,
    }))
  );

  if (domainErrors.length) {
    throw new ServiceError("BAD_REQUEST", domainErrors.join(" "));
  }

  const supabase = await createClient();

  // Dla ćwiczeń z exercise_id - sprawdź czy istnieją i należą do użytkownika
  const exerciseIds = parsed.exercises
    .filter((e) => e.exercise_id)
    .map((e) => e.exercise_id!);
  
  const missingExercises: string[] = [];
  
  if (exerciseIds.length > 0) {
    const { data: ownedExercises, error: exercisesError } =
      await findExercisesByIds(supabase, userId, exerciseIds);

    if (exercisesError) {
      throw mapDbError(exercisesError);
    }

    // Znajdź brakujące ćwiczenia
    const foundIds = new Set((ownedExercises ?? []).map((e) => e.id));
    for (const exerciseId of exerciseIds) {
      if (!foundIds.has(exerciseId)) {
        missingExercises.push(exerciseId);
      }
    }

    // Jeśli wszystkie ćwiczenia z exercise_id są brakujące, użyj snapshot
    // (to nie powinno się zdarzyć, ale obsługujemy to)
    for (const exercise of parsed.exercises) {
      if (exercise.exercise_id && missingExercises.includes(exercise.exercise_id)) {
        // Ustaw exercise_id na null i użyj snapshot (jeśli nie został podany, użyj placeholder)
        exercise.exercise_id = null;
        if (!exercise.exercise_title) {
          exercise.exercise_title = `Ćwiczenie (ID: ${exercise.exercise_id})`;
          exercise.exercise_type = exercise.section_type; // Fallback
          exercise.exercise_part = parsed.part ?? "Legs"; // Fallback
        }
      }
    }
  }

  // Utwórz plan
  const { data: plan, error: planError } = await insertWorkoutPlan(
    supabase,
    userId,
    {
      name: parsed.name,
      description: parsed.description,
      part: parsed.part,
    }
  );

  if (planError) {
    throw mapDbError(planError);
  }

  if (!plan) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się utworzyć planu treningowego."
    );
  }

  // Wstaw ćwiczenia (z exercise_id lub snapshot)
  const { error: exercisesInsertError } = await insertWorkoutPlanExercises(
    supabase,
    plan.id,
    parsed.exercises.map((e) => ({
      exercise_id: e.exercise_id ?? null,
      exercise_title: e.exercise_title ?? null,
      exercise_type: e.exercise_type ?? null,
      exercise_part: e.exercise_part ?? null,
      section_type: e.section_type,
      section_order: e.section_order,
      planned_sets: e.planned_sets,
      planned_reps: e.planned_reps,
      planned_duration_seconds: e.planned_duration_seconds,
      planned_rest_seconds: e.planned_rest_seconds,
      planned_rest_after_series_seconds: e.planned_rest_after_series_seconds,
      estimated_set_time_seconds: e.estimated_set_time_seconds,
    }))
  );

  if (exercisesInsertError) {
    await supabase.from("workout_plans").delete().eq("id", plan.id);
    throw mapDbError(exercisesInsertError);
  }

  // Pobierz utworzony plan z ćwiczeniami
  const { data: planWithExercises, error: fetchError } =
    await listWorkoutPlanExercises(supabase, plan.id);

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  // Oblicz i zaktualizuj szacunkowy całkowity czas treningu
  const estimatedTotalTime = calculateEstimatedTotalTime(planWithExercises ?? []);
  const { error: updateTimeError } = await updateWorkoutPlan(
    supabase,
    userId,
    plan.id,
    { estimated_total_time_seconds: estimatedTotalTime }
  );

  if (updateTimeError) {
    console.error("[importWorkoutPlanService] Failed to update estimated_total_time_seconds:", updateTimeError);
  }

  // Pobierz zaktualizowany plan
  const { data: updatedPlan, error: fetchUpdatedError } = await findWorkoutPlanById(
    supabase,
    userId,
    plan.id
  );

  if (fetchUpdatedError) {
    throw mapDbError(fetchUpdatedError);
  }

  return {
    ...(updatedPlan ?? plan),
    exercises: planWithExercises ?? [],
    warnings: missingExercises.length > 0 ? { missing_exercises: missingExercises } : undefined,
  };
}
```

### 5.5 Nowy endpoint API

**Plik:** `src/app/api/workout-plans/import/route.ts`

```typescript
import { NextResponse } from "next/server";
import { importWorkoutPlanService } from "@/services/workout-plans";
import { getUserIdFromSession } from "@/lib/auth";
import { ServiceError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();
    
    const result = await importWorkoutPlanService(userId, body);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.code === "BAD_REQUEST" ? 400 : error.code === "NOT_FOUND" ? 404 : 500 }
      );
    }
    
    console.error("[POST /api/workout-plans/import]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Wystąpił błąd podczas importu planu." } },
      { status: 500 }
    );
  }
}
```

### 5.6 Aktualizacja logiki sesji treningowych

**Plik:** `src/services/workout-sessions.ts`

```typescript
/**
 * Aktualizacja funkcji createSessionSnapshots - obsługa ćwiczeń bez exercise_id
 */
function createSessionSnapshots(
  planExercises: Array<{
    exercise_id: string | null;
    exercise_title: string | null;
    exercise_type: Database["public"]["Enums"]["exercise_type"] | null;
    exercise_part: Database["public"]["Enums"]["exercise_part"] | null;
    section_type: Database["public"]["Enums"]["exercise_type"];
    section_order: number;
    planned_sets: number | null;
    planned_reps: number | null;
    planned_duration_seconds: number | null;
    planned_rest_seconds: number | null;
    planned_rest_after_series_seconds?: number | null;
  }>,
  exercisesMap: Map<string, { /* ... */ }>
): Array<{
  exercise_id: string | null;
  exercise_title_at_time: string;
  exercise_type_at_time: Database["public"]["Enums"]["exercise_type"];
  exercise_part_at_time: Database["public"]["Enums"]["exercise_part"];
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  planned_rest_after_series_seconds: number | null;
  exercise_order: number;
}> {
  // Sortuj ćwiczenia według sekcji i kolejności
  const sortedExercises = [...planExercises].sort((a, b) => {
    const sectionOrder = { "Warm-up": 1, "Main Workout": 2, "Cool-down": 3 };
    const aOrder = sectionOrder[a.section_type] ?? 999;
    const bOrder = sectionOrder[b.section_type] ?? 999;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    return a.section_order - b.section_order;
  });

  const snapshots = sortedExercises.map((planExercise, index) => {
    // Jeśli ćwiczenie ma exercise_id, pobierz dane z mapy
    // W przeciwnym razie użyj snapshot z planu
    let exerciseTitle: string;
    let exerciseType: Database["public"]["Enums"]["exercise_type"];
    let exercisePart: Database["public"]["Enums"]["exercise_part"];
    let exerciseId: string | null = planExercise.exercise_id;
    
    if (planExercise.exercise_id) {
      const exercise = exercisesMap.get(planExercise.exercise_id);
      if (!exercise) {
        // Fallback do snapshot z planu
        exerciseTitle = planExercise.exercise_title ?? "Nieznane ćwiczenie";
        exerciseType = planExercise.exercise_type ?? planExercise.section_type;
        exercisePart = planExercise.exercise_part ?? "Legs";
        exerciseId = null;
      } else {
        exerciseTitle = exercise.title;
        exerciseType = exercise.type;
        exercisePart = exercise.part;
      }
    } else {
      // Użyj snapshot z planu
      exerciseTitle = planExercise.exercise_title ?? "Nieznane ćwiczenie";
      exerciseType = planExercise.exercise_type ?? planExercise.section_type;
      exercisePart = planExercise.exercise_part ?? "Legs";
      exerciseId = null;
    }

    // Użyj planned_* z planu, jeśli dostępne
    const plannedSets = planExercise.planned_sets ?? null;
    const plannedReps = planExercise.planned_reps ?? null;
    const plannedDuration = planExercise.planned_duration_seconds ?? null;
    const plannedRest = planExercise.planned_rest_seconds ?? null;
    const plannedRestAfterSeries = planExercise.planned_rest_after_series_seconds ?? null;

    return {
      exercise_id: exerciseId,
      exercise_title_at_time: exerciseTitle,
      exercise_type_at_time: exerciseType,
      exercise_part_at_time: exercisePart,
      planned_sets: plannedSets,
      planned_reps: plannedReps,
      planned_duration_seconds: plannedDuration,
      planned_rest_seconds: plannedRest,
      planned_rest_after_series_seconds: plannedRestAfterSeries,
      exercise_order: index + 1,
    };
  });

  return snapshots;
}
```

## 6. Implementacja - Frontend

### 6.1 Przycisk importu

**Plik:** `src/components/workout-plans/import-plan-button.tsx`

```typescript
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ImportPlanButton() {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Plik musi być w formacie JSON");
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const response = await fetch("/api/workout-plans/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message ?? "Błąd podczas importu");
      }

      // Pokaż ostrzeżenia jeśli są
      if (result.warnings?.missing_exercises?.length > 0) {
        toast.warning(
          `Plan zaimportowany. ${result.warnings.missing_exercises.length} ćwiczeń nie zostało znalezionych w bazie.`
        );
      } else {
        toast.success("Plan został zaimportowany pomyślnie");
      }

      // Przekieruj do szczegółów planu
      router.push(`/workout-plans/${result.data.id}`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error ? error.message : "Wystąpił błąd podczas importu"
      );
    } finally {
      setIsImporting(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isImporting}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        variant="outline"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isImporting ? "Importowanie..." : "Importuj plan"}
      </Button>
    </>
  );
}
```

### 6.2 Oznaczenie ćwiczeń bez exercise_id

**Plik:** `src/components/workout-plans/workout-plan-exercise-item.tsx`

```typescript
// Dodaj wizualne oznaczenie dla ćwiczeń bez exercise_id
{!exercise.is_exercise_in_library && (
  <Badge variant="outline" className="ml-2">
    <AlertCircle className="mr-1 h-3 w-3" />
    Nie w bibliotece
  </Badge>
)}
```

### 6.3 Aktualizacja listy planów

**Plik:** `src/components/workout-plans/workout-plan-card.tsx`

```typescript
// Sprawdź czy plan zawiera ćwiczenia bez exercise_id
const hasMissingExercises = plan.exercises?.some(
  (e) => !e.is_exercise_in_library
);

{hasMissingExercises && (
  <Badge variant="warning" className="mt-2">
    <AlertCircle className="mr-1 h-3 w-3" />
    Zawiera ćwiczenia spoza biblioteki
  </Badge>
)}
```

## 7. Testy

### 7.1 Testy jednostkowe

**Plik:** `src/__tests__/lib/validation/workout-plans-import.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { workoutPlanImportSchema } from "@/lib/validation/workout-plans";

describe("workoutPlanImportSchema", () => {
  it("powinien zaakceptować plan z exercise_id", () => {
    const valid = {
      name: "Test Plan",
      exercises: [
        {
          exercise_id: "123e4567-e89b-12d3-a456-426614174000",
          section_type: "Main Workout",
          section_order: 1,
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien zaakceptować plan z snapshot", () => {
    const valid = {
      name: "Test Plan",
      exercises: [
        {
          exercise_title: "Przysiady",
          exercise_type: "Main Workout",
          exercise_part: "Legs",
          section_type: "Main Workout",
          section_order: 1,
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(valid)).not.toThrow();
  });

  it("powinien odrzucić plan bez exercise_id i snapshot", () => {
    const invalid = {
      name: "Test Plan",
      exercises: [
        {
          section_type: "Main Workout",
          section_order: 1,
        },
      ],
    };
    expect(() => workoutPlanImportSchema.parse(invalid)).toThrow();
  });
});
```

### 7.2 Testy integracyjne

**Plik:** `src/__tests__/services/workout-plans-import.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { importWorkoutPlanService } from "@/services/workout-plans";

describe("importWorkoutPlanService", () => {
  it("powinien utworzyć plan z ćwiczeniami przez exercise_id", async () => {
    // Test implementation
  });

  it("powinien utworzyć plan z ćwiczeniami przez snapshot", async () => {
    // Test implementation
  });

  it("powinien utworzyć plan z mieszanką exercise_id i snapshot", async () => {
    // Test implementation
  });
});
```

### 7.3 Testy end-to-end

**Plik:** `e2e/workout-plans/import-workout-plan.spec.ts`

```typescript
import { test, expect } from "@playwright/test";
import { WorkoutPlansPage } from "../pages/workout-plans-page";

test.describe("Import workout plan", () => {
  test("powinien zaimportować plan z JSON", async ({ page }) => {
    // Test implementation
  });

  test("powinien pokazać ostrzeżenie dla brakujących ćwiczeń", async ({ page }) => {
    // Test implementation
  });

  test("powinien umożliwić rozpoczęcie sesji z planu z snapshot", async ({ page }) => {
    // Test implementation
  });
});
```

## 8. Dokumentacja

### 8.1 Przykładowy plik JSON

**Plik:** `docs/examples/workout-plan-import-example.json`

```json
{
  "name": "Trening nóg z rozgrzewką i rozciąganiem",
  "description": "Kompleksowy plan treningowy skupiający się na nogach",
  "part": "Legs",
  "exercises": [
    {
      "exercise_id": "ab5fd7bc-0653-4145-817f-39f39e596791",
      "section_type": "Warm-up",
      "section_order": 1,
      "planned_sets": 2,
      "planned_reps": 15,
      "planned_rest_seconds": 10
    },
    {
      "exercise_title": "Przysiady",
      "exercise_type": "Main Workout",
      "exercise_part": "Legs",
      "section_type": "Main Workout",
      "section_order": 1,
      "planned_sets": 4,
      "planned_reps": 10,
      "planned_rest_seconds": 60
    },
    {
      "exercise_title": "Rozciąganie nóg",
      "exercise_type": "Cool-down",
      "exercise_part": "Legs",
      "section_type": "Cool-down",
      "section_order": 1,
      "planned_sets": 3,
      "planned_duration_seconds": 30,
      "planned_rest_seconds": 20
    }
  ]
}
```

## 9. Checklist implementacji

### 9.1 Baza danych
- [x] Migracja: Dodanie snapshot pól do `workout_plan_exercises` ✅
- [x] Migracja: Zmiana `exercise_id` na nullable w `workout_plan_exercises` ✅
- [x] Migracja: Dodanie constraint dla snapshot ✅
- [x] Migracja: Zmiana `exercise_id` na nullable w `workout_session_exercises` ✅
- [ ] Aktualizacja typów TypeScript (Supabase CLI) - **Wymaga uruchomienia migracji**

### 9.2 Backend
- [x] Aktualizacja typów w `src/types.ts` ✅
- [x] Nowy schema: `workoutPlanExerciseImportSchema` ✅
- [x] Nowy schema: `workoutPlanImportSchema` ✅
- [x] Aktualizacja `insertWorkoutPlanExercises` - obsługa snapshot ✅
- [x] Aktualizacja `listWorkoutPlanExercises` - zwracanie snapshot ✅
- [x] Nowy service: `importWorkoutPlanService` ✅
- [ ] Nowy endpoint: `POST /api/workout-plans/import` 🔄
- [x] Aktualizacja `createSessionSnapshots` - obsługa ćwiczeń bez `exercise_id` ✅

### 9.3 Frontend
- [ ] Komponent: `ImportPlanButton` 🔄
- [ ] Aktualizacja listy planów - przycisk importu 🔄
- [ ] Oznaczenie ćwiczeń bez `exercise_id` w szczegółach planu 🔄
- [ ] Oznaczenie planów z brakującymi ćwiczeniami w liście 🔄
- [ ] Obsługa ostrzeżeń z API 🔄

### 9.4 Testy
- [x] Testy jednostkowe: walidacja schematu importu ✅ (7 testów)
- [ ] Testy jednostkowe: service importu 🔄
- [ ] Testy integracyjne: endpoint importu 🔄
- [ ] Testy E2E: pełny flow importu 🔄
- [ ] Testy E2E: rozpoczęcie sesji z planu z snapshot 🔄

### 9.5 Dokumentacja
- [ ] Przykładowy plik JSON 🔄
- [ ] Instrukcja importu dla użytkowników 🔄
- [ ] Opis formatu JSON 🔄

**Legenda:**
- ✅ Zrobione
- 🔄 Do zrobienia
- ⚠️ Wymaga dodatkowych kroków

## 10. Estymacja czasu

- **Migracja bazy danych:** 2-3 godziny
- **Backend (typy, schematy, service, endpoint):** 6-8 godzin
- **Aktualizacja logiki sesji:** 2-3 godziny
- **Frontend (komponenty, UI):** 4-5 godzin
- **Testy:** 4-5 godzin
- **Dokumentacja:** 1-2 godziny

**Razem:** 19-26 godzin (2.5-3.5 dni robocze)

## 11. Uwagi i rozważenia

### 11.1 Personal Records
Ćwiczenia bez `exercise_id` nie będą mogły generować personal records, ponieważ PR wymagają `exercise_id`. To jest akceptowalne - użytkownik może później dodać ćwiczenie do biblioteki i powiązać je z planem.

### 11.2 Eksport planów
W przyszłości można dodać eksport planów do JSON, który będzie uwzględniał zarówno `exercise_id` (jeśli dostępne), jak i snapshot pól.

### 11.3 Mapowanie nazw
W przyszłości można dodać funkcję automatycznego mapowania nazw ćwiczeń z importu na istniejące ćwiczenia w bazie (fuzzy matching).

### 11.4 Import z Excel
Po implementacji importu JSON, można rozważyć dodanie importu z Excel/CSV, który będzie konwertowany na format JSON przed importem.

## 12. Status implementacji

### ✅ Zrealizowane kroki (1-6)

#### Krok 1-3: Migracje bazy danych i typy
- ✅ **Migracja dla `workout_plan_exercises`** (`20260126154730_add_snapshot_to_workout_plan_exercises.sql`)
  - Dodano kolumny snapshot: `exercise_title`, `exercise_type`, `exercise_part`
  - Zmieniono `exercise_id` na nullable
  - Zaktualizowano FK constraint na `ON DELETE SET NULL`
  - Dodano constraint wymagający snapshot gdy `exercise_id IS NULL`
  - Wypełniono snapshot dla istniejących rekordów

- ✅ **Migracja dla `workout_session_exercises`** (`20260126154731_allow_null_exercise_id_in_workout_session_exercises.sql`)
  - Zmieniono `exercise_id` na nullable
  - Zaktualizowano FK constraint na `ON DELETE SET NULL`
  - Dodano constraint wymagający snapshot (zawsze wymagany)

- ✅ **Aktualizacja typów TypeScript** (`src/types.ts`)
  - `WorkoutPlanExerciseInput` - dodano opcjonalne pola snapshot
  - `WorkoutPlanExerciseDTO` - dodano flagę `is_exercise_in_library`

#### Krok 4: Aktualizacja repository
- ✅ **`insertWorkoutPlanExercises`** - obsługa snapshot pól przy wstawianiu
- ✅ **`listWorkoutPlanExercises`** - zwraca snapshot i flagę `is_exercise_in_library`
- ✅ **`mapExerciseToDTO`** - zaktualizowana logika wyboru między snapshot a danymi z `exercises`

#### Krok 5: Nowy schema walidacji
- ✅ **`workoutPlanExerciseImportSchema`** - walidacja ćwiczenia z `exercise_id` lub snapshot
- ✅ **`workoutPlanImportSchema`** - walidacja całego planu do importu z walidacją biznesową

#### Krok 6: Service importu
- ✅ **`importWorkoutPlanService`** - logika importu z JSON:
  - Walidacja danych wejściowych
  - Sprawdzenie istnienia ćwiczeń z `exercise_id` w bazie użytkownika
  - Obsługa ćwiczeń bez `exercise_id` (użycie snapshot)
  - Tworzenie planu z ćwiczeniami
  - Zwracanie ostrzeżeń dla brakujących ćwiczeń

#### Dodatkowo: Aktualizacja logiki sesji treningowych
- ✅ **`createSessionSnapshots`** - zaktualizowana do obsługi nullable `exercise_id` i snapshot
- ✅ **`insertWorkoutSessionExercises`** - zaktualizowana do obsługi nullable `exercise_id`
- ✅ **`callSaveWorkoutSessionExercise`** - zaktualizowana do obsługi nullable `exercise_id`

#### Testy
- ✅ **Testy jednostkowe** - 7 testów dla walidacji importu (wszystkie przechodzą)
- ✅ **TypeScript** - wszystkie błędy naprawione, kompilacja przechodzi
- ✅ **Build** - kompilacja produkcyjna przechodzi

### 🔄 Do zrobienia (7-9)

#### Krok 7: Endpoint API
**Plik:** `src/app/api/workout-plans/import/route.ts`

- [ ] Utworzenie endpointu `POST /api/workout-plans/import`
- [ ] Obsługa błędów i zwracanie odpowiedzi z ostrzeżeniami
- [ ] Integracja z `importWorkoutPlanService`

#### Krok 8: Weryfikacja logiki sesji (opcjonalne)
**Plik:** `src/services/workout-sessions.ts`

- [ ] Testy rozpoczęcia sesji z planu zawierającego ćwiczenia bez `exercise_id`
- [ ] Weryfikacja poprawności snapshotów w sesji

#### Krok 9: Komponenty frontendowe

**9.1 Przycisk importu**
- [ ] `src/components/workout-plans/import-plan-button.tsx`
  - Wybór pliku JSON
  - Wysyłanie do API
  - Obsługa błędów i ostrzeżeń
  - Przekierowanie po sukcesie

**9.2 Oznaczenie ćwiczeń bez exercise_id**
- [ ] `src/components/workout-plans/workout-plan-exercise-item.tsx`
  - Badge "Nie w bibliotece" dla ćwiczeń bez `exercise_id`

**9.3 Aktualizacja listy planów**
- [ ] `src/components/workout-plans/workout-plan-card.tsx`
  - Badge dla planów z ćwiczeniami spoza biblioteki

**9.4 Dodanie przycisku importu do listy planów**
- [ ] `src/app/workout-plans/page.tsx` lub odpowiedni komponent
  - Dodanie przycisku importu do UI

### 📋 Checklist przed użyciem

- [ ] Uruchomienie migracji na zdalnej bazie (`supabase db push --linked`)
- [ ] Regeneracja typów TypeScript (`supabase gen types typescript --linked > src/db/database.types.ts`)
- [ ] Weryfikacja kompilacji TypeScript (`pnpm type-check`)
- [ ] Test build (`pnpm build`)

### 🎯 Proponowana kolejność realizacji

1. **Krok 7: Endpoint API** - najprostszy, umożliwia testowanie przez API
2. **Krok 9: Komponenty frontendowe** - pełna funkcjonalność dla użytkownika
3. **Krok 8: Weryfikacja logiki sesji** - testy i ewentualne poprawki
