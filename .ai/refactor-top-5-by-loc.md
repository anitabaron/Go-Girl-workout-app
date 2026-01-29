# Analiza TOP 5 plików o największej liczbie LOC (src/)

**Referencja:** `.ai/tech-stack.md` – Next.js 16, React 19, TypeScript 5, Tailwind 4, shadcn/ui, Supabase, Vitest, Playwright.

**Kryteria refaktoryzacji:** DRY, SRP, łatwiejsze testowanie (hooki, funkcje czyste), spójność z tech stackiem (RHF, Server Actions, shadcn/ui), zgodność z E2E (`data-test-id` w kebab-case).

---

## TOP 5 plików (LOC)

| #   | Ścieżka                                | LOC  | Potencjalna złożoność                       |
| --- | -------------------------------------- | ---- | ------------------------------------------- |
| 1   | `src/services/workout-sessions.ts`     | 1134 | Wysoka – wiele operacji, duplikacja logiki  |
| 2   | `src/services/workout-plans.ts`        | 1034 | Wysoka – CRUD + import, powtórzenia         |
| 3   | `src/hooks/use-workout-plan-form.ts`   | 877  | Wysoka – walidacja, API, nawigacja w jednym |
| 4   | `src/repositories/workout-sessions.ts` | 833  | Średnia–wysoka – mapowania, zapytania       |
| 5   | `src/db/database.types.ts`             | 704  | Niska – auto-generowany z Supabase          |

---

## 1. `src/services/workout-sessions.ts` (1134 LOC)

### Obecna struktura

- **ServiceError** i **mapDbError** – duplikowane w `workout-plans.ts` (DRY naruszone)
- **parseOrThrow**, **assertUser** – identyczne w obu serwisach
- Funkcje: `startWorkoutSessionService`, `listWorkoutSessionsService`, `getWorkoutSessionService`, `updateWorkoutSessionStatusService`, `updateWorkoutSessionTimerService`, `autosaveWorkoutSessionExerciseService`, `deleteWorkoutSessionService`
- Funkcje pomocnicze: `getWorkoutSessionDetail`, `createSessionSnapshots`, `validateAutosavePathParams`, `validateSessionForAutosave`, `validateExerciseForAutosave`, `mapSaveFunctionError`, `preparePlannedUpdates`, `updateCursorIfNeeded`, `fetchUpdatedExerciseWithCursor`, `calculateAggregatesFromSets`
- Walidacja UUID – regex powielony w kilku miejscach

### Kierunki refaktoryzacji

#### A) **Wspólny moduł `lib/service-utils.ts` (DRY)**

Wydzielenie współdzielonego kodu między `workout-sessions.ts` i `workout-plans.ts`:

```ts
// lib/service-utils.ts
export class ServiceError extends Error { ... }
export function parseOrThrow<T>(schema, payload): T { ... }
export function mapDbError(error: PostgrestError): ServiceError { ... }
export function assertUser(userId: string): void { ... }
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateUuid(id: string, fieldName: string): void { ... }
```

**Argumentacja:** DRY – eliminacja duplikacji `ServiceError`, `parseOrThrow`, `mapDbError`, `assertUser`. Łatwiejsze testowanie – funkcje czyste w osobnym module.

#### B) **Podział na subserwisy (SRP)**

- `workout-session-crud.service.ts` – start, list, get, delete, updateStatus, updateTimer
- `workout-session-autosave.service.ts` – `autosaveWorkoutSessionExerciseService` + funkcje pomocnicze (`validateAutosavePathParams`, `validateSessionForAutosave`, `calculateAggregatesFromSets`, `preparePlannedUpdates`, `updateCursorIfNeeded`, `fetchUpdatedExerciseWithCursor`)

**Argumentacja:** SRP – autosave ma inną logikę (walidacja path, agregaty, kursor). Łatwiejsze testowanie – mniejsze jednostki.

#### C) **Wydzielenie funkcji czystych**

- `createSessionSnapshots` – już czysta, można przenieść do `lib/workout-session-snapshots.ts`
- `calculateAggregatesFromSets` – czysta, przenieść do `lib/workout-session-aggregates.ts`
- `preparePlannedUpdates` – czysta, przenieść do utils

**Argumentacja:** Funkcje czyste łatwo testować w Vitest bez mocków Supabase.

#### D) **Ujednolicenie mapowania błędów**

`mapDbError` w workout-sessions ma inne komunikaty niż w workout-plans (np. 23505 → "Konflikt unikalności" vs "Duplikat pozycji"). Wspólny moduł pozwoli na spójne komunikaty i konfigurowalne mapowanie kodu → komunikat.

---

## 2. `src/services/workout-plans.ts` (1034 LOC)

### Obecna struktura

- **ServiceError**, **parseOrThrow**, **mapDbError**, **assertUser** – duplikacja z workout-sessions
- Funkcje: `createWorkoutPlanService`, `listWorkoutPlansService`, `getWorkoutPlanService`, `updateWorkoutPlanService`, `deleteWorkoutPlanService`, `importWorkoutPlanService`, `linkSnapshotToExerciseService`
- `calculateEstimatedTotalTime` – funkcja czysta
- `getSnapshotId` – zduplikowana w `updateWorkoutPlanService` i `importWorkoutPlanService`

### Kierunki refaktoryzacji

#### A) **Użycie `lib/service-utils.ts` (DRY)**

Import `ServiceError`, `parseOrThrow`, `mapDbError`, `assertUser` z wspólnego modułu – jak w punkcie 1A.

#### B) **Wydzielenie `getSnapshotId` do utils (DRY)**

```ts
// lib/workout-plan-snapshot-id.ts
export function createSnapshotIdFactory(): (title, type, part) => string | null {
  const snapshotIdMap = new Map<string, string>();
  return (title, type, part) => { ... };
}
```

**Argumentacja:** `getSnapshotId` jest identyczna w `updateWorkoutPlanService` (linie 358–374) i `importWorkoutPlanService` (linie 639–661). DRY.

#### C) **Podział `updateWorkoutPlanService` (SRP)**

Funkcja ma ~250 linii i łączy:

- walidację planu
- aktualizację ćwiczeń (temp order, update, insert)
- aktualizację metadanych
- przeliczanie `estimated_total_time_seconds`

Propozycja:

- `applyExerciseUpdates(supabase, planId, patch.exercises, userId)` – logika ćwiczeń
- `updatePlanMetadata(supabase, planId, patch)` – metadane
- `recalculateAndUpdateEstimatedTime(supabase, planId, userId)` – czas

**Argumentacja:** SRP – każda funkcja ma jedną odpowiedzialność. Łatwiejsze testowanie.

#### D) **Server Actions zamiast fetch w API**

Tech stack wspomina Server Actions. Obecnie formularz planu używa `fetch` w `use-workout-plan-form.ts`. Można dodać Server Action wywołującą `createWorkoutPlanService` / `updateWorkoutPlanService` – spójność z `app/actions/workout-sessions.ts`.

---

## 3. `src/hooks/use-workout-plan-form.ts` (877 LOC)

### Obecna struktura

- Stan: `fields`, `errors`, `isLoading`
- Walidacja: `validateField`, `validateMetadataFields`, `validateExercise`, `validateForm`
- Handlery: `handleChange`, `handleBlur`, `handleAddExercise`, `handleRemoveExercise`, `handleUpdateExercise`, `handleMoveExercise`
- Konwersja: `formStateToCreateCommand`, `formStateToUpdateCommand`
- Obsługa błędów: `handleValidationError`, `handleConflictError`, `handleNotFoundError`, `handleAuthError`, `handleServerError`, `handleApiError`, `handleNetworkError`
- Submit: `handleSubmit`, `handleSuccess`, `scrollToFirstError`
- `parseValidationErrors` – funkcja pomocnicza

### Kierunki refaktoryzacji

#### A) **Migracja na React Hook Form (RHF)**

Projekt używa RHF w `use-exercise-form.ts`. Spójność z tech stackiem:

```tsx
// use-workout-plan-form.ts – wzorzec jak use-exercise-form
const form = useForm<WorkoutPlanFormValues>({
  resolver: zodResolver(workoutPlanFormSchema),
  defaultValues: dtoToFormState(initialData),
});
```

**Argumentacja:** RHF redukuje ręczną walidację (`validateForm`, `validateField`, `validateExercise`), obsługę błędów i `handleChange`/`handleBlur`. Mniej LOC, spójność z `use-exercise-form.ts`.

#### B) **Wydzielenie logiki obsługi błędów API**

```ts
// hooks/use-api-error-handler.ts lub lib/api-error-handler.ts
export function createApiErrorHandler(options: {
  onValidation: (data) => void;
  onConflict: (data) => void;
  onNotFound: () => void;
  onAuth: () => void;
  onServer: (data) => void;
}) {
  return async (response: Response) => { ... };
}
```

**Argumentacja:** `handleApiError`, `handleValidationError`, `handleConflictError` itd. są generyczne – można użyć w `use-exercise-form`, `use-login-form` itp. DRY, łatwiejsze testowanie.

#### C) **Wydzielenie walidacji ćwiczeń do funkcji czystej**

```ts
// lib/validation/workout-plan-form-exercise.ts
export function validateWorkoutPlanExercise(
  exercise: WorkoutPlanExerciseItemState,
  index: number
): Record<string, string> { ... }
```

**Argumentacja:** Funkcja czysta – testy w Vitest bez React. Obecnie `validateExercise` jest wewnątrz hooka.

#### D) **Server Actions zamiast fetch**

Zamiast `fetch("/api/workout-plans", ...)` – Server Action wywołująca `createWorkoutPlanService` / `updateWorkoutPlanService`. Spójność z `workout-sessions` i tech stackiem.

#### E) **`data-test-id` w kebab-case**

Przy refaktoryzacji upewnić się, że elementy formularza mają `data-test-id` w kebab-case (np. `workout-plan-form-name`, `workout-plan-form-submit`) – zgodność z Playwright E2E.

---

## 4. `src/repositories/workout-sessions.ts` (833 LOC)

### Obecna struktura

- Funkcje find/insert/update/delete dla sesji, ćwiczeń, serii
- Mapowania: `mapToSummaryDTO`, `mapToDetailDTO`, `mapExerciseToDTO`
- `findWorkoutSessionsByUserId` – paginacja kursorem, pobieranie exercise names
- `updateWorkoutSessionTimer` – logika cumulative duration
- `callSaveWorkoutSessionExercise` – RPC

### Kierunki refaktoryzacji

#### A) **Wydzielenie mapperów do osobnego pliku**

```ts
// repositories/workout-sessions/mappers.ts
export function mapToSummaryDTO(...): SessionSummaryDTO { ... }
export function mapToDetailDTO(...): SessionDetailDTO { ... }
export function mapExerciseToDTO(...): SessionExerciseDTO { ... }
```

**Argumentacja:** SRP – repozytorium = zapytania, mappery = transformacje. Łatwiejsze testowanie mapperów (funkcje czyste).

#### B) **Wydzielenie logiki timera**

`updateWorkoutSessionTimer` zawiera logikę obliczania `elapsedFromTimer` i `newActiveDuration`. Można przenieść do:

```ts
// lib/workout-session-timer.ts
export function calculateTimerUpdates(
  existing: { active_duration_seconds; last_timer_started_at },
  updates: { last_timer_stopped_at?; active_duration_seconds? },
): { active_duration_seconds; last_timer_started_at?; last_timer_stopped_at? };
```

**Argumentacja:** Funkcja czysta – testy jednostkowe bez Supabase.

#### C) **Stałe kolumn**

`sessionSelectColumns` – można wydzielić do `repositories/workout-sessions/constants.ts` jeśli będzie używane w wielu miejscach.

#### D) **Typowanie `applyCursorFilter`**

Obecnie `query: any`. Użyć typów Supabase `PostgrestFilterBuilder` dla lepszego type-safety.

---

## 5. `src/db/database.types.ts` (704 LOC)

### Charakterystyka

- Plik generowany przez Supabase CLI (`supabase gen types typescript`)
- Definicje tabel, widoków, funkcji, enumów
- Typy pomocnicze: `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes`
- `Constants` – wartości enumów

### Kierunki refaktoryzacji

#### A) **Brak refaktoryzacji ręcznej**

Plik jest auto-generowany. Zmiany w schemacie bazy powinny być odzwierciedlane przez `supabase gen types`.

#### B) **Wydzielenie rozszerzeń (jeśli potrzebne)**

Jeśli potrzebne są własne typy rozszerzające (np. `SessionDetailDTO` z dodatkowymi polami), trzymać je w `types.ts` lub `types/workout-session.ts`, nie w `database.types.ts`.

#### C) **Wersjonowanie generowania**

W `package.json` lub README dodać skrypt:

```json
"scripts": {
  "db:types": "supabase gen types typescript --local > src/db/database.types.ts"
}
```

**Argumentacja:** Spójność – każdy developer generuje typy w ten sam sposób.

---

## Podsumowanie priorytetów

| Priorytet | Działanie                                        | Pliki                           | Efekt                    |
| --------- | ------------------------------------------------ | ------------------------------- | ------------------------ |
| 1         | Utworzenie `lib/service-utils.ts`                | workout-sessions, workout-plans | DRY, ~100 LOC mniej      |
| 2         | Wydzielenie `getSnapshotId`                      | workout-plans                   | DRY                      |
| 3         | Migracja `use-workout-plan-form` na RHF          | use-workout-plan-form           | Spójność, mniej LOC      |
| 4         | Wydzielenie mapperów                             | repositories/workout-sessions   | SRP, testowalność        |
| 5         | Wydzielenie funkcji czystych (aggregates, timer) | services, repositories          | Testowalność             |
| 6         | Server Actions dla planów                        | use-workout-plan-form, actions  | Spójność z tech stackiem |
| 7         | `data-test-id` kebab-case                        | komponenty formularzy           | Zgodność E2E             |
