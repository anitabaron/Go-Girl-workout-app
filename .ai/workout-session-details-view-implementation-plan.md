# Plan implementacji widoku szczegółów sesji treningowej

## 1. Przegląd

Widok szczegółów sesji treningowej (`/workout-sessions/[id]`) umożliwia użytkowniczce przeglądanie pełnych informacji o wykonanej lub trwającej sesji treningowej. Widok prezentuje dane w trybie porównawczym, pokazując różnice między planowanymi parametrami a faktycznym wykonaniem. Dla sesji w statusie `in_progress` widok oferuje możliwość wznowienia treningu, natomiast dla sesji `completed` jest w pełni read-only.

Głównym celem widoku jest:

- Wyświetlenie metadanych sesji (data, czas trwania, status, nazwa planu)
- Prezentacja listy ćwiczeń w kolejności z sesji z porównaniem plan vs wykonanie
- Wyświetlenie szczegółowych logów serii (set logs) dla każdego ćwiczenia
- Umożliwienie wznowienia sesji dla statusu `in_progress`

## 2. Routing widoku

- **Ścieżka**: `/workout-sessions/[id]`
- **Plik**: `src/app/(app)/workout-sessions/[id]/page.tsx`
- **Typ**: Server Component (Next.js App Router)
- **Parametry dynamiczne**: `id` (UUID sesji treningowej)

Widok jest dostępny poprzez:

- Link z listy sesji (`/workout-sessions`)
- Bezpośrednie wejście przez URL z ID sesji
- Link z innych widoków (np. z rekordów PR)

## 3. Struktura komponentów

```
WorkoutSessionDetailsPage (Server Component)
├── WorkoutSessionMetadata (Server Component)
│   ├── SessionStatusBadge (Client Component)
│   └── SessionDurationDisplay (Server Component)
├── WorkoutSessionActions (Client Component)
│   └── ResumeSessionButton (Client Component) - tylko dla in_progress
└── WorkoutSessionExercisesList (Server Component)
    └── WorkoutSessionExerciseItem (Server Component) [dla każdego ćwiczenia]
        ├── ExerciseHeader (Server Component)
        ├── PlannedVsActualComparison (Server Component)
        │   ├── PlannedSection (Server Component)
        │   └── ActualSection (Server Component)
        └── SetLogsTable (Server Component)
```

## 4. Szczegóły komponentów

### WorkoutSessionDetailsPage

- **Opis komponentu**: Główny komponent strony, odpowiedzialny za pobranie danych sesji z API i renderowanie struktury widoku. Jest to Server Component, który wykonuje fetch danych po stronie serwera.
- **Główne elementy HTML**:
  - `<main>` - główny kontener z ARIA landmark
  - `<div className="container">` - kontener z maksymalną szerokością
  - `<h1>` - tytuł strony z nazwą planu
  - Sekcje: metadane, akcje, lista ćwiczeń
- **Obsługiwane zdarzenia**: Brak (Server Component)
- **Obsługiwana walidacja**:
  - Walidacja UUID w parametrze `id` (przez Next.js routing)
  - Obsługa błędów 404 (sesja nie znaleziona)
  - Obsługa błędów 401/403 (brak autoryzacji)
- **Typy**:
  - Props: `{ params: Promise<{ id: string }> }`
  - DTO: `SessionDetailDTO` z `@/types`
- **Props**:
  - `params` - obiekt z parametrami dynamicznymi Next.js

### WorkoutSessionMetadata

- **Opis komponentu**: Wyświetla metadane sesji treningowej: datę rozpoczęcia, datę zakończenia (jeśli completed), czas trwania, nazwę planu oraz status sesji.
- **Główne elementy HTML**:
  - `<Card>` (shadcn/ui) - karta z metadanymi
  - `<CardHeader>` - nagłówek z tytułem
  - `<CardContent>` - zawartość z informacjami
  - `<div>` - grid z metadanymi (data rozpoczęcia, data zakończenia, czas trwania)
  - `<SessionStatusBadge>` - badge ze statusem
- **Obsługiwane zdarzenia**: Brak (Server Component)
- **Obsługiwana walidacja**:
  - Sprawdzenie, czy `started_at` istnieje (wymagane)
  - Formatowanie dat zgodnie z lokalizacją polską
  - Obliczanie czasu trwania (różnica między `started_at` a `completed_at` lub aktualnym czasem dla `in_progress`)
- **Typy**:
  - Props: `{ session: SessionSummaryDTO }`
  - ViewModel: Brak (używa bezpośrednio DTO)
- **Props**:
  - `session` - obiekt `SessionSummaryDTO` zawierający metadane sesji

### SessionStatusBadge

- **Opis komponentu**: Client Component wyświetlający badge ze statusem sesji (in_progress/completed) z odpowiednią ikoną i kolorem.
- **Główne elementy HTML**:
  - `<Badge>` (shadcn/ui) - komponent badge
  - Ikony z `lucide-react`: `Play` dla in_progress, `CheckCircle2` dla completed
- **Obsługiwane zdarzenia**: Brak (tylko wyświetlanie)
- **Obsługiwana walidacja**:
  - Sprawdzenie wartości `status` (musi być `in_progress` lub `completed`)
- **Typy**:
  - Props: `{ status: WorkoutSessionStatus }`
- **Props**:
  - `status` - status sesji (`"in_progress" | "completed"`)

### SessionDurationDisplay

- **Opis komponentu**: Server Component obliczający i wyświetlający czas trwania sesji w czytelnym formacie (godziny i minuty).
- **Główne elementy HTML**:
  - `<span>` - tekst z czasem trwania
- **Obsługiwane zdarzenia**: Brak (Server Component)
- **Obsługiwana walidacja**:
  - Sprawdzenie, czy `completed_at` istnieje (dla completed) lub użycie aktualnego czasu (dla in_progress)
  - Obliczanie różnicy czasowej w milisekundach
  - Formatowanie: "Xh Ymin" lub "Ymin" (jeśli < 1h)
- **Typy**:
  - Props: `{ startedAt: string; completedAt: string | null; status: WorkoutSessionStatus }`
- **Props**:
  - `startedAt` - data rozpoczęcia sesji (ISO string)
  - `completedAt` - data zakończenia sesji (ISO string | null)
  - `status` - status sesji

### WorkoutSessionActions

- **Opis komponentu**: Client Component zawierający przyciski akcji dla sesji. Dla sesji `in_progress` wyświetla przycisk "Wznów trening", dla `completed` nie wyświetla żadnych akcji (lub tylko informację o read-only).
- **Główne elementy HTML**:
  - `<div>` - kontener z przyciskami
  - `<Button>` (shadcn/ui) - przycisk wznowienia (tylko dla in_progress)
- **Obsługiwane zdarzenia**:
  - `onClick` na przycisku "Wznów trening" - przekierowanie do `/workout-sessions/[id]/active`
- **Obsługiwana walidacja**:
  - Sprawdzenie statusu sesji przed wyświetleniem przycisku
- **Typy**:
  - Props: `{ sessionId: string; status: WorkoutSessionStatus }`
- **Props**:
  - `sessionId` - ID sesji treningowej
  - `status` - status sesji

### ResumeSessionButton

- **Opis komponentu**: Client Component reprezentujący przycisk wznowienia sesji. Używa `Link` z Next.js do przekierowania do asystenta treningowego.
- **Główne elementy HTML**:
  - `<Link>` (Next.js) - link do asystenta
  - `<Button>` (shadcn/ui) - przycisk z ikoną `Play`
- **Obsługiwane zdarzenia**:
  - Kliknięcie - przekierowanie do `/workout-sessions/[id]/active`
- **Obsługiwana walidacja**:
  - Przycisk wyświetlany tylko dla statusu `in_progress`
- **Typy**:
  - Props: `{ sessionId: string }`
- **Props**:
  - `sessionId` - ID sesji treningowej

### WorkoutSessionExercisesList

- **Opis komponentu**: Server Component renderujący listę wszystkich ćwiczeń sesji w kolejności zgodnej z `exercise_order`. Każde ćwiczenie jest renderowane jako osobny komponent `WorkoutSessionExerciseItem`.
- **Główne elementy HTML**:
  - `<div>` - kontener z listą ćwiczeń
  - `<WorkoutSessionExerciseItem>` - komponent pojedynczego ćwiczenia (renderowany w pętli)
- **Obsługiwane zdarzenia**: Brak (Server Component)
- **Obsługiwana walidacja**:
  - Sprawdzenie, czy lista ćwiczeń nie jest pusta
  - Sortowanie ćwiczeń po `exercise_order` (ascending)
- **Typy**:
  - Props: `{ exercises: SessionExerciseDTO[] }`
- **Props**:
  - `exercises` - tablica ćwiczeń sesji

### WorkoutSessionExerciseItem

- **Opis komponentu**: Server Component reprezentujący pojedyncze ćwiczenie w sesji. Wyświetla nagłówek ćwiczenia, porównanie planned vs actual oraz tabelę serii (set logs).
- **Główne elementy HTML**:
  - `<Card>` (shadcn/ui) - karta ćwiczenia
  - `<CardHeader>` - nagłówek z tytułem i badge'ami (type, part)
  - `<CardContent>` - zawartość z porównaniem i tabelą serii
  - `<ExerciseHeader>` - nagłówek ćwiczenia
  - `<PlannedVsActualComparison>` - komponent porównawczy
  - `<SetLogsTable>` - tabela serii
- **Obsługiwane zdarzenia**: Brak (Server Component)
- **Obsługiwana walidacja**:
  - Sprawdzenie, czy ćwiczenie ma dane (tytuł, type, part)
  - Obsługa przypadku, gdy ćwiczenie zostało pominięte (`is_skipped === true`)
- **Typy**:
  - Props: `{ exercise: SessionExerciseDTO; exerciseIndex: number; totalExercises: number }`
- **Props**:
  - `exercise` - dane ćwiczenia z sesji
  - `exerciseIndex` - indeks ćwiczenia (0-based, do wyświetlenia "Ćwiczenie X z Y")
  - `totalExercises` - całkowita liczba ćwiczeń w sesji

### ExerciseHeader

- **Opis komponentu**: Server Component wyświetlający nagłówek ćwiczenia: tytuł, typ, partię oraz numer ćwiczenia w kolejności.
- **Główne elementy HTML**:
  - `<h3>` - tytuł ćwiczenia
  - `<div>` - kontener z badge'ami (type, part)
  - `<Badge>` (shadcn/ui) - badge z typem i partią
  - `<span>` - numer ćwiczenia ("Ćwiczenie X z Y")
- **Obsługiwane zdarzenia**: Brak (Server Component)
- **Obsługiwana walidacja**:
  - Sprawdzenie, czy `exercise_title_at_time` istnieje
  - Mapowanie wartości enum na czytelne etykiety polskie
- **Typy**:
  - Props: `{ exercise: SessionExerciseDTO; index: number; total: number }`
- **Props**:
  - `exercise` - dane ćwiczenia
  - `index` - indeks ćwiczenia (0-based)
  - `total` - całkowita liczba ćwiczeń

### PlannedVsActualComparison

- **Opis komponentu**: Server Component wyświetlający porównanie parametrów planowanych vs wykonanych w układzie side-by-side (desktop) lub stacked (mobile). Wizualnie wyróżnia różnice kolorami (zielony dla zgodności, żółty/pomarańczowy dla różnic).
- **Główne elementy HTML**:
  - `<div>` - kontener z gridem (responsive: 1 kolumna mobile, 2 kolumny desktop)
  - `<PlannedSection>` - sekcja planowanych parametrów
  - `<ActualSection>` - sekcja wykonanych parametrów
  - `<div>` - wskaźniki różnic (ikony lub kolory tła)
- **Obsługiwane zdarzenia**: Brak (Server Component)
- **Obsługiwana walidacja**:
  - Porównanie wartości planned vs actual dla każdego parametru
  - Obsługa wartości null (brak danych)
  - Wyróżnienie różnic wizualnie
- **Typy**:
  - Props: `{ planned: PlannedParams; actual: ActualParams }`
  - ViewModel:
    ```typescript
    type PlannedParams = {
      sets: number | null;
      reps: number | null;
      duration_seconds: number | null;
      rest_seconds: number | null;
    };
    type ActualParams = {
      count_sets: number | null;
      sum_reps: number | null;
      duration_seconds: number | null;
      rest_seconds: number | null;
      is_skipped: boolean;
    };
    ```
- **Props**:
  - `planned` - obiekt z parametrami planowanymi
  - `actual` - obiekt z parametrami wykonanymi

### PlannedSection

- **Opis komponentu**: Server Component wyświetlający sekcję z parametrami planowanymi ćwiczenia.
- **Główne elementy HTML**:
  - `<div>` - kontener sekcji
  - `<h4>` - tytuł sekcji "Planowane"
  - `<dl>` - lista definicji z parametrami (sets, reps, duration, rest)
  - `<dt>` - etykieta parametru
  - `<dd>` - wartość parametru (lub "-" jeśli null)
- **Obsługiwane zdarzenia**: Brak (Server Component)
- **Obsługiwana walidacja**:
  - Formatowanie wartości (liczba dla sets/reps, czas dla duration/rest)
  - Obsługa wartości null (wyświetlenie "-")
- **Typy**:
  - Props: `{ params: PlannedParams }`
- **Props**:
  - `params` - parametry planowane

### ActualSection

- **Opis komponentu**: Server Component wyświetlający sekcję z parametrami wykonanymi ćwiczenia. Jeśli ćwiczenie zostało pominięte, wyświetla odpowiedni komunikat.
- **Główne elementy HTML**:
  - `<div>` - kontener sekcji
  - `<h4>` - tytuł sekcji "Wykonane"
  - `<Badge>` - badge "Pominięte" (jeśli `is_skipped === true`)
  - `<dl>` - lista definicji z parametrami
  - `<dt>` - etykieta parametru
  - `<dd>` - wartość parametru z wyróżnieniem różnic (kolor tła)
- **Obsługiwane zdarzenia**: Brak (Server Component)
- **Obsługiwana walidacja**:
  - Sprawdzenie flagi `is_skipped`
  - Formatowanie wartości
  - Porównanie z planned i wyróżnienie różnic
- **Typy**:
  - Props: `{ params: ActualParams; planned: PlannedParams }`
- **Props**:
  - `params` - parametry wykonane
  - `planned` - parametry planowane (do porównania)

### SetLogsTable

- **Opis komponentu**: Server Component wyświetlający tabelę serii (set logs) dla ćwiczenia. Tabela jest read-only i pokazuje wszystkie zapisane serie z wartościami reps, duration, weight.
- **Główne elementy HTML**:
  - `<div>` - kontener z tabelą (z możliwością przewijania)
  - `<Table>` (shadcn/ui) - komponent tabeli
  - `<TableHeader>` - nagłówek tabeli
  - `<TableRow>` - wiersz nagłówka
  - `<TableHead>` - komórki nagłówka (Seria, Powtórzenia, Czas, Obciążenie)
  - `<TableBody>` - ciało tabeli
  - `<TableRow>` - wiersze danych (dla każdej serii)
  - `<TableCell>` - komórki danych
- **Obsługiwane zdarzenia**: Brak (Server Component, read-only)
- **Obsługiwana walidacja**:
  - Sprawdzenie, czy lista serii nie jest pusta
  - Sortowanie serii po `set_number` (ascending)
  - Formatowanie wartości (liczba dla reps/weight, czas dla duration)
  - Obsługa wartości null (wyświetlenie "-")
- **Typy**:
  - Props: `{ sets: SessionExerciseSetDTO[] }`
- **Props**:
  - `sets` - tablica serii ćwiczenia

## 5. Typy

### Typy DTO (z `@/types`)

#### SessionDetailDTO

```typescript
type SessionDetailDTO = SessionSummaryDTO & {
  exercises: SessionExerciseDTO[];
};
```

#### SessionSummaryDTO

```typescript
type SessionSummaryDTO = {
  id: string;
  workout_plan_id: string | null;
  plan_name_at_time: string | null;
  status: "in_progress" | "completed";
  started_at: string; // ISO string
  completed_at: string | null; // ISO string | null
  current_position: number;
};
```

#### SessionExerciseDTO

```typescript
type SessionExerciseDTO = {
  id: string;
  exercise_id: string;
  exercise_title_at_time: string;
  exercise_type_at_time: ExerciseType;
  exercise_part_at_time: ExercisePart;
  exercise_order: number;
  // Parametry planowane
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  // Parametry wykonane
  actual_count_sets: number | null; // Liczba wykonanych serii
  actual_sum_reps: number | null; // Suma reps ze wszystkich serii
  actual_duration_seconds: number | null;
  actual_rest_seconds: number | null;
  is_skipped: boolean;
  // Serie
  sets: SessionExerciseSetDTO[];
};
```

#### SessionExerciseSetDTO

```typescript
type SessionExerciseSetDTO = {
  set_number: number;
  reps: number | null;
  duration_seconds: number | null;
  weight_kg: number | null;
};
```

### Typy ViewModel (lokalne dla komponentów)

#### PlannedParams

```typescript
type PlannedParams = {
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
};
```

#### ActualParams

```typescript
type ActualParams = {
  count_sets: number | null;
  sum_reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  is_skipped: boolean;
};
```

#### ComparisonResult

```typescript
type ComparisonResult = {
  sets: { planned: number | null; actual: number | null; matches: boolean };
  reps: { planned: number | null; actual: number | null; matches: boolean };
  duration: { planned: number | null; actual: number | null; matches: boolean };
  rest: { planned: number | null; actual: number | null; matches: boolean };
};
```

### Typy pomocnicze

#### ExerciseTypeLabels

```typescript
const typeLabels: Record<ExerciseType, string> = {
  "Warm-up": "Rozgrzewka",
  "Main Workout": "Główny trening",
  "Cool-down": "Schłodzenie",
};
```

#### ExercisePartLabels

```typescript
const partLabels: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};
```

## 6. Zarządzanie stanem

Widok szczegółów sesji jest w większości read-only i nie wymaga zarządzania stanem po stronie klienta. Wszystkie dane są pobierane przez Server Component i renderowane statycznie.

Jedyny Client Component wymagający minimalnego stanu to `ResumeSessionButton`, który może używać lokalnego stanu do obsługi stanu ładowania podczas przekierowania (opcjonalnie, ponieważ Next.js Link obsługuje to automatycznie).

**Brak potrzeby custom hooków** - widok nie wymaga złożonego zarządzania stanem, ponieważ:

- Dane są pobierane po stronie serwera (Server Component)
- Brak formularzy do edycji (read-only)
- Brak interaktywnych elementów wymagających stanu (oprócz prostego przekierowania)

## 7. Integracja API

### Endpoint

**GET** `/api/workout-sessions/[id]`

### Typ żądania

- **Metoda**: `GET`
- **URL**: `/api/workout-sessions/{id}`
- **Parametry ścieżki**: `id` (UUID sesji treningowej)
- **Query params**: Brak
- **Body**: Brak
- **Headers**:
  - `Authorization: Bearer <token>` (obsługiwane przez Supabase middleware)
  - `Content-Type: application/json`

### Typ odpowiedzi

**Sukces (200 OK)**:

```typescript
SessionDetailDTO;
```

**Błędy**:

- **400 Bad Request**: Nieprawidłowy format UUID
- **401 Unauthorized**: Brak autoryzacji
- **403 Forbidden**: Brak dostępu do sesji (RLS)
- **404 Not Found**: Sesja nie została znaleziona
- **500 Internal Server Error**: Błąd serwera

### Implementacja w komponencie

```typescript
// W WorkoutSessionDetailsPage (Server Component)
async function fetchSessionDetails(
  sessionId: string
): Promise<SessionDetailDTO> {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL || ""
    }/api/workout-sessions/${sessionId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Zawsze pobierz najnowsze dane
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Sesja treningowa nie została znaleziona.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Brak dostępu do tej sesji.");
    }
    throw new Error("Wystąpił błąd podczas pobierania danych sesji.");
  }

  return response.json();
}
```

**Alternatywnie** (jeśli używamy bezpośredniego wywołania serwisu):

```typescript
import { getWorkoutSessionService } from "@/services/workout-sessions";

const session = await getWorkoutSessionService(userId, sessionId);
```

### Obsługa błędów API

- **404**: Wyświetlenie komunikatu "Sesja treningowa nie została znaleziona" z linkiem powrotu do listy sesji
- **401/403**: Przekierowanie do logowania lub wyświetlenie komunikatu o braku dostępu
- **500**: Wyświetlenie ogólnego komunikatu błędu z możliwością odświeżenia strony
- **Brak danych**: Obsługa przypadku, gdy sesja nie ma ćwiczeń (pusta sesja)

## 8. Interakcje użytkownika

### Interakcje podstawowe

1. **Wejście na widok**:

   - Użytkowniczka klika na kartę sesji z listy (`/workout-sessions`)
   - Lub wchodzi bezpośrednio przez URL `/workout-sessions/[id]`
   - Server Component pobiera dane z API
   - Wyświetlenie metadanych, listy ćwiczeń i serii

2. **Przeglądanie ćwiczeń**:

   - Użytkowniczka przewija listę ćwiczeń
   - Dla każdego ćwiczenia widzi porównanie planned vs actual
   - Przegląda szczegóły serii w tabeli

3. **Wznowienie sesji** (tylko dla `in_progress`):
   - Użytkowniczka klika przycisk "Wznów trening"
   - Przekierowanie do `/workout-sessions/[id]/active` (asystent treningowy)
   - Sesja jest kontynuowana od ostatniego miejsca

### Interakcje responsywne

- **Mobile (< 768px)**:

  - Sekcje planned vs actual wyświetlane jedna pod drugą (stacked layout)
  - Tabela serii z przewijaniem poziomym (jeśli potrzeba)
  - Przyciski akcji na pełną szerokość

- **Desktop (≥ 768px)**:
  - Sekcje planned vs actual obok siebie (grid 2 kolumny)
  - Tabela serii bez przewijania (jeśli mieści się na ekranie)
  - Przyciski akcji w kontenerze z wyrównaniem

### Interakcje dostępności

- **Keyboard navigation**:

  - `Tab` - przechodzenie między interaktywnymi elementami (przycisk "Wznów trening")
  - `Enter/Space` - aktywacja przycisku
  - `Arrow keys` - przewijanie listy ćwiczeń (opcjonalnie)

- **Screen readers**:
  - ARIA labels dla wszystkich sekcji i tabel
  - Semantyczne HTML (`<main>`, `<section>`, `<table>`, `<dl>`)
  - Opisy różnic między planned a actual w tekście alternatywnym

## 9. Warunki i walidacja

### Warunki weryfikowane przez interfejs

1. **Status sesji**:

   - **Warunek**: Sprawdzenie wartości `status` (musi być `"in_progress"` lub `"completed"`)
   - **Komponent**: `WorkoutSessionActions`, `ResumeSessionButton`
   - **Wpływ na UI**:
     - Dla `in_progress`: wyświetlenie przycisku "Wznów trening"
     - Dla `completed`: brak przycisku (lub komunikat "Sesja zakończona")

2. **Obecność danych ćwiczeń**:

   - **Warunek**: Sprawdzenie, czy `exercises.length > 0`
   - **Komponent**: `WorkoutSessionExercisesList`
   - **Wpływ na UI**:
     - Jeśli pusta: wyświetlenie komunikatu "Sesja nie zawiera ćwiczeń"
     - Jeśli niepusta: renderowanie listy ćwiczeń

3. **Obecność serii dla ćwiczenia**:

   - **Warunek**: Sprawdzenie, czy `exercise.sets.length > 0`
   - **Komponent**: `SetLogsTable`
   - **Wpływ na UI**:
     - Jeśli pusta: wyświetlenie komunikatu "Brak zapisanych serii"
     - Jeśli niepusta: renderowanie tabeli serii

4. **Ćwiczenie pominięte**:

   - **Warunek**: Sprawdzenie flagi `exercise.is_skipped === true`
   - **Komponent**: `ActualSection`, `WorkoutSessionExerciseItem`
   - **Wpływ na UI**:
     - Wyświetlenie badge'a "Pominięte"
     - Wizualne wyróżnienie (szary kolor, przekreślenie)
     - Pominięcie porównania parametrów (lub wyświetlenie z wartościami 0)

5. **Wartości null w parametrach**:

   - **Warunek**: Sprawdzenie, czy wartość parametru jest `null` lub `undefined`
   - **Komponent**: `PlannedSection`, `ActualSection`
   - **Wpływ na UI**:
     - Wyświetlenie "-" zamiast wartości
     - Brak wyróżnienia różnic (jeśli obie wartości są null)

6. **Różnice między planned a actual**:
   - **Warunek**: Porównanie wartości planned vs actual dla każdego parametru
   - **Komponent**: `PlannedVsActualComparison`, `ActualSection`
   - **Wpływ na UI**:
     - Zgodność: zielone tło lub ikona ✓
     - Różnica: żółte/pomarańczowe tło lub ikona ⚠
     - Brak danych: szare tło lub ikona -

### Walidacja po stronie API

Interfejs nie wykonuje walidacji danych wejściowych (ponieważ nie ma formularzy), ale weryfikuje poprawność danych otrzymanych z API:

- **Format UUID**: Weryfikacja przez Next.js routing (parametr `id`)
- **Struktura odpowiedzi**: TypeScript zapewnia typowanie, ale w przypadku błędów API należy obsłużyć nieoczekiwany format odpowiedzi

## 10. Obsługa błędów

### Scenariusze błędów

1. **Sesja nie znaleziona (404)**:

   - **Przyczyna**: Nieprawidłowy UUID lub sesja została usunięta
   - **Obsługa**:
     - Wyświetlenie komunikatu: "Sesja treningowa nie została znaleziona"
     - Przycisk "Wróć do listy sesji" z linkiem do `/workout-sessions`
     - Komponent: `ErrorBoundary` lub warunkowy render w `WorkoutSessionDetailsPage`

2. **Brak autoryzacji (401/403)**:

   - **Przyczyna**: Użytkowniczka nie ma dostępu do sesji (RLS) lub sesja wygasła
   - **Obsługa**:
     - Przekierowanie do `/login` (401) lub wyświetlenie komunikatu "Brak dostępu" (403)
     - Komponent: Middleware Next.js lub warunkowy render

3. **Błąd serwera (500)**:

   - **Przyczyna**: Błąd po stronie serwera lub baza danych
   - **Obsługa**:
     - Wyświetlenie komunikatu: "Wystąpił błąd serwera. Spróbuj ponownie później."
     - Przycisk "Odśwież stronę" z `window.location.reload()`
     - Komponent: `ErrorBoundary`

4. **Brak danych ćwiczeń**:

   - **Przyczyna**: Sesja nie ma przypisanych ćwiczeń (błąd w danych)
   - **Obsługa**:
     - Wyświetlenie komunikatu: "Sesja nie zawiera ćwiczeń"
     - Komponent: Warunkowy render w `WorkoutSessionExercisesList`

5. **Błąd sieci**:

   - **Przyczyna**: Brak połączenia z internetem lub timeout
   - **Obsługa**:
     - Wyświetlenie komunikatu: "Brak połączenia z internetem"
     - Przycisk "Spróbuj ponownie" z retry fetch
     - Komponent: `ErrorBoundary` lub lokalny stan błędu

6. **Nieprawidłowy format odpowiedzi**:
   - **Przyczyna**: API zwróciło nieoczekiwany format danych
   - **Obsługa**:
     - TypeScript powinien złapać błędy typów w czasie kompilacji
     - W runtime: wyświetlenie komunikatu "Nieprawidłowy format danych"
     - Logowanie błędu do konsoli (tylko w development)

### Komponenty obsługi błędów

- **ErrorBoundary** (React): Obsługa błędów renderowania komponentów
- **Warunkowy render**: Sprawdzanie `if (!session)` przed renderowaniem
- **Try-catch w Server Component**: Obsługa błędów podczas fetch danych
- **Toast notifications** (opcjonalnie): Dla błędów niekrytycznych

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. Utworzenie katalogu `src/app/(app)/workout-sessions/[id]/`
2. Utworzenie pliku `page.tsx` (Server Component)
3. Utworzenie katalogu `src/components/workout-sessions/details/`
4. Utworzenie plików komponentów:
   - `workout-session-metadata.tsx`
   - `session-status-badge.tsx`
   - `session-duration-display.tsx`
   - `workout-session-actions.tsx`
   - `resume-session-button.tsx`
   - `workout-session-exercises-list.tsx`
   - `workout-session-exercise-item.tsx`
   - `exercise-header.tsx`
   - `planned-vs-actual-comparison.tsx`
   - `planned-section.tsx`
   - `actual-section.tsx`
   - `set-logs-table.tsx`
   - `index.ts` (export barrel)

### Krok 2: Implementacja głównego komponentu strony

1. Implementacja `WorkoutSessionDetailsPage`:
   - Pobranie `sessionId` z parametrów dynamicznych
   - Wywołanie API/funkcji serwisu do pobrania danych sesji
   - Obsługa błędów (404, 401/403, 500)
   - Renderowanie struktury: metadane, akcje, lista ćwiczeń
   - Dodanie ARIA landmarks i semantycznego HTML

### Krok 3: Implementacja komponentów metadanych

1. Implementacja `WorkoutSessionMetadata`:

   - Wyświetlenie daty rozpoczęcia i zakończenia
   - Wyświetlenie nazwy planu (lub "Plan usunięty")
   - Integracja z `SessionStatusBadge`
   - Integracja z `SessionDurationDisplay`

2. Implementacja `SessionStatusBadge`:

   - Renderowanie badge'a z odpowiednim kolorem i ikoną
   - Mapowanie statusu na wizualną reprezentację

3. Implementacja `SessionDurationDisplay`:
   - Obliczanie czasu trwania (różnica dat)
   - Formatowanie czasu (godziny i minuty)

### Krok 4: Implementacja komponentów akcji

1. Implementacja `WorkoutSessionActions`:

   - Warunkowe renderowanie przycisku wznowienia (tylko dla `in_progress`)
   - Integracja z `ResumeSessionButton`

2. Implementacja `ResumeSessionButton`:
   - Przycisk z ikoną `Play` i tekstem "Wznów trening"
   - Link do `/workout-sessions/[id]/active`
   - ARIA labels i dostępność

### Krok 5: Implementacja listy ćwiczeń

1. Implementacja `WorkoutSessionExercisesList`:

   - Mapowanie tablicy ćwiczeń na komponenty `WorkoutSessionExerciseItem`
   - Sortowanie po `exercise_order`
   - Obsługa pustej listy ćwiczeń

2. Implementacja `WorkoutSessionExerciseItem`:

   - Renderowanie karty ćwiczenia
   - Integracja z `ExerciseHeader`
   - Integracja z `PlannedVsActualComparison`
   - Integracja z `SetLogsTable`
   - Obsługa przypadku pominiętego ćwiczenia

3. Implementacja `ExerciseHeader`:
   - Wyświetlenie tytułu ćwiczenia
   - Badge'e z typem i partią
   - Numer ćwiczenia ("Ćwiczenie X z Y")

### Krok 6: Implementacja komponentów porównawczych

1. Implementacja `PlannedVsActualComparison`:

   - Layout responsywny (stacked mobile, side-by-side desktop)
   - Integracja z `PlannedSection` i `ActualSection`
   - Logika porównywania wartości
   - Wizualne wyróżnienie różnic (kolory, ikony)

2. Implementacja `PlannedSection`:

   - Wyświetlenie parametrów planowanych (sets, reps, duration, rest)
   - Formatowanie wartości
   - Obsługa wartości null

3. Implementacja `ActualSection`:
   - Wyświetlenie parametrów wykonanych
   - Badge "Pominięte" (jeśli `is_skipped`)
   - Wyróżnienie różnic względem planned
   - Formatowanie wartości

### Krok 7: Implementacja tabeli serii

1. Implementacja `SetLogsTable`:
   - Renderowanie tabeli z użyciem komponentów shadcn/ui (`Table`)
   - Kolumny: Seria, Powtórzenia, Czas, Obciążenie
   - Sortowanie serii po `set_number`
   - Formatowanie wartości (liczba, czas, waga)
   - Obsługa wartości null
   - Przewijanie poziome na mobile (jeśli potrzeba)
   - ARIA labels dla tabeli

### Krok 8: Stylowanie i responsywność

1. Stylowanie komponentów:

   - Użycie Tailwind CSS zgodnie z design system
   - Kolory dla wyróżnienia różnic (zielony, żółty, pomarańczowy)
   - Responsywne breakpointy (mobile < 768px, desktop ≥ 768px)
   - Dark mode support (użycie klas `dark:`)

2. Layout responsywny:
   - Mobile: sekcje stacked, pełna szerokość przycisków
   - Desktop: sekcje side-by-side, przyciski w kontenerze

### Krok 9: Dostępność (a11y)

1. Dodanie ARIA labels:

   - Dla wszystkich sekcji (`aria-label` lub `aria-labelledby`)
   - Dla tabel (`aria-label` dla tabeli, `aria-describedby` dla opisów)
   - Dla przycisków (opisowe `aria-label`)

2. Semantyczne HTML:

   - Użycie `<main>`, `<section>`, `<table>`, `<dl>` zamiast `<div>`
   - Właściwe nagłówki hierarchiczne (`<h1>`, `<h2>`, `<h3>`)

3. Keyboard navigation:
   - Wszystkie interaktywne elementy dostępne przez `Tab`
   - Focus management (widoczny focus indicator)

### Krok 10: Testowanie

1. Testy funkcjonalne:

   - Pobranie danych sesji `completed` - sprawdzenie wyświetlenia wszystkich sekcji
   - Pobranie danych sesji `in_progress` - sprawdzenie przycisku wznowienia
   - Obsługa błędów (404, 401/403, 500)
   - Obsługa pustej listy ćwiczeń
   - Obsługa ćwiczeń bez serii
   - Obsługa ćwiczeń pominiętych

2. Testy responsywności:

   - Sprawdzenie layoutu na mobile (< 768px)
   - Sprawdzenie layoutu na desktop (≥ 768px)
   - Sprawdzenie przewijania tabeli serii na mobile

3. Testy dostępności:

   - Test z screen readerem (VoiceOver, NVDA)
   - Test nawigacji klawiaturą
   - Sprawdzenie ARIA labels

4. Testy integracyjne:
   - Integracja z API endpoint `/api/workout-sessions/[id]`
   - Sprawdzenie przekierowania do asystenta (dla `in_progress`)
   - Sprawdzenie linków z innych widoków

### Krok 11: Optymalizacja i finał

1. Optymalizacja wydajności:

   - Memoizacja komponentów (React.memo) dla listy ćwiczeń
   - Lazy loading obrazów (jeśli będą dodane w przyszłości)
   - Optymalizacja renderowania dużych list ćwiczeń

2. Dokumentacja:

   - Komentarze w kodzie dla złożonych logik
   - README dla komponentów (opcjonalnie)

3. Code review i refaktoryzacja:
   - Przegląd kodu pod kątem zgodności z zasadami projektu
   - Refaktoryzacja duplikacji kodu
   - Sprawdzenie zgodności z TypeScript strict mode
