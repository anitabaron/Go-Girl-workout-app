"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getExerciseByTitle, createExercise } from "@/lib/api/exercises";
import { convertSessionSnapshotToExercise } from "@/lib/exercises/session-snapshot-to-exercise";
import type { SessionExerciseDTO, ExerciseCreateCommand } from "@/types";

const ALREADY_EXISTS_MSG =
  "Ćwiczenie już istnieje w bazie. Łączenie z istniejącym ćwiczeniem.";
const NOT_FOUND_MSG =
  "Ćwiczenie o tej nazwie już istnieje, ale nie udało się go znaleźć.";
const INVALID_DATA_MSG = "Nieprawidłowe dane ćwiczenia.";

async function getOrCreateExerciseId(
  exerciseData: ExerciseCreateCommand,
): Promise<string> {
  const existing = await getExerciseByTitle(exerciseData.title);
  if (existing?.id) {
    toast.info(ALREADY_EXISTS_MSG);
    return existing.id;
  }

  try {
    const created = await createExercise(exerciseData);
    return created.id;
  } catch (createError) {
    const errMsg = createError instanceof Error ? createError.message : "";
    return handleCreateConflict(exerciseData.title, errMsg, createError);
  }
}

function handleCreateConflict(
  title: string,
  errMsg: string,
  createError: unknown,
): Promise<string> {
  const isConflict =
    errMsg.includes("już istnieje") ||
    errMsg.includes("CONFLICT") ||
    errMsg.includes("409");
  if (isConflict) {
    return resolveExistingByTitle(title);
  }

  const isBadRequest =
    errMsg.includes("Nieprawidłowe") || errMsg.includes("400");
  if (isBadRequest) {
    throw new Error(errMsg || INVALID_DATA_MSG);
  }

  throw createError;
}

async function resolveExistingByTitle(title: string): Promise<string> {
  const found = await getExerciseByTitle(title);
  if (found?.id) {
    toast.info(ALREADY_EXISTS_MSG);
    return found.id;
  }
  throw new Error(NOT_FOUND_MSG);
}

export function useAddSessionSnapshotToLibrary(
  exercise: SessionExerciseDTO,
  sessionId: string,
) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const addToLibrary = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const exerciseData = convertSessionSnapshotToExercise(exercise);
      const exerciseId = await getOrCreateExerciseId(exerciseData);

      const response = await fetch(
        `/api/workout-sessions/${sessionId}/exercises/${exercise.exercise_order}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise_id: exerciseId }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg =
          (errorData as { message?: string }).message ||
          `Błąd łączenia ćwiczenia (${response.status})`;
        throw new Error(msg);
      }

      toast.success("Ćwiczenie zostało połączone z bazą ćwiczeń.");
      router.refresh();
    } catch (error) {
      console.error("Error adding session exercise to library:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas dodawania ćwiczenia do bazy.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [exercise, sessionId, isLoading, router]);

  return { addToLibrary, isLoading };
}
