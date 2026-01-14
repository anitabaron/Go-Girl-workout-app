# Plan implementacji widoku szczegółów planu treningowego

## 1. Przegląd

Widok szczegółów planu treningowego (`/workout-plans/[id]`) umożliwia użytkowniczce przeglądanie pełnych informacji o planie treningowym, w tym metadanych planu (nazwa, opis, partia), listy ćwiczeń w kolejności z parametrami planowanymi (planned_*), oraz wykonywanie akcji: edycji, usunięcia i rozpoczęcia sesji treningowej. Widok wyświetla również informację o liczbie sesji wykonanych z tego planu.

Widok jest zgodny z User Stories: US-022 (wyświetlanie parametrów planowanych), US-023 (przycisk edycji), US-024 (przycisk usunięcia), US-027 (wyświetlanie szczegółów planu).

## 2. Routing widoku

- **Ścieżka**: `/workout-plans/[id]`
- **Plik**: `src/app/workout-plans/[id]/page.tsx`
- **Typ**: Server Component (Next.js App Router)
- **Parametry dynamiczne**: `id` - UUID planu treningowego

## 3. Struktura komponentów

```
WorkoutPlanDetailsPage (Server Component)
├── WorkoutPlanDetails (Server Component)
│   ├── WorkoutPlanMetadata (Server Component)
│   └── WorkoutPlanExercisesList (Server Component)
│       └── WorkoutPlanExerciseItem (Server Component) [powtarzalny]
├── WorkoutPlanStats (Server Component) [opcjonalny]
└── WorkoutPlanActions (Client Component)
    ├── StartWorkoutButton (Client Component)
    ├── EditButton (Client Component)
    └── DeletePlanDialog (Client Component)
        └── AlertDialog (shadcn/ui)
```

## 4. Szczegóły komponentów

### WorkoutPlanDetailsPage

- **Opis komponentu**: Główny komponent strony, który pobiera dane planu z API i renderuje strukturę widoku. Obsługuje walidację UUID, przekierowania w przypadku błędów oraz layout strony.
- **Główne elementy**: 
  - Header z tytułem strony
  - Sekcja główna z komponentami szczegółów
  - Obsługa błędów i przekierowań
- **Obsługiwane interakcje**: 
  - Walidacja parametru `id` (UUID)
  - Przekierowanie do `/workout-plans` w przypadku błędów (404, 401/403)
- **Obsługiwana walidacja**: 
  - Format UUID parametru `id`
  - Istnienie planu w bazie danych
  - Autoryzacja użytkownika (plan należy do użytkownika)
- **Typy**: 
  - `WorkoutPlanDTO` - dane planu z ćwiczeniami
  - `params: Promise<{ id: string }>` - parametry routingu
- **Propsy**: 
  - `params: Promise<{ id: string }>` - parametry dynamiczne z routingu

### WorkoutPlanDetails

- **Opis komponentu**: Komponent wyświetlający główne informacje o planie treningowym. Składa się z metadanych planu i listy ćwiczeń.
- **Główne elementy**: 
  - Kontener z border i shadow (card-like)
  - `WorkoutPlanMetadata` - metadane planu
  - `WorkoutPlanExercisesList` - lista ćwiczeń
- **Obsługiwane interakcje**: Brak (komponent tylko do wyświetlania)
- **Obsługiwana walidacja**: Brak
- **Typy**: 
  - `WorkoutPlanDTO` - pełne dane planu z ćwiczeniami
- **Propsy**: 
  - `plan: WorkoutPlanDTO` - dane planu do wyświetlenia

### WorkoutPlanMetadata

- **Opis komponentu**: Komponent wyświetlający metadane planu: nazwę, opis (jeśli istnieje) i partię (part).
- **Główne elementy**: 
  - Nagłówek z nazwą planu (`<h2>`)
  - Opis planu (jeśli istnieje) - `<p>` lub `<div>`
  - Badge lub tag z partią planu
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: 
  - `WorkoutPlanDTO` - metadane planu
- **Propsy**: 
  - `plan: Pick<WorkoutPlanDTO, 'name' | 'description' | 'part'>` - metadane planu

### WorkoutPlanExercisesList

- **Opis komponentu**: Komponent wyświetlający listę ćwiczeń w planie w kolejności zgodnej z `section_type` i `section_order`. Grupuje ćwiczenia według sekcji (Warm-up, Main Workout, Cool-down) jeśli to możliwe.
- **Główne elementy**: 
  - Kontener listy (`<div>` lub `<ol>`)
  - `WorkoutPlanExerciseItem` - elementy listy (powtarzalne)
  - Pusty stan, jeśli brak ćwiczeń
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: 
  - Sprawdzenie, czy lista ćwiczeń nie jest pusta
- **Typy**: 
  - `WorkoutPlanExerciseDTO[]` - lista ćwiczeń planu
- **Propsy**: 
  - `exercises: WorkoutPlanExerciseDTO[]` - lista ćwiczeń do wyświetlenia

### WorkoutPlanExerciseItem

- **Opis komponentu**: Komponent wyświetlający pojedyncze ćwiczenie w planie z jego parametrami planowanymi. Wyświetla informacje o ćwiczeniu (tytuł, typ, partia) oraz parametry planned_* (sets, reps, duration, rest).
- **Główne elementy**: 
  - Kontener elementu listy
  - Tytuł ćwiczenia (z linkiem do szczegółów ćwiczenia, jeśli potrzebny)
  - Badge z typem ćwiczenia (Warm-up/Main Workout/Cool-down)
  - Badge z partią ćwiczenia
  - Lista parametrów planowanych:
    - `planned_sets` (jeśli istnieje)
    - `planned_reps` (jeśli istnieje)
    - `planned_duration_seconds` (jeśli istnieje, sformatowane jako czas)
    - `planned_rest_seconds` (jeśli istnieje, sformatowane jako czas)
  - Numer kolejności w sekcji
- **Obsługiwane interakcje**: 
  - Opcjonalnie: kliknięcie w tytuł ćwiczenia prowadzi do szczegółów ćwiczenia (`/exercises/[id]`)
- **Obsługiwana walidacja**: Brak
- **Typy**: 
  - `WorkoutPlanExerciseDTO` - dane ćwiczenia w planie
- **Propsy**: 
  - `exercise: WorkoutPlanExerciseDTO` - dane ćwiczenia
  - `index: number` - indeks w liście (opcjonalny, dla numeracji)

### WorkoutPlanStats

- **Opis komponentu**: Komponent wyświetlający statystyki planu, takie jak liczba sesji wykonanych z tego planu. Komponent opcjonalny, może być dodany w przyszłości.
- **Główne elementy**: 
  - Kontener ze statystykami
  - Liczba sesji (jeśli dostępna)
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: 
  - `{ sessionsCount: number }` - statystyki planu
- **Propsy**: 
  - `sessionsCount: number` - liczba sesji wykonanych z planu (opcjonalne)

### WorkoutPlanActions

- **Opis komponentu**: Komponent kliencki zawierający przyciski akcji dla planu: "Rozpocznij trening", "Edytuj" i "Usuń". Zarządza stanem dialogu usuwania.
- **Główne elementy**: 
  - Kontener z przyciskami (`<div>` z flex layout)
  - `StartWorkoutButton` - przycisk rozpoczęcia sesji
  - `EditButton` - przycisk edycji
  - `DeletePlanDialog` - dialog usuwania z przyciskiem
- **Obsługiwane interakcje**: 
  - Zarządzanie stanem otwarcia dialogu usuwania
  - Przekierowania po akcjach
- **Obsługiwana walidacja**: Brak (walidacja w komponentach dzieci)
- **Typy**: 
  - `WorkoutPlanDTO` - dane planu (dla przekazania do komponentów dzieci)
- **Propsy**: 
  - `planId: string` - ID planu
  - `planName: string` - nazwa planu (dla dialogu usuwania)

### StartWorkoutButton

- **Opis komponentu**: Przycisk kliencki do rozpoczęcia sesji treningowej z planu. Wykonuje POST do `/api/workout-sessions` z `workout_plan_id` i przekierowuje do widoku asystenta treningowego.
- **Główne elementy**: 
  - `Button` (shadcn/ui) z wariantem "default" (primary)
  - Stan ładowania podczas tworzenia sesji
  - Ikona (opcjonalna)
- **Obsługiwane interakcje**: 
  - `onClick` - wywołanie API do utworzenia sesji
  - Przekierowanie do `/workout-sessions/[id]/active` po sukcesie
  - Obsługa błędów z toast notifications
- **Obsługiwana walidacja**: 
  - Sprawdzenie, czy plan ma ćwiczenia (walidacja po stronie API)
  - Sprawdzenie, czy użytkownik nie ma już sesji in_progress (obsługa po stronie API)
- **Typy**: 
  - `SessionStartCommand` - body żądania API
  - `SessionDetailDTO` - odpowiedź API
- **Propsy**: 
  - `planId: string` - ID planu treningowego
  - `disabled?: boolean` - opcjonalne wyłączenie przycisku

### EditButton

- **Opis komponentu**: Przycisk kliencki do przejścia do widoku edycji planu. Przekierowuje do `/workout-plans/[id]/edit`.
- **Główne elementy**: 
  - `Button` (shadcn/ui) z wariantem "default" lub "outline"
  - Ikona edycji (opcjonalna)
- **Obsługiwane interakcje**: 
  - `onClick` - przekierowanie do strony edycji
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**: 
  - `planId: string` - ID planu treningowego

### DeletePlanDialog

- **Opis komponentu**: Dialog potwierdzenia usunięcia planu. Używa `AlertDialog` z shadcn/ui. Po potwierdzeniu wykonuje DELETE do `/api/workout-plans/[id]` i przekierowuje do listy planów.
- **Główne elementy**: 
  - `AlertDialog` (shadcn/ui)
  - `AlertDialogTrigger` - przycisk "Usuń"
  - `AlertDialogContent` - zawartość dialogu
  - `AlertDialogHeader` - nagłówek z tytułem
  - `AlertDialogDescription` - opis z informacją o planie i konsekwencjach
  - `AlertDialogFooter` - przyciski "Anuluj" i "Usuń"
  - Stan ładowania podczas usuwania
- **Obsługiwane interakcje**: 
  - Otwarcie/zamknięcie dialogu
  - Potwierdzenie usunięcia - wywołanie API DELETE
  - Anulowanie - zamknięcie dialogu
  - Przekierowanie do `/workout-plans` po sukcesie
  - Toast notification po sukcesie/błędzie
- **Obsługiwana walidacja**: 
  - Sprawdzenie, czy plan istnieje (404)
  - Sprawdzenie autoryzacji (401/403)
- **Typy**: 
  - Brak (DELETE endpoint zwraca 204 No Content)
- **Propsy**: 
  - `planId: string` - ID planu do usunięcia
  - `planName: string` - nazwa planu (do wyświetlenia w dialogu)
  - `open: boolean` - stan otwarcia dialogu
  - `onOpenChange: (open: boolean) => void` - callback zmiany stanu

## 5. Typy

### Typy istniejące (z `src/types.ts`)

#### WorkoutPlanDTO
```typescript
type WorkoutPlanDTO = Omit<WorkoutPlanEntity, "user_id"> & {
  exercises: WorkoutPlanExerciseDTO[];
};
```

**Pola:**
- `id: string` - UUID planu
- `name: string` - nazwa planu
- `description: string | null` - opis planu (opcjonalny)
- `part: ExercisePart | null` - partia planu (opcjonalna)
- `created_at: string` - data utworzenia
- `updated_at: string` - data aktualizacji
- `exercises: WorkoutPlanExerciseDTO[]` - lista ćwiczeń w planie

#### WorkoutPlanExerciseDTO
```typescript
type WorkoutPlanExerciseDTO = Omit<
  WorkoutPlanExerciseEntity,
  "plan_id" | "created_at"
>;
```

**Pola:**
- `id: string` - UUID wpisu ćwiczenia w planie
- `exercise_id: string` - UUID ćwiczenia
- `section_type: ExerciseType` - typ sekcji (Warm-up | Main Workout | Cool-down)
- `section_order: number` - kolejność w sekcji
- `planned_sets: number | null` - planowana liczba serii
- `planned_reps: number | null` - planowana liczba powtórzeń
- `planned_duration_seconds: number | null` - planowany czas trwania (sekundy)
- `planned_rest_seconds: number | null` - planowany czas odpoczynku (sekundy)

#### ExercisePart
```typescript
type ExercisePart = "Legs" | "Core" | "Back" | "Arms" | "Chest";
```

#### ExerciseType
```typescript
type ExerciseType = "Warm-up" | "Main Workout" | "Cool-down";
```

### Typy dla API

#### SessionStartCommand
```typescript
type SessionStartCommand = {
  workout_plan_id: WorkoutPlanEntity["id"];
};
```

**Używane w:** `StartWorkoutButton` do utworzenia sesji

#### SessionDetailDTO
```typescript
type SessionDetailDTO = SessionSummaryDTO & {
  exercises: SessionExerciseDTO[];
};
```

**Używane w:** Odpowiedź z API po utworzeniu sesji (dla przekierowania)

### Typy ViewModel (opcjonalne, jeśli potrzebne)

#### WorkoutPlanDetailsViewModel
```typescript
type WorkoutPlanDetailsViewModel = {
  plan: WorkoutPlanDTO;
  canStartSession: boolean; // czy plan ma ćwiczenia
  sessionsCount?: number; // opcjonalna liczba sesji
};
```

**Uwaga:** Ten typ może być użyty w przyszłości, jeśli potrzebne będzie dodatkowe przetwarzanie danych przed wyświetleniem.

## 6. Zarządzanie stanem

### Stan w komponentach Server Components

Komponenty Server Components (`WorkoutPlanDetailsPage`, `WorkoutPlanDetails`, `WorkoutPlanMetadata`, `WorkoutPlanExercisesList`, `WorkoutPlanExerciseItem`) nie wymagają zarządzania stanem - dane są pobierane na serwerze i przekazywane jako props.

### Stan w komponentach Client Components

#### WorkoutPlanActions
- **Stan lokalny:**
  - `isDeleteDialogOpen: boolean` - stan otwarcia dialogu usuwania
  - Zarządzany przez `useState`

#### StartWorkoutButton
- **Stan lokalny:**
  - `isLoading: boolean` - stan ładowania podczas tworzenia sesji
  - Zarządzany przez `useState`

#### DeletePlanDialog
- **Stan lokalny:**
  - `isDeleting: boolean` - stan ładowania podczas usuwania
  - Zarządzany przez `useState`
- **Props stanu:**
  - `open: boolean` - kontrolowany przez rodzica (`WorkoutPlanActions`)
  - `onOpenChange: (open: boolean) => void` - callback do aktualizacji stanu w rodzicu

### Custom Hooks

**Brak potrzeby custom hooków** - logika jest prosta i może być zawarta bezpośrednio w komponentach. W przyszłości można rozważyć:

- `useStartWorkoutSession` - jeśli logika rozpoczęcia sesji stanie się bardziej złożona
- `useDeleteWorkoutPlan` - jeśli logika usuwania stanie się bardziej złożona

## 7. Integracja API

### GET /api/workout-plans/[id]

**Używane w:** `WorkoutPlanDetailsPage` (Server Component)

**Typ żądania:**
- Metoda: `GET`
- URL: `/api/workout-plans/${id}`
- Headers: Automatycznie dodawane przez Next.js (cookies dla autoryzacji)

**Typ odpowiedzi:**
- Success (200): `WorkoutPlanDTO`
- Error (404): `{ message: string }` - plan nie znaleziony
- Error (401/403): `{ message: string }` - brak autoryzacji
- Error (500): `{ message: string }` - błąd serwera

**Implementacja:**
```typescript
// W Server Component
const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/workout-plans/${id}`, {
  cache: 'no-store', // lub 'force-cache' jeśli potrzebne
});

// LUB bezpośrednie wywołanie serwisu (preferowane)
const plan = await getWorkoutPlanService(userId, id);
```

**Uwaga:** W Server Component preferowane jest bezpośrednie wywołanie serwisu (`getWorkoutPlanService`) zamiast HTTP fetch, aby uniknąć niepotrzebnych round-tripów.

### POST /api/workout-sessions

**Używane w:** `StartWorkoutButton` (Client Component)

**Typ żądania:**
- Metoda: `POST`
- URL: `/api/workout-sessions`
- Body: `SessionStartCommand`
  ```typescript
  {
    workout_plan_id: string; // UUID planu
  }
  ```

**Typ odpowiedzi:**
- Success (201): `{ session: SessionDetailDTO; isNew: true }` - nowa sesja utworzona
- Success (200): `{ session: SessionDetailDTO; isNew: false }` - istniejąca sesja in_progress zwrócona
- Error (400): `{ message: string }` - plan nie ma ćwiczeń lub nieprawidłowe dane
- Error (404): `{ message: string }` - plan nie znaleziony
- Error (401/403): `{ message: string }` - brak autoryzacji
- Error (500): `{ message: string }` - błąd serwera

**Implementacja:**
```typescript
const response = await fetch('/api/workout-sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    workout_plan_id: planId,
  }),
});
```

### DELETE /api/workout-plans/[id]

**Używane w:** `DeletePlanDialog` (Client Component)

**Typ żądania:**
- Metoda: `DELETE`
- URL: `/api/workout-plans/${id}`
- Body: Brak

**Typ odpowiedzi:**
- Success (204): Brak zawartości
- Error (404): `{ message: string }` - plan nie znaleziony
- Error (401/403): `{ message: string }` - brak autoryzacji
- Error (500): `{ message: string }` - błąd serwera

**Implementacja:**
```typescript
const response = await fetch(`/api/workout-plans/${planId}`, {
  method: 'DELETE',
});
```

## 8. Interakcje użytkownika

### 1. Wyświetlanie szczegółów planu (US-027)

**Akcja użytkownika:** Użytkowniczka przechodzi do `/workout-plans/[id]`

**Rezultat:**
- Strona ładuje się z danymi planu
- Wyświetlane są metadane planu (nazwa, opis, partia)
- Wyświetlana jest lista ćwiczeń w kolejności z parametrami planned_*
- Wyświetlane są przyciski akcji: "Rozpocznij trening", "Edytuj", "Usuń"

**Obsługa błędów:**
- Jeśli plan nie istnieje (404) → przekierowanie do `/workout-plans`
- Jeśli brak autoryzacji (401/403) → przekierowanie do `/workout-plans` lub `/login`
- Jeśli błąd serwera (500) → wyświetlenie komunikatu błędu lub przekierowanie

### 2. Rozpoczęcie sesji treningowej (US-030, powiązane)

**Akcja użytkownika:** Kliknięcie przycisku "Rozpocznij trening"

**Rezultat:**
- Przycisk przechodzi w stan ładowania
- Wykonywane jest żądanie POST do `/api/workout-sessions`
- Jeśli sesja została utworzona lub wznowiona:
  - Przekierowanie do `/workout-sessions/[id]/active`
- Jeśli plan nie ma ćwiczeń:
  - Toast error: "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"
- Jeśli użytkownik ma już sesję in_progress:
  - Sesja istniejąca jest zwracana, przekierowanie do niej

**Obsługa błędów:**
- Błąd sieci → Toast error: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- Błąd 400 → Toast error z komunikatem z API
- Błąd 404 → Toast error: "Plan treningowy nie został znaleziony"
- Błąd 401/403 → Toast error: "Brak autoryzacji. Zaloguj się ponownie." + przekierowanie do `/login`
- Błąd 500 → Toast error: "Wystąpił błąd serwera. Spróbuj ponownie później."

### 3. Edycja planu (US-023)

**Akcja użytkownika:** Kliknięcie przycisku "Edytuj"

**Rezultat:**
- Przekierowanie do `/workout-plans/[id]/edit`

**Obsługa błędów:** Brak (przekierowanie nie wymaga wywołania API)

### 4. Usunięcie planu (US-024)

**Akcja użytkownika:** Kliknięcie przycisku "Usuń"

**Rezultat:**
- Otwarcie dialogu potwierdzenia usunięcia
- Dialog wyświetla:
  - Tytuł: "Usuń plan treningowy"
  - Opis: "Czy na pewno chcesz usunąć plan &quot;[nazwa planu]&quot;? Usunięcie planu nie usuwa historii sesji. Tej operacji nie można cofnąć."
  - Przyciski: "Anuluj" i "Usuń"

**Akcja użytkownika:** Kliknięcie "Usuń" w dialogu

**Rezultat:**
- Przycisk "Usuń" przechodzi w stan ładowania ("Usuwanie...")
- Wykonywane jest żądanie DELETE do `/api/workout-plans/[id]`
- Po sukcesie:
  - Toast success: "Plan treningowy został usunięty"
  - Przekierowanie do `/workout-plans`

**Obsługa błędów:**
- Błąd sieci → Toast error: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- Błąd 404 → Toast error: "Plan treningowy nie został znaleziony"
- Błąd 401/403 → Toast error: "Brak autoryzacji. Zaloguj się ponownie." + przekierowanie do `/login`
- Błąd 500 → Toast error: "Wystąpił błąd serwera. Spróbuj ponownie później."

**Akcja użytkownika:** Kliknięcie "Anuluj" w dialogu

**Rezultat:**
- Dialog zostaje zamknięty
- Brak zmian

### 5. Wyświetlanie parametrów planowanych (US-022)

**Akcja użytkownika:** Przeglądanie listy ćwiczeń w planie

**Rezultat:**
- Dla każdego ćwiczenia wyświetlane są parametry planned_*:
  - `planned_sets` - jeśli istnieje, format: "X serii"
  - `planned_reps` - jeśli istnieje, format: "X powtórzeń"
  - `planned_duration_seconds` - jeśli istnieje, format: "X sekund" lub "X min Y sek"
  - `planned_rest_seconds` - jeśli istnieje, format: "X sekund" lub "X min Y sek"
- Parametry są wyświetlane tylko, jeśli mają wartość (nie null)

**Obsługa błędów:** Brak (dane są już pobrane z API)

### 6. Przejście do szczegółów ćwiczenia (opcjonalne)

**Akcja użytkownika:** Kliknięcie w tytuł ćwiczenia (jeśli implementowane)

**Rezultat:**
- Przekierowanie do `/exercises/[exercise_id]`

**Obsługa błędów:** Brak (przekierowanie nie wymaga wywołania API)

## 9. Warunki i walidacja

### Walidacja po stronie serwera (API)

#### GET /api/workout-plans/[id]
- **Walidacja UUID:** Parametr `id` musi być prawidłowym UUID
- **Walidacja istnienia:** Plan musi istnieć w bazie danych
- **Walidacja autoryzacji:** Plan musi należeć do zalogowanego użytkownika (RLS)
- **Walidacja danych:** Plan musi mieć poprawną strukturę danych

#### POST /api/workout-sessions
- **Walidacja `workout_plan_id`:** Musi być prawidłowym UUID
- **Walidacja istnienia planu:** Plan musi istnieć i należeć do użytkownika
- **Walidacja ćwiczeń:** Plan musi zawierać co najmniej jedno ćwiczenie
- **Walidacja sesji in_progress:** Jeśli użytkownik ma sesję in_progress, zwracana jest istniejąca sesja

#### DELETE /api/workout-plans/[id]
- **Walidacja UUID:** Parametr `id` musi być prawidłowym UUID
- **Walidacja istnienia:** Plan musi istnieć w bazie danych
- **Walidacja autoryzacji:** Plan musi należeć do zalogowanego użytkownika (RLS)

### Walidacja po stronie klienta (UI)

#### WorkoutPlanDetailsPage
- **Walidacja UUID:** Sprawdzenie formatu UUID przed wywołaniem API
  - Jeśli nieprawidłowy → przekierowanie do `/workout-plans`
  - Regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

#### StartWorkoutButton
- **Walidacja przed wysłaniem:** Brak (walidacja po stronie API)
- **Walidacja odpowiedzi:** Sprawdzenie statusu odpowiedzi HTTP
  - 201/200 → sukces, przekierowanie
  - 400 → błąd walidacji, wyświetlenie komunikatu
  - 404 → plan nie znaleziony, wyświetlenie komunikatu
  - 401/403 → brak autoryzacji, przekierowanie do logowania
  - 500 → błąd serwera, wyświetlenie komunikatu

#### DeletePlanDialog
- **Walidacja przed wysłaniem:** Brak (walidacja po stronie API)
- **Walidacja odpowiedzi:** Sprawdzenie statusu odpowiedzi HTTP
  - 204 → sukces, przekierowanie
  - 404 → plan nie znaleziony, wyświetlenie komunikatu
  - 401/403 → brak autoryzacji, przekierowanie do logowania
  - 500 → błąd serwera, wyświetlenie komunikatu

### Warunki wpływające na stan UI

#### Warunki wyświetlania

1. **Pusty stan listy ćwiczeń:**
   - Jeśli `plan.exercises.length === 0` → wyświetlenie komunikatu "Plan nie zawiera ćwiczeń"

2. **Brak opisu planu:**
   - Jeśli `plan.description === null || plan.description === ''` → opis nie jest wyświetlany

3. **Brak partii planu:**
   - Jeśli `plan.part === null` → badge z partią nie jest wyświetlany

4. **Brak parametrów planowanych w ćwiczeniu:**
   - Jeśli wszystkie `planned_*` są `null` → wyświetlenie komunikatu "Brak parametrów planowanych" lub pominięcie sekcji parametrów

#### Warunki wyłączania przycisków

1. **StartWorkoutButton:**
   - Przycisk może być wyłączony, jeśli plan nie ma ćwiczeń (ale walidacja jest po stronie API)
   - Przycisk jest wyłączony podczas ładowania (`isLoading === true`)

2. **DeletePlanDialog:**
   - Przycisk "Usuń" w dialogu jest wyłączony podczas usuwania (`isDeleting === true`)
   - Przycisk "Anuluj" w dialogu jest wyłączony podczas usuwania (`isDeleting === true`)

## 10. Obsługa błędów

### Błędy sieciowe

**Scenariusz:** Brak połączenia z internetem lub timeout

**Obsługa:**
- `StartWorkoutButton`: Toast error: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- `DeletePlanDialog`: Toast error: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- Stan ładowania jest resetowany (`isLoading = false`, `isDeleting = false`)

### Błędy autoryzacji (401/403)

**Scenariusz:** Sesja użytkownika wygasła lub brak uprawnień

**Obsługa:**
- `WorkoutPlanDetailsPage`: Przekierowanie do `/workout-plans` (lub `/login` jeśli potrzebne)
- `StartWorkoutButton`: Toast error: "Brak autoryzacji. Zaloguj się ponownie." + przekierowanie do `/login`
- `DeletePlanDialog`: Toast error: "Brak autoryzacji. Zaloguj się ponownie." + przekierowanie do `/login`

### Błędy nieznalezienia zasobu (404)

**Scenariusz:** Plan treningowy nie istnieje lub został usunięty

**Obsługa:**
- `WorkoutPlanDetailsPage`: Przekierowanie do `/workout-plans` z komunikatem (opcjonalnie toast)
- `StartWorkoutButton`: Toast error: "Plan treningowy nie został znaleziony"
- `DeletePlanDialog`: Toast error: "Plan treningowy nie został znaleziony"

### Błędy walidacji (400)

**Scenariusz:** Nieprawidłowe dane w żądaniu

**Obsługa:**
- `StartWorkoutButton`: Toast error z komunikatem z API (np. "Plan treningowy musi zawierać co najmniej jedno ćwiczenie")
- `DeletePlanDialog`: Toast error z komunikatem z API

### Błędy serwera (500)

**Scenariusz:** Błąd po stronie serwera

**Obsługa:**
- `WorkoutPlanDetailsPage`: Przekierowanie do `/workout-plans` z komunikatem błędu (opcjonalnie toast)
- `StartWorkoutButton`: Toast error: "Wystąpił błąd serwera. Spróbuj ponownie później."
- `DeletePlanDialog`: Toast error: "Wystąpił błąd serwera. Spróbuj ponownie później."

### Błędy nieoczekiwane

**Scenariusz:** Nieznany błąd (np. nieprawidłowy format odpowiedzi)

**Obsługa:**
- Wszystkie komponenty: Toast error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później."
- Logowanie błędu do konsoli (w trybie development)
- Stan ładowania jest resetowany

### Edge cases

1. **Plan bez ćwiczeń:**
   - Wyświetlenie komunikatu "Plan nie zawiera ćwiczeń"
   - Przycisk "Rozpocznij trening" może być wyłączony lub wyświetlać tooltip z informacją

2. **Plan z usuniętym ćwiczeniem:**
   - Jeśli ćwiczenie zostało usunięte, ale jest w planie (nie powinno się zdarzyć dzięki RLS), wyświetlenie komunikatu błędu lub pominięcie ćwiczenia

3. **Równoczesne usunięcie planu:**
   - Jeśli użytkownik próbuje usunąć plan, który został już usunięty (np. w innym oknie), wyświetlenie komunikatu 404

4. **Sesja in_progress podczas próby rozpoczęcia:**
   - API zwraca istniejącą sesję (200) zamiast tworzyć nową
   - Przekierowanie do istniejącej sesji zamiast nowej

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. Utworzenie pliku strony: `src/app/workout-plans/[id]/page.tsx`
2. Utworzenie katalogu komponentów: `src/components/workout-plans/details/`
3. Utworzenie plików komponentów:
   - `src/components/workout-plans/details/workout-plan-details.tsx`
   - `src/components/workout-plans/details/workout-plan-metadata.tsx`
   - `src/components/workout-plans/details/workout-plan-exercises-list.tsx`
   - `src/components/workout-plans/details/workout-plan-exercise-item.tsx`
   - `src/components/workout-plans/details/workout-plan-actions.tsx`
   - `src/components/workout-plans/details/start-workout-button.tsx`
   - `src/components/workout-plans/details/delete-plan-dialog.tsx`

### Krok 2: Implementacja strony głównej (Server Component)

1. W `src/app/workout-plans/[id]/page.tsx`:
   - Import funkcji `getUserId` i `getWorkoutPlanService`
   - Pobranie parametru `id` z `params`
   - Walidacja UUID
   - Pobranie danych planu z serwisu
   - Obsługa błędów (404, 401/403) z przekierowaniem
   - Renderowanie struktury strony z komponentami

### Krok 3: Implementacja komponentów Server Components

1. **WorkoutPlanDetails:**
   - Przyjęcie props `plan: WorkoutPlanDTO`
   - Renderowanie kontenera z `WorkoutPlanMetadata` i `WorkoutPlanExercisesList`

2. **WorkoutPlanMetadata:**
   - Przyjęcie props z metadanymi planu
   - Renderowanie nazwy, opisu (jeśli istnieje) i partii (jeśli istnieje)

3. **WorkoutPlanExercisesList:**
   - Przyjęcie props `exercises: WorkoutPlanExerciseDTO[]`
   - Sortowanie ćwiczeń według `section_type` i `section_order`
   - Renderowanie listy z `WorkoutPlanExerciseItem` dla każdego ćwiczenia
   - Obsługa pustego stanu

4. **WorkoutPlanExerciseItem:**
   - Przyjęcie props `exercise: WorkoutPlanExerciseDTO`
   - Renderowanie tytułu ćwiczenia, typu, partii
   - Renderowanie parametrów planned_* (tylko jeśli istnieją)
   - Formatowanie czasu (sekundy → minuty/sekundy)

### Krok 4: Implementacja komponentów Client Components

1. **WorkoutPlanActions:**
   - Dodanie `"use client"` directive
   - Import `useState` dla stanu dialogu
   - Renderowanie przycisków: `StartWorkoutButton`, `EditButton`, `DeletePlanDialog`
   - Zarządzanie stanem `isDeleteDialogOpen`

2. **StartWorkoutButton:**
   - Dodanie `"use client"` directive
   - Import `useState`, `useRouter`, `toast`
   - Implementacja `handleStartWorkout`:
     - Ustawienie `isLoading = true`
     - Wywołanie POST `/api/workout-sessions`
     - Obsługa odpowiedzi (201/200 → przekierowanie, błędy → toast)
     - Reset `isLoading = false`
   - Renderowanie przycisku z stanem ładowania

3. **EditButton:**
   - Dodanie `"use client"` directive
   - Import `useRouter`
   - Implementacja `handleEdit` z przekierowaniem do `/workout-plans/[id]/edit`
   - Renderowanie przycisku

4. **DeletePlanDialog:**
   - Dodanie `"use client"` directive
   - Import `useState`, `useRouter`, `toast`, `AlertDialog` z shadcn/ui
   - Implementacja `handleDelete`:
     - Ustawienie `isDeleting = true`
     - Wywołanie DELETE `/api/workout-plans/[id]`
     - Obsługa odpowiedzi (204 → toast success + przekierowanie, błędy → toast)
     - Reset `isDeleting = false`
   - Renderowanie `AlertDialog` z przyciskami i stanem ładowania

### Krok 5: Integracja z API i obsługa błędów

1. W `WorkoutPlanDetailsPage`:
   - Dodanie try-catch dla obsługi błędów
   - Przekierowania dla błędów 404, 401/403
   - Logowanie błędów (w trybie development)

2. W `StartWorkoutButton`:
   - Obsługa wszystkich kodów statusu HTTP
   - Toast notifications dla błędów
   - Obsługa błędów sieciowych (TypeError)

3. W `DeletePlanDialog`:
   - Obsługa wszystkich kodów statusu HTTP
   - Toast notifications dla błędów
   - Obsługa błędów sieciowych (TypeError)

### Krok 6: Stylowanie i UX

1. Zastosowanie stylów Tailwind zgodnie z designem aplikacji
2. Dodanie ARIA labels dla dostępności
3. Dodanie stanów ładowania (spinner/disabled)
4. Dodanie tooltipów (jeśli potrzebne)
5. Responsywność (mobile/desktop)

### Krok 7: Testowanie

1. Testowanie wyświetlania planu z różnymi danymi:
   - Plan z ćwiczeniami
   - Plan bez opisu
   - Plan bez partii
   - Plan z różnymi parametrami planned_*

2. Testowanie akcji:
   - Rozpoczęcie sesji (sukces)
   - Rozpoczęcie sesji z istniejącą sesją in_progress
   - Rozpoczęcie sesji z planem bez ćwiczeń (błąd)
   - Edycja planu (przekierowanie)
   - Usunięcie planu (sukces)
   - Anulowanie usunięcia

3. Testowanie obsługi błędów:
   - 404 (plan nie istnieje)
   - 401/403 (brak autoryzacji)
   - 500 (błąd serwera)
   - Błąd sieciowy

4. Testowanie dostępności:
   - Keyboard navigation
   - Screen reader compatibility
   - ARIA labels

### Krok 8: Refaktoryzacja i optymalizacja

1. Sprawdzenie, czy wszystkie komponenty są poprawnie zoptymalizowane
2. Usunięcie nieużywanych importów
3. Sprawdzenie zgodności z regułami ESLint
4. Optymalizacja renderowania (jeśli potrzebne)

### Krok 9: Dokumentacja (opcjonalne)

1. Dodanie komentarzy JSDoc do komponentów (jeśli potrzebne)
2. Aktualizacja dokumentacji projektu (jeśli istnieje)
