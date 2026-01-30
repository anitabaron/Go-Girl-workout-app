"use client";

import { useState, useEffect } from "react";
import { getExerciseByTitle } from "@/lib/api/exercises";

/**
 * Hook sprawdzający czy ćwiczenie o podanym tytule istnieje w bazie.
 * Wywołuje API tylko gdy isInLibrary === false i title jest niepusty.
 */
export function useExerciseExists(
  title: string | null,
  isInLibrary: boolean,
): boolean | null {
  const [exerciseExists, setExerciseExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (isInLibrary !== false || !title) {
      queueMicrotask(() => setExerciseExists(false));
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const existing = await getExerciseByTitle(title);
        if (!cancelled) {
          setExerciseExists(existing !== null && !!existing.id);
        }
      } catch {
        if (!cancelled) {
          setExerciseExists(false);
        }
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [title, isInLibrary]);

  return exerciseExists;
}
