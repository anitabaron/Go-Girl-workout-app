# Wytyczne: Automatyczna pauza timera sesji treningowej

## Przegląd

Implementacja automatycznej pauzy timera sesji treningowej, która działa w następujących przypadkach:
- Ręczne wyjście z sesji (przycisk "Wyjdź")
- Przejście na inną stronę (route change)
- Unmount komponentu (zamknięcie strony/app)
- Zamknięcie przeglądarki/karty
- Wygaszenie ekranu na mobile

**Ważne:** Wszystkie przypadki pauzują zarówno:
- Globalny timer sesji (przez API)
- Timer pojedynczego ćwiczenia (przez ustawienie `isPaused` na `true`)

## Przypadki użycia i implementacja

### 1. Ręczne wyjście z sesji (przycisk "Wyjdź")

**Przypadek:** Użytkownik klika przycisk "Wyjdź z sesji treningowej"

**Implementacja:**
- Funkcja `handleExit` wywołuje `autoPause(true)`
- Zapisuje postępy ćwiczenia
- Pauzuje globalny timer przez API
- Pauzuje timer ćwiczenia (ustawia `isPaused` na `true`)
- Przekierowuje do strony głównej (`/`)

**Kod:**
```typescript
const handleExit = useCallback(async () => {
  try {
    // Automatycznie pauzuj sesję (zapisze postępy i pauzuje timery)
    await autoPause(true);
    router.push("/");
  } catch (error) {
    console.error("[WorkoutSessionAssistant.handleExit] Error:", error);
    router.push("/");
  }
}, [router, autoPause]);
```

### 2. Przejście na inną stronę (route change)

**Przypadek:** Użytkownik przechodzi z `/workout-sessions/{id}/active` na inną stronę

**Implementacja:**
- `useEffect` z `usePathname` wykrywa zmianę ścieżki
- Jeśli pathname nie jest `/workout-sessions/${sessionId}/active` i sesja nie jest w pauzie
- Wywołuje `autoPause(true)` z zapisem postępów
- Next.js czeka na zakończenie cleanup, więc async zapis działa poprawnie

**Kod:**
```typescript
useEffect(() => {
  const activePagePath = `/workout-sessions/${sessionId}/active`;
  const isOnActivePage = pathname === activePagePath;

  if (!isOnActivePage && !isPaused) {
    if (autoPauseExecutedRef.current !== pathname) {
      autoPauseExecutedRef.current = pathname;
      void autoPause(true);
    }
  } else if (isOnActivePage) {
    autoPauseExecutedRef.current = null;
  }
}, [pathname, sessionId, isPaused, autoPause]);
```

### 3. Unmount komponentu (route change w Next.js)

**Przypadek:** Komponent jest unmountowany przy przejściu na inną stronę

**Implementacja:**
- Cleanup w `useEffect` wywołuje `autoPause(true)`
- Dla route change w Next.js jest czas na async zapis
- Zapisuje postępy i pauzuje timery

**Kod:**
```typescript
useEffect(() => {
  return () => {
    // Pauzuj sesję przy unmount (wyjście z asystenta)
    // Zapisz postępy - dla route change w Next.js jest czas na async zapis
    void autoPause(true);
  };
}, [autoPause]);
```

### 4. Zamknięcie przeglądarki/karty

**Przypadek:** Użytkownik zamyka kartę lub przeglądarkę

**Implementacja:**
- Obsługa `beforeunload` i `pagehide` eventów
- Używa `saveProgressOnUnload()` z `navigator.sendBeacon()` dla niezawodnego zapisu
- Używa `fetch` z `keepalive: true` dla pauzy timera
- Działa nawet gdy strona się zamyka

**Kod:**
```typescript
const saveProgressOnUnload = useCallback(() => {
  const currentFormData = formData;
  const currentExerciseOrder = currentExercise.exercise_order;

  // Zapisz postępy przez sendBeacon (działa nawet gdy strona się zamyka)
  try {
    const command = formDataToAutosaveCommand(currentFormData, false);
    const url = `/api/workout-sessions/${sessionId}/exercises/${currentExerciseOrder}`;
    
    const blob = new Blob([JSON.stringify(command)], {
      type: "application/json",
    });
    navigator.sendBeacon(url, blob);
  } catch (error) {
    console.error("[WorkoutSessionAssistant.saveProgressOnUnload] Error:", error);
  }

  // Pauzuj timer (użyj fetch z keepalive dla niezawodności)
  const now = new Date().toISOString();
  try {
    fetch(`/api/workout-sessions/${sessionId}/timer`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        last_timer_stopped_at: now,
      }),
      keepalive: true, // Ważne: pozwala na wykonanie nawet po zamknięciu strony
    }).catch(() => {
      // Ignoruj błędy - sendBeacon już wysłał dane
    });
  } catch (error) {
    console.error("[WorkoutSessionAssistant.saveProgressOnUnload] Error pausing timer:", error);
  }
}, [formData, currentExercise.exercise_order, sessionId]);

useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!isPaused) {
      saveProgressOnUnload();
    }
  };

  const handlePageHide = () => {
    if (!isPaused) {
      saveProgressOnUnload();
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("pagehide", handlePageHide);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("pagehide", handlePageHide);
  };
}, [isPaused, saveProgressOnUnload]);
```

### 5. Wygaszenie ekranu na mobile

**Przypadek:** Ekran telefonu się wygasa lub użytkownik przełącza aplikację

**Implementacja:**
- Obsługa `visibilitychange` event
- Gdy `document.visibilityState === "hidden"` → wywołuje `autoPause(true)`
- Działa na mobile gdy ekran się wygasa, przełączenie aplikacji, itp.
- Używa normalnego async zapisu (jest czas na wykonanie)

**Kod:**
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    // Gdy strona staje się niewidoczna (wygaszenie ekranu, przełączenie aplikacji, itp.)
    if (document.visibilityState === "hidden" && !isPaused) {
      // Zapisz postępy i pauzuj sesję
      // Dla visibilitychange używamy normalnego async zapisu (jest czas)
      void autoPause(true);
    }
  };

  // visibilitychange - działa na mobile gdy ekran się wygasi lub przełączenie aplikacji
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [isPaused, autoPause]);
```

## Funkcja autoPause

Główna funkcja do automatycznej pauzy:

```typescript
const autoPause = useCallback(async (saveProgress = false) => {
  // Jeśli już jest w pauzie, nie rób nic
  if (isPaused) {
    return;
  }

  // Opcjonalnie zapisz postępy
  if (saveProgress) {
    try {
      await saveExercise(formData, false);
    } catch (error) {
      console.error("[WorkoutSessionAssistant.autoPause] Error saving progress:", error);
    }
  }

  // Zatrzymaj globalny timer przez API
  const now = new Date().toISOString();
  try {
    const timerResponse = await fetch(
      `/api/workout-sessions/${sessionId}/timer`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          last_timer_stopped_at: now,
        }),
      }
    );

    if (timerResponse.ok) {
      const timerResult = await timerResponse.json();
      // Aktualizuj stan sesji z odpowiedzi API
      if (timerResult.data) {
        setSession((prev) => ({
          ...prev,
          active_duration_seconds: timerResult.data.active_duration_seconds ?? prev.active_duration_seconds ?? 0,
          last_timer_started_at: timerResult.data.last_timer_started_at ?? prev.last_timer_started_at,
          last_timer_stopped_at: timerResult.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
        }));
      }
      // Pauzuj timer ćwiczenia (ustaw isPaused na true)
      setIsPaused(true);
    }
  } catch (error) {
    console.error("[WorkoutSessionAssistant.autoPause] Error pausing timer:", error);
  }
}, [isPaused, formData, saveExercise, sessionId]);
```

## Podsumowanie przypadków

| Przypadek | Event/Trigger | Zapis postępów | Metoda zapisu | Pauza timera |
|-----------|---------------|----------------|---------------|--------------|
| Ręczne wyjście | `handleExit` | ✅ Tak | `autoPause(true)` - async | ✅ API + `setIsPaused(true)` |
| Route change | `usePathname` change | ✅ Tak | `autoPause(true)` - async | ✅ API + `setIsPaused(true)` |
| Unmount (route) | `useEffect` cleanup | ✅ Tak | `autoPause(true)` - async | ✅ API + `setIsPaused(true)` |
| Zamknięcie przeglądarki | `beforeunload` | ✅ Tak | `sendBeacon` + `fetch(keepalive)` | ✅ API (keepalive) |
| Zamknięcie karty | `pagehide` | ✅ Tak | `sendBeacon` + `fetch(keepalive)` | ✅ API (keepalive) |
| Wygaszenie ekranu (mobile) | `visibilitychange` (hidden) | ✅ Tak | `autoPause(true)` - async | ✅ API + `setIsPaused(true)` |
| Przełączenie aplikacji (mobile) | `visibilitychange` (hidden) | ✅ Tak | `autoPause(true)` - async | ✅ API + `setIsPaused(true)` |

## Ważne uwagi

1. **Zapisywanie postępów:**
   - Dla route change i unmount: async zapis przez `autoPause(true)` - Next.js czeka na zakończenie
   - Dla zamknięcia przeglądarki: `navigator.sendBeacon()` - niezawodny zapis nawet po zamknięciu
   - Dla wygaszenia ekranu: async zapis przez `autoPause(true)` - jest czas na wykonanie

2. **Pauzowanie timera:**
   - Globalny timer: zawsze przez API (`/api/workout-sessions/${sessionId}/timer`)
   - Timer ćwiczenia: zawsze przez `setIsPaused(true)`

3. **Zapobieganie wielokrotnym wywołaniom:**
   - Użycie `autoPauseExecutedRef` dla route change
   - Sprawdzanie `isPaused` przed wywołaniem auto-pauzy

4. **Obsługa błędów:**
   - Wszystkie funkcje mają try-catch
   - Błędy są logowane, ale nie blokują działania aplikacji
   - Dla zamknięcia przeglądarki błędy są ignorowane (sendBeacon już wysłał dane)

## Testowanie

Przetestuj następujące scenariusze:

1. ✅ Kliknięcie "Wyjdź z sesji" → powinno zapisać postępy, pauzować timery, przekierować na `/`
2. ✅ Przejście na inną stronę (np. `/workout-sessions`) → powinno zapisać postępy i pauzować timery
3. ✅ Zamknięcie karty przeglądarki → powinno zapisać postępy i pauzować timery
4. ✅ Wygaszenie ekranu na mobile → powinno zapisać postępy i pauzować timery
5. ✅ Przełączenie aplikacji na mobile → powinno zapisać postępy i pauzować timery
6. ✅ Odświeżenie strony (F5) → powinno zapisać postępy i pauzować timery

## Zależności

- `usePathname` z `next/navigation` - do wykrywania zmiany ścieżki
- `navigator.sendBeacon()` - do niezawodnego zapisu przed zamknięciem przeglądarki
- `fetch` z `keepalive: true` - do pauzy timera przed zamknięciem przeglądarki
- `document.visibilityState` - do wykrywania wygaszenia ekranu na mobile

---

## Opcjonalne ulepszenia (do rozważenia w przyszłości)

Po analizie alternatywnego podejścia z `workout-session-global-timer.md`, poniższe pomysły mogą dodatkowo zwiększyć niezawodność systemu timera, szczególnie w przypadkach edge case:

### 1. Heartbeat mechanizm (backup dla eventów)

**Problem:** W niektórych przypadkach eventy (`visibilitychange`, `pagehide`) mogą nie zadziałać:
- Ubita karta przeglądarki (crash)
- Brak połączenia z internetem
- Błędy JavaScript, które blokują eventy
- Niektóre przeglądarki na mobile mogą nie zawsze wywołać eventy

**Rozwiązanie:** Dodanie mechanizmu heartbeat, który wysyła sygnał "życia" co 60 sekund, gdy:
- Timer jest uruchomiony (`last_timer_started_at` istnieje i jest nowszy niż `last_timer_stopped_at`)
- Strona jest widoczna (`document.visibilityState === "visible"`)
- Użytkownik jest na stronie aktywnej sesji (`/workout-sessions/${sessionId}/active`)

**Implementacja:**
```typescript
// Hook do heartbeat (opcjonalne ulepszenie)
useEffect(() => {
  if (!sessionId || isPaused) return;
  
  const isTimerRunning = session.last_timer_started_at && 
    (!session.last_timer_stopped_at || 
     new Date(session.last_timer_started_at) > new Date(session.last_timer_stopped_at));
  
  const isVisible = document.visibilityState === "visible";
  const isOnActivePage = pathname === `/workout-sessions/${sessionId}/active`;
  
  if (!isTimerRunning || !isVisible || !isOnActivePage) return;
  
  // Wysyłaj heartbeat co 60 sekund
  const interval = setInterval(() => {
    fetch(`/api/workout-sessions/${sessionId}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp: new Date().toISOString() }),
    }).catch(() => {
      // Ignoruj błędy - heartbeat to tylko backup
    });
  }, 60000);
  
  return () => clearInterval(interval);
}, [sessionId, isPaused, session.last_timer_started_at, session.last_timer_stopped_at, pathname]);
```

**Wymagania:**
- Nowy endpoint: `POST /api/workout-sessions/{id}/heartbeat`
- Nowe pole w bazie: `last_heartbeat_at` (timestamp ostatniego heartbeat)
- Heartbeat aktualizuje tylko `last_heartbeat_at`, nie zmienia timera

**Zalety:**
- Działa jako backup, gdy eventy nie zadziałają
- Mały ruch sieciowy (1 request/min podczas aktywności)
- Pozwala serwerowi wykryć "martwe" sesje

**Wady:**
- Dodatkowy ruch sieciowy (choć minimalny)
- Wymaga nowego endpointu i pola w bazie
- Jeśli strona zniknie tuż po heartbeat, serwer auto-pauzuje dopiero po timeout (patrz punkt 2)

**Rekomendacja:** Rozważyć jako dodatkową warstwę bezpieczeństwa, szczególnie jeśli zauważymy problemy z niezawodnością eventów.

---

### 2. Server-side timeout (automatyczna pauza martwych sesji)

**Problem:** Jeśli użytkownik zamknie aplikację bez eventów (crash, ubita karta, brak netu), timer może działać w nieskończoność.

**Rozwiązanie:** Cron job lub Edge Function, który co 1-2 minuty sprawdza sesje:
- W statusie `in_progress`
- Z `last_timer_started_at` istniejącym i nowszym niż `last_timer_stopped_at` (timer działa)
- Z `last_heartbeat_at` starszym niż `2 * heartbeat_interval + margines` (np. > 150s dla heartbeat 60s)
- LUB (jeśli brak heartbeat): `last_timer_started_at` starszym niż rozsądny timeout (np. > 5 minut)

**Akcja:** Automatyczna pauza przez wywołanie logiki timera (obliczenie elapsed time, dodanie do `active_duration_seconds`, ustawienie `last_timer_stopped_at`).

**Implementacja (przykład - Supabase Edge Function lub cron):**
```typescript
// Pseudokod dla cron/edge function
async function autoPauseInactiveSessions() {
  const sessions = await db
    .select("*")
    .from("workout_sessions")
    .eq("status", "in_progress")
    .not("last_timer_started_at", "is", null);
  
  const now = new Date();
  const timeoutThreshold = 150000; // 150 sekund (2.5 minuty)
  
  for (const session of sessions) {
    const isTimerRunning = !session.last_timer_stopped_at || 
      new Date(session.last_timer_started_at) > new Date(session.last_timer_stopped_at);
    
    if (!isTimerRunning) continue;
    
    // Sprawdź heartbeat (jeśli istnieje)
    if (session.last_heartbeat_at) {
      const heartbeatAge = now.getTime() - new Date(session.last_heartbeat_at).getTime();
      if (heartbeatAge > timeoutThreshold) {
        await pauseSessionTimer(session.id, session.last_timer_started_at);
      }
    } else {
      // Fallback: sprawdź last_timer_started_at (jeśli brak heartbeat)
      const timerAge = now.getTime() - new Date(session.last_timer_started_at).getTime();
      if (timerAge > 300000) { // 5 minut
        await pauseSessionTimer(session.id, session.last_timer_started_at);
      }
    }
  }
}
```

**Wymagania:**
- Cron job (np. Vercel Cron, Supabase Edge Function z schedule) lub background worker
- Funkcja do automatycznej pauzy sesji (może używać istniejącej logiki z `updateWorkoutSessionTimer`)

**Zalety:**
- Domyka przypadki edge case (crash, brak netu, ubita karta)
- Zapobiega zawyżeniu czasu treningu
- Działa niezależnie od frontendu

**Wady:**
- Wymaga infrastruktury (cron/edge function)
- Może doliczyć do ~150s "nadmiaru" jeśli strona zniknie tuż po heartbeat (akceptowalne dla większości przypadków)
- Jeśli chcesz dokładniej, skróć heartbeat do 15-20s (więcej ruchu sieciowego)

**Rekomendacja:** Rozważyć jako długoterminowe ulepszenie, szczególnie jeśli zauważymy problemy z "martwymi" sesjami w bazie danych.

---

### 3. Różnicowanie AUTO_PAUSE vs manual PAUSE (opcjonalne)

**Pomysł:** Dodać pole `pause_type` lub `last_pause_reason` do sesji, aby rozróżnić:
- `manual` - użytkownik kliknął "Pause"
- `auto_visibility` - auto-pauza przez `visibilitychange`
- `auto_route_change` - auto-pauza przez route change
- `auto_unmount` - auto-pauza przez unmount
- `auto_server_timeout` - auto-pauza przez server-side timeout

**Zastosowanie:**
- Analityka: zrozumienie, jak często użytkownicy pauzują vs auto-pauza
- Debugowanie: łatwiejsze śledzenie problemów z timerem
- UX: potencjalnie różne zachowania (np. powiadomienie "Sesja została automatycznie wstrzymana")

**Wymagania:**
- Nowe pole w bazie: `last_pause_reason` (enum lub string)
- Aktualizacja logiki timera, aby zapisywać powód pauzy

**Rekomendacja:** Opcjonalne, przydatne głównie do analityki i debugowania. Nie jest krytyczne dla funkcjonalności.

---

### 4. Pole `state` (RUNNING/PAUSED) - wymaga zmiany bazy danych

**Pomysł z `workout-session-global-timer.md`:** Dodać explicite pole `state` z wartościami `RUNNING` lub `PAUSED` zamiast wywnioskowywania stanu z `last_timer_started_at` vs `last_timer_stopped_at`.

**Obecne podejście:**
- Stan jest wywnioskowany: jeśli `last_timer_started_at` istnieje i jest nowszy niż `last_timer_stopped_at` → RUNNING
- W przeciwnym razie → PAUSED

**Zalety explicite pola `state`:**
- Prostsza logika (nie trzeba porównywać timestampów)
- Mniej podatne na błędy (np. gdy oba timestampy są null)
- Łatwiejsze query w bazie (filtrowanie po `state = 'RUNNING'`)

**Wady:**
- Wymaga migracji bazy danych
- Wymaga synchronizacji `state` z `last_timer_started_at`/`last_timer_stopped_at` (ryzyko desynchronizacji)
- Obecne podejście działa dobrze i jest wystarczające

**Rekomendacja:** **NIE rekomendowane** na tym etapie. Obecne podejście jest wystarczające i działa poprawnie. Zmiana wymagałaby migracji i nie przynosi znaczących korzyści.

---

## Podsumowanie rekomendacji

| Ulepszenie | Priorytet | Wymagania | Korzyści |
|------------|-----------|-----------|----------|
| **Heartbeat** | Średni | Nowy endpoint + pole `last_heartbeat_at` | Backup dla eventów, wykrywanie martwych sesji |
| **Server-side timeout** | Średni | Cron/Edge Function | Automatyczna pauza martwych sesji, domyka edge cases |
| **Różnicowanie AUTO_PAUSE** | Niski | Pole `last_pause_reason` | Analityka, debugowanie |
| **Pole `state`** | **NIE rekomendowane** | Migracja bazy | Minimalne korzyści, obecne podejście wystarczające |

**Rekomendacja ogólna:**
1. **Najpierw:** Zaimplementuj obecne wytyczne (auto-pauza przez eventy) i przetestuj w praktyce
2. **Jeśli zauważysz problemy:** Rozważ dodanie heartbeat jako backup
3. **Długoterminowo:** Rozważ server-side timeout dla pełnej niezawodności
4. **Opcjonalnie:** Dodaj różnicowanie AUTO_PAUSE jeśli potrzebujesz analityki

Obecne podejście z eventami powinno pokryć 95%+ przypadków. Heartbeat i server-side timeout to dodatkowe warstwy bezpieczeństwa dla edge cases.
