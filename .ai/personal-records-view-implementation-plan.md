# Plan implementacji widoku Lista rekordów osobistych

## 1. Przegląd

Widok listy rekordów osobistych (`/personal-records`) to główny widok do przeglądania wszystkich rekordów użytkowniczki z możliwością filtrowania, sortowania i paginacji. Widok wyświetla rekordy pogrupowane per ćwiczenie z możliwością rozwijania szczegółów (accordion pattern). Każde ćwiczenie może mieć wiele typów rekordów (total_reps, max_duration, max_weight), które są wyświetlane z datą osiągnięcia i opcjonalnym linkiem do sesji treningowej. Widok obsługuje pusty stan z komunikatem zachęcającym do rozpoczęcia treningu oraz wyróżnia nowe rekordy osiągnięte w ostatniej sesji. Implementacja wykorzystuje Next.js 16 App Router z podziałem na Server Components (dla fetchowania danych) i Client Components (dla interaktywnych elementów UI).

## 2. Routing widoku

- **Ścieżka**: `/personal-records`
- **Plik**: `src/app/personal-records/page.tsx`
- **Typ**: Server Component (główny page) z zagnieżdżonymi Client Components dla interaktywnych elementów

## 3. Struktura komponentów

```
PersonalRecordsPage (Server Component)
├── PersonalRecordsHeader (Server Component) - nagłówek strony
├── PersonalRecordFilters (Client Component) - filtry
│   ├── ExerciseFilter (dropdown z listą ćwiczeń)
│   └── MetricTypeFilter (dropdown: wszystkie/total_reps/max_duration/max_weight)
├── PersonalRecordSort (Client Component) - sortowanie
│   └── SortDropdown (dropdown z opcjami sortowania)
└── PersonalRecordsList (Client Component) - lista rekordów
    ├── PersonalRecordCard[] (Client Component) - karta ćwiczenia z rekordami
    │   ├── Accordion (shadcn/ui) - rozwijanie/zwijanie szczegółów
    │   ├── ExerciseInfo (Server Component) - nazwa, type, part ćwiczenia
    │   └── PersonalRecordMetric[] (Server Component) - lista metryk
    │       ├── PersonalRecordMetricItem (Server Component) - pojedyncza metryka
    │       │   ├── MetricValue (wyświetlenie wartości)
    │       │   ├── AchievedDate (data osiągnięcia)
    │       │   ├── SessionLink (opcjonalny link do sesji)
    │       │   └── NewRecordBadge (Client Component) - badge "Nowy"
    │       └── EmptyMetricsState (Client Component) - gdy brak metryk
    ├── LoadMoreButton (Client Component) - przycisk paginacji
    ├── EmptyState (Client Component) - pusty stan (gdy brak rekordów)
    └── SkeletonLoader (Client Component) - podczas ładowania
```

## 4. Szczegóły komponentów

### PersonalRecordsPage

- **Opis komponentu**: Główny komponent strony, Server Component odpowiedzialny za fetchowanie danych z API i renderowanie struktury widoku. Zarządza stanem URL (query params) dla filtrów i sortowania. Pobiera listę ćwiczeń dla filtrów oraz rekordy osobiste z API.
- **Główne elementy**:
  - Kontener główny z layoutem
  - Nagłówek strony (`PersonalRecordsHeader`)
  - Sekcja filtrów i sortowania
  - Lista rekordów lub pusty stan
- **Obsługiwane interakcje**:
  - Przekazywanie query params do komponentów potomnych
  - Obsługa błędów z API (wyświetlanie komunikatu błędu)
- **Obsługiwana walidacja**:
  - Walidacja query params przez `personalRecordQuerySchema` (Zod)
  - Sprawdzanie poprawności UUID dla `exercise_id`
  - Walidacja `metric_type` (enum: total_reps, max_duration, max_weight)
  - Walidacja `sort` (achieved_at, value)
  - Walidacja `order` (asc, desc)
  - Walidacja `limit` (max 100, default 20)
  - Fallback do domyślnych wartości przy błędzie walidacji
- **Typy**:
  - `PersonalRecordQueryParams` - parametry zapytania
  - `PersonalRecordWithExerciseDTO[]` - odpowiedź z API
  - `PersonalRecordsPageResponse` - ViewModel po mapowaniu
  - `ExerciseDTO[]` - lista ćwiczeń dla filtrów
- **Props**: Brak (Server Component, czyta z URL `searchParams`)

### PersonalRecordsHeader

- **Opis komponentu**: Server Component renderujący nagłówek strony z tytułem "Rekordy osobiste".
- **Główne elementy**:
  - Tytuł strony
  - Opcjonalny opis/instrukcja
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Props**: Brak

### PersonalRecordFilters

- **Opis komponentu**: Client Component zawierający dropdowny do filtrowania rekordów. Zmiany w filtrach aktualizują URL query params, co powoduje refetch danych przez Server Component.
- **Główne elementy**:
  - Dropdown z listą ćwiczeń (`exercise_id`)
  - Dropdown z typami metryk (`metric_type`: wszystkie/total_reps/max_duration/max_weight)
  - Przycisk resetowania filtrów (opcjonalnie)
- **Obsługiwane interakcje**:
  - Wybór ćwiczenia z dropdowna → aktualizacja URL query param `exercise_id`
  - Wybór typu metryki → aktualizacja URL query param `metric_type`
  - Reset filtrów → usunięcie query params `exercise_id` i `metric_type`
  - Reset kursora paginacji przy zmianie filtrów
- **Obsługiwana walidacja**:
  - Sprawdzanie czy wybrane ćwiczenie istnieje na liście
  - Sprawdzanie czy wybrany typ metryki jest poprawny
- **Typy**:
  - `ExerciseDTO[]` - lista ćwiczeń do wyświetlenia w dropdownie
- **Props**:
  - `exercises: ExerciseDTO[]` - lista ćwiczeń do wyświetlenia w filtrze

### PersonalRecordSort

- **Opis komponentu**: Client Component zawierający dropdown do sortowania rekordów. Zmiany w sortowaniu aktualizują URL query params.
- **Główne elementy**:
  - Dropdown z opcjami sortowania:
    - "Najnowsze pierwsze" (achieved_at desc)
    - "Najstarsze pierwsze" (achieved_at asc)
    - "Największa wartość" (value desc)
    - "Najmniejsza wartość" (value asc)
- **Obsługiwane interakcje**:
  - Wybór opcji sortowania → aktualizacja URL query params `sort` i `order`
  - Reset kursora paginacji przy zmianie sortowania
- **Obsługiwana walidacja**:
  - Sprawdzanie czy wybrane sortowanie jest poprawne
- **Typy**: Brak
- **Props**: Brak

### PersonalRecordsList

- **Opis komponentu**: Client Component zarządzający listą rekordów z obsługą paginacji "Load more". Zarządza stanem listy (akumulacja wyników przy paginacji) i resetuje listę przy zmianie filtrów/sortowania.
- **Główne elementy**:
  - Kontener listy
  - Mapowanie `PersonalRecordCard` dla każdego ćwiczenia z rekordami
  - Przycisk "Load more" (gdy `nextCursor` istnieje)
  - `EmptyState` gdy `items.length === 0`
  - Skeleton loader podczas ładowania
- **Obsługiwane interakcje**:
  - Renderowanie kart rekordów
  - Wyświetlanie przycisku "Load more" z obsługą paginacji
  - Reset listy przy zmianie filtrów/sortowania (brak kursora w URL)
  - Akumulacja wyników przy "Load more" (append do istniejącej listy)
- **Obsługiwana walidacja**:
  - Sprawdzanie czy lista jest pusta
  - Sprawdzanie czy istnieje `nextCursor` dla paginacji
- **Typy**:
  - `PersonalRecordsPageResponse` - ViewModel z danymi
  - `PersonalRecordQueryParams` - parametry zapytania
- **Props**:
  - `initialData: PersonalRecordsPageResponse` - początkowe dane z Server Component
  - `query: PersonalRecordQueryParams` - parametry zapytania
  - `errorMessage: string | null` - komunikat błędu (jeśli wystąpił)

### PersonalRecordCard

- **Opis komponentu**: Client Component renderujący kartę ćwiczenia z rekordami. Używa Accordion (shadcn/ui) do rozwijania/zwijania szczegółów rekordów. Wyświetla podstawowe informacje o ćwiczeniu oraz listę metryk.
- **Główne elementy**:
  - Accordion (shadcn/ui) z triggerem i contentem
  - Trigger: nazwa ćwiczenia, type, part (zawsze widoczne)
  - Content: lista metryk (`PersonalRecordMetricItem`)
  - Badge "Nowy" dla ćwiczeń z nowymi rekordami (opcjonalnie na triggerze)
- **Obsługiwane interakcje**:
  - Kliknięcie triggera → rozwijanie/zwijanie szczegółów (accordion)
  - Keyboard navigation (Enter/Space na focus triggera)
- **Obsługiwana walidacja**:
  - Sprawdzanie czy ćwiczenie ma metryki
- **Typy**:
  - `PersonalRecordGroupVM` - ViewModel grupy rekordów per ćwiczenie
- **Props**:
  - `recordGroup: PersonalRecordGroupVM` - dane grupy rekordów dla ćwiczenia

### PersonalRecordMetricItem

- **Opis komponentu**: Server Component renderujący pojedynczą metrykę rekordu z wartością, datą osiągnięcia, opcjonalnym linkiem do sesji i badge "Nowy".
- **Główne elementy**:
  - Typ metryki (label: "Maks. powtórzenia", "Maks. czas", "Maks. ciężar")
  - Wartość metryki (sformatowana):
    - `total_reps`: liczba (np. "15")
    - `max_duration`: czas w formacie MM:SS (np. "02:30")
    - `max_weight`: waga w kg (np. "50 kg")
  - Data osiągnięcia (sformatowana w formacie polskim)
  - Link do sesji (jeśli `sessionId` istnieje) → `/workout-sessions/[session_id]`
  - Badge "Nowy" (jeśli `isNew === true`)
- **Obsługiwane interakcje**:
  - Kliknięcie linku do sesji → nawigacja do szczegółów sesji + toast notification
  - Keyboard navigation (Enter na focus linku)
- **Obsługiwana walidacja**:
  - Sprawdzanie czy wszystkie wymagane pola są dostępne
  - Sprawdzanie czy `sessionId` jest poprawnym UUID (jeśli istnieje)
- **Typy**:
  - `PersonalRecordMetricVM` - ViewModel pojedynczej metryki
- **Props**:
  - `metric: PersonalRecordMetricVM` - dane metryki do wyświetlenia

### NewRecordBadge

- **Opis komponentu**: Client Component renderujący badge "Nowy" dla świeżych rekordów osiągniętych w ostatniej sesji.
- **Główne elementy**:
  - Badge z tekstem "Nowy"
  - Wyróżniający kolor/styl
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Props**: Brak (może być używany wewnątrz `PersonalRecordMetricItem`)

### LoadMoreButton

- **Opis komponentu**: Client Component renderujący przycisk "Załaduj więcej" do paginacji. Ukrywa się, gdy `nextCursor` jest null.
- **Główne elementy**:
  - Przycisk "Załaduj więcej"
  - Stan ładowania (disabled podczas fetchowania)
  - Spinner/loader podczas ładowania
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku → dodanie `cursor` do URL query params
  - Fetchowanie następnej strony przez API
  - Akumulacja wyników do istniejącej listy
  - Ukrycie przycisku, gdy `nextCursor` jest null
- **Obsługiwana walidacja**:
  - Sprawdzanie czy `nextCursor` istnieje przed wyświetleniem
- **Typy**:
  - `string | null` - kursor paginacji
- **Props**:
  - `nextCursor: string | null` - kursor dla następnej strony
  - `onLoadMore: (cursor: string) => Promise<void>` - callback do załadowania więcej

### EmptyState

- **Opis komponentu**: Client Component renderujący pusty stan, gdy użytkowniczka nie ma żadnych rekordów.
- **Główne elementy**:
  - Ikona lub ilustracja (opcjonalnie)
  - Komunikat: "Nie masz jeszcze żadnych rekordów. Rozpocznij trening, aby zacząć śledzić postępy!"
  - Opcjonalny CTA do rozpoczęcia treningu (link do `/workout-plans`)
- **Obsługiwane interakcje**:
  - Kliknięcie CTA → nawigacja do listy planów treningowych
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Props**: Brak

### SkeletonLoader

- **Opis komponentu**: Client Component renderujący skeleton loader podczas ładowania danych.
- **Główne elementy**:
  - Skeleton cards imitujące strukturę `PersonalRecordCard`
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Props**: Brak

## 5. Typy

### Typy DTO (z `src/types.ts`)

#### PersonalRecordDTO

```typescript
type PersonalRecordDTO = {
  id: string; // UUID
  exercise_id: string; // UUID
  metric_type: PRMetricType; // "total_reps" | "max_duration" | "max_weight"
  value: number; // Wartość rekordu
  achieved_at: string; // ISO 8601 timestamp
  achieved_in_session_id: string | null; // UUID sesji lub null
  achieved_in_set_number: number | null; // Numer serii lub null
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
};
```

#### PersonalRecordWithExerciseDTO

```typescript
type PersonalRecordWithExerciseDTO = PersonalRecordDTO & {
  exercise: {
    id: string; // UUID
    title: string; // Nazwa ćwiczenia
    type: ExerciseType; // "Warm-up" | "Main Workout" | "Cool-down"
    part: ExercisePart; // "Legs" | "Core" | "Back" | "Arms" | "Chest"
  };
};
```

#### PersonalRecordQueryParams

```typescript
type PersonalRecordQueryParams = {
  exercise_id?: string; // UUID, opcjonalny
  metric_type?: PRMetricType; // "total_reps" | "max_duration" | "max_weight", opcjonalny
  sort?: "achieved_at" | "value"; // Domyślnie "achieved_at"
  order?: "asc" | "desc"; // Domyślnie "desc"
  limit?: number; // Domyślnie 20, max 100
  cursor?: string | null; // Kursor paginacji (base64url encoded JSON)
};
```

#### PRMetricType

```typescript
type PRMetricType = "total_reps" | "max_duration" | "max_weight";
```

### Typy ViewModel (z `src/lib/personal-records/view-model.ts`)

#### PersonalRecordsPageResponse

```typescript
type PersonalRecordsPageResponse = {
  items: PersonalRecordGroupVM[]; // Lista grup rekordów per ćwiczenie
  nextCursor: string | null; // Kursor paginacji lub null
};
```

#### PersonalRecordGroupVM

```typescript
type PersonalRecordGroupVM = {
  exerciseId: string; // UUID ćwiczenia
  title: string; // Nazwa ćwiczenia (przetłumaczona)
  type: string; // Typ ćwiczenia (przetłumaczony: "Warm-up", "Main workout", "Cool-down")
  part: string; // Partia mięśniowa (przetłumaczona: "Legs", "Core", "Back", "Arms", "Chest")
  metrics: PersonalRecordMetricVM[]; // Lista metryk dla ćwiczenia
};
```

#### PersonalRecordMetricVM

```typescript
type PersonalRecordMetricVM = {
  metricType: PRMetricType; // Typ metryki
  label: string; // Etykieta metryki (przetłumaczona: "Maks. powtórzenia", "Maks. czas", "Maks. ciężar")
  valueDisplay: string; // Wartość sformatowana do wyświetlenia (np. "15", "02:30", "50 kg")
  achievedAt: string; // Data osiągnięcia (sformatowana w formacie polskim)
  sessionId: string | null; // UUID sesji lub null
  isNew: boolean; // Czy rekord jest nowy (osiągnięty w ostatniej sesji)
};
```

### Typy pomocnicze

#### ExerciseDTO (dla filtrów)

```typescript
type ExerciseDTO = {
  id: string; // UUID
  title: string; // Nazwa ćwiczenia
  type: ExerciseType; // Typ ćwiczenia
  part: ExercisePart; // Partia mięśniowa
  // ... inne pola (nieużywane w filtrach)
};
```

## 6. Zarządzanie stanem

Widok wykorzystuje **URL state** (query params) jako główne źródło prawdy dla filtrów, sortowania i paginacji. Nie wymaga custom hooka ani zewnętrznego store (Zustand/Context).

### Stan zarządzany przez URL:

- `exercise_id` - filtr ćwiczenia (UUID, opcjonalny)
- `metric_type` - filtr typu metryki (opcjonalny)
- `sort` - pole sortowania (default: "achieved_at")
- `order` - kierunek sortowania (default: "desc")
- `cursor` - cursor paginacji (opcjonalny, base64url encoded JSON)
- `limit` - limit wyników (default: 20, max: 100)

### Client Components używają:

- `useSearchParams()` z Next.js do odczytu query params
- `useRouter()` z Next.js do aktualizacji URL
- `usePathname()` do zachowania ścieżki przy aktualizacji query params
- `useState()` do zarządzania lokalnym stanem listy (akumulacja przy paginacji)
- `useEffect()` do resetowania listy przy zmianie filtrów/sortowania
- `useTransition()` do optymalizacji aktualizacji stanu podczas paginacji

### Server Component:

- Czyta query params z `searchParams` (Next.js 16)
- Przekazuje je do API endpoint
- Renderuje dane na podstawie odpowiedzi API

### Przykład użycia w Client Component:

```typescript
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function PersonalRecordFilters({ exercises }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const handleExerciseChange = (exerciseId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (exerciseId) {
      params.set("exercise_id", exerciseId);
    } else {
      params.delete("exercise_id");
    }
    // Reset cursor przy zmianie filtrów
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  };
}
```

### Zarządzanie stanem listy w PersonalRecordsList:

```typescript
const [records, setRecords] = useState(initialData.items);
const [nextCursor, setNextCursor] = useState(initialData.nextCursor);

// Reset przy zmianie filtrów/sortowania
useEffect(() => {
  const currentCursor = searchParams.get("cursor");
  if (!currentCursor) {
    setRecords(initialData.items);
    setNextCursor(initialData.nextCursor);
  }
}, [searchParams, initialData]);
```

## 7. Integracja API

### Endpoint: `GET /api/personal-records`

**Typ żądania**: `GET`

**URL**: `/api/personal-records`

**Query Parameters** (zgodnie z `PersonalRecordQueryParams`):

- `exercise_id?` (string, UUID) - Filtruje rekordy dla konkretnego ćwiczenia
- `metric_type?` (enum: `total_reps` | `max_duration` | `max_weight`) - Filtruje po typie metryki
- `sort?` (enum: `achieved_at` | `value`, default: `achieved_at`) - Pole sortowania
- `order?` (enum: `asc` | `desc`, default: `desc`) - Kierunek sortowania
- `limit?` (number, default: 20, max: 100) - Liczba wyników na stronę
- `cursor?` (string, base64url encoded JSON) - Kursor paginacji

**Request Body**: Brak

**Typ odpowiedzi** (Success 200):

```typescript
{
  items: PersonalRecordWithExerciseDTO[];
  nextCursor: string | null;
}
```

**Typy błędów**:

- `401 Unauthorized` - Brak aktywnej sesji użytkownika
- `403 Forbidden` - Brak dostępu do zasobu
- `400 Bad Request` - Nieprawidłowe parametry zapytania (walidacja Zod)
- `500 Internal Server Error` - Błąd serwera

**Przykład użycia w Server Component**:

```typescript
import { listPersonalRecordsService } from "@/services/personal-records";

const personalRecords = await listPersonalRecordsService(userId, parsedQuery);
```

**Przykład użycia w Client Component (paginacja)**:

```typescript
const handleLoadMore = async (cursor: string) => {
  setIsLoadingMore(true);
  try {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", cursor);

    const response = await fetch(`/api/personal-records?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to load more records");
    }

    const data = await response.json();

    // Append nowych rekordów do istniejącej listy
    startTransition(() => {
      setRecords((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    });
  } catch (error) {
    console.error("Error loading more records:", error);
    // Obsługa błędu (toast notification)
  } finally {
    setIsLoadingMore(false);
  }
};
```

### Dodatkowe wywołanie API: Pobranie listy ćwiczeń dla filtrów

**Endpoint**: `GET /api/exercises`

**Query Parameters**:

- `limit: 100` - Większy limit dla listy filtrów
- `sort: "title"`
- `order: "asc"`

**Typ odpowiedzi**: `CursorPage<ExerciseDTO>`

**Użycie**: Tylko w Server Component (`PersonalRecordsPage`) do pobrania listy ćwiczeń dla dropdowna w filtrach.

## 8. Interakcje użytkownika

### 8.1 Filtrowanie rekordów

**Akcja**: Użytkowniczka wybiera wartość w dropdownie "Ćwiczenie" lub "Typ metryki"

**Rezultat**:

1. Client Component (`PersonalRecordFilters`) aktualizuje URL query params
2. Next.js automatycznie refetchuje Server Component (`PersonalRecordsPage`)
3. Server Component wywołuje API z nowymi parametrami
4. Lista rekordów jest odświeżana z nowymi danymi
5. Cursor paginacji jest resetowany (usunięty z URL)

**Implementacja**:

- Użycie `useRouter().push()` z zaktualizowanymi query params
- Reset `cursor` przy zmianie filtrów

### 8.2 Sortowanie rekordów

**Akcja**: Użytkowniczka wybiera opcję sortowania (np. "Najnowsze pierwsze")

**Rezultat**:

1. Client Component (`PersonalRecordSort`) aktualizuje URL query params `sort` i `order`
2. Next.js automatycznie refetchuje Server Component
3. Server Component wywołuje API z nowymi parametrami sortowania
4. Lista rekordów jest sortowana zgodnie z wyborem
5. Cursor paginacji jest resetowany

**Implementacja**:

- Mapowanie opcji UI na pary `(sort, order)`
- Aktualizacja URL przez `router.push()`

### 8.3 Paginacja "Load more"

**Akcja**: Użytkowniczka klika przycisk "Załaduj więcej"

**Rezultat**:

1. Client Component (`LoadMoreButton`) dodaje `cursor` do URL query params
2. Client Component wykonuje fetch do API z kursorem
3. Nowe rekordy są dodawane do istniejącej listy (append, nie replace)
4. Przycisk "Load more" jest ukrywany, jeśli `nextCursor` jest null

**Implementacja**:

- Użycie `fetch()` z dodanym `cursor` do istniejących params
- Akumulacja wyników w stanie lokalnym (`useState`)
- Użycie `useTransition()` do optymalizacji aktualizacji stanu

### 8.4 Rozwijanie/zwijanie szczegółów rekordów

**Akcja**: Użytkowniczka klika na trigger Accordion w karcie ćwiczenia

**Rezultat**:

1. Accordion rozwijany/zwijany (shadcn/ui)
2. Lista metryk jest wyświetlana/ukrywana
3. Keyboard navigation działa (Enter/Space)

**Implementacja**:

- Użycie komponentu `Accordion` z shadcn/ui
- ARIA labels dla dostępności

### 8.5 Nawigacja do sesji treningowej

**Akcja**: Użytkowniczka klika link do sesji w metryce rekordu

**Rezultat**:

1. Nawigacja do `/workout-sessions/[session_id]`
2. Toast notification z komunikatem (np. "Przechodzisz do sesji treningowej")
3. Wyświetlenie szczegółów sesji, w której rekord został osiągnięty

**Implementacja**:

- Użycie `Link` z Next.js do nawigacji
- Użycie `toast()` z sonner do powiadomienia

### 8.6 Reset filtrów

**Akcja**: Użytkowniczka klika przycisk "Reset" (opcjonalnie)

**Rezultat**:

1. Wszystkie filtry są resetowane (usunięte z URL)
2. Lista rekordów jest odświeżana z domyślnymi parametrami
3. Cursor paginacji jest resetowany

**Implementacja**:

- Usunięcie query params `exercise_id` i `metric_type` z URL

## 9. Warunki i walidacja

### 9.1 Walidacja query params (Server Component)

**Warunki weryfikowane przez `personalRecordQuerySchema` (Zod)**:

- `exercise_id`: Jeśli podane, musi być prawidłowym UUID (regex)
- `metric_type`: Jeśli podane, musi być jednym z: `total_reps`, `max_duration`, `max_weight`
- `sort`: Musi być `achieved_at` lub `value` (default: `achieved_at`)
- `order`: Musi być `asc` lub `desc` (default: `desc`)
- `limit`: Musi być liczbą całkowitą dodatnią, max 100 (default: 20)
- `cursor`: Jeśli podane, musi być prawidłowym base64url encoded JSON (walidacja w `decodeCursor`)

**Obsługa błędów walidacji**:

- Jeśli walidacja się nie powiedzie, używane są domyślne wartości (`personalRecordQuerySchema.parse({})`)
- Błędy walidacji są logowane, ale nie blokują renderowania strony

### 9.2 Walidacja danych z API (Client Component)

**Warunki weryfikowane w komponentach**:

- `PersonalRecordsList`: Sprawdzanie czy `items.length === 0` (wyświetlenie pustego stanu)
- `PersonalRecordsList`: Sprawdzanie czy `nextCursor !== null` (wyświetlenie przycisku "Load more")
- `PersonalRecordCard`: Sprawdzanie czy `metrics.length > 0` (wyświetlenie metryk lub pustego stanu)
- `PersonalRecordMetricItem`: Sprawdzanie czy `sessionId` jest poprawnym UUID (jeśli istnieje, przed renderowaniem linku)

**Wpływ na stan interfejsu**:

- Pusty stan: Ukrycie listy, wyświetlenie `EmptyState`
- Brak kursora: Ukrycie przycisku "Load more"
- Brak metryk w ćwiczeniu: Wyświetlenie komunikatu "Brak rekordów dla tego ćwiczenia" (opcjonalnie)

### 9.3 Walidacja formatowania wartości

**Warunki weryfikowane w `formatMetricValue`**:

- `total_reps`: Wartość musi być liczbą całkowitą (wyświetlana jako string)
- `max_duration`: Wartość musi być liczbą (sekundy), formatowana do MM:SS
- `max_weight`: Wartość musi być liczbą (kg), formatowana z jednostką "kg"

**Obsługa błędów**:

- Fallback do `value.toString()` dla nieznanych typów metryk

## 10. Obsługa błędów

### 10.1 Błędy API

**Scenariusze błędów**:

1. **401 Unauthorized**: Brak aktywnej sesji użytkownika
   - **Obsługa**: Przekierowanie do strony logowania (przez middleware/auth)
   - **Komunikat**: "Musisz być zalogowana, aby zobaczyć rekordy"

2. **403 Forbidden**: Brak dostępu do zasobu
   - **Obsługa**: Wyświetlenie komunikatu błędu w `PersonalRecordsList`
   - **Komunikat**: "Nie masz dostępu do tego zasobu"

3. **400 Bad Request**: Nieprawidłowe parametry zapytania
   - **Obsługa**: Fallback do domyślnych wartości w Server Component
   - **Komunikat**: Błąd jest logowany, ale nie wyświetlany użytkownikowi (używane są domyślne wartości)

4. **500 Internal Server Error**: Błąd serwera
   - **Obsługa**: Wyświetlenie komunikatu błędu w `PersonalRecordsList`
   - **Komunikat**: "Wystąpił błąd serwera. Spróbuj ponownie później."

5. **Błąd sieci podczas paginacji**: Niepowodzenie fetch podczas "Load more"
   - **Obsługa**: Toast notification z komunikatem błędu
   - **Komunikat**: "Nie udało się załadować więcej rekordów. Spróbuj ponownie."

**Implementacja**:

```typescript
// W PersonalRecordsPage (Server Component)
try {
  personalRecords = await listPersonalRecordsService(userId, parsedQuery);
} catch (error) {
  errorMessage =
    error instanceof Error
      ? error.message
      : "Nie udało się pobrać rekordów.";
}

// W PersonalRecordsList (Client Component)
if (errorMessage) {
  return (
    <div className="text-center py-8">
      <p className="text-destructive">{errorMessage}</p>
    </div>
  );
}
```

### 10.2 Błędy walidacji kursora

**Scenariusz**: Nieprawidłowy kursor paginacji (np. zmiana sortowania przy aktywnym kursorze)

**Obsługa**:

- API zwraca błąd `BAD_REQUEST` z komunikatem "Nieprawidłowy kursor paginacji"
- Frontend resetuje kursor (usunięcie z URL) i ponownie pobiera dane z domyślnymi parametrami

### 10.3 Błędy podczas ładowania ćwiczeń dla filtrów

**Scenariusz**: Niepowodzenie pobrania listy ćwiczeń dla dropdowna w filtrach

**Obsługa**:

- Błąd jest logowany (`console.error`)
- Aplikacja kontynuuje działanie bez listy ćwiczeń w filtrze (dropdown jest ukryty lub wyłączony)
- Filtrowanie po `exercise_id` nadal działa przez ręczne wpisanie UUID (opcjonalnie)

### 10.4 Pusty stan

**Scenariusz**: Użytkowniczka nie ma żadnych rekordów

**Obsługa**:

- Wyświetlenie `EmptyState` z komunikatem: "Nie masz jeszcze żadnych rekordów. Rozpocznij trening, aby zacząć śledzić postępy!"
- Opcjonalny CTA do rozpoczęcia treningu (link do `/workout-plans`)

### 10.5 Brak metryk dla ćwiczenia

**Scenariusz**: Ćwiczenie ma rekordy, ale w grupie nie ma żadnych metryk (teoretycznie niemożliwe, ale warto obsłużyć)

**Obsługa**:

- Wyświetlenie komunikatu w `PersonalRecordCard`: "Brak dostępnych rekordów dla tego ćwiczenia" (opcjonalnie)

## 11. Kroki implementacji

1. **Przygotowanie struktury plików**:
   - Utworzenie folderu `src/components/personal-records/`
   - Utworzenie pliku `src/app/personal-records/page.tsx` (jeśli nie istnieje)

2. **Implementacja Server Component (PersonalRecordsPage)**:
   - Walidacja i parsowanie query params przez `personalRecordQuerySchema`
   - Pobranie user ID przez `getUserId()`
   - Pobranie listy ćwiczeń dla filtrów (opcjonalnie, z obsługą błędów)
   - Pobranie rekordów osobistych przez `listPersonalRecordsService()`
   - Mapowanie danych do ViewModel przez `mapPersonalRecordsToViewModel()`
   - Renderowanie struktury widoku z komponentami potomnymi

3. **Implementacja PersonalRecordsHeader**:
   - Renderowanie nagłówka strony z tytułem

4. **Implementacja PersonalRecordFilters (Client Component)**:
   - Użycie `useSearchParams()`, `useRouter()`, `usePathname()`
   - Dropdown z listą ćwiczeń (Select z shadcn/ui)
   - Dropdown z typami metryk (Select z shadcn/ui)
   - Obsługa zmian filtrów (aktualizacja URL, reset kursora)
   - Opcjonalny przycisk resetowania filtrów

5. **Implementacja PersonalRecordSort (Client Component)**:
   - Użycie `useSearchParams()`, `useRouter()`, `usePathname()`
   - Dropdown z opcjami sortowania (Select z shadcn/ui)
   - Mapowanie opcji UI na pary `(sort, order)`
   - Obsługa zmian sortowania (aktualizacja URL, reset kursora)

6. **Implementacja PersonalRecordsList (Client Component)**:
   - Użycie `useState()` do zarządzania stanem listy i kursora
   - Użycie `useEffect()` do resetowania listy przy zmianie filtrów/sortowania
   - Renderowanie `PersonalRecordCard` dla każdego ćwiczenia
   - Renderowanie `LoadMoreButton` (gdy `nextCursor` istnieje)
   - Renderowanie `EmptyState` (gdy `items.length === 0`)
   - Renderowanie komunikatu błędu (gdy `errorMessage` istnieje)

7. **Implementacja PersonalRecordCard (Client Component)**:
   - Instalacja komponentu `Accordion` z shadcn/ui (jeśli nie istnieje): `npx shadcn@latest add accordion`
   - Użycie `Accordion` do rozwijania/zwijania szczegółów
   - Renderowanie triggera z nazwą ćwiczenia, type, part
   - Renderowanie contentu z listą metryk (`PersonalRecordMetricItem`)
   - Opcjonalny badge "Nowy" na triggerze (jeśli ćwiczenie ma nowe rekordy)

8. **Implementacja PersonalRecordMetricItem (Server Component)**:
   - Renderowanie typu metryki (label)
   - Renderowanie wartości metryki (sformatowanej)
   - Renderowanie daty osiągnięcia (sformatowanej)
   - Renderowanie linku do sesji (jeśli `sessionId` istnieje)
   - Renderowanie `NewRecordBadge` (jeśli `isNew === true`)

9. **Implementacja NewRecordBadge (Client Component)**:
   - Renderowanie badge z tekstem "Nowy"
   - Stylowanie wyróżniające (np. kolor primary)

10. **Implementacja LoadMoreButton (Client Component)**:
    - Użycie `useState()` do zarządzania stanem ładowania
    - Użycie `useTransition()` do optymalizacji aktualizacji stanu
    - Fetchowanie następnej strony przez API
    - Akumulacja wyników do istniejącej listy
    - Ukrycie przycisku, gdy `nextCursor` jest null
    - Wyświetlenie spinnera podczas ładowania

11. **Implementacja EmptyState (Client Component)**:
    - Renderowanie komunikatu: "Nie masz jeszcze żadnych rekordów. Rozpocznij trening, aby zacząć śledzić postępy!"
    - Opcjonalny CTA do rozpoczęcia treningu (link do `/workout-plans`)

12. **Implementacja SkeletonLoader (Client Component)**:
    - Instalacja komponentu `Skeleton` z shadcn/ui (jeśli nie istnieje): `npx shadcn@latest add skeleton`
    - Renderowanie skeleton cards imitujących strukturę `PersonalRecordCard`

13. **Integracja z toast notifications**:
    - Użycie `toast()` z sonner przy kliknięciu linku do sesji
    - Użycie `toast.error()` przy błędach podczas paginacji

14. **Testowanie**:
    - Testowanie filtrowania (exercise_id, metric_type)
    - Testowanie sortowania (achieved_at, value, asc, desc)
    - Testowanie paginacji ("Load more")
    - Testowanie rozwijania/zwijania szczegółów (accordion)
    - Testowanie nawigacji do sesji
    - Testowanie pustego stanu
    - Testowanie obsługi błędów (401, 403, 500, błąd sieci)
    - Testowanie keyboard navigation
    - Testowanie dostępności (ARIA labels)

15. **Optymalizacja i poprawki**:
    - Sprawdzenie wydajności renderowania dużej liczby rekordów
    - Optymalizacja akumulacji wyników przy paginacji
    - Sprawdzenie responsywności na różnych urządzeniach
    - Sprawdzenie zgodności z wymaganiami dostępności (a11y)
