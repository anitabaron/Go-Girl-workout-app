"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import type { WorkoutPlanExerciseDTO } from "@/types";

type ExerciseLibraryBadgeProps = {
  readonly exercise: WorkoutPlanExerciseDTO;
};

/**
 * Badge wyświetlający informację, że ćwiczenie nie jest w bibliotece.
 * Ukrywa się automatycznie, jeśli ćwiczenie faktycznie istnieje w bazie
 * (nawet jeśli is_exercise_in_library === false).
 */
export function ExerciseLibraryBadge({ exercise }: ExerciseLibraryBadgeProps) {
  // Oblicz synchroniczne przypadki podczas renderowania
  const synchronousResult = useMemo(() => {
    // Jeśli ćwiczenie jest już w bibliotece, nie pokazuj badge'a
    if (exercise.is_exercise_in_library !== false) {
      return false;
    }

    // Jeśli nie ma tytułu, nie możemy sprawdzić - pokaż badge
    if (!exercise.exercise_title) {
      return true;
    }

    // Jeśli mamy tytuł, musimy sprawdzić asynchronicznie
    return null;
  }, [exercise.is_exercise_in_library, exercise.exercise_title]);

  const [asyncCheckResult, setAsyncCheckResult] = useState<boolean | null>(
    null
  );

  // Sprawdź czy ćwiczenie faktycznie istnieje w bazie (tylko jeśli mamy tytuł)
  useEffect(() => {
    // Jeśli ćwiczenie jest już w bibliotece lub nie ma tytułu, nie sprawdzaj
    // Nie resetujemy stanu synchronicznie - synchronousResult będzie miał priorytet
    if (exercise.is_exercise_in_library !== false || !exercise.exercise_title) {
      return;
    }

    const checkExerciseExists = async () => {
      try {
        const title = exercise.exercise_title;
        if (!title) {
          setAsyncCheckResult(true);
          return;
        }

        const response = await fetch(
          `/api/exercises/by-title?title=${encodeURIComponent(title)}`
        );

        if (response.ok) {
          // Ćwiczenie istnieje - ukryj badge
          setAsyncCheckResult(false);
        } else if (response.status === 404) {
          // Ćwiczenie nie istnieje - pokaż badge
          setAsyncCheckResult(true);
        } else {
          // W przypadku błędu, pokaż badge (bezpieczniejsza opcja)
          setAsyncCheckResult(true);
        }
      } catch (error) {
        console.error("Error checking if exercise exists:", error);
        // W przypadku błędu, pokaż badge
        setAsyncCheckResult(true);
      }
    };

    checkExerciseExists();
  }, [exercise.is_exercise_in_library, exercise.exercise_title]);

  // Użyj synchronicznego wyniku jeśli dostępny, w przeciwnym razie użyj wyniku asynchronicznego
  const shouldShow = synchronousResult ?? asyncCheckResult;

  // Nie pokazuj badge'a jeśli ćwiczenie jest w bibliotece lub jeśli jeszcze sprawdzamy
  if (shouldShow === true) {
    return (
      <Badge
        variant="outline"
        className="ml-2 border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400"
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        Nie w bibliotece
      </Badge>
    );
  }

  return null;
}
