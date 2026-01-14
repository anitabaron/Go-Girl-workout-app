# Plan implementacji widoku Asystenta Treningowego

## 1. Przegląd

Widok asystenta treningowego (`/workout-sessions/[id]/active`) to pełnoekranowy interfejs prowadzący użytkowniczkę przez sesję treningową krok po kroku. Widok umożliwia:

- Wyświetlanie bieżącego ćwiczenia z parametrami planowanymi
- Wprowadzanie faktycznego wykonania (actual\_\*) i logów serii (set logs)
- Nawigację między ćwiczeniami (next/previous/skip)
- Kontrolę sesji (pause/resume)
- Automatyczne zapisywanie stanu przy każdej akcji
- Synchronizację timera z backendem
- Wskaźnik statusu autosave

Widok jest zoptymalizowany pod urządzenia mobilne z dużymi przyciskami nawigacji i przewijalnym formularzem. Wszystkie komponenty są Client Components ze względu na interaktywność i zarządzanie stanem w czasie rzeczywistym.

## 2. Routing widoku

**Ścieżka**: `/workout-sessions/[id]/active`

**Struktura plików**:

- `src/app/workout-sessions/[id]/active/page.tsx` - Server Component do pobrania danych sesji
- `src/app/workout-sessions/[id]/active/layout.tsx` - Layout bez nawigacji głównej (opcjonalnie)

**Logika routingu**:

- Parametr `[id]` to UUID sesji treningowej
- Server Component pobiera dane sesji przez `GET /api/workout-sessions/[id]`
- Jeśli sesja nie istnieje lub nie należy do użytkowniczki, przekierowanie do listy sesji z komunikatem błędu
- Jeśli sesja ma status `completed`, opcjonalnie przekierowanie do widoku szczegółów sesji z komunikatem
- Jeśli sesja ma status `in_progress`, wyświetlenie widoku asystenta

## 3. Struktura komponentów

```
WorkoutSessionAssistant (Client Component)
├── ExitSessionButton (Client Component)
├── AutosaveIndicator (Client Component)
├── WorkoutTimer (Client Component)
│   ├── TimerDisplay (wewnętrzny)
│   └── RestTimerDisplay (wewnętrzny)
├── CurrentExerciseInfo (Client Component)
│   ├── ExerciseTitle
│   ├── ExerciseMetadata (type, part)
│   └── PlannedParamsDisplay
├── ExerciseExecutionForm (Client Component)
│   ├── ActualParamsFields
│   ├── SetLogsList (Client Component)
│   │   ├── SetLogItem (Client Component) [powtarzalny]
│   │   └── AddSetButton
│   └── SkipExerciseCheckbox
└── NavigationButtons (Client Component)
    ├── PreviousButton
    ├── PauseButton
    ├── SkipButton
    └── NextButton
```

## 4. Szczegóły komponentów

### WorkoutSessionAssistant (Client Component)

**Opis komponentu**: Główny komponent asystenta odpowiedzialny za zarządzanie stanem sesji, synchronizację z API, obsługę nawigacji między ćwiczeniami oraz koordynację wszystkich podkomponentów.

**Główne elementy**:

- Kontener pełnoekranowy (`<div className="fixed inset-0">`)
- `ExitSessionButton` - przycisk wyjścia w lewym górnym rogu
- `AutosaveIndicator` - wskaźnik statusu zapisu w prawym górnym rogu
- `WorkoutTimer` - duży zegar na górze ekranu, skorzystaj z react-countdown-circle-timer
- `CurrentExerciseInfo` - informacje o bieżącym ćwiczeniu
- `ExerciseExecutionForm` - formularz wprowadzania danych
- `NavigationButtons` - duże przyciski nawigacji na dole ekranu
- Scrollable container dla formularza (mobile-first)

**Obsługiwane zdarzenia**:

- `onMount` - pobranie danych sesji i inicjalizacja timera
- `onUnmount` - zapisanie stanu przed opuszczeniem (opcjonalnie)
- `onExerciseChange` - przejście do innego ćwiczenia (previous/next)
- `onSave` - zapis stanu ćwiczenia (next/pause/skip)
- `onPause` - pauza sesji i zapis stanu
- `onResume` - wznowienie sesji
- `onSkip` - pominięcie ćwiczenia i przejście dalej
- `onExit` - wyjście z sesji z potwierdzeniem

**Obsługiwana walidacja**:

- Walidacja przed zapisem (next): sprawdzenie, czy wszystkie set logs mają co najmniej jedną metrykę (reps/duration/weight) i wartości >= 0
- Walidacja przed skip: brak wymagań (skip może być wykonany z pustymi set logs)
- Walidacja przed pause: brak wymagań (pause zapisuje aktualny stan niezależnie od walidacji)

**Typy**:

- Props: `{ sessionId: string; initialSession: SessionDetailDTO }`
- Stan lokalny: `{ currentExerciseIndex: number; isPaused: boolean; formData: ExerciseFormData }`
- Używa: `SessionDetailDTO`, `SessionExerciseDTO`, `SessionExerciseSetDTO`, `SessionExerciseAutosaveCommand`, `SessionExerciseAutosaveResponse`

**Props**:

- `sessionId: string` - UUID sesji treningowej
- `initialSession: SessionDetailDTO` - początkowe dane sesji pobrane przez Server Component

### WorkoutTimer (Client Component)

**Opis komponentu**: Duży zegar wyświetlający timer globalny sesji, odliczanie przerwy oraz status sesji. Zegar jest widoczny z odległości 1,5m, z największymi sekundami.

**Główne elementy**:

- Kontener z dużym tekstem (min. 4rem na mobile, 6rem na desktop)
- Wyświetlanie: "Ćwiczenie [nazwa] Seria [numer]" jako nagłówek
- Duże sekundy (timer globalny lub odliczanie przerwy)
- Mniejszy tekst: suma długości treningu (timer globalny)
- Status sesji: "W trakcie" / "Pauza"
- Numer bieżącego ćwiczenia: "Ćwiczenie X z Y"
- Wizualna animacja pulsowania gdy sesja aktywna (CSS animation)

**Obsługiwane zdarzenia**:

- `onMount` - inicjalizacja timera na podstawie `started_at` z sesji
- `onPause` - zatrzymanie timera
- `onResume` - wznowienie timera od zatrzymanego czasu
- `onRestStart` - rozpoczęcie odliczania przerwy (od 0)
- `onRestEnd` - zakończenie odliczania przerwy, powrót do timera globalnego
- `useEffect` z `setInterval` dla aktualizacji co sekundę

**Obsługiwana walidacja**:

- Brak walidacji (komponent tylko wyświetlający)

**Typy**:

- Props: `{ startedAt: string; isPaused: boolean; currentExerciseName: string; currentSetNumber: number; currentExerciseIndex: number; totalExercises: number; restSeconds?: number }`
- Stan lokalny: `{ elapsedSeconds: number; restSecondsRemaining?: number }`

**Props**:

- `startedAt: string` - ISO timestamp rozpoczęcia sesji
- `isPaused: boolean` - czy sesja jest w pauzie
- `currentExerciseName: string` - nazwa bieżącego ćwiczenia
- `currentSetNumber: number` - numer bieżącej serii (domyślnie 1)
- `currentExerciseIndex: number` - indeks bieżącego ćwiczenia (0-based)
- `totalExercises: number` - całkowita liczba ćwiczeń w sesji
- `restSeconds?: number` - opcjonalna liczba sekund przerwy do odliczania

### CurrentExerciseInfo (Client Component)

**Opis komponentu**: Komponent wyświetlający informacje o bieżącym ćwiczeniu: tytuł, typ, partię oraz parametry planowane (planned\_\*).

**Główne elementy**:

- `<h2>` z tytułem ćwiczenia (`title`)
- Badge z typem ćwiczenia (`type`: Warm-up | Main Workout | Cool-down)
- Badge z partią (`part`: Legs | Core | Back | Arms | Chest)
- Sekcja z parametrami planowanymi:
  - `planned_sets` (liczba serii)
  - `planned_reps` (powtórzenia per seria)
  - `planned_duration_seconds` (czas trwania per seria)
  - `planned_rest_seconds` (czas przerwy)

**Obsługiwane zdarzenia**:

- Brak (komponent tylko wyświetlający)

**Obsługiwana walidacja**:

- Brak walidacji

**Typy**:

- Props: `{ exercise: SessionExerciseDTO }`
- Używa: `SessionExerciseDTO`

**Props**:

- `exercise: SessionExerciseDTO` - dane bieżącego ćwiczenia z sesji

### ExerciseExecutionForm (Client Component)

**Opis komponentu**: Formularz wprowadzania faktycznego wykonania ćwiczenia. Zawiera pola actual\_\*, listę set logs oraz checkbox do pominięcia ćwiczenia.

**Główne elementy**:

- Pola actual\_\* (opcjonalne, obliczane automatycznie z set logs, ale możliwe do ręcznej edycji):
  - `actual_count_sets` (Input, number)
  - `actual_sum_reps` (Input, number)
  - `actual_duration_seconds` (Input, number)
  - `actual_rest_seconds` (Input, number)
- `SetLogsList` - lista serii z możliwością dodawania/edycji/usuwania
- Checkbox "Pomiń ćwiczenie" (`is_skipped`)
- Komunikaty błędów walidacji inline

**Obsługiwane zdarzenia**:

- `onChange` - aktualizacja stanu formularza
- `onSetAdd` - dodanie nowej serii
- `onSetUpdate` - aktualizacja istniejącej serii
- `onSetRemove` - usunięcie serii
- `onSkipToggle` - przełączenie checkboxa skip

**Obsługiwana walidacja**:

- Walidacja set logs: każda seria musi mieć co najmniej jedną metrykę (reps/duration/weight) z wartością >= 0
- Walidacja wartości: wszystkie wartości numeryczne muszą być >= 0
- Walidacja przed zapisem (next): jeśli `is_skipped` jest false, wymagane jest co najmniej jedna seria z co najmniej jedną metryką
- Jeśli `is_skipped` jest true, walidacja jest pomijana (skip może być wykonany z pustymi set logs)

**Typy**:

- Props: `{ exercise: SessionExerciseDTO; onChange: (data: ExerciseFormData) => void; errors?: FormErrors }`
- Stan lokalny: `ExerciseFormData` (ViewModel)
- Używa: `SessionExerciseDTO`, `SessionExerciseSetDTO`, `SessionExerciseSetCommand`

**Props**:

- `exercise: SessionExerciseDTO` - dane bieżącego ćwiczenia
- `onChange: (data: ExerciseFormData) => void` - callback przy zmianie danych formularza
- `errors?: FormErrors` - opcjonalne błędy walidacji do wyświetlenia

### SetLogsList (Client Component)

**Opis komponentu**: Lista serii ćwiczenia z możliwością dodawania, edycji i usuwania. Każda seria reprezentowana jest przez `SetLogItem`.

**Główne elementy**:

- Kontener listy (`<div>` lub `<ul>`)
- `SetLogItem` [powtarzalny] - pojedyncza seria
- `AddSetButton` - przycisk dodania nowej serii
- Komunikaty błędów walidacji dla poszczególnych serii

**Obsługiwane zdarzenia**:

- `onAdd` - dodanie nowej serii (automatycznie z `set_number` = następny numer)
- `onUpdate` - aktualizacja istniejącej serii
- `onRemove` - usunięcie serii

**Obsługiwana walidacja**:

- Walidacja per seria (delegowana do `SetLogItem`): co najmniej jedna metryka (reps/duration/weight) z wartością >= 0

**Typy**:

- Props: `{ sets: SessionExerciseSetDTO[]; onAdd: () => void; onUpdate: (index: number, set: SessionExerciseSetCommand) => void; onRemove: (index: number) => void; errors?: Record<number, string> }`
- Używa: `SessionExerciseSetDTO`, `SessionExerciseSetCommand`

**Props**:

- `sets: SessionExerciseSetDTO[]` - tablica serii
- `onAdd: () => void` - callback dodania serii
- `onUpdate: (index: number, set: SessionExerciseSetCommand) => void` - callback aktualizacji serii
- `onRemove: (index: number) => void` - callback usunięcia serii
- `errors?: Record<number, string>` - opcjonalne błędy walidacji per seria (klucz: index serii)

### SetLogItem (Client Component)

**Opis komponentu**: Pojedyncza seria ćwiczenia z polami: set_number, reps, duration_seconds, weight_kg.

**Główne elementy**:

- Kontener serii (Card lub div z border)
- Wyświetlanie `set_number` (read-only lub badge)
- Input dla `reps` (number, opcjonalny)
- Input dla `duration_seconds` (number, opcjonalny)
- Input dla `weight_kg` (number, opcjonalny)
- Przycisk usunięcia serii (ikona X)
- Komunikat błędu walidacji (jeśli istnieje)

**Obsługiwane zdarzenia**:

- `onChange` - aktualizacja wartości serii
- `onRemove` - usunięcie serii

**Obsługiwana walidacja**:

- Co najmniej jedna metryka (reps/duration/weight) musi mieć wartość >= 0
- Wszystkie wartości muszą być >= 0 (jeśli podane)
- Walidacja inline przy zmianie wartości

**Typy**:

- Props: `{ set: SessionExerciseSetDTO; onChange: (set: SessionExerciseSetCommand) => void; onRemove: () => void; error?: string }`
- Używa: `SessionExerciseSetDTO`, `SessionExerciseSetCommand`

**Props**:

- `set: SessionExerciseSetDTO` - dane serii
- `onChange: (set: SessionExerciseSetCommand) => void` - callback przy zmianie wartości
- `onRemove: () => void` - callback usunięcia serii
- `error?: string` - opcjonalny komunikat błędu walidacji

### NavigationButtons (Client Component)

**Opis komponentu**: Duże przyciski nawigacji dostosowane do użycia jedną ręką. Zawiera: Previous, Pause, Skip, Next.

**Główne elementy**:

- Kontener z grid layout (2x2 na mobile, 4x1 na desktop)
- `PreviousButton` - poprzednie ćwiczenie (disabled na pierwszym ćwiczeniu)
- `PauseButton` - pauza/wznowienie (toggle)
- `SkipButton` - pominięcie ćwiczenia
- `NextButton` - następne ćwiczenie (disabled przy nieprzechodzącej walidacji, chyba że skipowane)

**Obsługiwane zdarzenia**:

- `onPrevious` - przejście do poprzedniego ćwiczenia (bez zapisu)
- `onPause` - pauza sesji i zapis stanu
- `onResume` - wznowienie sesji
- `onSkip` - pominięcie ćwiczenia i przejście dalej (z zapisem)
- `onNext` - zapis stanu i przejście do następnego ćwiczenia

**Obsługiwana walidacja**:

- `PreviousButton`: disabled jeśli `currentExerciseIndex === 0`
- `NextButton`: disabled jeśli walidacja nie przechodzi i `is_skipped === false`
- `SkipButton`: zawsze enabled (skip może być wykonany z pustymi set logs)

**Typy**:

- Props: `{ onPrevious: () => void; onPause: () => void; onResume: () => void; onSkip: () => void; onNext: () => void; isPaused: boolean; canGoPrevious: boolean; canGoNext: boolean; isLoading?: boolean }`
- Używa: brak (tylko callbacks)

**Props**:

- `onPrevious: () => void` - callback poprzedniego ćwiczenia
- `onPause: () => void` - callback pauzy
- `onResume: () => void` - callback wznowienia
- `onSkip: () => void` - callback pominięcia
- `onNext: () => void` - callback następnego ćwiczenia
- `isPaused: boolean` - czy sesja jest w pauzie
- `canGoPrevious: boolean` - czy można przejść do poprzedniego ćwiczenia
- `canGoNext: boolean` - czy można przejść do następnego ćwiczenia (walidacja)
- `isLoading?: boolean` - opcjonalny stan ładowania (dla disable przycisków podczas zapisu)

### AutosaveIndicator (Client Component)

**Opis komponentu**: Wskaźnik statusu autosave w prawym górnym rogu ekranu. Wyświetla ikonę zapisu z animacją podczas zapisywania oraz status tekstowy.

**Główne elementy**:

- Kontener fixed position (prawy górny róg)
- Ikona zapisu (CheckCircle, Loader2, AlertCircle z lucide-react)
- Tekst statusu: "Zapisano", "Zapisywanie...", "Błąd zapisu"
- Animacja pulsowania podczas zapisywania (CSS animation)

**Obsługiwane zdarzenia**:

- Brak (komponent tylko wyświetlający, aktualizowany przez props)

**Obsługiwana walidacja**:

- Brak walidacji

**Typy**:

- Props: `{ status: 'idle' | 'saving' | 'saved' | 'error'; errorMessage?: string }`
- Używa: brak

**Props**:

- `status: 'idle' | 'saving' | 'saved' | 'error'` - status autosave
- `errorMessage?: string` - opcjonalny komunikat błędu

### ExitSessionButton (Client Component)

**Opis komponentu**: Przycisk wyjścia z sesji w lewym górnym rogu. Wyświetla dialog potwierdzenia przed wyjściem.

**Główne elementy**:

- Przycisk fixed position (lewy górny róg)
- Ikona X lub "Wyjdź"
- `AlertDialog` (shadcn/ui) z potwierdzeniem wyjścia
- Po potwierdzeniu: przekierowanie do listy sesji (sesja pozostaje `in_progress`)

**Obsługiwane zdarzenia**:

- `onClick` - otwarcie dialogu potwierdzenia
- `onConfirm` - potwierdzenie wyjścia i przekierowanie
- `onCancel` - anulowanie wyjścia

**Obsługiwana walidacja**:

- Brak walidacji (tylko potwierdzenie użytkowniczki)

**Typy**:

- Props: `{ onExit: () => void }`
- Używa: `AlertDialog` z shadcn/ui

**Props**:

- `onExit: () => void` - callback wyjścia z sesji (przekierowanie)

## 5. Typy

### Typy DTO (z `src/types.ts`)

**SessionDetailDTO**:

```typescript
type SessionDetailDTO = SessionSummaryDTO & {
  exercises: SessionExerciseDTO[];
};

type SessionSummaryDTO = Omit<
  WorkoutSessionEntity,
  "user_id" | "last_action_at"
>;
```

**SessionExerciseDTO**:

```typescript
type SessionExerciseDTO = Omit<
  WorkoutSessionExerciseEntity,
  "session_id" | "created_at" | "updated_at" | "actual_sets" | "actual_reps"
> & {
  actual_count_sets: number | null; // Liczba wykonanych serii
  actual_sum_reps: number | null; // Suma reps ze wszystkich serii
  sets: SessionExerciseSetDTO[];
};
```

**SessionExerciseSetDTO**:

```typescript
type SessionExerciseSetDTO = Omit<
  WorkoutSessionSetEntity,
  "session_exercise_id" | "created_at" | "updated_at"
>;
```

**SessionExerciseAutosaveCommand**:

```typescript
type SessionExerciseAutosaveCommand = {
  actual_count_sets?: number | null;
  actual_sum_reps?: number | null;
  actual_duration_seconds?: number | null;
  actual_rest_seconds?: number | null;
  planned_sets?: number | null;
  planned_reps?: number | null;
  planned_duration_seconds?: number | null;
  planned_rest_seconds?: number | null;
  is_skipped?: boolean;
  sets?: SessionExerciseSetCommand[];
  advance_cursor_to_next?: boolean;
};
```

**SessionExerciseSetCommand**:

```typescript
type SessionExerciseSetCommand = Pick<
  TablesInsert<"workout_session_sets">,
  "set_number" | "reps" | "duration_seconds" | "weight_kg"
>;
```

**SessionExerciseAutosaveResponse**:

```typescript
type SessionExerciseAutosaveResponse = SessionExerciseDTO & {
  cursor: {
    current_position: number;
    last_action_at: string;
  };
```

### Typy ViewModel (nowe, do utworzenia)

**ExerciseFormData** (ViewModel dla formularza wykonania ćwiczenia):

```typescript
type ExerciseFormData = {
  actual_count_sets: number | null;
  actual_sum_reps: number | null;
  actual_duration_seconds: number | null;
  actual_rest_seconds: number | null;
  sets: SetLogFormData[];
  is_skipped: boolean;
};

type SetLogFormData = {
  set_number: number;
  reps: number | null;
  duration_seconds: number | null;
  weight_kg: number | null;
};
```

**FormErrors** (błędy walidacji formularza):

```typescript
type FormErrors = {
  actual_count_sets?: string;
  actual_sum_reps?: string;
  actual_duration_seconds?: string;
  actual_rest_seconds?: string;
  sets?: Record<number, string>; // klucz: index serii, wartość: komunikat błędu
  _form?: string[]; // błędy globalne
};
```

**AutosaveStatus** (status autosave):

```typescript
type AutosaveStatus = "idle" | "saving" | "saved" | "error";
```

**WorkoutSessionAssistantState** (stan głównego komponentu):

```typescript
type WorkoutSessionAssistantState = {
  session: SessionDetailDTO;
  currentExerciseIndex: number;
  isPaused: boolean;
  formData: ExerciseFormData;
  autosaveStatus: AutosaveStatus;
  autosaveError?: string;
};
```

## 6. Zarządzanie stanem

### Zustand Store (opcjonalnie, do rozważenia)

Jeśli wymagane jest globalne zarządzanie stanem sesji (dostęp z innych widoków), można utworzyć Zustand store:

**useWorkoutSessionStore**:

```typescript
type WorkoutSessionStore = {
  currentSession: {
    id: string;
    status: WorkoutSessionStatus;
    current_position: number;
    started_at: string;
  } | null;
  setCurrentSession: (session: SessionDetailDTO) => void;
  updateCurrentPosition: (position: number) => void;
  clearCurrentSession: () => void;
};
```

**Uwaga**: W MVP widok asystenta może działać bez globalnego store, używając lokalnego stanu w `WorkoutSessionAssistant`. Store jest przydatny, jeśli inne widoki (np. lista sesji) muszą wyświetlać status `in_progress` w czasie rzeczywistym.

### Lokalny stan w komponencie

Główny komponent `WorkoutSessionAssistant` zarządza stanem lokalnie:

- `session: SessionDetailDTO` - dane sesji (synchronizowane z API)
- `currentExerciseIndex: number` - indeks bieżącego ćwiczenia (0-based)
- `isPaused: boolean` - czy sesja jest w pauzie
- `formData: ExerciseFormData` - dane formularza bieżącego ćwiczenia
- `autosaveStatus: AutosaveStatus` - status autosave
- `autosaveError?: string` - opcjonalny komunikat błędu autosave

### Synchronizacja z API

Stan jest synchronizowany z API przy każdej akcji:

- `next` - `PATCH /api/workout-sessions/[id]/exercises/[order]` z `advance_cursor_to_next: true`
- `previous` - tylko lokalna zmiana `currentExerciseIndex` (bez zapisu)
- `pause` - `PATCH /api/workout-sessions/[id]/status` + `PATCH /api/workout-sessions/[id]/exercises/[order]`
- `skip` - `PATCH /api/workout-sessions/[id]/exercises/[order]` z `is_skipped: true` i `advance_cursor_to_next: true`
- `resume` - `PATCH /api/workout-sessions/[id]/status` z `status: 'in_progress'`

### Custom Hook (opcjonalnie)

Można utworzyć custom hook `useWorkoutSessionAssistant` do zarządzania logiką asystenta:

```typescript
function useWorkoutSessionAssistant(
  sessionId: string,
  initialSession: SessionDetailDTO
) {
  // Stan, logika zapisu, nawigacji, timera, etc.
  return {
    session,
    currentExercise,
    formData,
    autosaveStatus,
    handleNext,
    handlePrevious,
    handlePause,
    handleResume,
    handleSkip,
    // ...
  };
}
```

## 7. Integracja API

### GET /api/workout-sessions/[id]

**Cel**: Pobranie szczegółów sesji z ćwiczeniami i seriami.

**Użycie**: Server Component w `page.tsx` przed renderowaniem widoku.

**Typy**:

- Request: brak (tylko parametr ścieżki `id`)
- Response: `SessionDetailDTO`

**Obsługa błędów**:

- `404` - sesja nie znaleziona lub nie należy do użytkowniczki → przekierowanie do listy sesji
- `401/403` - brak autoryzacji → przekierowanie do logowania
- `500` - błąd serwera → wyświetlenie komunikatu błędu

### PATCH /api/workout-sessions/[id]/status

**Cel**: Aktualizacja statusu sesji (pause/resume/completed).

**Użycie**: Przy akcji pause/resume w `WorkoutSessionAssistant`.

**Typy**:

- Request: `SessionStatusUpdateCommand` (`{ status: 'in_progress' | 'completed' }`)
- Response: `SessionSummaryDTO`

**Obsługa błędów**:

- `400` - nieprawidłowe dane → wyświetlenie komunikatu błędu
- `404` - sesja nie znaleziona → wyświetlenie komunikatu błędu
- `409` - konflikt (np. inna sesja in_progress) → wyświetlenie komunikatu błędu
- `401/403` - brak autoryzacji → przekierowanie do logowania
- `500` - błąd serwera → wyświetlenie komunikatu błędu, retry

### PATCH /api/workout-sessions/[id]/exercises/[order]

**Cel**: Zapis stanu ćwiczenia (autosave przy next/pause/skip).

**Użycie**: Przy akcjach next, pause, skip w `WorkoutSessionAssistant`.

**Typy**:

- Request: `SessionExerciseAutosaveCommand`
- Response: `{ data: SessionExerciseAutosaveResponse }`

**Obsługa błędów**:

- `400` - walidacja nie przeszła → wyświetlenie błędów inline w formularzu
- `404` - sesja/ćwiczenie nie znalezione → wyświetlenie komunikatu błędu
- `409` - sesja nie jest `in_progress` → wyświetlenie komunikatu błędu
- `401/403` - brak autoryzacji → przekierowanie do logowania
- `500` - błąd serwera → wyświetlenie komunikatu błędu, retry z zachowaniem danych

**Ważne**:

- Przy `next`: `advance_cursor_to_next: true` → API aktualizuje `current_position` i zwraca nowy cursor
- Przy `pause`: `advance_cursor_to_next: false` → API nie aktualizuje `current_position`
- Przy `skip`: `is_skipped: true` i `advance_cursor_to_next: true` → API oznacza ćwiczenie jako pominięte i przesuwa cursor

## 8. Interakcje użytkownika

### Rozpoczęcie sesji

1. Użytkowniczka klika "Start" na liście planów lub szczegółach planu
2. Aplikacja tworzy sesję przez `POST /api/workout-sessions` (lub wznawia istniejącą `in_progress`)
3. Przekierowanie do `/workout-sessions/[id]/active`
4. Server Component pobiera dane sesji przez `GET /api/workout-sessions/[id]`
5. Renderowanie widoku asystenta z pierwszym ćwiczeniem (lub ostatnim aktywnym, jeśli wznowienie)

### Nawigacja next

1. Użytkowniczka wypełnia formularz (actual\_\* i set logs)
2. Kliknięcie "Next"
3. Walidacja formularza (chyba że `is_skipped === true`)
4. Jeśli walidacja nie przechodzi: wyświetlenie błędów inline, przycisk "Next" disabled
5. Jeśli walidacja przechodzi:
   - Ustawienie `autosaveStatus: 'saving'`
   - Wywołanie `PATCH /api/workout-sessions/[id]/exercises/[order]` z `advance_cursor_to_next: true`
   - Jeśli sukces:
     - Aktualizacja stanu sesji z odpowiedzi (nowy cursor)
     - Przejście do następnego ćwiczenia (`currentExerciseIndex++`)
     - Reset formularza do danych nowego ćwiczenia
     - Ustawienie `autosaveStatus: 'saved'`
   - Jeśli błąd:
     - Wyświetlenie komunikatu błędu
     - Ustawienie `autosaveStatus: 'error'`
     - Dane pozostają w formularzu (nie znikają)

### Nawigacja previous

1. Kliknięcie "Previous"
2. Jeśli `currentExerciseIndex > 0`:
   - Zmniejszenie `currentExerciseIndex--`
   - Załadowanie danych poprzedniego ćwiczenia do formularza
   - Brak zapisu (previous nie zapisuje stanu)

### Pauza sesji

1. Kliknięcie "Pause"
2. Ustawienie `autosaveStatus: 'saving'`
3. Zapis stanu bieżącego ćwiczenia przez `PATCH /api/workout-sessions/[id]/exercises/[order]` (bez `advance_cursor_to_next`)
4. Aktualizacja statusu sesji przez `PATCH /api/workout-sessions/[id]/status` z `status: 'in_progress'` (zachowanie statusu, ale zatrzymanie timera lokalnie)
5. Ustawienie `isPaused: true`
6. Zatrzymanie timera
7. Ustawienie `autosaveStatus: 'saved'`

### Wznowienie sesji

1. Kliknięcie "Resume" (ten sam przycisk co Pause, zmienia się na Resume)
2. Aktualizacja statusu sesji przez `PATCH /api/workout-sessions/[id]/status` z `status: 'in_progress'`
3. Ustawienie `isPaused: false`
4. Wznowienie timera od zatrzymanego czasu

### Pominięcie ćwiczenia

1. Zaznaczenie checkboxa "Pomiń ćwiczenie" lub kliknięcie "Skip"
2. Jeśli kliknięcie "Skip":
   - Ustawienie `is_skipped: true` w formularzu
   - Ustawienie `autosaveStatus: 'saving'`
   - Wywołanie `PATCH /api/workout-sessions/[id]/exercises/[order]` z `is_skipped: true` i `advance_cursor_to_next: true`
   - Jeśli sukces:
     - Aktualizacja stanu sesji
     - Przejście do następnego ćwiczenia
     - Reset formularza
     - Ustawienie `autosaveStatus: 'saved'`
   - Jeśli błąd: wyświetlenie komunikatu błędu

### Wyjście z sesji

1. Kliknięcie "Wyjdź z treningu"
2. Otwarcie `AlertDialog` z potwierdzeniem
3. Jeśli potwierdzenie:
   - Opcjonalnie: zapis stanu bieżącego ćwiczenia (jeśli są niezapisane zmiany)
   - Przekierowanie do listy sesji (`/workout-sessions`)
   - Sesja pozostaje `in_progress` (możliwość wznowienia później)

### Zakończenie sesji

1. Po przejściu przez ostatnie ćwiczenie i kliknięciu "Next"
2. Zapis stanu ostatniego ćwiczenia
3. Aktualizacja statusu sesji przez `PATCH /api/workout-sessions/[id]/status` z `status: 'completed'`
4. Przekierowanie do widoku szczegółów sesji (`/workout-sessions/[id]`) z komunikatem sukcesu

## 9. Warunki i walidacja

### Walidacja po stronie klienta (przed wysłaniem do API)

**Walidacja set logs**:

- Każda seria musi mieć co najmniej jedną metrykę (reps/duration/weight) z wartością >= 0
- Wszystkie wartości numeryczne muszą być >= 0 (jeśli podane)
- Walidacja inline przy zmianie wartości (onChange/onBlur)

**Walidacja przed next**:

- Jeśli `is_skipped === false`:
  - Wymagane jest co najmniej jedna seria z co najmniej jedną metryką
  - Wszystkie serie muszą przechodzić walidację (co najmniej jedna metryka >= 0)
- Jeśli `is_skipped === true`:
  - Walidacja jest pomijana (skip może być wykonany z pustymi set logs)

**Walidacja przed pause**:

- Brak wymagań (pause zapisuje aktualny stan niezależnie od walidacji)

**Walidacja przed skip**:

- Brak wymagań (skip może być wykonany z pustymi set logs)

### Warunki wyświetlania i zachowania UI

**PreviousButton**:

- Disabled jeśli `currentExerciseIndex === 0` (pierwsze ćwiczenie)

**NextButton**:

- Disabled jeśli:
  - Walidacja nie przechodzi i `is_skipped === false`
  - `isLoading === true` (zapis w toku)
- Enabled jeśli:
  - Walidacja przechodzi
  - `is_skipped === true` (skip pomija walidację)

**PauseButton**:

- Tekst/ikona zmienia się na "Resume" gdy `isPaused === true`
- Zawsze enabled (pause można wykonać w dowolnym momencie)

**SkipButton**:

- Zawsze enabled (skip może być wykonany z pustymi set logs)

**WorkoutTimer**:

- Wyświetla timer globalny gdy `restSeconds === undefined`
- Wyświetla odliczanie przerwy gdy `restSeconds !== undefined`
- Animacja pulsowania gdy `isPaused === false`

**AutosaveIndicator**:

- "Zapisano" gdy `autosaveStatus === 'saved'`
- "Zapisywanie..." gdy `autosaveStatus === 'saving'` (z animacją)
- "Błąd zapisu" gdy `autosaveStatus === 'error'` (z komunikatem błędu)

### Warunki API (weryfikowane przez backend)

**PATCH /api/workout-sessions/[id]/exercises/[order]**:

- `order > 0` (walidacja po stronie API)
- Ćwiczenie musi istnieć w sesji (walidacja po stronie API)
- Każda seria musi mieć co najmniej jedną metrykę z wartością >= 0 (walidacja po stronie API)
- Sesja musi mieć status `in_progress` (409 jeśli nie)

**PATCH /api/workout-sessions/[id]/status**:

- Przejście stanu musi być poprawne (walidacja po stronie API)
- Użytkownik może mieć tylko jedną sesję `in_progress` jednocześnie (409 jeśli konflikt)

## 10. Obsługa błędów

### Błędy sieciowe

**Scenariusz**: Błąd połączenia podczas zapisu (next/pause/skip).

**Obsługa**:

1. Wyświetlenie komunikatu błędu w `AutosaveIndicator` (`status: 'error'`)
2. Dane pozostają w formularzu (nie znikają)
3. Możliwość retry (ponowne kliknięcie next/pause/skip)
4. Toast notification z komunikatem: "Błąd zapisu. Sprawdź połączenie i spróbuj ponownie."

### Błędy walidacji API

**Scenariusz**: API zwraca `400` z błędami walidacji.

**Obsługa**:

1. Mapowanie błędów API na `FormErrors`
2. Wyświetlenie błędów inline w formularzu (przy polach i seriach)
3. `NextButton` pozostaje disabled do czasu poprawy błędów
4. Toast notification z komunikatem: "Popraw błędy w formularzu przed zapisem."

### Błędy autoryzacji

**Scenariusz**: `401/403` - brak autoryzacji lub sesja nie należy do użytkowniczki.

**Obsługa**:

1. Przekierowanie do logowania (`/login`)
2. Toast notification z komunikatem: "Sesja wygasła. Zaloguj się ponownie."

### Błędy konfliktu

**Scenariusz**: `409` - sesja nie jest `in_progress` lub inna sesja jest `in_progress`.

**Obsługa**:

1. Wyświetlenie komunikatu błędu w `AutosaveIndicator`
2. Toast notification z komunikatem: "Sesja nie jest aktywna. Odśwież stronę lub wznów sesję."
3. Opcjonalnie: automatyczne odświeżenie danych sesji przez `GET /api/workout-sessions/[id]`

### Błędy nieznalezienia

**Scenariusz**: `404` - sesja lub ćwiczenie nie znalezione.

**Obsługa**:

1. Wyświetlenie komunikatu błędu
2. Przekierowanie do listy sesji z komunikatem: "Sesja nie została znaleziona."

### Błędy serwera

**Scenariusz**: `500` - błąd serwera.

**Obsługa**:

1. Wyświetlenie komunikatu błędu w `AutosaveIndicator`
2. Toast notification z komunikatem: "Błąd serwera. Spróbuj ponownie za chwilę."
3. Możliwość retry z zachowaniem danych w formularzu

### Przerwanie połączenia

**Scenariusz**: Utrata połączenia internetowego podczas sesji.

**Obsługa**:

1. Wykrycie utraty połączenia (event `online`/`offline`)
2. Wyświetlenie komunikatu: "Brak połączenia. Dane zostaną zapisane po przywróceniu połączenia."
3. Queue zapisów do wykonania po przywróceniu połączenia (opcjonalnie, dla MVP można pominąć)
4. Przy przywróceniu połączenia: automatyczny retry ostatniego zapisu

### Edge cases

**Scenariusz**: Użytkowniczka opuszcza stronę podczas zapisu.

**Obsługa**:

1. Event `beforeunload` z potwierdzeniem: "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?"
2. Jeśli potwierdzenie: opuszczenie strony (sesja pozostaje `in_progress`, dane mogą być częściowo zapisane)

**Scenariusz**: Sesja została zakończona przez inny klient/urządzenie.

**Obsługa**:

1. Przy próbie zapisu: `409` - sesja nie jest `in_progress`
2. Wyświetlenie komunikatu: "Sesja została zakończona. Odśwież stronę."
3. Opcjonalnie: automatyczne odświeżenie danych sesji

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików i typów

1. Utworzenie pliku `src/app/workout-sessions/[id]/active/page.tsx` (Server Component)
2. Utworzenie pliku `src/types/workout-session-assistant.ts` z typami ViewModel:
   - `ExerciseFormData`
   - `SetLogFormData`
   - `FormErrors`
   - `AutosaveStatus`
   - `WorkoutSessionAssistantState`
3. Utworzenie folderu `src/components/workout-sessions/assistant/` dla komponentów asystenta

### Krok 2: Implementacja Server Component (page.tsx)

1. Pobranie danych sesji przez `GET /api/workout-sessions/[id]`
2. Obsługa błędów (404, 401/403) z przekierowaniem
3. Walidacja statusu sesji (tylko `in_progress` może używać asystenta)
4. Renderowanie `WorkoutSessionAssistant` z `initialSession`

### Krok 3: Implementacja WorkoutTimer

1. Utworzenie `src/components/workout-sessions/assistant/workout-timer.tsx`
2. Implementacja timera globalnego (obliczanie `elapsedSeconds` z `startedAt`)
3. Implementacja odliczania przerwy (od 0 do `restSeconds`)
4. Wyświetlanie statusu sesji i numeru ćwiczenia
5. Animacja pulsowania (CSS)
6. Obsługa pause/resume timera

### Krok 4: Implementacja CurrentExerciseInfo

1. Utworzenie `src/components/workout-sessions/assistant/current-exercise-info.tsx`
2. Wyświetlanie tytułu, typu, partii ćwiczenia
3. Wyświetlanie parametrów planowanych (planned\_\*)
4. Stylowanie z użyciem Badge (shadcn/ui) dla type i part

### Krok 5: Implementacja SetLogItem i SetLogsList

1. Utworzenie `src/components/workout-sessions/assistant/set-log-item.tsx`
2. Implementacja pól: set_number (read-only), reps, duration_seconds, weight_kg
3. Walidacja inline: co najmniej jedna metryka >= 0
4. Przycisk usunięcia serii
5. Utworzenie `src/components/workout-sessions/assistant/set-logs-list.tsx`
6. Renderowanie listy `SetLogItem`
7. Przycisk "Dodaj serię" z automatycznym `set_number`
8. Obsługa dodawania/aktualizacji/usuwania serii

### Krok 6: Implementacja ExerciseExecutionForm

1. Utworzenie `src/components/workout-sessions/assistant/exercise-execution-form.tsx`
2. Implementacja pól actual\_\* (opcjonalne, obliczane z set logs, ale możliwe do ręcznej edycji)
3. Integracja `SetLogsList`
4. Checkbox "Pomiń ćwiczenie" (`is_skipped`)
5. Walidacja formularza: set logs wymagają co najmniej jednej metryki (chyba że skip)
6. Komunikaty błędów inline
7. Callback `onChange` do przekazania danych do rodzica

### Krok 7: Implementacja NavigationButtons

1. Utworzenie `src/components/workout-sessions/assistant/navigation-buttons.tsx`
2. Implementacja przycisków: Previous, Pause/Resume, Skip, Next
3. Logika disabled dla Previous (pierwsze ćwiczenie) i Next (walidacja)
4. Duże przyciski dostosowane do użycia jedną ręką (mobile-first)
5. Grid layout (2x2 na mobile, 4x1 na desktop)

### Krok 8: Implementacja AutosaveIndicator

1. Utworzenie `src/components/workout-sessions/assistant/autosave-indicator.tsx`
2. Wyświetlanie ikony i statusu tekstowego
3. Animacja pulsowania podczas zapisywania
4. Fixed position (prawy górny róg)

### Krok 9: Implementacja ExitSessionButton

1. Utworzenie `src/components/workout-sessions/assistant/exit-session-button.tsx`
2. Implementacja `AlertDialog` (shadcn/ui) z potwierdzeniem
3. Przekierowanie do listy sesji po potwierdzeniu
4. Fixed position (lewy górny róg)

### Krok 10: Implementacja WorkoutSessionAssistant (główny komponent)

1. Utworzenie `src/components/workout-sessions/assistant/workout-session-assistant.tsx`
2. Zarządzanie stanem lokalnym:
   - `session: SessionDetailDTO`
   - `currentExerciseIndex: number`
   - `isPaused: boolean`
   - `formData: ExerciseFormData`
   - `autosaveStatus: AutosaveStatus`
3. Inicjalizacja: ustawienie `currentExerciseIndex` na podstawie `session.current_position` lub 0
4. Implementacja logiki nawigacji:
   - `handleNext`: walidacja, zapis, przejście do następnego ćwiczenia
   - `handlePrevious`: przejście do poprzedniego ćwiczenia (bez zapisu)
   - `handlePause`: zapis, aktualizacja statusu, zatrzymanie timera
   - `handleResume`: aktualizacja statusu, wznowienie timera
   - `handleSkip`: zapis z `is_skipped: true`, przejście dalej
5. Integracja z API:
   - `PATCH /api/workout-sessions/[id]/exercises/[order]` (next/pause/skip)
   - `PATCH /api/workout-sessions/[id]/status` (pause/resume)
6. Obsługa zakończenia sesji: jeśli `currentExerciseIndex === exercises.length - 1` i next, ustawienie statusu `completed`
7. Integracja wszystkich podkomponentów
8. Pełnoekranowy layout bez nawigacji głównej
9. Scrollable container dla formularza (mobile-first)

### Krok 11: Implementacja custom hook (opcjonalnie)

1. Utworzenie `src/hooks/use-workout-session-assistant.ts`
2. Wyodrębnienie logiki z `WorkoutSessionAssistant` do hooka
3. Zwrócenie stanu i funkcji do użycia w komponencie

### Krok 12: Implementacja Zustand store (opcjonalnie)

1. Utworzenie `src/stores/workout-session-store.ts`
2. Implementacja store z `currentSession` i akcjami
3. Integracja store w `WorkoutSessionAssistant` i innych widokach (np. lista sesji)

### Krok 13: Walidacja i obsługa błędów

1. Implementacja walidacji po stronie klienta (Zod schemas dla formularza)
2. Mapowanie błędów API na `FormErrors`
3. Wyświetlanie błędów inline w formularzu
4. Toast notifications dla błędów globalnych (użycie Sonner z shadcn/ui)
5. Obsługa retry przy błędach sieciowych
6. Obsługa edge cases (przerwanie połączenia, przedwczesne opuszczenie strony)

### Krok 14: Testowanie i optymalizacja

1. Testowanie na urządzeniach mobilnych (responsive design)
2. Testowanie wszystkich scenariuszy nawigacji (next/previous/skip/pause)
3. Testowanie autosave przy różnych akcjach
4. Testowanie obsługi błędów (sieć, walidacja, autoryzacja)
5. Optymalizacja wydajności (memoization komponentów, debounce dla autosave jeśli potrzebne)
6. Testowanie dostępności (ARIA labels, keyboard shortcuts, focus management)

### Krok 15: Dokumentacja i finalizacja

1. Dodanie komentarzy JSDoc do komponentów i funkcji
2. Aktualizacja dokumentacji projektu (jeśli istnieje)
3. Code review i refaktoryzacja (jeśli potrzebne)
