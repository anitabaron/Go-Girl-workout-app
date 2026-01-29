import type { ExerciseDTO, ExerciseCreateCommand } from "@/types";

/**
 * GET /api/exercises/by-title?title=...
 * Pobiera ćwiczenie po tytule.
 * Rzuca błąd przy 4xx/5xx.
 */
export async function getExerciseByTitle(
  title: string,
): Promise<ExerciseDTO | null> {
  const response = await fetch(
    `/api/exercises/by-title?title=${encodeURIComponent(title)}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as { message?: string }).message ||
      `Błąd pobierania ćwiczenia (${response.status})`;
    throw new Error(msg);
  }

  return response.json();
}

/**
 * POST /api/exercises
 * Tworzy nowe ćwiczenie.
 */
export async function createExercise(
  data: ExerciseCreateCommand,
): Promise<ExerciseDTO> {
  const response = await fetch("/api/exercises", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as { message?: string }).message ||
      `Błąd tworzenia ćwiczenia (${response.status})`;
    throw new Error(msg);
  }

  return response.json();
}
