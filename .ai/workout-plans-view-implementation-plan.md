# Plan implementacji widoku Lista planów treningowych

## 1. Przegląd

Widok listy planów treningowych (`/workout-plans`) to główny widok umożliwiający przeglądanie wszystkich planów treningowych użytkowniczki. Widok obsługuje filtrowanie po części ciała (part), sortowanie po dacie utworzenia lub nazwie, paginację przez "Load more" oraz pusty stan jeśli nie ma zdefiniowanych planów z przyciskiem CTA utwórz plan. Implementacja wykorzystuje Next.js 16 App Router z podziałem na Server Components (dla fetchowania danych) i Client Components (dla interaktywnych elementów UI takich jak filtry, sortowanie i przyciski akcji).

## 2. Routing widoku

- **Ścieżka**: `/workout-plans`
- **Plik**: `src/app/workout-plans/page.tsx`
- **Typ**: Server Component (główny page) z zagnieżdżonymi Client Components dla interaktywnych elementów

## 3. Struktura komponentów

```
WorkoutPlansPage (Server Component)
├── WorkoutPlansList (Server Component)
│   ├── WorkoutPlanCard[] (Server Component)
│   └── EmptyState (Client Component) - gdy brak planów
├── WorkoutPlanFilters (Client Component)
│   └── PartFilter (dropdown)
├── WorkoutPlanSort (Client Component)
│   └── SortDropdown (dropdown)
├── CreatePlanButton (Client Component)
└── SkeletonLoader (Client Component) - podczas ładowania
```

## 4. Szczegóły komponentów

### WorkoutPlansPage

- **Opis komponentu**: Główny komponent strony, Server Component odpowiedzialny za fetchowanie danych z API i renderowanie struktury widoku. Zarządza stanem URL (query params) dla filtrów i sortowania. Pobiera dane bezpośrednio z service layer (`listWorkoutPlansService`).
- **Główne elementy**:
  - Kontener główny z layoutem
  - Nagłówek z tytułem "Plany treningowe"
  - Sekcja filtrów i sortowania
  - Lista planów lub pusty stan
  - Przycisk tworzenia planu (FAB lub w górnym pasku)
- **Obsługiwane interakcje**:
  - Przekazywanie query params do komponentów potomnych
  - Obsługa nawigacji do formularza tworzenia planu (`/workout-plans/new`)
- **Obsługiwana walidacja**:
  - Walidacja query params przez `workoutPlanQuerySchema` (Zod)
  - Sprawdzanie poprawności wartości enumów (part)
  - Walidacja limit (max 100, default 20)
  - Walidacja sort i order (whitelisted fields: "created_at", "name")
  - Fallback do domyślnych wartości przy błędzie walidacji
- **Typy**:
  - `PlanQueryParams` - parametry zapytania
  - `CursorPage<Omit<WorkoutPlanDTO, "exercises">>` - odpowiedź z API
  - `Omit<WorkoutPlanDTO, "exercises">` - pojedynczy plan (bez pełnej listy ćwiczeń)
- **Props**: Brak (Server Component, czyta z URL searchParams)

### WorkoutPlansList

- **Opis komponentu**: Server Component renderujący listę planów treningowych na podstawie danych z API. Obsługuje paginację przez "Load more" oraz pusty stan. Dla każdego planu wyświetla podstawowe informacje: nazwę, część ciała, liczbę ćwiczeń i datę utworzenia.
- **Główne elementy**:
  - Kontener listy (grid lub flex layout)
  - Mapowanie `WorkoutPlanCard` dla każdego planu
  - Przycisk "Load more" (gdy `nextCursor` istnieje) - Client Component
  - `EmptyState` gdy `items.length === 0`
- **Obsługiwane interakcje**:
  - Renderowanie kart planów
  - Wyświetlanie przycisku "Load more" z obsługą paginacji
  - Przekierowanie do pustego stanu
- **Obsługiwana walidacja**:
  - Sprawdzanie czy lista jest pusta
  - Sprawdzanie czy istnieje `nextCursor` dla paginacji
- **Typy**:
  - `Omit<WorkoutPlanDTO, "exercises">[]` - lista planów
  - `CursorPage<Omit<WorkoutPlanDTO, "exercises">>` - odpowiedź z API z paginacją
- **Props**:
  - `plans: Omit<WorkoutPlanDTO, "exercises">[]` - lista planów do wyświetlenia
  - `nextCursor?: string | null` - cursor dla następnej strony
  - `hasMore: boolean` - flaga czy są więcej planów

### WorkoutPlanCard

- **Opis komponentu**: Server Component renderujący kartę pojedynczego planu treningowego z podstawowymi informacjami. Kliknięcie prowadzi do szczegółów planu lub edycji. Karta wyświetla: nazwę planu, część ciała (part), liczbę ćwiczeń oraz datę utworzenia.
- **Główne elementy**:
  - Tytuł planu (`name`)
  - Badge z częścią ciała (`part`: Legs | Core | Back | Arms | Chest | null)
  - Liczba ćwiczeń (wymaga osobnego zapytania lub rozszerzenia API)
  - Data utworzenia (`created_at`) - sformatowana
  - Link do szczegółów planu (`/workout-plans/[id]`) lub edycji
  - Menu akcji (opcjonalnie: edycja, usunięcie) - Client Component
- **Obsługiwane interakcje**:
  - Kliknięcie karty → nawigacja do `/workout-plans/[id]` lub `/workout-plans/[id]/edit`
  - Keyboard navigation (Enter/Space na focus)
  - Menu akcji z opcjami edycji i usunięcia
- **Obsługiwana walidacja**:
  - Sprawdzanie czy wszystkie wymagane pola są dostępne
  - Obsługa null dla `part` i `description`
- **Typy**:
  - `Omit<WorkoutPlanDTO, "exercises">` - dane planu
  - `WorkoutPlanCardViewModel` - rozszerzony typ z liczbą ćwiczeń (jeśli dodana do API)
- **Props**:
  - `plan: Omit<WorkoutPlanDTO, "exercises">` - dane planu do wyświetlenia
  - `exerciseCount?: number` - opcjonalna liczba ćwiczeń (jeśli dostępna)

### WorkoutPlanFilters

- **Opis komponentu**: Client Component zawierający dropdown do filtrowania planów po części ciała (part). Zmiany w filtrach aktualizują URL query params, co powoduje refetch danych przez Server Component.
- **Główne elementy**:
  - Select dropdown z opcjami części ciała (Legs, Core, Back, Arms, Chest, "Wszystkie")
  - Przycisk "Wyczyść filtry" (gdy aktywny filtr)
- **Obsługiwane interakcje**:
  - Wybór wartości w dropdownie → aktualizacja URL query param `part`
  - Reset kursora paginacji przy zmianie filtra
  - Wyczyść filtry → usunięcie `part` z URL
- **Obsługiwana walidacja**:
  - Walidacja wartości enum przed ustawieniem w URL
  - Sprawdzanie czy wartość należy do `exercisePartValues`
- **Typy**:
  - `ExercisePart` - typ części ciała
  - `exercisePartValues` - tablica dozwolonych wartości
- **Props**: Brak (czyta z `useSearchParams()`)

### WorkoutPlanSort

- **Opis komponentu**: Client Component zawierający dropdown do sortowania planów. Obsługuje sortowanie po `created_at` (domyślnie desc) lub `name` (asc/desc).
- **Główne elementy**:
  - Select dropdown z opcjami sortowania:
    - "Najnowsze" (created_at desc)
    - "Najstarsze" (created_at asc)
    - "Nazwa A-Z" (name asc)
    - "Nazwa Z-A" (name desc)
- **Obsługiwane interakcje**:
  - Wybór opcji sortowania → aktualizacja URL query params `sort` i `order`
  - Reset kursora paginacji przy zmianie sortowania
- **Obsługiwana walidacja**:
  - Walidacja wartości `sort` (tylko "created_at" lub "name")
  - Walidacja wartości `order` (tylko "asc" lub "desc")
- **Typy**:
  - `workoutPlanSortFields` - dozwolone pola sortowania
  - `workoutPlanOrderValues` - dozwolone kierunki sortowania
- **Props**: Brak (czyta z `useSearchParams()`)

### EmptyState

- **Opis komponentu**: Client Component wyświetlany gdy użytkowniczka nie ma żadnych planów treningowych. Zawiera komunikat zachęcający i CTA do utworzenia pierwszego planu.
- **Główne elementy**:
  - Ikona lub ilustracja (opcjonalnie)
  - Tytuł: "Nie masz jeszcze planów treningowych"
  - Opis: "Utwórz swój pierwszy plan, aby rozpocząć treningi"
  - Przycisk "Utwórz pierwszy plan" → nawigacja do `/workout-plans/new`
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku → nawigacja do formularza tworzenia planu
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Props**: Brak

### CreatePlanButton

- **Opis komponentu**: Client Component renderujący przycisk do tworzenia nowego planu treningowego. Może być wyświetlany jako FAB (Floating Action Button) lub w górnym pasku widoku.
- **Główne elementy**:
  - Przycisk z ikoną "+" i tekstem "Utwórz plan"
  - Link do `/workout-plans/new`
- **Obsługiwane interakcje**:
  - Kliknięcie → nawigacja do formularza tworzenia planu
  - Keyboard navigation (Enter/Space)
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Props**: Brak

### LoadMoreButton (Client Component)

- **Opis komponentu**: Client Component renderujący przycisk "Load more" do ładowania kolejnych planów w paginacji. Używa `useRouter()` do aktualizacji URL z nowym kursorem.
- **Główne elementy**:
  - Przycisk "Załaduj więcej" lub "Load more"
  - Wskaźnik ładowania podczas fetchowania danych
- **Obsługiwane interakcje**:
  - Kliknięcie → dodanie `cursor` do URL query params
  - Automatyczne ukrycie przy braku `nextCursor`
- **Obsługiwana walidacja**:
  - Sprawdzanie czy `nextCursor` istnieje przed wyświetleniem
- **Typy**:
  - `nextCursor?: string | null` - cursor dla następnej strony
- **Props**:
  - `nextCursor?: string | null` - cursor dla następnej strony

### SkeletonLoader

- **Opis komponentu**: Client Component wyświetlany podczas ładowania danych. Renderuje placeholder dla kart planów.
- **Główne elementy**:
  - Skeleton cards w układzie grid (3 kolumny na desktop, 2 na tablet, 1 na mobile)
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Props**: Brak

## 5. Typy

### Typy z `src/types.ts`

#### PlanQueryParams

```typescript
type PlanQueryParams = {
  part?: ExercisePart;
  sort?: "created_at" | "name";
  order?: "asc" | "desc";
  limit?: number;
  cursor?: string | null;
};
```

#### WorkoutPlanDTO (używany częściowo)

```typescript
type WorkoutPlanDTO = Omit<WorkoutPlanEntity, "user_id"> & {
  exercises: WorkoutPlanExerciseDTO[];
};

// W liście używamy: Omit<WorkoutPlanDTO, "exercises">
type WorkoutPlanListItem = Omit<WorkoutPlanDTO, "exercises">;
```

#### WorkoutPlanEntity (z bazy danych)

```typescript
type WorkoutPlanEntity = {
  id: string;
  name: string;
  description: string | null;
  part: ExercisePart | null;
  created_at: string;
  updated_at: string;
  user_id: string; // pomijane w DTO
};
```

#### ExercisePart

```typescript
type ExercisePart = "Legs" | "Core" | "Back" | "Arms" | "Chest";
```

#### CursorPage

```typescript
type CursorPage<TItem> = {
  items: TItem[];
  nextCursor?: string | null;
};
```

### Nowe typy ViewModel (opcjonalne)

#### WorkoutPlanCardViewModel

```typescript
type WorkoutPlanCardViewModel = Omit<WorkoutPlanDTO, "exercises"> & {
  exerciseCount: number; // Liczba ćwiczeń w planie
  formattedCreatedAt: string; // Sformatowana data utworzenia
};
```

**Uwaga**: Liczba ćwiczeń (`exerciseCount`) nie jest obecnie zwracana przez API. Możliwe rozwiązania:

1. Rozszerzenie API o pole `exercise_count` w odpowiedzi listy planów
2. Pobieranie liczby ćwiczeń osobno dla każdego planu (mniej wydajne)
3. Pobieranie liczby ćwiczeń w batch query dla wszystkich planów na liście

## 6. Zarządzanie stanem

### Stan URL (query params)

Widok wykorzystuje URL query params jako źródło prawdy dla stanu filtrów, sortowania i paginacji:

- `part?: ExercisePart` - filtr części ciała
- `sort?: "created_at" | "name"` - pole sortowania
- `order?: "asc" | "desc"` - kierunek sortowania
- `limit?: number` - limit wyników (domyślnie 20)
- `cursor?: string` - cursor paginacji

### Client Components - stan lokalny

#### WorkoutPlanFilters

- **Stan**: Brak (czyta z `useSearchParams()`)
- **Akcje**: Aktualizacja URL przez `router.push()`

#### WorkoutPlanSort

- **Stan**: Brak (czyta z `useSearchParams()`)
- **Akcje**: Aktualizacja URL przez `router.push()`

#### LoadMoreButton

- **Stan**: `isLoading: boolean` - flaga ładowania podczas fetchowania
- **Akcje**:
  - `handleLoadMore()` - dodanie `cursor` do URL
  - Reset `isLoading` po zakończeniu fetchowania

### Server Component - brak stanu

`WorkoutPlansPage` nie przechowuje stanu - wszystkie dane pochodzą z props (searchParams) i są fetchowane przy każdym renderze.

### Custom Hook (opcjonalnie)

#### useWorkoutPlansFilters

```typescript
function useWorkoutPlansFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentPart = searchParams.get("part") as ExercisePart | null;
  const currentSort = (searchParams.get("sort") || "created_at") as
    | "created_at"
    | "name";
  const currentOrder = (searchParams.get("order") || "desc") as "asc" | "desc";

  const updateFilter = (part: ExercisePart | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (part) {
      params.set("part", part);
    } else {
      params.delete("part");
    }
    params.delete("cursor"); // Reset paginacji
    router.push(`${pathname}?${params.toString()}`);
  };

  const updateSort = (sort: "created_at" | "name", order: "asc" | "desc") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    params.set("order", order);
    params.delete("cursor"); // Reset paginacji
    router.push(`${pathname}?${params.toString()}`);
  };

  return {
    currentPart,
    currentSort,
    currentOrder,
    updateFilter,
    updateSort,
  };
}
```

**Cel**: Centralizacja logiki zarządzania filtrami i sortowaniem, redukcja duplikacji kodu między komponentami.

## 7. Integracja API

### Endpoint: `GET /api/workout-plans`

#### Typ żądania:

- **Method**: `GET`
- **Query Parameters**: `PlanQueryParams`
  - `part?: ExercisePart` - filtr części ciała (Legs, Core, Back, Arms, Chest)
  - `sort?: "created_at" | "name"` - pole sortowania (default: "created_at")
  - `order?: "asc" | "desc"` - kierunek sortowania (default: "desc")
  - `limit?: number` - limit wyników (default: 20, max: 100)
  - `cursor?: string | null` - cursor paginacji (base64url encoded)

#### Typ odpowiedzi:

```typescript
type ApiResponse = {
  items: Omit<WorkoutPlanDTO, "exercises">[];
  nextCursor?: string | null;
};
```

**Status codes**:

- `200` - sukces
- `400` - błędne parametry (walidacja)
- `401/403` - brak autoryzacji
- `500` - błąd serwera

#### Implementacja w Server Component:

```typescript
// src/app/workout-plans/page.tsx
import { workoutPlanQuerySchema } from '@/lib/validation/workout-plans';
import { listWorkoutPlansService } from '@/services/workout-plans';
import { getUserId } from '@/lib/auth';

export default async function WorkoutPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;

  // Walidacja i parsowanie query params
  const parseResult = workoutPlanQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  // Fallback do domyślnych wartości przy błędzie walidacji
  const parsedQuery: PlanQueryParams = parseResult.success
    ? parseResult.data
    : workoutPlanQuerySchema.parse({});

  // Pobranie user ID
  const userId = await getUserId();

  // Wywołanie service do pobrania danych
  const result = await listWorkoutPlansService(userId, parsedQuery);

  return (
    // Render components
  );
}
```

**Uwaga**: Bezpośrednie wywołanie service layer zamiast HTTP fetch jest preferowane dla Server Components w Next.js 16, ponieważ:

- Eliminuje niepotrzebne round-trip HTTP
- Zapewnia lepszą wydajność
- Umożliwia lepsze error handling

### Pobieranie liczby ćwiczeń

**Problem**: API nie zwraca liczby ćwiczeń w odpowiedzi listy planów.

**Rozwiązanie 1 (rekomendowane)**: Rozszerzenie API o pole `exercise_count` w odpowiedzi.

**Rozwiązanie 2**: Pobieranie liczby ćwiczeń osobno dla każdego planu (mniej wydajne, N+1 problem).

**Rozwiązanie 3**: Batch query dla wszystkich planów na liście (wymaga modyfikacji repository/service).

## 8. Interakcje użytkownika

### 8.1 Filtrowanie planów

**Akcja**: Użytkowniczka wybiera wartość w dropdownie "Part"

**Rezultat**:

1. Client Component (`WorkoutPlanFilters`) aktualizuje URL query params
2. Next.js automatycznie refetchuje Server Component (`WorkoutPlansPage`)
3. Server Component wywołuje API z nowymi parametrami
4. Lista planów jest odświeżana z nowymi danymi
5. Cursor paginacji jest resetowany (usunięty z URL)

**Implementacja**:

- Użycie `useRouter().push()` z zaktualizowanymi query params
- Reset `cursor` przy zmianie filtrów

### 8.2 Sortowanie planów

**Akcja**: Użytkowniczka wybiera opcję sortowania (np. "Nazwa A-Z")

**Rezultat**:

1. Client Component (`WorkoutPlanSort`) aktualizuje URL query params `sort` i `order`
2. Next.js automatycznie refetchuje Server Component
3. Server Component wywołuje API z nowymi parametrami sortowania
4. Lista planów jest sortowana zgodnie z wyborem
5. Cursor paginacji jest resetowany

**Implementacja**:

- Mapowanie opcji UI na pary `(sort, order)`
- Aktualizacja URL przez `router.push()`

### 8.3 Paginacja "Load more"

**Akcja**: Użytkowniczka klika przycisk "Załaduj więcej"

**Rezultat**:

1. Client Component (`LoadMoreButton`) dodaje `cursor` do URL query params
2. Next.js automatycznie refetchuje Server Component
3. Server Component wywołuje API z kursorem
4. Nowe plany są dodawane do istniejącej listy (append, nie replace)
5. Przycisk "Load more" jest ukrywany, jeśli `nextCursor` jest null

**Implementacja**:

- Użycie `router.push()` z dodanym `cursor` do istniejących params
- **Uwaga**: W Server Components Next.js 16, append do listy wymaga specjalnej obsługi - może być potrzebny Client Component do zarządzania akumulacją wyników lub użycie `use()` hook do streamowania danych.

**Alternatywne podejście**: Client-side fetch z akumulacją wyników w stanie lokalnym.

### 8.4 Nawigacja do szczegółów planu

**Akcja**: Użytkowniczka klika kartę planu

**Rezultat**:

1. Nawigacja do `/workout-plans/[id]` (szczegóły planu)
2. Lub nawigacja do `/workout-plans/[id]/edit` (edycja planu)

**Implementacja**:

- Link component z `href="/workout-plans/${plan.id}"`

### 8.5 Tworzenie nowego planu

**Akcja**: Użytkowniczka klika przycisk "Utwórz plan"

**Rezultat**:

1. Nawigacja do `/workout-plans/new`
2. Otwarcie formularza tworzenia planu

**Implementacja**:

- Link component z `href="/workout-plans/new"`

### 8.6 Pusty stan

**Akcja**: Użytkowniczka nie ma żadnych planów

**Rezultat**:

1. Wyświetlenie komponentu `EmptyState` zamiast listy
2. Komunikat zachęcający do utworzenia pierwszego planu
3. Przycisk CTA "Utwórz pierwszy plan"

**Implementacja**:

- Warunkowe renderowanie: `if (plans.length === 0) return <EmptyState />`

## 9. Warunki i walidacja

### 9.1 Walidacja query params

**Komponent**: `WorkoutPlansPage` (Server Component)

**Warunki**:

- `part` musi być jedną z wartości: `"Legs" | "Core" | "Back" | "Arms" | "Chest"` lub brak (null)
- `sort` musi być `"created_at"` lub `"name"` (default: `"created_at"`)
- `order` musi być `"asc"` lub `"desc"` (default: `"desc"`)
- `limit` musi być liczbą całkowitą dodatnią, max 100 (default: 20)
- `cursor` musi być prawidłowym base64url string (jeśli podany)

**Walidacja**:

- Użycie `workoutPlanQuerySchema.parse()` lub `safeParse()` z fallback do domyślnych wartości
- Błędy walidacji są logowane, ale nie blokują renderowania (fallback do domyślnych wartości)

**Wpływ na stan interfejsu**:

- Nieprawidłowe parametry są ignorowane i zastępowane domyślnymi wartościami
- UI nie wyświetla błędów walidacji (ciche fallback)

### 9.2 Walidacja danych z API

**Komponent**: `WorkoutPlansList` (Server Component)

**Warunki**:

- `items` musi być tablicą (może być pusta)
- `nextCursor` może być string lub null
- Każdy element `items` musi mieć wymagane pola: `id`, `name`, `created_at`

**Walidacja**:

- Sprawdzanie `items.length === 0` dla pustego stanu
- Sprawdzanie `nextCursor !== null` dla przycisku "Load more"

**Wpływ na stan interfejsu**:

- Pusta lista → wyświetlenie `EmptyState`
- Brak `nextCursor` → ukrycie przycisku "Load more"

### 9.3 Walidacja filtrów w Client Components

**Komponent**: `WorkoutPlanFilters` (Client Component)

**Warunki**:

- Wartość `part` przed ustawieniem w URL musi należeć do `exercisePartValues`

**Walidacja**:

- Sprawdzanie `exercisePartValues.includes(value)` przed aktualizacją URL
- Ignorowanie nieprawidłowych wartości

**Wpływ na stan interfejsu**:

- Nieprawidłowe wartości nie są ustawiane w URL
- Dropdown pozostaje z poprzednią wartością

### 9.4 Walidacja sortowania w Client Components

**Komponent**: `WorkoutPlanSort` (Client Component)

**Warunki**:

- Wartość `sort` musi być `"created_at"` lub `"name"`
- Wartość `order` musi być `"asc"` lub `"desc"`

**Walidacja**:

- Sprawdzanie wartości przed aktualizacją URL
- Mapowanie opcji UI na pary `(sort, order)`

**Wpływ na stan interfejsu**:

- Nieprawidłowe wartości nie są ustawiane w URL
- Dropdown pozostaje z poprzednią wartością

## 10. Obsługa błędów

### 10.1 Błędy API (Server Component)

**Scenariusz**: Błąd podczas wywołania `listWorkoutPlansService`

**Obsługa**:

- Błędy są przechwytywane przez error boundary Next.js
- Wyświetlenie strony błędu z komunikatem: "Nie udało się załadować planów treningowych"
- Przycisk "Spróbuj ponownie" do odświeżenia strony

**Implementacja**:

- Użycie `error.tsx` w `src/app/workout-plans/error.tsx`
- Logowanie błędów do konsoli serwera

### 10.2 Błędy walidacji query params

**Scenariusz**: Nieprawidłowe parametry w URL (np. `sort=invalid`)

**Obsługa**:

- Użycie `safeParse()` z fallback do domyślnych wartości
- Ciche ignorowanie nieprawidłowych parametrów
- UI renderuje się z domyślnymi wartościami

**Implementacja**:

```typescript
const parseResult = workoutPlanQuerySchema.safeParse(params);
const parsedQuery = parseResult.success
  ? parseResult.data
  : workoutPlanQuerySchema.parse({});
```

### 10.3 Błędy sieci podczas paginacji

**Scenariusz**: Błąd podczas ładowania kolejnej strony przez "Load more"

**Obsługa**:

- Wyświetlenie toast notification z komunikatem błędu
- Przycisk "Spróbuj ponownie" w komponencie `LoadMoreButton`
- Zachowanie istniejących danych na liście

**Implementacja**:

- Try-catch w handlerze `handleLoadMore()`
- Użycie toast library (np. `sonner` lub `react-hot-toast`)

### 10.4 Pusty stan (brak planów)

**Scenariusz**: Użytkowniczka nie ma żadnych planów

**Obsługa**:

- Wyświetlenie komponentu `EmptyState` zamiast listy
- Komunikat zachęcający: "Nie masz jeszcze planów treningowych"
- CTA: "Utwórz pierwszy plan"

**Implementacja**:

- Warunkowe renderowanie: `if (plans.length === 0) return <EmptyState />`

### 10.5 Błędy autoryzacji

**Scenariusz**: Użytkowniczka nie jest zalogowana lub sesja wygasła

**Obsługa**:

- Middleware Next.js przekierowuje do `/login`
- Wyświetlenie komunikatu: "Musisz być zalogowana, aby zobaczyć plany treningowe"

**Implementacja**:

- Middleware w `src/middleware.ts` sprawdza autoryzację przed dostępem do `/workout-plans`

### 10.6 Błędy podczas usuwania planu (opcjonalnie)

**Scenariusz**: Błąd podczas usuwania planu z karty (jeśli implementowane)

**Obsługa**:

- Wyświetlenie toast notification z komunikatem błędu
- Optymistyczna aktualizacja jest cofana (plan pozostaje na liście)
- Przycisk "Spróbuj ponownie" w menu akcji

**Implementacja**:

- Try-catch w handlerze usuwania
- Użycie `useOptimistic` hook (React 19) dla optymistycznych aktualizacji

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. Utwórz katalog `src/app/workout-plans/`
2. Utwórz plik `src/app/workout-plans/page.tsx` (Server Component)
3. Utwórz katalog `src/components/workout-plans/`
4. Utwórz pliki komponentów:
   - `src/components/workout-plans/workout-plans-list.tsx`
   - `src/components/workout-plans/workout-plan-card.tsx`
   - `src/components/workout-plans/workout-plan-filters.tsx`
   - `src/components/workout-plans/workout-plan-sort.tsx`
   - `src/components/workout-plans/empty-state.tsx`
   - `src/components/workout-plans/create-plan-button.tsx`
   - `src/components/workout-plans/load-more-button.tsx`
   - `src/components/workout-plans/skeleton-loader.tsx`

### Krok 2: Implementacja głównego komponentu strony

1. W `src/app/workout-plans/page.tsx`:
   - Zaimportuj `getUserId` z `@/lib/auth`
   - Zaimportuj `listWorkoutPlansService` z `@/services/workout-plans`
   - Zaimportuj `workoutPlanQuerySchema` z `@/lib/validation/workout-plans`
   - Zaimplementuj parsowanie `searchParams` z walidacją
   - Zaimplementuj wywołanie service do pobrania danych
   - Zaimplementuj renderowanie struktury widoku z komponentami

### Krok 3: Implementacja WorkoutPlansList

1. W `src/components/workout-plans/workout-plans-list.tsx`:
   - Zdefiniuj interfejs props z `plans`, `nextCursor`, `hasMore`
   - Zaimplementuj warunkowe renderowanie `EmptyState` gdy `plans.length === 0`
   - Zaimplementuj mapowanie `WorkoutPlanCard` dla każdego planu
   - Zaimplementuj renderowanie `LoadMoreButton` gdy `hasMore === true`

### Krok 4: Implementacja WorkoutPlanCard

1. W `src/components/workout-plans/workout-plan-card.tsx`:
   - Zdefiniuj interfejs props z `plan` i opcjonalnie `exerciseCount`
   - Zaimplementuj renderowanie karty z:
     - Tytułem planu (`name`)
     - Badge z częścią ciała (`part`) - obsługa null
     - Liczbą ćwiczeń (jeśli dostępna)
     - Sformatowaną datą utworzenia
   - Zaimplementuj Link do szczegółów planu (`/workout-plans/${plan.id}`)
   - Dodaj ARIA labels dla dostępności

### Krok 5: Implementacja WorkoutPlanFilters

1. W `src/components/workout-plans/workout-plan-filters.tsx`:
   - Dodaj `"use client"` directive
   - Zaimportuj `useSearchParams`, `useRouter`, `usePathname` z Next.js
   - Zaimportuj `exercisePartValues` z `@/lib/validation/exercises`
   - Zaimplementuj odczyt aktualnego filtra z `useSearchParams()`
   - Zaimplementuj handler `handleFilterChange` z aktualizacją URL
   - Zaimplementuj reset kursora przy zmianie filtra
   - Zaimplementuj przycisk "Wyczyść filtry" (gdy aktywny filtr)
   - Użyj komponentu `Select` z shadcn/ui

### Krok 6: Implementacja WorkoutPlanSort

1. W `src/components/workout-plans/workout-plan-sort.tsx`:
   - Dodaj `"use client"` directive
   - Zaimportuj `useSearchParams`, `useRouter`, `usePathname` z Next.js
   - Zaimplementuj odczyt aktualnego sortowania z `useSearchParams()`
   - Zaimplementuj mapowanie opcji UI na pary `(sort, order)`
   - Zaimplementuj handler `handleSortChange` z aktualizacją URL
   - Zaimplementuj reset kursora przy zmianie sortowania
   - Użyj komponentu `Select` z shadcn/ui

### Krok 7: Implementacja EmptyState

1. W `src/components/workout-plans/empty-state.tsx`:
   - Dodaj `"use client"` directive
   - Zaimplementuj renderowanie komunikatu i CTA
   - Zaimplementuj Link do `/workout-plans/new`
   - Dodaj odpowiednie style i ikony

### Krok 8: Implementacja CreatePlanButton

1. W `src/components/workout-plans/create-plan-button.tsx`:
   - Dodaj `"use client"` directive
   - Zaimplementuj przycisk z Link do `/workout-plans/new`
   - Zaimplementuj jako FAB lub przycisk w górnym pasku (zgodnie z designem)
   - Dodaj ikonę "+" i tekst "Utwórz plan"

### Krok 9: Implementacja LoadMoreButton

1. W `src/components/workout-plans/load-more-button.tsx`:
   - Dodaj `"use client"` directive
   - Zaimportuj `useSearchParams`, `useRouter`, `usePathname` z Next.js
   - Zaimplementuj stan `isLoading` dla wskaźnika ładowania
   - Zaimplementuj handler `handleLoadMore` z dodaniem `cursor` do URL
   - Zaimplementuj ukrycie przycisku gdy `nextCursor === null`
   - **Uwaga**: W Server Components Next.js 16, append do listy może wymagać specjalnej obsługi - rozważ użycie Client Component do zarządzania akumulacją wyników lub streamowanie danych przez `use()` hook.

### Krok 10: Implementacja SkeletonLoader

1. W `src/components/workout-plans/skeleton-loader.tsx`:
   - Dodaj `"use client"` directive
   - Zaimplementuj skeleton cards w układzie grid
   - Użyj komponentu `Skeleton` z shadcn/ui

### Krok 11: Stylowanie i dostępność

1. Dodaj odpowiednie klasy Tailwind CSS do wszystkich komponentów
2. Zaimplementuj responsive design (mobile-first):
   - 1 kolumna na mobile
   - 2 kolumny na tablet
   - 3 kolumny na desktop
3. Dodaj ARIA labels do wszystkich interaktywnych elementów
4. Zaimplementuj keyboard navigation (Enter/Space na focus)
5. Dodaj focus styles dla dostępności

### Krok 12: Testowanie

1. Przetestuj filtrowanie po części ciała
2. Przetestuj sortowanie (wszystkie opcje)
3. Przetestuj paginację "Load more"
4. Przetestuj pusty stan
5. Przetestuj nawigację do szczegółów planu
6. Przetestuj obsługę błędów (nieprawidłowe parametry, błędy API)
7. Przetestuj responsive design na różnych urządzeniach
8. Przetestuj dostępność (keyboard navigation, screen readers)

### Krok 13: Optymalizacja (opcjonalnie)

1. Rozważ dodanie `exercise_count` do odpowiedzi API (rozszerzenie endpoint)
2. Rozważ implementację custom hook `useWorkoutPlansFilters` dla redukcji duplikacji kodu
3. Rozważ dodanie optymistycznych aktualizacji przy usuwaniu planów (jeśli implementowane)
4. Rozważ dodanie cache dla często odczytywanych planów (opcjonalnie)

### Krok 14: Dokumentacja i code review

1. Dodaj komentarze JSDoc do wszystkich komponentów i funkcji
2. Sprawdź zgodność z PRD i user stories (US-025)
3. Sprawdź zgodność z design system (shadcn/ui)
4. Sprawdź zgodność z coding practices z `.cursor/rules/`
