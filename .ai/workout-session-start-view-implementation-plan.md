# Plan implementacji widoku Start Workout Session

## 1. Przegląd

Widok `/workout-sessions/start` umożliwia użytkowniczce rozpoczęcie nowej sesji treningowej z wybranego planu treningowego lub wznowienie istniejącej sesji w statusie `in_progress`. Widok automatycznie wykrywa, czy istnieje aktywna sesja i wyświetla odpowiednią propozycję wznowienia. Jeśli nie ma aktywnej sesji, wyświetla listę dostępnych planów treningowych do wyboru. Widok obsługuje również pusty stan, gdy użytkowniczka nie ma jeszcze żadnych planów treningowych.

## 2. Routing widoku

- **Ścieżka**: `/workout-sessions/start`
- **Plik**: `src/app/workout-sessions/start/page.tsx`
- **Typ**: Server Component (główny widok)
- **Metadane**: Dynamiczne SEO metadata z tytułem i opisem strony

## 3. Struktura komponentów

```
StartWorkoutSessionView (Server Component)
├── ResumeSessionCard (Client Component) - opcjonalnie, jeśli istnieje sesja in_progress
│   ├── Card (shadcn/ui)
│   ├── Button "Wznów trening"
│   └── AlertDialog "Anuluj sesję"
├── WorkoutPlanSelector (Server Component) - jeśli nie ma sesji in_progress
│   └── WorkoutPlansList (Client Component)
│       └── WorkoutPlanStartCard (Client Component) - dla każdego planu
│           ├── Card (shadcn/ui)
│           └── Button "Rozpocznij"
└── EmptyState (Client Component) - jeśli brak planów
    ├── Card (shadcn/ui)
    └── Button "Utwórz plan"
```

## 4. Szczegóły komponentów

### StartWorkoutSessionView

- **Opis komponentu**: Główny Server Component widoku. Pobiera dane o istniejącej sesji in_progress oraz listę planów treningowych. Decyduje, który komponent wyświetlić na podstawie stanu danych.
- **Główne elementy**: 
  - Kontener główny z tytułem strony
  - Warunkowe renderowanie: `ResumeSessionCard` (jeśli istnieje sesja in_progress), `WorkoutPlanSelector` (jeśli nie ma sesji i są plany), `EmptyState` (jeśli brak planów)
- **Obsługiwane interakcje**: Brak bezpośrednich interakcji (Server Component)
- **Obsługiwana walidacja**: Brak walidacji na poziomie komponentu (walidacja po stronie API)
- **Typy**: 
  - Props: brak (komponent bez props)
  - Używa: `SessionDetailDTO`, `WorkoutPlanDTO` (z API)
- **Props**: Brak

### ResumeSessionCard

- **Opis komponentu**: Client Component wyświetlający kartę z informacją o istniejącej sesji in_progress. Zawiera szczegóły sesji (nazwa planu, data rozpoczęcia, postęp) oraz przyciski do wznowienia lub anulowania sesji.
- **Główne elementy**: 
  - `Card` (shadcn/ui) z wyróżnionym stylem (np. border-destructive, bg-destructive/10)
  - `CardHeader` z `CardTitle` i `CardDescription`
  - `CardContent` z informacjami o sesji:
    - Nazwa planu (`plan_name_at_time`)
    - Data rozpoczęcia (sformatowana)
    - Postęp (np. "Ćwiczenie 3 z 8" na podstawie `current_position` i liczby ćwiczeń)
  - `CardFooter` z przyciskami:
    - `Button` "Wznów trening" (variant="default", size="lg")
    - `Button` "Anuluj sesję" (variant="outline", size="lg")
  - `AlertDialog` (shadcn/ui) do potwierdzenia anulowania sesji
- **Obsługiwane interakcje**: 
  - Kliknięcie "Wznów trening" → wywołanie API `POST /api/workout-sessions` (jeśli zwróci istniejącą sesję) lub przekierowanie do `/workout-sessions/{id}/assistant`
  - Kliknięcie "Anuluj sesję" → otwarcie `AlertDialog` z potwierdzeniem
  - Potwierdzenie anulowania w dialogu → wywołanie API `PATCH /api/workout-sessions/{id}/status` z `status: "completed"` (lub usunięcie sesji, w zależności od wymagań biznesowych)
- **Obsługiwana walidacja**: 
  - Sprawdzenie, czy sesja istnieje i ma status `in_progress` (walidacja po stronie API)
  - Sprawdzenie, czy użytkowniczka ma uprawnienia do sesji (walidacja po stronie API)
- **Typy**: 
  - Props: `{ session: SessionDetailDTO }`
  - Używa: `SessionDetailDTO` z `@/types`
- **Props**: 
  ```typescript
  {
    session: SessionDetailDTO;
  }
  ```

### WorkoutPlanSelector

- **Opis komponentu**: Server Component renderujący listę planów treningowych. Pobiera dane z API i przekazuje je do Client Component `WorkoutPlansList`.
- **Główne elementy**: 
  - Kontener z tytułem sekcji (np. "Wybierz plan treningowy")
  - `WorkoutPlansList` (Client Component) z danymi planów
- **Obsługiwane interakcje**: Brak bezpośrednich interakcji (Server Component)
- **Obsługiwana walidacja**: Brak walidacji na poziomie komponentu
- **Typy**: 
  - Props: `{ plans: Omit<WorkoutPlanDTO, "exercises">[]; nextCursor?: string | null }`
  - Używa: `WorkoutPlanDTO` z `@/types`
- **Props**: 
  ```typescript
  {
    plans: Omit<WorkoutPlanDTO, "exercises">[];
    nextCursor?: string | null;
  }
  ```

### WorkoutPlansList

- **Opis komponentu**: Client Component renderujący listę kart planów treningowych. Obsługuje paginację i wyświetlanie stanu ładowania.
- **Główne elementy**: 
  - Kontener z `space-y-4` dla odstępów między kartami
  - Mapowanie planów do `WorkoutPlanStartCard`
  - Opcjonalnie: przycisk "Załaduj więcej" (jeśli `nextCursor` istnieje)
  - Opcjonalnie: `Skeleton` loader podczas ładowania kolejnych stron
- **Obsługiwane interakcje**: 
  - Kliknięcie "Załaduj więcej" → pobranie kolejnej strony planów z API `GET /api/workout-plans?cursor={nextCursor}`
- **Obsługiwana walidacja**: Brak walidacji na poziomie komponentu
- **Typy**: 
  - Props: `{ initialPlans: Omit<WorkoutPlanDTO, "exercises">[]; initialNextCursor?: string | null }`
  - Używa: `WorkoutPlanDTO` z `@/types`
- **Props**: 
  ```typescript
  {
    initialPlans: Omit<WorkoutPlanDTO, "exercises">[];
    initialNextCursor?: string | null;
  }
  ```

### WorkoutPlanStartCard

- **Opis komponentu**: Client Component renderujący kartę pojedynczego planu treningowego z przyciskiem "Rozpocznij". Wyświetla podstawowe informacje o planie (nazwa, part, liczba ćwiczeń).
- **Główne elementy**: 
  - `Card` (shadcn/ui) z hover effect
  - `CardHeader` z `CardTitle` (nazwa planu)
  - `CardContent` z informacjami:
    - `Badge` z part (jeśli istnieje)
    - `Badge` z liczbą ćwiczeń
    - Opcjonalnie: `CardDescription` z opisem planu
  - `CardFooter` z przyciskiem:
    - `Button` "Rozpocznij" (variant="default", size="lg", full width)
- **Obsługiwane interakcje**: 
  - Kliknięcie "Rozpocznij" → wywołanie API `POST /api/workout-sessions` z `{ workout_plan_id: plan.id }`
  - Po sukcesie → toast notification "Sesja treningowa rozpoczęta" i przekierowanie do `/workout-sessions/{sessionId}/assistant`
  - Podczas ładowania → wyświetlenie stanu loading na przycisku (disabled, "Rozpoczynanie...")
- **Obsługiwana walidacja**: 
  - Sprawdzenie, czy plan istnieje i należy do użytkowniczki (walidacja po stronie API)
  - Sprawdzenie, czy plan ma co najmniej jedno ćwiczenie (walidacja po stronie API)
  - Sprawdzenie, czy użytkowniczka nie ma już sesji in_progress (walidacja po stronie API - zwróci istniejącą sesję z statusem 200)
- **Typy**: 
  - Props: `{ plan: Omit<WorkoutPlanDTO, "exercises">; exerciseCount?: number }`
  - Używa: `WorkoutPlanDTO`, `ExercisePart` z `@/types`
- **Props**: 
  ```typescript
  {
    plan: Omit<WorkoutPlanDTO, "exercises">;
    exerciseCount?: number;
  }
  ```

### EmptyState

- **Opis komponentu**: Client Component wyświetlający pusty stan, gdy użytkowniczka nie ma jeszcze żadnych planów treningowych. Zawiera komunikat zachęcający i przycisk CTA do utworzenia pierwszego planu.
- **Główne elementy**: 
  - `Card` (shadcn/ui) z wyśrodkowaną zawartością
  - `CardHeader` z ikoną (np. `Calendar` z lucide-react), `CardTitle` i `CardDescription`
  - `CardContent` z przyciskiem:
    - `Button` "Utwórz plan" (variant="default", size="lg") jako `Link` do `/workout-plans/new`
- **Obsługiwane interakcje**: 
  - Kliknięcie "Utwórz plan" → przekierowanie do `/workout-plans/new`
- **Obsługiwana walidacja**: Brak walidacji
- **Typy**: Brak typów (komponent bez props)
- **Props**: Brak

## 5. Typy

### Typy z `@/types` (już istniejące)

#### SessionDetailDTO
```typescript
type SessionDetailDTO = SessionSummaryDTO & {
  exercises: SessionExerciseDTO[];
};

type SessionSummaryDTO = {
  id: string;
  workout_plan_id: string | null;
  plan_name_at_time: string;
  status: WorkoutSessionStatus;
  started_at: string;
  completed_at: string | null;
  current_position: number;
  last_action_at: string;
};

type SessionExerciseDTO = {
  id: string;
  exercise_id: string | null;
  exercise_title_at_time: string;
  exercise_type_at_time: ExerciseType;
  exercise_part_at_time: ExercisePart;
  order: number;
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  actual_count_sets: number | null;
  actual_sum_reps: number | null;
  actual_duration_seconds: number | null;
  actual_rest_seconds: number | null;
  is_skipped: boolean;
  sets: SessionExerciseSetDTO[];
};

type SessionExerciseSetDTO = {
  id: string;
  set_number: number;
  reps: number | null;
  duration_seconds: number | null;
  weight_kg: number | null;
};
```

#### WorkoutPlanDTO
```typescript
type WorkoutPlanDTO = {
  id: string;
  name: string;
  description: string | null;
  part: ExercisePart | null;
  created_at: string;
  updated_at: string;
  exercises: WorkoutPlanExerciseDTO[];
};

type WorkoutPlanExerciseDTO = {
  id: string;
  exercise_id: string;
  section_type: ExerciseType;
  section_order: number;
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
};
```

#### SessionStartCommand
```typescript
type SessionStartCommand = {
  workout_plan_id: string;
};
```

### Nowe typy ViewModel (opcjonalne, dla uproszczenia logiki komponentów)

#### ResumeSessionViewModel
```typescript
type ResumeSessionViewModel = {
  sessionId: string;
  planName: string;
  startedAt: string;
  currentExerciseNumber: number;
  totalExercises: number;
  progressPercentage: number;
};
```

**Pola**:
- `sessionId: string` - ID sesji do wznowienia
- `planName: string` - Nazwa planu z snapshotu (`plan_name_at_time`)
- `startedAt: string` - Data rozpoczęcia sesji (ISO string)
- `currentExerciseNumber: number` - Numer aktualnego ćwiczenia (na podstawie `current_position`, 1-indexed)
- `totalExercises: number` - Całkowita liczba ćwiczeń w sesji
- `progressPercentage: number` - Procent ukończenia (0-100), obliczany jako `(currentExerciseNumber / totalExercises) * 100`

**Funkcja mapowania**: `mapSessionToResumeViewModel(session: SessionDetailDTO): ResumeSessionViewModel`

#### WorkoutPlanStartViewModel
```typescript
type WorkoutPlanStartViewModel = {
  id: string;
  name: string;
  description: string | null;
  part: ExercisePart | null;
  partLabel: string | null;
  exerciseCount: number;
  createdAt: string;
};
```

**Pola**:
- `id: string` - ID planu
- `name: string` - Nazwa planu
- `description: string | null` - Opis planu
- `part: ExercisePart | null` - Part planu
- `partLabel: string | null` - Przetłumaczona etykieta part (np. "Nogi" dla "Legs")
- `exerciseCount: number` - Liczba ćwiczeń w planie
- `createdAt: string` - Data utworzenia (ISO string)

**Funkcja mapowania**: `mapPlanToStartViewModel(plan: Omit<WorkoutPlanDTO, "exercises">, exerciseCount: number): WorkoutPlanStartViewModel`

## 6. Zarządzanie stanem

### Stan lokalny w komponentach Client

#### ResumeSessionCard
- `isResuming: boolean` - stan ładowania podczas wznowienia sesji
- `isCancelDialogOpen: boolean` - stan otwarcia dialogu anulowania
- `isCancelling: boolean` - stan ładowania podczas anulowania sesji

**Hook**: `useState` z React

#### WorkoutPlanStartCard
- `isStarting: boolean` - stan ładowania podczas rozpoczynania sesji

**Hook**: `useState` z React

#### WorkoutPlansList
- `plans: Omit<WorkoutPlanDTO, "exercises">[]` - lista planów (aktualizowana przy paginacji)
- `nextCursor: string | null` - kursor do następnej strony
- `isLoadingMore: boolean` - stan ładowania kolejnych planów

**Hook**: `useState` z React

### Custom hook (opcjonalny)

#### useStartWorkoutSession
Hook do obsługi logiki rozpoczynania sesji treningowej.

**Cel**: Centralizacja logiki wywołania API, obsługi błędów i przekierowania.

**Zwracane wartości**:
```typescript
{
  startSession: (planId: string) => Promise<void>;
  isStarting: boolean;
  error: string | null;
}
```

**Implementacja**:
- Wywołanie `POST /api/workout-sessions` z `{ workout_plan_id: planId }`
- Obsługa odpowiedzi:
  - Status `201` (nowa sesja) → przekierowanie do `/workout-sessions/{sessionId}/assistant`
  - Status `200` (istniejąca sesja) → przekierowanie do `/workout-sessions/{sessionId}/assistant`
- Obsługa błędów z toast notifications
- Zarządzanie stanem `isStarting`

## 7. Integracja API

### POST /api/workout-sessions

**Endpoint**: `/api/workout-sessions`

**Metoda**: `POST`

**Body**:
```typescript
{
  workout_plan_id: string; // UUID planu treningowego
}
```

**Typ żądania**: `SessionStartCommand` z `@/types`

**Odpowiedź sukcesu**:
- Status: `201 Created` (nowa sesja) lub `200 OK` (istniejąca sesja in_progress)
- Body: `SessionDetailDTO`

**Odpowiedź błędu**:
- Status: `400 Bad Request` - nieprawidłowe dane wejściowe (brak `workout_plan_id`, nieprawidłowy UUID)
- Status: `404 Not Found` - plan nie istnieje lub nie należy do użytkowniczki
- Status: `409 Conflict` - konflikt stanu (np. próba utworzenia drugiej sesji in_progress)
- Status: `401 Unauthorized` - brak autoryzacji
- Status: `403 Forbidden` - brak dostępu
- Status: `500 Internal Server Error` - błąd serwera

**Użycie w komponentach**:
- `WorkoutPlanStartCard` - wywołanie przy kliknięciu "Rozpocznij"
- `ResumeSessionCard` - wywołanie przy kliknięciu "Wznów trening" (opcjonalnie, jeśli API zwróci istniejącą sesję)

### GET /api/workout-sessions?status=in_progress

**Endpoint**: `/api/workout-sessions?status=in_progress`

**Metoda**: `GET`

**Query Parameters**:
```typescript
{
  status?: "in_progress";
  limit?: number; // domyślnie 1
}
```

**Odpowiedź sukcesu**:
- Status: `200 OK`
- Body:
```typescript
{
  items: SessionSummaryDTO[];
  nextCursor?: string | null;
}
```

**Użycie w komponentach**:
- `StartWorkoutSessionView` (Server Component) - pobranie sesji in_progress przy renderowaniu strony

### GET /api/workout-plans

**Endpoint**: `/api/workout-plans`

**Metoda**: `GET`

**Query Parameters**:
```typescript
{
  part?: ExercisePart;
  sort?: "created_at" | "name";
  order?: "asc" | "desc";
  limit?: number; // domyślnie 20
  cursor?: string | null;
}
```

**Odpowiedź sukcesu**:
- Status: `200 OK`
- Body:
```typescript
{
  items: Omit<WorkoutPlanDTO, "exercises">[];
  nextCursor?: string | null;
}
```

**Użycie w komponentach**:
- `StartWorkoutSessionView` (Server Component) - pobranie listy planów przy renderowaniu strony
- `WorkoutPlansList` (Client Component) - pobranie kolejnych stron przy paginacji

### PATCH /api/workout-sessions/{id}/status

**Endpoint**: `/api/workout-sessions/{id}/status`

**Metoda**: `PATCH`

**Body**:
```typescript
{
  status: "completed"; // lub "in_progress" dla wznowienia
}
```

**Odpowiedź sukcesu**:
- Status: `200 OK`
- Body: `SessionSummaryDTO`

**Użycie w komponentach**:
- `ResumeSessionCard` - wywołanie przy anulowaniu sesji (ustawienie statusu na `completed`)

## 8. Interakcje użytkownika

### 8.1 Rozpoczęcie nowej sesji z planu

**Scenariusz**: Użytkowniczka nie ma sesji in_progress i wybiera plan z listy.

**Kroki**:
1. Użytkowniczka klika przycisk "Rozpocznij" na karcie planu
2. Przycisk przechodzi w stan loading ("Rozpoczynanie...", disabled)
3. Wywołanie API `POST /api/workout-sessions` z `{ workout_plan_id: plan.id }`
4. Po sukcesie:
   - Toast notification: "Sesja treningowa rozpoczęta"
   - Przekierowanie do `/workout-sessions/{sessionId}/assistant`
5. Po błędzie:
   - Toast notification z komunikatem błędu
   - Przycisk wraca do stanu normalnego

**Komponenty zaangażowane**: `WorkoutPlanStartCard`

### 8.2 Wznowienie istniejącej sesji

**Scenariusz**: Użytkowniczka ma sesję in_progress i klika "Wznów trening".

**Kroki**:
1. Użytkowniczka klika przycisk "Wznów trening" na karcie sesji
2. Przycisk przechodzi w stan loading ("Wznawianie...", disabled)
3. Opcjonalnie: wywołanie API `POST /api/workout-sessions` (jeśli API zwróci istniejącą sesję) lub bezpośrednie przekierowanie
4. Przekierowanie do `/workout-sessions/{sessionId}/assistant`
5. Po błędzie:
   - Toast notification z komunikatem błędu
   - Przycisk wraca do stanu normalnego

**Komponenty zaangażowane**: `ResumeSessionCard`

### 8.3 Anulowanie sesji in_progress

**Scenariusz**: Użytkowniczka klika "Anuluj sesję" i potwierdza w dialogu.

**Kroki**:
1. Użytkowniczka klika przycisk "Anuluj sesję"
2. Otwiera się `AlertDialog` z potwierdzeniem
3. Użytkowniczka klika "Potwierdź" w dialogu
4. Dialog zamyka się, przycisk "Anuluj sesję" przechodzi w stan loading
5. Wywołanie API `PATCH /api/workout-sessions/{id}/status` z `{ status: "completed" }`
6. Po sukcesie:
   - Toast notification: "Sesja została anulowana"
   - Odświeżenie strony (lub przekierowanie do listy planów)
7. Po błędzie:
   - Toast notification z komunikatem błędu
   - Dialog pozostaje otwarty (lub zamyka się, w zależności od UX)

**Komponenty zaangażowane**: `ResumeSessionCard`, `AlertDialog`

### 8.4 Paginacja listy planów

**Scenariusz**: Użytkowniczka przewija listę planów i klika "Załaduj więcej".

**Kroki**:
1. Użytkowniczka klika przycisk "Załaduj więcej"
2. Przycisk przechodzi w stan loading
3. Wywołanie API `GET /api/workout-plans?cursor={nextCursor}`
4. Po sukcesie:
   - Nowe plany są dodawane do listy
   - Jeśli `nextCursor` istnieje, przycisk pozostaje widoczny
   - Jeśli `nextCursor` jest null, przycisk znika
5. Po błędzie:
   - Toast notification z komunikatem błędu
   - Przycisk wraca do stanu normalnego

**Komponenty zaangażowane**: `WorkoutPlansList`

### 8.5 Przejście do tworzenia planu (pusty stan)

**Scenariusz**: Użytkowniczka nie ma planów i klika "Utwórz plan".

**Kroki**:
1. Użytkowniczka klika przycisk "Utwórz plan"
2. Przekierowanie do `/workout-plans/new`

**Komponenty zaangażowane**: `EmptyState`

## 9. Warunki i walidacja

### 9.1 Warunki wyświetlania komponentów

#### ResumeSessionCard
- **Warunek**: `session.status === "in_progress"` i sesja należy do użytkowniczki
- **Weryfikacja**: Po stronie API przy pobieraniu sesji (`GET /api/workout-sessions?status=in_progress`)
- **Wpływ na UI**: Jeśli warunek spełniony, `ResumeSessionCard` jest wyświetlany zamiast `WorkoutPlanSelector`

#### WorkoutPlanSelector
- **Warunek**: Brak sesji in_progress i istnieją plany treningowe
- **Weryfikacja**: Po stronie API przy pobieraniu planów (`GET /api/workout-plans`)
- **Wpływ na UI**: Jeśli warunek spełniony, `WorkoutPlanSelector` jest wyświetlany

#### EmptyState
- **Warunek**: Brak planów treningowych
- **Weryfikacja**: Po stronie API przy pobieraniu planów (`GET /api/workout-plans` - pusta lista)
- **Wpływ na UI**: Jeśli warunek spełniony, `EmptyState` jest wyświetlany zamiast `WorkoutPlanSelector`

### 9.2 Walidacja przed rozpoczęciem sesji

#### Walidacja planu
- **Warunek**: Plan musi istnieć i należeć do użytkowniczki
- **Weryfikacja**: Po stronie API (`POST /api/workout-sessions` zwróci `404` jeśli plan nie istnieje)
- **Wpływ na UI**: Toast notification "Plan treningowy nie został znaleziony"

#### Walidacja ćwiczeń w planie
- **Warunek**: Plan musi mieć co najmniej jedno ćwiczenie
- **Weryfikacja**: Po stronie API (`POST /api/workout-sessions` zwróci `400` jeśli plan jest pusty)
- **Wpływ na UI**: Toast notification "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"

#### Walidacja sesji in_progress
- **Warunek**: Użytkowniczka może mieć maksymalnie jedną sesję in_progress
- **Weryfikacja**: Po stronie API (`POST /api/workout-sessions` zwróci istniejącą sesję z statusem `200` jeśli już istnieje)
- **Wpływ na UI**: Jeśli API zwróci istniejącą sesję, użytkowniczka zostanie przekierowana do asystenta tej sesji (bez tworzenia nowej)

### 9.3 Walidacja przy anulowaniu sesji

#### Walidacja statusu sesji
- **Warunek**: Sesja musi mieć status `in_progress`
- **Weryfikacja**: Po stronie API (`PATCH /api/workout-sessions/{id}/status` zwróci `400` jeśli status jest nieprawidłowy)
- **Wpływ na UI**: Toast notification "Nie można anulować ukończonej sesji"

#### Walidacja uprawnień
- **Warunek**: Sesja musi należeć do użytkowniczki
- **Weryfikacja**: Po stronie API (`PATCH /api/workout-sessions/{id}/status` zwróci `404` jeśli sesja nie istnieje lub `403` jeśli brak dostępu)
- **Wpływ na UI**: Toast notification "Brak autoryzacji. Zaloguj się ponownie." i przekierowanie do logowania

## 10. Obsługa błędów

### 10.1 Błąd 400 - Nieprawidłowe dane wejściowe

**Scenariusz**: Próba rozpoczęcia sesji z nieprawidłowym `workout_plan_id` (np. nieprawidłowy UUID, brak pola).

**Obsługa**:
- Toast notification: "Nieprawidłowe dane wejściowe. Sprawdź wybór planu."
- Przycisk wraca do stanu normalnego
- Formularz pozostaje w stanie umożliwiającym ponowną próbę

**Komponenty**: `WorkoutPlanStartCard`, `ResumeSessionCard`

### 10.2 Błąd 404 - Plan nie znaleziony

**Scenariusz**: Próba rozpoczęcia sesji z planem, który nie istnieje lub nie należy do użytkowniczki.

**Obsługa**:
- Toast notification: "Plan treningowy nie został znaleziony lub nie należy do Ciebie."
- Odświeżenie listy planów (możliwe, że plan został usunięty)
- Przycisk wraca do stanu normalnego

**Komponenty**: `WorkoutPlanStartCard`

### 10.3 Błąd 409 - Konflikt (istniejąca sesja in_progress)

**Scenariusz**: Próba utworzenia nowej sesji, gdy już istnieje sesja in_progress (rzadki przypadek, gdy API nie zwróciło istniejącej sesji).

**Obsługa**:
- Toast notification: "Masz już aktywną sesję treningową. Wznów istniejącą sesję."
- Przekierowanie do widoku start z wyświetloną kartą wznowienia (lub bezpośrednie przekierowanie do asystenta)

**Komponenty**: `WorkoutPlanStartCard`

### 10.4 Błąd 401/403 - Brak autoryzacji

**Scenariusz**: Sesja użytkowniczki wygasła lub brak uprawnień.

**Obsługa**:
- Toast notification: "Brak autoryzacji. Zaloguj się ponownie."
- Przekierowanie do `/login` (lub strony logowania)
- Opcjonalnie: zachowanie URL, do którego użytkowniczka próbowała się dostać (redirect po zalogowaniu)

**Komponenty**: Wszystkie komponenty wywołujące API

### 10.5 Błąd 500 - Błąd serwera

**Scenariusz**: Nieoczekiwany błąd serwera podczas operacji.

**Obsługa**:
- Toast notification: "Wystąpił błąd serwera. Spróbuj ponownie później."
- Przycisk wraca do stanu normalnego
- Formularz pozostaje w stanie umożliwiającym ponowną próbę

**Komponenty**: Wszystkie komponenty wywołujące API

### 10.6 Błąd sieci (network error)

**Scenariusz**: Brak połączenia z internetem lub timeout.

**Obsługa**:
- Toast notification: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- Przycisk wraca do stanu normalnego
- Formularz pozostaje w stanie umożliwiającym ponowną próbę

**Komponenty**: Wszystkie komponenty wywołujące API

**Implementacja**:
```typescript
try {
  const response = await fetch(...);
} catch (error) {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    toast.error("Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.");
  }
}
```

### 10.7 Toast notifications

**Biblioteka**: `sonner` (już zainstalowana w projekcie)

**Użycie**:
- Import: `import { toast } from "sonner";`
- Sukces: `toast.success("Sesja treningowa rozpoczęta");`
- Błąd: `toast.error("Wystąpił błąd. Spróbuj ponownie.");`

**Komponenty**: Wszystkie Client Components wywołujące API

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. Utworzenie `src/app/workout-sessions/start/page.tsx` (Server Component - główny widok)
2. Utworzenie katalogu `src/components/workout-sessions/start/` dla komponentów widoku

### Krok 2: Implementacja głównego widoku (Server Component)

1. Utworzenie `src/app/workout-sessions/start/page.tsx`:
   - Pobranie sesji in_progress z API (`GET /api/workout-sessions?status=in_progress&limit=1`)
   - Pobranie listy planów z API (`GET /api/workout-plans`)
   - Warunkowe renderowanie komponentów na podstawie stanu danych
   - Export metadata dla SEO

### Krok 3: Implementacja komponentu ResumeSessionCard

1. Utworzenie `src/components/workout-sessions/start/resume-session-card.tsx`:
   - Implementacja karty z informacjami o sesji
   - Implementacja przycisku "Wznów trening" z obsługą API
   - Implementacja przycisku "Anuluj sesję" z `AlertDialog`
   - Implementacja funkcji mapowania `SessionDetailDTO` do `ResumeSessionViewModel` (opcjonalnie)
   - Obsługa stanów loading i błędów
   - Toast notifications

### Krok 4: Implementacja komponentu WorkoutPlanSelector

1. Utworzenie `src/components/workout-sessions/start/workout-plan-selector.tsx`:
   - Implementacja Server Component renderującego listę planów
   - Przekazanie danych do `WorkoutPlansList`

### Krok 5: Implementacja komponentu WorkoutPlansList

1. Utworzenie `src/components/workout-sessions/start/workout-plans-list.tsx`:
   - Implementacja Client Component z listą planów
   - Implementacja paginacji z przyciskiem "Załaduj więcej"
   - Implementacja stanu loading podczas pobierania kolejnych stron
   - Mapowanie planów do `WorkoutPlanStartCard`

### Krok 6: Implementacja komponentu WorkoutPlanStartCard

1. Utworzenie `src/components/workout-sessions/start/workout-plan-start-card.tsx`:
   - Implementacja karty planu z przyciskiem "Rozpocznij"
   - Implementacja wywołania API `POST /api/workout-sessions`
   - Implementacja obsługi odpowiedzi (przekierowanie do asystenta)
   - Implementacja stanu loading i błędów
   - Toast notifications
   - Implementacja funkcji mapowania `WorkoutPlanDTO` do `WorkoutPlanStartViewModel` (opcjonalnie)

### Krok 7: Implementacja komponentu EmptyState

1. Utworzenie `src/components/workout-sessions/start/empty-state.tsx`:
   - Implementacja pustego stanu z komunikatem i przyciskiem CTA
   - Link do `/workout-plans/new`

### Krok 8: Implementacja custom hook (opcjonalny)

1. Utworzenie `src/hooks/use-start-workout-session.ts`:
   - Implementacja logiki wywołania API
   - Implementacja obsługi błędów
   - Implementacja przekierowania po sukcesie
   - Zarządzanie stanem loading

### Krok 9: Implementacja funkcji pomocniczych (opcjonalnie)

1. Utworzenie `src/lib/workout-sessions/start-helpers.ts`:
   - Funkcja `mapSessionToResumeViewModel`
   - Funkcja `mapPlanToStartViewModel`
   - Funkcja formatowania daty
   - Funkcja obliczania postępu

### Krok 10: Styling i dostępność

1. Dodanie odpowiednich klas Tailwind CSS do komponentów
2. Dodanie ARIA labels do przycisków i interaktywnych elementów
3. Implementacja keyboard navigation
4. Testowanie z screen readerem

### Krok 11: Testowanie

1. Testowanie scenariusza: brak sesji in_progress, wybór planu, rozpoczęcie sesji
2. Testowanie scenariusza: istnieje sesja in_progress, wznowienie sesji
3. Testowanie scenariusza: istnieje sesja in_progress, anulowanie sesji
4. Testowanie scenariusza: brak planów, wyświetlenie pustego stanu
5. Testowanie scenariusza: paginacja listy planów
6. Testowanie obsługi błędów (400, 404, 409, 401, 403, 500, network error)
7. Testowanie dostępności (ARIA, keyboard navigation)

### Krok 12: Integracja z nawigacją

1. Dodanie linku do widoku start w głównej nawigacji (jeśli wymagane)
2. Weryfikacja, że przekierowania działają poprawnie
3. Weryfikacja, że toast notifications są wyświetlane poprawnie
