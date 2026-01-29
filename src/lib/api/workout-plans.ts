import type { WorkoutPlanDTO, WorkoutPlanUpdateCommand } from "@/types";

/**
 * PATCH /api/workout-plans/{id}
 * Aktualizuje plan treningowy.
 */
export async function patchWorkoutPlan(
  planId: string,
  payload: WorkoutPlanUpdateCommand,
): Promise<WorkoutPlanDTO> {
  const response = await fetch(`/api/workout-plans/${planId}`, {
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
      `Błąd aktualizacji planu (${response.status})`;
    throw new Error(msg);
  }

  return response.json();
}

/**
 * POST /api/workout-plans/snapshots/{snapshot_id}/link
 * Łączy snapshot z ćwiczeniem z biblioteki.
 * Body: { exercise_id: string }
 */
export async function linkSnapshotToExercise(
  snapshotId: string,
  exerciseId: string,
): Promise<void> {
  const response = await fetch(
    `/api/workout-plans/snapshots/${snapshotId}/link`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ exercise_id: exerciseId }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as { message?: string }).message ||
      `Błąd łączenia snapshotu (${response.status})`;
    throw new Error(msg);
  }
}
