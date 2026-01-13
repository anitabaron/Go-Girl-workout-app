# Plan implementacji widoku Lista ćwiczeń

## 1. Przegląd

Widok listy ćwiczeń (`/exercises`) to główny widok biblioteki ćwiczeń użytkowniczki. Umożliwia przeglądanie, filtrowanie i sortowanie wszystkich ćwiczeń z możliwością paginacji. Widok obsługuje pusty stan z CTA do dodania pierwszego ćwiczenia oraz zapewnia dostęp do operacji CRUD na ćwiczeniach. Implementacja wykorzystuje Next.js 16 App Router z podziałem na Server Components (dla fetchowania danych) i Client Components (dla interaktywnych elementów UI).

## 2. Routing widoku

- **Ścieżka**: `/exercises`
- **Plik**: `src/app/exercises/page.tsx`
- **Typ**: Server Component (główny page) z zagnieżdżonymi Client Components dla interaktywnych elementów

## 3. Struktura komponentów

```
ExercisesPage (Server Component)
├── ExercisesList (Server Component)
│   ├── ExerciseCard[] (Server Component)
│   └── EmptyState (Client Component) - gdy brak ćwiczeń
├── ExerciseFilters (Client Component)
│   ├── PartFilter (dropdown)
│   ├── TypeFilter (dropdown)
│   └── LevelFilter (dropdown) - opcjonalnie
├── ExerciseSort (Client Component)
│   └── SortDropdown (dropdown)
├── AddExerciseButton (Client Component)
└── SkeletonLoader (Client Component) - podczas ładowania
```

## 4. Szczegóły komponentów

### ExercisesPage

- **Opis komponentu**: Główny komponent strony, Server Component odpowiedzialny za fetchowanie danych z API i renderowanie struktury widoku. Zarządza stanem URL (query params) dla filtrów i sortowania.
- **Główne elementy**:
  - Kontener główny z layoutem
  - Nagłówek z tytułem "Biblioteka ćwiczeń"
  - Sekcja filtrów i sortowania
  - Lista ćwiczeń lub pusty stan
  - Przycisk dodawania ćwiczenia
- **Obsługiwane interakcje**:
  - Przekazywanie query params do komponentów potomnych
  - Obsługa nawigacji do formularza dodawania ćwiczenia
- **Obsługiwana walidacja**:
  - Walidacja query params przez `exerciseQuerySchema` (Zod)
  - Sprawdzanie poprawności wartości enumów (part, type)
  - Walidacja limit (max 50, default 20)
  - Walidacja sort i order (whitelisted fields)
- **Typy**:
  - `ExerciseQueryParams` - parametry zapytania
  - `CursorPage<ExerciseDTO>` - odpowiedź z API
  - `ExerciseDTO` - pojedyncze ćwiczenie
- **Props**: Brak (Server Component, czyta z URL)

### ExercisesList

- **Opis komponentu**: Server Component renderujący listę ćwiczeń na podstawie danych z API. Obsługuje paginację przez "Load more" oraz pusty stan.
- **Główne elementy**:
  - Kontener listy (grid lub flex layout)
  - Mapowanie `ExerciseCard` dla każdego ćwiczenia
  - Przycisk "Load more" (gdy `nextCursor` istnieje)
  - `EmptyState` gdy `items.length === 0`
- **Obsługiwane interakcje**:
  - Renderowanie kart ćwiczeń
  - Wyświetlanie przycisku "Load more" z obsługą paginacji
  - Przekierowanie do pustego stanu
- **Obsługiwana walidacja**:
  - Sprawdzanie czy lista jest pusta
  - Sprawdzanie czy istnieje `nextCursor` dla paginacji
- **Typy**:
  - `ExerciseDTO[]` - lista ćwiczeń
  - `CursorPage<ExerciseDTO>` - odpowiedź z API z paginacją
- **Props**:
  - `exercises: ExerciseDTO[]` - lista ćwiczeń do wyświetlenia
  - `nextCursor?: string | null` - cursor dla następnej strony
  - `hasMore: boolean` - flaga czy są więcej ćwiczeń

### ExerciseCard

- **Opis komponentu**: Server Component renderujący kartę pojedynczego ćwiczenia z podstawowymi informacjami. Kliknięcie prowadzi do szczegółów ćwiczenia.
- **Główne elementy**:
  - Tytuł ćwiczenia (`title`)
  - Badge z typem (`type`: Warm-up | Main Workout | Cool-down)
  - Badge z częścią ciała (`part`: Legs | Core | Back | Arms | Chest)
  - Opcjonalny badge z poziomem (`level` jeśli dostępny)
  - Link do szczegółów ćwiczenia (`/exercises/[id]`)
- **Obsługiwane interakcje**:
  - Kliknięcie karty → nawigacja do `/exercises/[id]`
  - Keyboard navigation (Enter/Space na focus)
- **Obsługiwana walidacja**:
  - Sprawdzanie czy wszystkie wymagane pola są dostępne
- **Typy**:
  - `ExerciseDTO` - dane ćwiczenia
- **Props**:
  - `exercise: ExerciseDTO` - dane ćwiczenia do wyświetlenia

### ExerciseFilters

- **Opis komponentu**: Client Component zawierający dropdowny do filtrowania ćwiczeń. Zmiany w filtrach aktualizują URL query params, co powoduje refetch danych przez Server Component.
- **Główne elementy**:
  - Dropdown "Part" (Legs | Core | Back | Arms | Chest | Wszystkie)
  - Dropdown "Type" (Warm-up | Main Workout | Cool-down | Wszystkie)
  - Opcjonalnie: Dropdown "Level" (jeśli potrzebne)
  - Przycisk "Wyczyść filtry"
- **Obsługiwane interakcje**:
  - Zmiana wartości dropdowna → aktualizacja URL query params
  - Kliknięcie "Wyczyść filtry" → usunięcie wszystkich filtrów z URL
  - Synchronizacja z URL przy mount (odczyt aktualnych query params)
- **Obsługiwana walidacja**:
  - Walidacja wartości enumów przed aktualizacją URL
  - Sprawdzanie czy wartość jest w dozwolonych enumach
- **Typy**:
  - `ExercisePart` - enum części ciała
  - `ExerciseType` - enum typu ćwiczenia
- **Props**:
  - `initialPart?: ExercisePart` - początkowy filtr part z URL
  - `initialType?: ExerciseType` - początkowy filtr type z URL
  - `onFilterChange: (filters: { part?: ExercisePart; type?: ExerciseType }) => void` - callback przy zmianie filtrów

### ExerciseSort

- **Opis komponentu**: Client Component z dropdownem do sortowania listy ćwiczeń. Zmiany w sortowaniu aktualizują URL query params.
- **Główne elementy**:
  - Dropdown "Sortuj według" z opcjami:
    - Data utworzenia (created_at) - domyślnie desc
    - Tytuł (title)
    - Część ciała (part)
    - Typ (type)
  - Toggle "Rosnąco/Malejąco" (order: asc/desc)
- **Obsługiwane interakcje**:
  - Zmiana pola sortowania → aktualizacja `sort` w URL
  - Zmiana kierunku → aktualizacja `order` w URL
  - Synchronizacja z URL przy mount
- **Obsługiwana walidacja**:
  - Walidacja `sort` (musi być w: created_at, title, part, type)
  - Walidacja `order` (musi być: asc lub desc)
- **Typy**:
  - `ExerciseQueryParams["sort"]` - pole sortowania
  - `ExerciseQueryParams["order"]` - kierunek sortowania
- **Props**:
  - `initialSort: "created_at" | "title" | "part" | "type"` - początkowy sort z URL (default: "created_at")
  - `initialOrder: "asc" | "desc"` - początkowy order z URL (default: "desc")
  - `onSortChange: (sort: string, order: string) => void` - callback przy zmianie sortowania

### EmptyState

- **Opis komponentu**: Client Component wyświetlający pusty stan gdy użytkowniczka nie ma żadnych ćwiczeń. Zawiera ikonę, komunikat i CTA do dodania pierwszego ćwiczenia.
- **Główne elementy**:
  - Ikona (np. dumbbell lub empty state icon z shadcn/ui)
  - Tytuł: "Nie masz jeszcze żadnych ćwiczeń"
  - Opis: "Dodaj pierwsze ćwiczenie, aby rozpocząć budowanie swojej biblioteki treningowej"
  - Przycisk CTA: "Dodaj pierwsze ćwiczenie" → `/exercises/new`
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku CTA → nawigacja do formularza dodawania
  - Keyboard navigation (Enter/Space)
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych typów
- **Props**:
  - `onAddClick: () => void` - callback przy kliknięciu CTA (opcjonalnie, może być link)

### AddExerciseButton

- **Opis komponentu**: Client Component z przyciskiem dodawania nowego ćwiczenia. Może być FAB (Floating Action Button) na mobile lub przycisk w górnym pasku na desktop.
- **Główne elementy**:
  - Przycisk z ikoną "+" i etykietą "Dodaj ćwiczenie"
  - Link do `/exercises/new`
- **Obsługiwane interakcje**:
  - Kliknięcie → nawigacja do formularza dodawania
  - Keyboard navigation
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych typów
- **Props**:
  - `variant?: "fab" | "button"` - wariant przycisku (FAB na mobile, button na desktop)

### SkeletonLoader

- **Opis komponentu**: Client Component wyświetlający skeleton loaders podczas ładowania listy ćwiczeń. Używa komponentu Skeleton z shadcn/ui.
- **Główne elementy**:
  - Powtarzalne karty skeleton (symulacja ExerciseCard)
  - Liczba kart: zgodna z `limit` (domyślnie 20)
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych typów
- **Props**:
  - `count?: number` - liczba skeletonów do wyświetlenia (default: 20)

## 5. Typy

### Typy z API (już zdefiniowane w `src/types.ts`)

#### ExerciseDTO

```typescript
type ExerciseDTO = {
  id: string;
  title: string;
  type: ExerciseType; // "Warm-up" | "Main Workout" | "Cool-down"
  part: ExercisePart; // "Legs" | "Core" | "Back" | "Arms" | "Chest"
  level: string | null;
  details: string | null;
  reps: number | null;
  duration_seconds: number | null;
  series: number;
  rest_in_between_seconds: number | null;
  rest_after_series_seconds: number | null;
  created_at: string;
  updated_at: string;
};
```

#### ExerciseQueryParams

```typescript
type ExerciseQueryParams = {
  search?: string;
  part?: ExercisePart;
  type?: ExerciseType;
  sort?: "created_at" | "title" | "part" | "type";
  order?: "asc" | "desc";
  limit?: number;
  cursor?: string | null;
};
```

#### CursorPage<ExerciseDTO>

```typescript
type CursorPage<TItem> = {
  items: TItem[];
  nextCursor?: string | null;
};
```

### Nowe typy ViewModel (opcjonalne, dla komponentów)

#### ExerciseCardViewModel

```typescript
type ExerciseCardViewModel = {
  id: string;
  title: string;
  type: ExerciseType;
  typeLabel: string; // "Rozgrzewka" | "Główny trening" | "Schłodzenie"
  part: ExercisePart;
  partLabel: string; // "Nogi" | "Brzuch" | "Plecy" | "Ręce" | "Klatka"
  level: string | null;
  href: string; // `/exercises/${id}`
};
```

#### ExerciseFiltersState

```typescript
type ExerciseFiltersState = {
  part?: ExercisePart | null;
  type?: ExerciseType | null;
};
```

#### ExerciseSortState

```typescript
type ExerciseSortState = {
  sort: "created_at" | "title" | "part" | "type";
  order: "asc" | "desc";
};
```

## 6. Zarządzanie stanem

Widok wykorzystuje **URL state** (query params) jako główne źródło prawdy dla filtrów i sortowania. Nie wymaga custom hooka ani zewnętrznego store (Zustand/Context).

### Stan zarządzany przez URL:

- `part` - filtr części ciała
- `type` - filtr typu ćwiczenia
- `sort` - pole sortowania (default: "created_at")
- `order` - kierunek sortowania (default: "desc")
- `cursor` - cursor paginacji (opcjonalny)
- `limit` - limit wyników (default: 20, max: 50)

### Client Components używają:

- `useSearchParams()` z Next.js do odczytu query params
- `useRouter()` z Next.js do aktualizacji URL
- `usePathname()` do zachowania ścieżki przy aktualizacji query params

### Server Component:

- Czyta query params z `searchParams` (Next.js 16)
- Przekazuje je do API endpoint
- Renderuje dane na podstawie odpowiedzi API

### Przykład użycia w Client Component:

```typescript
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function ExerciseFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentPart = searchParams.get("part") as ExercisePart | null;
  const currentType = searchParams.get("type") as ExerciseType | null;

  const handleFilterChange = (filters: ExerciseFiltersState) => {
    const params = new URLSearchParams(searchParams.toString());

    if (filters.part) {
      params.set("part", filters.part);
    } else {
      params.delete("part");
    }

    if (filters.type) {
      params.set("type", filters.type);
    } else {
      params.delete("type");
    }

    // Reset cursor przy zmianie filtrów
    params.delete("cursor");

    router.push(`${pathname}?${params.toString()}`);
  };

  // ...
}
```

## 7. Integracja API

### Endpoint: `GET /api/exercises`

#### Typ żądania:

- **Method**: `GET`
- **Query Parameters**: `ExerciseQueryParams`
  - `search?: string` - wyszukiwanie po tytule (normalizowane)
  - `part?: ExercisePart` - filtr części ciała
  - `type?: ExerciseType` - filtr typu
  - `sort?: "created_at" | "title" | "part" | "type"` - pole sortowania (default: "created_at")
  - `order?: "asc" | "desc"` - kierunek sortowania (default: "desc")
  - `limit?: number` - limit wyników (default: 20, max: 50)
  - `cursor?: string | null` - cursor paginacji (base64url encoded)

#### Typ odpowiedzi:

```typescript
type ApiResponse = {
  items: ExerciseDTO[];
  nextCursor?: string | null;
};
```

Status codes:

- `200` - sukces
- `400` - błędne parametry (walidacja)
- `401/403` - brak autoryzacji
- `500` - błąd serwera

#### Implementacja w Server Component:

```typescript
// src/app/exercises/page.tsx
import { exerciseQuerySchema } from '@/lib/validation/exercises';

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const parsedQuery = exerciseQuerySchema.parse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/exercises?${new URLSearchParams(
      Object.entries(parsedQuery)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString()}`,
    {
      cache: 'no-store', // Always fetch fresh data
    }
  );

  if (!response.ok) {
    // Handle error
    throw new Error('Failed to fetch exercises');
  }

  const data: CursorPage<ExerciseDTO> = await response.json();

  return (
    // Render components
  );
}
```

**Alternatywnie** (lepsze podejście dla Server Components):

- Bezpośrednie wywołanie service layer zamiast HTTP fetch:

```typescript
import { listExercisesService } from '@/services/exercises';
import { getUserId } from '@/lib/auth'; // Helper do pobrania user_id

export default async function ExercisesPage({ searchParams }) {
  const userId = await getUserId();
  const params = await searchParams;
  const parsedQuery = exerciseQuerySchema.parse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  const result = await listExercisesService(userId, parsedQuery);

  // result zawiera: { data?: ExerciseDTO[], nextCursor?: string | null, error?: ... }

  return (
    // Render components
  );
}
```

## 8. Interakcje użytkownika

### 8.1 Filtrowanie ćwiczeń

**Akcja**: Użytkowniczka wybiera wartość w dropdownie "Part" lub "Type"

**Rezultat**:

1. Client Component (`ExerciseFilters`) aktualizuje URL query params
2. Next.js automatycznie refetchuje Server Component (`ExercisesPage`)
3. Server Component wywołuje API z nowymi parametrami
4. Lista ćwiczeń jest odświeżana z nowymi danymi
5. Cursor paginacji jest resetowany (usunięty z URL)

**Implementacja**:

- Użycie `useRouter().push()` z zaktualizowanymi query params
- Reset `cursor` przy zmianie filtrów

### 8.2 Sortowanie ćwiczeń

**Akcja**: Użytkowniczka zmienia pole sortowania lub kierunek (asc/desc)

**Rezultat**:

1. Client Component (`ExerciseSort`) aktualizuje `sort` i/lub `order` w URL
2. Next.js refetchuje Server Component
3. API zwraca posortowane dane
4. Lista jest odświeżana
5. Cursor jest resetowany

**Implementacja**:

- Dropdown z opcjami sortowania
- Toggle dla kierunku (asc/desc)
- Aktualizacja URL przez `useRouter().push()`

### 8.3 Paginacja "Load more"

**Akcja**: Użytkowniczka klika przycisk "Załaduj więcej" (gdy `nextCursor` istnieje)

**Rezultat**:

1. Client Component dodaje `cursor` do URL query params
2. Server Component fetchuje następną stronę danych
3. Nowe ćwiczenia są dodawane do istniejącej listy (append, nie replace)
4. Przycisk "Load more" znika gdy `nextCursor` jest null

**Implementacja**:

- Server Action lub Client Component z `fetch()` do API
- Append nowych items do istniejącej listy
- Aktualizacja `nextCursor` w stanie

**Uwaga**: W Next.js 16 Server Components, paginacja przez "Load more" może wymagać Client Component z `useState` do zarządzania załadowanymi items, lub użycia Server Actions.

### 8.4 Nawigacja do szczegółów ćwiczenia

**Akcja**: Użytkowniczka klika kartę ćwiczenia

**Rezultat**:

1. Nawigacja do `/exercises/[id]`
2. Przekierowanie do widoku szczegółów ćwiczenia

**Implementacja**:

- Link z Next.js: `<Link href={`/exercises/${exercise.id}`}>`
- Keyboard navigation (Enter/Space)

### 8.5 Dodawanie nowego ćwiczenia

**Akcja**: Użytkowniczka klika przycisk "Dodaj ćwiczenie" (FAB lub w pasku)

**Rezultat**:

1. Nawigacja do `/exercises/new`
2. Przekierowanie do formularza tworzenia ćwiczenia

**Implementacja**:

- Link: `<Link href="/exercises/new">`

### 8.6 Pusty stan

**Akcja**: Użytkowniczka nie ma żadnych ćwiczeń (lista jest pusta)

**Rezultat**:

1. Wyświetlenie `EmptyState` zamiast listy
2. Komunikat: "Nie masz jeszcze żadnych ćwiczeń"
3. CTA: "Dodaj pierwsze ćwiczenie" → `/exercises/new`

**Implementacja**:

- Warunkowe renderowanie: `items.length === 0 ? <EmptyState /> : <ExercisesList />`

### 8.7 Keyboard navigation

**Akcja**: Użytkowniczka używa klawiatury do nawigacji

**Rezultat**:

- Tab: przejście między interaktywnymi elementami
- Enter/Space: aktywacja linku/przycisku
- Arrow keys (opcjonalnie): nawigacja w liście ćwiczeń

**Implementacja**:

- Natywne wsparcie HTML (button, link)
- ARIA labels dla screen readerów
- Focus management

## 9. Warunki i walidacja

### 9.1 Walidacja query params (po stronie serwera)

**Komponent**: `ExercisesPage` (Server Component)

**Warunki**:

- `search` - max 100 znaków, trim
- `part` - musi być w enum: `["Legs", "Core", "Back", "Arms", "Chest"]`
- `type` - musi być w enum: `["Warm-up", "Main Workout", "Cool-down"]`
- `sort` - musi być w: `["created_at", "title", "part", "type"]` (default: "created_at")
- `order` - musi być: `"asc"` lub `"desc"` (default: "desc")
- `limit` - integer, positive, max 50, default 20
- `cursor` - string (base64url encoded), opcjonalny

**Walidacja**:

- Użycie `exerciseQuerySchema` (Zod) z `src/lib/validation/exercises.ts`
- Błędy walidacji → wyświetlenie komunikatu błędu (toast) lub fallback do domyślnych wartości

**Implementacja**:

```typescript
try {
  const parsedQuery = exerciseQuerySchema.parse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });
} catch (error) {
  // Handle validation error
  // Fallback to defaults or show error message
}
```

### 9.2 Walidacja w Client Components

**Komponenty**: `ExerciseFilters`, `ExerciseSort`

**Warunki**:

- Wartości dropdownów muszą być w dozwolonych enumach
- Przed aktualizacją URL sprawdzenie poprawności wartości

**Implementacja**:

- Użycie typów TypeScript dla type safety
- Sprawdzanie wartości przed `router.push()`

### 9.3 Warunki wyświetlania

**Komponent**: `ExercisesList`

**Warunki**:

- `items.length === 0` → wyświetl `EmptyState`
- `items.length > 0` → wyświetl listę kart
- `nextCursor !== null` → wyświetl przycisk "Load more"
- `nextCursor === null` → ukryj przycisk "Load more"

**Implementacja**:

- Warunkowe renderowanie w JSX

### 9.4 Warunki dla paginacji

**Komponent**: `ExercisesList` lub Client Component do zarządzania paginacją

**Warunki**:

- Maksymalna liczba załadowanych items: 100 (zgodnie z API plan)
- Gdy `items.length >= 100` → ukryj przycisk "Load more" (nawet jeśli `nextCursor` istnieje)
- Reset cursor przy zmianie filtrów/sortowania

**Implementacja**:

- Sprawdzanie `totalLoaded >= 100` przed wyświetleniem "Load more"

## 10. Obsługa błędów

### 10.1 Błędy API (400, 401, 403, 500)

**Scenariusz**: API zwraca błąd przy fetchowaniu listy ćwiczeń

**Obsługa**:

- Server Component: użycie `error.tsx` (Next.js Error Boundary)
- Wyświetlenie komunikatu błędu: "Nie udało się załadować ćwiczeń. Spróbuj ponownie."
- Przycisk "Spróbuj ponownie" (refresh strony)

**Implementacja**:

```typescript
// src/app/exercises/error.tsx
"use client";

export default function ExercisesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Wystąpił błąd</h2>
      <p>Nie udało się załadować ćwiczeń.</p>
      <button onClick={reset}>Spróbuj ponownie</button>
    </div>
  );
}
```

### 10.2 Błędy walidacji query params

**Scenariusz**: Nieprawidłowe wartości w URL query params

**Obsługa**:

- Fallback do domyślnych wartości (`sort: "created_at"`, `order: "desc"`, `limit: 20`)
- Opcjonalnie: toast notification z komunikatem błędu
- Przekierowanie do poprawnego URL (z domyślnymi wartościami)

**Implementacja**:

- Try-catch przy parsowaniu `exerciseQuerySchema`
- Aktualizacja URL przez `router.replace()` z poprawionymi wartościami

### 10.3 Błąd sieci (network error)

**Scenariusz**: Brak połączenia z internetem lub timeout

**Obsługa**:

- Wyświetlenie komunikatu: "Brak połączenia z internetem"
- Przycisk "Spróbuj ponownie"
- Opcjonalnie: retry z exponential backoff

**Implementacja**:

- Sprawdzanie `response.ok` w fetch
- Error boundary lub Client Component z retry logic

### 10.4 Pusty wynik wyszukiwania

**Scenariusz**: Filtry/szukanie nie zwracają żadnych wyników, ale użytkowniczka ma ćwiczenia

**Obsługa**:

- Wyświetlenie komunikatu: "Nie znaleziono ćwiczeń pasujących do filtrów"
- Przycisk "Wyczyść filtry"
- Sugestia zmiany filtrów

**Implementacja**:

- Warunkowe renderowanie: `items.length === 0 && hasFilters ? <EmptySearchState /> : <EmptyState />`

### 10.5 Błąd paginacji

**Scenariusz**: `nextCursor` jest nieprawidłowy lub wygasł

**Obsługa**:

- API zwróci błąd 400 z komunikatem o nieprawidłowym cursorze
- Ukrycie przycisku "Load more"
- Toast notification: "Nie udało się załadować więcej ćwiczeń"

**Implementacja**:

- Sprawdzanie odpowiedzi API przy "Load more"
- Ukrycie przycisku przy błędzie

### 10.6 Toast notifications

**Komponenty**: Wszystkie Client Components

**Użycie**:

- Błędy API → toast z komunikatem błędu
- Sukces operacji (jeśli byłyby akcje jak usuwanie) → toast z potwierdzeniem
- Użycie komponentu Toast z shadcn/ui

**Implementacja**:

```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "Błąd",
  description: "Nie udało się załadować ćwiczeń.",
  variant: "destructive",
});
```

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. Utworzenie `src/app/exercises/page.tsx` (Server Component)
2. Utworzenie `src/app/exercises/error.tsx` (Error Boundary)
3. Utworzenie `src/app/exercises/loading.tsx` (Loading state z SkeletonLoader)
4. Utworzenie katalogu `src/components/exercises/` dla komponentów specyficznych dla ćwiczeń

### Krok 2: Implementacja głównego komponentu strony

1. Implementacja `ExercisesPage` z odczytem `searchParams`
2. Walidacja query params przez `exerciseQuerySchema`
3. Wywołanie API/service do pobrania danych
4. Renderowanie struktury widoku (nagłówek, filtry, lista)

### Krok 3: Implementacja komponentu listy

1. Utworzenie `src/components/exercises/exercises-list.tsx` (Server Component)
2. Mapowanie `ExerciseDTO[]` do kart
3. Implementacja warunkowego renderowania pustego stanu
4. Implementacja przycisku "Load more" z paginacją

### Krok 4: Implementacja karty ćwiczenia

1. Utworzenie `src/components/exercises/exercise-card.tsx` (Server Component)
2. Renderowanie podstawowych informacji (title, type, part, level)
3. Implementacja linku do szczegółów
4. Stylowanie karty (shadcn/ui Card component)

### Krok 5: Implementacja filtrów

1. Utworzenie `src/components/exercises/exercise-filters.tsx` (Client Component)
2. Implementacja dropdownów dla `part` i `type`
3. Integracja z URL state (`useSearchParams`, `useRouter`)
4. Implementacja przycisku "Wyczyść filtry"
5. Synchronizacja z URL przy mount

### Krok 6: Implementacja sortowania

1. Utworzenie `src/components/exercises/exercise-sort.tsx` (Client Component)
2. Implementacja dropdowna z opcjami sortowania
3. Implementacja toggle dla kierunku (asc/desc)
4. Integracja z URL state
5. Synchronizacja z URL przy mount

### Krok 7: Implementacja pustego stanu

1. Utworzenie `src/components/exercises/empty-state.tsx` (Client Component)
2. Dodanie ikony, tytułu i opisu
3. Implementacja przycisku CTA z nawigacją do `/exercises/new`
4. Stylowanie zgodnie z design system

### Krok 8: Implementacja przycisku dodawania

1. Utworzenie `src/components/exercises/add-exercise-button.tsx` (Client Component)
2. Implementacja FAB na mobile i button na desktop
3. Link do `/exercises/new`
4. Responsywny layout

### Krok 9: Implementacja skeleton loadera

1. Utworzenie `src/components/exercises/skeleton-loader.tsx` (Client Component)
2. Użycie komponentu Skeleton z shadcn/ui
3. Symulacja struktury `ExerciseCard`
4. Integracja z `loading.tsx`

### Krok 10: Implementacja paginacji "Load more"

1. Utworzenie Client Component do zarządzania paginacją (lub użycie Server Actions)
2. Implementacja logiki append nowych items do listy
3. Obsługa `nextCursor` z API
4. Ukrycie przycisku gdy brak więcej danych

**Uwaga**: W Next.js 16, paginacja przez "Load more" w Server Components może wymagać:

- Client Component z `useState` do zarządzania załadowanymi items
- Server Action do fetchowania następnej strony
- Lub użycie `use()` hook z Suspense dla progressive loading

### Krok 11: Implementacja obsługi błędów

1. Utworzenie `src/app/exercises/error.tsx` (Error Boundary)
2. Implementacja komunikatów błędów
3. Integracja toast notifications dla błędów w Client Components
4. Obsługa błędów walidacji query params

### Krok 12: Stylowanie i responsywność

1. Stylowanie komponentów zgodnie z design system (Tailwind 4)
2. Responsywny layout (mobile-first)
3. Dostosowanie FAB na mobile
4. Testowanie na różnych rozdzielczościach

### Krok 13: Dostępność (a11y)

1. Dodanie ARIA labels do wszystkich interaktywnych elementów
2. Keyboard navigation (Tab, Enter, Space)
3. Focus management
4. Testowanie z screen readerem

### Krok 14: Testowanie

1. Testowanie filtrowania (wszystkie kombinacje part/type)
2. Testowanie sortowania (wszystkie pola i kierunki)
3. Testowanie paginacji (load more)
4. Testowanie pustego stanu
5. Testowanie obsługi błędów (network, validation, API errors)
6. Testowanie responsywności
7. Testowanie dostępności

### Krok 15: Integracja z nawigacją główną

1. Dodanie linku do `/exercises` w głównej nawigacji
2. Wyróżnienie aktywnej sekcji w nawigacji
3. Testowanie przepływu nawigacji

### Krok 16: Optymalizacja

1. Sprawdzenie czy Server Components są poprawnie używane (brak niepotrzebnych Client Components)
2. Optymalizacja fetchowania danych (cache strategy jeśli potrzebne)
3. Lazy loading dla komponentów jeśli potrzebne
4. Sprawdzenie performance (Lighthouse)

---

**Uwagi końcowe**:

- Wszystkie komponenty powinny być zgodne z PRD i user stories (US-012, US-016)
- RLS zapewnia, że widoczne są tylko ćwiczenia użytkowniczki (bezpieczeństwo po stronie bazy)
- URL state zapewnia możliwość udostępnienia linku do przefiltrowanej listy
- Implementacja powinna być zgodna z tech stackiem: Next.js 16, TypeScript 5, React 19, Tailwind 4
