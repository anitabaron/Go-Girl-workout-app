# API Endpoint Implementation Plan: Personal Records

## 1. Przegląd punktu końcowego

Endpoint Personal Records umożliwia użytkownikom przeglądanie swoich rekordów osobistych (PR - Personal Records) osiągniętych podczas treningów. Rekordy są materializowane w bazie danych i automatycznie przeliczane po każdym zapisie ćwiczenia w sesji treningowej.

**Każdy rekord zawiera:**

- Datę osiągnięcia rekordu (`achieved_at`) - informacja kiedy został osiągnięty
- Wartość rekordu (`value`) - zależna od typu metryki
- Metadane sesji - w której sesji i serii został osiągnięty (opcjonalne)
- Metadane ćwiczenia - nazwa, typ, partia mięśniowa

**Dostępne endpointy:**

- `GET /api/personal-records` - Lista rekordów osobistych z możliwością filtrowania i sortowania
- `GET /api/personal-records/{exercise_id}` - Wszystkie rekordy dla konkretnego ćwiczenia (wszystkie typy metryk)

**Funkcjonalność:**

- Wyświetlanie rekordów z metadanymi ćwiczeń
- Filtrowanie po `exercise_id` i `metric_type`
- Sortowanie po `achieved_at` (domyślnie desc) lub `value`
- Paginacja oparta na kursorze
- Automatyczna izolacja danych użytkownika przez RLS

## 2. Szczegóły żądania

### 2.1 GET /api/personal-records

**Metoda HTTP:** `GET`

**Struktura URL:** `/api/personal-records`

**Parametry zapytania:**

- `exercise_id?` (UUID, opcjonalny) - Filtruje rekordy dla konkretnego ćwiczenia
- `metric_type?` (enum: `total_reps` | `max_duration` | `max_weight`, opcjonalny) - Filtruje po typie metryki
- `sort?` (enum: `achieved_at` | `value`, domyślnie: `achieved_at`) - Pole sortowania
- `order?` (enum: `asc` | `desc`, domyślnie: `desc`) - Kierunek sortowania
- `limit?` (number, domyślnie: 20, max: 100) - Liczba wyników na stronę
- `cursor?` (string, opcjonalny) - Kursor paginacji (base64url encoded JSON)

**Request Body:** Brak

**Przykład żądania:**

```
GET /api/personal-records?exercise_id=123e4567-e89b-12d3-a456-426614174000&metric_type=max_weight&sort=value&order=desc&limit=20
```

### 2.2 GET /api/personal-records/{exercise_id}

**Metoda HTTP:** `GET`

**Struktura URL:** `/api/personal-records/{exercise_id}`

**Parametry ścieżki:**

- `exercise_id` (UUID, wymagany) - ID ćwiczenia

**Parametry zapytania:** Brak

**Request Body:** Brak

**Przykład żądania:**

```
GET /api/personal-records/123e4567-e89b-12d3-a456-426614174000
```

## 3. Wykorzystywane typy

### 3.1 DTOs (Data Transfer Objects)

```typescript
// Z src/types.ts
export type PersonalRecordDTO = Omit<PersonalRecordEntity, "user_id">;

// Rozszerzony DTO z metadanymi ćwiczenia (dla odpowiedzi API)
export type PersonalRecordWithExerciseDTO = PersonalRecordDTO & {
  exercise: {
    id: string;
    title: string;
    type: ExerciseType;
    part: ExercisePart;
  };
};
```

### 3.2 Query Parameters

```typescript
// Z src/types.ts
export type PersonalRecordQueryParams = {
  exercise_id?: ExerciseEntity["id"];
  metric_type?: PRMetricType;
  sort?: "achieved_at" | "value";
  order?: "asc" | "desc";
  limit?: number;
  cursor?: string | null;
};
```

### 3.3 Command Modele

Brak - endpointy są tylko do odczytu (GET).

## 4. Szczegóły odpowiedzi

### 4.1 GET /api/personal-records

**Sukces (200 OK):**

```json
{
  "items": [
    {
      "id": "uuid",
      "exercise_id": "uuid",
      "metric_type": "max_weight",
      "value": 50.5,
      "achieved_at": "2024-01-15T10:30:00Z", // Data osiągnięcia rekordu
      "achieved_in_session_id": "uuid",
      "achieved_in_set_number": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "uuid",
        "title": "Bench Press",
        "type": "Main Workout",
        "part": "Chest"
      }
    }
  ],
  "nextCursor": "base64url-encoded-cursor-string" | null
}
```

**Błędy:**

- `400` - Nieprawidłowe parametry zapytania (np. nieprawidłowy UUID, nieprawidłowy kursor)
- `401` - Brak autoryzacji (nieautoryzowany użytkownik)
- `403` - Brak dostępu (RLS blokuje dostęp)
- `500` - Błąd serwera

### 4.2 GET /api/personal-records/{exercise_id}

**Sukces (200 OK):**

```json
{
  "items": [
    {
      "id": "uuid",
      "exercise_id": "uuid",
      "metric_type": "total_reps",
      "value": 100,
      "achieved_at": "2024-01-15T10:30:00Z", // Data osiągnięcia rekordu
      "achieved_in_session_id": "uuid",
      "achieved_in_set_number": null,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "uuid",
        "title": "Push-ups",
        "type": "Main Workout",
        "part": "Arms"
      }
    },
    {
      "id": "uuid",
      "exercise_id": "uuid",
      "metric_type": "max_duration",
      "value": 120,
      "achieved_at": "2024-01-14T09:15:00Z",
      "achieved_in_session_id": "uuid",
      "achieved_in_set_number": 1,
      "created_at": "2024-01-14T09:15:00Z",
      "updated_at": "2024-01-14T09:15:00Z",
      "exercise": {
        "id": "uuid",
        "title": "Push-ups",
        "type": "Main Workout",
        "part": "Arms"
      }
    }
  ]
}
```

**Błędy:**

- `400` - Nieprawidłowy format UUID w `exercise_id`
- `401` - Brak autoryzacji
- `403` - Brak dostępu
- `404` - Ćwiczenie nie zostało znalezione lub nie należy do użytkownika
- `500` - Błąd serwera

## 5. Przepływ danych

### 5.1 GET /api/personal-records

```
1. Route Handler (src/app/api/personal-records/route.ts)
   ↓
2. Walidacja userId (getUserId())
   ↓
3. Parsowanie parametrów zapytania (personalRecordQuerySchema)
   ↓
4. Service Layer (listPersonalRecordsService)
   ↓
5. Repository Layer (listPersonalRecords)
   ↓
6. Supabase Query:
   - FROM personal_records
   - JOIN exercises (dla metadanych)
   - WHERE user_id = userId
   - AND exercise_id = ? (jeśli podano)
   - AND metric_type = ? (jeśli podano)
   - ORDER BY sort field, id
   - LIMIT limit + 1 (dla wykrycia nextCursor)
   ↓
7. Mapowanie do DTO z metadanymi ćwiczenia
   ↓
8. Generowanie nextCursor (jeśli więcej wyników)
   ↓
9. Zwrócenie odpowiedzi JSON
```

### 5.2 GET /api/personal-records/{exercise_id}

```
1. Route Handler (src/app/api/personal-records/[exercise_id]/route.ts)
   ↓
2. Walidacja userId (getUserId())
   ↓
3. Walidacja UUID exercise_id
   ↓
4. Service Layer (getPersonalRecordsByExerciseService)
   ↓
5. Weryfikacja własności ćwiczenia (findById w exercises repository)
   ↓
6. Repository Layer (listPersonalRecordsByExercise)
   ↓
7. Supabase Query:
   - FROM personal_records
   - JOIN exercises (dla metadanych)
   - WHERE user_id = userId
   - AND exercise_id = exercise_id
   - ORDER BY metric_type (dla spójności)
   ↓
8. Mapowanie do DTO z metadanymi ćwiczenia
   ↓
9. Zwrócenie odpowiedzi JSON
```

## 6. Względy bezpieczeństwa

### 6.1 Autoryzacja i uwierzytelnianie

- **Wymagana autoryzacja:** Wszystkie endpointy wymagają zalogowanego użytkownika
- **RLS (Row-Level Security):** Tabela `personal_records` ma włączone RLS z policy `personal_records_select_authenticated`, które automatycznie filtruje wyniki po `user_id = auth.uid()`
- **Weryfikacja własności:** W endpoint `/api/personal-records/{exercise_id}` należy zweryfikować, że ćwiczenie należy do użytkownika przed zwróceniem rekordów

### 6.2 Walidacja danych wejściowych

- **UUID validation:** Wszystkie UUID muszą być w poprawnym formacie (regex validation)
- **Enum validation:** `metric_type` musi być jednym z dozwolonych wartości: `total_reps`, `max_duration`, `max_weight`
- **Sort fields whitelist:** `sort` może być tylko `achieved_at` lub `value`
- **Limit bounds:** `limit` musi być między 1 a 100 (domyślnie 20)
- **Cursor validation:** Kursor musi być poprawnie zakodowany base64url i zawierać wymagane pola

### 6.3 Izolacja danych

- **RLS enforcement:** Wszystkie zapytania do `personal_records` są automatycznie filtrowane przez RLS
- **Explicit user_id check:** W repository zawsze używamy `.eq("user_id", userId)` jako dodatkowe zabezpieczenie
- **Exercise ownership:** Przed zwróceniem rekordów dla ćwiczenia, weryfikujemy własność ćwiczenia

### 6.4 Potencjalne zagrożenia

- **SQL Injection:** Zabezpieczone przez Supabase query builder (parametryzowane zapytania)
- **UUID enumeration:** Możliwe, ale ograniczone przez RLS - użytkownik widzi tylko swoje dane
- **Cursor manipulation:** Walidacja kursora zapobiega manipulacji (sprawdzanie zgodności sort/order)
- **Rate limiting:** Rozważyć dodanie rate limitingu dla endpointów GET (opcjonalne, nie krytyczne dla MVP)

## 7. Obsługa błędów

### 7.1 Scenariusze błędów i kody statusu

| Scenariusz                              | Kod HTTP | ServiceError Code | Komunikat                                                                     |
| --------------------------------------- | -------- | ----------------- | ----------------------------------------------------------------------------- |
| Nieprawidłowy format UUID w exercise_id | 400      | BAD_REQUEST       | "Nieprawidłowy format UUID ćwiczenia."                                        |
| Nieprawidłowy kursor paginacji          | 400      | BAD_REQUEST       | "Nieprawidłowy kursor paginacji."                                             |
| Nieprawidłowy parametr sort             | 400      | BAD_REQUEST       | "Nieprawidłowe pole sortowania. Dozwolone: achieved_at, value."               |
| Nieprawidłowy parametr order            | 400      | BAD_REQUEST       | "Nieprawidłowy kierunek sortowania. Dozwolone: asc, desc."                    |
| Limit poza zakresem                     | 400      | BAD_REQUEST       | "Limit musi być między 1 a 100."                                              |
| Nieprawidłowy metric_type               | 400      | BAD_REQUEST       | "Nieprawidłowy typ metryki. Dozwolone: total_reps, max_duration, max_weight." |
| Brak autoryzacji (brak userId)          | 401      | UNAUTHORIZED      | "Brak aktywnej sesji."                                                        |
| Brak dostępu (RLS failure)              | 403      | FORBIDDEN         | "Brak dostępu do zasobu."                                                     |
| Ćwiczenie nie znalezione                | 404      | NOT_FOUND         | "Ćwiczenie nie zostało znalezione."                                           |
| Ćwiczenie nie należy do użytkownika     | 404      | NOT_FOUND         | "Ćwiczenie nie zostało znalezione."                                           |
| Błąd bazy danych                        | 500      | INTERNAL          | "Wystąpił błąd serwera."                                                      |
| Nieoczekiwany błąd                      | 500      | INTERNAL          | "Wystąpił błąd serwera."                                                      |

### 7.2 Mapowanie błędów bazy danych

- **PostgrestError.code "23503" (Foreign Key Violation):** `CONFLICT` - nie powinno wystąpić w endpointach GET
- **PostgrestError.code "PGRST116" (Not Found):** `NOT_FOUND` - zasób nie istnieje
- **Inne błędy PostgrestError:** `INTERNAL` - błąd serwera

### 7.3 Logowanie błędów

- Wszystkie nieoczekiwane błędy powinny być logowane do konsoli z pełnym kontekstem
- Używać `console.error()` z opisem operacji i szczegółami błędu
- Nie logować wrażliwych danych (np. pełnych obiektów błędów z tokenami)

## 8. Rozważania dotyczące wydajności

### 8.1 Optymalizacja zapytań

- **Indeksy:** Baza danych ma już zoptymalizowane indeksy:

  - `idx_personal_records_user_id` - dla filtrowania po użytkowniku
  - `idx_personal_records_user_id_achieved_at` - dla sortowania po dacie
  - `idx_personal_records_user_exercise_metric` - dla filtrowania po ćwiczeniu i metryce
  - `idx_personal_records_exercise_id` - dla zapytań po ćwiczeniu

- **JOIN z exercises:** JOIN z tabelą `exercises` jest konieczny dla metadanych, ale powinien być wydajny dzięki indeksom na `exercises.id`

- **Limit + 1 pattern:** Pobieranie `limit + 1` rekordów pozwala wykryć, czy istnieje następna strona bez dodatkowego zapytania

### 8.2 Paginacja

- **Cursor-based pagination:** Używana zamiast offset-based dla lepszej wydajności przy dużych zbiorach danych
- **Cursor encoding:** Base64url encoding JSON payload z polami: `sort`, `order`, `value`, `id`
- **Cursor validation:** Sprawdzanie zgodności parametrów sortowania z kursorem zapobiega nieprawidłowym wynikom

### 8.3 Potencjalne wąskie gardła

- **JOIN z exercises:** Jeśli użytkownik ma bardzo dużo rekordów, JOIN może być kosztowny. Rozważyć:

  - Materializowane widoki (jeśli potrzeba)
  - Cache'owanie metadanych ćwiczeń (opcjonalne, nie krytyczne dla MVP)

- **Brak rekordów:** Jeśli użytkownik nie ma żadnych rekordów, zapytanie zwróci pustą tablicę (wydajne dzięki indeksom)

### 8.4 Strategie optymalizacji (opcjonalne, przyszłość)

- **Response caching:** Rozważyć cache'owanie odpowiedzi dla często używanych zapytań (np. najnowsze rekordy)
- **Selective fields:** Jeśli w przyszłości będzie potrzeba, można dodać parametr `fields` do wyboru zwracanych pól
- **Batch loading:** Jeśli frontend potrzebuje wielu ćwiczeń jednocześnie, można rozważyć batch endpoint

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematów walidacji Zod

**Plik:** `src/lib/validation/personal-records.ts`

- Utworzyć `personalRecordQuerySchema` z walidacją:
  - `exercise_id?` - UUID string, opcjonalny
  - `metric_type?` - enum z wartościami PR metric types
  - `sort` - enum `achieved_at` | `value`, domyślnie `achieved_at`
  - `order` - enum `asc` | `desc`, domyślnie `desc`
  - `limit` - number, min 1, max 100, domyślnie 20
  - `cursor?` - string, opcjonalny
- Utworzyć stałe: `PERSONAL_RECORD_DEFAULT_LIMIT = 20`, `PERSONAL_RECORD_MAX_LIMIT = 100`
- Utworzyć tablice enum values dla type safety
- Utworzyć funkcje pomocnicze: `encodeCursor`, `decodeCursor` (podobne do exercises)

### Krok 2: Utworzenie repository layer

**Plik:** `src/repositories/personal-records.ts`

- Utworzyć funkcję `listPersonalRecords`:
  - Przyjmuje: `client`, `userId`, `params` (PersonalRecordQueryParams)
  - Buduje zapytanie Supabase z JOIN do `exercises`
  - Stosuje filtry: `exercise_id`, `metric_type`
  - Stosuje sortowanie: `sort` + `id` (dla stabilności)
  - Obsługuje cursor pagination
  - Zwraca: `{ data?: PersonalRecordWithExerciseDTO[], nextCursor?: string | null, error?: PostgrestError | null }`
- Utworzyć funkcję `listPersonalRecordsByExercise`:
  - Przyjmuje: `client`, `userId`, `exerciseId`
  - Buduje zapytanie z JOIN do `exercises`
  - Filtruje po `exercise_id` i `user_id`
  - Sortuje po `metric_type` (dla spójności)
  - Zwraca wszystkie typy metryk dla ćwiczenia
- Utworzyć funkcję `mapToDTO`:
  - Mapuje wiersz z bazy (z JOIN) do `PersonalRecordWithExerciseDTO`
  - Usuwa `user_id` z głównego obiektu
  - Tworzy zagnieżdżony obiekt `exercise` z metadanymi

### Krok 3: Utworzenie service layer

**Plik:** `src/services/personal-records.ts`

- Utworzyć funkcję `listPersonalRecordsService`:
  - Waliduje `userId`
  - Parsuje query params przez Zod schema
  - Wywołuje `listPersonalRecords` z repository
  - Obsługuje błędy (mapowanie PostgrestError do ServiceError)
  - Zwraca `{ items: PersonalRecordWithExerciseDTO[], nextCursor: string | null }`
- Utworzyć funkcję `getPersonalRecordsByExerciseService`:
  - Waliduje `userId`
  - Waliduje `exerciseId` (UUID format)
  - Weryfikuje własność ćwiczenia (wywołuje `findById` z exercises repository)
  - Jeśli ćwiczenie nie istnieje lub nie należy do użytkownika → `NOT_FOUND`
  - Wywołuje `listPersonalRecordsByExercise` z repository
  - Obsługuje błędy
  - Zwraca `{ items: PersonalRecordWithExerciseDTO[] }`
- Dodać `ServiceError` class (jeśli nie istnieje w pliku) lub importować z istniejącego
- Utworzyć funkcję `mapDbError` dla mapowania błędów bazy danych

### Krok 4: Utworzenie route handlers

**Plik:** `src/app/api/personal-records/route.ts`

- Utworzyć funkcję `GET`:
  - Pobiera `userId` przez `getUserId()`
  - Waliduje `userId` (UUID format)
  - Parsuje query params z URL
  - Wywołuje `listPersonalRecordsService`
  - Obsługuje `ServiceError` przez `respondWithServiceError`
  - Zwraca `NextResponse.json` z statusem 200
  - Obsługuje nieoczekiwane błędy (500)

**Plik:** `src/app/api/personal-records/[exercise_id]/route.ts`

- Utworzyć funkcję `GET`:
  - Pobiera `userId` przez `getUserId()`
  - Waliduje `userId` (UUID format)
  - Pobiera `exercise_id` z `params`
  - Waliduje `exercise_id` (UUID format)
  - Wywołuje `getPersonalRecordsByExerciseService`
  - Obsługuje `ServiceError` przez `respondWithServiceError`
  - Zwraca `NextResponse.json` z statusem 200 i strukturą `{ items: [...] }`
  - Obsługuje nieoczekiwane błędy (500)

### Krok 5: Aktualizacja typów (jeśli potrzeba)

**Plik:** `src/types.ts`

- Sprawdzić, czy `PersonalRecordDTO` i `PersonalRecordQueryParams` są już zdefiniowane
- Jeśli nie, dodać:
  - `PersonalRecordDTO = Omit<PersonalRecordEntity, "user_id">`
  - `PersonalRecordQueryParams` (zgodnie z sekcją 3.2)
- Dodać `PersonalRecordWithExerciseDTO` (jeśli nie istnieje):
  ```typescript
  export type PersonalRecordWithExerciseDTO = PersonalRecordDTO & {
    exercise: {
      id: string;
      title: string;
      type: ExerciseType;
      part: ExercisePart;
    };
  };
  ```

### Krok 6: Aktualizacja error handler

**Plik:** `src/lib/http/errors.ts`

- Dodać `ServiceError` z `personal-records` service do union type `ServiceError`
- Upewnić się, że `respondWithServiceError` obsługuje wszystkie kody błędów

### Krok 7: Testowanie

- **Testy jednostkowe (opcjonalne, przyszłość):**

  - Testy schematów walidacji Zod
  - Testy funkcji repository (mock Supabase client)
  - Testy funkcji service (mock repository)

- **Testy integracyjne (ręczne):**
  - Test `GET /api/personal-records` bez parametrów
  - Test `GET /api/personal-records` z filtrem `exercise_id`
  - Test `GET /api/personal-records` z filtrem `metric_type`
  - Test `GET /api/personal-records` z sortowaniem po `value`
  - Test `GET /api/personal-records` z paginacją (cursor)
  - Test `GET /api/personal-records/{exercise_id}` z poprawnym ID
  - Test `GET /api/personal-records/{exercise_id}` z nieistniejącym ID
  - Test `GET /api/personal-records/{exercise_id}` z ID ćwiczenia innego użytkownika
  - Test walidacji nieprawidłowych parametrów
  - Test walidacji nieprawidłowego UUID

### Krok 8: Dokumentacja i przykłady (opcjonalne)

- Utworzyć plik z przykładami requestów/odpowiedzi (podobnie jak w `src/lib/example-body/`)
- Zaktualizować dokumentację API (jeśli istnieje)

## 10. Uwagi implementacyjne

### 10.1 JOIN z exercises

Zapytanie powinno używać LEFT JOIN, aby zwrócić rekordy nawet jeśli ćwiczenie zostało usunięte (choć FK RESTRICT powinno to uniemożliwić). W praktyce użyjemy INNER JOIN, ponieważ ćwiczenia z rekordami nie mogą być usunięte.

**Przykład zapytania Supabase:**

```typescript
const { data, error } = await client
  .from("personal_records")
  .select(
    `
    id,
    exercise_id,
    metric_type,
    value,
    achieved_at,
    achieved_in_session_id,
    achieved_in_set_number,
    created_at,
    updated_at,
    exercises!inner (
      id,
      title,
      type,
      part
    )
  `
  )
  .eq("user_id", userId);
// ... dodatkowe filtry
```

### 10.2 Mapowanie odpowiedzi z JOIN

Supabase zwraca zagnieżdżone obiekty w formacie:

```json
{
  "id": "...",
  "exercise_id": "...",
  "exercises": {
    "id": "...",
    "title": "..."
  }
}
```

Należy zmapować to do:

```json
{
  "id": "...",
  "exercise_id": "...",
  "exercise": {
    "id": "...",
    "title": "..."
  }
}
```

### 10.3 Cursor pagination dla personal records

Cursor powinien zawierać:

- `sort`: pole sortowania (`achieved_at` lub `value`)
- `order`: kierunek (`asc` lub `desc`)
- `value`: wartość pola sortowania z ostatniego rekordu
- `id`: UUID ostatniego rekordu (dla stabilności przy równych wartościach)

**Przykład kursora:**

```json
{
  "sort": "achieved_at",
  "order": "desc",
  "value": "2024-01-15T10:30:00Z",
  "id": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 10.4 Obsługa pustych wyników

- Jeśli użytkownik nie ma żadnych rekordów, zwrócić `{ items: [], nextCursor: null }`
- Jeśli użytkownik nie ma rekordów dla konkretnego ćwiczenia, zwrócić `{ items: [] }`
- Nie traktować pustych wyników jako błąd (status 200)

### 10.5 Spójność z istniejącymi endpointami

- Używać tego samego wzorca `getUserId()` jak w innych endpointach
- Używać tego samego wzorca obsługi błędów (`respondWithServiceError`)
- Używać tego samego wzorca paginacji (cursor-based) jak w exercises
- Używać tego samego formatu odpowiedzi (`{ items, nextCursor? }`)

---

**Data utworzenia planu:** 2024-01-XX  
**Wersja:** 1.0  
**Status:** Gotowy do implementacji
