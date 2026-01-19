# Plan implementacji widoku timera ćwiczenia

## 1. Przegląd

Widok timera ćwiczenia jest komponentem odpowiedzialnym za wyświetlanie i zarządzanie timerem dla bieżącego ćwiczenia w sesji treningowej. Timer ćwiczenia obsługuje cztery główne stany:

1. **Odliczanie czasu serii** - gdy ćwiczenie ma planowany czas (`planned_duration_seconds` > 0), timer odlicza od wartości planowanej do 0
2. **Wyświetlanie powtórzeń** - gdy ćwiczenie ma planowane powtórzenia bez czasu (`planned_reps` > 0 i `planned_duration_seconds === null`), wyświetla liczbę powtórzeń z przyciskiem "OK"
3. **Przerwa między seriami** - odliczanie od `planned_rest_seconds` do 0, automatyczne przejście do następnej serii
4. **Przerwa po seriach** - odliczanie od `planned_rest_after_series_seconds` do 0, automatyczne przejście do następnego ćwiczenia

Timer działa tylko wtedy, gdy asystent treningowy jest otwarty i aktywny. Zatrzymuje się przy wyjściu z asystenta, pauzie sesji i wznawia przy wznowieniu.

## 2. Routing widoku

Widok timera ćwiczenia nie jest osobną stroną, ale komponentem wbudowanym w asystent treningowy. Jest dostępny na ścieżce:

- `/workout-sessions/[id]/active` - strona aktywnej sesji treningowej

Komponent timera ćwiczenia jest renderowany wewnątrz komponentu `WorkoutSessionAssistant`, który jest używany na tej stronie.

## 3. Struktura komponentów

```
WorkoutSessionAssistant (główny komponent asystenta)
├── WorkoutTimer (timer globalny sesji - istnieje)
├── ExerciseTimer (timer ćwiczenia - NOWY)
│   ├── SetCountdownTimer (odliczanie czasu serii)
│   ├── RepsDisplay (wyświetlanie powtórzeń z przyciskiem OK)
│   ├── RestBetweenSetsTimer (odliczanie przerwy między seriami)
│   └── RestAfterSeriesTimer (odliczanie przerwy po seriach)
├── CurrentExerciseInfo (informacje o ćwiczeniu - istnieje)
├── ExerciseExecutionForm (formularz wykonania - istnieje)
└── NavigationButtons (przyciski nawigacji - istnieje)
```

## 4. Szczegóły komponentów

### ExerciseTimer

**Opis komponentu**: Główny komponent timera ćwiczenia, który zarządza stanem timera i przejściami między różnymi fazami ćwiczenia (seria, przerwa między seriami, przerwa po seriach).

**Główne elementy**:
- Warunkowe renderowanie podkomponentów w zależności od stanu timera
- Logika przejść między stanami (seria → przerwa między seriami → seria → przerwa po seriach)
- Integracja z hookiem `useExerciseTimer` do zarządzania stanem i odliczaniem
- Obsługa pause/resume
- Cleanup przy unmount (zatrzymanie timera)

**Obsługiwane zdarzenia**:
- `onSetComplete` - wywoływane po zakończeniu odliczania czasu serii lub kliknięciu OK przy powtórzeniach
- `onRestBetweenComplete` - wywoływane po zakończeniu przerwy między seriami
- `onRestAfterSeriesComplete` - wywoływane po zakończeniu przerwy po seriach
- `onRepsComplete` - wywoływane po kliknięciu przycisku OK przy wyświetlaniu powtórzeń

**Obsługiwana walidacja**:
- Sprawdzenie, czy ćwiczenie ma planowany czas (`planned_duration_seconds` > 0) lub planowane powtórzenia (`planned_reps` > 0)
- Sprawdzenie, czy ćwiczenie ma planowaną przerwę między seriami (`planned_rest_seconds` > 0)
- Sprawdzenie, czy ćwiczenie ma planowaną przerwę po seriach (`planned_rest_after_series_seconds` > 0)
- Walidacja numeru serii (musi być >= 1 i <= `planned_sets`)

**Typy**:
- `ExerciseTimerProps` - propsy komponentu
- `ExerciseTimerState` - typ stanu timera (union type)

**Props**:
```typescript
type ExerciseTimerProps = {
  exercise: SessionExerciseDTO;
  currentSetNumber: number;
  isPaused: boolean;
  onSetComplete: () => void;
  onRestBetweenComplete: () => void;
  onRestAfterSeriesComplete: () => void;
  onRepsComplete: () => void;
};
```

### SetCountdownTimer

**Opis komponentu**: Komponent wyświetlający odliczanie czasu dla pojedynczej serii ćwiczenia. Odlicza od `planned_duration_seconds` do 0.

**Główne elementy**:
- Wizualizacja odliczania (duży wyświetlacz czasu)
- Automatyczne przejście do przerwy po zakończeniu odliczania
- Obsługa pause/resume

**Obsługiwane zdarzenia**:
- Automatyczne wywołanie `onSetComplete` po zakończeniu odliczania (gdy czas osiągnie 0)

**Obsługiwana walidacja**:
- Sprawdzenie, czy `planned_duration_seconds` > 0
- Sprawdzenie, czy `currentSetNumber` <= `planned_sets`

**Typy**:
- `SetCountdownTimerProps` - propsy komponentu

**Props**:
```typescript
type SetCountdownTimerProps = {
  durationSeconds: number;
  isPaused: boolean;
  onComplete: () => void;
};
```

### RepsDisplay

**Opis komponentu**: Komponent wyświetlający liczbę planowanych powtórzeń dla serii z przyciskiem "OK" do przejścia do przerwy.

**Główne elementy**:
- Wyświetlanie liczby powtórzeń (duży wyświetlacz)
- Przycisk "OK" do zakończenia wykonywania powtórzeń
- Informacja o numerze serii

**Obsługiwane zdarzenia**:
- `onRepsComplete` - wywoływane po kliknięciu przycisku OK

**Obsługiwana walidacja**:
- Sprawdzenie, czy `planned_reps` > 0
- Sprawdzenie, czy `planned_duration_seconds === null` (tylko powtórzenia, bez czasu)

**Typy**:
- `RepsDisplayProps` - propsy komponentu

**Props**:
```typescript
type RepsDisplayProps = {
  reps: number;
  setNumber: number;
  onComplete: () => void;
};
```

### RestBetweenSetsTimer

**Opis komponentu**: Komponent wyświetlający odliczanie przerwy między seriami. Odlicza od `planned_rest_seconds` do 0 i automatycznie przechodzi do następnej serii.

**Główne elementy**:
- Wizualizacja odliczania przerwy (duży wyświetlacz czasu)
- Automatyczne przejście do następnej serii po zakończeniu odliczania
- Obsługa pause/resume

**Obsługiwane zdarzenia**:
- Automatyczne wywołanie `onRestBetweenComplete` po zakończeniu odliczania (gdy czas osiągnie 0)

**Obsługiwana walidacja**:
- Sprawdzenie, czy `planned_rest_seconds` > 0
- Sprawdzenie, czy istnieje następna seria (`currentSetNumber < planned_sets`)

**Typy**:
- `RestBetweenSetsTimerProps` - propsy komponentu

**Props**:
```typescript
type RestBetweenSetsTimerProps = {
  restSeconds: number;
  isPaused: boolean;
  onComplete: () => void;
};
```

### RestAfterSeriesTimer

**Opis komponentu**: Komponent wyświetlający odliczanie przerwy po zakończonych seriach ćwiczenia. Odlicza od `planned_rest_after_series_seconds` do 0 i automatycznie przechodzi do następnego ćwiczenia.

**Główne elementy**:
- Wizualizacja odliczania przerwy (duży wyświetlacz czasu)
- Automatyczne przejście do następnego ćwiczenia po zakończeniu odliczania
- Obsługa pause/resume

**Obsługiwane zdarzenia**:
- Automatyczne wywołanie `onRestAfterSeriesComplete` po zakończeniu odliczania (gdy czas osiągnie 0)

**Obsługiwana walidacja**:
- Sprawdzenie, czy `planned_rest_after_series_seconds` > 0
- Sprawdzenie, czy wszystkie serie zostały zakończone (`currentSetNumber >= planned_sets`)

**Typy**:
- `RestAfterSeriesTimerProps` - propsy komponentu

**Props**:
```typescript
type RestAfterSeriesTimerProps = {
  restSeconds: number;
  isPaused: boolean;
  onComplete: () => void;
};
```

## 5. Typy

### ExerciseTimerState

Typ union reprezentujący różne stany timera ćwiczenia:

```typescript
type ExerciseTimerState =
  | { type: 'waiting' } // Oczekiwanie na rozpoczęcie
  | { type: 'set_countdown'; setNumber: number; remainingSeconds: number } // Odliczanie czasu serii
  | { type: 'reps_display'; setNumber: number; reps: number } // Wyświetlanie powtórzeń
  | { type: 'rest_between_sets'; remainingSeconds: number } // Przerwa między seriami
  | { type: 'rest_after_series'; remainingSeconds: number }; // Przerwa po seriach
```

**Pola**:
- `type`: Typ stanu timera (discriminated union)
- `setNumber`: Numer bieżącej serii (dla stanów `set_countdown` i `reps_display`)
- `remainingSeconds`: Pozostały czas w sekundach (dla stanów `set_countdown`, `rest_between_sets`, `rest_after_series`)
- `reps`: Liczba powtórzeń (dla stanu `reps_display`)

### ExerciseTimerProps

Props głównego komponentu timera ćwiczenia:

```typescript
type ExerciseTimerProps = {
  exercise: SessionExerciseDTO;
  currentSetNumber: number;
  isPaused: boolean;
  onSetComplete: () => void;
  onRestBetweenComplete: () => void;
  onRestAfterSeriesComplete: () => void;
  onRepsComplete: () => void;
};
```

**Pola**:
- `exercise`: Dane ćwiczenia z sesji (zawiera `planned_duration_seconds`, `planned_reps`, `planned_sets`, `planned_rest_seconds`, `planned_rest_after_series_seconds`)
- `currentSetNumber`: Numer bieżącej serii (1-based)
- `isPaused`: Czy sesja jest w pauzie
- `onSetComplete`: Callback wywoływany po zakończeniu serii
- `onRestBetweenComplete`: Callback wywoływany po zakończeniu przerwy między seriami
- `onRestAfterSeriesComplete`: Callback wywoływany po zakończeniu przerwy po seriach
- `onRepsComplete`: Callback wywoływany po kliknięciu OK przy powtórzeniach

### SetCountdownTimerProps

Props komponentu odliczania czasu serii:

```typescript
type SetCountdownTimerProps = {
  durationSeconds: number;
  isPaused: boolean;
  onComplete: () => void;
};
```

**Pola**:
- `durationSeconds`: Czas trwania serii w sekundach (odliczanie od tej wartości do 0)
- `isPaused`: Czy timer jest w pauzie
- `onComplete`: Callback wywoływany po zakończeniu odliczania (gdy czas osiągnie 0)

### RepsDisplayProps

Props komponentu wyświetlania powtórzeń:

```typescript
type RepsDisplayProps = {
  reps: number;
  setNumber: number;
  onComplete: () => void;
};
```

**Pola**:
- `reps`: Liczba planowanych powtórzeń
- `setNumber`: Numer bieżącej serii
- `onComplete`: Callback wywoływany po kliknięciu przycisku OK

### RestBetweenSetsTimerProps

Props komponentu odliczania przerwy między seriami:

```typescript
type RestBetweenSetsTimerProps = {
  restSeconds: number;
  isPaused: boolean;
  onComplete: () => void;
};
```

**Pola**:
- `restSeconds`: Czas przerwy w sekundach (odliczanie od tej wartości do 0)
- `isPaused`: Czy timer jest w pauzie
- `onComplete`: Callback wywoływany po zakończeniu odliczania (gdy czas osiągnie 0)

### RestAfterSeriesTimerProps

Props komponentu odliczania przerwy po seriach:

```typescript
type RestAfterSeriesTimerProps = {
  restSeconds: number;
  isPaused: boolean;
  onComplete: () => void;
};
```

**Pola**:
- `restSeconds`: Czas przerwy w sekundach (odliczanie od tej wartości do 0)
- `isPaused`: Czy timer jest w pauzie
- `onComplete`: Callback wywoływany po zakończeniu odliczania (gdy czas osiągnie 0)

### SessionExerciseDTO (z `src/types.ts`)

Typ danych ćwiczenia z sesji, używany przez timer:

```typescript
type SessionExerciseDTO = {
  id: string;
  exercise_order: number;
  exercise_id: string;
  exercise_title_at_time: string;
  exercise_type_at_time: ExerciseType;
  exercise_part_at_time: ExercisePart;
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  planned_rest_after_series_seconds?: number | null;
  actual_count_sets: number | null;
  actual_sum_reps: number | null;
  actual_duration_seconds: number | null;
  is_skipped: boolean;
  sets: SessionExerciseSetDTO[];
  rest_in_between_seconds?: number | null;
  rest_after_series_seconds?: number | null;
};
```

**Pola używane przez timer**:
- `planned_sets`: Liczba planowanych serii
- `planned_reps`: Liczba planowanych powtórzeń (jeśli ćwiczenie oparte na powtórzeniach)
- `planned_duration_seconds`: Planowany czas trwania serii w sekundach (jeśli ćwiczenie oparte na czasie)
- `planned_rest_seconds`: Planowana przerwa między seriami w sekundach
- `planned_rest_after_series_seconds`: Planowana przerwa po zakończonych seriach w sekundach

## 6. Zarządzanie stanem

### Stan timera ćwiczenia

Stan timera ćwiczenia jest zarządzany w komponencie `WorkoutSessionAssistant` za pomocą hooka `useExerciseTimer`:

```typescript
const [exerciseTimerState, setExerciseTimerState] = useState<ExerciseTimerState>({ type: 'waiting' });
const [currentSetNumber, setCurrentSetNumber] = useState(1);
```

### Hook useExerciseTimer

Custom hook do zarządzania logiką timera ćwiczenia:

**Plik**: `src/hooks/use-exercise-timer.ts`

**Funkcjonalności**:
- Zarządzanie stanem timera (odliczanie, przerwa, powtórzenia)
- Obsługa pause/resume
- Automatyczne przejścia między stanami
- Cleanup przy unmount (zatrzymanie timera)
- Synchronizacja z numerem serii

**Parametry**:
```typescript
function useExerciseTimer(
  exercise: SessionExerciseDTO,
  currentSetNumber: number,
  isPaused: boolean,
  onSetComplete: () => void,
  onRestBetweenComplete: () => void,
  onRestAfterSeriesComplete: () => void,
  onRepsComplete: () => void
): {
  timerState: ExerciseTimerState;
  startSetTimer: () => void;
  startRestBetweenTimer: () => void;
  startRestAfterSeriesTimer: () => void;
  resetTimer: () => void;
}
```

**Logika**:
1. Przy zmianie ćwiczenia: reset timera, rozpoczęcie od pierwszej serii
2. Przy rozpoczęciu serii:
   - Jeśli `planned_duration_seconds` > 0: odliczanie czasu
   - Jeśli `planned_reps` > 0 i `planned_duration_seconds === null`: wyświetlanie powtórzeń
3. Po zakończeniu serii:
   - Jeśli `currentSetNumber < planned_sets`: rozpoczęcie przerwy między seriami
   - Jeśli `currentSetNumber >= planned_sets`: rozpoczęcie przerwy po seriach
4. Po zakończeniu przerwy między seriami: przejście do następnej serii
5. Po zakończeniu przerwy po seriach: wywołanie `onRestAfterSeriesComplete`

**Obsługa pause/resume**:
- Przy pause: zatrzymanie odliczania, zapamiętanie pozostałego czasu
- Przy resume: wznowienie odliczania od zapamiętanego czasu

**Cleanup**:
- Przy unmount komponentu: zatrzymanie wszystkich intervalów, reset stanu

### Integracja z WorkoutSessionAssistant

Timer ćwiczenia jest zintegrowany z głównym komponentem asystenta:

1. **Inicjalizacja**: Przy zmianie ćwiczenia timer jest resetowany i rozpoczyna się od pierwszej serii
2. **Synchronizacja z formularzem**: Timer automatycznie przechodzi do następnej serii, formularz aktualizuje `currentSetNumber`
3. **Obsługa pause/resume**: Timer zatrzymuje się i wznawia wraz z sesją
4. **Cleanup**: Przy wyjściu z asystenta timer jest zatrzymywany

## 7. Integracja API

Timer ćwiczenia **nie wymaga bezpośrednich wywołań API**. Jest to komponent wyłącznie frontendowy, który:

1. **Odczytuje dane** z `SessionExerciseDTO` (przekazywane jako prop `exercise`)
2. **Wywołuje callbacks** przekazane przez `WorkoutSessionAssistant`:
   - `onSetComplete` - po zakończeniu serii
   - `onRestBetweenComplete` - po zakończeniu przerwy między seriami
   - `onRestAfterSeriesComplete` - po zakończeniu przerwy po seriach
   - `onRepsComplete` - po kliknięciu OK przy powtórzeniach

**Uwaga**: Timer ćwiczenia nie zapisuje danych do backendu. Zapis danych ćwiczenia odbywa się przez komponent `WorkoutSessionAssistant` przy użyciu endpointu `PATCH /api/workout-sessions/{id}/exercises/{order}`.

## 8. Interakcje użytkownika

### Scenariusz 1: Ćwiczenie z czasem (planned_duration_seconds > 0)

1. **Rozpoczęcie serii**: Timer automatycznie rozpoczyna odliczanie od `planned_duration_seconds` do 0
2. **Odliczanie**: Użytkowniczka widzi pozostały czas (duży wyświetlacz)
3. **Zakończenie serii**: Po osiągnięciu 0, timer automatycznie przechodzi do przerwy między seriami (jeśli są kolejne serie) lub przerwy po seriach (jeśli to ostatnia seria)
4. **Przerwa między seriami**: Timer odlicza od `planned_rest_seconds` do 0, po zakończeniu automatycznie przechodzi do następnej serii
5. **Przerwa po seriach**: Timer odlicza od `planned_rest_after_series_seconds` do 0, po zakończeniu wywołuje `onRestAfterSeriesComplete`

### Scenariusz 2: Ćwiczenie z powtórzeniami (planned_reps > 0, planned_duration_seconds === null)

1. **Rozpoczęcie serii**: Timer wyświetla liczbę powtórzeń (`planned_reps`) z przyciskiem "OK"
2. **Wykonywanie powtórzeń**: Użytkowniczka wykonuje powtórzenia, widzi liczbę planowanych powtórzeń
3. **Zakończenie serii**: Po kliknięciu "OK", timer przechodzi do przerwy między seriami (jeśli są kolejne serie) lub przerwy po seriach (jeśli to ostatnia seria)
4. **Przerwa między seriami**: Timer odlicza od `planned_rest_seconds` do 0, po zakończeniu automatycznie przechodzi do następnej serii
5. **Przerwa po seriach**: Timer odlicza od `planned_rest_after_series_seconds` do 0, po zakończeniu wywołuje `onRestAfterSeriesComplete`

### Scenariusz 3: Pauza sesji

1. **Pauza**: Timer zatrzymuje się, zapamiętuje pozostały czas
2. **Wznowienie**: Timer wznawia odliczanie od zapamiętanego czasu

### Scenariusz 4: Wyjście z asystenta

1. **Unmount komponentu**: Timer jest zatrzymywany, wszystkie intervaly są czyszczone
2. **Powrót do asystenta**: Timer jest resetowany i rozpoczyna się od pierwszej serii bieżącego ćwiczenia

### Scenariusz 5: Zmiana ćwiczenia (previous/next)

1. **Zmiana ćwiczenia**: Timer jest resetowany
2. **Rozpoczęcie**: Timer rozpoczyna się od pierwszej serii nowego ćwiczenia

## 9. Warunki i walidacja

### Warunki weryfikowane przez interfejs

#### 1. Sprawdzenie typu ćwiczenia

**Komponent**: `ExerciseTimer`

**Warunek**: Określenie, czy ćwiczenie ma planowany czas czy powtórzenia:
- Jeśli `planned_duration_seconds` > 0: użyj `SetCountdownTimer`
- Jeśli `planned_reps` > 0 i `planned_duration_seconds === null`: użyj `RepsDisplay`
- Jeśli oba są null/0: timer nie jest wyświetlany (ćwiczenie bez planowanych wartości)

**Wpływ na stan interfejsu**: Decyduje, który podkomponent timera jest renderowany

#### 2. Sprawdzenie liczby serii

**Komponent**: `ExerciseTimer`

**Warunek**: Określenie, czy istnieje następna seria:
- Jeśli `currentSetNumber < planned_sets`: po zakończeniu serii przejdź do przerwy między seriami
- Jeśli `currentSetNumber >= planned_sets`: po zakończeniu serii przejdź do przerwy po seriach

**Wpływ na stan interfejsu**: Decyduje o kolejnym stanie timera po zakończeniu serii

#### 3. Sprawdzenie planowanej przerwy między seriami

**Komponent**: `ExerciseTimer`

**Warunek**: Sprawdzenie, czy ćwiczenie ma planowaną przerwę między seriami:
- Jeśli `planned_rest_seconds` > 0: wyświetl `RestBetweenSetsTimer`
- Jeśli `planned_rest_seconds === null` lub 0: pomiń przerwę między seriami, przejdź bezpośrednio do następnej serii

**Wpływ na stan interfejsu**: Decyduje, czy przerwa między seriami jest wyświetlana

#### 4. Sprawdzenie planowanej przerwy po seriach

**Komponent**: `ExerciseTimer`

**Warunek**: Sprawdzenie, czy ćwiczenie ma planowaną przerwę po seriach:
- Jeśli `planned_rest_after_series_seconds` > 0: wyświetl `RestAfterSeriesTimer`
- Jeśli `planned_rest_after_series_seconds === null` lub 0: pomiń przerwę po seriach, wywołaj `onRestAfterSeriesComplete` natychmiast

**Wpływ na stan interfejsu**: Decyduje, czy przerwa po seriach jest wyświetlana

#### 5. Sprawdzenie stanu pauzy

**Komponenty**: Wszystkie komponenty timera

**Warunek**: Sprawdzenie, czy sesja jest w pauzie:
- Jeśli `isPaused === true`: zatrzymaj odliczanie, zapamiętaj pozostały czas
- Jeśli `isPaused === false`: wznowij odliczanie od zapamiętanego czasu

**Wpływ na stan interfejsu**: Zatrzymuje/wznawia odliczanie timera

#### 6. Walidacja numeru serii

**Komponent**: `ExerciseTimer`

**Warunek**: Sprawdzenie, czy numer serii jest prawidłowy:
- `currentSetNumber` musi być >= 1
- `currentSetNumber` musi być <= `planned_sets` (jeśli `planned_sets` jest zdefiniowane)

**Wpływ na stan interfejsu**: Zapobiega błędnym stanom timera

### Warunki wymagane przez API

Timer ćwiczenia **nie wymaga bezpośrednich wywołań API**. Jednak dane ćwiczenia używane przez timer pochodzą z `SessionExerciseDTO`, które są pobierane przez endpoint `GET /api/workout-sessions/{id}`.

**Wymagania API dla danych ćwiczenia**:
- `planned_sets`: Liczba planowanych serii (może być null)
- `planned_reps`: Liczba planowanych powtórzeń (może być null)
- `planned_duration_seconds`: Planowany czas trwania serii w sekundach (może być null)
- `planned_rest_seconds`: Planowana przerwa między seriami w sekundach (może być null)
- `planned_rest_after_series_seconds`: Planowana przerwa po seriach w sekundach (może być null)

**Walidacja po stronie API** (już zaimplementowana):
- Wszystkie wartości muszą być >= 0 (jeśli są zdefiniowane)
- Ćwiczenie musi istnieć w sesji
- Sesja musi być w statusie `in_progress`

## 10. Obsługa błędów

### Błędy związane z danymi ćwiczenia

**Scenariusz**: Ćwiczenie nie ma planowanych wartości (wszystkie `planned_*` są null lub 0)

**Obsługa**: Timer nie jest wyświetlany. Komponent `ExerciseTimer` zwraca `null` lub komunikat informujący, że ćwiczenie nie ma planowanych wartości.

**Kod**:
```typescript
if (!exercise.planned_duration_seconds && !exercise.planned_reps) {
  return null; // lub komunikat
}
```

### Błędy związane z numerem serii

**Scenariusz**: `currentSetNumber` jest poza zakresem (np. > `planned_sets`)

**Obsługa**: Timer resetuje się do pierwszej serii lub wyświetla komunikat błędu.

**Kod**:
```typescript
if (currentSetNumber > (exercise.planned_sets || 1)) {
  // Reset do pierwszej serii lub wyświetl błąd
  setCurrentSetNumber(1);
}
```

### Błędy związane z pause/resume

**Scenariusz**: Timer nie może zostać zatrzymany lub wznowiony (np. z powodu błędu w stanie)

**Obsługa**: Timer resetuje się do stanu początkowego (`waiting`).

**Kod**:
```typescript
try {
  // Logika pause/resume
} catch (error) {
  console.error('Błąd timera:', error);
  setExerciseTimerState({ type: 'waiting' });
}
```

### Błędy związane z cleanup

**Scenariusz**: Timer nie może zostać zatrzymany przy unmount (np. z powodu błędu w cleanup)

**Obsługa**: Błąd jest logowany, ale nie blokuje unmount komponentu.

**Kod**:
```typescript
useEffect(() => {
  return () => {
    try {
      // Cleanup timera
    } catch (error) {
      console.error('Błąd podczas cleanup timera:', error);
    }
  };
}, []);
```

### Błędy związane z przejściami między stanami

**Scenariusz**: Nieprawidłowe przejście między stanami (np. z `rest_after_series` do `set_countdown` bez resetu)

**Obsługa**: Timer resetuje się do stanu początkowego (`waiting`).

**Kod**:
```typescript
const transitionToState = (newState: ExerciseTimerState) => {
  // Walidacja przejścia
  if (isValidTransition(exerciseTimerState, newState)) {
    setExerciseTimerState(newState);
  } else {
    console.error('Nieprawidłowe przejście stanu timera');
    setExerciseTimerState({ type: 'waiting' });
  }
};
```

### Błędy związane z synchronizacją

**Scenariusz**: Timer jest desynchronizowany z formularzem (np. `currentSetNumber` w timerze różni się od `currentSetNumber` w formularzu)

**Obsługa**: Timer synchronizuje się z formularzem przy każdej zmianie ćwiczenia.

**Kod**:
```typescript
useEffect(() => {
  // Reset timera przy zmianie ćwiczenia
  setExerciseTimerState({ type: 'waiting' });
  setCurrentSetNumber(1);
}, [currentExercise]);
```

## 11. Kroki implementacji

### Krok 1: Utworzenie typów dla timera ćwiczenia

**Plik**: `src/types/workout-session-assistant.ts` (lub nowy plik `src/types/exercise-timer.ts`)

**Zadania**:
1. Zdefiniuj typ `ExerciseTimerState` (union type z różnymi stanami)
2. Zdefiniuj typy props dla wszystkich komponentów timera:
   - `ExerciseTimerProps`
   - `SetCountdownTimerProps`
   - `RepsDisplayProps`
   - `RestBetweenSetsTimerProps`
   - `RestAfterSeriesTimerProps`

### Krok 2: Utworzenie hooka useExerciseTimer

**Plik**: `src/hooks/use-exercise-timer.ts`

**Zadania**:
1. Utworzenie hooka z logiką zarządzania stanem timera
2. Implementacja odliczania czasu (użycie `useEffect` z `setInterval`)
3. Implementacja obsługi pause/resume
4. Implementacja automatycznych przejść między stanami
5. Implementacja cleanup przy unmount

### Krok 3: Utworzenie komponentu SetCountdownTimer

**Plik**: `src/components/workout-sessions/assistant/exercise-timer/set-countdown-timer.tsx`

**Zadania**:
1. Utworzenie komponentu z odliczaniem czasu serii
2. Integracja z `CountdownCircleTimer` (lub własna implementacja)
3. Obsługa pause/resume
4. Automatyczne wywołanie `onComplete` po zakończeniu odliczania
5. Stylizacja (duży wyświetlacz czasu, widoczny z 1,5m)

### Krok 4: Utworzenie komponentu RepsDisplay

**Plik**: `src/components/workout-sessions/assistant/exercise-timer/reps-display.tsx`

**Zadania**:
1. Utworzenie komponentu z wyświetlaniem liczby powtórzeń
2. Dodanie przycisku "OK"
3. Wywołanie `onComplete` po kliknięciu przycisku
4. Stylizacja (duży wyświetlacz liczby, widoczny z 1,5m)

### Krok 5: Utworzenie komponentu RestBetweenSetsTimer

**Plik**: `src/components/workout-sessions/assistant/exercise-timer/rest-between-sets-timer.tsx`

**Zadania**:
1. Utworzenie komponentu z odliczaniem przerwy między seriami
2. Integracja z `CountdownCircleTimer` (lub własna implementacja)
3. Obsługa pause/resume
4. Automatyczne wywołanie `onComplete` po zakończeniu odliczania
5. Stylizacja (duży wyświetlacz czasu, widoczny z 1,5m)

### Krok 6: Utworzenie komponentu RestAfterSeriesTimer

**Plik**: `src/components/workout-sessions/assistant/exercise-timer/rest-after-series-timer.tsx`

**Zadania**:
1. Utworzenie komponentu z odliczaniem przerwy po seriach
2. Integracja z `CountdownCircleTimer` (lub własna implementacja)
3. Obsługa pause/resume
4. Automatyczne wywołanie `onComplete` po zakończeniu odliczania
5. Stylizacja (duży wyświetlacz czasu, widoczny z 1,5m)

### Krok 7: Utworzenie głównego komponentu ExerciseTimer

**Plik**: `src/components/workout-sessions/assistant/exercise-timer.tsx`

**Zadania**:
1. Utworzenie głównego komponentu timera ćwiczenia
2. Integracja z hookiem `useExerciseTimer`
3. Warunkowe renderowanie podkomponentów w zależności od stanu
4. Obsługa przejść między stanami (seria → przerwa → seria → przerwa po seriach)
5. Integracja z pause/resume
6. Cleanup przy unmount

### Krok 8: Integracja ExerciseTimer z WorkoutSessionAssistant

**Plik**: `src/components/workout-sessions/assistant/workout-session-assistant.tsx`

**Zadania**:
1. Dodanie stanu `exerciseTimerState` i `currentSetNumber`
2. Dodanie komponentu `ExerciseTimer` do renderowania
3. Implementacja callbacków:
   - `onSetComplete` - aktualizacja `currentSetNumber`, przejście do przerwy
   - `onRestBetweenComplete` - przejście do następnej serii
   - `onRestAfterSeriesComplete` - wywołanie `handleNext` (przejście do następnego ćwiczenia)
   - `onRepsComplete` - przejście do przerwy
4. Reset timera przy zmianie ćwiczenia
5. Synchronizacja z formularzem (aktualizacja `currentSetNumber` w formularzu)

### Krok 9: Aktualizacja WorkoutTimer (opcjonalne)

**Plik**: `src/components/workout-sessions/assistant/workout-timer.tsx`

**Zadania**:
1. Upewnienie się, że timer globalny i timer ćwiczenia nie kolidują ze sobą
2. Ewentualne dostosowanie layoutu, aby pomieścić oba timery

### Krok 10: Testy i weryfikacja

**Zadania**:
1. Testy jednostkowe dla hooka `useExerciseTimer`
2. Testy jednostkowe dla komponentów timera
3. Testy integracyjne dla pełnego flow (seria → przerwa → seria → przerwa po seriach)
4. Testy pause/resume
5. Testy cleanup przy unmount
6. Testy różnych typów ćwiczeń (z czasem, z powtórzeniami)
7. Weryfikacja wizualna (czytelność z 1,5m)

### Krok 11: Dokumentacja i optymalizacja

**Zadania**:
1. Dodanie JSDoc do wszystkich komponentów i hooków
2. Optymalizacja wydajności (użycie `useMemo`, `useCallback`)
3. Sprawdzenie, czy nie ma niepotrzebnych re-renderów
4. Aktualizacja dokumentacji projektu

