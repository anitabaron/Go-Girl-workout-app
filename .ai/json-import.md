# Wytyczne do implementacji importu treningów z JSON

## 1. Przegląd funkcjonalności

### 1.1 Cel
Umożliwienie użytkownikom importowania planów treningowych z plików JSON bez wymagania, aby wszystkie ćwiczenia już istniały w bazie danych użytkownika.

### 1.2 Zakres
- Import planów treningowych z plików JSON
- **NIE** walidujemy czy ćwiczenia istnieją w bazie
- **NIE** dodajemy ćwiczeń do bazy przez import
- Plan zostaje utworzony, nawet jeśli zawiera ćwiczenia, które nie istnieją
- Użytkownik może później ręcznie dodać brakujące ćwiczenia

## 2. Analiza zależności i ograniczeń

### 2.1 Obecne ograniczenia w bazie danych

#### Foreign Key Constraint
```sql
-- workout_plan_exercises.exercise_id
exercise_id uuid not null references exercises(id) on delete restrict
```

**Problem:** FK constraint wymaga, aby `exercise_id` istniało w tabeli `exercises`. Próba wstawienia planu z nieistniejącym `exercise_id` spowoduje błąd FK violation na poziomie bazy danych.

**Rozwiązanie:** 
- **Opcja A (Zalecana):** Zmienić FK constraint na `ON DELETE SET NULL` i pozwolić na `NULL` w `exercise_id` dla importowanych planów
- **Opcja B:** Stworzyć "placeholder" ćwiczenia dla każdego nieistniejącego `exercise_id` podczas importu (wymaga dodatkowej logiki)
- **Opcja C:** Zaakceptować, że import wymaga istnienia ćwiczeń (odrzucone przez użytkownika)

### 2.2 Obecna walidacja w service layer

**Plik:** `src/services/workout-plans.ts` (linie 81-95)

```typescript
// Batch weryfikacja własności ćwiczeń
const exerciseIds = parsed.exercises.map((e) => e.exercise_id);
const { data: ownedExercises, error: exercisesError } =
  await findExercisesByIds(supabase, userId, exerciseIds);

if (!ownedExercises || ownedExercises.length !== exerciseIds.length) {
  throw new ServiceError(
    "NOT_FOUND",
    "Niektóre ćwiczenia nie istnieją lub nie należą do użytkownika."
  );
}
```

**Wymagana zmiana:** Utworzyć osobny service/endpoint dla importu, który pomija tę walidację.

### 2.3 Wpływ na inne funkcjonalności

#### 2.3.1 Rozpoczęcie sesji treningowej (`startWorkoutSessionService`)

**Plik:** `src/services/workout-sessions.ts` (linie 123-131)

```typescript
// Pobierz szczegóły ćwiczeń (pełne dane dla snapshotów)
const exerciseIds = planExercises.map((e) => e.exercise_id);
const { data: exercises, error: exercisesError } =
  await findExercisesByIdsForSnapshots(supabase, userId, exerciseIds);

if (!exercises || exercises.length !== exerciseIds.length) {
  throw new ServiceError(
    "BAD_REQUEST",
    "Niektóre ćwiczenia w planie nie istnieją lub nie należą do użytkownika."
  );
}
```

**Wpływ:** Nie będzie można rozpocząć sesji z planu, który zawiera nieistniejące ćwiczenia.

**Rozwiązanie:** 
- Wyświetlić komunikat użytkownikowi: "Nie można rozpocząć sesji. Plan zawiera ćwiczenia, które nie istnieją w Twojej bibliotece. Dodaj brakujące ćwiczenia przed rozpoczęciem treningu."
- Oznaczyć plan jako "niekompletny" w UI (np. badge "Wymaga ćwiczeń")

#### 2.3.2 Personal Records

**Zależność:** `personal_records.exercise_id` → `exercises.id` (FK RESTRICT)

**Wpływ:** 
- Personal records są obliczane z `workout_session_sets` i `workout_session_exercises`
- Wymagają, aby `exercise_id` istniało w tabeli `exercises`
- **Nie ma bezpośredniego wpływu na import** - personal records są tworzone tylko podczas wykonywania sesji treningowych
- Jeśli plan zawiera nieistniejące ćwiczenia, sesja nie może być rozpoczęta, więc personal records nie będą dotknięte

**Wniosek:** Import nie wpływa bezpośrednio na personal records, ale pośrednio - przez niemożność rozpoczęcia sesji z niekompletnego planu.

#### 2.3.3 Wyświetlanie planów treningowych

**Wpływ:** 
- Plan z nieistniejącymi ćwiczeniami będzie wyświetlany, ale ćwiczenia mogą nie mieć metadanych (tytuł, typ, partia)
- Wymagane będzie obsłużenie przypadku, gdy `exercise_id` jest NULL lub ćwiczenie nie istnieje

**Rozwiązanie:**
- Wyświetlić placeholder dla brakujących ćwiczeń: "Ćwiczenie nie znalezione (ID: {exercise_id})"
- Oznaczyć plan jako "niekompletny" w liście planów

## 3. Format JSON do importu

### 3.1 Struktura pliku JSON

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
      "planned_duration_seconds": null,
      "planned_rest_seconds": 10,
      "planned_rest_after_series_seconds": null,
      "estimated_set_time_seconds": null
    },
    {
      "exercise_id": "5383e05f-4da5-4f58-a206-ac0f1275c841",
      "section_type": "Main Workout",
      "section_order": 1,
      "planned_sets": 4,
      "planned_reps": 10,
      "planned_duration_seconds": null,
      "planned_rest_seconds": 60,
      "planned_rest_after_series_seconds": null,
      "estimated_set_time_seconds": null
    }
  ]
}
```

### 3.2 Walidacja formatu JSON

**Wymagane pola:**
- `name` (string, max 120 znaków)
- `description` (string | null, opcjonalne)
- `part` (enum: "Legs" | "Core" | "Back" | "Arms" | "Chest" | null)
- `exercises` (array, min 1 element)

**Dla każdego ćwiczenia:**
- `exercise_id` (UUID string, **może wskazywać na nieistniejące ćwiczenie**)
- `section_type` (enum: "Warm-up" | "Main Workout" | "Cool-down")
- `section_order` (number > 0, unikalne w ramach sekcji)
- `planned_sets` (number > 0 | null)
- `planned_reps` (number > 0 | null)
- `planned_duration_seconds` (number > 0 | null)
- `planned_rest_seconds` (number >= 0 | null)
- `planned_rest_after_series_seconds` (number >= 0 | null, opcjonalne)
- `estimated_set_time_seconds` (number > 0 | null, opcjonalne)

**Walidacja biznesowa:**
- Co najmniej jedno ćwiczenie
- Unikalność `section_order` w ramach każdej sekcji (`section_type`)
- Pozytywne wartości dla `planned_*` (jeśli podane)
- Format UUID dla `exercise_id` (ale **nie sprawdzamy istnienia**)

## 4. Implementacja

### 4.1 Migracja bazy danych (jeśli wybierzemy Opcję A)

**Plik:** `supabase/migrations/YYYYMMDDHHMMSS_allow_null_exercise_id_in_workout_plans.sql`

```sql
-- Zmiana FK constraint na ON DELETE SET NULL i pozwolenie na NULL
-- Umożliwia import planów z nieistniejącymi ćwiczeniami

-- 1. Usuń istniejący FK constraint
ALTER TABLE workout_plan_exercises
  DROP CONSTRAINT workout_plan_exercises_exercise_id_fkey;

-- 2. Zmień kolumnę na nullable
ALTER TABLE workout_plan_exercises
  ALTER COLUMN exercise_id DROP NOT NULL;

-- 3. Dodaj nowy FK constraint z ON DELETE SET NULL
ALTER TABLE workout_plan_exercises
  ADD CONSTRAINT workout_plan_exercises_exercise_id_fkey
  FOREIGN KEY (exercise_id)
  REFERENCES exercises(id)
  ON DELETE SET NULL;

-- 4. Dodaj komentarz wyjaśniający
COMMENT ON COLUMN workout_plan_exercises.exercise_id IS 
  'ID ćwiczenia z biblioteki użytkownika. Może być NULL dla importowanych planów z nieistniejącymi ćwiczeniami.';
```

**Uwaga:** Ta migracja może wpłynąć na istniejące dane. Należy rozważyć:
- Czy istniejące plany mogą mieć NULL `exercise_id`? (prawdopodobnie nie)
- Czy aplikacja obsługuje NULL `exercise_id` w innych miejscach? (wymaga sprawdzenia)

### 4.2 Nowy endpoint API

**Plik:** `src/app/api/workout-plans/import/route.ts`

```typescript
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    
    // Parsuj plik JSON z request body
    const body = await request.json();
    
    // Waliduj format JSON (bez sprawdzania istnienia ćwiczeń)
    const parsed = parseOrThrow(workoutPlanImportSchema, body);
    
    // Utwórz plan przez specjalny service dla importu
    const created = await importWorkoutPlanService(userId, parsed);
    
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    // Obsługa błędów...
  }
}
```

### 4.3 Nowy schema walidacji

**Plik:** `src/lib/validation/workout-plans.ts` (dodaj nowy schema)

```typescript
/**
 * Schema dla importu planu treningowego z JSON.
 * Różni się od workoutPlanCreateSchema tym, że NIE waliduje istnienia ćwiczeń.
 */
export const workoutPlanImportSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    part: partSchema,
    exercises: z
      .array(workoutPlanExerciseInputSchema)
      .min(1, "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Walidacja reguł biznesowych (unikalność pozycji, wartości dodatnie)
    const errors = validateWorkoutPlanBusinessRules(data.exercises);
    errors.forEach((message) =>
      ctx.addIssue({
        code: "custom",
        message,
      })
    );
  });
```

### 4.4 Nowy service dla importu

**Plik:** `src/services/workout-plans.ts` (dodaj nową funkcję)

```typescript
/**
 * Importuje plan treningowy z JSON bez walidacji istnienia ćwiczeń.
 * Umożliwia utworzenie planu z ćwiczeniami, które nie istnieją w bazie użytkownika.
 * 
 * UWAGA: Plan z nieistniejącymi ćwiczeniami nie będzie mógł być użyty do rozpoczęcia sesji
 * dopóki użytkownik nie doda brakujących ćwiczeń ręcznie.
 */
export async function importWorkoutPlanService(
  userId: string,
  payload: unknown
): Promise<WorkoutPlanDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(workoutPlanImportSchema, payload);
  
  // Walidacja domenowa (unikalność pozycji, wartości dodatnie)
  const domainErrors = validateWorkoutPlanBusinessRules(parsed.exercises);
  if (domainErrors.length) {
    throw new ServiceError("BAD_REQUEST", domainErrors.join(" "));
  }
  
  const supabase = await createClient();
  
  // NIE sprawdzamy istnienia ćwiczeń - to jest kluczowa różnica
  
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
  
  // Wstaw ćwiczenia (mogą mieć nieistniejące exercise_id)
  // Jeśli FK constraint wymaga istnienia, to tutaj wystąpi błąd
  // Jeśli FK pozwala na NULL, to możemy wstawić NULL dla nieistniejących
  const { error: exercisesInsertError } = await insertWorkoutPlanExercises(
    supabase,
    plan.id,
    parsed.exercises
  );
  
  if (exercisesInsertError) {
    // Jeśli wstawienie ćwiczeń się nie powiodło, usuń plan
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
  };
}
```

### 4.5 UI - Przycisk importu

**Lokalizacja:** `src/app/(app)/workout-plans/page.tsx` lub `src/components/workout-plans/workout-plans-list.tsx`

**Funkcjonalność:**
- Przycisk "Importuj plan" obok "Utwórz plan"
- Dialog do wyboru pliku JSON
- Walidacja formatu pliku (tylko .json)
- Wyświetlanie podglądu przed importem (opcjonalnie)
- Obsługa błędów z czytelnymi komunikatami
- Sukces: przekierowanie do szczegółów zaimportowanego planu

### 4.6 UI - Oznaczenie niekompletnych planów

**Lokalizacja:** `src/components/workout-plans/workout-plan-card.tsx`

**Funkcjonalność:**
- Sprawdzenie, czy plan zawiera ćwiczenia z NULL `exercise_id` lub nieistniejące ćwiczenia
- Wyświetlenie badge'a "Wymaga ćwiczeń" lub "Niekompletny"
- Wyłączenie przycisku "Rozpocznij trening" dla niekompletnych planów
- Komunikat: "Dodaj brakujące ćwiczenia przed rozpoczęciem treningu"

## 5. Obsługa błędów

### 5.1 Błędy walidacji formatu JSON
- **Kod:** `400 BAD_REQUEST`
- **Komunikat:** Szczegółowy opis błędu walidacji (np. "Nieprawidłowy format UUID dla exercise_id", "Duplikat kolejności 1 w sekcji Warm-up")

### 5.2 Błędy FK constraint (jeśli nie zmienimy migracji)
- **Kod:** `400 BAD_REQUEST` lub `500 INTERNAL`
- **Komunikat:** "Nie można zaimportować planu. Niektóre ćwiczenia nie istnieją w bazie danych."
- **Rozwiązanie:** Użytkownik musi najpierw dodać ćwiczenia ręcznie, a następnie zaimportować plan ponownie

### 5.3 Błędy podczas wstawiania do bazy
- **Kod:** `500 INTERNAL`
- **Komunikat:** "Wystąpił błąd podczas importu planu. Spróbuj ponownie."
- **Logowanie:** Pełny stack trace w logach serwera

## 6. Testy

### 6.1 Testy jednostkowe
- Walidacja formatu JSON (poprawne i niepoprawne przypadki)
- Walidacja reguł biznesowych (unikalność pozycji, wartości dodatnie)
- Obsługa NULL `exercise_id` (jeśli wybierzemy Opcję A)

### 6.2 Testy integracyjne
- Import planu z istniejącymi ćwiczeniami
- Import planu z nieistniejącymi ćwiczeniami (jeśli FK pozwala)
- Próba rozpoczęcia sesji z niekompletnego planu
- Wyświetlanie niekompletnego planu w UI

### 6.3 Testy end-to-end
- Pełny flow: wybór pliku → import → wyświetlenie planu → próba rozpoczęcia sesji → dodanie ćwiczeń → rozpoczęcie sesji

## 7. Dokumentacja dla użytkowników

### 7.1 Format pliku JSON
- Przykładowy plik JSON z komentarzami
- Opis wszystkich pól
- Przykłady dla różnych typów ćwiczeń (reps vs duration)

### 7.2 Instrukcja importu
- Krok po kroku: jak zaimportować plan
- Jak dodać brakujące ćwiczenia po imporcie
- Jak rozpocząć sesję z zaimportowanego planu

## 8. Rozważenia na przyszłość

### 8.1 Automatyczne dodawanie ćwiczeń podczas importu
- **Status:** Do rozważenia później
- **Wymagania:** 
  - Mapowanie `exercise_id` → metadane ćwiczenia (tytuł, typ, partia)
  - Walidacja czy ćwiczenie już istnieje (po tytule)
  - Tworzenie ćwiczeń z domyślnymi parametrami

### 8.2 Import z Markdown
- **Status:** Do rozważenia później
- **Wymagania:**
  - Parser Markdown → JSON
  - Mapowanie struktury Markdown na format planu treningowego

### 8.3 Eksport planów do JSON
- **Status:** Do rozważenia później
- **Funkcjonalność:** Eksport istniejącego planu do pliku JSON (do backupu lub udostępnienia)

## 9. Podsumowanie zmian

### 9.1 Wymagane zmiany w bazie danych
- [ ] Migracja: Zmiana FK constraint na `ON DELETE SET NULL` i nullable `exercise_id` (Opcja A)
- [ ] LUB: Logika tworzenia placeholder ćwiczeń (Opcja B)

### 9.2 Wymagane zmiany w kodzie
- [ ] Nowy schema walidacji: `workoutPlanImportSchema`
- [ ] Nowy service: `importWorkoutPlanService`
- [ ] Nowy endpoint: `POST /api/workout-plans/import`
- [ ] Aktualizacja UI: Przycisk importu + dialog wyboru pliku
- [ ] Aktualizacja UI: Oznaczenie niekompletnych planów
- [ ] Aktualizacja UI: Wyłączenie przycisku "Rozpocznij" dla niekompletnych planów
- [ ] Aktualizacja `startWorkoutSessionService`: Obsługa niekompletnych planów

### 9.3 Wymagane zmiany w dokumentacji
- [ ] Dokumentacja formatu JSON
- [ ] Instrukcja importu dla użytkowników
- [ ] Przykładowe pliki JSON

## 10. Decyzje do podjęcia

1. **FK Constraint:** Którą opcję wybieramy?
   - Opcja A: Zmiana na nullable + SET NULL (wymaga migracji)
   - Opcja B: Placeholder ćwiczenia (wymaga dodatkowej logiki)
   - Opcja C: Odrzucone przez użytkownika

2. **Obsługa nieistniejących ćwiczeń w UI:**
   - Jak wyświetlać ćwiczenia z NULL `exercise_id`?
   - Jak oznaczyć niekompletne plany?
   - Jakie komunikaty wyświetlać użytkownikowi?

3. **Walidacja podczas importu:**
   - Czy sprawdzać format UUID dla `exercise_id`? (TAK)
   - Czy sprawdzać czy UUID jest poprawny? (TAK)
   - Czy sprawdzać czy ćwiczenie istnieje? (NIE - zgodnie z wymaganiami)
