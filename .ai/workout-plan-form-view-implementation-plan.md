# Plan implementacji widoku formularza tworzenia/edycji planu treningowego

## 1. Przegląd

Widok formularza tworzenia/edycji planu treningowego umożliwia użytkowniczce utworzenie nowego planu treningowego lub edycję istniejącego planu. Formularz zawiera pola metadanych planu (nazwa, opis, part) oraz listę ćwiczeń w planie z parametrami planowanymi (planned_sets, planned_reps, planned_duration_seconds, planned_rest_seconds). Każde ćwiczenie w planie ma przypisaną sekcję (section_type: Warm-up | Main Workout | Cool-down) i kolejność w ramach sekcji (section_order).

Widok obsługuje dwa tryby:

- **Tworzenie**: `/workout-plans/new` - pusty formularz do dodania nowego planu
- **Edycja**: `/workout-plans/[id]/edit` - formularz wypełniony danymi istniejącego planu

Formularz implementuje dwupoziomową walidację (klient + serwer), wyświetla komunikaty błędów inline przy polach, obsługuje dialog wyboru ćwiczeń z wyszukiwaniem i filtrowaniem, umożliwia edycję parametrów planned\_\* dla każdego ćwiczenia, obsługuje potwierdzenie przed opuszczeniem strony z niezapisanymi zmianami oraz przekierowuje do listy planów po udanym zapisie.

## 2. Routing widoku

Widok jest dostępny pod dwoma ścieżkami:

- **Tworzenie**: `/workout-plans/new` - Server Component page z pustym formularzem
- **Edycja**: `/workout-plans/[id]/edit` - Server Component page z formularzem wypełnionym danymi planu

Struktura plików:

```
src/app/workout-plans/
  ├── new/
  │   └── page.tsx          # Server Component - tworzenie
  ├── [id]/
  │   └── edit/
  │       └── page.tsx      # Server Component - edycja
  └── page.tsx              # Lista planów (istniejący)
```

## 3. Struktura komponentów

```
WorkoutPlanFormPage (Server Component)
  └── WorkoutPlanForm (Client Component)
      ├── WorkoutPlanMetadataFields (Client Component)
      │   ├── TextInput (name - required)
      │   ├── Textarea (description - opcjonalny)
      │   └── Select (part - opcjonalny, enum)
      ├── WorkoutPlanExercisesList (Client Component)
      │   └── WorkoutPlanExerciseItem[] (Client Component)
      │       ├── ExerciseInfo (nazwa, type, part)
      │       ├── PlannedParamsEditor (planned_*)
      │       └── RemoveExerciseButton
      ├── AddExerciseDialog (Client Component)
      │   └── ExerciseSelector (Client Component)
      │       ├── ExerciseSearchInput
      │       ├── ExerciseFilters (part, type)
      │       └── ExerciseList (grid/list)
      ├── ValidationErrors (Client Component)
      ├── SaveButton (Client Component)
      └── CancelButton (Client Component)
```

## 4. Szczegóły komponentów

### WorkoutPlanFormPage (Server Component)

**Opis komponentu**: Główny komponent strony odpowiedzialny za pobranie danych planu (w trybie edycji) i renderowanie formularza. W trybie tworzenia renderuje pusty formularz, w trybie edycji pobiera dane przez `getWorkoutPlanService` i przekazuje je do formularza.

**Główne elementy**:

- Header z tytułem strony ("Dodaj plan treningowy" / "Edytuj plan treningowy")
- Komponent `WorkoutPlanForm` z odpowiednimi props

**Obsługiwane zdarzenia**: Brak (Server Component)

**Obsługiwana walidacja**: Brak (walidacja w Client Component)

**Typy**:

- Props: `{ params?: Promise<{ id: string }> }` (dla edycji)
- Używa: `WorkoutPlanDTO` z API

**Props**: Brak (komponent strony Next.js)

### WorkoutPlanForm (Client Component)

**Opis komponentu**: Główny komponent formularza odpowiedzialny za zarządzanie stanem formularza, walidację po stronie klienta (Zod), obsługę submit, integrację z API oraz zarządzanie stanem niezapisanych zmian (dla potwierdzenia przed opuszczeniem).

**Główne elementy**:

- `<form>` element z `onSubmit` handler
- `WorkoutPlanMetadataFields` - pola metadanych planu
- `WorkoutPlanExercisesList` - lista ćwiczeń w planie
- `AddExerciseDialog` - dialog wyboru ćwiczenia do dodania
- `ValidationErrors` - wyświetlanie błędów walidacji
- `SaveButton` - przycisk zapisu z loading state
- `CancelButton` - przycisk anulowania

**Obsługiwane zdarzenia**:

- `onSubmit` - walidacja i wysłanie żądania do API
- `onChange` - aktualizacja stanu formularza i walidacja w czasie rzeczywistym
- `onBlur` - walidacja pola po opuszczeniu
- `beforeunload` - potwierdzenie przed opuszczeniem strony z niezapisanymi zmianami

**Obsługiwana walidacja**:

- Walidacja po stronie klienta (Zod) przed wysłaniem:
  - `name`: wymagane, string, trim, min 1, max 120 znaków
  - `description`: opcjonalny, string, trim, max 1000 znaków, nullable
  - `part`: opcjonalny, enum (Legs | Core | Back | Arms | Chest), nullable
  - `exercises`: wymagane, array, min 1 element
  - Dla każdego ćwiczenia w `exercises`:
    - `exercise_id`: wymagane, UUID
    - `section_type`: wymagane, enum (Warm-up | Main Workout | Cool-down)
    - `section_order`: wymagane, number, integer, positive (> 0)
    - `planned_sets`: opcjonalny, number, integer, positive, nullable
    - `planned_reps`: opcjonalny, number, integer, positive, nullable
    - `planned_duration_seconds`: opcjonalny, number, integer, positive, nullable
    - `planned_rest_seconds`: opcjonalny, number, integer, nonnegative, nullable
- Reguły biznesowe:
  - Co najmniej jedno ćwiczenie w planie
  - Unikalność `section_order` w ramach każdej sekcji (`section_type`)
  - Jeśli `planned_sets` podane, musi być > 0
  - Jeśli `planned_reps` podane, musi być > 0
  - Jeśli `planned_duration_seconds` podane, musi być > 0
  - Jeśli `planned_rest_seconds` podane, musi być >= 0
- Walidacja po stronie serwera (komunikaty błędów 400, 409)

**Typy**:

- Props: `{ initialData?: WorkoutPlanDTO; mode: 'create' | 'edit' }`
- Stan: `WorkoutPlanFormState` (ViewModel)
- Używa: `WorkoutPlanCreateCommand`, `WorkoutPlanUpdateCommand`, `WorkoutPlanDTO`

**Props**:

- `initialData?: WorkoutPlanDTO` - dane planu do edycji (undefined dla tworzenia)
- `mode: 'create' | 'edit'` - tryb formularza

### WorkoutPlanMetadataFields (Client Component)

**Opis komponentu**: Komponent renderujący pola metadanych planu (nazwa, opis, part) z walidacją inline. Każde pole wyświetla błędy walidacji bezpośrednio pod sobą.

**Główne elementy**:

- TextInput dla `name` (required, max 120 znaków)
- Textarea dla `description` (opcjonalny, max 1000 znaków)
- Select dla `part` (opcjonalny, enum: Legs | Core | Back | Arms | Chest)

**Obsługiwane zdarzenia**:

- `onChange` - przekazywane do rodzica (WorkoutPlanForm)
- `onBlur` - walidacja pola po opuszczeniu

**Obsługiwana walidacja**:

- Walidacja inline dla każdego pola zgodnie z regułami Zod
- Wyświetlanie błędów pod każdym polem
- `aria-invalid="true"` dla pól z błędami
- `aria-describedby` wskazujące na element z komunikatem błędu

**Typy**:

- Props: `WorkoutPlanMetadataFieldsProps`
- Używa: `WorkoutPlanFormState` (ViewModel)

**Props**:

- `fields: { name: string; description: string | null; part: ExercisePart | null }` - stan pól metadanych
- `errors: Record<string, string>` - błędy walidacji per pole
- `onChange: (field: string, value: unknown) => void` - handler zmiany wartości
- `onBlur: (field: string) => void` - handler opuszczenia pola
- `disabled: boolean` - czy formularz jest zablokowany (podczas zapisu)

### WorkoutPlanExercisesList (Client Component)

**Opis komponentu**: Komponent renderujący listę ćwiczeń w planie w kolejności dodania. Wyświetla ćwiczenia pogrupowane według sekcji (Warm-up, Main Workout, Cool-down) lub w jednej liście z oznaczeniem sekcji. Każde ćwiczenie jest renderowane jako `WorkoutPlanExerciseItem`.

**Główne elementy**:

- Lista `WorkoutPlanExerciseItem` komponentów
- Pusty stan, gdy brak ćwiczeń w planie
- Sekcje grupujące ćwiczenia według `section_type` (opcjonalnie)

**Obsługiwane zdarzenia**:

- `onRemoveExercise` - przekazywane do rodzica (WorkoutPlanForm)
- `onUpdateExercise` - przekazywane do rodzica (WorkoutPlanForm)

**Obsługiwana walidacja**: Brak (walidacja na poziomie formularza)

**Typy**:

- Props: `WorkoutPlanExercisesListProps`
- Używa: `WorkoutPlanExerciseItemState[]` (ViewModel)

**Props**:

- `exercises: WorkoutPlanExerciseItemState[]` - lista ćwiczeń w planie
- `onRemoveExercise: (index: number) => void` - handler usunięcia ćwiczenia
- `onUpdateExercise: (index: number, exercise: Partial<WorkoutPlanExerciseItemState>) => void` - handler aktualizacji ćwiczenia
- `errors: Record<string, string>` - błędy walidacji per ćwiczenie
- `disabled: boolean` - czy lista jest zablokowana (podczas zapisu)

### WorkoutPlanExerciseItem (Client Component)

**Opis komponentu**: Komponent renderujący pojedyncze ćwiczenie w planie z informacjami o ćwiczeniu (nazwa, type, part), parametrami planowanymi (planned\_\*) oraz przyciskiem usunięcia ćwiczenia z planu.

**Główne elementy**:

- Wyświetlenie informacji o ćwiczeniu (nazwa, type, part) - tylko do odczytu
- `PlannedParamsEditor` - edycja parametrów planned\_\*
- Select dla `section_type` (Warm-up | Main Workout | Cool-down)
- NumberInput dla `section_order` (read-only lub edytowalny w zależności od wymagań)
- `RemoveExerciseButton` - przycisk usunięcia ćwiczenia

**Obsługiwane zdarzenia**:

- `onChange` - aktualizacja parametrów ćwiczenia (przekazywane do rodzica)
- `onRemove` - usunięcie ćwiczenia z planu (przekazywane do rodzica)

**Obsługiwana walidacja**:

- Walidacja inline dla `section_order` (integer, positive)
- Walidacja inline dla parametrów planned\_\* (positive jeśli podane, nonnegative dla rest)
- Wyświetlanie błędów pod polami

**Typy**:

- Props: `WorkoutPlanExerciseItemProps`
- Używa: `WorkoutPlanExerciseItemState` (ViewModel)

**Props**:

- `exercise: WorkoutPlanExerciseItemState` - stan ćwiczenia w planie
- `index: number` - indeks ćwiczenia w liście
- `onChange: (updates: Partial<WorkoutPlanExerciseItemState>) => void` - handler zmiany ćwiczenia
- `onRemove: () => void` - handler usunięcia ćwiczenia
- `errors: Record<string, string>` - błędy walidacji per pole ćwiczenia
- `disabled: boolean` - czy ćwiczenie jest zablokowane (podczas zapisu)

### PlannedParamsEditor (Client Component)

**Opis komponentu**: Komponent renderujący pola edycji parametrów planowanych dla ćwiczenia (planned_sets, planned_reps, planned_duration_seconds, planned_rest_seconds). Pola są opcjonalne i mogą być puste.

**Główne elementy**:

- NumberInput dla `planned_sets` (opcjonalny, integer, positive)
- NumberInput dla `planned_reps` (opcjonalny, integer, positive)
- NumberInput dla `planned_duration_seconds` (opcjonalny, integer, positive)
- NumberInput dla `planned_rest_seconds` (opcjonalny, integer, nonnegative)

**Obsługiwane zdarzenia**:

- `onChange` - aktualizacja wartości parametru (przekazywane do rodzica)

**Obsługiwana walidacja**:

- Walidacja inline dla każdego pola:
  - `planned_sets`: jeśli podane, integer, positive (> 0)
  - `planned_reps`: jeśli podane, integer, positive (> 0)
  - `planned_duration_seconds`: jeśli podane, integer, positive (> 0)
  - `planned_rest_seconds`: jeśli podane, integer, nonnegative (>= 0)
- Wyświetlanie błędów pod polami

**Typy**:

- Props: `PlannedParamsEditorProps`
- Używa: `PlannedParamsState` (ViewModel)

**Props**:

- `params: PlannedParamsState` - stan parametrów planowanych
- `onChange: (field: string, value: number | null) => void` - handler zmiany wartości
- `errors: Record<string, string>` - błędy walidacji per pole
- `disabled: boolean` - czy edytor jest zablokowany (podczas zapisu)

### AddExerciseDialog (Client Component)

**Opis komponentu**: Komponent dialogu (shadcn/ui Dialog) umożliwiający wybór ćwiczenia z biblioteki użytkowniczki do dodania do planu. Dialog zawiera `ExerciseSelector` z wyszukiwaniem i filtrowaniem ćwiczeń.

**Główne elementy**:

- Dialog (shadcn/ui Dialog) z trigger button "Dodaj ćwiczenie"
- `ExerciseSelector` - komponent wyboru ćwiczenia
- Przyciski: "Anuluj", "Dodaj" (zamyka dialog i dodaje ćwiczenie do planu)

**Obsługiwane zdarzenia**:

- `onOpenChange` - otwarcie/zamknięcie dialogu
- `onSelectExercise` - wybór ćwiczenia i dodanie do planu (przekazywane do rodzica)

**Obsługiwana walidacja**: Brak (walidacja na poziomie formularza)

**Typy**:

- Props: `AddExerciseDialogProps`
- Używa: `ExerciseDTO` z API

**Props**:

- `onAddExercise: (exercise: ExerciseDTO) => void` - handler dodania ćwiczenia do planu
- `disabled: boolean` - czy dialog jest zablokowany (podczas zapisu)
- `existingExerciseIds: string[]` - lista ID ćwiczeń już dodanych do planu (opcjonalnie, aby uniknąć duplikatów)

### ExerciseSelector (Client Component)

**Opis komponentu**: Komponent wyboru ćwiczenia z biblioteki użytkowniczki z wyszukiwaniem i filtrowaniem. Wyświetla listę dostępnych ćwiczeń w formie gridu lub listy z możliwością wyszukiwania po tytule i filtrowania po part i type.

**Główne elementy**:

- `ExerciseSearchInput` - pole wyszukiwania po tytule
- `ExerciseFilters` - filtry po part i type
- `ExerciseList` - lista/grid ćwiczeń do wyboru
- Loading state podczas pobierania ćwiczeń
- Pusty stan, gdy brak ćwiczeń

**Obsługiwane zdarzenia**:

- `onSearchChange` - zmiana wyszukiwania
- `onFilterChange` - zmiana filtrów
- `onSelectExercise` - wybór ćwiczenia (przekazywane do rodzica)

**Obsługiwana walidacja**: Brak

**Typy**:

- Props: `ExerciseSelectorProps`
- Używa: `ExerciseDTO` z API, `ExerciseQueryParams`

**Props**:

- `onSelectExercise: (exercise: ExerciseDTO) => void` - handler wyboru ćwiczenia
- `excludedExerciseIds?: string[]` - lista ID ćwiczeń do wykluczenia z listy (opcjonalnie)

### ValidationErrors (Client Component)

**Opis komponentu**: Komponent wyświetlający błędy walidacji na poziomie formularza (reguły biznesowe, które nie są przypisane do konkretnego pola, np. "Plan treningowy musi zawierać co najmniej jedno ćwiczenie" lub "Duplikat kolejności w sekcji").

**Główne elementy**:

- Lista błędów walidacji jako `<ul>` z `<li>` elementami
- Każdy błąd z ikoną błędu i komunikatem

**Obsługiwane zdarzenia**: Brak

**Obsługiwana walidacja**: Wyświetlanie błędów reguł biznesowych

**Typy**:

- Props: `ValidationErrorsProps`

**Props**:

- `errors: string[]` - lista komunikatów błędów

### SaveButton (Client Component)

**Opis komponentu**: Przycisk zapisu formularza z loading state. Wyświetla stan ładowania podczas zapisu i jest zablokowany podczas operacji.

**Główne elementy**:

- Button (shadcn/ui Button) z tekstem "Zapisz"
- Loading spinner podczas zapisu
- Disabled state podczas zapisu

**Obsługiwane zdarzenia**: Brak (submit obsługiwany przez form)

**Obsługiwana walidacja**: Brak

**Typy**:

- Props: `SaveButtonProps`

**Props**:

- `isLoading: boolean` - czy trwa zapis
- `disabled: boolean` - czy przycisk jest zablokowany

### CancelButton (Client Component)

**Opis komponentu**: Przycisk anulowania formularza z obsługą potwierdzenia przed opuszczeniem, jeśli są niezapisane zmiany.

**Główne elementy**:

- Button (shadcn/ui Button) z tekstem "Anuluj"
- Dialog potwierdzenia, jeśli są niezapisane zmiany

**Obsługiwane zdarzenia**:

- `onClick` - przekierowanie do listy planów lub pokazanie dialogu potwierdzenia

**Obsługiwana walidacja**: Brak

**Typy**:

- Props: `CancelButtonProps`

**Props**:

- `hasUnsavedChanges: boolean` - czy są niezapisane zmiany
- `onCancel: () => void` - handler anulowania (opcjonalnie)

## 5. Typy

### Typy DTO (z API)

```typescript
// WorkoutPlanDTO - odpowiedź z GET /api/workout-plans/{id}
type WorkoutPlanDTO = {
  id: string;
  name: string;
  description: string | null;
  part: ExercisePart | null;
  created_at: string;
  updated_at: string;
  exercises: WorkoutPlanExerciseDTO[];
};

// WorkoutPlanExerciseDTO - ćwiczenie w planie
type WorkoutPlanExerciseDTO = {
  id: string; // ID ćwiczenia w planie (workout_plan_exercises.id)
  exercise_id: string; // ID ćwiczenia z biblioteki (exercises.id)
  section_type: ExerciseType; // Warm-up | Main Workout | Cool-down
  section_order: number; // Kolejność w sekcji (> 0)
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
};

// WorkoutPlanCreateCommand - żądanie POST /api/workout-plans
type WorkoutPlanCreateCommand = {
  name: string;
  description?: string | null;
  part?: ExercisePart | null;
  exercises: WorkoutPlanExerciseInput[];
};

// WorkoutPlanExerciseInput - ćwiczenie w żądaniu tworzenia
type WorkoutPlanExerciseInput = {
  exercise_id: string;
  section_type: ExerciseType;
  section_order: number;
  planned_sets?: number | null;
  planned_reps?: number | null;
  planned_duration_seconds?: number | null;
  planned_rest_seconds?: number | null;
};

// WorkoutPlanUpdateCommand - żądanie PATCH /api/workout-plans/{id}
// Uwaga: W trybie edycji API używa strategii "replace" - pełna lista ćwiczeń zastępuje istniejącą
// Ale w implementacji endpointu widzimy, że używa workoutPlanExerciseUpdateSchema
// z id dla każdego ćwiczenia. Wymaga to weryfikacji w kodzie.
// Dla uproszczenia zakładamy, że update używa tej samej struktury co create,
// ale z możliwością częściowej aktualizacji metadanych.
type WorkoutPlanUpdateCommand = {
  name?: string;
  description?: string | null;
  part?: ExercisePart | null;
  exercises?: WorkoutPlanExerciseInput[]; // Pełna lista ćwiczeń (replace strategy)
};

// ExerciseDTO - ćwiczenie z biblioteki (dla ExerciseSelector)
type ExerciseDTO = {
  id: string;
  title: string;
  type: ExerciseType;
  part: ExercisePart;
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

### Typy ViewModel (dla komponentów)

```typescript
// WorkoutPlanFormState - stan formularza
type WorkoutPlanFormState = {
  name: string;
  description: string | null;
  part: ExercisePart | null;
  exercises: WorkoutPlanExerciseItemState[];
};

// WorkoutPlanExerciseItemState - stan pojedynczego ćwiczenia w planie
type WorkoutPlanExerciseItemState = {
  // Identyfikatory
  id?: string; // ID ćwiczenia w planie (tylko w trybie edycji)
  exercise_id: string; // ID ćwiczenia z biblioteki
  // Metadane ćwiczenia (tylko do wyświetlenia, nie edytowalne w formularzu)
  exercise_title?: string; // Nazwa ćwiczenia (z ExerciseDTO)
  exercise_type?: ExerciseType; // Type ćwiczenia (z ExerciseDTO)
  exercise_part?: ExercisePart; // Part ćwiczenia (z ExerciseDTO)
  // Parametry planu
  section_type: ExerciseType; // Warm-up | Main Workout | Cool-down
  section_order: number; // Kolejność w sekcji (> 0)
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
};

// PlannedParamsState - stan parametrów planowanych
type PlannedParamsState = {
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
};
```

### Typy Props komponentów

```typescript
// WorkoutPlanFormProps
type WorkoutPlanFormProps = {
  initialData?: WorkoutPlanDTO;
  mode: "create" | "edit";
};

// WorkoutPlanMetadataFieldsProps
type WorkoutPlanMetadataFieldsProps = {
  fields: {
    name: string;
    description: string | null;
    part: ExercisePart | null;
  };
  errors: Record<string, string>;
  onChange: (field: string, value: unknown) => void;
  onBlur: (field: string) => void;
  disabled: boolean;
};

// WorkoutPlanExercisesListProps
type WorkoutPlanExercisesListProps = {
  exercises: WorkoutPlanExerciseItemState[];
  onRemoveExercise: (index: number) => void;
  onUpdateExercise: (
    index: number,
    exercise: Partial<WorkoutPlanExerciseItemState>
  ) => void;
  errors: Record<string, string>;
  disabled: boolean;
};

// WorkoutPlanExerciseItemProps
type WorkoutPlanExerciseItemProps = {
  exercise: WorkoutPlanExerciseItemState;
  index: number;
  onChange: (updates: Partial<WorkoutPlanExerciseItemState>) => void;
  onRemove: () => void;
  errors: Record<string, string>;
  disabled: boolean;
};

// PlannedParamsEditorProps
type PlannedParamsEditorProps = {
  params: PlannedParamsState;
  onChange: (field: string, value: number | null) => void;
  errors: Record<string, string>;
  disabled: boolean;
};

// AddExerciseDialogProps
type AddExerciseDialogProps = {
  onAddExercise: (exercise: ExerciseDTO) => void;
  disabled: boolean;
  existingExerciseIds?: string[];
};

// ExerciseSelectorProps
type ExerciseSelectorProps = {
  onSelectExercise: (exercise: ExerciseDTO) => void;
  excludedExerciseIds?: string[];
};

// ValidationErrorsProps
type ValidationErrorsProps = {
  errors: string[];
};

// SaveButtonProps
type SaveButtonProps = {
  isLoading: boolean;
  disabled: boolean;
};

// CancelButtonProps
type CancelButtonProps = {
  hasUnsavedChanges: boolean;
  onCancel?: () => void;
};
```

## 6. Zarządzanie stanem

Zarządzanie stanem w widoku formularza odbywa się przez custom hook `useWorkoutPlanForm`, który:

1. Inicjalizuje stan formularza na podstawie `initialData` (w trybie edycji) lub pustych wartości (w trybie tworzenia)
2. Zarządza stanem pól formularza (`name`, `description`, `part`, `exercises`)
3. Wykonuje walidację po stronie klienta (Zod) w czasie rzeczywistym
4. Obsługuje dodawanie ćwiczeń do planu (z dialogu wyboru)
5. Obsługuje usuwanie ćwiczeń z planu
6. Obsługuje aktualizację parametrów ćwiczeń w planie
7. Zarządza stanem niezapisanych zmian (dla potwierdzenia przed opuszczeniem)
8. Obsługuje submit formularza z integracją API
9. Zarządza stanem ładowania podczas zapisu
10. Obsługuje błędy walidacji i wyświetlanie komunikatów błędów

Hook `useWorkoutPlanForm` przyjmuje:

- `initialData?: WorkoutPlanDTO` - dane planu do edycji
- `mode: 'create' | 'edit'` - tryb formularza
- `onSuccess: () => void` - callback po udanym zapisie

Hook zwraca:

- `fields: WorkoutPlanFormState` - stan formularza
- `errors: Record<string, string | string[]>` - błędy walidacji (per pole + `_form` dla błędów formularza)
- `isLoading: boolean` - czy trwa zapis
- `hasUnsavedChanges: boolean` - czy są niezapisane zmiany
- `handleChange: (field: string, value: unknown) => void` - handler zmiany wartości pola
- `handleBlur: (field: string) => void` - handler opuszczenia pola
- `handleAddExercise: (exercise: ExerciseDTO) => void` - handler dodania ćwiczenia
- `handleRemoveExercise: (index: number) => void` - handler usunięcia ćwiczenia
- `handleUpdateExercise: (index: number, updates: Partial<WorkoutPlanExerciseItemState>) => void` - handler aktualizacji ćwiczenia
- `handleSubmit: (e: React.FormEvent) => Promise<void>` - handler submit formularza

Dodatkowo, hook `useExerciseSelector` może być użyty w `ExerciseSelector` do zarządzania stanem wyszukiwania i filtrowania ćwiczeń (opcjonalnie, może być prostsze zarządzanie stanem bezpośrednio w komponencie).

## 7. Integracja API

### POST /api/workout-plans (tworzenie planu)

**Endpoint**: `POST /api/workout-plans`

**Request Body**:

```typescript
{
  name: string;
  description?: string | null;
  part?: ExercisePart | null;
  exercises: Array<{
    exercise_id: string;
    section_type: ExerciseType;
    section_order: number;
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
  }>;
}
```

**Response**:

- Success: `201 Created` z `WorkoutPlanDTO`
- Errors:
  - `400 Bad Request` - walidacja nie powiodła się (puste ćwiczenia, duplikaty pozycji, nieprawidłowe wartości)
  - `401/403` - brak autoryzacji
  - `500 Internal Server Error` - błąd serwera

**Użycie w komponencie**:

```typescript
const response = await fetch("/api/workout-plans", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(workoutPlanCreateCommand),
});
```

### PATCH /api/workout-plans/{id} (edycja planu)

**Endpoint**: `PATCH /api/workout-plans/{id}`

**Request Body**:

```typescript
{
  name?: string;
  description?: string | null;
  part?: ExercisePart | null;
  exercises?: Array<{
    id: string; // ID ćwiczenia w planie (wymagane w trybie edycji)
    exercise_id?: string;
    section_type?: ExerciseType;
    section_order?: number;
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
  }>;
}
```

**Uwaga**: Wymaga weryfikacji w kodzie endpointu - implementacja używa `workoutPlanExerciseUpdateSchema` z `id` dla każdego ćwiczenia, ale API plan mówi o strategii "replace". Dla uproszczenia zakładamy, że update przyjmuje pełną listę ćwiczeń z `id` dla istniejących ćwiczeń.

**Response**:

- Success: `200 OK` z `WorkoutPlanDTO`
- Errors:
  - `400 Bad Request` - walidacja nie powiodła się
  - `404 Not Found` - plan nie istnieje lub nie należy do użytkownika
  - `409 Conflict` - duplikaty pozycji w sekcji
  - `401/403` - brak autoryzacji
  - `500 Internal Server Error` - błąd serwera

**Użycie w komponencie**:

```typescript
const response = await fetch(`/api/workout-plans/${planId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(workoutPlanUpdateCommand),
});
```

### GET /api/workout-plans/{id} (pobranie planu do edycji)

**Endpoint**: `GET /api/workout-plans/{id}`

**Response**:

- Success: `200 OK` z `WorkoutPlanDTO`
- Errors:
  - `404 Not Found` - plan nie istnieje lub nie należy do użytkownika
  - `401/403` - brak autoryzacji
  - `500 Internal Server Error` - błąd serwera

**Użycie w komponencie**: Server Component pobiera dane przed renderowaniem formularza.

### GET /api/exercises (pobranie ćwiczeń do wyboru)

**Endpoint**: `GET /api/exercises`

**Query Params**:

- `search?: string` - wyszukiwanie po tytule
- `part?: ExercisePart` - filtr po part
- `type?: ExerciseType` - filtr po type
- `sort?: string` - sortowanie (domyślnie `created_at`)
- `order?: 'asc' | 'desc'` - kolejność (domyślnie `desc`)
- `limit?: number` - limit wyników (domyślnie 20, max 100)
- `cursor?: string` - kursor paginacji

**Response**:

- Success: `200 OK` z `{ items: ExerciseDTO[]; nextCursor: string | null }`
- Errors:
  - `400 Bad Request` - nieprawidłowe parametry
  - `401/403` - brak autoryzacji
  - `500 Internal Server Error` - błąd serwera

**Użycie w komponencie**: `ExerciseSelector` pobiera ćwiczenia przy otwarciu dialogu lub przy zmianie filtrów/wyszukiwania.

## 8. Interakcje użytkownika

### 8.1 Tworzenie nowego planu

1. Użytkowniczka przechodzi do `/workout-plans/new`
2. Widzi pusty formularz z polami: name, description, part
3. Wypełnia pola metadanych (name jest wymagane)
4. Klika "Dodaj ćwiczenie" - otwiera się dialog z listą ćwiczeń
5. W dialogu może wyszukiwać ćwiczenia po tytule i filtrować po part/type
6. Wybiera ćwiczenie z listy - ćwiczenie zostaje dodane do planu z domyślnymi wartościami:
   - `section_type`: "Main Workout" (domyślnie)
   - `section_order`: następna dostępna pozycja w sekcji (np. 1, 2, 3...)
   - `planned_sets`, `planned_reps`, `planned_duration_seconds`, `planned_rest_seconds`: null
7. Może edytować parametry ćwiczenia (section*type, section_order, planned*\*)
8. Może dodać więcej ćwiczeń (powtarza kroki 4-7)
9. Może usunąć ćwiczenie z planu (przycisk "Usuń")
10. Klika "Zapisz" - formularz jest walidowany:
    - Jeśli walidacja nie powiedzie się, wyświetlane są błędy
    - Jeśli walidacja powiedzie się, wysyłane jest żądanie POST do API
    - Po udanym zapisie wyświetlany jest toast notification i następuje przekierowanie do `/workout-plans`
11. Klika "Anuluj" - jeśli są niezapisane zmiany, wyświetlany jest dialog potwierdzenia; po potwierdzeniu następuje przekierowanie do `/workout-plans`

### 8.2 Edycja istniejącego planu

1. Użytkowniczka przechodzi do `/workout-plans/[id]/edit`
2. Widzi formularz wypełniony danymi planu (name, description, part, lista ćwiczeń)
3. Może edytować pola metadanych (name, description, part)
4. Może edytować parametry ćwiczeń w planie (section*type, section_order, planned*\*)
5. Może dodać nowe ćwiczenia (jak w tworzeniu)
6. Może usunąć ćwiczenia z planu
7. Klika "Zapisz" - formularz jest walidowany i wysyłane jest żądanie PATCH do API
8. Po udanym zapisie wyświetlany jest toast notification i następuje przekierowanie do `/workout-plans`
9. Klika "Anuluj" - jeśli są niezapisane zmiany, wyświetlany jest dialog potwierdzenia

### 8.3 Walidacja w czasie rzeczywistym

- Po wprowadzeniu wartości w polu i opuszczeniu (`onBlur`) wykonywana jest walidacja pola
- Błędy walidacji wyświetlane są bezpośrednio pod polem
- Błędy na poziomie formularza (np. "Plan musi zawierać co najmniej jedno ćwiczenie") wyświetlane są w sekcji `ValidationErrors`
- Podczas submit formularza wykonywana jest pełna walidacja przed wysłaniem żądania

### 8.4 Obsługa błędów API

- Błędy walidacji (400) - wyświetlane jako komunikaty błędów w formularzu
- Błędy konfliktu (409) - wyświetlane jako komunikaty błędów (np. "Duplikat kolejności w sekcji")
- Błędy autoryzacji (401/403) - przekierowanie do logowania lub wyświetlenie komunikatu błędu
- Błędy nie znaleziono (404) - wyświetlenie komunikatu błędu (w trybie edycji)
- Błędy serwera (500) - wyświetlenie ogólnego komunikatu błędu z możliwością ponowienia

## 9. Warunki i walidacja

### 9.1 Walidacja pól metadanych

- **name**:
  - Wymagane
  - String, trim, min 1 znak, max 120 znaków
  - Walidacja po stronie klienta (Zod) i serwera
- **description**:
  - Opcjonalny
  - String, trim, max 1000 znaków, nullable
  - Walidacja po stronie klienta (Zod) i serwera
- **part**:
  - Opcjonalny
  - Enum: Legs | Core | Back | Arms | Chest, nullable
  - Walidacja po stronie klienta (Zod) i serwera

### 9.2 Walidacja ćwiczeń w planie

- **Co najmniej jedno ćwiczenie**:
  - Plan musi zawierać co najmniej jedno ćwiczenie
  - Walidacja po stronie klienta (Zod: `exercises.min(1)`) i serwera
  - Komunikat błędu: "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"
- **Unikalność section_order w sekcji**:
  - W ramach każdej sekcji (`section_type`) `section_order` musi być unikalny
  - Walidacja po stronie klienta (custom validation) i serwera
  - Komunikat błędu: "Duplikat kolejności {order} w sekcji {section_type}"
- **Walidacja planned\_\* dla każdego ćwiczenia**:
  - `planned_sets`: jeśli podane, integer, positive (> 0)
  - `planned_reps`: jeśli podane, integer, positive (> 0)
  - `planned_duration_seconds`: jeśli podane, integer, positive (> 0)
  - `planned_rest_seconds`: jeśli podane, integer, nonnegative (>= 0)
  - Walidacja po stronie klienta (Zod) i serwera
  - Komunikaty błędów per pole: "{field} musi być większe od zera" lub "{field} nie może być ujemne"

### 9.3 Walidacja exercise_id

- `exercise_id` musi być prawidłowym UUID
- `exercise_id` musi należeć do użytkowniczki (walidacja po stronie serwera)
- Komunikat błędu: "Niektóre ćwiczenia nie istnieją lub nie należą do użytkownika" (404)

### 9.4 Wpływ walidacji na stan interfejsu

- Pola z błędami walidacji mają `aria-invalid="true"` i wyświetlają komunikat błędu pod polem
- Przycisk "Zapisz" może być zablokowany, jeśli są błędy walidacji (opcjonalnie)
- Błędy na poziomie formularza wyświetlane są w sekcji `ValidationErrors` na górze formularza
- Podczas submit formularza wszystkie błędy walidacji są wyświetlane jednocześnie

## 10. Obsługa błędów

### 10.1 Błędy walidacji (400 Bad Request)

- **Źródło**: Błędy walidacji Zod lub reguł biznesowych
- **Obsługa**:
  - Błędy przypisane do pól wyświetlane są inline pod polami
  - Błędy na poziomie formularza wyświetlane są w sekcji `ValidationErrors`
  - Formularz pozostaje otwarty, użytkowniczka może poprawić błędy
- **Przykłady**:
  - "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"
  - "Duplikat kolejności 2 w sekcji Main Workout"
  - "planned_sets musi być większe od zera"

### 10.2 Błędy konfliktu (409 Conflict)

- **Źródło**: Duplikaty pozycji w sekcji, naruszenie unikalności
- **Obsługa**:
  - Komunikat błędu wyświetlany w sekcji `ValidationErrors`
  - Formularz pozostaje otwarty, użytkowniczka może poprawić błędy
- **Przykłady**:
  - "Duplikat pozycji w sekcji planu treningowego"

### 10.3 Błędy nie znaleziono (404 Not Found)

- **Źródło**: Plan nie istnieje lub nie należy do użytkowniczki (w trybie edycji)
- **Obsługa**:
  - W trybie edycji: wyświetlenie komunikatu błędu i przekierowanie do listy planów
  - W trybie tworzenia: wyświetlenie komunikatu błędu przy próbie użycia nieistniejącego ćwiczenia
- **Przykłady**:
  - "Plan treningowy nie został znaleziony"
  - "Niektóre ćwiczenia nie istnieją lub nie należą do użytkownika"

### 10.4 Błędy autoryzacji (401/403)

- **Źródło**: Brak aktywnej sesji lub brak uprawnień
- **Obsługa**:
  - Przekierowanie do logowania lub wyświetlenie komunikatu błędu
  - Toast notification z komunikatem błędu
- **Przykłady**:
  - "Brak aktywnej sesji"
  - "Brak uprawnień do wykonania tej operacji"

### 10.5 Błędy serwera (500 Internal Server Error)

- **Źródło**: Błąd serwera, problem z bazą danych
- **Obsługa**:
  - Wyświetlenie ogólnego komunikatu błędu
  - Toast notification z komunikatem błędu
  - Możliwość ponowienia operacji (opcjonalnie)
- **Przykłady**:
  - "Wystąpił błąd serwera. Spróbuj ponownie."

### 10.6 Błędy sieci

- **Źródło**: Brak połączenia z siecią, timeout
- **Obsługa**:
  - Wyświetlenie komunikatu błędu sieci
  - Toast notification z komunikatem błędu
  - Możliwość ponowienia operacji
- **Przykłady**:
  - "Brak połączenia z siecią. Sprawdź połączenie internetowe."

### 10.7 Obsługa przypadków brzegowych

- **Pusty stan ćwiczeń**: Jeśli użytkowniczka nie ma żadnych ćwiczeń w bibliotece, dialog wyboru ćwiczeń wyświetla pusty stan z komunikatem i linkiem do dodania pierwszego ćwiczenia
- **Usunięcie wszystkich ćwiczeń z planu**: Jeśli użytkowniczka usunie wszystkie ćwiczenia z planu, wyświetlany jest błąd walidacji przy próbie zapisu
- **Duplikaty ćwiczeń**: Jeśli użytkowniczka próbuje dodać to samo ćwiczenie dwa razy, można to zablokować na poziomie UI (opcjonalnie) lub pozwolić (różne parametry planned\_\*)
- **Zmiana section_order powodująca duplikat**: Jeśli użytkowniczka zmieni `section_order` na wartość już używaną w sekcji, wyświetlany jest błąd walidacji

## 11. Kroki implementacji

1. **Utworzenie struktury plików i komponentów podstawowych**:

   - Utworzenie plików: `src/app/workout-plans/new/page.tsx`, `src/app/workout-plans/[id]/edit/page.tsx`
   - Utworzenie komponentów: `WorkoutPlanForm`, `WorkoutPlanMetadataFields`, `WorkoutPlanExercisesList`, `WorkoutPlanExerciseItem`, `PlannedParamsEditor`, `AddExerciseDialog`, `ExerciseSelector`, `ValidationErrors`, `SaveButton`, `CancelButton`
   - Utworzenie hooka: `useWorkoutPlanForm`

2. **Implementacja typów i ViewModel**:

   - Zdefiniowanie typów ViewModel w pliku typów lub bezpośrednio w komponentach
   - Zdefiniowanie typów Props dla wszystkich komponentów
   - Import i użycie typów DTO z `src/types.ts`

3. **Implementacja walidacji**:

   - Użycie istniejących schematów Zod z `src/lib/validation/workout-plans.ts`
   - Dodanie walidacji po stronie klienta w hooku `useWorkoutPlanForm`
   - Implementacja walidacji inline dla pól formularza

4. **Implementacja WorkoutPlanFormPage (Server Component)**:

   - Implementacja strony `/workout-plans/new` z pustym formularzem
   - Implementacja strony `/workout-plans/[id]/edit` z pobraniem danych planu przez `getWorkoutPlanService`
   - Obsługa błędów 404 w trybie edycji

5. **Implementacja WorkoutPlanForm (Client Component)**:

   - Implementacja głównego formularza z zarządzaniem stanem przez `useWorkoutPlanForm`
   - Integracja z API (POST dla tworzenia, PATCH dla edycji)
   - Obsługa submit, błędów, loading state
   - Integracja z `useBeforeUnload` dla potwierdzenia przed opuszczeniem

6. **Implementacja WorkoutPlanMetadataFields (Client Component)**:

   - Implementacja pól: name (TextInput), description (Textarea), part (Select)
   - Walidacja inline i wyświetlanie błędów
   - Integracja z `useWorkoutPlanForm`

7. **Implementacja WorkoutPlanExercisesList (Client Component)**:

   - Implementacja listy ćwiczeń z renderowaniem `WorkoutPlanExerciseItem`
   - Obsługa usuwania i aktualizacji ćwiczeń
   - Pusty stan, gdy brak ćwiczeń

8. **Implementacja WorkoutPlanExerciseItem (Client Component)**:

   - Wyświetlenie informacji o ćwiczeniu (nazwa, type, part)
   - Select dla `section_type`
   - NumberInput dla `section_order` (read-only lub edytowalny)
   - Integracja z `PlannedParamsEditor`
   - Przycisk usunięcia ćwiczenia

9. **Implementacja PlannedParamsEditor (Client Component)**:

   - NumberInput dla `planned_sets`, `planned_reps`, `planned_duration_seconds`, `planned_rest_seconds`
   - Walidacja inline i wyświetlanie błędów

10. **Implementacja AddExerciseDialog (Client Component)**:

    - Dialog (shadcn/ui Dialog) z trigger button "Dodaj ćwiczenie"
    - Integracja z `ExerciseSelector`
    - Obsługa wyboru ćwiczenia i dodania do planu

11. **Implementacja ExerciseSelector (Client Component)**:

    - Pole wyszukiwania po tytule
    - Filtry po part i type
    - Lista/grid ćwiczeń z możliwością wyboru
    - Integracja z API `GET /api/exercises`
    - Loading state i pusty stan

12. **Implementacja ValidationErrors (Client Component)**:

    - Wyświetlanie błędów walidacji na poziomie formularza
    - Lista błędów z ikonami

13. **Implementacja SaveButton i CancelButton (Client Component)**:

    - Przycisk zapisu z loading state
    - Przycisk anulowania z obsługą potwierdzenia przed opuszczeniem

14. **Implementacja useWorkoutPlanForm (Custom Hook)**:

    - Zarządzanie stanem formularza
    - Walidacja po stronie klienta (Zod)
    - Obsługa dodawania, usuwania, aktualizacji ćwiczeń
    - Integracja z API (POST, PATCH)
    - Zarządzanie stanem niezapisanych zmian
    - Obsługa błędów i loading state

15. **Integracja z toast notifications**:

    - Toast notification przy udanym zapisie
    - Toast notification przy błędach

16. **Testowanie i poprawki**:

    - Testowanie tworzenia nowego planu
    - Testowanie edycji istniejącego planu
    - Testowanie walidacji (puste pola, nieprawidłowe wartości, duplikaty)
    - Testowanie dodawania/usuwania ćwiczeń
    - Testowanie obsługi błędów API
    - Testowanie potwierdzenia przed opuszczeniem z niezapisanymi zmianami
    - Testowanie dostępności (ARIA labels, keyboard navigation)

17. **Optymalizacja i poprawki UX**:
    - Optymalizacja wydajności (memoization, lazy loading)
    - Poprawki UX (loading states, animacje, transitions)
    - Poprawki dostępności (focus management, ARIA labels)
