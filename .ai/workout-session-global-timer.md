Oto wytyczne do refaktoryzacji globalnego timera treningu, poniewa obecnie jego działanie jest niepoprawne.
Manual START/PAUSE + auto-pause przy zniknięciu ekranu + Heartbeat (“aktywny na ekranie”) heartbeat co 60 s:
Heartbeat **asekuracją**, a nie źródłem naliczania czasu.

## (manual + auto-pause + heartbeat 60s)

### Zasady

1. **START/RESUME** (manual)
   → ustawiasz `state=RUNNING` i `last_started_segment_at=now()` (w DB)

2. **PAUSE** (manual)
   → dopisujesz `now() - last_started_segment_at` do `active_duration_seconds`, czyścisz `last_started_segment_at`, `state=PAUSED` (w DB)

3. **AUTO_PAUSE na zniknięciu ekranu** (front)
   → gdy `document.visibilityState === "hidden"` lub `pagehide`
   → wywołujesz transition `AUTO_PAUSE` w DB (dokładnie jak PAUSE, tylko typ eventu inny)

4. **HEARTBEAT** (front) co 60s, ale tylko gdy:

* `state === RUNNING`
* `document.visibilityState === "visible"`
* user jest na `/workout/{id}/active`

Heartbeat robi tylko: `last_heartbeat_at = now()` (+ ewentualnie event), nic więcej.

5. **Server-side timeout** (cron/edge function)
   Co np. 1 min sprawdzasz sesje:

* `state=RUNNING`
* `now() - last_heartbeat_at > 2 * heartbeat_interval + margines`
  czyli przy 60s heartbeat: sensownie **> 130–150s**
  → robisz `AUTO_PAUSE` w DB (naliczy czas i zamknie segment)

To domyka przypadki: brak visibility eventu, ubita karta, brak netu, zwiecha.

---

## Dlaczego heartbeat co 60s ma sens (i gdzie są minusy)

### Plusy

* Mały ruch (1 request/min podczas RUNNING)
* Działa jako “czy user nadal tu jest” nawet gdy eventy nie przyjdą
* Chroni przed zawyżeniem czasu, gdy user zamknie appkę bez pauzy

### Minusy / ryzyka

* **Precyzja**: jeśli strona zniknie tuż po heartbeat, a server auto-pauzuje dopiero po ~150s, możesz doliczyć do ~150s “nadmiaru”.
  ➜ Jeśli chcesz dokładniej, skróć heartbeat do **15–20s**.
  ➜ Jeśli 60s jest ok UX-owo, zaakceptuj tolerancję (albo auto-pauzuj na `visibilitychange` — to i tak utnie większość przypadków).

* **Offline**: heartbeat nie dojdzie. Serwer auto-pauzuje po timeout — i dobrze. User wraca i musi ręcznie RESUME (albo pokaż komunikat “wstrzymano z powodu braku aktywności”).

---

## Praktyczne ustawienia (polecam)

* `heartbeatInterval = 60s` (jeśli chcesz minimum ruchu i nie przeszkadza tolerancja)

* `serverTimeout = 2 * heartbeatInterval + 30s`
  czyli:

  * dla 60s → **150s**

* auto-pause na:

  * `visibilitychange` gdy `hidden`
  * `pagehide` (Safari i iOS potrafią tu być lepsze niż beforeunload)
  * opcjonalnie `blur` (mniej pewne, ale może pomóc)

---

## Minimalny hook heartbeat (Next.js client) przykład do adaptacji

```ts
"use client";

import { useEffect, useRef } from "react";

export function useWorkoutHeartbeat(opts: {
  sessionId: string;
  isRunning: boolean;
  enabled: boolean;
  intervalMs?: number;
}) {
  const { sessionId, isRunning, enabled, intervalMs = 60000 } = opts;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const send = async () => {
      await fetch(`/api/workout-sessions/${sessionId}/heartbeat`, { method: "POST" });
    };

    const start = () => {
      if (timerRef.current) return;
      send();
      timerRef.current = window.setInterval(send, intervalMs);
    };

    const stop = () => {
      if (!timerRef.current) return;
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    };

    const canRun = enabled && isRunning && document.visibilityState === "visible";

    if (canRun) start();
    else stop();

    const onVisibility = () => {
      const ok = enabled && isRunning && document.visibilityState === "visible";
      if (ok) start();
      else stop();
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [sessionId, isRunning, enabled, intervalMs]);
}
```

---

## Auto-pause na zniknięciu ekranu (front)

```ts
"use client";

import { useEffect } from "react";

export function useAutoPauseOnHide(opts: {
  sessionId: string;
  isRunning: boolean;
  enabled: boolean;
}) {
  const { sessionId, isRunning, enabled } = opts;

  useEffect(() => {
    const pause = async () => {
      await fetch(`/api/workout-session/${sessionId}/transition`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "AUTO_PAUSE" }),
      });
    };

    const onVisibility = () => {
      if (!enabled || !isRunning) return;
      if (document.visibilityState === "hidden") pause();
    };

    const onPageHide = () => {
      if (!enabled || !isRunning) return;
      pause();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [sessionId, isRunning, enabled]);
}
```

---

## TL;DR rekomendacja

* Manual START/PAUSE = intencja użytkownika
* Auto-pause na `visibilitychange/pagehide` = szybkie ucinanie czasu, gdy ekran znika
* Heartbeat = backup, żeby serwer mógł auto-pauzować, jeśli UI zginie bez eventu

