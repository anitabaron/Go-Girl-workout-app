# API Endpoint Implementation Plan: Session Exercise Autosave

## 1. Przegląd punktu końcowego

Endpoint `PATCH /api/workout-sessions/{id}/exercises/{order}` umożliwia autosave stanu ćwiczenia w sesji treningowej. Endpoint obsługuje:

- Aktualizację parametrów faktycznych ćwiczenia (actual_sets, actual_reps, actual_duration_seconds)
- Aktualizację parametrów planowanych (planned\_\*), jeśli klient chce zachować parzystość z planem
- Zastąpienie istniejących serii nowymi danymi (destructive replace)
- Oznaczenie ćwiczenia jako pominiętego (is_skipped)
- Automatyczne przeliczenie rekordów osobistych (PR) dla ćwiczenia
- Aktualizację kursora sesji (current_position) - wskaźnika aktualnego ćwiczenia w sesji
- Aktualizację timestampu ostatniej akcji (last_action_at)

**Główny cel**: Endpoint służy przede wszystkim do aktualizacji aktualnie wykonanych wartości ćwiczenia (reps, duration, sets) wraz z zapisem poszczególnych serii.

**Logika kursora (`current_position`)**:

- `current_position` w sesji wskazuje, na którym ćwiczeniu (order) użytkownik aktualnie się znajduje
- Domyślnie po zapisie ćwiczenia, kursor pozostaje na tym samym ćwiczeniu (`current_position = order`)
- Jeśli użytkownik zakończył ćwiczenie i przechodzi do następnego, można użyć flagi `advance_cursor_to_next = true`, aby przesunąć kursor do następnego ćwiczenia (order + 1)
- Kursor jest używany do śledzenia postępu w sesji i umożliwia wznowienie sesji od właściwego miejsca

Endpoint jest używany w scenariuszach:

- **Główny scenariusz**: Aktualizacja aktualnie wykonanych reps, duration, sets podczas wykonywania ćwiczenia
- Autosave podczas przejścia do następnego ćwiczenia (z przesunięciem kursora)
- Autosave podczas pauzy sesji (bez przesunięcia kursora)
- Autosave podczas pominięcia ćwiczenia (skip)
- Ręczna edycja poprzednich ćwiczeń (bez przesunięcia kursora)

## 2. Szczegóły żądania

### 2.1 Metoda HTTP i URL

- **Metoda HTTP**: `PATCH`
- **URL Pattern**: `/api/workout-sessions/{id}/exercises/{order}`
- **Path Parameters**:
  - `id`: UUID sesji treningowej (wymagane)
  - `order`: Liczba całkowita > 0 reprezentująca kolejność ćwiczenia w sesji (wymagane)

### 2.2 Request Body

```typescript
{
  // Parametry faktyczne (opcjonalne)
  actual_sets?: number | null;
  actual_reps?: number | null;
  actual_duration_seconds?: number | null;

  // Parametry planowane (opcjonalne, klient może wysłać dla parzystości z planem)
  planned_sets?: number | null;
  planned_reps?: number | null;
  planned_duration_seconds?: number | null;
  planned_rest_seconds?: number | null;

  // Flaga pominięcia (opcjonalne)
  is_skipped?: boolean;

  // Serie ćwiczenia (opcjonalne, zastępuje wszystkie istniejące serie)
  sets?: Array<{
    set_number: number; // > 0, wymagane
    reps?: number | null; // >= 0
    duration_seconds?: number | null; // >= 0
    weight_kg?: number | null; // >= 0
  }>;

  // Flaga przesunięcia kursora do następnego ćwiczenia (opcjonalne)
  // true = przesuń kursor do następnego ćwiczenia (order + 1), jeśli istnieje
  // false lub brak = pozostaw kursor na aktualnym ćwiczeniu (order)
  advance_cursor_to_next?: boolean;
}
```

### 2.3 Walidacja danych wejściowych

#### 2.3.1 Path Parameters

- `id`:

  - Wymagane
  - Format: UUID (regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`)
  - Sesja musi istnieć i należeć do zalogowanego użytkownika
  - Sesja musi mieć status `in_progress` (w przeciwnym razie `409 Conflict`)

- `order`:
  - Wymagane
  - Typ: liczba całkowita
  - Wartość: `> 0`
  - Ćwiczenie o danym `order` musi istnieć w sesji

#### 2.3.2 Request Body

- `actual_sets`:

  - Opcjonalne
  - Typ: `number | null`
  - Jeśli podane: `>= 0` (integer)

- `actual_reps`:

  - Opcjonalne
  - Typ: `number | null`
  - Jeśli podane: `>= 0` (integer)

- `actual_duration_seconds`:

  - Opcjonalne
  - Typ: `number | null`
  - Jeśli podane: `>= 0` (integer)

- `planned_sets`, `planned_reps`, `planned_duration_seconds`, `planned_rest_seconds`:

  - Opcjonalne
  - Typ: `number | null`
  - Jeśli podane: `> 0` dla sets/reps/duration, `>= 0` dla rest (integer)

- `is_skipped`:

  - Opcjonalne
  - Typ: `boolean`
  - Domyślnie: `false`

- `sets`:

  - Opcjonalne
  - Typ: tablica obiektów
  - Jeśli podane:
    - Każdy element musi mieć `set_number` (integer > 0)
    - Każdy element musi mieć co najmniej jedną metrykę niepustą: `reps`, `duration_seconds`, lub `weight_kg`
    - Wszystkie wartości metryk: `>= 0`
    - `set_number` musi być unikalne w tablicy
    - Jeśli `is_skipped = true`, dozwolone są puste serie (ale nie jest to wymagane)

- `advance_cursor_to_next`:
  - Opcjonalne
  - Typ: `boolean`
  - Domyślnie: `false`
  - **Logika**:
    - `true`: Przesuń kursor sesji (`current_position`) do następnego ćwiczenia (order + 1), jeśli istnieje
    - `false` lub brak: Pozostaw kursor na aktualnym ćwiczeniu (order)
    - Kursor jest używany do śledzenia postępu w sesji i umożliwia wznowienie od właściwego miejsca

#### 2.3.3 Reguły biznesowe

- Jeśli `is_skipped = true`, dozwolone są puste serie (lub brak serii)
- Jeśli `is_skipped = false` i podano serie, każda seria musi mieć co najmniej jedną metrykę
- Jeśli `advance_cursor_to_next = true`, kursor sesji zostanie przesunięty do następnego ćwiczenia (order + 1), jeśli istnieje
- Jeśli `advance_cursor_to_next = false` lub nie podano, kursor pozostaje na aktualnym ćwiczeniu (order)

## 3. Wykorzystywane typy

### 3.1 DTOs i Command Modele (z `src/types.ts`)

- `SessionExerciseAutosaveCommand`: Typ dla body requestu (już zdefiniowany w `src/types.ts`)

  ```typescript
  type SessionExerciseAutosaveCommand = Partial<
    Pick<
      TablesUpdate<"workout_session_exercises">,
      | "actual_duration_seconds"
      | "actual_reps"
      | "actual_sets"
      | "planned_duration_seconds"
      | "planned_reps"
      | "planned_rest_seconds"
      | "planned_sets"
      | "is_skipped"
    >
  > & {
    sets?: SessionExerciseSetCommand[];
    advance_cursor_to_next?: boolean;
  };
  ```

- `SessionExerciseSetCommand`: Typ dla pojedynczej serii (już zdefiniowany)

  ```typescript
  type SessionExerciseSetCommand = Pick<
    TablesInsert<"workout_session_sets">,
    "set_number" | "reps" | "duration_seconds" | "weight_kg"
  >;
  ```

- `SessionExerciseDTO`: Typ odpowiedzi (już zdefiniowany)
  ```typescript
  type SessionExerciseDTO = Omit<
    WorkoutSessionExerciseEntity,
    "session_id" | "created_at" | "updated_at"
  > & {
    sets: SessionExerciseSetDTO[];
  };
  ```

### 3.2 Typy odpowiedzi

- **Success Response (200 OK)**:

  ```typescript
  {
    data: SessionExerciseDTO & {
      cursor: {
        current_position: number;
        last_action_at: string;
      };
    };
  }
  ```

- **Error Responses**:
  - `400 Bad Request`: Błędy walidacji
  - `401 Unauthorized`: Brak autoryzacji
  - `403 Forbidden`: Brak dostępu do zasobu
  - `404 Not Found`: Sesja lub ćwiczenie nie znalezione
  - `409 Conflict`: Sesja nie jest w statusie `in_progress`
  - `500 Internal Server Error`: Błędy serwera

## 4. Szczegóły odpowiedzi

### 4.1 Success Response (200 OK)

Zwraca zaktualizowane ćwiczenie z seriami oraz aktualny kursor sesji:

```typescript
{
  data: {
    id: string;
    exercise_id: string;
    exercise_title_at_time: string;
    exercise_type_at_time: ExerciseType;
    exercise_part_at_time: ExercisePart;
    planned_sets: number | null;
    planned_reps: number | null;
    planned_duration_seconds: number | null;
    planned_rest_seconds: number | null;
    actual_sets: number | null;
    actual_reps: number | null;
    actual_duration_seconds: number | null;
    order: number;
    is_skipped: boolean;
    sets: Array<{
      id: string;
      set_number: number;
      reps: number | null;
      duration_seconds: number | null;
      weight_kg: number | null;
    }>;
    cursor: {
      current_position: number;
      last_action_at: string;
    }
  }
}
```

### 4.2 Error Responses

#### 4.2.1 400 Bad Request

```typescript
{
  message: string; // Opis błędu walidacji
  details?: string; // Szczegóły (opcjonalne)
}
```

Przykłady:

- "order musi być liczbą całkowitą większą od 0"
- "Każda seria musi mieć co najmniej jedną metrykę (reps, duration_seconds, lub weight_kg)"
- "Wartości metryk muszą być >= 0"

#### 4.2.2 401 Unauthorized

```typescript
{
  message: "Brak aktywnej sesji użytkownika.";
}
```

#### 4.2.3 403 Forbidden

```typescript
{
  message: "Brak dostępu do tej sesji treningowej.";
}
```

#### 4.2.4 404 Not Found

```typescript
{
  message: "Sesja treningowa nie została znaleziona." |
    "Ćwiczenie o podanej kolejności nie zostało znalezione w sesji.";
}
```

#### 4.2.5 409 Conflict

```typescript
{
  message: "Sesja treningowa nie jest w statusie 'in_progress'.";
}
```

#### 4.2.6 500 Internal Server Error

```typescript
{
  message: "Wystąpił błąd serwera.",
  details?: string; // Szczegóły błędu (tylko w development)
}
```

## 5. Przepływ danych

### 5.1 Sekwencja operacji

1. **Walidacja path parameters**:

   - Sprawdź format UUID dla `id`
   - Sprawdź, że `order` jest liczbą całkowitą > 0

2. **Walidacja autoryzacji**:

   - Pobierz `user_id` z sesji (Supabase Auth)
   - Jeśli brak, zwróć `401 Unauthorized`

3. **Walidacja request body** (Zod schema):

   - Zweryfikuj wszystkie pola zgodnie z regułami walidacji
   - Jeśli błąd, zwróć `400 Bad Request` z opisem

4. **Sprawdzenie istnienia sesji**:

   - Pobierz sesję z bazy danych po `id` i `user_id`
   - Jeśli nie istnieje, zwróć `404 Not Found`
   - Jeśli istnieje, ale `status !== 'in_progress'`, zwróć `409 Conflict`

5. **Sprawdzenie istnienia ćwiczenia**:

   - Pobierz ćwiczenie sesji po `session_id` i `order`
   - Jeśli nie istnieje, zwróć `404 Not Found`
   - Pobierz `exercise_id` z ćwiczenia sesji

6. **Przygotowanie danych dla funkcji DB**:

   - Mapuj `sets` na format JSONB dla funkcji `save_workout_session_exercise`
   - Przygotuj parametry funkcji (p_actual_sets, p_actual_reps, p_actual_duration_seconds, p_is_skipped, p_sets_data)
   - Jeśli podano `planned_*`, zaktualizuj je bezpośrednio w tabeli (funkcja DB nie obsługuje planned\_\*)

7. **Wywołanie funkcji bazy danych**:

   - Wywołaj `save_workout_session_exercise()` z parametrami
   - Funkcja:
     - Aktualizuje `workout_session_exercises` (actual_sets, actual_reps, actual_duration_seconds)
     - Zastępuje serie w `workout_session_sets` (delete + insert)
     - Przelicza PR dla ćwiczenia (`recalculate_pr_for_exercise`)
     - Aktualizuje `workout_sessions.last_action_at` i `current_position = order` (domyślnie pozostaje na aktualnym ćwiczeniu)

8. **Aktualizacja planned\_\* (jeśli podano)**:

   - Jeśli w request body są `planned_*`, zaktualizuj je bezpośrednio w `workout_session_exercises`

9. **Aktualizacja kursora (jeśli advance_cursor_to_next)**:

   - **Logika kursora**: `current_position` wskazuje, na którym ćwiczeniu (order) użytkownik aktualnie się znajduje
   - Jeśli `advance_cursor_to_next = true`:
     - Sprawdź, czy istnieje następne ćwiczenie (order + 1) w sesji
     - Jeśli tak, zaktualizuj `workout_sessions.current_position = order + 1` (przesuń do następnego)
     - Jeśli nie, pozostaw `current_position = order` (ostatnie ćwiczenie w sesji)
   - Jeśli `advance_cursor_to_next = false` lub nie podano:
     - Kursor pozostaje na aktualnym ćwiczeniu (`current_position = order`) - użytkownik nadal pracuje nad tym ćwiczeniem

10. **Pobranie zaktualizowanych danych**:

    - Pobierz zaktualizowane ćwiczenie z seriami
    - Pobierz aktualny kursor sesji (`current_position`, `last_action_at`)

11. **Mapowanie do DTO i odpowiedź**:
    - Mapuj dane do `SessionExerciseDTO`
    - Dodaj informacje o kursorze
    - Zwróć `200 OK` z danymi

### 5.2 Interakcje z bazą danych

#### 5.2.1 Funkcja `save_workout_session_exercise()`

Funkcja wykonuje atomowo:

- Walidację własności sesji (sprawdza `user_id`)
- Upsert ćwiczenia w sesji (update jeśli istnieje, insert jeśli nie)
- Zastąpienie serii (delete wszystkich + insert nowych)
- Przeliczenie PR dla ćwiczenia
- Aktualizację `last_action_at` i `current_position = order` w sesji

**Uwaga**: Funkcja nie obsługuje `planned_*` - te muszą być zaktualizowane osobno.

#### 5.2.2 Funkcja `recalculate_pr_for_exercise()`

Funkcja przelicza wszystkie typy PR dla ćwiczenia:

- `total_reps`: Suma wszystkich serii
- `max_duration`: Maksimum z pojedynczej serii
- `max_weight`: Maksimum z pojedynczej serii

#### 5.2.3 Tabele bazy danych

- `workout_sessions`: Aktualizacja `current_position`, `last_action_at`
- `workout_session_exercises`: Aktualizacja `actual_sets`, `actual_reps`, `actual_duration_seconds`, `is_skipped`, `planned_*` (jeśli podano)
- `workout_session_sets`: Usunięcie starych + wstawienie nowych serii
- `personal_records`: Aktualizacja przez `recalculate_pr_for_exercise()`

## 6. Względy bezpieczeństwa

### 6.1 Autoryzacja

- **Wymagana autoryzacja**: Endpoint wymaga zalogowanego użytkownika (Supabase Auth)
- **Walidacja własności**: Sprawdzenie, że sesja należy do zalogowanego użytkownika
- **RLS (Row-Level Security)**: Baza danych zapewnia izolację danych na poziomie użytkownika

### 6.2 Walidacja danych

- **Path parameters**: Walidacja UUID i liczby całkowitej
- **Request body**: Walidacja przez Zod schema z strict mode
- **Walidacja biznesowa**: Sprawdzenie statusu sesji (`in_progress`), istnienia ćwiczenia

### 6.3 Ochrona przed atakami

- **SQL Injection**: Używanie Supabase client z parametrami (nie raw SQL)
- **XSS**: Walidacja i sanitizacja danych wejściowych
- **CSRF**: Next.js App Router zapewnia ochronę CSRF dla API routes
- **Rate Limiting**: Rozważyć dodanie rate limitingu dla autosave (opcjonalne)

### 6.4 Bezpieczeństwo funkcji DB

- **SECURITY DEFINER**: Funkcja `save_workout_session_exercise` używa `SECURITY DEFINER` z walidacją `auth.uid()`
- **Walidacja własności**: Funkcja sprawdza własność sesji przed wykonaniem operacji

## 7. Obsługa błędów

### 7.1 Błędy walidacji (400 Bad Request)

| Błąd                      | Przyczyna                                  | Rozwiązanie                     |
| ------------------------- | ------------------------------------------ | ------------------------------- |
| Nieprawidłowy format UUID | `id` nie jest UUID                         | Zweryfikuj format UUID          |
| order <= 0                | `order` nie jest > 0                       | Użyj wartości > 0               |
| Brak metryk w serii       | Seria nie ma reps/duration/weight          | Dodaj co najmniej jedną metrykę |
| Wartości ujemne           | Metryki < 0                                | Użyj wartości >= 0              |
| Duplikat set_number       | W tablicy `sets` są duplikaty `set_number` | Użyj unikalnych `set_number`    |

### 7.2 Błędy autoryzacji (401/403)

| Błąd                   | Przyczyna                       | Rozwiązanie            |
| ---------------------- | ------------------------------- | ---------------------- |
| Brak sesji użytkownika | `user_id` nie jest dostępny     | Zaloguj użytkownika    |
| Brak dostępu           | Sesja nie należy do użytkownika | Sprawdź własność sesji |

### 7.3 Błędy zasobów (404 Not Found)

| Błąd                     | Przyczyna                                       | Rozwiązanie        |
| ------------------------ | ----------------------------------------------- | ------------------ |
| Sesja nie znaleziona     | `id` nie istnieje lub nie należy do użytkownika | Sprawdź `id` sesji |
| Ćwiczenie nie znalezione | `order` nie istnieje w sesji                    | Sprawdź `order`    |

### 7.4 Błędy konfliktu (409 Conflict)

| Błąd                  | Przyczyna                   | Rozwiązanie                               |
| --------------------- | --------------------------- | ----------------------------------------- |
| Sesja nie in_progress | Sesja ma status `completed` | Użyj sesji `in_progress` lub zmień status |

### 7.5 Błędy serwera (500 Internal Server Error)

| Błąd             | Przyczyna                                             | Rozwiązanie              |
| ---------------- | ----------------------------------------------------- | ------------------------ |
| Błąd bazy danych | Problem z połączeniem lub zapytaniem                  | Sprawdź logi serwera     |
| Błąd funkcji DB  | Funkcja `save_workout_session_exercise` zwróciła błąd | Sprawdź logi bazy danych |

### 7.6 Mapowanie błędów bazy danych

- **23505 (Unique violation)**: `409 Conflict` - Konflikt unikalności
- **23503 (Foreign key violation)**: `404 Not Found` - Zasób nie istnieje
- **23502 (Not null violation)**: `400 Bad Request` - Brak wymaganych pól
- **Inne błędy Postgres**: `500 Internal Server Error` - Błąd serwera

## 8. Rozważania dotyczące wydajności

### 8.1 Potencjalne wąskie gardła

1. **Przeliczenie PR**: Funkcja `recalculate_pr_for_exercise()` może być kosztowna dla ćwiczeń z dużą historią

   - **Rozwiązanie**: Funkcja jest zoptymalizowana z indeksami na `workout_session_sets`
   - **Monitoring**: Monitoruj czas wykonania funkcji

2. **Zastąpienie serii**: Delete + Insert dla serii może być kosztowne przy dużej liczbie serii

   - **Rozwiązanie**: Operacja jest atomowa i szybka dla typowych przypadków (< 20 serii)
   - **Alternatywa**: Rozważyć upsert zamiast delete+insert (wymaga dodatkowej logiki)

3. **Autosave frequency**: Częste wywołania autosave mogą obciążać bazę danych
   - **Rozwiązanie**: Implementacja debouncing po stronie klienta
   - **Rate limiting**: Rozważyć rate limiting na poziomie API (opcjonalne)

### 8.2 Optymalizacje

1. **Batch operations**: Użycie funkcji DB dla atomowych operacji (już zaimplementowane)
2. **Indeksy**: Baza danych ma indeksy na kluczowych kolumnach:
   - `idx_workout_session_exercises_session_order` na `(session_id, order)`
   - `idx_workout_session_sets_session_exercise_id` na `session_exercise_id`
3. **Connection pooling**: Supabase zapewnia connection pooling automatycznie

### 8.3 Monitoring

- Monitoruj czas odpowiedzi endpointu
- Monitoruj czas wykonania funkcji `save_workout_session_exercise`
- Monitoruj czas wykonania funkcji `recalculate_pr_for_exercise`
- Śledź częstotliwość wywołań autosave

## 9. Etapy wdrożenia

### 9.1 Krok 1: Utworzenie schematu walidacji Zod

**Plik**: `src/lib/validation/workout-sessions.ts`

- Dodaj schema `sessionExerciseAutosaveSchema`:
  - Walidacja `actual_sets`, `actual_reps`, `actual_duration_seconds` (opcjonalne, integer >= 0)
  - Walidacja `planned_*` (opcjonalne, integer > 0 dla sets/reps/duration, >= 0 dla rest)
  - Walidacja `is_skipped` (opcjonalne, boolean)
  - Walidacja `sets` (opcjonalne, tablica z walidacją każdej serii)
  - Walidacja `advance_cursor_to_next` (opcjonalne, boolean)
- Walidacja reguł biznesowych:
  - Każda seria musi mieć co najmniej jedną metrykę
  - Wartości metryk >= 0
  - `set_number` unikalne w tablicy
  - Jeśli `is_skipped = true`, dozwolone puste serie

### 9.2 Krok 2: Utworzenie funkcji repository

**Plik**: `src/repositories/workout-sessions.ts`

- Dodaj funkcję `findWorkoutSessionExerciseByOrder()`:
  - Pobiera ćwiczenie sesji po `session_id` i `order`
  - Zwraca `{ data, error }`
- Dodaj funkcję `updateWorkoutSessionExercise()`:
  - Aktualizuje `planned_*` w `workout_session_exercises`
  - Zwraca `{ data, error }`
- Dodaj funkcję `updateWorkoutSessionCursor()`:
  - Aktualizuje `current_position` w `workout_sessions`
  - Zwraca `{ data, error }`
- Dodaj funkcję `findNextExerciseOrder()`:
  - Sprawdza, czy istnieje następne ćwiczenie (order + 1)
  - Zwraca `{ data: number | null, error }`
- Dodaj funkcję `callSaveWorkoutSessionExercise()`:
  - Wywołuje funkcję DB `save_workout_session_exercise` przez Supabase RPC
  - Mapuje `sets` na format JSONB
  - Zwraca `{ data: string (session_exercise_id), error }`

### 9.3 Krok 3: Utworzenie funkcji service

**Plik**: `src/services/workout-sessions.ts`

- Dodaj funkcję `autosaveWorkoutSessionExerciseService()`:
  - Parametry: `userId: string`, `sessionId: string`, `order: number`, `payload: unknown`
  - Walidacja path parameters (UUID, order > 0)
  - Walidacja request body (Zod schema)
  - Sprawdzenie istnienia sesji i statusu (`in_progress`)
  - Sprawdzenie istnienia ćwiczenia
  - Wywołanie funkcji DB `save_workout_session_exercise`
  - Aktualizacja `planned_*` (jeśli podano)
  - Aktualizacja kursora (jeśli `advance_cursor_to_next = true`)
  - Pobranie zaktualizowanych danych
  - Mapowanie do DTO z kursorem
  - Zwraca `SessionExerciseDTO & { cursor: { current_position, last_action_at } }`
  - Obsługa błędów z odpowiednimi kodami statusu

### 9.4 Krok 4: Utworzenie route handler

**Plik**: `src/app/api/workout-sessions/[id]/exercises/[order]/route.ts`

- Utworzenie katalogu `src/app/api/workout-sessions/[id]/exercises/[order]/`
- Implementacja funkcji `PATCH()`:
  - Pobranie `id` i `order` z path parameters
  - Pobranie `user_id` (z `process.env.DEFAULT_USER_ID` lub Supabase Auth)
  - Parsing request body
  - Wywołanie `autosaveWorkoutSessionExerciseService()`
  - Obsługa błędów z `respondWithServiceError()`
  - Zwrócenie odpowiedzi `200 OK` z danymi lub odpowiedniego kodu błędu

### 9.5 Krok 5: Aktualizacja typów (jeśli potrzebne)

**Plik**: `src/types.ts`

- Sprawdź, czy `SessionExerciseAutosaveCommand` jest poprawnie zdefiniowany
- Jeśli potrzebne, dodaj typ odpowiedzi z kursorem:
  ```typescript
  export type SessionExerciseAutosaveResponse = SessionExerciseDTO & {
    cursor: {
      current_position: number;
      last_action_at: string;
    };
  };
  ```

### 9.6 Krok 6: Testy (opcjonalne, ale zalecane)

- Testy jednostkowe dla schematu walidacji
- Testy jednostkowe dla funkcji repository
- Testy jednostkowe dla funkcji service
- Testy integracyjne dla route handler
- Testy edge cases:
  - Puste serie przy `is_skipped = true`
  - `advance_cursor_to_next = true` na ostatnim ćwiczeniu
  - Aktualizacja `planned_*`
  - Błędy walidacji

### 9.7 Krok 7: Dokumentacja i przykład requestu

**Plik**: `src/lib/example-body/example-workout-session-exercise-patch-request.json`

- Sprawdź, czy plik istnieje i jest aktualny
- Jeśli nie, zaktualizuj przykład zgodnie z aktualną specyfikacją

### 9.8 Krok 8: Weryfikacja implementacji

- Sprawdź, czy endpoint działa zgodnie ze specyfikacją
- Sprawdź, czy wszystkie błędy są obsługiwane poprawnie
- Sprawdź, czy funkcja DB jest wywoływana poprawnie
- Sprawdź, czy PR są przeliczane poprawnie
- Sprawdź, czy kursor jest aktualizowany poprawnie
- Sprawdź, czy `planned_*` są aktualizowane (jeśli podano)

## 10. Uwagi implementacyjne

### 10.1 Funkcja DB vs Service Layer

- Funkcja DB `save_workout_session_exercise` obsługuje tylko `actual_sets`, `actual_reps`, `actual_duration_seconds` i `sets`
- `planned_*` muszą być aktualizowane osobno w service layer
- `advance_cursor_to_next` musi być obsługiwane w service layer (funkcja DB zawsze ustawia `current_position = order`)

### 10.2 Mapowanie sets do JSONB

Format JSONB dla funkcji DB:

```json
[
  { "reps": 10, "duration_seconds": null, "weight_kg": 20.5 },
  { "reps": 8, "duration_seconds": null, "weight_kg": 20.5 }
]
```

### 10.3 Aktualizacja kursora

**Cel kursora**: `current_position` w sesji wskazuje, na którym ćwiczeniu (order) użytkownik aktualnie się znajduje. Umożliwia to śledzenie postępu i wznowienie sesji od właściwego miejsca.

**Logika aktualizacji**:

- Domyślnie (funkcja DB): Po zapisie ćwiczenia, kursor pozostaje na tym samym ćwiczeniu (`current_position = order`)
- Jeśli `advance_cursor_to_next = true`:
  - Sprawdź, czy istnieje następne ćwiczenie (order + 1) w sesji
  - Jeśli tak, ustaw `current_position = order + 1` (użytkownik przeszedł do następnego ćwiczenia)
  - Jeśli nie, pozostaw `current_position = order` (ostatnie ćwiczenie w sesji)
- Jeśli `advance_cursor_to_next = false` lub nie podano:
  - Funkcja DB już ustawiła `current_position = order`, więc nie trzeba aktualizować
  - Użytkownik nadal pracuje nad tym samym ćwiczeniem

### 10.4 Obsługa błędów funkcji DB

Funkcja DB może zwrócić błędy:

- `Session not found`: Mapuj na `404 Not Found`
- `Access denied`: Mapuj na `403 Forbidden`
- Inne błędy: Mapuj na `500 Internal Server Error`

### 10.5 Atomowość operacji

- Funkcja DB zapewnia atomowość dla `actual_sets`, `actual_reps`, `actual_duration_seconds`, `sets`, PR recalculation
- Aktualizacja `planned_*` i kursora powinna być wykonana w tej samej transakcji (jeśli możliwe)
- Jeśli nie można użyć transakcji, rozważyć kolejność operacji (najpierw funkcja DB, potem aktualizacje)
