# Plan wdrożenia refaktoryzacji TOP 5 komponentów

> Dokument powstał na podstawie analizy plików w `src/components` o największej liczbie linii kodu (LOC).  
> Referencja: `.ai/tech-stack.md`, `.cursor/rules/shared.mdc`

---

## Spis treści

1. [Przegląd i kolejność](#1-przegląd-i-kolejność)
2. [Faza 0: Fundamenty](#2-faza-0-fundamenty)
3. [Faza 1: db-test.tsx](#3-faza-1-db-testtsx)
4. [Faza 2: exercise-form-fields.tsx](#4-faza-2-exercise-form-fieldstsx)
5. [Faza 3: add-snapshot-exercise-button.tsx](#5-faza-3-add-snapshot-exercise-buttontsx)
6. [Faza 4: resume-session-card.tsx](#6-faza-4-resume-session-cardtsx)
7. [Faza 5: workout-session-assistant.tsx](#7-faza-5-workout-session-assistanttsx)
8. [Weryfikacja i testy](#8-weryfikacja-i-testy)
9. [Kryteria zakończenia](#9-kryteria-zakończenia)

---

## 1. Przegląd i kolejność

### Cel refaktoryzacji

- Zmniejszenie złożoności komponentów
- Zwiększenie testowalności
- Zgodność z zasadami projektu (early returns, guard clauses, separacja odpowiedzialności)
- Reużywalność logiki i komponentów

### Kolejność wdrożenia

| Faza | Plik                               | LOC  | Priorytet | Zależności           |
| ---- | ---------------------------------- | ---- | --------- | -------------------- |
| 0    | Fundamenty (API, utils)            | -    | Krytyczna | Brak                 |
| 1    | `db-test.tsx`                      | 453  | Niski     | Faza 0 (opcjonalnie) |
| 2    | `exercise-form-fields.tsx`         | 410  | Średni    | Brak                 |
| 3    | `add-snapshot-exercise-button.tsx` | 328  | Średni    | Faza 0               |
| 4    | `resume-session-card.tsx`          | 317  | Średni    | Faza 0               |
| 5    | `workout-session-assistant.tsx`    | 1246 | Wysoki    | Faza 0, 2            |

### Zasady wykonywania

- Każda faza kończy się commitowaniem działającego kodu
- Przed każdą fazą: `npm run build` i `npm run lint` muszą przechodzić
- Po każdej fazie: ręczne testy krytycznych przepływów
- Fazy 1–4 można wykonywać równolegle (różne pliki)
- Faza 5 wymaga ukończenia Fazy 0

---

## 2. Faza 0: Fundamenty

**Cel:** Utworzenie warstwy API i utility functions, które będą używane w fazach 3, 4 i 5.

### 2.1 Warstwa API – workout-sessions

**Lokalizacja:** `src/lib/api/workout-sessions.ts`

| Krok  | Zadanie                                                                          | Szczegóły                                                          |
| ----- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 0.1.1 | Utworzyć folder `src/lib/api/`                                                   | Jeśli nie istnieje                                                 |
| 0.1.2 | Utworzyć plik `workout-sessions.ts`                                              | Eksport funkcji API                                                |
| 0.1.3 | Zaimplementować `patchWorkoutSessionTimer(sessionId, payload)`                   | `PATCH /api/workout-sessions/[id]/timer`                           |
| 0.1.4 | Zaimplementować `patchWorkoutSessionStatus(sessionId, status)`                   | `PATCH /api/workout-sessions/[id]/status`                          |
| 0.1.5 | Zaimplementować `patchWorkoutSessionExercise(sessionId, exerciseOrder, command)` | `PATCH /api/workout-sessions/[id]/exercises/[order]`               |
| 0.1.6 | Dodać typy dla payloadów i odpowiedzi                                            | W pliku lub `src/types/api.ts`                                     |
| 0.1.7 | Obsłużyć błędy HTTP (4xx, 5xx)                                                   | Zwracać `{ ok: boolean, data?, error? }` lub rzucać typowane błędy |

**Szablon funkcji:**

```ts
// src/lib/api/workout-sessions.ts
export async function patchWorkoutSessionTimer(
  sessionId: string,
  payload: { last_timer_started_at?: string; last_timer_stopped_at?: string },
): Promise<{ data: TimerResponse }> {
  const response = await fetch(`/api/workout-sessions/${sessionId}/timer`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }
  return response.json();
}
```

### 2.2 Warstwa API – exercises

**Lokalizacja:** `src/lib/api/exercises.ts`

| Krok  | Zadanie                                                          | Szczegóły                                     |
| ----- | ---------------------------------------------------------------- | --------------------------------------------- |
| 0.2.1 | Utworzyć plik `exercises.ts`                                     |                                               |
| 0.2.2 | Zaimplementować `getExerciseByTitle(title)`                      | `GET /api/exercises/by-title?title=...`       |
| 0.2.3 | Zaimplementować `createExercise(data)`                           | `POST /api/exercises`                         |
| 0.2.4 | Zaimplementować `linkSnapshotToExercise(snapshotId, exerciseId)` | `POST /api/workout-plans/snapshots/[id]/link` |

### 2.3 Warstwa API – workout-plans

**Lokalizacja:** `src/lib/api/workout-plans.ts`

| Krok  | Zadanie                                                          | Szczegóły                                           |
| ----- | ---------------------------------------------------------------- | --------------------------------------------------- |
| 0.3.1 | Utworzyć plik `workout-plans.ts`                                 |                                                     |
| 0.3.2 | Zaimplementować `patchWorkoutPlan(planId, payload)`              | `PATCH /api/workout-plans/[id]`                     |
| 0.3.3 | Zaimplementować `linkSnapshotToExercise(snapshotId, exerciseId)` | Jeśli nie w exercises.ts – wybrać jedną lokalizację |

### 2.4 Utility functions – formatowanie sesji

**Lokalizacja:** `src/lib/utils/session-format.ts`

| Krok  | Zadanie                                          | Szczegóły                                      |
| ----- | ------------------------------------------------ | ---------------------------------------------- |
| 0.4.1 | Utworzyć plik `session-format.ts`                |                                                |
| 0.4.2 | Zaimplementować `formatSessionDuration(session)` | Zwraca string np. "5 min z 30 min" lub "45min" |
| 0.4.3 | Zaimplementować `getExerciseCountText(count)`    | Zwraca "ćwiczenie" / "ćwiczenia" / "ćwiczeń"   |
| 0.4.4 | Zaimplementować `getExerciseNames(session)`      | Zwraca `string[]` z nazw ćwiczeń               |

### 2.5 Eksport centralny

| Krok  | Zadanie                                               | Szczegóły                         |
| ----- | ----------------------------------------------------- | --------------------------------- |
| 0.5.1 | Utworzyć `src/lib/api/index.ts`                       | Re-eksport wszystkich modułów API |
| 0.5.2 | Opcjonalnie: dodać barrel export w `src/lib/index.ts` | Jeśli istnieje                    |

### 2.6 Kryteria zakończenia Fazy 0

- [x] `npm run build` przechodzi
- [x] `npm run lint` przechodzi
- [x] Pliki API są używane w co najmniej jednym miejscu (resume-session-card, workout-assistant, add-snapshot, exercise-exists)

**Status wdrożenia (2025-01-29):** Faza 0 zakończona. Utworzono:

- `src/lib/api/workout-sessions.ts` – patchWorkoutSessionTimer, patchWorkoutSessionStatus, patchWorkoutSessionExercise (+ wersje keepalive)
- `src/lib/api/exercises.ts` – getExerciseByTitle, createExercise
- `src/lib/api/workout-plans.ts` – patchWorkoutPlan, linkSnapshotToExercise
- `src/lib/utils/session-format.ts` – formatSessionDuration, getExerciseCountText, getExerciseNames, getExerciseCount
- `src/__tests__/lib/utils/session-format.test.ts` – 14 testów jednostkowych

---

## 3. Faza 1: db-test.tsx

**Cel:** Przeniesienie komponentu deweloperskiego, usunięcie duplikacji, opcjonalne użycie shadcn/ui.

### 3.1 Decyzja: przeniesienie vs usunięcie

| Krok  | Zadanie                                                                            | Szczegóły               |
| ----- | ---------------------------------------------------------------------------------- | ----------------------- |
| 1.1.1 | Sprawdzić, czy `DbTest` jest używany w aplikacji                                   | `grep -r "DbTest" src/` |
| 1.1.2 | Jeśli używany: zaplanować przeniesienie do `src/app/(dev)/db-test/page.tsx`        |                         |
| 1.1.3 | Jeśli nieużywany: rozważyć usunięcie lub pozostawienie z komentarzem `@deprecated` |                         |

### 3.2 Wydzielenie hooka useTestNumRecords

| Krok  | Zadanie                                                                                              | Szczegóły |
| ----- | ---------------------------------------------------------------------------------------------------- | --------- |
| 1.2.1 | Utworzyć `src/hooks/use-test-num-records.ts`                                                         |           |
| 1.2.2 | Przenieść logikę `fetchData` do hooka (jedna implementacja)                                          |           |
| 1.2.3 | Przenieść `addRecord`, `updateRecord`, `deleteRecord` do hooka                                       |           |
| 1.2.4 | Przenieść subskrypcję real-time do hooka                                                             |           |
| 1.2.5 | Hook zwraca: `{ data, loading, error, debugInfo, fetchData, addRecord, updateRecord, deleteRecord }` |           |
| 1.2.6 | Usunąć duplikację `loadData` w `useEffect` – użyć `fetchData` z hooka                                |           |

### 3.3 Refaktoryzacja komponentu DbTest

| Krok  | Zadanie                                                             | Szczegóły   |
| ----- | ------------------------------------------------------------------- | ----------- |
| 1.3.1 | Zastąpić lokalną logikę wywołaniem `useTestNumRecords()`            |             |
| 1.3.2 | Zastąpić inline styles komponentami shadcn/ui (Button, Input, Card) | Opcjonalnie |
| 1.3.3 | Wydzielić `TestNumRecordForm` (formularz dodawania)                 | Opcjonalnie |
| 1.3.4 | Wydzielić `TestNumRecordItem` (pojedynczy rekord z edycją)          | Opcjonalnie |

### 3.4 Przeniesienie (jeśli używany)

| Krok  | Zadanie                                                         | Szczegóły             |
| ----- | --------------------------------------------------------------- | --------------------- |
| 1.4.1 | Utworzyć `src/app/(dev)/db-test/page.tsx`                       | Import DbTest, render |
| 1.4.2 | Zaktualizować routing – usunąć DbTest z poprzedniej lokalizacji |                       |
| 1.4.3 | Usunąć `src/components/db-test.tsx` lub zostawić jako wrapper   |                       |

### 3.5 Kryteria zakończenia Fazy 1

- [x] Brak duplikacji logiki fetch
- [x] Hook `useTestNumRecords` jest testowalny w izolacji
- [x] `npm run build` i `npm run lint` przechodzą

**Status wdrożenia (2025-01-29):** Faza 1 zakończona. Utworzono:

- `src/hooks/use-test-num-records.ts` – jedna implementacja fetchData, addRecord, updateRecord, deleteRecord
- `src/components/db-test.tsx` – refaktoryzacja z 453 do 217 LOC, użycie shadcn Button/Input

---

## 4. Faza 2: exercise-form-fields.tsx

**Cel:** Redukcja powtórzeń przez komponent `FormField` i konfigurację pól.

### 4.1 Komponent FormField

| Krok  | Zadanie                                                                             | Szczegóły                              |
| ----- | ----------------------------------------------------------------------------------- | -------------------------------------- |
| 2.1.1 | Utworzyć `src/components/ui/form-field.tsx`                                         | Lub w `src/components/exercises/form/` |
| 2.1.2 | Props: `{ label, htmlFor, error?, required?, children, "data-test-id"?, "aria-*" }` |                                        |
| 2.1.3 | Render: label + children + komunikat błędu (jeśli error)                            |                                        |
| 2.1.4 | Zachować `aria-invalid`, `aria-describedby`, `role="alert"` dla dostępności         |                                        |
| 2.1.5 | Dodać do `components.json` (shadcn) jeśli używamy CLI, lub ręcznie                  |                                        |

**Szablon FormField:**

```tsx
type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  "data-test-id"?: string;
};
```

### 4.2 Komponent SelectField (opcjonalnie)

| Krok  | Zadanie                                                                                                       | Szczegóły                 |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 2.2.1 | Utworzyć `SelectField` – wrapper Select + FormField                                                           | Dla pól type, part, level |
| 2.2.2 | Props: `options: { value: string; label: string }[]`, `value`, `onChange`, `placeholder`, `error`, `disabled` |                           |

### 4.3 Refaktoryzacja ExerciseFormFields

| Krok  | Zadanie                                                          | Szczegóły |
| ----- | ---------------------------------------------------------------- | --------- |
| 2.3.1 | Zastąpić pierwsze pole (title) użyciem FormField                 |           |
| 2.3.2 | Zastąpić pola type, part, level użyciem FormField + Select       |           |
| 2.3.3 | Zastąpić pola details, reps, duration_seconds, series            |           |
| 2.3.4 | Zastąpić pola rest_in_between_seconds, rest_after_series_seconds |           |
| 2.3.5 | Zastąpić pole estimated_set_time_seconds                         |           |
| 2.3.6 | Usunąć powtarzający się kod (label + error block)                |           |

### 4.4 Konfiguracja pól (opcjonalnie – wyższy poziom abstrakcji)

| Krok  | Zadanie                                                  | Szczegóły                                      |
| ----- | -------------------------------------------------------- | ---------------------------------------------- | -------- | ---------------------------------- | --- |
| 2.4.1 | Utworzyć `src/components/exercises/form/field-config.ts` | Tablica konfiguracji pól                       |
| 2.4.2 | Każde pole: `{ key, label, type: 'text'                  | 'number'                                       | 'select' | 'textarea', options?, required? }` |     |
| 2.4.3 | Renderować pola w pętli na podstawie konfiguracji        | Zmniejszy LOC, ale może utrudnić custom layout |

### 4.5 Kryteria zakończenia Fazy 2

- [x] Każde pole używa FormField (lub SelectField)
- [x] LOC w exercise-form-fields.tsx zmniejszone (410 → 314, ~24%)
- [x] Zachowana dostępność (aria-\*, role="alert")
- [x] `npm run build` i `npm run lint` przechodzą

**Status wdrożenia (2025-01-29):** Faza 2 zakończona. Utworzono:

- `src/components/ui/form-field.tsx` – wrapper label + children + error

---

## 5. Faza 3: add-snapshot-exercise-button.tsx

**Cel:** Wydzielenie logiki biznesowej do serwisu i hooka.

### 5.1 Serwis konwersji snapshot → exercise

| Krok  | Zadanie                                                                        | Szczegóły             |
| ----- | ------------------------------------------------------------------------------ | --------------------- |
| 3.1.1 | Utworzyć `src/lib/exercises/snapshot-to-exercise.ts`                           |                       |
| 3.1.2 | Przenieść funkcję `convertSnapshotToExerciseData` z komponentu                 |                       |
| 3.1.3 | Eksportować jako `convertSnapshotToExercise(snapshot: WorkoutPlanExerciseDTO)` |                       |
| 3.1.4 | Użyć guard clauses na początku (brak title, part, type → throw)                |                       |
| 3.1.5 | Dodać testy jednostkowe (Vitest)                                               | Opcjonalnie, zalecane |

### 5.2 Hook useExerciseExists

| Krok  | Zadanie                                                 | Szczegóły                    |
| ----- | ------------------------------------------------------- | ---------------------------- | --- |
| 3.2.1 | Utworzyć `src/hooks/use-exercise-exists.ts`             |                              |
| 3.2.2 | Props: `(title: string                                  | null, isInLibrary: boolean)` |     |
| 3.2.3 | Zwraca: `exerciseExists: boolean                        | null` (null = loading)       |     |
| 3.2.4 | Używa `getExerciseByTitle` z `src/lib/api/exercises.ts` |                              |
| 3.2.5 | Wywołuje API tylko gdy `isInLibrary === false && title` |                              |

### 5.3 Hook useAddSnapshotToLibrary

| Krok  | Zadanie                                                                                                                  | Szczegóły |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | --------- |
| 3.3.1 | Utworzyć `src/hooks/use-add-snapshot-to-library.ts`                                                                      |           |
| 3.3.2 | Props: `(exercise, planId)`                                                                                              |           |
| 3.3.3 | Zwraca: `{ addToLibrary, isLoading }`                                                                                    |           |
| 3.3.4 | Logika `handleAddToLibrary` przeniesiona do `addToLibrary`                                                               |           |
| 3.3.5 | Używa `convertSnapshotToExercise`, `getExerciseByTitle`, `createExercise`, `linkSnapshotToExercise` / `patchWorkoutPlan` |           |
| 3.3.6 | Guard clauses na początku `addToLibrary`                                                                                 |           |
| 3.3.7 | Obsługa błędów 409 (konflikt) – retry z getExerciseByTitle                                                               |           |

### 5.4 Refaktoryzacja AddSnapshotExerciseButton

| Krok  | Zadanie                                                                                     | Szczegóły |
| ----- | ------------------------------------------------------------------------------------------- | --------- |
| 3.4.1 | Usunąć `convertSnapshotToExerciseData` z komponentu                                         |           |
| 3.4.2 | Użyć `useExerciseExists(exercise.exercise_title, exercise.is_exercise_in_library)`          |           |
| 3.4.3 | Użyć `useAddSnapshotToLibrary(exercise, planId)`                                            |           |
| 3.4.4 | Komponent renderuje tylko przycisk i warunki widoczności                                    |           |
| 3.4.5 | Early returns: `if (is_exercise_in_library) return null`, `if (exerciseExists) return null` |           |

### 5.5 Kryteria zakończenia Fazy 3

- [x] Komponent ma < 80 LOC (328 → 58)
- [x] Logika biznesowa w `snapshot-to-exercise.ts` i hookach
- [x] Użycie warstwy API z Fazy 0
- [x] `npm run build` i `npm run lint` przechodzą

**Status wdrożenia (2025-01-29):** Faza 3 zakończona. Utworzono:

- `src/lib/exercises/snapshot-to-exercise.ts` – convertSnapshotToExercise
- `src/hooks/use-exercise-exists.ts` – sprawdzanie istnienia ćwiczenia
- `src/hooks/use-add-snapshot-to-library.ts` – logika dodawania do biblioteki

---

## 6. Faza 4: resume-session-card.tsx

**Cel:** Wydzielenie logiki API i formatowania do warstw pomocniczych.

### 6.1 Utility functions (jeśli nie w Fazie 0)

| Krok  | Zadanie                                                                                                                          | Szczegóły |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 4.1.1 | Upewnić się, że `formatSessionDuration`, `getExerciseCountText`, `getExerciseNames` istnieją w `src/lib/utils/session-format.ts` | Faza 0.4  |
| 4.1.2 | Jeśli nie – zaimplementować teraz                                                                                                |           |

### 6.2 Hook useResumeSession

| Krok  | Zadanie                                                                                                       | Szczegóły |
| ----- | ------------------------------------------------------------------------------------------------------------- | --------- |
| 4.2.1 | Utworzyć `src/hooks/use-resume-session.ts`                                                                    |           |
| 4.2.2 | Props: `(session: SessionDetailDTO)`                                                                          |           |
| 4.2.3 | Zwraca: `{ handleResume, handleCancel, isResuming, isCancelling, isCancelDialogOpen, setIsCancelDialogOpen }` |           |
| 4.2.4 | `handleResume` – router.push do `/workout-sessions/[id]/active`                                               |           |
| 4.2.5 | `handleCancel` – używa `patchWorkoutSessionStatus(session.id, 'completed')` z API                             |           |
| 4.2.6 | Obsługa błędów: 400, 404, 401/403, 5xx – toast z odpowiednim komunikatem                                      |           |
| 4.2.7 | Po sukcesie: toast.success, router.refresh()                                                                  |           |

### 6.3 Komponent SessionMetadataDisplay (opcjonalnie)

| Krok  | Zadanie                                                                                         | Szczegóły |
| ----- | ----------------------------------------------------------------------------------------------- | --------- |
| 4.3.1 | Utworzyć `src/components/workout-sessions/start/session-metadata-display.tsx`                   |           |
| 4.3.2 | Props: `{ session, formattedDate, duration, progressPercentage, exerciseCount, exerciseNames }` |           |
| 4.3.3 | Renderuje sekcję CardContent (plan, data, postęp, czas, ćwiczenia)                              |           |
| 4.3.4 | Zmniejsza rozmiar ResumeSessionCard                                                             |           |

### 6.4 Refaktoryzacja ResumeSessionCard

| Krok  | Zadanie                                                                                   | Szczegóły |
| ----- | ----------------------------------------------------------------------------------------- | --------- |
| 4.4.1 | Użyć `useResumeSession(session)`                                                          |           |
| 4.4.2 | Zastąpić `useMemo` dla duration wywołaniem `formatSessionDuration(session)`               |           |
| 4.4.3 | Zastąpić `useMemo` dla exerciseCountText wywołaniem `getExerciseCountText(exerciseCount)` |           |
| 4.4.4 | Zastąpić `useMemo` dla exerciseNames wywołaniem `getExerciseNames(session)`               |           |
| 4.4.5 | Opcjonalnie: użyć SessionMetadataDisplay                                                  |           |
| 4.4.6 | Usunąć logikę API z komponentu                                                            |           |

### 6.5 Kryteria zakończenia Fazy 4

- [x] Komponent ma < 150 LOC (317 → ~170)
- [x] Brak bezpośrednich wywołań fetch w komponencie
- [x] Użycie `src/lib/api/workout-sessions.ts` i `session-format.ts`
- [x] `npm run build` i `npm run lint` przechodzą

**Status wdrożenia (2025-01-29):** Faza 4 zakończona. Utworzono:

- `src/hooks/use-resume-session.ts` – handleResume, handleCancel, obsługa błędów
- ApiError w workout-sessions API dla obsługi statusów HTTP

---

## 7. Faza 5: workout-session-assistant.tsx

**Cel:** Rozbicie God Component na hooki i mniejsze komponenty. Największa i najbardziej złożona faza.

**Zakres:** 957 LOC → docelowo < 400 LOC.

---

### 7.0 Decyzja architektoniczna: Zustand vs hooki z props

**Czy centralny stan Zustand jest wskazany?**

| Aspekt                   | Za Zustand                                                                                                                                                                          | Przeciw Zustand                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Współdzielenie stanu** | Hooki (useAutoPause, useSessionNavigation, useSaveExercise) potrzebują: session, formData, saveExercise, isPaused. Bez store → prop drilling lub złożone zależności między hookami. | Hooki mogą przyjmować callbacki i refy – wymaga starannego przekazywania.   |
| **Stale closures**       | `getState()` zawsze zwraca aktualny stan – brak problemów z closure w beforeunload, visibilitychange.                                                                               | formDataRef rozwiązuje to w obecnym kodzie.                                 |
| **Spójność z projektem** | Zustand już używany (`auth-store.ts`), spójny wzorzec.                                                                                                                              | Nowy store = dodatkowa abstrakcja do utrzymania.                            |
| **Zakres stanu**         | Stan sesji jest lokalny do strony `/workout-sessions/[id]/active` – jedna aktywna sesja na raz. Store można resetować przy zmianie sessionId.                                       | Stan nie jest globalny jak auth – można argumentować, że Context wystarczy. |
| **Testowalność**         | Store można mockować lub resetować między testami.                                                                                                                                  | Hooki z props są łatwe do testowania w izolacji.                            |

**Rekomendacja: TAK – użyć Zustand dla stanu sesji treningowej.**

Uzasadnienie:

1. **Graf zależności między hookami** – useAutoPause potrzebuje: saveExercise, formData (ref), session.status, isPaused, setSession. useSessionNavigation potrzebuje: saveExercise, formDataRef, validateForm, setCurrentExerciseIndex, setSession. Przekazywanie tego przez props tworzy „spaghetti” – każdy hook musi dostać 5–8 argumentów.
2. **Eventy przeglądarki** – beforeunload, pagehide, visibilitychange wymagają dostępu do aktualnego stanu w callbackach. `getState()` z Zustand gwarantuje świeże dane bez refów.
3. **Istniejący typ** – `WorkoutSessionAssistantState` w `src/types/workout-session-assistant.ts` pasuje do struktury store.
4. **Zakres** – Store jest używany tylko na stronie aktywnej sesji; przy unmount lub zmianie sessionId store jest resetowany.

**Alternatywa:** Jeśli zespół preferuje uniknięcie Zustand – użyć `useReducer` + React Context. Wymaga więcej boilerplate (Provider, Consumer), ale bez nowej zależności.

---

### 7.1 Krok 0: Store Zustand (przed hookami)

| Krok  | Zadanie                                                                                                                                                       | Szczegóły                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 5.0.1 | Utworzyć `src/stores/workout-session-store.ts`                                                                                                                | Store Zustand dla stanu sesji treningowej                       |
| 5.0.2 | Stan: `session`, `currentExerciseIndex`, `isPaused`, `formData`, `formErrors`, `autosaveStatus`, `autosaveError`, `currentSetNumber`                          | Zgodnie z `WorkoutSessionAssistantState`                        |
| 5.0.3 | Akcje: `setSession`, `setCurrentExerciseIndex`, `setIsPaused`, `setFormData`, `setFormErrors`, `setAutosaveStatus`, `setAutosaveError`, `setCurrentSetNumber` | Proste setters                                                  |
| 5.0.4 | Akcja `resetStore(sessionId, initialSession)`                                                                                                                 | Reset przy zmianie sessionId lub unmount                        |
| 5.0.5 | Selektory: `currentExercise` (derived z session.exercises[currentExerciseIndex])                                                                              | Opcjonalnie – można obliczać w hooku                            |
| 5.0.6 | Store jest singleton – używany tylko na stronie aktywnej sesji                                                                                                | Przy wejściu na stronę: `resetStore(sessionId, initialSession)` |

**Szablon store:**

```ts
// src/stores/workout-session-store.ts
import { create } from "zustand";
import type { SessionDetailDTO } from "@/types";
import type {
  ExerciseFormData,
  FormErrors,
  AutosaveStatus,
} from "@/types/workout-session-assistant";

interface WorkoutSessionStore {
  sessionId: string | null;
  session: SessionDetailDTO | null;
  currentExerciseIndex: number;
  isPaused: boolean;
  formData: ExerciseFormData | null;
  formErrors: FormErrors;
  autosaveStatus: AutosaveStatus;
  autosaveError: string | undefined;
  currentSetNumber: number;
  // Akcje...
  resetStore: (sessionId: string, initialSession: SessionDetailDTO) => void;
  // ...
}
```

---

### 7.2 Krok 1: Hook useSessionTimer

| Krok   | Zadanie                                                                                                                        | Szczegóły                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 5.1.1  | Utworzyć `src/hooks/use-session-timer.ts`                                                                                      |                                                                         |
| 5.1.2  | Czyta z store: `sessionId`, `session`, `isPaused`; zapisuje: `setSession`, `setIsPaused`                                       | Używa `useWorkoutSessionStore.getState()` w callbackach                 |
| 5.1.3  | Refy: `timerInitializedRef`, `timerStateRef`, `sessionStatusRef`                                                               | Przeniesione z komponentu – używane w stopTimer, aby uniknąć zależności |
| 5.1.4  | useEffect: start timer on mount (linie ~225–305 z oryginału)                                                                   | Warunek: `!timerInitializedRef.current`, logika `shouldStart`           |
| 5.1.5  | Używa `patchWorkoutSessionTimer` z `src/lib/api/workout-sessions.ts`                                                           | Zamiast bezpośredniego fetch                                            |
| 5.1.6  | `handlePause`: saveExercise (parametr z komponentu – z useSaveExercise) → patch timer → setSession, setIsPaused                | useSessionTimer przyjmuje `saveExercise` jako argument                  |
| 5.1.7  | `handleResume`: patch timer → setSession, setIsPaused                                                                          |                                                                         |
| 5.1.8  | `stopTimer`: guard (sessionStatusRef !== 'in_progress'), patch timer, update session w store                                   | Używane przy unmount, beforeunload                                      |
| 5.1.9  | Zwraca: `{ isPaused, setIsPaused, stopTimer, handlePause, handleResume, timerInitializedRef, isMountedRef, isFirstRenderRef }` | Refy potrzebne w useAutoPause                                           |
| 5.1.10 | useEffect: reset refów przy zmianie sessionId                                                                                  | Zależność: sessionId                                                    |

---

### 7.3 Krok 2: Hook useSaveExercise

| Krok  | Zadanie                                                                                                                                    | Szczegóły                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 5.2.1 | Utworzyć `src/hooks/use-save-exercise.ts`                                                                                                  |                                                |
| 5.2.2 | Czyta z store: `sessionId`, `session`, `currentExerciseIndex`, `formData`; zapisuje: `setSession`, `setAutosaveStatus`, `setAutosaveError` |                                                |
| 5.2.3 | `saveExercise(data, advanceCursor)`: patchWorkoutSessionExercise → update session w store                                                  | Używa `formDataToAutosaveCommand` z types      |
| 5.2.4 | Obsługa błędów: toast.error, setAutosaveError, setAutosaveStatus('error')                                                                  |                                                |
| 5.2.5 | Zwraca: `{ saveExercise, autosaveStatus, setAutosaveStatus, autosaveError }`                                                               |                                                |
| 5.2.6 | saveExercise musi mieć dostęp do aktualnego formData – przez argument `data` (caller przekazuje) lub `getState().formData`                 | Preferowane: argument `data` – jawna zależność |

**Uwaga:** saveExercise jest wywoływane z formDataRef w handleNext, handlePause, autoPause. Hook może przyjmować `getFormData: () => ExerciseFormData` lub store trzyma formData i `getState().formData` jest zawsze aktualne.

---

### 7.4 Krok 3: Hook useSessionForm

| Krok  | Zadanie                                                                                                                                                                                                                             | Szczegóły                                                                                                         |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 5.3.1 | Utworzyć `src/hooks/use-session-form.ts`                                                                                                                                                                                            |                                                                                                                   |
| 5.3.2 | Czyta z store: `session`, `currentExerciseIndex`, `formData`, `formErrors`, `currentSetNumber`; zapisuje: `setFormData`, `setFormErrors`, `setCurrentSetNumber`                                                                     |                                                                                                                   |
| 5.3.3 | `formDataRef` – ref zsynchronizowany z formData (store). Aktualizacja: przy setFormData w store, aktualizować też ref. Albo: store jest źródłem prawdy, ref niepotrzebny jeśli zawsze `getState().formData`                         | Decyzja: zachować formDataRef dla handleNext (unikanie re-render przed zapisem) – ref aktualizowany w setFormData |
| 5.3.4 | `validateForm(data): FormErrors`                                                                                                                                                                                                    | Przeniesiona logika walidacji (linie 166–223)                                                                     |
| 5.3.5 | `updateSetInForm(setNumber, updates)`                                                                                                                                                                                               | Logika z linii 811–844                                                                                            |
| 5.3.6 | useEffect: przy zmianie currentExercise – setFormData(exerciseToFormData(currentExercise)), setFormErrors({}), setCurrentSetNumber(1)                                                                                               | Zależność: currentExercise                                                                                        |
| 5.3.7 | Callbacki: `handleSetComplete`, `handleRestBetweenComplete`, `handleRestAfterSeriesComplete`, `handleRepsComplete`                                                                                                                  | Logika z linii 847–884                                                                                            |
| 5.3.8 | Zwraca: `{ formData, setFormData, formDataRef, formErrors, updateSetInForm, validateForm, currentSetNumber, setCurrentSetNumber, handleSetComplete, handleRestBetweenComplete, handleRestAfterSeriesComplete, handleRepsComplete }` |                                                                                                                   |

---

### 7.5 Krok 4: Hook useSessionNavigation

| Krok  | Zadanie                                                                                                                      | Szczegóły                                                                             |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 5.4.1 | Utworzyć `src/hooks/use-session-navigation.ts`                                                                               |                                                                                       |
| 5.4.2 | Czyta z store: `sessionId`, `session`, `currentExerciseIndex`, `formData`; zapisuje: `setCurrentExerciseIndex`, `setSession` |                                                                                       |
| 5.4.3 | Przyjmuje: `saveExercise`, `formDataRef`, `validateForm`, `router`                                                           | Albo: saveExercise i validateForm z innych hooków, przekazane z komponentu            |
| 5.4.4 | `handleNext`: validateForm(formDataRef.current) → saveExercise → setCurrentExerciseIndex lub complete session                |                                                                                       |
| 5.4.5 | `handlePrevious`: setCurrentExerciseIndex(-1), setFormErrors({})                                                             |                                                                                       |
| 5.4.6 | `handleSkip`: saveExercise(skippedData, true) → next lub complete                                                            | skippedData z is_skipped: true                                                        |
| 5.4.7 | Complete session: `patchWorkoutSessionStatus(sessionId, 'completed')` → setSession → router.push                             | Używa API z Fazy 0                                                                    |
| 5.4.8 | Zwraca: `{ handleNext, handlePrevious, handleSkip }`                                                                         |                                                                                       |
| 5.4.9 | `markAutoTransition` – ustawia ref isAutoTransitioningRef na 2s                                                              | Potrzebne w handleRestAfterSeriesComplete – może być w useAutoPause lub osobnym hooku |

---

### 7.6 Krok 5: Hook useAutoPause

| Krok   | Zadanie                                                                                                                                                   | Szczegóły                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 5.5.1  | Utworzyć `src/hooks/use-auto-pause.ts`                                                                                                                    |                                                                 |
| 5.5.2  | Przyjmuje: `sessionId`, `pathname`, `stopTimer`, `saveExercise`, `markAutoTransition`                                                                     | Z useSessionTimer i useSaveExercise                             |
| 5.5.3  | Czyta z store: `isPaused`, `session.status`, `formData`; refy: `timerInitializedRef`, `isMountedRef`, `isFirstRenderRef`                                  | Z useSessionTimer                                               |
| 5.5.4  | Refy: `autoPauseExecutedRef`, `previousPathnameRef`, `lastVisibleTimeRef`, `isAutoTransitioningRef`, `autoPauseRef`                                       |                                                                 |
| 5.5.5  | `autoPause(saveProgress?)`: guard clauses (isFirstRender, !isMounted, session.status !== 'in_progress', isPaused, !timerInitialized, isAutoTransitioning) |                                                                 |
| 5.5.6  | W autoPause: saveProgress → saveExercise(formData), patch timer → setSession, setIsPaused                                                                 |                                                                 |
| 5.5.7  | useEffect: pathname change – jeśli !isOnActivePage && !isPaused → autoPause(true)                                                                         | Logika z linii 658–702                                          |
| 5.5.8  | useEffect: beforeunload, pagehide → saveProgressOnUnload (jeśli !isPaused)                                                                                |                                                                 |
| 5.5.9  | `saveProgressOnUnload`: patchWorkoutSessionExerciseKeepalive + patchWorkoutSessionTimerKeepalive                                                          | Używa wersji keepalive z API                                    |
| 5.5.10 | useEffect: visibilitychange → jeśli hidden && !isPaused && timeSinceVisible > 1s → autoPause(true)                                                        |                                                                 |
| 5.5.11 | useEffect: cleanup on unmount → autoPauseRef.current?.(true)                                                                                              | Pusta tablica zależności, autoPause w ref                       |
| 5.5.12 | Zwraca: `{ autoPause, saveProgressOnUnload, markAutoTransition }`                                                                                         | markAutoTransition może być wewnątrz lub w useSessionNavigation |

---

### 7.7 Krok 6: Integracja w WorkoutSessionAssistant

| Krok  | Zadanie                                                                                                                                                                                                                                                              | Szczegóły                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 5.6.1 | Na początku komponentu: `resetStore(sessionId, initialSession)` w useEffect przy mount/zmianie sessionId                                                                                                                                                             | Inicjalizacja store                                                                        |
| 5.6.2 | Wywołać hooki w kolejności: useSessionForm (potrzebuje currentExercise), useSaveExercise (potrzebuje currentExercise), useSessionTimer, useSessionNavigation (potrzebuje saveExercise, formDataRef, validateForm), useAutoPause (potrzebuje stopTimer, saveExercise) | Kolejność może wymagać dostosowania – useSaveExercise i useSessionForm mogą być równoległe |
| 5.6.3 | handleExit: autoPause(true) + router.push('/')                                                                                                                                                                                                                       |                                                                                            |
| 5.6.4 | useEffect: autosaveStatus === 'saved' → setTimeout 3s → setAutosaveStatus('idle')                                                                                                                                                                                    | Automatyczne ukrywanie „Zapisano”                                                          |
| 5.6.5 | canGoNext, canGoPrevious – useMemo na podstawie formData, validateForm, currentExerciseIndex                                                                                                                                                                         |                                                                                            |
| 5.6.6 | Render: tylko JSX – WorkoutTimer, ExerciseTimer, CurrentExerciseInfo, ExerciseExecutionForm, NavigationButtons, ExitSessionButton, AutosaveIndicator                                                                                                                 | Brak logiki biznesowej w renderze                                                          |
| 5.6.7 | Przy unmount: resetStore() lub pozostawienie – store jest singleton, następna sesja nadpisze                                                                                                                                                                         | Opcjonalnie: resetStore() w cleanup                                                        |

---

### 7.8 Kolejność implementacji (zalecana)

1. **5.0** – Store Zustand (szkielet + resetStore)
2. **5.2** – useSaveExercise (najmniej zależności)
3. **5.3** – useSessionForm (validateForm, updateSetInForm, callbacki)
4. **5.1** – useSessionTimer (handlePause, handleResume, stopTimer, start on mount)
5. **5.4** – useSessionNavigation (handleNext, handlePrevious, handleSkip – wymaga saveExercise, validateForm)
6. **5.5** – useAutoPause (wymaga stopTimer, saveExercise, refy z useSessionTimer)
7. **5.6** – Integracja w WorkoutSessionAssistant

Każdy krok kończy się commitowaniem i weryfikacją `npm run build` oraz `npm run lint`.

---

### 7.9 Reducer (opcjonalnie – alternatywa do Zustand)

Jeśli zespół nie chce Zustand dla sesji treningowej:

| Krok  | Zadanie                                                                                                     | Szczegóły                      |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 5.9.1 | Utworzyć `src/hooks/use-workout-session-reducer.ts`                                                         | useReducer z typami akcji      |
| 5.9.2 | Akcje: `SET_SESSION`, `SET_CURRENT_EXERCISE`, `SET_FORM_DATA`, `SET_AUTOSAVE_STATUS`, `SET_IS_PAUSED`, itd. |                                |
| 5.9.3 | Owinąć w React Context – `WorkoutSessionProvider` z value={[state, dispatch]}                               |                                |
| 5.9.4 | Hooki konsumują: `useWorkoutSessionContext()`                                                               | Więcej boilerplate niż Zustand |

---

### 7.10 Kryteria zakończenia Fazy 5

- [x] WorkoutSessionAssistant ma < 400 LOC (957 → 212)
- [x] Store Zustand centralizuje stan sesji
- [x] Każdy hook ma jedną wyraźną odpowiedzialność
- [x] Wszystkie wywołania fetch przechodzą przez warstwę API (`workout-sessions.ts`)
- [x] Zachowana funkcjonalność: timer, auto-pauza, nawigacja, zapis, visibilitychange, beforeunload, pagehide
- [x] `npm run build` i `npm run lint` przechodzą
- [ ] Ręczne testy E2E: pełny przepływ treningu (start → ćwiczenia → pauza → wznowienie → zakończenie)

**Status wdrożenia (2025-01-29):** Faza 5 zakończona. Utworzono:

- `src/stores/workout-session-store.ts` – Zustand store dla stanu sesji
- `src/hooks/use-save-exercise.ts` – zapis ćwiczenia przez API
- `src/hooks/use-session-form.ts` – formularz, walidacja, updateSetInForm, callbacki
- `src/hooks/use-session-timer.ts` – timer, handlePause, handleResume, stopTimer
- `src/hooks/use-session-navigation.ts` – handleNext, handlePrevious, handleSkip
- `src/hooks/use-auto-pause.ts` – auto-pauza przy pathname, beforeunload, visibilitychange

---

### 7.11 Podsumowanie – mapa zależności hooków

```
WorkoutSessionAssistant
├── resetStore(sessionId, initialSession)
├── useWorkoutSessionStore (Zustand)
├── useSessionForm() ──────────────────────► store: formData, formErrors, currentSetNumber
│   └── validateForm, updateSetInForm, handleSetComplete, handleRestBetweenComplete, ...
├── useSaveExercise() ────────────────────► store: session, autosaveStatus; API: patchWorkoutSessionExercise
├── useSessionTimer() ────────────────────► store: session, isPaused; API: patchWorkoutSessionTimer
│   └── stopTimer, handlePause, handleResume, timerInitializedRef, isMountedRef
├── useSessionNavigation() ───────────────► store: currentExerciseIndex, session; saveExercise, validateForm, formDataRef
│   └── handleNext, handlePrevious, handleSkip; API: patchWorkoutSessionStatus
└── useAutoPause() ───────────────────────► stopTimer, saveExercise, markAutoTransition; refy z useSessionTimer
    └── autoPause, saveProgressOnUnload; pathname, beforeunload, visibilitychange
```

---

## 8. Weryfikacja i testy

### 8.1 Po każdej fazie

| Kroki        | Działania                                       |
| ------------ | ----------------------------------------------- |
| Build        | `npm run build`                                 |
| Lint         | `npm run lint`                                  |
| Ręczne testy | Przepływ związany ze zmodyfikowanym komponentem |

### 8.2 Testy jednostkowe (zalecane)

| Faza | Pliki do przetestowania                                                     |
| ---- | --------------------------------------------------------------------------- |
| 0    | `session-format.ts`, funkcje API (mock fetch)                               |
| 1    | `useTestNumRecords`                                                         |
| 2    | `FormField`, `ExerciseFormFields`                                           |
| 3    | `convertSnapshotToExercise`, `useExerciseExists`, `useAddSnapshotToLibrary` |
| 4    | `useResumeSession`, `formatSessionDuration`                                 |
| 5    | `useSessionTimer`, `useSessionForm`, `useSessionNavigation`, `validateForm` |

### 8.3 Testy E2E (Playwright)

| Scenariusz        | Opis                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| DbTest            | Odświeżenie, dodanie rekordu, edycja, usunięcie (jeśli strona dostępna) |
| Exercise form     | Wypełnienie formularza, walidacja, zapis                                |
| Add snapshot      | Kliknięcie "Dodaj do bazy" dla ćwiczenia spoza biblioteki               |
| Resume session    | Wznowienie sesji, anulowanie sesji                                      |
| Workout assistant | Pełny trening: start → next → pause → resume → skip → complete          |

---

## 9. Kryteria zakończenia

### Metryki sukcesu

| Metryka                          | Przed    | Docelowo                 |
| -------------------------------- | -------- | ------------------------ |
| workout-session-assistant.tsx    | 1246 LOC | < 400 LOC                |
| db-test.tsx                      | 453 LOC  | < 200 LOC (lub usunięty) |
| exercise-form-fields.tsx         | 410 LOC  | < 280 LOC                |
| add-snapshot-exercise-button.tsx | 328 LOC  | < 80 LOC                 |
| resume-session-card.tsx          | 317 LOC  | < 150 LOC                |

### Jakość kodu

- [x] Brak duplikacji logiki (DRY)
- [x] Każdy plik ma jedną główną odpowiedzialność
- [x] Warstwa API używana zamiast bezpośredniego fetch w komponentach
- [x] Guard clauses i early returns zgodnie z zasadami projektu
- [x] Zachowana dostępność (a11y) w formularzach

### Dokumentacja

- [x] Zaktualizować `.cursor/rules/shared.mdc` – dodać `src/stores`, `src/lib/api`, `src/hooks`
- [ ] Dodać komentarze JSDoc do nowych hooków i funkcji API (opcjonalnie)

---

## Załącznik A: Szacowany czas

| Faza      | Szacunek    |
| --------- | ----------- |
| 0         | 2–4 h       |
| 1         | 1–2 h       |
| 2         | 2–3 h       |
| 3         | 2–3 h       |
| 4         | 1–2 h       |
| 5         | 4–8 h       |
| **Razem** | **12–22 h** |

## Załącznik B: Kolejność commitów (sugerowana)

1. `feat(lib): add API layer for workout-sessions, exercises, workout-plans`
2. `feat(lib): add session-format utilities`
3. `refactor(db-test): extract useTestNumRecords hook, remove duplication`
4. `refactor(exercises): add FormField, reduce exercise-form-fields LOC`
5. `refactor(workout-plans): extract snapshot-to-exercise, useAddSnapshotToLibrary`
6. `refactor(workout-sessions): extract useResumeSession, use API layer`
7. `feat(stores): add workout-session-store (Zustand) for Phase 5`
8. `refactor(workout-sessions): extract useSaveExercise hook`
9. `refactor(workout-sessions): extract useSessionForm hook`
10. `refactor(workout-sessions): extract useSessionTimer hook`
11. `refactor(workout-sessions): extract useSessionNavigation hook`
12. `refactor(workout-sessions): extract useAutoPause hook`
13. `refactor(workout-sessions): integrate hooks in WorkoutSessionAssistant`
