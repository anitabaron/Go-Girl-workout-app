import type { SessionDetailDTO, SessionSummaryDTO } from "@/types";

/**
 * Formatuje czas trwania sesji treningowej.
 * Dla sesji in_progress: "X min z Y min" lub "X min"
 * Dla sesji zakończonych: "Xh Ymin" lub "Ymin"
 */
export function formatSessionDuration(session: SessionSummaryDTO): string {
  if (session.status === "in_progress" && !session.completed_at) {
    const activeDuration = session.active_duration_seconds ?? 0;
    const currentMinutes = Math.floor(activeDuration / 60);

    const estimatedTotalTimeSeconds = session.estimated_total_time_seconds;
    if (
      estimatedTotalTimeSeconds !== null &&
      estimatedTotalTimeSeconds !== undefined
    ) {
      const plannedMinutes = Math.floor(estimatedTotalTimeSeconds / 60);
      return `${currentMinutes} min z ${plannedMinutes} min`;
    }

    return `${currentMinutes} min`;
  }

  if (!session.completed_at) {
    return "W trakcie";
  }

  const start = new Date(session.started_at);
  const end = new Date(session.completed_at);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Zwraca odmianę słowa "ćwiczenie" dla liczby.
 * 0 -> "", 1 -> "ćwiczenie", 2-4 -> "ćwiczenia", 5+ -> "ćwiczeń"
 */
export function getExerciseCountText(count: number): string {
  if (count === 0) return "";
  if (count === 1) return "ćwiczenie";
  if (count < 5) return "ćwiczenia";
  return "ćwiczeń";
}

/**
 * Pobiera nazwy ćwiczeń z sesji.
 * Preferuje exercise_names jeśli dostępne, w przeciwnym razie wyciąga z exercises.
 */
export function getExerciseNames(session: SessionDetailDTO): string[] {
  if (session.exercise_names && session.exercise_names.length > 0) {
    return session.exercise_names;
  }
  return session.exercises
    .map((ex) => ex.exercise_title_at_time)
    .filter((name): name is string => name !== null && name !== undefined);
}

/**
 * Pobiera liczbę ćwiczeń w sesji.
 * Preferuje exercise_count jeśli dostępne.
 */
export function getExerciseCount(session: SessionDetailDTO): number {
  if (session.exercise_count !== undefined && session.exercise_count > 0) {
    return session.exercise_count;
  }
  return session.exercises.length;
}
