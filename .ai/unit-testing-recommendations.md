# Rekomendacje Unit Testów - Fragment Exercises

## Analiza elementów wartych przetestowania

### 🎯 PRIORYTET WYSOKI - Funkcje czyste (Pure Functions)

#### 1. **`normalizeTitle()` - `src/lib/validation/exercises.ts`**
```typescript
export function normalizeTitle(value: string)
```

**Dlaczego warto testować:**
- ✅ Funkcja czysta (pure function) - łatwa do testowania
- ✅ Kluczowa dla logiki biznesowej (normalizacja tytułów dla unikalności)
- ✅ Obsługuje edge cases (diakrytyki, wielokrotne spacje, wielkość liter)
- ✅ Brak zależności zewnętrznych

**Co testować:**
- Normalizacja diakrytyków (ą → a, ć → c, etc.)
- Usuwanie wielokrotnych spacji
- Konwersja na małe litery
- Trimowanie białych znaków
- Obsługa pustych stringów
- Obsługa stringów z samymi spacjami
- Stringi z mieszanymi znakami specjalnymi

**Przykładowe testy:**
```typescript
describe('normalizeTitle', () => {
  it('should normalize diacritics', () => {
    expect(normalizeTitle('Ćwiczenie')).toBe('cwiczenie');
    expect(normalizeTitle('Łąka')).toBe('laka');
  });
  
  it('should remove multiple spaces', () => {
    expect(normalizeTitle('Ćwiczenie   na   nogi')).toBe('cwiczenie na nogi');
  });
  
  it('should convert to lowercase', () => {
    expect(normalizeTitle('PRZYSIADY')).toBe('przysiady');
  });
  
  it('should trim whitespace', () => {
    expect(normalizeTitle('  przysiady  ')).toBe('przysiady');
  });
});
```

---

#### 2. **`validateExerciseBusinessRules()` - `src/lib/validation/exercises.ts`**
```typescript
export function validateExerciseBusinessRules(input: Partial<...>)
```

**Dlaczego warto testować:**
- ✅ Funkcja czysta z logiką biznesową
- ✅ Zawiera złożone reguły walidacji (mutually exclusive fields)
- ✅ Brak zależności zewnętrznych
- ✅ Wysoka wartość biznesowa (zapobiega nieprawidłowym danym)

**Co testować:**
- Wymagane: dokładnie jedno z `reps` lub `duration_seconds`
- Wymagane: co najmniej jedno z `rest_in_between_seconds` lub `rest_after_series_seconds`
- `series` musi być > 0
- `rest_in_between_seconds` nie może być ujemne
- `rest_after_series_seconds` nie może być ujemne
- Kombinacje poprawnych i niepoprawnych wartości
- Edge cases (null, undefined, 0)

**Przykładowe testy:**
```typescript
describe('validateExerciseBusinessRules', () => {
  it('should return error when both reps and duration are provided', () => {
    const result = validateExerciseBusinessRules({
      reps: 10,
      duration_seconds: 30,
      series: 3,
      rest_in_between_seconds: 60
    });
    expect(result).toContain('Podaj dokładnie jedno z pól: reps lub duration_seconds');
  });
  
  it('should return error when neither reps nor duration is provided', () => {
    const result = validateExerciseBusinessRules({
      series: 3,
      rest_in_between_seconds: 60
    });
    expect(result).toContain('Podaj dokładnie jedno z pól: reps lub duration_seconds');
  });
  
  it('should return error when no rest fields are provided', () => {
    const result = validateExerciseBusinessRules({
      reps: 10,
      series: 3
    });
    expect(result).toContain('Wymagane jest co najmniej jedno pole odpoczynku');
  });
  
  it('should return error when series is 0 or negative', () => {
    const result = validateExerciseBusinessRules({
      reps: 10,
      series: 0,
      rest_in_between_seconds: 60
    });
    expect(result).toContain('Pole series musi być większe od zera');
  });
  
  it('should return empty array for valid input', () => {
    const result = validateExerciseBusinessRules({
      reps: 10,
      series: 3,
      rest_in_between_seconds: 60
    });
    expect(result).toEqual([]);
  });
});
```

---

#### 3. **`collectBusinessRuleErrors()` - `src/lib/validation/exercises.ts`**
```typescript
function collectBusinessRuleErrors(input: Partial<...>)
```

**Dlaczego warto testować:**
- ✅ Funkcja czysta (nawet jeśli private, warto wyeksportować dla testów lub testować przez publiczną funkcję)
- ✅ Zawiera całą logikę walidacji biznesowej
- ✅ Wiele ścieżek warunkowych do pokrycia

**Co testować:**
- Wszystkie kombinacje błędów
- Kolejność zwracanych błędów
- Obsługa wartości null/undefined

---

#### 4. **`pickValue()` - `src/services/exercises.ts`**
```typescript
function pickValue<T extends object, K extends keyof T, V>(
  obj: T,
  key: K,
  fallback: V
): T[K] | V
```

**Dlaczego warto testować:**
- ✅ Funkcja pomocnicza używana w `mergeExercise()`
- ✅ Logika warunkowa (hasOwn, undefined check)
- ✅ Funkcja czysta, łatwa do testowania

**Co testować:**
- Zwraca wartość z obiektu, jeśli klucz istnieje i wartość nie jest undefined
- Zwraca fallback, jeśli klucz nie istnieje
- Zwraca fallback, jeśli wartość jest undefined
- Obsługa różnych typów wartości

**Przykładowe testy:**
```typescript
describe('pickValue', () => {
  it('should return value from object when key exists and value is not undefined', () => {
    const obj = { title: 'Test', type: 'Main Workout' };
    expect(pickValue(obj, 'title', 'Default')).toBe('Test');
  });
  
  it('should return fallback when key does not exist', () => {
    const obj = { title: 'Test' };
    expect(pickValue(obj, 'type', 'Default')).toBe('Default');
  });
  
  it('should return fallback when value is undefined', () => {
    const obj = { title: undefined };
    expect(pickValue(obj, 'title', 'Default')).toBe('Default');
  });
  
  it('should handle null values correctly', () => {
    const obj = { title: null };
    expect(pickValue(obj, 'title', 'Default')).toBe(null);
  });
});
```

---

#### 5. **`mergeExercise()` - `src/services/exercises.ts`**
```typescript
function mergeExercise(
  existing: ExerciseRow,
  patch: ReturnType<typeof exerciseUpdateSchema.parse>
)
```

**Dlaczego warto testować:**
- ✅ Logika łączenia danych (partial update)
- ✅ Używa `pickValue()` - warto przetestować integrację
- ✅ Funkcja czysta

**Co testować:**
- Łączenie wszystkich pól
- Częściowe aktualizacje (tylko niektóre pola)
- Zachowanie wartości istniejących, gdy patch nie zawiera pola
- Obsługa null/undefined w patch

**Przykładowe testy:**
```typescript
describe('mergeExercise', () => {
  it('should merge partial update with existing exercise', () => {
    const existing = {
      title: 'Old Title',
      type: 'Main Workout',
      part: 'Legs',
      series: 3,
      // ... inne pola
    };
    const patch = {
      title: 'New Title',
      series: 5
    };
    
    const result = mergeExercise(existing, patch);
    expect(result.title).toBe('New Title');
    expect(result.series).toBe(5);
    expect(result.type).toBe('Main Workout'); // zachowane z existing
  });
  
  it('should preserve existing values when patch field is undefined', () => {
    const existing = { title: 'Old Title', type: 'Main Workout' };
    const patch = { title: undefined };
    
    const result = mergeExercise(existing, patch);
    expect(result.title).toBe('Old Title'); // fallback do existing
  });
});
```

---

#### 6. **`parseOrThrow()` - `src/services/exercises.ts`**
```typescript
function parseOrThrow<T>(schema: { parse: (payload: unknown) => T }, payload: unknown): T
```

**Dlaczego warto testować:**
- ✅ Obsługa błędów walidacji (ZodError → ServiceError)
- ✅ Używana we wszystkich funkcjach serwisowych
- ✅ Funkcja czysta (z mockowaniem schema)

**Co testować:**
- Poprawne parsowanie (zwraca wynik schema.parse)
- Konwersja ZodError na ServiceError z odpowiednim kodem
- Obsługa innych błędów (nie ZodError)
- Formatowanie komunikatów błędów (join z "; ")

**Przykładowe testy:**
```typescript
describe('parseOrThrow', () => {
  it('should return parsed value when schema validation succeeds', () => {
    const schema = { parse: vi.fn().mockReturnValue({ title: 'Test' }) };
    const result = parseOrThrow(schema, { title: 'Test' });
    expect(result).toEqual({ title: 'Test' });
  });
  
  it('should throw ServiceError with BAD_REQUEST when ZodError occurs', () => {
    const zodError = new ZodError([
      { path: ['title'], message: 'Title is required', code: 'custom' },
      { path: ['type'], message: 'Type is required', code: 'custom' }
    ]);
    const schema = { parse: vi.fn().mockImplementation(() => { throw zodError; }) };
    
    expect(() => parseOrThrow(schema, {})).toThrow(ServiceError);
    expect(() => parseOrThrow(schema, {})).toThrow('Title is required; Type is required');
  });
  
  it('should re-throw non-ZodError errors', () => {
    const error = new Error('Unexpected error');
    const schema = { parse: vi.fn().mockImplementation(() => { throw error; }) };
    
    expect(() => parseOrThrow(schema, {})).toThrow('Unexpected error');
  });
});
```

---

#### 7. **`mapDbError()` - `src/services/exercises.ts`**
```typescript
function mapDbError(error: PostgrestError)
```

**Dlaczego warto testować:**
- ✅ Mapowanie błędów bazy danych na ServiceError
- ✅ Różne kody błędów PostgreSQL wymagają różnych obsług
- ✅ Funkcja czysta

**Co testować:**
- Kod 23505 (unique constraint) → CONFLICT
- Kod 23503 (foreign key) → CONFLICT
- Kod BAD_REQUEST → BAD_REQUEST
- Inne kody → INTERNAL
- Zachowanie szczegółów błędów (details)

**Przykładowe testy:**
```typescript
describe('mapDbError', () => {
  it('should map unique constraint violation (23505) to CONFLICT', () => {
    const error = { code: '23505', message: 'Duplicate key' } as PostgrestError;
    const result = mapDbError(error);
    
    expect(result).toBeInstanceOf(ServiceError);
    expect(result.code).toBe('CONFLICT');
    expect(result.message).toBe('Ćwiczenie o podanym tytule już istnieje.');
  });
  
  it('should map foreign key violation (23503) to CONFLICT', () => {
    const error = { code: '23503', message: 'Foreign key violation' } as PostgrestError;
    const result = mapDbError(error);
    
    expect(result.code).toBe('CONFLICT');
    expect(result.message).toBe('Operacja narusza istniejące powiązania.');
  });
  
  it('should map BAD_REQUEST code to BAD_REQUEST', () => {
    const error = { code: 'BAD_REQUEST', message: 'Invalid input', details: 'Details' } as PostgrestError;
    const result = mapDbError(error);
    
    expect(result.code).toBe('BAD_REQUEST');
    expect(result.message).toBe('Invalid input');
    expect(result.details).toBe('Details');
  });
  
  it('should map unknown errors to INTERNAL', () => {
    const error = { code: 'UNKNOWN', message: 'Database error' } as PostgrestError;
    const result = mapDbError(error);
    
    expect(result.code).toBe('INTERNAL');
    expect(result.message).toBe('Wystąpił błąd serwera.');
  });
});
```

---

#### 8. **`assertUser()` - `src/services/exercises.ts`**
```typescript
function assertUser(userId: string)
```

**Dlaczego warto testować:**
- ✅ Prosta funkcja, ale kluczowa dla bezpieczeństwa
- ✅ Funkcja czysta

**Co testować:**
- Rzuca ServiceError z UNAUTHORIZED, gdy userId jest pusty
- Rzuca ServiceError z UNAUTHORIZED, gdy userId jest null/undefined
- Nie rzuca błędu dla poprawnych userId

---

### 🎯 PRIORYTET ŚREDNI - Funkcje serwisowe (z mockowaniem)

#### 9. **Funkcje serwisowe - `src/services/exercises.ts`**

**Dlaczego warto testować:**
- ✅ Zawierają logikę biznesową i orkiestrację
- ✅ Obsługa błędów i edge cases
- ⚠️ Wymagają mockowania zależności (Supabase, repository)

**Co testować dla każdej funkcji:**

**`createExerciseService()`:**
- Poprawne tworzenie ćwiczenia
- Walidacja biznesowa przed zapisem
- Sprawdzanie duplikatów (normalized title)
- Obsługa błędów bazy danych
- Obsługa błędów walidacji

**`listExercisesService()`:**
- Poprawne zwracanie listy z paginacją
- Obsługa pustej listy
- Obsługa błędów bazy danych
- Obsługa nieprawidłowego kursora (INVALID_CURSOR)
- Mapowanie błędów

**`getExerciseService()`:**
- Zwracanie ćwiczenia, gdy istnieje
- Rzucanie NOT_FOUND, gdy nie istnieje
- Obsługa błędów bazy danych

**`updateExerciseService()`:**
- Częściowa aktualizacja
- Sprawdzanie duplikatów przy zmianie tytułu
- Walidacja biznesowa po merge
- Obsługa NOT_FOUND
- Obsługa CONFLICT (duplikat)

**`deleteExerciseService()`:**
- Poprawne usuwanie
- Obsługa NOT_FOUND
- Obsługa błędów bazy danych

**Przykładowa struktura testów:**
```typescript
describe('createExerciseService', () => {
  beforeEach(() => {
    vi.mock('@/db/supabase.server');
    vi.mock('@/repositories/exercises');
  });
  
  it('should create exercise when valid data provided', async () => {
    // Arrange
    const userId = 'user-123';
    const payload = { title: 'Test', type: 'Main Workout', part: 'Legs', series: 3, reps: 10, rest_in_between_seconds: 60 };
    
    // Mock repository responses
    vi.mocked(findByNormalizedTitle).mockResolvedValue({ data: null, error: null });
    vi.mocked(insertExercise).mockResolvedValue({ data: mockExercise, error: null });
    
    // Act
    const result = await createExerciseService(userId, payload);
    
    // Assert
    expect(result).toEqual(mockExercise);
    expect(findByNormalizedTitle).toHaveBeenCalledWith(expect.anything(), userId, 'test');
    expect(insertExercise).toHaveBeenCalled();
  });
  
  it('should throw CONFLICT when duplicate title exists', async () => {
    // Arrange
    const userId = 'user-123';
    const payload = { title: 'Test', ... };
    vi.mocked(findByNormalizedTitle).mockResolvedValue({ data: existingExercise, error: null });
    
    // Act & Assert
    await expect(createExerciseService(userId, payload)).rejects.toThrow(ServiceError);
    await expect(createExerciseService(userId, payload)).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'Ćwiczenie o podanym tytule już istnieje.'
    });
  });
  
  it('should validate business rules before creating', async () => {
    // Test walidacji biznesowej
  });
});
```

---

### 🎯 PRIORYTET ŚREDNI - Logika warunkowa w komponentach

#### 10. **`ExercisesList` - Logika renderowania - `src/components/exercises/exercises-list.tsx`**

**Dlaczego warto testować:**
- ✅ Logika warunkowa renderowania (3 różne stany)
- ✅ Prosty komponent, łatwy do testowania
- ⚠️ Server Component - wymaga specjalnego podejścia

**Co testować:**
- Renderuje `EmptyState`, gdy `exercises.length === 0` i `hasActiveFilters === false`
- Renderuje komunikat "Brak ćwiczeń spełniających kryteria", gdy `exercises.length === 0` i `hasActiveFilters === true`
- Renderuje listę `ExerciseCard[]`, gdy `exercises.length > 0`
- Renderuje komunikat paginacji, gdy `hasMore === true` i `nextCursor` istnieje
- Nie renderuje komunikatu paginacji, gdy `hasMore === false`

**Przykładowe testy (z React Testing Library):**
```typescript
describe('ExercisesList', () => {
  it('should render EmptyState when no exercises and no active filters', () => {
    render(<ExercisesList exercises={[]} hasMore={false} hasActiveFilters={false} />);
    expect(screen.getByText(/Nie masz jeszcze żadnych ćwiczeń/)).toBeInTheDocument();
  });
  
  it('should render filter message when no exercises but filters active', () => {
    render(<ExercisesList exercises={[]} hasMore={false} hasActiveFilters={true} />);
    expect(screen.getByText(/Brak ćwiczeń spełniających kryteria/)).toBeInTheDocument();
  });
  
  it('should render exercise cards when exercises exist', () => {
    const exercises = [
      { id: '1', title: 'Exercise 1', ... },
      { id: '2', title: 'Exercise 2', ... }
    ];
    render(<ExercisesList exercises={exercises} hasMore={false} />);
    expect(screen.getByText('Exercise 1')).toBeInTheDocument();
    expect(screen.getByText('Exercise 2')).toBeInTheDocument();
  });
  
  it('should render pagination message when hasMore is true', () => {
    const exercises = [{ id: '1', title: 'Exercise 1', ... }];
    render(<ExercisesList exercises={exercises} hasMore={true} nextCursor="cursor-123" />);
    expect(screen.getByText(/Więcej ćwiczeń dostępne/)).toBeInTheDocument();
  });
});
```

---

#### 11. **`ExerciseFilters` - Logika URL i debounce - `src/components/exercises/exercise-filters.tsx`**

**Dlaczego warto testować:**
- ✅ Złożona logika synchronizacji z URL
- ✅ Debounce (500ms) - wymaga testowania z fake timers
- ✅ Walidacja wartości enum
- ⚠️ Client Component z hooks - wymaga mockowania Next.js router

**Co testować:**
- Synchronizacja `searchValue` z URL przy inicjalizacji
- Debounce aktualizacji URL (500ms opóźnienie)
- Aktualizacja URL przy zmianie filtra (part/type)
- Reset kursora przy zmianie filtrów
- Walidacja wartości enum przed ustawieniem w URL
- Czyszczenie filtrów (`handleClearFilters`)
- Warunkowe renderowanie przycisku "Wyczyść filtry"

**Przykładowe testy:**
```typescript
describe('ExerciseFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mock('next/navigation', () => ({
      useSearchParams: vi.fn(),
      useRouter: vi.fn(),
      usePathname: vi.fn()
    }));
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should sync searchValue with URL on mount', () => {
    const mockSearchParams = new URLSearchParams('?search=test');
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams);
    
    render(<ExerciseFilters />);
    const input = screen.getByLabelText(/Wyszukaj ćwiczenie/);
    expect(input).toHaveValue('test');
  });
  
  it('should debounce URL update by 500ms', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    vi.mocked(usePathname).mockReturnValue('/exercises');
    
    render(<ExerciseFilters />);
    const input = screen.getByLabelText(/Wyszukaj ćwiczenie/);
    
    fireEvent.change(input, { target: { value: 'new search' } });
    
    // Przed upływem 500ms - URL nie powinien się zmienić
    expect(mockPush).not.toHaveBeenCalled();
    
    // Po 500ms - URL powinien się zmienić
    vi.advanceTimersByTime(500);
    expect(mockPush).toHaveBeenCalledWith('/exercises?search=new+search');
  });
  
  it('should validate enum values before setting in URL', () => {
    // Test walidacji part/type
  });
  
  it('should reset cursor when filters change', () => {
    // Test resetowania kursora
  });
});
```

---

#### 12. **`ExerciseSort` - Logika sortowania - `src/components/exercises/exercise-sort.tsx`**

**Dlaczego warto testować:**
- ✅ Logika przełączania order (asc/desc)
- ✅ Walidacja wartości sort
- ⚠️ Client Component z hooks

**Co testować:**
- Zmiana pola sortowania
- Przełączanie order (asc ↔ desc)
- Reset kursora przy zmianie sortowania
- Domyślne wartości (created_at, desc)

---

### 🎯 PRIORYTET NISKI - Komponenty UI (opcjonalnie)

#### 13. **`ExerciseCard` - Interakcje - `src/components/exercises/exercise-card.tsx`**

**Dlaczego warto testować (opcjonalnie):**
- ⚠️ Głównie prezentacja + proste interakcje
- ✅ Warto przetestować obsługę kliknięć (edit/delete)
- ⚠️ Większość logiki to renderowanie - lepiej testować przez E2E

**Co testować (jeśli unit testy):**
- Wywołanie `onEdit` przy kliknięciu przycisku edycji
- Otwieranie dialogu usuwania przy kliknięciu przycisku usuwania
- Nawigacja do szczegółów przy kliknięciu karty

---

#### 14. **`DeleteExerciseDialog` - Logika usuwania - `src/components/exercises/details/delete-exercise-dialog.tsx`**

**Dlaczego warto testować:**
- ✅ Logika obsługi błędów API (różne kody statusu)
- ✅ Różne ścieżki błędów (409, 404, 401, 500, network error)
- ⚠️ Wymaga mockowania fetch API

**Co testować:**
- Poprawne usuwanie (200/204)
- Obsługa 409 (CONFLICT) - ćwiczenie używane w historii
- Obsługa 404 (NOT_FOUND)
- Obsługa 401/403 (UNAUTHORIZED) - przekierowanie do /login
- Obsługa 500+ (server error)
- Obsługa network error (TypeError)
- Wyświetlanie odpowiednich komunikatów toast
- Stan loading podczas usuwania
- Zamknięcie dialogu po sukcesie

**Przykładowe testy:**
```typescript
describe('DeleteExerciseDialog', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  
  it('should delete exercise and show success toast', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    const onOpenChange = vi.fn();
    
    render(<DeleteExerciseDialog exerciseId="123" exerciseTitle="Test" open={true} onOpenChange={onOpenChange} />);
    
    const deleteButton = screen.getByLabelText(/Potwierdź usunięcie/);
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/exercises/123', { method: 'DELETE' });
      expect(toast.success).toHaveBeenCalledWith('Ćwiczenie zostało usunięte');
    });
  });
  
  it('should handle 409 conflict error', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 409 } as Response);
    
    render(<DeleteExerciseDialog ... />);
    fireEvent.click(screen.getByLabelText(/Potwierdź usunięcie/));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów'
      );
    });
  });
  
  // ... inne testy błędów
});
```

---

## Podsumowanie - Priorytetyzacja

### ✅ ZALECANE DO TESTÓW (Wysoki priorytet)

1. **`normalizeTitle()`** - Funkcja czysta, kluczowa logika
2. **`validateExerciseBusinessRules()`** - Logika biznesowa, wiele edge cases
3. **`collectBusinessRuleErrors()`** - Wszystkie reguły walidacji
4. **`pickValue()`** - Funkcja pomocnicza, używana w merge
5. **`mergeExercise()`** - Logika łączenia danych
6. **`parseOrThrow()`** - Obsługa błędów walidacji
7. **`mapDbError()`** - Mapowanie błędów bazy danych
8. **`assertUser()`** - Bezpieczeństwo

### ⚠️ WARTO ROZWAŻYĆ (Średni priorytet)

9. **Funkcje serwisowe** (`createExerciseService`, `listExercisesService`, etc.) - Wymagają mockowania, ale zawierają ważną logikę
10. **`ExercisesList` - logika renderowania** - Prosta logika warunkowa
11. **`ExerciseFilters` - logika URL i debounce** - Złożona logika, ale wymaga mockowania Next.js
12. **`ExerciseSort` - logika sortowania** - Prosta logika

### 📝 OPCJONALNIE (Niski priorytet)

13. **`ExerciseCard` - interakcje** - Lepiej przez E2E
14. **`DeleteExerciseDialog` - obsługa błędów** - Warto, jeśli dużo logiki błędów

---

## Zasady wyboru elementów do testowania

### ✅ TESTUJ, GDY:
- Funkcja jest czysta (pure function) - łatwa do testowania
- Zawiera złożoną logikę biznesową
- Ma wiele ścieżek warunkowych
- Obsługuje edge cases
- Jest kluczowa dla bezpieczeństwa lub poprawności danych
- Brak zależności zewnętrznych lub łatwe do mockowania

### ⚠️ ROZWAŻ, GDY:
- Wymaga mockowania wielu zależności (ale logika jest ważna)
- Komponent ma złożoną logikę stanu
- Funkcja jest używana w wielu miejscach

### ❌ POMIŃ LUB TESTUJ PRZEZ E2E, GDY:
- Komponent jest głównie prezentacyjny
- Logika jest bardzo prosta (if/else bez złożoności)
- Testowanie wymaga pełnego środowiska (lepiej E2E)
- Komponent jest wrapperem bez logiki

---

## Rekomendowane narzędzia

- **Vitest** - framework testowy (już w projekcie)
- **@testing-library/react** - testowanie komponentów React
- **@testing-library/user-event** - symulacja interakcji użytkownika
- **vi.fn(), vi.mock()** - mockowanie (Vitest)
- **vi.useFakeTimers()** - testowanie debounce/timeout
