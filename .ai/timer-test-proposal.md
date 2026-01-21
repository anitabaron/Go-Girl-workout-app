# Propozycja testów dla automatycznej pauzy timera sesji treningowej

## Przegląd

Dokument zawiera rekomendacje dotyczące testów dla funkcjonalności automatycznej pauzy timera sesji treningowej. Testy te wykryłyby problemy, które zostały naprawione w implementacji:

1. Auto-pauza uruchamiająca się przy pierwszym mount
2. Auto-pauza uruchamiająca się podczas kliknięcia OK (interakcja użytkownika)
3. Auto-pauza przy route change
4. Auto-pauza przy visibilitychange (z zabezpieczeniem przed fałszywymi alarmami)

## Framework testowy - Rekomendacja

### Rekomendowany stack:
- **Vitest** - szybki test runner, dobra integracja z Next.js
- **React Testing Library** - testowanie komponentów React
- **@testing-library/user-event** - symulacja interakcji użytkownika
- **MSW (Mock Service Worker)** - mockowanie API calls
- **Playwright** (opcjonalnie) - testy E2E dla bardziej złożonych scenariuszy

### Instalacja:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/ui
npm install -D msw # dla mockowania API
```

## Testy jednostkowe - Kluczowe scenariusze

### 1. Test: Auto-pauza nie uruchamia się przy pierwszym mount

**Problem który wykrywa:** Auto-pauza wywoływana podczas inicjalizacji komponentu

```typescript
// src/components/workout-sessions/assistant/__tests__/workout-session-assistant.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { WorkoutSessionAssistant } from '../workout-session-assistant';
import type { SessionDetailDTO } from '@/types';

describe('WorkoutSessionAssistant - Auto-pauza przy mount', () => {
  const mockSession: SessionDetailDTO = {
    id: 'session-1',
    status: 'in_progress',
    last_timer_started_at: null,
    last_timer_stopped_at: null,
    active_duration_seconds: 0,
    exercises: [
      {
        id: 'exercise-1',
        exercise_order: 1,
        exercise_title_at_time: 'Test Exercise',
        planned_sets: 3,
        planned_reps: 10,
        // ... reszta danych
      },
    ],
    // ... reszta danych sesji
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('nie powinien wywołać auto-pauzy przy pierwszym mount', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock odpowiedzi API dla start timera
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-1',
          active_duration_seconds: 0,
          last_timer_started_at: new Date().toISOString(),
          last_timer_stopped_at: null,
        },
      }),
    });

    render(
      <WorkoutSessionAssistant 
        sessionId="session-1" 
        initialSession={mockSession} 
      />
    );

    // Poczekaj na inicjalizację timera
    await waitFor(() => {
      // Sprawdź, że timer został uruchomiony (start timer)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/timer'),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('last_timer_started_at'),
        })
      );
    }, { timeout: 3000 });

    // Sprawdź, że auto-pauza NIE została wywołana
    const pauseCalls = mockFetch.mock.calls.filter(
      (call) => {
        const body = call[1]?.body;
        return body && typeof body === 'string' && body.includes('last_timer_stopped_at');
      }
    );
    expect(pauseCalls.length).toBe(0);
  });

  it('powinien uruchomić timer jeśli nie jest już uruchomiony', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-1',
          active_duration_seconds: 0,
          last_timer_started_at: new Date().toISOString(),
          last_timer_stopped_at: null,
        },
      }),
    });

    render(
      <WorkoutSessionAssistant 
        sessionId="session-1" 
        initialSession={mockSession} 
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workout-sessions/session-1/timer'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });
});
```

### 2. Test: Auto-pauza nie uruchamia się podczas kliknięcia OK

**Problem który wykrywa:** Auto-pauza wywoływana podczas normalnej interakcji użytkownika (kliknięcie OK w RepsDisplay)

```typescript
describe('WorkoutSessionAssistant - Auto-pauza podczas interakcji', () => {
  it('nie powinien wywołać auto-pauzy podczas kliknięcia OK w RepsDisplay', async () => {
    const mockSession: SessionDetailDTO = {
      // ... dane sesji z ćwiczeniem z reps
      exercises: [{
        id: 'exercise-1',
        exercise_order: 1,
        exercise_title_at_time: 'Test Exercise',
        planned_sets: 3,
        planned_reps: 10,
        planned_duration_seconds: null,
        // ... reszta danych
      }],
    };

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-1',
          active_duration_seconds: 0,
          last_timer_started_at: new Date().toISOString(),
          last_timer_stopped_at: null,
        },
      }),
    });

    const { getByText, findByText } = render(
      <WorkoutSessionAssistant 
        sessionId="session-1" 
        initialSession={mockSession} 
      />
    );

    // Poczekaj na załadowanie i znalezienie przycisku OK
    const okButton = await findByText('OK');
    
    // Symuluj kliknięcie OK
    fireEvent.click(okButton);

    // Poczekaj chwilę na ewentualne wywołania
    await waitFor(() => {
      // Sprawdź, że auto-pauza NIE została wywołana
      const pauseCalls = mockFetch.mock.calls.filter(
        (call) => {
          const body = call[1]?.body;
          return body && typeof body === 'string' && body.includes('last_timer_stopped_at');
        }
      );
      expect(pauseCalls.length).toBe(0);
    }, { timeout: 1000 });
  });
});
```

### 3. Test: Auto-pauza przy route change

**Problem który wykrywa:** Auto-pauza powinna działać tylko gdy użytkownik faktycznie opuszcza stronę aktywnej sesji

```typescript
import { usePathname, useRouter } from 'next/navigation';

// Mock Next.js hooks
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

describe('WorkoutSessionAssistant - Auto-pauza przy route change', () => {
  it('powinien wywołać auto-pauzę przy opuszczeniu strony aktywnej sesji', async () => {
    const mockRouter = {
      push: vi.fn(),
    };

    const mockPathname = vi.fn();
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(mockPathname);
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock start timera
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-1',
          active_duration_seconds: 0,
          last_timer_started_at: new Date().toISOString(),
          last_timer_stopped_at: null,
        },
      }),
    });

    // Mock auto-pauzy
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-1',
          active_duration_seconds: 10,
          last_timer_started_at: new Date().toISOString(),
          last_timer_stopped_at: new Date().toISOString(),
        },
      }),
    });

    // Najpierw renderuj na stronie aktywnej sesji
    mockPathname.mockReturnValue('/workout-sessions/session-1/active');
    
    const { rerender } = render(
      <WorkoutSessionAssistant 
        sessionId="session-1" 
        initialSession={mockSession} 
      />
    );

    // Poczekaj na inicjalizację
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Symuluj zmianę pathname (opuszczenie strony)
    mockPathname.mockReturnValue('/workout-sessions');
    rerender(
      <WorkoutSessionAssistant 
        sessionId="session-1" 
        initialSession={mockSession} 
      />
    );

    await waitFor(() => {
      // Sprawdź, że auto-pauza została wywołana
      const pauseCalls = mockFetch.mock.calls.filter(
        (call) => {
          const body = call[1]?.body;
          return body && typeof body === 'string' && body.includes('last_timer_stopped_at');
        }
      );
      expect(pauseCalls.length).toBeGreaterThan(0);
    });
  });

  it('nie powinien wywołać auto-pauzy jeśli jesteśmy na stronie aktywnej sesji', async () => {
    // ... podobny test, ale pathname pozostaje na stronie aktywnej sesji
  });
});
```

### 4. Test: Auto-pauza przy visibilitychange (z zabezpieczeniem)

**Problem który wykrywa:** Fałszywe alarmy visibilitychange podczas interakcji użytkownika

```typescript
describe('WorkoutSessionAssistant - Auto-pauza przy visibilitychange', () => {
  beforeEach(() => {
    // Reset timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('nie powinien wywołać auto-pauzy przy szybkiej zmianie visibility (fałszywy alarm)', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-1',
          active_duration_seconds: 0,
          last_timer_started_at: new Date().toISOString(),
          last_timer_stopped_at: null,
        },
      }),
    });

    render(
      <WorkoutSessionAssistant 
        sessionId="session-1" 
        initialSession={mockSession} 
      />
    );

    // Poczekaj na inicjalizację
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Symuluj szybką zmianę visibility (np. podczas kliknięcia OK)
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'hidden',
      configurable: true,
    });
    
    // Wywołaj event natychmiast (szybka zmiana - < 1 sekunda)
    document.dispatchEvent(new Event('visibilitychange'));

    // Sprawdź, że auto-pauza NIE została wywołana (zabezpieczenie działa)
    await waitFor(() => {
      const pauseCalls = mockFetch.mock.calls.filter(
        (call) => {
          const body = call[1]?.body;
          return body && typeof body === 'string' && body.includes('last_timer_stopped_at');
        }
      );
      expect(pauseCalls.length).toBe(0);
    });
  });

  it('powinien wywołać auto-pauzę przy rzeczywistym wygaszeniu ekranu', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-1',
          active_duration_seconds: 0,
          last_timer_started_at: new Date().toISOString(),
          last_timer_stopped_at: null,
        },
      }),
    });

    render(
      <WorkoutSessionAssistant 
        sessionId="session-1" 
        initialSession={mockSession} 
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Symuluj rzeczywiste wygaszenie (strona była widoczna przez >1s)
    vi.advanceTimersByTime(2000); // 2 sekundy

    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'hidden',
      configurable: true,
    });
    
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      // Sprawdź, że auto-pauza została wywołana
      const pauseCalls = mockFetch.mock.calls.filter(
        (call) => {
          const body = call[1]?.body;
          return body && typeof body === 'string' && body.includes('last_timer_stopped_at');
        }
      );
      expect(pauseCalls.length).toBeGreaterThan(0);
    });
  });
});
```

### 5. Test: Auto-pauza przy ręcznym wyjściu

```typescript
describe('WorkoutSessionAssistant - Ręczne wyjście', () => {
  it('powinien wywołać auto-pauzę i zapisać postępy przy kliknięciu "Wyjdź"', async () => {
    const mockRouter = {
      push: vi.fn(),
    };
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock start timera
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-1',
          active_duration_seconds: 0,
          last_timer_started_at: new Date().toISOString(),
          last_timer_stopped_at: null,
        },
      }),
    });

    // Mock zapisu ćwiczenia
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { /* dane ćwiczenia */ },
      }),
    });

    // Mock auto-pauzy
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-1',
          active_duration_seconds: 10,
          last_timer_started_at: new Date().toISOString(),
          last_timer_stopped_at: new Date().toISOString(),
        },
      }),
    });

    const { getByText } = render(
      <WorkoutSessionAssistant 
        sessionId="session-1" 
        initialSession={mockSession} 
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Kliknij przycisk "Wyjdź"
    const exitButton = getByText(/wyjdź/i);
    fireEvent.click(exitButton);

    await waitFor(() => {
      // Sprawdź, że auto-pauza została wywołana
      const pauseCalls = mockFetch.mock.calls.filter(
        (call) => {
          const body = call[1]?.body;
          return body && typeof body === 'string' && body.includes('last_timer_stopped_at');
        }
      );
      expect(pauseCalls.length).toBeGreaterThan(0);
      
      // Sprawdź, że zapis ćwiczenia został wywołany
      const saveCalls = mockFetch.mock.calls.filter(
        (call) => call[0]?.includes('/exercises/')
      );
      expect(saveCalls.length).toBeGreaterThan(0);
      
      // Sprawdź, że nastąpiło przekierowanie
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
});
```

## Testy integracyjne

### Test: Pełny flow sesji z auto-pauzą

```typescript
describe('WorkoutSessionAssistant - Integracja auto-pauzy', () => {
  it('powinien poprawnie obsłużyć pełny flow: start → interakcja → route change → auto-pauza', async () => {
    // 1. Render komponentu
    // 2. Sprawdź, że timer się uruchomił
    // 3. Wykonaj interakcję (kliknięcie OK) - sprawdź, że auto-pauza się NIE wywołała
    // 4. Zmień route - sprawdź, że auto-pauza się wywołała
    // 5. Sprawdź, że timer został zatrzymany w bazie
  });
});
```

## Co byłoby trudne do przetestowania

### 1. `beforeunload` i `pagehide` eventy

**Problem:** Te eventy są trudne do symulacji w testach jednostkowych, ponieważ wymagają rzeczywistego zamknięcia przeglądarki.

**Rozwiązanie:**
- Testy E2E z Playwright mogą symulować zamknięcie przeglądarki
- Można przetestować logikę `saveProgressOnUnload` osobno (unit test)

```typescript
// Test logiki saveProgressOnUnload (bez rzeczywistego eventu)
describe('saveProgressOnUnload', () => {
  it('powinien zapisać postępy i pauzować timer', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const saveProgressOnUnload = createSaveProgressOnUnload(
      mockFormData,
      mockExerciseOrder,
      'session-1'
    );

    saveProgressOnUnload();

    await waitFor(() => {
      // Sprawdź, że fetch został wywołany z keepalive
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          keepalive: true,
        })
      );
    });
  });
});
```

### 2. `navigator.sendBeacon()`

**Problem:** `sendBeacon` może być trudny do mockowania w niektórych środowiskach testowych.

**Rozwiązanie:**
- Użycie `fetch` z `keepalive: true` (jak w obecnej implementacji) jest łatwiejsze do testowania
- Można przetestować, że `keepalive: true` jest ustawione

### 3. Timing issues i race conditions

**Problem:** Race conditions między eventami mogą być trudne do odtworzenia.

**Rozwiązanie:**
- Użycie `vi.useFakeTimers()` w Vitest
- Testowanie różnych kolejności eventów
- Testowanie z różnymi opóźnieniami

### 4. Integracja z Next.js router

**Problem:** Next.js router może być trudny do mockowania.

**Rozwiązanie:**
- Mockowanie `usePathname` i `useRouter` (jak w przykładach powyżej)
- Testy E2E z Playwright dla pełnej integracji

## Testy E2E (Playwright) - Opcjonalne

Dla bardziej złożonych scenariuszy można użyć Playwright:

```typescript
// e2e/workout-session-auto-pause.spec.ts
import { test, expect } from '@playwright/test';

test('auto-pauza przy zamknięciu przeglądarki', async ({ page, context }) => {
  // 1. Zaloguj się i rozpocznij sesję
  await page.goto('/workout-sessions/start');
  await page.click('button:has-text("Start")');
  
  // 2. Poczekaj na załadowanie asystenta
  await expect(page.locator('text=Test Exercise')).toBeVisible();
  
  // 3. Zamknij kartę (symulacja)
  await page.close();
  
  // 4. Otwórz nową kartę i sprawdź, że sesja jest w pauzie
  const newPage = await context.newPage();
  await newPage.goto('/workout-sessions/session-1');
  
  // Sprawdź, że timer został zatrzymany
  // (wymaga sprawdzenia w bazie danych lub przez API)
});
```

## Konfiguracja Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup po każdym teście
afterEach(() => {
  cleanup();
});
```

## Priorytety testów

### Wysoki priorytet (krytyczne):
1. ✅ Auto-pauza nie uruchamia się przy pierwszym mount
2. ✅ Auto-pauza nie uruchamia się podczas kliknięcia OK
3. ✅ Auto-pauza działa przy route change

### Średni priorytet:
4. ✅ Auto-pauza przy visibilitychange (z zabezpieczeniem)
5. ✅ Auto-pauza przy ręcznym wyjściu
6. ✅ Testy integracyjne pełnego flow

### Niski priorytet (opcjonalne):
7. Testy E2E z Playwright
8. Testy `beforeunload` i `pagehide` (E2E)
9. Testy performance (timing issues)

## Podsumowanie

Testy te wykryłyby wszystkie problemy, które zostały naprawione w implementacji:

- ✅ Auto-pauza przy pierwszym mount
- ✅ Auto-pauza podczas interakcji użytkownika
- ✅ Auto-pauza przy route change
- ✅ Fałszywe alarmy visibilitychange

Rekomendowany stack (Vitest + React Testing Library) jest odpowiedni dla tych testów i dobrze integruje się z Next.js.
