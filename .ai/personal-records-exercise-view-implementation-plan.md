# Plan implementacji widoku Rekordy osobiste dla ćwiczenia

## 1. Przegląd

Widok rekordów osobistych dla konkretnego ćwiczenia (`/personal-records/[exercise_id]`) to widok wyświetlający wszystkie rekordy osobiste (PR) dla wybranego ćwiczenia. Widok prezentuje informacje o ćwiczeniu (tytuł, typ, partia mięśniowa) oraz wszystkie dostępne typy rekordów (total_reps, max_duration, max_weight) z wartością, datą osiągnięcia i linkiem do sesji treningowej, w której rekord został osiągnięty. Widok może być zaimplementowany jako pełnoekranowy widok lub Sheet (shadcn/ui) wysuwający się z boku. Implementacja wykorzystuje Next.js 16 App Router z podziałem na Server Components (dla fetchowania danych) i Client Components (dla interaktywnych elementów UI).

Widok jest zgodny z User Stories: US-060 (automatyczne wykrywanie PR), US-061 (PR z częściowo wykonanych sesji), US-062 (przeliczenie PR po edycji), US-063 (widok listy PR).

## 2. Routing widoku

- **Ścieżka**: `/personal-records/[exercise_id]`
- **Plik**: `src/app/personal-records/[exercise_id]/page.tsx`
- **Typ**: Server Component (główny page) z zagnieżdżonymi Client Components dla interaktywnych elementów
- **Parametry dynamiczne**: `exercise_id` - UUID ćwiczenia

## 3. Struktura komponentów

```
ExercisePersonalRecordsPage (Server Component)
├── ExerciseInfo (Server Component) - informacje o ćwiczeniu
│   ├── ExerciseTitle - tytuł ćwiczenia
│   ├── ExerciseTypeBadge - badge typu ćwiczenia
│   └── ExercisePartBadge - badge partii mięśniowej
├── PersonalRecordDetails (Server Component) - szczegóły rekordów
│   ├── PersonalRecordMetricCard[] (Client Component) - karta dla każdego typu metryki
│   │   ├── MetricTypeLabel - etykieta typu metryki
│   │   ├── MetricValue - wartość rekordu (sformatowana)
│   │   ├── MetricAchievedDate - data osiągnięcia
│   │   └── SessionLink (Client Component) - link do sesji (jeśli dostępny)
│   └── EmptyRecordsState (Client Component) - pusty stan (jeśli brak rekordów)
└── PersonalRecordHistory (Server Component) [opcjonalny] - historia rekordów
    └── PersonalRecordHistoryItem[] (Client Component) - element historii
```

## 4. Szczegóły komponentów

### ExercisePersonalRecordsPage

- **Opis komponentu**: Główny komponent strony, który pobiera dane ćwiczenia i rekordów z API oraz renderuje strukturę widoku. Obsługuje walidację UUID, przekierowania w przypadku błędów oraz layout strony.
- **Główne elementy**:
  - Header z tytułem strony
  - Sekcja z informacjami o ćwiczeniu
  - Sekcja ze szczegółami rekordów
  - Obsługa błędów i przekierowań
- **Obsługiwane interakcje**:
  - Walidacja parametru `exercise_id` (UUID)
  - Przekierowanie do `/personal-records` w przypadku błędów (404, 401/403)
  - Obsługa pustego stanu (brak rekordów dla ćwiczenia)
- **Obsługiwana walidacja**:
  - Format UUID ćwiczenia (regex validation)
  - Weryfikacja własności ćwiczenia (przez API)
  - Weryfikacja istnienia ćwiczenia
- **Typy**:
  - Wejście: `params: Promise<{ exercise_id: string }>`
  - Używa: `PersonalRecordWithExerciseDTO[]`, `ExerciseDTO`
- **Propsy**: Brak (komponent główny strony)

### ExerciseInfo

- **Opis komponentu**: Komponent wyświetlający podstawowe informacje o ćwiczeniu: tytuł, typ i partię mięśniową. Informacje są pobierane z metadanych ćwiczenia zawartych w odpowiedzi API (pole `exercise` w `PersonalRecordWithExerciseDTO`).
- **Główne elementy**:
  - Nagłówek z tytułem ćwiczenia (`<h1>` lub `<h2>`)
  - Badge typu ćwiczenia (Warm-up/Main workout/Cool-down)
  - Badge partii mięśniowej (Legs/Core/Back/Arms/Chest)
- **Obsługiwane interakcje**: Brak (komponent tylko do odczytu)
- **Obsługiwana walidacja**: Brak (dane pochodzą z API)
- **Typy**:
  - Wejście: `{ exercise: { id: string; title: string; type: ExerciseType; part: ExercisePart } }`
- **Propsy**:
  ```typescript
  type ExerciseInfoProps = {
    exercise: {
      id: string;
      title: string;
      type: ExerciseType;
      part: ExercisePart;
    };
  };
  ```

### PersonalRecordDetails

- **Opis komponentu**: Komponent wyświetlający szczegóły wszystkich rekordów dla ćwiczenia. Grupuje rekordy według typu metryki (total_reps, max_duration, max_weight) i wyświetla każdy rekord w osobnej karcie. Jeśli brak rekordów, wyświetla pusty stan.
- **Główne elementy**:
  - Kontener z kartami rekordów (`<div>` z `space-y-4`)
  - `PersonalRecordMetricCard[]` - karta dla każdego typu metryki
  - `EmptyRecordsState` - pusty stan (jeśli `records.length === 0`)
- **Obsługiwane interakcje**:
  - Renderowanie kart rekordów
  - Obsługa pustego stanu
- **Obsługiwana walidacja**:
  - Sprawdzenie, czy lista rekordów nie jest pusta
- **Typy**:
  - Wejście: `{ records: PersonalRecordWithExerciseDTO[] }`
- **Propsy**:
  ```typescript
  type PersonalRecordDetailsProps = {
    records: PersonalRecordWithExerciseDTO[];
  };
  ```

### PersonalRecordMetricCard

- **Opis komponentu**: Komponent wyświetlający pojedynczy rekord w formie karty. Wyświetla typ metryki, wartość rekordu (sformatowaną), datę osiągnięcia oraz link do sesji treningowej (jeśli dostępny).
- **Główne elementy**:
  - Karta (`Card` z shadcn/ui)
  - Nagłówek karty z etykietą typu metryki (`CardHeader`, `CardTitle`)
  - Zawartość karty (`CardContent`):
    - Wartość rekordu (duży, wyróżniony tekst)
    - Data osiągnięcia (sformatowana w formacie polskim)
    - Link do sesji (jeśli `achieved_in_session_id` jest dostępny)
- **Obsługiwane interakcje**:
  - Kliknięcie w link do sesji (przekierowanie do `/workout-sessions/[id]`)
  - Toast notification przy kliknięciu w link (opcjonalnie)
- **Obsługiwana walidacja**:
  - Sprawdzenie, czy `achieved_in_session_id` jest dostępny przed wyświetleniem linku
- **Typy**:
  - Wejście: `PersonalRecordWithExerciseDTO`
- **Propsy**:
  ```typescript
  type PersonalRecordMetricCardProps = {
    record: PersonalRecordWithExerciseDTO;
  };
  ```

### SessionLink

- **Opis komponentu**: Komponent wyświetlający link do sesji treningowej, w której rekord został osiągnięty. Link prowadzi do widoku szczegółów sesji (`/workout-sessions/[id]`).
- **Główne elementy**:
  - Link (`Link` z Next.js)
  - Tekst "Zobacz sesję"
  - Ikona (opcjonalnie, np. `ExternalLink` z lucide-react)
- **Obsługiwane interakcje**:
  - Kliknięcie w link (przekierowanie do `/workout-sessions/${sessionId}`)
  - Toast notification przy kliknięciu (opcjonalnie)
- **Obsługiwana walidacja**:
  - Sprawdzenie, czy `sessionId` nie jest `null` przed renderowaniem
- **Typy**:
  - Wejście: `{ sessionId: string | null }`
- **Propsy**:
  ```typescript
  type SessionLinkProps = {
    sessionId: string | null;
  };
  ```

### EmptyRecordsState

- **Opis komponentu**: Komponent wyświetlający pusty stan, gdy brak rekordów dla ćwiczenia. Zawiera komunikat zachęcający użytkowniczkę do rozpoczęcia treningu.
- **Główne elementy**:
  - Kontener z komunikatem (`<div>`)
  - Ikona (opcjonalnie)
  - Tekst komunikatu
  - Przycisk CTA do rozpoczęcia treningu (opcjonalnie)
- **Obsługiwane interakcje**:
  - Kliknięcie w przycisk CTA (przekierowanie do listy planów treningowych lub sesji)
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak (komponent bez propsów)
- **Propsy**: Brak

### PersonalRecordHistory [opcjonalny]

- **Opis komponentu**: Komponent wyświetlający historię rekordów (poprzednie rekordy z datami). Komponent jest opcjonalny, ponieważ endpoint `/api/personal-records/[exercise_id]` zwraca tylko aktualne rekordy (najlepsze wartości). Historia może być zaimplementowana w przyszłości, jeśli endpoint zostanie rozszerzony o możliwość pobierania historii.
- **Główne elementy**:
  - Nagłówek sekcji "Historia rekordów"
  - Lista elementów historii (`PersonalRecordHistoryItem[]`)
- **Obsługiwane interakcje**: Brak (komponent tylko do odczytu)
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak (komponent nie jest wymagany w MVP)
- **Propsy**: Brak

## 5. Typy

### Typy DTO (z `src/types.ts`)

#### PersonalRecordWithExerciseDTO

```typescript
type PersonalRecordWithExerciseDTO = PersonalRecordDTO & {
  exercise: {
    id: string;
    title: string;
    type: ExerciseType;
    part: ExercisePart;
  };
};
```

**Pola:**

- `id: string` - UUID rekordu osobistego
- `exercise_id: string` - UUID ćwiczenia
- `metric_type: PRMetricType` - typ metryki (`"total_reps" | "max_duration" | "max_weight"`)
- `value: number` - wartość rekordu
- `achieved_at: string` - data osiągnięcia rekordu (ISO 8601)
- `achieved_in_session_id: string | null` - UUID sesji, w której rekord został osiągnięty (lub `null`)
- `achieved_in_set_number: number | null` - numer serii, w której rekord został osiągnięty (lub `null`)
- `created_at: string` - data utworzenia rekordu (ISO 8601)
- `updated_at: string` - data ostatniej aktualizacji rekordu (ISO 8601)
- `exercise: { id: string; title: string; type: ExerciseType; part: ExercisePart }` - metadane ćwiczenia

#### ExerciseType

```typescript
type ExerciseType = "Warm-up" | "Main Workout" | "Cool-down";
```

#### ExercisePart

```typescript
type ExercisePart = "Legs" | "Core" | "Back" | "Arms" | "Chest";
```

#### PRMetricType

```typescript
type PRMetricType = "total_reps" | "max_duration" | "max_weight";
```

### Typy ViewModel (nowe, do utworzenia w `src/lib/personal-records/view-model.ts`)

#### ExercisePersonalRecordsViewModel

```typescript
type ExercisePersonalRecordsViewModel = {
  exercise: {
    id: string;
    title: string;
    type: string; // Przetłumaczony typ (np. "Warm-up", "Main workout", "Cool-down")
    part: string; // Przetłumaczona partia (np. "Legs", "Core", "Back", "Arms", "Chest")
  };
  records: PersonalRecordMetricViewModel[];
};
```

**Pola:**

- `exercise: { id: string; title: string; type: string; part: string }` - informacje o ćwiczeniu z przetłumaczonymi etykietami
- `records: PersonalRecordMetricViewModel[]` - lista rekordów dla ćwiczenia

#### PersonalRecordMetricViewModel

```typescript
type PersonalRecordMetricViewModel = {
  metricType: PRMetricType;
  label: string; // Etykieta metryki (przetłumaczona: "Maks. powtórzenia", "Maks. czas", "Maks. ciężar")
  valueDisplay: string; // Wartość sformatowana do wyświetlenia (np. "15", "02:30", "50 kg")
  achievedAt: string; // Data osiągnięcia (sformatowana w formacie polskim)
  sessionId: string | null; // UUID sesji lub null
  isNew: boolean; // Czy rekord jest nowy (osiągnięty w ostatniej sesji) - opcjonalnie
};
```

**Pola:**

- `metricType: PRMetricType` - typ metryki (bez zmian)
- `label: string` - przetłumaczona etykieta metryki
- `valueDisplay: string` - sformatowana wartość do wyświetlenia
- `achievedAt: string` - sformatowana data osiągnięcia
- `sessionId: string | null` - UUID sesji lub null
- `isNew: boolean` - flaga nowego rekordu (opcjonalnie, do implementacji w przyszłości)

### Funkcje mapowania (do utworzenia w `src/lib/personal-records/view-model.ts`)

#### mapExercisePersonalRecordsToViewModel

```typescript
function mapExercisePersonalRecordsToViewModel(
  records: PersonalRecordWithExerciseDTO[],
): ExercisePersonalRecordsViewModel | null;
```

**Opis**: Mapuje listę rekordów z API na ViewModel dla widoku. Jeśli lista jest pusta, zwraca `null`. Jeśli lista nie jest pusta, wyodrębnia metadane ćwiczenia z pierwszego rekordu i mapuje wszystkie rekordy do `PersonalRecordMetricViewModel[]`.

**Logika:**

1. Jeśli `records.length === 0`, zwróć `null`
2. Wyodrębnij metadane ćwiczenia z `records[0].exercise`
3. Przetłumacz typ i partię ćwiczenia
4. Dla każdego rekordu:
   - Przetłumacz typ metryki
   - Sformatuj wartość metryki (total_reps: liczba, max_duration: MM:SS, max_weight: "X kg")
   - Sformatuj datę osiągnięcia w formacie polskim
   - Skopiuj `achieved_in_session_id` jako `sessionId`
   - Ustaw `isNew: false` (do implementacji w przyszłości)
5. Zwróć `ExercisePersonalRecordsViewModel`

## 6. Zarządzanie stanem

Widok nie wymaga zarządzania stanem po stronie klienta, ponieważ:

1. **Dane są pobierane po stronie serwera**: Główny komponent strony (`ExercisePersonalRecordsPage`) jest Server Component, który pobiera dane z API podczas renderowania.
2. **Brak interaktywnych formularzy**: Widok jest tylko do odczytu, nie ma formularzy do wypełnienia.
3. **Brak filtrowania/sortowania**: Widok wyświetla wszystkie rekordy dla ćwiczenia bez możliwości filtrowania lub sortowania (w przeciwieństwie do widoku listy rekordów).
4. **Linki są statyczne**: Linki do sesji są renderowane statycznie na podstawie danych z API.

**Opcjonalne użycie stanu:**

- Toast notifications przy kliknięciu w link do sesji (można użyć `sonner` bez zarządzania stanem)
- Loading state podczas nawigacji (obsługiwane przez Next.js)

## 7. Integracja API

### Endpoint

**GET** `/api/personal-records/[exercise_id]`

### Typy żądania

**Parametry ścieżki:**

- `exercise_id: string` - UUID ćwiczenia (wymagany)

**Query params:** Brak

### Typy odpowiedzi

**Sukces (200 OK):**

```typescript
{
  items: PersonalRecordWithExerciseDTO[];
}
```

**Przykład odpowiedzi:**

```json
{
  "items": [
    {
      "id": "uuid-1",
      "exercise_id": "exercise-uuid",
      "metric_type": "total_reps",
      "value": 100,
      "achieved_at": "2024-01-15T10:30:00Z",
      "achieved_in_session_id": "session-uuid-1",
      "achieved_in_set_number": null,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "exercise-uuid",
        "title": "Push-ups",
        "type": "Main Workout",
        "part": "Arms"
      }
    },
    {
      "id": "uuid-2",
      "exercise_id": "exercise-uuid",
      "metric_type": "max_duration",
      "value": 120,
      "achieved_at": "2024-01-14T09:15:00Z",
      "achieved_in_session_id": "session-uuid-2",
      "achieved_in_set_number": 1,
      "created_at": "2024-01-14T09:15:00Z",
      "updated_at": "2024-01-14T09:15:00Z",
      "exercise": {
        "id": "exercise-uuid",
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

### Implementacja wywołania API

W komponencie `ExercisePersonalRecordsPage`:

```typescript
const userId = await getUserId();
const { exercise_id } = await params;

// Walidacja UUID
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(exercise_id)) {
  redirect("/personal-records");
}

try {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || ""}/api/personal-records/${exercise_id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`, // Jeśli wymagane
      },
    },
  );

  if (!response.ok) {
    if (
      response.status === 404 ||
      response.status === 401 ||
      response.status === 403
    ) {
      redirect("/personal-records");
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: { items: PersonalRecordWithExerciseDTO[] } =
    await response.json();
  // Mapowanie do ViewModel
  const viewModel = mapExercisePersonalRecordsToViewModel(data.items);
} catch (error) {
  // Obsługa błędów
  redirect("/personal-records");
}
```

**Alternatywnie** (używając service layer):

```typescript
import { getPersonalRecordsByExerciseService } from "@/services/personal-records";

const userId = await getUserId();
const { exercise_id } = await params;

try {
  const result = await getPersonalRecordsByExerciseService(userId, exercise_id);
  const viewModel = mapExercisePersonalRecordsToViewModel(result.items);
} catch (error) {
  if (error instanceof ServiceError) {
    if (
      error.code === "NOT_FOUND" ||
      error.code === "UNAUTHORIZED" ||
      error.code === "FORBIDDEN"
    ) {
      redirect("/personal-records");
    }
  }
  // Inne błędy
  redirect("/personal-records");
}
```

## 8. Interakcje użytkownika

### 8.1 Nawigacja do widoku

**Źródło**: Widok listy rekordów osobistych (`/personal-records`)

**Akcja**: Kliknięcie w link do szczegółów ćwiczenia (np. w `PersonalRecordCard`)

**Oczekiwany wynik**:

- Przekierowanie do `/personal-records/[exercise_id]`
- Załadowanie danych ćwiczenia i rekordów
- Wyświetlenie widoku z informacjami o ćwiczeniu i rekordach

### 8.2 Kliknięcie w link do sesji

**Źródło**: `PersonalRecordMetricCard` → `SessionLink`

**Akcja**: Kliknięcie w link "Zobacz sesję"

**Oczekiwany wynik**:

- Przekierowanie do `/workout-sessions/[session_id]`
- Opcjonalnie: Toast notification "Przechodzisz do sesji treningowej"

### 8.3 Obsługa pustego stanu

**Źródło**: `PersonalRecordDetails` → `EmptyRecordsState`

**Akcja**: Wyświetlenie komunikatu, gdy brak rekordów

**Oczekiwany wynik**:

- Wyświetlenie komunikatu "Brak rekordów dla tego ćwiczenia"
- Opcjonalnie: Przycisk CTA "Rozpocznij trening" (przekierowanie do listy planów)

### 8.4 Obsługa błędów

**Źródło**: Błędy API (404, 401, 403, 500)

**Akcja**: Przekierowanie do listy rekordów

**Oczekiwany wynik**:

- Przekierowanie do `/personal-records`
- Opcjonalnie: Toast notification z komunikatem błędu

## 9. Warunki i walidacja

### 9.1 Walidacja UUID ćwiczenia

**Komponent**: `ExercisePersonalRecordsPage`

**Warunek**: Parametr `exercise_id` musi być w poprawnym formacie UUID

**Walidacja**:

```typescript
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(exercise_id)) {
  redirect("/personal-records");
}
```

**Wpływ na UI**: Jeśli UUID jest nieprawidłowy, użytkowniczka jest przekierowywana do listy rekordów.

### 9.2 Weryfikacja własności ćwiczenia

**Komponent**: API endpoint `/api/personal-records/[exercise_id]`

**Warunek**: Ćwiczenie musi należeć do zalogowanego użytkownika

**Walidacja**: Wykonywana po stronie serwera w `getPersonalRecordsByExerciseService`:

- Sprawdzenie, czy ćwiczenie istnieje
- Sprawdzenie, czy ćwiczenie należy do użytkownika (przez RLS)

**Wpływ na UI**: Jeśli ćwiczenie nie należy do użytkownika, API zwraca `404`, a użytkowniczka jest przekierowywana do listy rekordów.

### 9.3 Sprawdzenie istnienia rekordów

**Komponent**: `PersonalRecordDetails`

**Warunek**: Sprawdzenie, czy lista rekordów nie jest pusta

**Walidacja**:

```typescript
if (records.length === 0) {
  return <EmptyRecordsState />;
}
```

**Wpływ na UI**: Jeśli brak rekordów, wyświetlany jest pusty stan zamiast kart rekordów.

### 9.4 Sprawdzenie dostępności linku do sesji

**Komponent**: `SessionLink`

**Warunek**: Sprawdzenie, czy `achieved_in_session_id` nie jest `null`

**Walidacja**:

```typescript
if (!sessionId) {
  return null; // Nie renderuj linku
}
```

**Wpływ na UI**: Link do sesji jest wyświetlany tylko, jeśli `sessionId` jest dostępny.

## 10. Obsługa błędów

### 10.1 Błąd 400 (Nieprawidłowy UUID)

**Scenariusz**: Parametr `exercise_id` ma nieprawidłowy format UUID

**Obsługa**:

- Walidacja UUID w komponencie strony przed wywołaniem API
- Przekierowanie do `/personal-records` z komunikatem (opcjonalnie)

**Komunikat dla użytkownika**: "Nieprawidłowy identyfikator ćwiczenia" (opcjonalnie, przez toast)

### 10.2 Błąd 404 (Ćwiczenie nie znalezione)

**Scenariusz**: Ćwiczenie nie istnieje lub nie należy do użytkownika

**Obsługa**:

- API zwraca `404` w `getPersonalRecordsByExerciseService`
- Przekierowanie do `/personal-records`
- Opcjonalnie: Toast notification "Ćwiczenie nie zostało znalezione"

**Komunikat dla użytkownika**: "Ćwiczenie nie zostało znalezione lub nie masz do niego dostępu"

### 10.3 Błąd 401/403 (Brak autoryzacji)

**Scenariusz**: Użytkowniczka nie jest zalogowana lub nie ma dostępu do danych

**Obsługa**:

- API zwraca `401` lub `403`
- Przekierowanie do `/personal-records` lub strony logowania
- Opcjonalnie: Toast notification "Brak dostępu do danych"

**Komunikat dla użytkownika**: "Brak dostępu do danych. Zaloguj się ponownie."

### 10.4 Błąd 500 (Błąd serwera)

**Scenariusz**: Błąd po stronie serwera (błąd bazy danych, błąd sieci)

**Obsługa**:

- API zwraca `500`
- Przekierowanie do `/personal-records`
- Opcjonalnie: Toast notification "Wystąpił błąd serwera. Spróbuj ponownie później."

**Komunikat dla użytkownika**: "Wystąpił błąd serwera. Spróbuj ponownie później."

### 10.5 Pusty stan (brak rekordów)

**Scenariusz**: Ćwiczenie istnieje, ale nie ma dla niego żadnych rekordów

**Obsługa**:

- API zwraca `200` z pustą listą `items: []`
- Wyświetlenie komponentu `EmptyRecordsState` z komunikatem
- Opcjonalnie: Przycisk CTA do rozpoczęcia treningu

**Komunikat dla użytkownika**: "Brak rekordów dla tego ćwiczenia. Rozpocznij trening, aby ustanowić pierwszy rekord!"

### 10.6 Błąd sieci (network error)

**Scenariusz**: Brak połączenia z serwerem lub timeout

**Obsługa**:

- Obsługa wyjątku `fetch` w `try-catch`
- Przekierowanie do `/personal-records`
- Opcjonalnie: Toast notification "Brak połączenia z serwerem"

**Komunikat dla użytkownika**: "Brak połączenia z serwerem. Sprawdź połączenie internetowe."

## 11. Kroki implementacji

1. **Utworzenie struktury plików**
   - Utworzenie katalogu `src/app/personal-records/[exercise_id]/`
   - Utworzenie pliku `page.tsx` (Server Component)
   - Utworzenie pliku `loading.tsx` (opcjonalnie, dla loading state)
   - Utworzenie pliku `error.tsx` (opcjonalnie, dla error boundary)

2. **Rozszerzenie ViewModel**
   - Dodanie typów `ExercisePersonalRecordsViewModel` i `PersonalRecordMetricViewModel` do `src/lib/personal-records/view-model.ts`
   - Implementacja funkcji `mapExercisePersonalRecordsToViewModel`
   - Dodanie funkcji formatujących (formatowanie wartości metryk, dat)

3. **Utworzenie komponentu głównego strony**
   - Implementacja `ExercisePersonalRecordsPage` w `src/app/personal-records/[exercise_id]/page.tsx`
   - Walidacja UUID `exercise_id`
   - Wywołanie API przez service layer (`getPersonalRecordsByExerciseService`)
   - Obsługa błędów i przekierowań
   - Mapowanie danych do ViewModel
   - Renderowanie struktury widoku

4. **Utworzenie komponentu ExerciseInfo**
   - Utworzenie pliku `src/components/personal-records/exercise-info.tsx`
   - Implementacja komponentu wyświetlającego informacje o ćwiczeniu
   - Dodanie tłumaczeń typów i partii ćwiczeń
   - Stylowanie z użyciem Badge z shadcn/ui

5. **Utworzenie komponentu PersonalRecordDetails**
   - Utworzenie pliku `src/components/personal-records/personal-record-details.tsx`
   - Implementacja komponentu wyświetlającego listę rekordów
   - Obsługa pustego stanu
   - Renderowanie kart rekordów

6. **Utworzenie komponentu PersonalRecordMetricCard**
   - Utworzenie pliku `src/components/personal-records/personal-record-metric-card.tsx`
   - Implementacja komponentu wyświetlającego pojedynczy rekord
   - Formatowanie wartości metryki (total_reps, max_duration, max_weight)
   - Formatowanie daty osiągnięcia
   - Integracja z komponentem `SessionLink`

7. **Utworzenie komponentu SessionLink**
   - Utworzenie pliku `src/components/personal-records/session-link.tsx`
   - Implementacja linku do sesji treningowej
   - Obsługa kliknięcia z toast notification (opcjonalnie)
   - Stylowanie z użyciem Link z Next.js

8. **Utworzenie komponentu EmptyRecordsState**
   - Utworzenie pliku `src/components/personal-records/empty-records-state.tsx`
   - Implementacja pustego stanu
   - Dodanie komunikatu i opcjonalnego przycisku CTA
   - Stylowanie zgodnie z design system

9. **Dodanie linków w widoku listy rekordów**
   - Modyfikacja `PersonalRecordCard` w `src/components/personal-records/personal-record-card.tsx`
   - Dodanie linku do widoku szczegółów ćwiczenia (np. w tytule ćwiczenia)
   - Upewnienie się, że link prowadzi do `/personal-records/[exercise_id]`

10. **Testowanie**
    - Testowanie walidacji UUID
    - Testowanie obsługi błędów (404, 401, 403, 500)
    - Testowanie pustego stanu
    - Testowanie linków do sesji
    - Testowanie responsywności (mobile/desktop)
    - Testowanie dostępności (ARIA labels, keyboard navigation)

11. **Dostosowanie stylów (opcjonalnie)**
    - Dostosowanie stylów do design system
    - Dodanie animacji (opcjonalnie)
    - Optymalizacja dla dark mode

12. **Dokumentacja (opcjonalnie)**
    - Dodanie komentarzy JSDoc do komponentów
    - Aktualizacja dokumentacji projektu
