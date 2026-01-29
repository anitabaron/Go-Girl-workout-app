# Plan testu E2E: Przepływ sesji treningowej (od planu do zakończenia)

## Cel testu

Test E2E weryfikuje pełny przepływ użytkownika od utworzonego planu treningowego do wyświetlenia zakończonej sesji treningowej:

1. **Sięgnięcie po trening z planu** – wybór planu na stronie startu treningu
2. **Start treningu** – rozpoczęcie sesji i przekierowanie do asystenta
3. **Przejście sesji w asystencie treningu** – nawigacja przez ćwiczenia (Next)
4. **Wyświetlenie zakończonej sesji treningowej** – weryfikacja widoku szczegółów

## Zależności od istniejących elementów

Test wykorzystuje i wyodrębnia elementy wspólne z istniejących testów:

| Element                              | Źródło                                | Użycie                 |
| ------------------------------------ | ------------------------------------- | ---------------------- |
| `authenticateUser`                   | `e2e/fixtures/auth.ts`                | Logowanie przed testem |
| `createExercise` / `createExercises` | `e2e/fixtures/exercises.ts`           | Tworzenie ćwiczeń      |
| `ExercisesPage`                      | `e2e/pages/exercises-page.ts`         | Nawigacja do ćwiczeń   |
| `ExerciseFormPage`                   | `e2e/pages/exercise-form-page.ts`     | Formularz ćwiczenia    |
| `WorkoutPlansPage`                   | `e2e/pages/workout-plans-page.ts`     | Nawigacja do planów    |
| `WorkoutPlanFormPage`                | `e2e/pages/workout-plan-form-page.ts` | Formularz planu        |

## Nowe elementy do utworzenia

### 1. Fixture: `createWorkoutPlan`

**Lokalizacja**: `e2e/fixtures/workout-plans.ts`

**Opis**: Wspólna funkcja tworząca plan treningowy z ćwiczeniami (analogiczna do `createExercise`).

**Sygnatura**:

```typescript
export async function createWorkoutPlan(
  page: Page,
  options: {
    planName?: string;
    exercises?: Array<Partial<ExerciseTestData>>;
    exerciseTitles?: string[]; // jeśli ćwiczenia już istnieją
  },
): Promise<{ planName: string; planId: string }>;
```

**Logika**:

- Jeśli `exerciseTitles` podane – użyj istniejących ćwiczeń
- Jeśli `exercises` podane – utwórz ćwiczenia przez `createExercises`, potem plan
- Jeśli brak – utwórz 2 domyślne ćwiczenia i plan
- Zwraca `planName` i `planId` (do weryfikacji)

**Eksport**: Dodać do `e2e/fixtures/index.ts`

### 2. Page Object: `WorkoutSessionStartPage`

**Lokalizacja**: `e2e/pages/workout-session-start-page.ts`

**Odpowiedzialność**: Strona `/workout-sessions/start` – wybór planu i start treningu.

**Metody**:

- `goto()` – nawigacja do `/workout-sessions/start`
- `waitForPlansList()` – czekanie na listę planów
- `clickStartPlan(planName: string)` – kliknięcie "Rozpocznij" przy planie o danej nazwie
- `hasPlanWithName(name: string): Promise<boolean>` – sprawdzenie czy plan jest na liście
- `isEmptyStateVisible(): Promise<boolean>` – pusty stan (brak planów)

**Selektory** (do dodania `data-test-id` w komponentach lub użycie aria-label):

- Przycisk start: `aria-label="Rozpocznij trening z planem {planName}"`
- Karta planu: tekst zawierający nazwę planu

### 3. Page Object: `WorkoutSessionAssistantPage`

**Lokalizacja**: `e2e/pages/workout-session-assistant-page.ts`

**Odpowiedzialność**: Strona `/workout-sessions/[id]/active` – asystent treningowy.

**Metody**:

- `waitForAssistant()` – czekanie na załadowanie asystenta
- `clickNext()` – kliknięcie "Następne ćwiczenie"
- `clickSkip()` – kliknięcie "Pomiń ćwiczenie"
- `getCurrentExerciseTitle(): Promise<string>` – nazwa aktualnego ćwiczenia
- `getExerciseProgress(): Promise<string>` – np. "1 / 3"
- `isOnLastExercise(): Promise<boolean>` – czy ostatnie ćwiczenie

**Selektory**:

- Przycisk Next: `aria-label="Następne ćwiczenie"`
- Przycisk Skip: `aria-label="Pomiń ćwiczenie"`

### 4. Page Object: `WorkoutSessionDetailsPage`

**Lokalizacja**: `e2e/pages/workout-session-details-page.ts`

**Odpowiedzialność**: Strona `/workout-sessions/[id]` – szczegóły zakończonej sesji.

**Metody**:

- `goto(sessionId: string)` – nawigacja do szczegółów sesji
- `waitForDetails()` – czekanie na załadowanie
- `getPlanName(): Promise<string>` – nazwa planu
- `hasCompletedStatus(): Promise<boolean>` – status "Zakończona"
- `hasExerciseWithTitle(title: string): Promise<boolean>` – ćwiczenie na liście
- `getExerciseCount(): Promise<number>` – liczba ćwiczeń

**Selektory**:

- Tekst "Informacje o sesji", "Plan treningowy", "Data zakończenia"

---

## Kroki implementacji (realizacja krok po kroku)

### Krok 1: Dodanie `data-test-id` do komponentów sesji treningowej

**Pliki do modyfikacji**:

1. `src/components/workout-sessions/start/workout-plan-start-card.tsx`
   - Dodać `data-test-id="workout-plan-start-card"` do Card
   - Dodać `data-test-id={`workout-plan-start-card-${plan.id}`}`
   - Przycisk: `data-test-id={`start-plan-button-${plan.id}`}`

2. `src/components/workout-sessions/start/workout-plans-list.tsx`
   - Kontener: `data-test-id="workout-session-start-plans-list"`

3. `src/components/workout-sessions/assistant/navigation-buttons.tsx`
   - Przycisk Next: `data-test-id="workout-assistant-next-button"`
   - Przycisk Skip: `data-test-id="workout-assistant-skip-button"`

4. `src/components/workout-sessions/details/workout-session-metadata.tsx`
   - Card: `data-test-id="workout-session-details-metadata"`

5. `src/components/workout-sessions/details/workout-session-exercises-list.tsx`
   - Kontener: `data-test-id="workout-session-details-exercises-list"`

### Krok 2: Utworzenie fixture `createWorkoutPlan`

1. Utworzyć `e2e/fixtures/workout-plans.ts`
2. Zaimplementować `createWorkoutPlan` wykorzystując `createExercises`, `WorkoutPlansPage`, `WorkoutPlanFormPage`
3. Dodać eksport do `e2e/fixtures/index.ts`

### Krok 3: Utworzenie Page Objects

1. `WorkoutSessionStartPage` – metody dla strony startu
2. `WorkoutSessionAssistantPage` – metody dla asystenta
3. `WorkoutSessionDetailsPage` – metody dla szczegółów sesji
4. Dodać eksporty do `e2e/pages/index.ts`

### Krok 4: Implementacja testu E2E

**Plik**: `e2e/workout-sessions/workout-session-flow.spec.ts`

**Struktura testu**:

```typescript
test.describe("Workout Session Flow E2E", () => {
  test("should complete full workout flow: plan → start → session → completed", async ({
    page,
  }) => {
    test.setTimeout(90000); // 90s - pełny przepływ

    // 1. Login
    await authenticateUser(page);

    // 2. Utworzenie planu (fixture - wspólna logika)
    const { planName, planId } = await createWorkoutPlan(page, {
      planName: `Session Flow Plan ${Date.now()}`,
      exercises: [
        { part: "Arms", series: 2, reps: 5 },
        { part: "Legs", series: 2, reps: 5 },
      ],
    });

    // 3. Sięgnięcie po trening z planu - strona startu
    const startPage = new WorkoutSessionStartPage(page);
    await startPage.goto();
    await startPage.waitForPlansList();
    expect(await startPage.hasPlanWithName(planName)).toBe(true);

    // 4. Start treningu
    await startPage.clickStartPlan(planName);
    await page.waitForURL(/\/workout-sessions\/[^/]+\/active/);

    // 5. Przejście sesji w asystencie
    const assistantPage = new WorkoutSessionAssistantPage(page);
    await assistantPage.waitForAssistant();

    // Przejdź przez wszystkie ćwiczenia (2 ćwiczenia - Next dla każdego)
    await assistantPage.clickNext(); // Ćwiczenie 1 → 2
    await assistantPage.clickNext(); // Ćwiczenie 2 → zakończenie (redirect)

    // 6. Weryfikacja - przekierowanie do szczegółów zakończonej sesji
    await page.waitForURL(/\/workout-sessions\/[^/]+$/);
    expect(page.url()).not.toContain("/active");

    const detailsPage = new WorkoutSessionDetailsPage(page);
    await detailsPage.waitForDetails();
    expect(await detailsPage.getPlanName()).toContain(planName);
    expect(await detailsPage.hasCompletedStatus()).toBe(true);
    expect(await detailsPage.getExerciseCount()).toBeGreaterThanOrEqual(2);
  });
});
```

### Krok 5: Obsługa edge cases

- **Walidacja formularza**: Dla ćwiczeń z reps – wypełnić pola przed Next (jeśli wymagane)
- **Skip zamiast Next**: Dla szybszego testu można użyć Skip dla pierwszego ćwiczenia
- **Polling**: Użyć `expect.poll()` dla weryfikacji po nawigacji (analogicznie do test-plan.md 3.3.3)
- **Reload**: Po zakończeniu sesji – `page.reload()` przed weryfikacją statusu (jeśli cache)

### Krok 6: Weryfikacja formularza ćwiczenia

Formularz asystenta wymaga:

- Dla ćwiczeń z `planned_reps`: co najmniej jedna seria z reps >= 0
- Lub zaznaczenie "Pomiń ćwiczenie"

**Strategia**: Użyć `clickSkip()` dla pierwszego ćwiczenia, `clickNext()` z domyślnymi wartościami dla drugiego (jeśli formularz ma pre-wypełnione serie z planu) LUB wypełnić minimalne dane (reps: 1) przed Next.

**Sprawdzenie**: W `ExerciseExecutionForm` – jeśli `planned_sets` i `planned_reps` są ustawione, formularz tworzy wstępne serie. Wystarczy kliknąć Next (wartości domyślne z planu).

---

## Podsumowanie kroków

| #   | Krok                      | Pliki                        | Status       |
| --- | ------------------------- | ---------------------------- | ------------ |
| 1   | Dodanie data-test-id      | 5 komponentów                | Do wykonania |
| 2   | Fixture createWorkoutPlan | fixtures/workout-plans.ts    | Do wykonania |
| 3   | Page Objects              | 3 nowe pliki                 | Do wykonania |
| 4   | Test E2E                  | workout-session-flow.spec.ts | Do wykonania |
| 5   | Edge cases i walidacja    | W teście                     | Do wykonania |

---

## Uwagi z test-plan.md i e2e-testing-best-practices.md

1. **page.reload()** – po operacjach modyfikujących dane, przed weryfikacją listy
2. **expect.poll()** – dla weryfikacji danych, które mogą być cache'owane
3. **waitForLoadState("networkidle")** – po nawigacji
4. **test.setTimeout(90000)** – pełny przepływ może trwać ~60-90s
5. **DRY** – fixture `createWorkoutPlan` gdy operacja używana w 2+ testach

---

**Wersja**: 1.0  
**Data**: 2025-01-29
