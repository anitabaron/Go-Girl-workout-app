import type {
  SessionSummaryDTO,
  SessionTimerUpdateCommand,
  SessionTimerUpdateResponse,
  SessionStatusUpdateCommand,
  SessionExerciseAutosaveCommand,
  SessionExerciseAutosaveResponse,
} from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type TimerPayload = Partial<SessionTimerUpdateCommand>;
type StatusPayload = SessionStatusUpdateCommand;

export type TimerApiResponse = {
  data: SessionTimerUpdateResponse;
};

export type StatusApiResponse = SessionSummaryDTO;

export type ExerciseAutosaveApiResponse = {
  data: SessionExerciseAutosaveResponse;
};

/**
 * PATCH /api/workout-sessions/{id}/timer
 * Aktualizuje timer sesji treningowej (start/resume, pause).
 */
export async function patchWorkoutSessionTimer(
  sessionId: string,
  payload: TimerPayload,
): Promise<TimerApiResponse> {
  const response = await fetch(`/api/workout-sessions/${sessionId}/timer`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as { message?: string }).message ||
      `Błąd timera sesji (${response.status})`;
    const details = (errorData as { details?: string }).details;
    throw new Error(details ? `${msg} ${details}` : msg);
  }

  return response.json();
}

/**
 * PATCH /api/workout-sessions/{id}/timer
 * Wersja z keepalive dla zapisu przy zamknięciu strony.
 */
export async function patchWorkoutSessionTimerKeepalive(
  sessionId: string,
  payload: TimerPayload,
): Promise<void> {
  const response = await fetch(`/api/workout-sessions/${sessionId}/timer`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`Timer PATCH failed: ${response.status}`);
  }
}

/**
 * PATCH /api/workout-sessions/{id}/status
 * Aktualizuje status sesji (np. completed).
 */
export async function patchWorkoutSessionStatus(
  sessionId: string,
  payload: StatusPayload,
): Promise<StatusApiResponse> {
  const response = await fetch(`/api/workout-sessions/${sessionId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as { message?: string }).message ||
      `Błąd aktualizacji statusu (${response.status})`;
    const details = (errorData as { details?: string }).details;
    throw new ApiError(details ? `${msg} ${details}` : msg, response.status);
  }

  return response.json();
}

/**
 * PATCH /api/workout-sessions/{id}/exercises/[order]
 * Zapisuje ćwiczenie w sesji (autosave).
 */
export async function patchWorkoutSessionExercise(
  sessionId: string,
  exerciseOrder: number,
  command: SessionExerciseAutosaveCommand,
): Promise<ExerciseAutosaveApiResponse> {
  const url = `/api/workout-sessions/${sessionId}/exercises/${exerciseOrder}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    let errorData: { message?: string; details?: string; code?: string } = {};
    try {
      const text = await response.text();
      if (text) {
        errorData = JSON.parse(text) as typeof errorData;
      }
    } catch {
      // ignore parse error
    }
    const msg =
      errorData.message || `Błąd zapisu ćwiczenia (${response.status})`;
    const fullMsg = errorData.details ? `${msg} ${errorData.details}` : msg;
    throw new Error(fullMsg);
  }

  return response.json();
}

/**
 * PATCH /api/workout-sessions/{id}/exercises/{order}
 * Wersja z keepalive dla zapisu przy zamknięciu strony.
 */
export async function patchWorkoutSessionExerciseKeepalive(
  sessionId: string,
  exerciseOrder: number,
  command: SessionExerciseAutosaveCommand,
): Promise<void> {
  const url = `/api/workout-sessions/${sessionId}/exercises/${exerciseOrder}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`Exercise PATCH failed: ${response.status}`);
  }
}
