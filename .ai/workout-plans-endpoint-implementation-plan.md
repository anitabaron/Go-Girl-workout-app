# API Endpoint Implementation Plan: Workout Plans (CRUD)

## 1. Przegląd punktu końcowego

- Zapewnienie CRUD dla zasobu `workout_plans` powiązanego z zalogowanym użytkownikiem.
- Wsparcie tworzenia i zarządzania planami treningowymi z uporządkowanymi ćwiczeniami w sekcjach (Warm-up, Main Workout, Cool-down).
- Silna walidacja domenowa: wymagane co najmniej jedno ćwiczenie, unikalne pozycje w sekcjach, pozytywne wartości dla parametrów planowanych, weryfikacja własności ćwiczeń.
- Wsparcie filtrowania, sortowania i paginacji kursorem dla listy planów.
- Strategia "replace" przy aktualizacji: pełna lista ćwiczeń zastępuje istniejącą.
- Zgodność z Supabase (auth + Postgres), Next.js App Router API routes, Zod do walidacji.

## 2. Szczegóły żądania

### 2.1 POST /api/workout-plans

- **Metoda HTTP**: `POST`
- **URL**: `/api/workout-plans`
- **Body**:
  ```typescript
  {
    name: string;                    // Wymagane
    description?: string | null;      // Opcjonalne
    part?: ExercisePart | null;       // Opcjonalne (Legs, Core, Back, Arms, Chest)
    exercises: Array<{
      exercise_id: UUID;              // Wymagane, musi należeć do użytkownika
      section_type: ExerciseType;      // Wymagane (Warm-up, Main Workout, Cool-down)
      section_position: number;       // Wymagane, > 0, unikalne per section_type
      planned_sets?: number | null;   // Opcjonalne, jeśli podane > 0
      planned_reps?: number | null;   // Opcjonalne, jeśli podane > 0
      planned_duration_seconds?: number | null;  // Opcjonalne, jeśli podane > 0
      planned_rest_seconds?: number | null;      // Opcjonalne, jeśli podane >= 0
    }>;
  }
  ```
- **Walidacja**:
  - `name`: wymagane, string, max 120 znaków
  - `description`: opcjonalne, string, max 1000 znaków
  - `part`: opcjonalne, enum (Legs, Core, Back, Arms, Chest)
  - `exercises`: wymagane, array, co najmniej 1 element
  - Dla każdego ćwiczenia:
    - `exercise_id`: wymagane, UUID, musi istnieć i należeć do użytkownika
    - `section_type`: wymagane, enum (Warm-up, Main Workout, Cool-down)
    - `section_position`: wymagane, integer > 0, unikalne w ramach `(plan_id, section_type)`
    - `planned_sets`, `planned_reps`, `planned_duration_seconds`: jeśli podane, > 0
    - `planned_rest_seconds`: jeśli podane, >= 0
  - Brak duplikatów pozycji w tej samej sekcji

### 2.2 GET /api/workout-plans

- **Metoda HTTP**: `GET`
- **URL**: `/api/workout-plans`
- **Query Parameters**:
  - `part?`: ExercisePart (Legs, Core, Back, Arms, Chest)
  - `sort?`: `"created_at"` | `"name"` (domyślnie: `"created_at"`)
  - `order?`: `"asc"` | `"desc"` (domyślnie: `"desc"`)
  - `limit?`: number (domyślnie: 20, max: 100)
  - `cursor?`: string (opaque cursor dla paginacji)

### 2.3 GET /api/workout-plans/{id}

- **Metoda HTTP**: `GET`
- **URL**: `/api/workout-plans/{id}`
- **Path Parameters**:
  - `id`: UUID planu treningowego
- **Walidacja**:
  - Plan musi istnieć i należeć do użytkownika

### 2.4 PATCH /api/workout-plans/{id}

- **Metoda HTTP**: `PATCH`
- **URL**: `/api/workout-plans/{id}`
- **Path Parameters**:
  - `id`: UUID planu treningowego
- **Body**: identyczne jak POST (wszystkie pola opcjonalne, ale jeśli `exercises` podane, to pełna lista zastępuje istniejącą)
- **Walidacja**: identyczna jak POST
- **Uwaga**: Aktualizacja wpływa tylko na przyszłe sesje; istniejące sesje zachowują snapshot `plan_name_at_time`

### 2.5 DELETE /api/workout-plans/{id}

- **Metoda HTTP**: `DELETE`
- **URL**: `/api/workout-plans/{id}`
- **Path Parameters**:
  - `id`: UUID planu treningowego
- **Walidacja**:
  - Plan musi istnieć i należeć do użytkownika
- **Uwaga**: Usunięcie planu nie usuwa sesji; sesje zachowują snapshot `plan_name_at_time`

## 3. Wykorzystywane typy

### 3.1 DTOs i Command Modele (z `src/types.ts`)

- `WorkoutPlanCreateCommand`: Command do tworzenia planu

  ```typescript
  {
    name: string;
    description?: string | null;
    part?: ExercisePart | null;
    exercises: WorkoutPlanExerciseInput[];
  }
  ```

- `WorkoutPlanExerciseInput`: Input dla ćwiczenia w planie

  ```typescript
  {
    exercise_id: UUID;
    section_type: ExerciseType;
    section_position: number;
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
  }
  ```

- `WorkoutPlanDTO`: DTO planu z ćwiczeniami

  ```typescript
  {
    id: UUID;
    name: string;
    description?: string | null;
    part?: ExercisePart | null;
    created_at: string;
    updated_at: string;
    exercises: WorkoutPlanExerciseDTO[];
  }
  ```

- `WorkoutPlanExerciseDTO`: DTO ćwiczenia w planie

  ```typescript
  {
    id: UUID;
    exercise_id: UUID;
    section_type: ExerciseType;
    section_position: number;
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
  }
  ```

- `PlanQueryParams`: Parametry zapytania dla listy planów
  ```typescript
  {
    part?: ExercisePart;
    sort?: "created_at" | "name";
    order?: "asc" | "desc";
    limit?: number;
    cursor?: string | null;
  }
  ```

### 3.2 Typy pomocnicze

- `ExercisePart`: enum (Legs, Core, Back, Arms, Chest)
- `ExerciseType`: enum (Warm-up, Main Workout, Cool-down)

## 4. Szczegóły odpowiedzi

### 4.1 POST /api/workout-plans

- **Status**: `201 Created`
- **Body**: `WorkoutPlanDTO` (plan z pełną listą ćwiczeń, posortowaną po `section_type`, `section_position`)
- **Błędy**:
  - `400`: Walidacja nieudana (puste ćwiczenia, nieprawidłowe pozycje, wartości ujemne, brakujące wymagane pola)
  - `409`: Duplikaty pozycji w sekcji, konflikt unikalności
  - `401`: Brak autoryzacji
  - `403`: Brak dostępu (jeśli RLS zwróci perm error)
  - `500`: Błąd serwera

### 4.2 GET /api/workout-plans

- **Status**: `200 OK`
- **Body**:
  ```typescript
  {
    items: Array<{
      id: UUID;
      name: string;
      description?: string | null;
      part?: ExercisePart | null;
      created_at: string;
      updated_at: string;
      exercise_count?: number;  // Opcjonalnie: liczba ćwiczeń w planie
    }>;
    nextCursor?: string | null;
  }
  ```
- **Błędy**:
  - `400`: Nieprawidłowe parametry zapytania (nieprawidłowy cursor, limit poza zakresem)
  - `401`: Brak autoryzacji
  - `403`: Brak dostępu
  - `500`: Błąd serwera

### 4.3 GET /api/workout-plans/{id}

- **Status**: `200 OK`
- **Body**: `WorkoutPlanDTO` (plan z pełną listą ćwiczeń, posortowaną po `section_type`, `section_position`)
- **Błędy**:
  - `404`: Plan nie istnieje lub nie należy do użytkownika
  - `401`: Brak autoryzacji
  - `403`: Brak dostępu
  - `500`: Błąd serwera

### 4.4 PATCH /api/workout-plans/{id}

- **Status**: `200 OK`
- **Body**: `WorkoutPlanDTO` (zaktualizowany plan z pełną listą ćwiczeń)
- **Błędy**:
  - `400`: Walidacja nieudana (identyczna jak POST)
  - `409`: Duplikaty pozycji w sekcji, konflikt unikalności
  - `404`: Plan nie istnieje lub nie należy do użytkownika
  - `401`: Brak autoryzacji
  - `403`: Brak dostępu
  - `500`: Błąd serwera

### 4.5 DELETE /api/workout-plans/{id}

- **Status**: `204 No Content`
- **Body**: Brak
- **Błędy**:
  - `404`: Plan nie istnieje lub nie należy do użytkownika
  - `401`: Brak autoryzacji
  - `403`: Brak dostępu
  - `500`: Błąd serwera

## 5. Przepływ danych

### 5.1 POST /api/workout-plans

1. Pobierz sesję użytkownika przez Supabase auth (server-side client). Wymuś obecność `user.id`.
2. Waliduj body przez Zod schema (`workoutPlanCreateSchema`).
3. Walidacja domenowa:
   - Sprawdź, że `exercises.length >= 1`.
   - Dla każdego ćwiczenia:
     - Zweryfikuj, że `exercise_id` istnieje i należy do użytkownika (query do `exercises`).
     - Sprawdź, że `section_position > 0`.
     - Sprawdź, że `planned_*` wartości są pozytywne (jeśli podane).
   - Sprawdź unikalność `(section_type, section_position)` w ramach requestu.
4. Wstaw plan do `workout_plans` z `user_id` z sesji.
5. Wstaw wszystkie ćwiczenia do `workout_plan_exercises` z `plan_id`.
6. Pobierz utworzony plan z ćwiczeniami (JOIN lub osobne query + sortowanie).
7. Zwróć `WorkoutPlanDTO` z ćwiczeniami posortowanymi po `section_type`, `section_position`.

### 5.2 GET /api/workout-plans

1. Pobierz sesję użytkownika. Wymuś obecność `user.id`.
2. Waliduj query params przez Zod schema (`planQuerySchema`).
3. Zbuduj zapytanie:
   - Filtruj po `user_id = session.user.id`.
   - Opcjonalny filtr `part` jeśli podany.
   - Sortowanie: `sort` (domyślnie `created_at`) + `order` (domyślnie `desc`).
   - Paginacja kursorem: jeśli `cursor` podany, dekoduj i zastosuj filtr.
   - Limit: `limit` (domyślnie 20, max 100) + 1 dla `nextCursor`.
4. Wykonaj zapytanie do `workout_plans`.
5. Jeśli `limit + 1` wyników, ostatni element to `nextCursor`.
6. Opcjonalnie: dla każdego planu pobierz liczbę ćwiczeń (COUNT subquery lub osobne query).
7. Zwróć `{ items, nextCursor }`.

### 5.3 GET /api/workout-plans/{id}

1. Pobierz sesję użytkownika. Wymuś obecność `user.id`.
2. Waliduj `id` jako UUID.
3. Pobierz plan z `workout_plans` gdzie `id = {id}` AND `user_id = session.user.id`.
4. Jeśli nie znaleziono, zwróć `404`.
5. Pobierz wszystkie ćwiczenia z `workout_plan_exercises` gdzie `plan_id = {id}`, posortowane po `section_type`, `section_position`.
6. Zwróć `WorkoutPlanDTO` z ćwiczeniami.

### 5.4 PATCH /api/workout-plans/{id}

1. Pobierz sesję użytkownika. Wymuś obecność `user.id`.
2. Waliduj `id` jako UUID.
3. Waliduj body przez Zod schema (`workoutPlanUpdateSchema` - partial version of create).
4. Pobierz istniejący plan z `workout_plans` gdzie `id = {id}` AND `user_id = session.user.id`.
5. Jeśli nie znaleziono, zwróć `404`.
6. Jeśli `exercises` podane w body:
   - Wykonaj walidację domenową (identyczną jak POST).
   - Usuń wszystkie istniejące ćwiczenia z `workout_plan_exercises` gdzie `plan_id = {id}` (DELETE CASCADE zapewnia integralność).
   - Wstaw nowe ćwiczenia do `workout_plan_exercises`.
7. Jeśli `name`, `description`, `part` podane, zaktualizuj w `workout_plans`.
8. Pobierz zaktualizowany plan z ćwiczeniami.
9. Zwróć `WorkoutPlanDTO`.

### 5.5 DELETE /api/workout-plans/{id}

1. Pobierz sesję użytkownika. Wymuś obecność `user.id`.
2. Waliduj `id` jako UUID.
3. Pobierz plan z `workout_plans` gdzie `id = {id}` AND `user_id = session.user.id`.
4. Jeśli nie znaleziono, zwróć `404`.
5. Usuń plan z `workout_plans` (DELETE CASCADE automatycznie usuwa `workout_plan_exercises`).
6. Zwróć `204 No Content`.

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnienie

- Wymagaj aktywnej sesji Supabase dla wszystkich operacji.
- Użyj server-side Supabase client (`createClient` z `@/db/supabase.server`).
- Nigdy nie ufaj `user_id` z body/query; zawsze pobieraj z sesji.

### 6.2 Autoryzacja

- Filtrowanie po `user_id` w każdej operacji.
- Weryfikacja własności ćwiczeń: przed dodaniem ćwiczenia do planu, sprawdź że `exercise.user_id = session.user.id`.
- Nie ujawniaj istnienia cudzych zasobów: `404` zamiast `403` po sprawdzeniu właściciela.

### 6.3 Walidacja danych wejściowych

- Zod schemas z whitelistą pól; odrzuć nieznane pola (`.strict()`).
- Limity:
  - `name`: max 120 znaków
  - `description`: max 1000 znaków
  - `limit`: max 100
  - `section_position`: > 0, integer
  - `planned_*`: jeśli podane, > 0 (lub >= 0 dla `planned_rest_seconds`)
- UUID validation dla `id` i `exercise_id`.
- Enum validation dla `part` i `section_type`.

### 6.4 Ochrona przed atakami

- **SQL Injection**: Używaj Supabase query builder (parametryzowane zapytania).
- **Enumeration**: Brak rozróżnienia `404/403` po sprawdzeniu własności.
- **Mass Assignment**: Whitelist pól w schematach Zod.
- **Integer Overflow**: Walidacja zakresów dla `section_position` i `planned_*`.

### 6.5 Row-Level Security (RLS)

- RLS jest włączone na `workout_plans` i `workout_plan_exercises`.
- Policies zapewniają izolację danych per użytkownik.
- Kod aplikacji dodatkowo weryfikuje własność (defense in depth).

## 7. Obsługa błędów

### 7.1 Mapowanie kodów statusu

- **`400 Bad Request`**:

  - Nieprawidłowe body/query (Zod validation errors)
  - Pusta lista ćwiczeń (`exercises.length === 0`)
  - Nieprawidłowe pozycje (`section_position <= 0`)
  - Wartości `planned_*` ujemne lub zero (gdy wymagane > 0)
  - Nieprawidłowy cursor paginacji
  - Limit poza zakresem (max 100)

- **`401 Unauthorized`**:

  - Brak aktywnej sesji
  - Nieprawidłowy token autoryzacji

- **`403 Forbidden`**:

  - RLS policy rejection (rzadko, jeśli kod weryfikuje własność)

- **`404 Not Found`**:

  - Plan nie istnieje lub nie należy do użytkownika
  - Ćwiczenie (`exercise_id`) nie istnieje lub nie należy do użytkownika

- **`409 Conflict`**:

  - Duplikaty pozycji w sekcji (unique constraint violation na `(plan_id, section_type, section_position)`)
  - FK constraint violation (jeśli ćwiczenie zostanie usunięte podczas tworzenia planu)

- **`500 Internal Server Error`**:
  - Nieoczekiwane błędy Supabase/DB
  - Błędy serializacji/deserializacji kursora
  - Błędy transakcji

### 7.2 Format odpowiedzi błędów

```typescript
{
  message: string;      // Komunikat dla użytkownika (po polsku)
  code?: string;        // Kod błędu (BAD_REQUEST, NOT_FOUND, CONFLICT, etc.)
  details?: string;     // Opcjonalne szczegóły techniczne (dla debugowania)
}
```

### 7.3 Logowanie błędów

- `console.error` na serwerze dla wszystkich błędów `500`.
- Loguj: `user_id`, endpoint, payload (skrócony, bez PII), stack trace.
- Opcjonalnie: zapis do tabeli `error_logs` jeśli istnieje (TODO: dodać tabelę w przyszłości).

### 7.4 Obsługa błędów DB

- Mapowanie kodów błędów PostgreSQL:
  - `23505` (unique_violation) → `409 Conflict`
  - `23503` (foreign_key_violation) → `409 Conflict` lub `404 Not Found` (w zależności od kontekstu)
  - `23502` (not_null_violation) → `400 Bad Request`
  - Inne → `500 Internal Server Error`

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazy danych

- Wykorzystaj istniejące indeksy:
  - `idx_workout_plans_user_id`: dla filtrowania po użytkowniku
  - `idx_workout_plans_user_id_created_at`: dla sortowania po dacie
  - `idx_workout_plan_exercises_plan_id`: dla JOIN z ćwiczeniami
  - `idx_workout_plan_exercises_plan_section`: dla unikalności pozycji

### 8.2 Optymalizacje zapytań

- **GET /api/workout-plans (lista)**:

  - Użyj paginacji kursorem zamiast offset (lepsze dla dużych zbiorów).
  - Sortuj po indeksowanych kolumnach (`created_at`, `name`).
  - Opcjonalnie: COUNT subquery dla `exercise_count` tylko jeśli potrzebne (lub osobne query batch).

- **GET /api/workout-plans/{id}**:

  - Pojedyncze zapytanie z JOIN lub dwa zapytania (plan + ćwiczenia).
  - Sortowanie ćwiczeń po `section_type`, `section_position` w DB (nie w kodzie).

- **POST /api/workout-plans**:

  - Weryfikacja własności ćwiczeń: batch query dla wszystkich `exercise_id` jednocześnie (zamiast N queries).
  - Użyj transakcji dla atomowości (wstaw plan + ćwiczenia).

- **PATCH /api/workout-plans/{id}**:
  - Jeśli `exercises` podane, użyj transakcji:
    1. DELETE wszystkich istniejących ćwiczeń
    2. INSERT nowych ćwiczeń
    3. UPDATE metadanych planu (jeśli podane)
  - Unikaj N+1: batch weryfikacja własności ćwiczeń.

### 8.3 Limity i paginacja

- Domyślny `limit`: 20
- Maksymalny `limit`: 100
- Kursor paginacji: base64url-encoded JSON z `{ sort, order, value, id }`
- Pobierz `limit + 1` wyników, aby wykryć `nextCursor`.

### 8.4 Cache (opcjonalnie, przyszłość)

- GET /api/workout-plans/{id}: cache z TTL (np. 5 minut) dla często odczytywanych planów.
- Inwalidacja cache przy PATCH/DELETE.

## 9. Etapy wdrożenia

### 9.1 Przygotowanie schematów walidacji

1. **Utwórz `src/lib/validation/plans.ts`**:
   - `workoutPlanExerciseInputSchema`: schema dla pojedynczego ćwiczenia w planie
     - `exercise_id`: UUID, wymagane
     - `section_type`: enum (Warm-up, Main Workout, Cool-down)
     - `section_position`: integer > 0
     - `planned_sets`, `planned_reps`, `planned_duration_seconds`: optional, integer > 0 jeśli podane
     - `planned_rest_seconds`: optional, integer >= 0 jeśli podane
   - `workoutPlanCreateSchema`: schema dla tworzenia planu
     - `name`: string, wymagane, max 120
     - `description`: string, optional, max 1000
     - `part`: enum, optional
     - `exercises`: array, min 1 element, każdy element zgodny z `workoutPlanExerciseInputSchema`
   - `workoutPlanUpdateSchema`: partial version of create schema
   - `planQuerySchema`: schema dla query params
     - `part`: enum, optional
     - `sort`: enum ("created_at", "name"), default "created_at"
     - `order`: enum ("asc", "desc"), default "desc"
     - `limit`: integer, min 1, max 100, default 20
     - `cursor`: string, optional
   - Funkcje pomocnicze:
     - `validatePlanBusinessRules()`: walidacja domenowa (co najmniej jedno ćwiczenie, unikalność pozycji, weryfikacja własności ćwiczeń)
     - `encodeCursor()` / `decodeCursor()`: dla paginacji (podobnie jak w exercises)

### 9.2 Warstwa repozytorium

2. **Utwórz `src/repositories/plans.ts`**:
   - `findById(client, userId, id)`: pobierz plan po ID i user_id
   - `findByUserId(client, userId, params)`: lista planów użytkownika z filtrami
   - `insertPlan(client, userId, input)`: wstaw plan (zwraca plan bez ćwiczeń)
   - `insertPlanExercises(client, planId, exercises)`: wstaw ćwiczenia do planu (batch insert)
   - `updatePlan(client, userId, id, input)`: aktualizuj metadane planu
   - `deletePlanExercises(client, planId)`: usuń wszystkie ćwiczenia z planu
   - `listPlanExercises(client, planId)`: pobierz ćwiczenia planu (posortowane)
   - `findExercisesByIds(client, userId, exerciseIds)`: batch weryfikacja własności ćwiczeń
   - `mapToDTO(row)`: mapowanie DB row → WorkoutPlanDTO (bez user_id)
   - `mapExerciseToDTO(row)`: mapowanie DB row → WorkoutPlanExerciseDTO
   - `encodeCursor()` / `decodeCursor()`: dla paginacji

### 9.3 Warstwa serwisowa

3. **Utwórz `src/services/plans.ts`**:
   - `createPlanService(userId, payload)`:
     - Walidacja Zod
     - Walidacja domenowa (co najmniej jedno ćwiczenie, unikalność pozycji)
     - Batch weryfikacja własności ćwiczeń
     - Transakcja: wstaw plan + ćwiczenia
     - Zwróć WorkoutPlanDTO
   - `listPlansService(userId, query)`:
     - Walidacja query params
     - Zapytanie z filtrami, sortowaniem, paginacją
     - Zwróć `{ items, nextCursor }`
   - `getPlanService(userId, id)`:
     - Pobierz plan + ćwiczenia
     - Zwróć WorkoutPlanDTO lub 404
   - `updatePlanService(userId, id, payload)`:
     - Pobierz istniejący plan (404 jeśli nie istnieje)
     - Walidacja Zod (partial)
     - Jeśli `exercises` podane: walidacja domenowa + batch weryfikacja własności
     - Transakcja: DELETE starych ćwiczeń + INSERT nowych + UPDATE metadanych
     - Zwróć zaktualizowany WorkoutPlanDTO
   - `deletePlanService(userId, id)`:
     - Pobierz plan (404 jeśli nie istnieje)
     - Usuń plan (CASCADE usuwa ćwiczenia)
     - Zwróć void
   - `ServiceError` class (reuse z exercises lub shared)
   - `mapDbError()`: mapowanie błędów Supabase na ServiceError

### 9.4 Route handlers

4. **Utwórz `src/app/api/workout-plans/route.ts`**:

   - `GET`: pobierz sesję → waliduj query → wywołaj `listPlansService` → zwróć 200
   - `POST`: pobierz sesję → waliduj body → wywołaj `createPlanService` → zwróć 201
   - Obsługa błędów: `ServiceError` → `respondWithServiceError()`, inne → 500

5. **Utwórz `src/app/api/workout-plans/[id]/route.ts`**:
   - `GET`: pobierz sesję → waliduj id → wywołaj `getPlanService` → zwróć 200
   - `PATCH`: pobierz sesję → waliduj id + body → wywołaj `updatePlanService` → zwróć 200
   - `DELETE`: pobierz sesję → waliduj id → wywołaj `deletePlanService` → zwróć 204
   - Obsługa błędów: `ServiceError` → `respondWithServiceError()`, inne → 500

### 9.5 Integracja z istniejącym kodem

6. **Zaktualizuj `src/lib/http/errors.ts`** (jeśli potrzebne):

   - Upewnij się, że `respondWithServiceError()` obsługuje wszystkie kody błędów

7. **Zaktualizuj `src/types.ts`** (jeśli potrzebne):
   - Upewnij się, że wszystkie typy DTO są zdefiniowane zgodnie z planem

### 9.6 Testy (opcjonalnie)

8. **Testy integracyjne** (jeśli setup):
   - POST: tworzenie planu z ćwiczeniami, walidacja pustej listy, duplikaty pozycji
   - GET: lista z filtrami, paginacja kursorem, sortowanie
   - GET/{id}: pobranie planu z ćwiczeniami, 404 dla cudzego planu
   - PATCH: aktualizacja metadanych, replace ćwiczeń, walidacja
   - DELETE: usunięcie planu, sesje pozostają (snapshot)

### 9.7 Dokumentacja

9. **Zaktualizuj dokumentację**:
   - README/API docs z przykładami request/response
   - Opisz zasady walidacji i strategię replace dla ćwiczeń

## 10. Uwagi implementacyjne

### 10.1 Transakcje

- Użyj transakcji Supabase dla atomowych operacji:
  - POST: wstaw plan + wszystkie ćwiczenia
  - PATCH: DELETE starych ćwiczeń + INSERT nowych + UPDATE metadanych

### 10.2 Batch weryfikacja ćwiczeń

- Zamiast N queries dla każdego `exercise_id`, wykonaj jedno zapytanie:
  ```sql
  SELECT id FROM exercises
  WHERE user_id = $1 AND id = ANY($2::uuid[])
  ```
- Porównaj długość wyników z długością `exerciseIds` w request.

### 10.3 Sortowanie ćwiczeń

- W `GET /api/workout-plans/{id}` i `POST/PATCH` response, sortuj ćwiczenia po:
  1. `section_type` (Warm-up → Main Workout → Cool-down)
  2. `section_position` (ascending)

### 10.4 Strategia replace dla ćwiczeń

- W `PATCH /api/workout-plans/{id}`, jeśli `exercises` podane w body:
  - Traktuj jako pełną listę (nie merge z istniejącymi).
  - Usuń wszystkie istniejące ćwiczenia.
  - Wstaw nowe ćwiczenia.
- Jeśli `exercises` nie podane, pozostaw istniejące bez zmian.

### 10.5 Obsługa snapshotów sesji

- Usunięcie planu (`DELETE`) nie usuwa sesji.
- Sesje zachowują `plan_name_at_time` (snapshot).
- Aktualizacja planu (`PATCH`) nie wpływa na istniejące sesje (tylko przyszłe).
