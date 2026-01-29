/**
 * Oblicza nową wartość active_duration_seconds na podstawie aktualnego stanu i aktualizacji.
 * Funkcja czysta - łatwa do testowania bez Supabase.
 */
export function calculateTimerUpdates(
  existing: {
    active_duration_seconds: number | null;
    last_timer_started_at: string | null;
  },
  updates: {
    active_duration_seconds?: number;
    last_timer_started_at?: string;
    last_timer_stopped_at?: string;
  },
): {
  active_duration_seconds: number;
  last_timer_started_at?: string;
  last_timer_stopped_at?: string;
} {
  const currentActiveDuration = existing.active_duration_seconds ?? 0;
  const currentLastTimerStartedAt = existing.last_timer_started_at;

  let newActiveDuration = currentActiveDuration;
  let elapsedFromTimer = 0;

  if (updates.last_timer_stopped_at && currentLastTimerStartedAt) {
    const startedAt = new Date(currentLastTimerStartedAt).getTime();
    const stoppedAt = new Date(updates.last_timer_stopped_at).getTime();
    elapsedFromTimer = Math.max(0, Math.floor((stoppedAt - startedAt) / 1000));
  }

  newActiveDuration += elapsedFromTimer;

  if (updates.active_duration_seconds !== undefined) {
    newActiveDuration += updates.active_duration_seconds;
  }

  const result: {
    active_duration_seconds: number;
    last_timer_started_at?: string;
    last_timer_stopped_at?: string;
  } = {
    active_duration_seconds: newActiveDuration,
  };

  if (updates.last_timer_started_at !== undefined) {
    result.last_timer_started_at = updates.last_timer_started_at;
  }
  if (updates.last_timer_stopped_at !== undefined) {
    result.last_timer_stopped_at = updates.last_timer_stopped_at;
  }

  return result;
}
