# API Endpoint Implementation Plan: Session Timer Update

## 1. Przegląd punktu końcowego

Endpoint `PATCH /api/workout-sessions/{id}/timer` umożliwia aktualizację stanu timera dla aktywnej sesji treningowej. Endpoint obsługuje:

- **Start/Resume timera**: Ustawienie `last_timer_started_at` bez zmiany `active_duration_seconds`
- **Pause/Exit timera**: Obliczenie czasu, który upłynął od `last_timer_started_at`, dodanie go do `active_duration_seconds` (cumulative), ustawienie `last_timer_stopped_at`
- **Aktualizacja czasu aktywnego**: `active_duration_seconds` jest kumulatywne (dodaje do istniejącej wartości)

**Główny cel**: Endpoint służy do śledzenia rzeczywistego czasu aktywności sesji treningowej, z uwzględnieniem pauz i wznowień. Timer działa tylko wtedy, gdy asystent treningowy jest otwarty i aktywny.

**Logika timera**:
- `active_duration_seconds`: Suma wszystkich okresów aktywności timera (kumulatywna)
- `last_timer_started_at`: Timestamp ostatniego uruchomienia timera (start/resume)
- `last_timer_stopped_at`: Timestamp ostatniego zatrzymania timera (pause/exit)

Endpoint jest używany w scenariuszach:
- **Start sesji**: Uruchomienie timera przy rozpoczęciu sesji
- **Resume sesji**: Wznowienie timera po pauzie
- **Pause sesji**: Zatrzymanie timera z zapisem czasu aktywności
- **Exit sesji**: Zatrzymanie timera przy wyjściu z asystenta treningowego

## 2. Szczegóły żądania

### 2.1 Metoda HTTP i URL

- **Metoda HTTP**: `PATCH`
- **URL Pattern**: `/api/workout-sessions/{id}/timer`
- **Path Parameters**:
  - `id`: UUID sesji treningowej (wymagane)

### 2.2 Request Body

```typescript
{
  active_duration_seconds?: number; // Opcjonalne: dodaj do istniejącej wartości (cumulative)
  last_timer_started_at?: string; // Opcjonalne: ISO 8601 timestamp
  last_timer_stopped_at?: string; // Opcjonalne: ISO 8601 timestamp
}
```

**Uwagi**:
- Wszystkie pola są opcjonalne, ale co najmniej jedno musi być podane
- `active_duration_seconds` jest kumulatywne - wartość jest dodawana do istniejącej wartości w bazie danych
- `last_timer_started_at` i `last_timer_stopped_at` są ustawiane bezpośrednio (nie kumulatywne)
- Timestamps muszą być w formacie ISO 8601 (np. `"2024-01-15T10:30:00Z"`)

### 2.3 Walidacja danych wejściowych

#### 2.3.1 Path Parameters

- `id`:
  - Wymagane
  - Format: UUID (regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`)
  - Sesja musi istnieć i należeć do zalogowanego użytkownika
  - Sesja musi mieć status `in_progress` (w przeciwnym razie `409 Conflict`)

#### 2.3.2 Request Body

- `active_duration_seconds`:
  - Opcjonalne
  - Typ: `number`
  - Jeśli podane: `>= 0` (integer)
  - **Logika**: Wartość jest dodawana do istniejącej wartości w bazie danych (cumulative)

- `last_timer_started_at`:
  - Opcjonalne
  - Typ: `string`
  - Jeśli podane: Prawidłowy format ISO 8601 timestamp
  - **Logika**: Ustawiane bezpośrednio (nie kumulatywne)

- `last_timer_stopped_at`:
  - Opcjonalne
  - Typ: `string`
  - Jeśli podane: Prawidłowy format ISO 8601 timestamp
  - **Logika**: Ustawiane bezpośrednio (nie kumulatywne)

#### 2.3.3 Reguły biznesowe

- Co najmniej jedno pole musi być podane w request body
- Jeśli `last_timer_started_at` jest podane, oznacza to start/resume timera
- Jeśli `last_timer_stopped_at` jest podane, oznacza to pause/exit timera
- Jeśli `active_duration_seconds` jest podane, wartość jest dodawana do istniejącej wartości (cumulative)
- Sesja musi być w statusie `in_progress` (w przeciwnym razie `409 Conflict`)
- Jeśli `last_timer_stopped_at` jest podane, należy obliczyć czas, który upłynął od `last_timer_started_at` (jeśli istnieje) i dodać go do `active_duration_seconds`

## 3. Wykorzystywane typy

### 3.1 DTOs i Command Modele (z `src/types.ts`)

- `SessionTimerUpdateCommand`: Typ dla body requestu (już zdefiniowany w `src/types.ts`)

  ```typescript
  type SessionTimerUpdateCommand = {
    active_duration_seconds?: number; // Dodaj do istniejącej wartości (cumulative)
    last_timer_started_at?: string;
    last_timer_stopped_at?: string;
  };
  ```

### 3.2 Typy odpowiedzi

- **Success Response (200 OK)**:

  ```typescript
  {
    data: {
      id: string;
      active_duration_seconds: number;
      last_timer_started_at: string | null;
      last_timer_stopped_at: string | null;
    };
  }
  ```

- **Error Responses**:
  - `400 Bad Request`: Błędy walidacji
  - `401 Unauthorized`: Brak autoryzacji
  - `403 Forbidden`: Brak dostępu do zasobu
  - `404 Not Found`: Sesja nie znaleziona
  - `409 Conflict`: Sesja nie jest w statusie `in_progress`
  - `500 Internal Server Error`: Błędy serwera

## 4. Szczegóły odpowiedzi

### 4.1 Success Response (200 OK)

Zwraca zaktualizowane pola timera sesji:

```typescript
{
  data: {
    id: string;
    active_duration_seconds: number;
    last_timer_started_at: string | null;
    last_timer_stopped_at: string | null;
  }
}
```

### 4.2 Error Responses

#### 4.2.1 400 Bad Request

```typescript
{
  message: string; // Opis błędu walidacji
  code: "BAD_REQUEST";
  details?: string; // Szczegóły (opcjonalne)
}
```

Przykłady:
- "Nieprawidłowy format UUID identyfikatora sesji."
- "Co najmniej jedno pole musi być podane w body żądania."
- "active_duration_seconds musi być >= 0"
- "last_timer_started_at musi być prawidłowym timestampem ISO 8601"
- "last_timer_stopped_at musi być prawidłowym timestampem ISO 8601"

#### 4.2.2 401 Unauthorized

```typescript
{
  message: "Brak aktywnej sesji użytkownika.";
  code: "UNAUTHORIZED";
}
```

#### 4.2.3 403 Forbidden

```typescript
{
  message: "Brak dostępu do tej sesji treningowej.";
  code: "FORBIDDEN";
}
```

#### 4.2.4 404 Not Found

```typescript
{
  message: "Sesja treningowa nie została znaleziona.";
  code: "NOT_FOUND";
}
```

#### 4.2.5 409 Conflict

```typescript
{
  message: "Sesja treningowa nie jest w statusie 'in_progress'.";
  code: "CONFLICT";
}
```

#### 4.2.6 500 Internal Server Error

```typescript
{
  message: "Wystąpił błąd serwera.";
  details?: string; // Szczegóły błędu (tylko w development)
}
```

## 5. Przepływ danych

### 5.1 Sekwencja operacji

1. **Walidacja path parameters**:
   - Sprawdź format UUID dla `id`

2. **Walidacja autoryzacji**:
   - Pobierz `user_id` z sesji (Supabase Auth)
   - Jeśli brak, zwróć `401 Unauthorized`

3. **Walidacja request body** (Zod schema):
   - Zweryfikuj wszystkie pola zgodnie z regułami walidacji
   - Sprawdź, że co najmniej jedno pole jest podane
   - Jeśli błąd, zwróć `400 Bad Request` z opisem

4. **Sprawdzenie istnienia sesji**:
   - Pobierz sesję z bazy danych po `id` i `user_id`
   - Jeśli nie istnieje, zwróć `404 Not Found`
   - Jeśli istnieje, ale `status !== 'in_progress'`, zwróć `409 Conflict`

5. **Przygotowanie danych do aktualizacji**:
   - Jeśli `active_duration_seconds` jest podane:
     - Pobierz aktualną wartość `active_duration_seconds` z sesji
     - Dodaj nową wartość do istniejącej (cumulative)
   - Jeśli `last_timer_stopped_at` jest podane i `last_timer_started_at` istnieje w sesji:
     - Oblicz czas, który upłynął od `last_timer_started_at` do `last_timer_stopped_at`
     - Dodaj obliczony czas do `active_duration_seconds` (jeśli nie był podany w body, użyj obliczonego)
   - Przygotuj obiekt aktualizacji z polami: `active_duration_seconds`, `last_timer_started_at`, `last_timer_stopped_at`

6. **Aktualizacja sesji w bazie danych**:
   - Zaktualizuj `workout_sessions` z nowymi wartościami timera
   - Użyj Supabase client do aktualizacji

7. **Pobranie zaktualizowanych danych**:
   - Pobierz zaktualizowaną sesję z bazy danych
   - Wyciągnij pola timera: `active_duration_seconds`, `last_timer_started_at`, `last_timer_stopped_at`

8. **Mapowanie do DTO i odpowiedź**:
   - Mapuj dane do formatu odpowiedzi
   - Zwróć `200 OK` z danymi

### 5.2 Interakcje z bazą danych

#### 5.2.1 Tabele bazy danych

- `workout_sessions`: Aktualizacja pól timera:
  - `active_duration_seconds`: INTEGER (kumulatywny)
  - `last_timer_started_at`: TIMESTAMPTZ (nullable)
  - `last_timer_stopped_at`: TIMESTAMPTZ (nullable)

#### 5.2.2 Logika aktualizacji

**Scenariusz 1: Start/Resume timera**
- Klient wysyła: `{ last_timer_started_at: "2024-01-15T10:30:00Z" }`
- Akcja: Ustaw `last_timer_started_at`, nie zmieniaj `active_duration_seconds`

**Scenariusz 2: Pause/Exit timera**
- Klient wysyła: `{ last_timer_stopped_at: "2024-01-15T10:35:00Z" }`
- Akcja:
  1. Pobierz `last_timer_started_at` z sesji
  2. Oblicz: `elapsed = last_timer_stopped_at - last_timer_started_at`
  3. Dodaj `elapsed` do `active_duration_seconds`
  4. Ustaw `last_timer_stopped_at`

**Scenariusz 3: Ręczna aktualizacja czasu aktywnego**
- Klient wysyła: `{ active_duration_seconds: 60 }`
- Akcja: Dodaj 60 do istniejącej wartości `active_duration_seconds`

**Scenariusz 4: Kombinacja (pause z ręcznym czasem)**
- Klient wysyła: `{ active_duration_seconds: 30, last_timer_stopped_at: "2024-01-15T10:35:00Z" }`
- Akcja:
  1. Oblicz elapsed od `last_timer_started_at` (jeśli istnieje)
  2. Dodaj `active_duration_seconds` (30) do obliczonego elapsed
  3. Dodaj sumę do istniejącej wartości `active_duration_seconds`
  4. Ustaw `last_timer_stopped_at`

## 6. Względy bezpieczeństwa

### 6.1 Autoryzacja

- **Wymagana autoryzacja**: Endpoint wymaga zalogowanego użytkownika (Supabase Auth)
- **Walidacja własności**: Sprawdzenie, że sesja należy do zalogowanego użytkownika
- **RLS (Row-Level Security)**: Baza danych zapewnia izolację danych na poziomie użytkownika

### 6.2 Walidacja danych

- **Path parameters**: Walidacja UUID
- **Request body**: Walidacja przez Zod schema z strict mode
- **Walidacja biznesowa**: Sprawdzenie statusu sesji (`in_progress`), istnienia sesji
- **Walidacja timestampów**: Sprawdzenie formatu ISO 8601 i poprawności dat

### 6.3 Ochrona przed atakami

- **SQL Injection**: Używanie Supabase client z parametrami (nie raw SQL)
- **XSS**: Walidacja i sanitizacja danych wejściowych
- **CSRF**: Next.js App Router zapewnia ochronę CSRF dla API routes
- **Rate Limiting**: Rozważyć dodanie rate limitingu dla częstych aktualizacji timera (opcjonalne)

### 6.4 Bezpieczeństwo danych

- **Walidacja własności sesji**: Sprawdzenie, że sesja należy do użytkownika przed aktualizacją
- **Walidacja statusu**: Sprawdzenie, że sesja jest w statusie `in_progress` przed aktualizacją timera
- **Ochrona przed manipulacją**: Walidacja, że wartości są nieujemne i w prawidłowych zakresach

## 7. Obsługa błędów

### 7.1 Błędy walidacji (400 Bad Request)

| Błąd                      | Przyczyna                                  | Rozwiązanie                     |
| ------------------------- | ------------------------------------------ | ------------------------------- |
| Nieprawidłowy format UUID | `id` nie jest UUID                         | Zweryfikuj format UUID          |
| Brak pól w body           | Wszystkie pola są opcjonalne, ale co najmniej jedno musi być podane | Podaj co najmniej jedno pole    |
| active_duration_seconds < 0 | Wartość ujemna                             | Użyj wartości >= 0              |
| Nieprawidłowy timestamp   | `last_timer_started_at` lub `last_timer_stopped_at` nie jest ISO 8601 | Użyj prawidłowego formatu       |

### 7.2 Błędy autoryzacji (401/403)

| Błąd                   | Przyczyna                       | Rozwiązanie            |
| ---------------------- | ------------------------------- | ---------------------- |
| Brak sesji użytkownika | `user_id` nie jest dostępny     | Zaloguj użytkownika   |
| Brak dostępu           | Sesja nie należy do użytkownika | Sprawdź własność sesji |

### 7.3 Błędy zasobów (404 Not Found)

| Błąd                 | Przyczyna                                       | Rozwiązanie        |
| -------------------- | ----------------------------------------------- | ------------------ |
| Sesja nie znaleziona | `id` nie istnieje lub nie należy do użytkownika | Sprawdź `id` sesji |

### 7.4 Błędy konfliktu (409 Conflict)

| Błąd                  | Przyczyna                   | Rozwiązanie                               |
| --------------------- | --------------------------- | ----------------------------------------- |
| Sesja nie in_progress | Sesja ma status `completed` | Użyj sesji `in_progress` lub zmień status |

### 7.5 Błędy serwera (500 Internal Server Error)

| Błąd             | Przyczyna                            | Rozwiązanie              |
| ---------------- | ------------------------------------ | ------------------------ |
| Błąd bazy danych | Problem z połączeniem lub zapytaniem | Sprawdź logi serwera     |
| Błąd obliczeń    | Problem z obliczaniem czasu elapsed  | Sprawdź logi serwera     |

### 7.6 Mapowanie błędów bazy danych

- **23505 (Unique violation)**: `409 Conflict` - Konflikt unikalności
- **23503 (Foreign key violation)**: `404 Not Found` - Zasób nie istnieje
- **23502 (Not null violation)**: `400 Bad Request` - Brak wymaganych pól
- **Inne błędy Postgres**: `500 Internal Server Error` - Błąd serwera

## 8. Rozważania dotyczące wydajności

### 8.1 Potencjalne wąskie gardła

1. **Częste aktualizacje timera**: Timer może być aktualizowany bardzo często (np. co sekundę)
   - **Rozwiązanie**: Implementacja debouncing po stronie klienta (np. aktualizacja co 5-10 sekund)
   - **Rate limiting**: Rozważyć rate limiting na poziomie API (opcjonalne)

2. **Obliczanie elapsed time**: Obliczanie czasu, który upłynął od `last_timer_started_at` może być kosztowne przy częstych wywołaniach
   - **Rozwiązanie**: Obliczenia są proste (odejmowanie timestampów), nie powinny być problemem
   - **Optymalizacja**: Rozważyć cache'owanie `last_timer_started_at` w pamięci (opcjonalne)

### 8.2 Optymalizacje

1. **Batch operations**: Rozważyć batch updates dla częstych aktualizacji (opcjonalne)
2. **Indeksy**: Baza danych ma indeksy na kluczowych kolumnach:
   - `idx_workout_sessions_user_id` na `user_id`
   - `idx_workout_sessions_user_id_status` na `(user_id, status)`
3. **Connection pooling**: Supabase zapewnia connection pooling automatycznie

### 8.3 Monitoring

- Monitoruj czas odpowiedzi endpointu
- Monitoruj częstotliwość wywołań timera
- Śledź błędy walidacji i konflikty

## 9. Etapy wdrożenia

### 9.1 Krok 1: Utworzenie schematu walidacji Zod

**Plik**: `src/lib/validation/workout-sessions.ts`

- Dodaj schema `sessionTimerUpdateSchema`:
  - Walidacja `active_duration_seconds` (opcjonalne, integer >= 0)
  - Walidacja `last_timer_started_at` (opcjonalne, ISO 8601 timestamp)
  - Walidacja `last_timer_stopped_at` (opcjonalne, ISO 8601 timestamp)
  - Walidacja, że co najmniej jedno pole jest podane
  - Walidacja formatu timestampów ISO 8601

### 9.2 Krok 2: Utworzenie funkcji repository

**Plik**: `src/repositories/workout-sessions.ts`

- Dodaj funkcję `updateWorkoutSessionTimer()`:
  - Parametry: `client: DbClient`, `sessionId: string`, `updates: { active_duration_seconds?: number, last_timer_started_at?: string, last_timer_stopped_at?: string }`
  - Logika:
    - Pobierz aktualną sesję z bazą danych
    - Jeśli `active_duration_seconds` jest podane, dodaj do istniejącej wartości (cumulative)
    - Jeśli `last_timer_stopped_at` jest podane i `last_timer_started_at` istnieje, oblicz elapsed i dodaj do `active_duration_seconds`
    - Zaktualizuj sesję w bazie danych
    - Zwróć zaktualizowane dane timera
  - Zwraca `{ data: { active_duration_seconds, last_timer_started_at, last_timer_stopped_at }, error }`

### 9.3 Krok 3: Utworzenie funkcji service

**Plik**: `src/services/workout-sessions.ts`

- Dodaj funkcję `updateWorkoutSessionTimerService()`:
  - Parametry: `userId: string`, `sessionId: string`, `payload: unknown`
  - Walidacja path parameters (UUID)
  - Walidacja request body (Zod schema)
  - Sprawdzenie istnienia sesji i statusu (`in_progress`)
  - Wywołanie funkcji repository `updateWorkoutSessionTimer()`
  - Mapowanie do DTO
  - Zwraca `{ id, active_duration_seconds, last_timer_started_at, last_timer_stopped_at }`
  - Obsługa błędów z odpowiednimi kodami statusu

### 9.4 Krok 4: Utworzenie route handler

**Plik**: `src/app/api/workout-sessions/[id]/timer/route.ts`

- Utworzenie katalogu `src/app/api/workout-sessions/[id]/timer/`
- Implementacja funkcji `PATCH()`:
  - Pobranie `id` z path parameters
  - Pobranie `user_id` (z Supabase Auth)
  - Parsing request body
  - Wywołanie `updateWorkoutSessionTimerService()`
  - Obsługa błędów z `respondWithServiceError()`
  - Zwrócenie odpowiedzi `200 OK` z danymi lub odpowiedniego kodu błędu

### 9.5 Krok 5: Aktualizacja typów (jeśli potrzebne)

**Plik**: `src/types.ts`

- Sprawdź, czy `SessionTimerUpdateCommand` jest poprawnie zdefiniowany (już istnieje)
- Jeśli potrzebne, dodaj typ odpowiedzi:
  ```typescript
  export type SessionTimerUpdateResponse = {
    id: string;
    active_duration_seconds: number;
    last_timer_started_at: string | null;
    last_timer_stopped_at: string | null;
  };
  ```

### 9.6 Krok 6: Testy (opcjonalne, ale zalecane)

- Testy jednostkowe dla schematu walidacji
- Testy jednostkowe dla funkcji repository
- Testy jednostkowe dla funkcji service
- Testy integracyjne dla route handler
- Testy edge cases:
  - Start timera (tylko `last_timer_started_at`)
  - Pause timera (tylko `last_timer_stopped_at` z obliczeniem elapsed)
  - Resume timera (tylko `last_timer_started_at` po pause)
  - Ręczna aktualizacja czasu (tylko `active_duration_seconds`)
  - Kombinacja pól
  - Sesja nie w statusie `in_progress`
  - Błędy walidacji

### 9.7 Krok 7: Dokumentacja i przykład requestu

**Plik**: `src/lib/example-body/example-workout-session-timer-patch-request.json` (opcjonalne)

- Sprawdź, czy plik istnieje i jest aktualny
- Jeśli nie, utwórz przykład zgodnie z aktualną specyfikacją

### 9.8 Krok 8: Weryfikacja implementacji

- Sprawdź, czy endpoint działa zgodnie ze specyfikacją
- Sprawdź, czy wszystkie błędy są obsługiwane poprawnie
- Sprawdź, czy logika cumulative działa poprawnie
- Sprawdź, czy obliczanie elapsed time działa poprawnie
- Sprawdź, czy walidacja statusu `in_progress` działa poprawnie

## 10. Uwagi implementacyjne

### 10.1 Logika cumulative dla active_duration_seconds

- `active_duration_seconds` jest kumulatywne - wartość z request body jest dodawana do istniejącej wartości w bazie danych
- Przykład:
  - Baza danych: `active_duration_seconds = 100`
  - Request: `{ active_duration_seconds: 30 }`
  - Wynik: `active_duration_seconds = 130`

### 10.2 Obliczanie elapsed time

- Gdy `last_timer_stopped_at` jest podane, należy obliczyć czas, który upłynął od `last_timer_started_at` (jeśli istnieje w sesji)
- Obliczenie: `elapsed_seconds = (last_timer_stopped_at - last_timer_started_at) / 1000`
- Obliczony czas jest dodawany do `active_duration_seconds` (cumulative)
- Jeśli `active_duration_seconds` jest również podane w body, oba są dodawane do istniejącej wartości

### 10.3 Scenariusze użycia

**Scenariusz 1: Start timera**
```json
{
  "last_timer_started_at": "2024-01-15T10:30:00Z"
}
```
- Ustawia `last_timer_started_at`
- Nie zmienia `active_duration_seconds`

**Scenariusz 2: Pause timera**
```json
{
  "last_timer_stopped_at": "2024-01-15T10:35:00Z"
}
```
- Oblicza elapsed od `last_timer_started_at` (jeśli istnieje)
- Dodaje elapsed do `active_duration_seconds`
- Ustawia `last_timer_stopped_at`

**Scenariusz 3: Resume timera**
```json
{
  "last_timer_started_at": "2024-01-15T10:40:00Z"
}
```
- Ustawia `last_timer_started_at` (nowy start)
- Nie zmienia `active_duration_seconds` (czas już został zapisany przy pause)

**Scenariusz 4: Ręczna aktualizacja czasu**
```json
{
  "active_duration_seconds": 60
}
```
- Dodaje 60 do istniejącej wartości `active_duration_seconds`

### 10.4 Obsługa błędów funkcji DB

- Błędy Supabase są mapowane na odpowiednie kody statusu HTTP
- `NOT_FOUND` → `404 Not Found`
- `FORBIDDEN` → `403 Forbidden`
- Inne błędy → `500 Internal Server Error`

### 10.5 Atomowość operacji

- Aktualizacja timera powinna być atomowa (jedna transakcja)
- Supabase client zapewnia atomowość dla pojedynczych operacji update
- Jeśli potrzebne są wielokrotne aktualizacje, rozważyć użycie transakcji (opcjonalne)
