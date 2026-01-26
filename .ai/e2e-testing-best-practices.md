# E2E Testing Best Practices - Go Girl Workout App

## Zasada DRY (Don't Repeat Yourself)

### Kiedy refaktorować wspólny kod?

✅ **REFAKTORUJ** gdy:
- Ten sam kod pojawia się w **2+ testach**
- Kod reprezentuje **wspólny przepływ biznesowy** (np. tworzenie ćwiczenia)
- Zmiana w jednym miejscu wymaga zmian w wielu miejscach
- Kod jest **długi i skomplikowany** (>10 linii)

❌ **NIE REFAKTORUJ** gdy:
- Kod pojawia się tylko w **jednym teście**
- Kod jest **prosty i czytelny** (<5 linii)
- Refaktoring **utrudnia czytelność** testu
- Test ma **specyficzne wymagania** różniące się od innych

## Wzorce organizacji kodu testowego

### 1. Fixtures (Helper Functions)

**Lokalizacja**: `e2e/fixtures/`

**Użycie**: Wspólne operacje, które są używane w wielu testach

**Przykłady**:
- `authenticateUser()` - logowanie
- `createExercise()` - tworzenie ćwiczenia
- `createExercises()` - tworzenie wielu ćwiczeń
- `teardownUserData()` - czyszczenie danych

**Zalety**:
- ✅ Centralizacja logiki
- ✅ Łatwe utrzymanie
- ✅ Możliwość reużycia
- ✅ Testy są bardziej czytelne

**Przykład**:
```typescript
// fixtures/exercises.ts
export async function createExercise(page: Page, data: ExerciseData): Promise<string> {
  // ... wspólna logika tworzenia ćwiczenia
}

// W teście:
const exerciseTitle = await createExercise(page, { part: 'Arms' });
```

### 2. Page Objects

**Lokalizacja**: `e2e/pages/`

**Użycie**: Encapsulacja interakcji ze stroną/komponentem

**Zalety**:
- ✅ Izolacja zmian w UI
- ✅ Czytelne metody (`page.clickAddExercise()`)
- ✅ Centralizacja selektorów

**Przykład**:
```typescript
// pages/exercises-page.ts
export class ExercisesPage {
  async clickAddExercise() { ... }
  async hasExerciseWithTitle(title: string) { ... }
}
```

### 3. Test Data Builders

**Użycie**: Tworzenie danych testowych z domyślnymi wartościami

**Przykład**:
```typescript
const exerciseData = {
  ...defaultExerciseData,
  part: 'Legs', // override
};
```

### 4. beforeEach / afterEach Hooks

**Użycie**: Wspólna konfiguracja dla wszystkich testów w `describe` block

**Przykład**:
```typescript
test.describe('Workout Plans', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });
  
  test('should create plan', async ({ page }) => {
    // User is already authenticated
  });
});
```

## Hierarchia abstrakcji

```
Test (czytelny, wysokopoziomowy)
  ↓
Fixtures (wspólne operacje biznesowe)
  ↓
Page Objects (interakcje z UI)
  ↓
Playwright API (niskopoziomowe operacje)
```

## Przykłady refaktoringu

### Przed refaktoringiem ❌

```typescript
test('should create plan', async ({ page }) => {
  await authenticateUser(page);
  
  // Duplikacja kodu tworzenia ćwiczenia
  const exercisesPage = new ExercisesPage(page);
  await exercisesPage.goto();
  await exercisesPage.clickAddExercise();
  const formPage = new ExerciseFormPage(page);
  await formPage.fillRequiredFields({ ... });
  await formPage.submit();
  // ... 20+ linii kodu
});
```

### Po refaktoringu ✅

```typescript
test('should create plan', async ({ page }) => {
  await authenticateUser(page);
  
  // Czytelne, wysokopoziomowe
  const exerciseTitle = await createExercise(page, { part: 'Arms' });
  
  // Reszta testu...
});
```

## Zasady dla naszego projektu

### 1. Fixtures dla wspólnych operacji

Utwórz fixture gdy:
- Operacja jest używana w **2+ testach**
- Operacja reprezentuje **kompletny przepływ biznesowy**
- Operacja jest **długa** (>10 linii)

### 2. Page Objects dla interakcji z UI

Zawsze używaj Page Objects dla:
- Nawigacji
- Interakcji z formularzami
- Weryfikacji stanu strony

### 3. Testy powinny być czytelne

Test powinien czytać się jak **scenariusz użytkownika**:
```typescript
// ✅ Dobrze
test('should create plan', async ({ page }) => {
  await authenticateUser(page);
  const exercises = await createExercises(page, 2);
  await createWorkoutPlan(page, { exercises });
  await verifyPlanExists(page, planName);
});

// ❌ Źle - za dużo szczegółów implementacyjnych
test('should create plan', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-test-id="email"]', '...');
  // ... 50 linii szczegółów
});
```

### 4. Testy powinny być niezależne

Każdy test powinien:
- ✅ Tworzyć własne dane testowe
- ✅ Nie zależeć od innych testów
- ✅ Czyścić po sobie (jeśli potrzebne)

### 5. Używaj opisowych nazw

```typescript
// ✅ Dobrze
test('should create workout plan with 2 exercises successfully', ...)

// ❌ Źle
test('test 1', ...)
```

## Checklist przed refaktoringiem

- [ ] Czy kod jest używany w 2+ testach?
- [ ] Czy refaktoring poprawi czytelność?
- [ ] Czy nie utrudni debugowania?
- [ ] Czy nie ukryje ważnych szczegółów testu?
- [ ] Czy można łatwo przetestować helper function osobno?

## Przykłady z projektu

### ✅ Dobry przykład - użycie fixtures

```typescript
// fixtures/exercises.ts
export async function createExercise(page: Page, data: ExerciseData) {
  // Wspólna logika
}

// test
const title = await createExercise(page, { part: 'Arms' });
```

### ✅ Dobry przykład - Page Objects

```typescript
// pages/workout-plans-page.ts
export class WorkoutPlansPage {
  async clickCreatePlan() { ... }
}

// test
await workoutPlansPage.clickCreatePlan();
```

### ❌ Zły przykład - duplikacja

```typescript
// W każdym teście:
const exercisesPage = new ExercisesPage(page);
await exercisesPage.goto();
await exercisesPage.clickAddExercise();
// ... 20 linii powtórzonego kodu
```

## Podsumowanie

**Złota zasada**: Jeśli kod jest używany w **2+ testach** i reprezentuje **kompletny przepływ**, utwórz fixture lub helper function.

**Priorytet**: Czytelność testów > DRY. Jeśli refaktoring utrudnia zrozumienie testu, lepiej zostawić duplikację.
