# API Endpoint Implementation Plan: Workout Sessions

## 1. Przegląd punktu końcowego

- Zapewnienie zarządzania sesjami treningowymi (start/resume/history) dla zalogowanego użytkownika.
- Wsparcie tworzenia sesji z snapshotami planu treningowego i ćwiczeń w momencie rozpoczęcia.
- Logika biznesowa: użytkownik może mieć tylko jedną sesję `in_progress` jednocześnie (enforced przez unique constraint w bazie).
- Wsparcie filtrowania, sortowania i paginacji kursorem dla historii sesji.
- Szczegółowy widok sesji z ćwiczeniami i seriami, pokazujący planowane vs faktyczne wartości.
- Aktualizacja statusu sesji (pause/resume/complete) z automatycznym ustawianiem `completed_at`.
- Zgodność z Supabase (auth + Postgres), Next.js App Router API routes, Zod do walidacji.

## 2. Szczegóły żądania

### 2.1 POST /api/workout-sessions

- **Metoda HTTP**: `POST`
- **URL**: `/api/workout-sessions`
- **Body**:
  ```typescript
  {
    workout_plan_id: UUID; // Wymagane dla MVP (opcjonalne w spec, ale ad-hoc nie w scope)
  }
  ```
- **Logika biznesowa**:
  - Jeśli użytkownik ma sesję `in_progress`, zwróć ją (status `200`) i nie twórz nowej.
  - Jeśli nie ma sesji `in_progress`, utwórz nową sesję z snapshotami:
    - Skopiuj `name` z planu do `plan_name_at_time`.
    - Dla każdego ćwiczenia w planie utwórz wpis w `workout_session_exercises` z snapshotami:
      - `exercise_title_at_time`, `exercise_type_at_time`, `exercise_part_at_time` z `exercises`.
      - `planned_*` wartości z `workout_plan_exercises` (lub z `exercises` jako fallback).
      - `position` na podstawie kolejności w planie (flattened across sections).
- **Walidacja**:
  - `workout_plan_id`: wymagane, UUID, musi istnieć i należeć do użytkownika
  - Plan musi mieć co najmniej jedno ćwiczenie
- **Status odpowiedzi**:
  - `201 Created`: Nowa sesja utworzona
  - `200 OK`: Istniejąca sesja `in_progress` zwrócona

### 2.2 GET /api/workout-sessions

- **Metoda HTTP**: `GET`
- **URL**: `/api/workout-sessions`
- **Query Parameters**:
  - `status?`: `"in_progress"` | `"completed"` (filtruj po statusie)
  - `plan_id?`: UUID (filtruj po `workout_plan_id`)
  - `from?`: ISO 8601 date string (filtruj sesje od daty, użyj `started_at >= from`)
  - `to?`: ISO 8601 date string (filtruj sesje do daty, użyj `started_at <= to`)
  - `sort?`: `"started_at"` | `"completed_at"` | `"status"` (domyślnie: `"started_at"`)
  - `order?`: `"asc"` | `"desc"` (domyślnie: `"desc"`)
  - `limit?`: number (domyślnie: 20, max: 100)
  - `cursor?`: string (opaque cursor dla paginacji)
- **Walidacja**:
  - `status`: enum (in_progress, completed)
  - `plan_id`: UUID (jeśli podany)
  - `from`/`to`: ISO 8601 date string (jeśli podane)
  - `sort`: whitelist (started_at, completed_at, status)
  - `order`: enum (asc, desc)
  - `limit`: integer, 1-100
  - `cursor`: string (opaque)

### 2.3 GET /api/workout-sessions/{id}

- **Metoda HTTP**: `GET`
- **URL**: `/api/workout-sessions/{id}`
- **Path Parameters**:
  - `id`: UUID sesji treningowej
- **Walidacja**:
  - Sesja musi istnieć i należeć do użytkownika
- **Response**: Pełny obiekt sesji z ćwiczeniami i seriami, pokazujący planowane vs faktyczne wartości

### 2.4 PATCH /api/workout-sessions/{id}/status

- **Metoda HTTP**: `PATCH`
- **URL**: `/api/workout-sessions/{id}/status`
- **Path Parameters**:
  - `id`: UUID sesji treningowej
- **Body**:
  ```typescript
  {
    status: "in_progress" | "completed";
  }
  ```
- **Logika biznesowa**:
  - Aktualizacja statusu z walidacją przejść:
    - `in_progress` → `completed`: dozwolone, ustaw `completed_at = now()`
    - `in_progress` → `in_progress`: dozwolone (resume/pause)
    - `completed` → `in_progress`: dozwolone (resume completed session - edge case)
    - `completed` → `completed`: dozwolone (idempotent)
  - Przy zmianie na `completed`, ustaw `completed_at` jeśli jeszcze nie ustawione.
  - Przy zmianie na `in_progress`, nie modyfikuj `completed_at` (zachowaj history).
- **Walidacja**:
  - `status`: wymagane, enum (in_progress, completed)
  - Sesja musi istnieć i należeć do użytkownika
  - Jeśli ustawiamy `in_progress` i użytkownik ma już inną sesję `in_progress`, zwróć `409 Conflict`

## 3. Wykorzystywane typy

### 3.1 DTOs i Command Modele (z `src/types.ts`)

- `SessionStartCommand`: Command do rozpoczęcia sesji

  ```typescript
  {
    workout_plan_id: UUID;
  }
  ```

- `SessionStatusUpdateCommand`: Command do aktualizacji statusu

  ```typescript
  {
    status: "in_progress" | "completed";
  }
  ```

- `SessionListQueryParams`: Parametry zapytania dla listy sesji

  ```typescript
  {
    status?: "in_progress" | "completed";
    plan_id?: UUID;
    from?: string;  // ISO 8601 date
    to?: string;    // ISO 8601 date
    sort?: "started_at" | "completed_at" | "status";
    order?: "asc" | "desc";
    limit?: number;
    cursor?: string | null;
  }
  ```

- `SessionSummaryDTO`: Podsumowanie sesji (dla listy)

  ```typescript
  {
    id: UUID;
    workout_plan_id: UUID | null;
    status: "in_progress" | "completed";
    plan_name_at_time: string | null;
    started_at: string; // ISO 8601 timestamp
    completed_at: string | null; // ISO 8601 timestamp
    current_position: number;
  }
  ```

- `SessionDetailDTO`: Szczegóły sesji (dla GET /{id})
  ```typescript
  SessionSummaryDTO & {
    exercises: Array<{
      id: UUID;
      exercise_id: UUID;
      exercise_title_at_time: string;
      exercise_type_at_time: "Warm-up" | "Main Workout" | "Cool-down";
      exercise_part_at_time: "Legs" | "Core" | "Back" | "Arms" | "Chest";
      planned_sets: number | null;
      planned_reps: number | null;
      planned_duration_seconds: number | null;
      planned_rest_seconds: number | null;
      actual_sets: number | null;
      actual_reps: number | null;
      actual_duration_seconds: number | null;
      actual_rest_seconds: number | null;
      position: number;
      is_skipped: boolean;
      sets: Array<{
        id: UUID;
        set_number: number;
        reps: number | null;
        duration_seconds: number | null;
        weight_kg: number | null;
      }>;
    }>;
  }
  ```

### 3.2 Typy z bazy danych

- `WorkoutSessionEntity`: Pełna encja z bazy
- `WorkoutSessionExerciseEntity`: Ćwiczenie w sesji
- `WorkoutSessionSetEntity`: Seria w ćwiczeniu
- `WorkoutSessionStatus`: Enum statusu (`"in_progress" | "completed"`)

## 4. Szczegóły odpowiedzi

### 4.1 POST /api/workout-sessions

- **Status**: `201 Created` (nowa sesja) lub `200 OK` (istniejąca sesja `in_progress`)
- **Body**: `SessionDetailDTO` (pełny obiekt sesji z ćwiczeniami i seriami)
- **Błędy**:
  - `400`: Walidacja nieudana (brak `workout_plan_id`, nieprawidłowy UUID)
  - `404`: Plan nie istnieje lub nie należy do użytkownika
  - `409`: Konflikt stanu (np. próba utworzenia nowej sesji gdy już istnieje `in_progress` - ale to powinno zwrócić 200)
  - `401`: Brak autoryzacji
  - `403`: Brak dostępu
  - `500`: Błąd serwera

### 4.2 GET /api/workout-sessions

- **Status**: `200 OK`
- **Body**:
  ```typescript
  {
    items: SessionSummaryDTO[];
    nextCursor: string | null;
  }
  ```
- **Błędy**:
  - `400`: Nieprawidłowe parametry zapytania (nieprawidłowy UUID, data, sort, order, limit)
  - `401`: Brak autoryzacji
  - `403`: Brak dostępu
  - `500`: Błąd serwera

### 4.3 GET /api/workout-sessions/{id}

- **Status**: `200 OK`
- **Body**: `SessionDetailDTO` (sesja z pełną listą ćwiczeń i serii)
- **Błędy**:
  - `400`: Nieprawidłowy UUID w ścieżce
  - `404`: Sesja nie istnieje lub nie należy do użytkownika
  - `401`: Brak autoryzacji
  - `403`: Brak dostępu
  - `500`: Błąd serwera

### 4.4 PATCH /api/workout-sessions/{id}/status

- **Status**: `200 OK`
- **Body**: `SessionSummaryDTO` (zaktualizowana sesja)
- **Błędy**:
  - `400`: Nieprawidłowy UUID, nieprawidłowy status, nieprawidłowe przejście stanu
  - `404`: Sesja nie istnieje lub nie należy do użytkownika
  - `409`: Próba ustawienia `in_progress` gdy użytkownik ma już inną sesję `in_progress`
  - `401`: Brak autoryzacji
  - `403`: Brak dostępu
  - `500`: Błąd serwera

## 5. Przepływ danych

### 5.1 POST /api/workout-sessions

1. Pobierz sesję użytkownika przez Supabase auth (server-side client). Wymuś obecność `user.id`.
2. Waliduj body przez Zod schema (`sessionStartSchema`).
3. Sprawdź, czy użytkownik ma sesję `in_progress`:
   - Query: `SELECT * FROM workout_sessions WHERE user_id = ? AND status = 'in_progress' LIMIT 1`
   - Jeśli istnieje, zwróć ją z pełnymi szczegółami (GET /{id} logic) i status `200`.
4. Jeśli nie ma sesji `in_progress`:
   - Zweryfikuj, że `workout_plan_id` istnieje i należy do użytkownika.
   - Pobierz plan z ćwiczeniami:
     - `SELECT * FROM workout_plans WHERE id = ? AND user_id = ?`
     - `SELECT * FROM workout_plan_exercises WHERE plan_id = ? ORDER BY section_type, section_position`
   - Jeśli plan nie istnieje lub nie ma ćwiczeń, zwróć `404`.
5. Utwórz sesję:
   - `INSERT INTO workout_sessions (user_id, workout_plan_id, status, plan_name_at_time, started_at, current_position, last_action_at) VALUES (?, ?, 'in_progress', ?, now(), 0, now())`
6. Dla każdego ćwiczenia w planie:
   - Pobierz szczegóły ćwiczenia: `SELECT * FROM exercises WHERE id = ? AND user_id = ?`
   - Oblicz `position` (flattened: Warm-up pozycje 1-N, Main Workout N+1-M, Cool-down M+1-K)
   - `INSERT INTO workout_session_exercises` z snapshotami:
     - `exercise_title_at_time`, `exercise_type_at_time`, `exercise_part_at_time` z `exercises`
     - `planned_*` z `workout_plan_exercises` (lub z `exercises` jako fallback jeśli NULL w planie)
     - `position` obliczone
     - `actual_*` początkowo NULL (będą wypełnione podczas treningu)
7. Pobierz utworzoną sesję z ćwiczeniami i seriami (użyj logiki z GET /{id}).
8. Zwróć `SessionDetailDTO` z status `201`.

### 5.2 GET /api/workout-sessions

1. Pobierz sesję użytkownika. Wymuś obecność `user.id`.
2. Waliduj query params przez Zod schema (`sessionListQuerySchema`).
3. Zbuduj zapytanie:
   - Filtruj po `user_id = session.user.id`.
   - Opcjonalny filtr `status` jeśli podany.
   - Opcjonalny filtr `workout_plan_id` jeśli podany.
   - Opcjonalny filtr `from` (started_at >= from) jeśli podany.
   - Opcjonalny filtr `to` (started_at <= to) jeśli podany.
   - Sortowanie: `sort` (domyślnie `started_at`) + `order` (domyślnie `desc`).
   - Paginacja kursorem: jeśli `cursor` podany, dekoduj i zastosuj filtr.
   - Limit: `limit` (domyślnie 20, max 100) + 1 dla `nextCursor`.
4. Wykonaj zapytanie do `workout_sessions`.
5. Jeśli `limit + 1` wyników, ostatni element to `nextCursor`.
6. Mapuj wyniki do `SessionSummaryDTO` (bez ćwiczeń i serii).
7. Zwróć `{ items, nextCursor }`.

### 5.3 GET /api/workout-sessions/{id}

1. Pobierz sesję użytkownika. Wymuś obecność `user.id`.
2. Waliduj `id` jako UUID.
3. Pobierz sesję z `workout_sessions` gdzie `id = {id}` AND `user_id = session.user.id`.
4. Jeśli nie znaleziono, zwróć `404`.
5. Pobierz wszystkie ćwiczenia z `workout_session_exercises` gdzie `session_id = {id}`, posortowane po `position`.
6. Dla każdego ćwiczenia, pobierz serie z `workout_session_sets` gdzie `session_exercise_id = {exercise.id}`, posortowane po `set_number`.
7. Zbuduj `SessionDetailDTO` z sesją, ćwiczeniami i seriami.
8. Zwróć `SessionDetailDTO`.

### 5.4 PATCH /api/workout-sessions/{id}/status

1. Pobierz sesję użytkownika. Wymuś obecność `user.id`.
2. Waliduj `id` jako UUID.
3. Waliduj body przez Zod schema (`sessionStatusUpdateSchema`).
4. Pobierz istniejącą sesję z `workout_sessions` gdzie `id = {id}` AND `user_id = session.user.id`.
5. Jeśli nie znaleziono, zwróć `404`.
6. Walidacja przejścia stanu:
   - Jeśli nowy status to `in_progress`:
     - Sprawdź, czy użytkownik ma już inną sesję `in_progress` (oprócz aktualnej):
       - `SELECT * FROM workout_sessions WHERE user_id = ? AND status = 'in_progress' AND id != ? LIMIT 1`
     - Jeśli tak, zwróć `409 Conflict`.
7. Przygotuj update:
   - Jeśli nowy status to `completed` i `completed_at` jest NULL, ustaw `completed_at = now()`.
   - Jeśli nowy status to `in_progress`, nie modyfikuj `completed_at`.
   - Zaktualizuj `status` i `last_action_at = now()`.
8. Wykonaj update: `UPDATE workout_sessions SET status = ?, completed_at = ?, last_action_at = now() WHERE id = ? AND user_id = ?`.
9. Pobierz zaktualizowaną sesję (użyj logiki z GET /{id}).
10. Zwróć `SessionSummaryDTO` (lub `SessionDetailDTO` jeśli potrzebne pełne szczegóły).

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnienie

- Wymagaj aktywnej sesji Supabase dla wszystkich operacji.
- Użyj server-side Supabase client (`createClient` z `@/db/supabase.server`).
- Pobierz `user.id` z sesji; nie ufaj wartościom z klienta.

### 6.2 Autoryzacja

- Filtrowanie po `user_id` w każdej operacji; nie ujawniaj istnienia cudzych zasobów (`404` zamiast `403` po sprawdzeniu właściciela).
- Dla POST: weryfikuj, że `workout_plan_id` należy do użytkownika przed utworzeniem sesji.
- Dla GET/PATCH: weryfikuj, że sesja należy do użytkownika przed zwróceniem/aktualizacją.
- RLS w bazie zapewnia dodatkową warstwę ochrony (jeśli włączone).

### 6.3 Walidacja danych

- Zod schemas z whitelistą pól; odrzuć nieznane pola.
- Limity dla `limit` (max 100) i długości dat (`from`/`to`).
- UUID validation dla wszystkich identyfikatorów.
- Enum validation dla `status`, `sort`, `order`.
- ISO 8601 date validation dla `from`/`to`.

### 6.4 Ochrona przed enumeration

- Brak rozróżnienia `404/403` po sprawdzeniu własności (zawsze `404` jeśli nie znaleziono lub nie należy do użytkownika).

### 6.5 Logika biznesowa

- Unique constraint w bazie (`workout_sessions_one_in_progress`) zapobiega utworzeniu wielu sesji `in_progress`.
- Weryfikacja przed update statusu na `in_progress` zapobiega konfliktom.

## 7. Obsługa błędów

### 7.1 Błędy walidacji (400)

- Nieprawidłowy format UUID w `workout_plan_id`, `id`, `plan_id`.
- Nieprawidłowy format daty w `from`/`to`.
- Nieprawidłowe wartości enum (`status`, `sort`, `order`).
- `limit` poza zakresem 1-100.
- Brak wymaganych pól (`workout_plan_id` w POST, `status` w PATCH).

### 7.2 Błędy autoryzacji (401/403)

- Brak aktywnej sesji użytkownika.
- Nieprawidłowy token autoryzacji.
- RLS policy rejection (jeśli włączone).

### 7.3 Błędy nie znalezionych zasobów (404)

- Plan nie istnieje lub nie należy do użytkownika (POST).
- Sesja nie istnieje lub nie należy do użytkownika (GET/PATCH).
- Ćwiczenie w planie nie istnieje lub nie należy do użytkownika (POST - podczas tworzenia snapshotów).

### 7.4 Błędy konfliktów (409)

- Próba ustawienia `in_progress` gdy użytkownik ma już inną sesję `in_progress` (PATCH).
- Unique constraint violation w bazie (np. próba utworzenia drugiej sesji `in_progress` - ale to powinno być obsłużone przez logikę biznesową zwracającą 200).

### 7.5 Błędy serwera (500)

- Błąd połączenia z bazą danych.
- Nieoczekiwany błąd podczas tworzenia snapshotów.
- Błąd podczas pobierania danych z bazy.

### 7.6 Mapowanie błędów bazy danych

- `23505` (unique_violation) → `409 Conflict`
- `23503` (foreign_key_violation) → `404 Not Found` lub `409 Conflict` (w zależności od kontekstu)
- `23502` (not_null_violation) → `400 Bad Request`
- Inne błędy Postgres → `500 Internal Server Error`

### 7.7 Logowanie błędów

- Przy `500`: loguj przez `console.error` z pełnym kontekstem (endpoint, user_id, error message, stack trace).
- Opcjonalnie: zapisz do tabeli `error_logs` w Supabase (jeśli istnieje) dla monitoringu.

## 8. Rozważania dotyczące wydajności

### 8.1 Zapytania do bazy danych

- **POST**:

  - Jeden query do sprawdzenia sesji `in_progress`.
  - Jeden query do weryfikacji planu.
  - Jeden query do pobrania ćwiczeń planu.
  - Batch insert dla ćwiczeń sesji (jeden INSERT z wieloma wierszami).
  - Jeden query do pobrania utworzonej sesji z ćwiczeniami.
  - **Optymalizacja**: Użyj transakcji jeśli możliwe (Supabase RPC) lub wykonaj sekwencyjnie z rollback w przypadku błędu.

- **GET lista**:

  - Jeden query z filtrami, sortowaniem i limitem.
  - **Optymalizacja**: Użyj indeksów na `user_id`, `status`, `workout_plan_id`, `started_at`.

- **GET szczegóły**:

  - Jeden query do sesji.
  - Jeden query do ćwiczeń sesji.
  - Jeden query do serii (z JOIN lub osobne query per ćwiczenie).
  - **Optymalizacja**: Użyj JOIN lub batch query dla serii zamiast N+1 queries.

- **PATCH status**:
  - Jeden query do sprawdzenia istniejącej sesji `in_progress` (jeśli nowy status to `in_progress`).
  - Jeden UPDATE query.
  - Jeden query do pobrania zaktualizowanej sesji.
  - **Optymalizacja**: Można zwrócić zaktualizowane dane bez dodatkowego query (UPDATE ... RETURNING).

### 8.2 Indeksy bazy danych

- `idx_workout_sessions_user_id`: Dla filtrowania po użytkowniku.
- `idx_workout_sessions_user_id_status`: Dla sprawdzania sesji `in_progress`.
- `idx_workout_sessions_user_id_started_at`: Dla sortowania i filtrowania po dacie.
- `idx_workout_sessions_workout_plan_id`: Dla filtrowania po planie.
- `idx_workout_session_exercises_session_id`: Dla pobierania ćwiczeń sesji.
- `idx_workout_session_sets_session_exercise_id`: Dla pobierania serii.

### 8.3 Paginacja

- Użyj cursor-based paginacji dla lepszej wydajności przy dużych zbiorach danych.
- Limit domyślny: 20, max: 100.
- Encode/decode cursor jako base64url JSON.

### 8.4 Snapshotowanie

- Snapshoty są tworzone jednorazowo przy utworzeniu sesji.
- Nie modyfikuj snapshotów po utworzeniu (read-only).
- To zapewnia stabilność historii nawet po zmianie/usunięciu planu lub ćwiczenia.

## 9. Etapy wdrożenia

### 9.1 Przygotowanie typów i walidacji

1. **Utwórz schematy Zod** (`src/lib/validation/workout-sessions.ts`):

   - `sessionStartSchema`: Walidacja body dla POST
   - `sessionListQuerySchema`: Walidacja query params dla GET lista
   - `sessionStatusUpdateSchema`: Walidacja body dla PATCH
   - Funkcje `encodeCursor`/`decodeCursor` dla paginacji (podobne do workout-plans)
   - Stałe: `SESSION_MAX_LIMIT = 100`, `SESSION_DEFAULT_LIMIT = 20`

2. **Sprawdź typy w `src/types.ts`**:
   - Upewnij się, że `SessionStartCommand`, `SessionStatusUpdateCommand`, `SessionListQueryParams`, `SessionSummaryDTO`, `SessionDetailDTO` są zdefiniowane
   - Jeśli brakuje, dodaj je zgodnie z sekcją 3.1

### 9.2 Utworzenie repozytorium

1. **Utwórz `src/repositories/workout-sessions.ts`**:

   - `findInProgressSession(userId)`: Znajdź sesję `in_progress` użytkownika
   - `findWorkoutSessionById(client, userId, id)`: Pobierz sesję po ID
   - `findWorkoutSessionsByUserId(client, userId, params)`: Lista sesji z filtrami, sortowaniem, paginacją
   - `insertWorkoutSession(client, userId, input)`: Wstaw nową sesję
   - `insertWorkoutSessionExercises(client, sessionId, exercises)`: Batch insert ćwiczeń sesji
   - `updateWorkoutSessionStatus(client, userId, id, status)`: Aktualizuj status sesji
   - `findWorkoutSessionExercises(client, sessionId)`: Pobierz ćwiczenia sesji
   - `findWorkoutSessionSets(client, sessionExerciseIds)`: Pobierz serie dla ćwiczeń (batch)
   - Funkcje pomocnicze: `mapToSummaryDTO`, `mapToDetailDTO`, `applyCursorFilter`

2. **Logika snapshotowania**:
   - Funkcja `createSessionSnapshots(plan, planExercises, exercises)`: Przygotuj dane do wstawienia ćwiczeń sesji
   - Oblicz `position` (flattened across sections)
   - Mapuj `planned_*` z planu lub ćwiczenia jako fallback

### 9.3 Utworzenie serwisu

1. **Utwórz `src/services/workout-sessions.ts`**:
   - `startWorkoutSessionService(userId, payload)`: Logika POST
     - Sprawdź sesję `in_progress`
     - Zweryfikuj plan
     - Utwórz sesję z snapshotami
     - Zwróć pełne szczegóły
   - `listWorkoutSessionsService(userId, query)`: Logika GET lista
     - Waliduj query params
     - Pobierz sesje z filtrami
     - Zwróć `{ items, nextCursor }`
   - `getWorkoutSessionService(userId, id)`: Logika GET szczegóły
     - Pobierz sesję
     - Pobierz ćwiczenia i serie
     - Zwróć `SessionDetailDTO`
   - `updateWorkoutSessionStatusService(userId, id, payload)`: Logika PATCH
     - Waliduj przejście stanu
     - Sprawdź konflikt z inną sesją `in_progress`
     - Zaktualizuj status
     - Zwróć zaktualizowaną sesję
   - Funkcje pomocnicze: `assertUser`, `parseOrThrow`, `mapDbError` (podobne do workout-plans)

### 9.4 Utworzenie route handlers

1. **Utwórz `src/app/api/workout-sessions/route.ts`**:

   - `POST`: Wywołaj `startWorkoutSessionService`, zwróć `201` lub `200`
   - `GET`: Wywołaj `listWorkoutSessionsService`, zwróć `200`
   - Obsługa błędów: `ServiceError`, `ZodError`, nieoczekiwane błędy

2. **Utwórz `src/app/api/workout-sessions/[id]/route.ts`**:

   - `GET`: Wywołaj `getWorkoutSessionService`, zwróć `200`
   - Obsługa błędów

3. **Utwórz `src/app/api/workout-sessions/[id]/status/route.ts`**:
   - `PATCH`: Wywołaj `updateWorkoutSessionStatusService`, zwróć `200`
   - Obsługa błędów

### 9.5 Testowanie

1. **Testy jednostkowe** (opcjonalne, jeśli jest setup):

   - Testy walidacji Zod schemas
   - Testy funkcji repozytorium (mock Supabase client)
   - Testy logiki serwisu

2. **Testy integracyjne** (ręczne lub automatyczne):
   - POST: Utworzenie nowej sesji
   - POST: Zwrócenie istniejącej sesji `in_progress`
   - POST: Błąd gdy plan nie istnieje
   - GET lista: Filtrowanie, sortowanie, paginacja
   - GET szczegóły: Pełne dane z ćwiczeniami i seriami
   - PATCH: Aktualizacja statusu na `completed`
   - PATCH: Aktualizacja statusu na `in_progress` (resume)
   - PATCH: Konflikt przy próbie utworzenia drugiej sesji `in_progress`
   - Weryfikacja snapshotów (zmiana planu nie wpływa na istniejące sesje)

### 9.6 Dokumentacja i cleanup

1. **Dokumentacja**:

   - Zaktualizuj `README.md` z informacjami o endpointach (jeśli istnieje)
   - Dodaj przykłady request/response w komentarzach lub osobnych plikach

2. **Cleanup**:
   - Usuń nieużywane importy
   - Sprawdź linter errors
   - Upewnij się, że wszystkie funkcje mają odpowiednie typy TypeScript

### 9.7 Weryfikacja zgodności

1. **Sprawdź zgodność z API spec**:

   - Wszystkie endpointy zaimplementowane
   - Wszystkie parametry query obsłużone
   - Wszystkie kody statusu HTTP zgodne ze spec
   - Logika biznesowa zgodna (resume vs create)

2. **Sprawdź zgodność z DB schema**:

   - Wszystkie pola używane poprawnie
   - Snapshoty tworzone zgodnie ze schematem
   - Unique constraints respektowane

3. **Sprawdź zgodność z regułami implementacji**:
   - Error handling na początku funkcji
   - Early returns dla błędów
   - Guard clauses
   - Proper logging
