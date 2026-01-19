# Plan aktualizacji asystenta treningu

## Data utworzenia
2025-01-19

## Cel
Doprecyzowanie i uzupełnienie funkcjonalności asystenta treningu zgodnie z user stories z PRD US-030 - US-043.

---

## 1. Audyt obecnej implementacji

### 1.1 Zaimplementowane funkcjonalności ✅

#### US-030: Rozpoczęcie sesji z planu
- ✅ Kliknięcie "Start" tworzy WorkoutSession ze statusem `in_progress`
- ✅ Sesja zawiera listę ćwiczeń z planu w tej samej kolejności
- ✅ Dla każdego ćwiczenia sesja ma `planned_*` skopiowane z planu
- **Lokalizacja**: `src/services/workout-sessions.ts:startWorkoutSessionService`

#### US-032: Wyświetlenie bieżącego ćwiczenia z parametrami planowanymi
- ✅ Widok pokazuje tytuł ćwiczenia
- ✅ Typ ćwiczenia (Warm-up | Main Workout | Cool-down)
- ✅ Partia ćwiczenia (Legs | Core | Back | Arms | Chest)
- ✅ Liczba serii planowanych
- ✅ Liczba powtórzeń planowanych
- ✅ Czas trwania planowany (w sekundach)
- ✅ Przerwa między seriami (w sekundach)
- ✅ Przerwa po zakończonych seriach (w sekundach)
- **Lokalizacja**: `src/components/workout-sessions/assistant/current-exercise-info.tsx`

#### US-033: Zapis faktycznego wykonania ćwiczenia (actual_*)
- ✅ Użytkowniczka wprowadza dane wykonania przez set logs
- ✅ Wartości faktyczne są obliczane automatycznie z set logs
- ✅ Użytkowniczka może oznaczyć ćwiczenie jako pominięte
- ✅ Dane są zapisywane w sesji przy użyciu next lub pause (autosave)
- **Lokalizacja**: `src/components/workout-sessions/assistant/exercise-execution-form.tsx`

#### US-034: Nawigacja next zapisuje stan ćwiczenia
- ✅ Kliknięcie next zapisuje aktualne dane ćwiczenia
- ✅ Po zapisie aplikacja przechodzi do następnego ćwiczenia
- ✅ Jeśli zapis się nie uda, aplikacja pokazuje błąd i nie przechodzi dalej
- **Lokalizacja**: `src/components/workout-sessions/assistant/workout-session-assistant.tsx:handleNext`

#### US-035: Nawigacja previous do poprzedniego ćwiczenia
- ✅ Kliknięcie previous przenosi do poprzedniego ćwiczenia
- ✅ Dane zapisane wcześniej są widoczne w formularzu
- **Lokalizacja**: `src/components/workout-sessions/assistant/workout-session-assistant.tsx:handlePrevious`

#### US-036: Skip ćwiczenia
- ✅ Kliknięcie skip oznacza ćwiczenie jako pominięte
- ✅ Skip przechodzi do następnego ćwiczenia
- ✅ Skip nie tworzy set logs, jeśli użytkowniczka nic nie zapisała
- ✅ Sesja może zostać ukończona mimo pominięć
- ✅ Skip działa jako autosave dla bieżącego stanu sesji
- **Lokalizacja**: `src/components/workout-sessions/assistant/workout-session-assistant.tsx:handleSkip`

#### US-037: Autosave przy pauzie
- ✅ Kliknięcie pause zapisuje bieżący stan sesji
- ✅ Po wznowieniu dane pozostają dostępne
- **Lokalizacja**: `src/components/workout-sessions/assistant/workout-session-assistant.tsx:handlePause`

#### US-038: Wznowienie przerwanej sesji
- ✅ Jeśli istnieje sesja in_progress, aplikacja oferuje opcję wznowienia
- ✅ Wznowienie przenosi użytkowniczkę do ostatniego miejsca w sesji
- **Lokalizacja**: `src/app/(app)/workout-sessions/start/page.tsx`, `src/components/workout-sessions/start/resume-session-card.tsx`

#### US-039: Zakończenie sesji po dotarciu do końca listy
- ✅ Po przejściu przez ostatnie ćwiczenie i wykonaniu next, sesja uzyskuje status `completed`
- ✅ Completed jest możliwe nawet, jeśli w sesji wystąpiły skip
- **Lokalizacja**: `src/components/workout-sessions/assistant/workout-session-assistant.tsx:handleNext`

#### US-040: Przypadek przerwania sesji bez ukończenia
- ✅ Jeśli użytkowniczka opuści asystenta przed końcem listy, sesja pozostaje `in_progress`
- ✅ Aplikacja umożliwia wznowienie tej sesji
- **Lokalizacja**: `src/components/workout-sessions/assistant/workout-session-assistant.tsx:handleExit`

#### US-041: Edycja danych wcześniejszego ćwiczenia i nadpisanie logów
- ✅ Użytkowniczka może przejść previous do wcześniej odwiedzonego ćwiczenia
- ✅ Po zmianie i przejściu next log jest nadpisany
- ✅ PR zostaje przeliczony z aktualnych danych
- **Lokalizacja**: `src/components/workout-sessions/assistant/workout-session-assistant.tsx`

#### US-043: Obsługa błędu autosave/next przy problemach z siecią
- ✅ Jeśli zapis przy next/pause nie powiedzie się, aplikacja pokazuje błąd
- ✅ Aplikacja nie przechodzi do następnego ćwiczenia przy błędzie
- ✅ Wprowadzone dane pozostają w formularzu (nie znikają po błędzie)
- **Lokalizacja**: `src/components/workout-sessions/assistant/workout-session-assistant.tsx:saveExercise`

#### US-042: Blokada startu nowej sesji przy in_progress
- ✅ Backend blokuje tworzenie nowej sesji, jeśli istnieje `in_progress` (zwraca istniejącą)
- ✅ Frontend pokazuje opcję wznowienia na stronie startu (`/workout-sessions/start`)
- ✅ Komunikat informujący użytkowniczkę, że istnieje sesja in_progress (karta `ResumeSessionCard`)
- ✅ Automatyczne wyświetlenie karty wznowienia zamiast listy planów, gdy istnieje sesja in_progress
- **Lokalizacja**: 
  - Backend: `src/services/workout-sessions.ts:startWorkoutSessionService`
  - Frontend: 
    - `src/app/(app)/workout-sessions/start/page.tsx` - logika wyświetlania karty wznowienia
    - `src/components/workout-sessions/start/resume-session-card.tsx` - komponent karty z komunikatem i opcjami wznowienia/anulowania

### 1.2 Częściowo zaimplementowane funkcjonalności ⚠️

#### US-031: Timer globalny sesji
**Status**: ⚠️ Częściowo zaimplementowane

**Zaimplementowane**:
- ✅ Timer startuje przy rozpoczęciu sesji
- ✅ Pause zatrzymuje timer, a wznowienie kontynuuje od zatrzymanego czasu
- ✅ Wyświetlony jest czas globalny (sumaryczny) całej sesji

**Brakuje**:
- ❌ Wyjście z aktywnego asystenta trening zatrzymuje timer
- ❌ Tylko w momencie otwartego asystenta treningu w aplikacji timer odlicza czas

**Lokalizacja**: `src/components/workout-sessions/assistant/workout-timer.tsx`

**Problemy**:
- Timer liczy czas od `started_at` bez przerw na wyjście z aplikacji
- Brak mechanizmu zatrzymywania timera przy opuszczeniu strony/komponentu
- Brak synchronizacji z backendem dla zapisu czasu pauzy

### 1.3 Brakujące funkcjonalności ❌

#### US-031: Timer ćwiczenia
**Status**: ❌ Nie zaimplementowane

**Wymagania**:
- ❌ Timer startuje przy rozpoczęciu setu ćwiczeń i odlicza od planowanego czasu do 0
- ❌ Jeśli ćwiczenie posiada planowane 20 sekund w jednej serii to czas odlicza się od 20 do 0
- ❌ Przerwa pomiędzy ćwiczeniami odliczana jest od planowanego czasu odpoczynku pomiędzy seriami do 0
- ❌ Po zakończeniu planowanych serii odliczany jest czas odpoczynku po zakończonych seriach do 0
- ❌ Pause zatrzymuje timer, a wznowienie kontynuuje od zatrzymanego czasu
- ❌ Wyjście z aktywnego asystenta trening zatrzymuje timer
- ❌ Tylko w momencie otwartego asystenta treningu w aplikacji timer odlicza czas
- ❌ Wyświetlony jest czas dla danej serii ćwiczenia lub odpoczynku z nim związanym
- ❌ Dla ćwiczeń które nie posiadają planowanych wartości w sekundach, ale w liczbie powtórzeń, w miejscu timera aktualnej serii wyświetlana jest liczba powtórzeń
- ❌ Przejście od wykonywania powtórzeń do odliczania odpoczynku odbywa się poprzez naciśnięcie dodatkowego przycisku OK umieszczonego przy bieżącej liczbie powtórzeń ćwiczenia

**Lokalizacja**: Brak implementacji

---

## 2. Szczegółowy plan aktualizacji

### 2.1 Priorytet 1: Timer ćwiczenia (US-031)

#### 2.1.1 Analiza wymagań

**Stany timera ćwiczenia**:
1. **Wykonywanie serii** (jeśli `planned_duration_seconds` > 0):
   - Odliczanie od `planned_duration_seconds` do 0
   - Wyświetlanie pozostałego czasu
2. **Wykonywanie powtórzeń** (jeśli `planned_reps` > 0 i `planned_duration_seconds` === null):
   - Wyświetlanie liczby powtórzeń (nie odliczanie)
   - Przycisk "OK" do przejścia do odpoczynku
3. **Odpoczynek między seriami** (jeśli `planned_rest_seconds` > 0):
   - Odliczanie od `planned_rest_seconds` do 0
   - Automatyczne przejście do następnej serii po zakończeniu
4. **Odpoczynek po zakończonych seriach** (jeśli `planned_rest_after_series_seconds` > 0):
   - Odliczanie od `planned_rest_after_series_seconds` do 0
   - Automatyczne przejście do następnego ćwiczenia po zakończeniu

**Zachowanie timera**:
- Timer działa tylko gdy asystent jest otwarty (komponent zamontowany)
- Timer zatrzymuje się przy wyjściu z asystenta
- Timer zatrzymuje się przy pause i wznawia przy resume
- Timer automatycznie przechodzi między stanami

#### 2.1.2 Implementacja

**Krok 1: Rozszerzenie stanu komponentu WorkoutSessionAssistant**

```typescript
// Nowe stany dla timera ćwiczenia
type ExerciseTimerState = 
  | { type: 'waiting' }
  | { type: 'set_countdown'; setNumber: number; remainingSeconds: number }
  | { type: 'reps_display'; setNumber: number; reps: number }
  | { type: 'rest_between_sets'; remainingSeconds: number }
  | { type: 'rest_after_series'; remainingSeconds: number };

// Rozszerzenie stanu głównego komponentu
const [exerciseTimerState, setExerciseTimerState] = useState<ExerciseTimerState>({ type: 'waiting' });
const [currentSetNumber, setCurrentSetNumber] = useState(1);
```

**Krok 2: Utworzenie komponentu ExerciseTimer**

**Plik**: `src/components/workout-sessions/assistant/exercise-timer.tsx`

**Funkcjonalności**:
- Odliczanie czasu dla serii (od `planned_duration_seconds` do 0)
- Wyświetlanie liczby powtórzeń z przyciskiem "OK" dla ćwiczeń opartych na powtórzeniach
- Odliczanie przerwy między seriami (od `planned_rest_seconds` do 0)
- Odliczanie przerwy po seriach (od `planned_rest_after_series_seconds` do 0)
- Obsługa pause/resume
- Automatyczne przejścia między stanami
- Zatrzymywanie przy unmount (wyjście z asystenta)

**Props**:
```typescript
type ExerciseTimerProps = {
  exercise: SessionExerciseDTO;
  currentSetNumber: number;
  isPaused: boolean;
  onSetComplete: () => void; // Wywoływane po zakończeniu serii
  onRestBetweenComplete: () => void; // Wywoływane po zakończeniu przerwy między seriami
  onRestAfterSeriesComplete: () => void; // Wywoływane po zakończeniu przerwy po seriach
  onRepsComplete: () => void; // Wywoływane po kliknięciu OK przy powtórzeniach
};
```

**Krok 3: Integracja ExerciseTimer z WorkoutSessionAssistant**

**Zmiany w `workout-session-assistant.tsx`**:
1. Dodanie stanu `exerciseTimerState` i `currentSetNumber`
2. Logika przejść między stanami timera:
   - Przy zmianie ćwiczenia: reset timera, rozpoczęcie od pierwszej serii
   - Po zakończeniu serii: sprawdzenie czy są kolejne serie → przerwa między seriami lub przerwa po seriach
   - Po zakończeniu przerwy między seriami: przejście do następnej serii
   - Po zakończeniu przerwy po seriach: automatyczne przejście do następnego ćwiczenia (lub wyświetlenie formularza)
3. Obsługa pause/resume dla timera ćwiczenia
4. Cleanup przy unmount (zatrzymanie timera)

**Krok 4: Aktualizacja WorkoutTimer**

**Zmiany w `workout-timer.tsx`**:
- Timer globalny powinien być widoczny obok timera ćwiczenia
- Timer globalny pokazuje sumaryczny czas sesji
- Timer globalny zatrzymuje się przy unmount

**Krok 5: UI/UX dla timera ćwiczenia**

**Scenariusz 1: Ćwiczenie z czasem (planned_duration_seconds > 0)**
```
[Ćwiczenie: Przysiady]
[Seria 1]
[Timer: 20 → 19 → 18 → ... → 0]
[Automatyczne przejście do przerwy]
```

**Scenariusz 2: Ćwiczenie z powtórzeniami (planned_reps > 0, planned_duration_seconds === null)**
```
[Ćwiczenie: Przysiady]
[Seria 1]
[Powtórzenia: 15]
[Przycisk: OK]
[Po kliknięciu OK → przerwa]
```

**Scenariusz 3: Przerwa między seriami**
```
[Przerwa między seriami]
[Timer: 60 → 59 → 58 → ... → 0]
[Automatyczne przejście do następnej serii]
```

**Scenariusz 4: Przerwa po seriach**
```
[Przerwa po zakończonych seriach]
[Timer: 120 → 119 → 118 → ... → 0]
[Automatyczne przejście do następnego ćwiczenia]
```

#### 2.1.3 Szczegóły techniczne

**Hook do zarządzania timerem ćwiczenia**:
```typescript
// src/hooks/use-exercise-timer.ts
function useExerciseTimer(
  exercise: SessionExerciseDTO,
  currentSetNumber: number,
  isPaused: boolean,
  onSetComplete: () => void,
  onRestBetweenComplete: () => void,
  onRestAfterSeriesComplete: () => void
) {
  // Logika timera
}
```

**Zarządzanie stanem**:
- Użycie `useState` dla stanu timera
- Użycie `useEffect` z `setInterval` dla odliczania
- Cleanup przy unmount
- Obsługa pause/resume

**Synchronizacja z formularzem**:
- Timer automatycznie przechodzi do następnej serii
- Formularz aktualizuje `currentSetNumber`
- Po zakończeniu wszystkich serii, timer przechodzi do przerwy po seriach

### 2.2 Priorytet 2: Ulepszenie timera globalnego (US-031)

#### 2.2.1 Wymagania

- Timer zatrzymuje się przy wyjściu z asystenta (unmount komponentu)
- Timer działa tylko gdy asystent jest otwarty
- Timer pokazuje sumaryczny czas sesji (nie tylko czas od `started_at`)

#### 2.2.2 Implementacja

**Krok 1: Zapis czasu aktywnego w backendzie**

**Nowe pole w bazie danych** (jeśli nie istnieje):
- `active_duration_seconds` - suma czasu, gdy timer działał (asystent był otwarty i nie był w pauzie)
- `last_timer_started_at` - timestamp ostatniego uruchomienia timera (przy starcie sesji lub resume)
- `last_timer_stopped_at` - timestamp ostatniego zatrzymania timera (przy pause lub wyjściu)

**Uzasadnienie**:
- Czas aktywny pokazuje rzeczywisty czas treningu (bez pauz i przerw)
- Łatwiej sumować okresy aktywności niż odejmować pauzy
- Zgodne z wymaganiami: timer działa tylko gdy asystent jest otwarty

**Krok 2: Aktualizacja WorkoutTimer**

**Zmiany**:
1. Zatrzymywanie timera przy unmount komponentu
2. Zapis czasu aktywnego do backendu przy wyjściu (suma czasu od ostatniego startu)
3. Zapis czasu aktywnego przy pause (suma czasu od ostatniego startu)
4. Wyświetlanie sumarycznego czasu aktywnego (nie czasu od `started_at`)

**Krok 3: API endpoint do aktualizacji czasu sesji**

**Nowy endpoint**: `PATCH /api/workout-sessions/[id]/timer`
```typescript
{
  active_duration_seconds?: number; // Dodaj do istniejącej wartości
  last_timer_started_at?: string;
  last_timer_stopped_at?: string;
}
```

**Logika**:
- Przy starcie/resume: zapisz `last_timer_started_at`, nie zmieniaj `active_duration_seconds`
- Przy pause/wyjściu: oblicz różnicę między `last_timer_started_at` a teraz, dodaj do `active_duration_seconds`, zapisz `last_timer_stopped_at`

**Krok 4: Cleanup przy unmount**

```typescript
useEffect(() => {
  return () => {
    // Zapis czasu aktywnego przed wyjściem
    const elapsedSinceLastStart = Date.now() - lastTimerStartedAt;
    saveActiveDuration(elapsedSinceLastStart);
  };
}, []);
```

### 2.3 Priorytet 3: Ulepszenie blokady startu nowej sesji (US-042)

#### 2.3.1 Status

**✅ Zaimplementowane**: Funkcjonalność jest już w pełni zaimplementowana.

**Obecna implementacja**:
- Strona `/workout-sessions/start` automatycznie wykrywa istniejącą sesję `in_progress`
- Wyświetla kartę `ResumeSessionCard` z komunikatem: "Masz rozpoczętą sesję treningową, którą możesz wznowić"
- Karta zawiera szczegóły sesji (plan, data rozpoczęcia, postęp)
- Użytkowniczka może wznowić sesję lub ją anulować

**Lokalizacja**:
- `src/app/(app)/workout-sessions/start/page.tsx` - logika wykrywania i wyświetlania
- `src/components/workout-sessions/start/resume-session-card.tsx` - komponent karty

**Uwaga**: Ta funkcjonalność nie wymaga dalszych zmian. Można pominąć w planie implementacji.

### 2.4 Priorytet 4: Refaktoryzacja i optymalizacja

#### 2.4.1 Rozdzielenie odpowiedzialności

**WorkoutTimer** - tylko timer globalny sesji
**ExerciseTimer** - timer ćwiczenia (nowy komponent)

#### 2.4.2 Optymalizacja wydajności

- Użycie `useMemo` dla obliczeń
- Użycie `useCallback` dla handlerów
- Unikanie niepotrzebnych re-renderów

#### 2.4.3 Testy

- Testy jednostkowe dla logiki timera
- Testy integracyjne dla przejść między stanami
- Testy E2E dla pełnego flow sesji

---

## 3. Kolejność implementacji

### Faza 1: Timer ćwiczenia (Priorytet 1)
1. ✅ Utworzenie komponentu `ExerciseTimer`
2. ✅ Implementacja logiki odliczania dla serii
3. ✅ Implementacja wyświetlania powtórzeń z przyciskiem OK
4. ✅ Implementacja odliczania przerwy między seriami
5. ✅ Implementacja odliczania przerwy po seriach
6. ✅ Integracja z `WorkoutSessionAssistant`
7. ✅ Obsługa pause/resume
8. ✅ Cleanup przy unmount

### Faza 2: Ulepszenie timera globalnego (Priorytet 2)
1. ✅ Aktualizacja `WorkoutTimer` - zatrzymywanie przy unmount
2. ✅ Implementacja zapisu czasu pauzy
3. ✅ API endpoint do aktualizacji czasu sesji
4. ✅ Obliczanie sumarycznego czasu z uwzględnieniem pauz

### Faza 3: Blokada startu nowej sesji (Priorytet 3)
**Status**: ✅ Zaimplementowane - nie wymaga zmian

**Uwaga**: Funkcjonalność jest już w pełni zaimplementowana w `src/app/(app)/workout-sessions/start/page.tsx` i `src/components/workout-sessions/start/resume-session-card.tsx`. Faza 3 może zostać pominięta.

### Faza 4: Refaktoryzacja i testy (Priorytet 4)
1. ✅ Refaktoryzacja komponentów
2. ✅ Optymalizacja wydajności
3. ✅ Testy jednostkowe
4. ✅ Testy integracyjne

---

## 4. Szczegółowe kroki implementacji

### 4.1 Krok 1: Utworzenie komponentu ExerciseTimer

**Plik**: `src/components/workout-sessions/assistant/exercise-timer.tsx`

**Funkcjonalności**:
- Odliczanie czasu dla serii
- Wyświetlanie powtórzeń z przyciskiem OK
- Odliczanie przerwy między seriami
- Odliczanie przerwy po seriach
- Obsługa pause/resume
- Automatyczne przejścia między stanami

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

**Stany**:
- `waiting` - oczekiwanie na rozpoczęcie
- `set_countdown` - odliczanie czasu serii
- `reps_display` - wyświetlanie powtórzeń
- `rest_between_sets` - odliczanie przerwy między seriami
- `rest_after_series` - odliczanie przerwy po seriach

### 4.2 Krok 2: Hook useExerciseTimer

**Plik**: `src/hooks/use-exercise-timer.ts`

**Funkcjonalności**:
- Zarządzanie stanem timera
- Logika odliczania
- Obsługa pause/resume
- Cleanup przy unmount

### 4.3 Krok 3: Integracja z WorkoutSessionAssistant

**Zmiany w `workout-session-assistant.tsx`**:
1. Dodanie stanu `exerciseTimerState` i `currentSetNumber`
2. Logika przejść między stanami
3. Integracja z formularzem
4. Obsługa pause/resume

### 4.4 Krok 4: Aktualizacja WorkoutTimer

**Zmiany w `workout-timer.tsx`**:
1. Zatrzymywanie przy unmount
2. Zapis czasu pauzy
3. Obliczanie sumarycznego czasu

### 4.5 Krok 5: API endpoint do aktualizacji czasu sesji

**Plik**: `src/app/api/workout-sessions/[id]/timer/route.ts`

**Endpoint**: `PATCH /api/workout-sessions/[id]/timer`

**Body**:
```typescript
{
  active_duration_seconds?: number; // Dodaj do istniejącej wartości
  last_timer_started_at?: string;
  last_timer_stopped_at?: string;
}
```

**Logika endpointu**:
- Jeśli `active_duration_seconds` jest podane, dodaj do istniejącej wartości w bazie
- Zaktualizuj `last_timer_started_at` lub `last_timer_stopped_at` w zależności od akcji

### 4.6 Krok 6: Aktualizacja handleStartWorkout

**Status**: ✅ Zaimplementowane

**Uwaga**: Funkcjonalność jest już zaimplementowana. Strona `/workout-sessions/start` automatycznie wykrywa i wyświetla istniejącą sesję `in_progress` poprzez komponent `ResumeSessionCard`. Nie wymaga zmian.

---

## 5. Uwagi techniczne

### 5.1 Zarządzanie stanem timera

- Użycie `useState` dla stanu timera
- Użycie `useRef` dla wartości które nie wymagają re-renderu
- Użycie `useEffect` z cleanup dla intervalów

### 5.2 Synchronizacja z backendem

- Zapis czasu aktywnego przy wyjściu z asystenta (suma czasu od ostatniego startu)
- Zapis czasu aktywnego przy pause (suma czasu od ostatniego startu)
- Aktualizacja `last_timer_started_at` przy resume
- Sumowanie wszystkich okresów aktywności w `active_duration_seconds`

### 5.3 Obsługa edge cases

- Sesja zakończona przez inny klient
- Błąd sieci podczas zapisu
- Przerwanie sesji podczas odliczania
- Zmiana ćwiczenia podczas odliczania przerwy

### 5.4 Wydajność

- Unikanie niepotrzebnych re-renderów
- Użycie `useMemo` i `useCallback`
- Optymalizacja intervalów (co sekundę, nie częściej)

---

## 6. Testy

### 6.1 Testy jednostkowe

- Testy logiki timera
- Testy przejść między stanami
- Testy obliczeń czasu

### 6.2 Testy integracyjne

- Testy pełnego flow sesji
- Testy pause/resume
- Testy wyjścia z asystenta

### 6.3 Testy E2E

- Testy pełnej sesji treningowej
- Testy różnych typów ćwiczeń
- Testy różnych scenariuszy pauzy

---

## 7. Dokumentacja

### 7.1 Dokumentacja komponentów

- JSDoc dla wszystkich komponentów
- Opis props i stanów
- Przykłady użycia

### 7.2 Dokumentacja API

- Opis endpointów
- Przykłady requestów i odpowiedzi
- Obsługa błędów

---

## 8. Podsumowanie

### 8.1 Status implementacji

- ✅ **Zaimplementowane**: 12/15 user stories
- ⚠️ **Częściowo zaimplementowane**: 1/15 user stories (US-031: Timer globalny)
- ❌ **Brakuje**: 2/15 user stories (US-031: Timer ćwiczenia - duplikat ID w PRD)



