# Analiza TOP 5 plików o największej liczbie LOC (src/)

**Referencja:** `.ai/tech-stack.md` – Next.js 16, React 19, TypeScript 5, Tailwind 4, shadcn/ui, Supabase, Vitest, Playwright.

**Kryteria refaktoryzacji:** DRY, SRP, łatwiejsze testowanie (hooki, funkcje czyste), spójność z tech stackiem (RHF, Server Actions, shadcn/ui), zgodność z E2E (`data-test-id` w kebab-case).

---

## 1) TOP 5 plików (LOC)

| #   | Ścieżka                                | LOC | Potencjalna złożoność                                   |
| --- | -------------------------------------- | --- | ------------------------------------------------------- |
| 1   | `src/services/workout-plans.ts`        | 987 | Wysoka – CRUD + import, powtórzenia, duże funkcje       |
| 2   | `src/services/workout-sessions.ts`     | 927 | Wysoka – wiele operacji, autosave, snapshoty            |
| 3   | `src/repositories/workout-sessions.ts` | 705 | Średnia–wysoka – zapytania, paginacja, RPC              |
| 4   | `src/db/database.types.ts`             | 704 | Niska – auto-generowany z Supabase (bez refaktoryzacji) |
| 5   | `src/repositories/workout-plans.ts`    | 660 | Średnia – mapowania inline, cursor, batch queries       |

---

## 2) Analiza i kierunki refaktoryzacji

### 1. `src/services/workout-plans.ts` (987 LOC)

#### Obecna struktura

- **ServiceError**, **parseOrThrow**, **assertUser** – importowane z `lib/service-utils.ts` ✅
- **mapDbError** – własna implementacja z `MAP_DB_ERROR_OVERRIDES` (domenowe komunikaty)
- Funkcje: `createWorkoutPlanService`, `listWorkoutPlansService`, `getWorkoutPlanService`, `updateWorkoutPlanService`, `deleteWorkoutPlanService`, `importWorkoutPlanService`, `linkSnapshotToExerciseService`
- `calculateEstimatedTotalTime` – funkcja czysta (linie 58–70)
- `createSnapshotIdFactory` – importowana z `lib/workout-plan-snapshot-id.ts` ✅
- `updateWorkoutPlanService` – ~250 linii, łączy walidację, temp order, update ćwiczeń, insert, metadane, przeliczanie czasu

#### Kierunki refaktoryzacji

| Kierunek                                       | Technika            | Argumentacja                                                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A) Wydzielenie `applyExerciseUpdates`**      | SRP, Extract Method | `updateWorkoutPlanService` (linie 300–420) łączy: temp order, update istniejących, insert nowych. Wydzielenie do `applyExerciseUpdates(supabase, planId, patch.exercises, userId)` – jedna odpowiedzialność, łatwiejsze testowanie. |
| **B) Wydzielenie `mapExerciseUpdateToDb`**     | DRY, Pure Function  | Logika budowania `updateData` (linie 384–424) – ~40 linii if-ów. Funkcja czysta `mapExerciseUpdateToDb(exerciseUpdate): Update` – testowalna w Vitest bez Supabase.                                                                 |
| **C) Wydzielenie `prepareExercisesForInsert`** | DRY                 | Mapowanie `exercisesToCreate` → `exercisesToInsert` (linie 376–406) jest podobne do mapowania w `importWorkoutPlanService` (linie 639–661). Wspólna funkcja `prepareExercisesForInsert(exercises, getSnapshotId)` – DRY.            |
| **D) Wydzielenie `matchExercisesByName`**      | SRP                 | Pętla `for (const exercise of parsed.exercises)` w `importWorkoutPlanService` (linie 527–559) – logika match_by_name. Wydzielenie do `matchExercisesByName(supabase, userId, exercises)` – SRP, testowalność.                       |
| **E) `calculateEstimatedTotalTime` do lib**    | Pure Function       | Przenieść do `lib/workout-plans/estimated-time.ts` – funkcja czysta, współdzielona z innymi modułami, testy jednostkowe.                                                                                                            |
| **F) Server Actions**                          | Tech stack          | Formularz planu (`use-workout-plan-form`) używa `fetch("/api/workout-plans")`. Dodać Server Action w `app/actions/workout-plans.ts` wywołującą serwis – spójność z `workout-sessions`.                                              |

---

### 2. `src/services/workout-sessions.ts` (927 LOC)

#### Obecna struktura

- **ServiceError**, **parseOrThrow**, **mapDbError**, **assertUser**, **validateUuid** – z `lib/service-utils.ts` ✅
- **calculateAggregatesFromSets**, **preparePlannedUpdates** – z `lib/workout-sessions/aggregates.ts` ✅
- Funkcje: `startWorkoutSessionService`, `listWorkoutSessionsService`, `getWorkoutSessionService`, `updateWorkoutSessionStatusService`, `updateWorkoutSessionTimerService`, `autosaveWorkoutSessionExerciseService`, `deleteWorkoutSessionService`
- Funkcje pomocnicze wewnętrzne: `getWorkoutSessionDetail`, `createSessionSnapshots`, `validateAutosavePathParams`, `validateSessionForAutosave`, `validateExerciseForAutosave`, `mapSaveFunctionError`, `updateCursorIfNeeded`, `fetchUpdatedExerciseWithCursor`

#### Kierunki refaktoryzacji

| Kierunek                                                | Technika      | Argumentacja                                                                                                                                                                                             |
| ------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A) Wydzielenie `createSessionSnapshots`**             | Pure Function | Przenieść do `lib/workout-sessions/session-snapshots.ts` – funkcja czysta (planExercises + exercisesMap → snapshots). Testy Vitest bez mocków Supabase.                                                  |
| **B) Podział na subserwisy**                            | SRP           | `autosaveWorkoutSessionExerciseService` + 5 funkcji pomocniczych (~200 LOC) – wydzielić do `services/workout-session-autosave.ts`. CRUD i autosave mają różną logikę (walidacja path, agregaty, kursor). |
| **C) Wydzielenie `mapSaveFunctionError`**               | DRY           | RPC `save_workout_session_exercise` zwraca błędy w innym formacie. `mapSaveFunctionError` – przenieść do `lib/service-utils.ts` jako `mapRpcError` z konfigurowalnymi komunikatami – reużywalne.         |
| **D) Stałe sekcji**                                     | DRY           | `typeOrder = { "Warm-up": 1, "Main Workout": 2, "Cool-down": 3 }` w `createSessionSnapshots` – wydzielić do `lib/workout-sessions/constants.ts` jeśli używane w wielu miejscach.                         |
| **E) `getWorkoutSessionDetail` – dependency injection** | Testowalność  | Przekazywanie `supabase` jako parametr – już jest ✅. Rozważyć wydzielenie do `repositories` lub osobnego modułu `getSessionDetail` – jeśli logika się rozrośnie.                                        |

---

### 3. `src/repositories/workout-sessions.ts` (705 LOC)

#### Obecna struktura

- **mapToSummaryDTO**, **mapToDetailDTO**, **mapExerciseToDTO** – re-eksportowane z `lib/workout-sessions/mappers.ts` ✅
- **calculateTimerUpdates** – z `lib/workout-sessions/timer.ts` ✅
- Funkcje: find/insert/update/delete dla sesji, ćwiczeń, serii; `callSaveWorkoutSessionExercise` (RPC)
- `findWorkoutSessionsByUserId` – paginacja kursorem, pobieranie exercise names w osobnym zapytaniu
- `applyCursorFilter` – logika kursora (duplikowana z `workout-plans`)

#### Kierunki refaktoryzacji

| Kierunek                                            | Technika    | Argumentacja                                                                                                                                                                                  |
| --------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A) Wspólny moduł `lib/cursor-utils.ts`**          | DRY         | `applyCursorFilter` i `CursorPayload` są niemal identyczne w `workout-sessions` i `workout-plans`. Wydzielić `applyCursorFilter<T>(query, sort, order, cursor): T` – DRY, jeden punkt zmiany. |
| **B) Typowanie `applyCursorFilter`**                | Type safety | Obecnie `query: any`. Użyć `PostgrestFilterBuilder` z Supabase – lepsze type-safety, mniej błędów.                                                                                            |
| **C) Stałe kolumn**                                 | DRY         | `sessionSelectColumns` – jeśli używane w wielu miejscach, wydzielić do `repositories/workout-sessions/constants.ts`.                                                                          |
| **D) Wydzielenie `fetchExerciseNamesBySessionIds`** | SRP         | Fragment `findWorkoutSessionsByUserId` (linie 176–196) – osobna funkcja `fetchExerciseNamesBySessionIds(client, sessionIds)` – SRP, reużywalność.                                             |

---

### 4. `src/db/database.types.ts` (704 LOC)

#### Charakterystyka

- Plik **auto-generowany** przez Supabase CLI (`supabase gen types typescript`)
- Definicje tabel, widoków, funkcji, enumów
- Typy: `Tables`, `Insert`, `Update`, `Enums`, `CompositeTypes`

#### Kierunki refaktoryzacji

| Kierunek                           | Technika   | Argumentacja                                                                                                                                          |
| ---------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A) Brak refaktoryzacji ręcznej** | —          | Plik jest generowany. Zmiany schematu → `supabase gen types typescript --local > src/db/database.types.ts`.                                           |
| **B) Rozszerzenia w `types/`**     | Separation | Własne typy (np. `SessionDetailDTO` z dodatkowymi polami) – trzymać w `types.ts` lub `types/workout-session-assistant.ts`, nie w `database.types.ts`. |
| **C) Skrypt `db:types`**           | DX         | W `package.json`: `"db:types": "supabase gen types typescript --local > src/db/database.types.ts"` – spójne generowanie.                              |

---

### 5. `src/repositories/workout-plans.ts` (660 LOC)

#### Obecna struktura

- `findWorkoutPlansByUserId` – paginacja kursorem, batch fetch exercise counts/names
- `listWorkoutPlanExercises` – mapowanie row → DTO z logiką snapshot vs exercise (inline ~70 linii)
- `mapToDTO`, `mapExerciseToDTO` – mapowania w tym samym pliku
- `applyCursorFilter` – duplikacja z workout-sessions

#### Kierunki refaktoryzacji

| Kierunek                                        | Technika           | Argumentacja                                                                                                                                                                                                          |
| ----------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A) Wspólny `lib/cursor-utils.ts`**            | DRY                | Jak w workout-sessions – `applyCursorFilter` jest identyczna.                                                                                                                                                         |
| **B) Wydzielenie `mapPlanExerciseRowToDTO`**    | SRP, Pure Function | Logika mapowania w `listWorkoutPlanExercises` (linie 335–393) – ~60 linii. Wydzielić do `lib/workout-plans/mappers.ts` lub `repositories/workout-plans/mappers.ts` – funkcja czysta, testowalna.                      |
| **C) Wydzielenie `fetchPlanExerciseMetadata`**  | SRP                | Fragment `findWorkoutPlansByUserId` (linie 132–169) – batch fetch exercise counts, names, has_missing. Osobna funkcja – SRP.                                                                                          |
| **D) Uproszczenie `updateWorkoutPlanExercise`** | DRY                | Sekwencja if-ów (linie 330–362) – można użyć `Object.fromEntries` + `Object.entries(input).filter` dla dynamicznego budowania `updateData`, ale ostrożnie z typami. Alternatywnie: helper `pickDefined(input, keys)`. |

---

## Podsumowanie priorytetów

| Priorytet | Działanie                                                    | Pliki                                 | Efekt                     | Status |
| --------- | ------------------------------------------------------------ | ------------------------------------- | ------------------------- | ------ |
| 1         | Wydzielenie `lib/cursor-utils.ts`                            | workout-sessions, workout-plans repos | DRY, ~30 LOC mniej        | ✅     |
| 2         | Wydzielenie `applyExerciseUpdates` + `mapExerciseUpdateToDb` | workout-plans service                 | SRP, testowalność         | ✅     |
| 3         | Wydzielenie `createSessionSnapshots` do lib                  | workout-sessions service              | Pure function, testy      |        |
| 4         | Wydzielenie `prepareExercisesForInsert` (DRY create/import)  | workout-plans service                 | DRY                       |        |
| 5         | Wydzielenie `mapPlanExerciseRowToDTO`                        | workout-plans repository              | SRP, testowalność         |        |
| 6         | Server Actions dla planów                                    | use-workout-plan-form, app/actions    | Spójność z tech stackiem  |        |
| 7         | `data-test-id` kebab-case                                    | Nowe/refaktoryzowane komponenty       | Zgodność E2E (Playwright) |        |

---

## Uwagi techniczne

- **service-utils.ts** – już zawiera `ServiceError`, `parseOrThrow`, `mapDbError`, `assertUser`, `validateUuid`. workout-plans używa `mapDbErrorBase` z overrides – OK.
- **workout-plan-snapshot-id.ts** – `createSnapshotIdFactory` już wydzielone ✅
- **lib/workout-sessions/aggregates.ts** – `calculateAggregatesFromSets`, `preparePlannedUpdates` już wydzielone ✅
- **lib/workout-sessions/mappers.ts** – mapowania sesji już wydzielone ✅
- **data-test-id** – używane w kebab-case w większości komponentów (np. `workout-plan-form-name`, `exercise-form-title`). Przy nowych komponentach zachować konwencję.
