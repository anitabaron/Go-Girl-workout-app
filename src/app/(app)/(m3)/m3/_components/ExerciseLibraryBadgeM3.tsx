"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import type { WorkoutPlanExerciseDTO } from "@/types";

type ExerciseLibraryBadgeM3Props = {
  readonly exercise: WorkoutPlanExerciseDTO;
};

export function ExerciseLibraryBadgeM3({
  exercise,
}: ExerciseLibraryBadgeM3Props) {
  const synchronousResult = useMemo(() => {
    if (exercise.is_exercise_in_library !== false) return false;
    if (!exercise.exercise_title) return true;
    return null;
  }, [exercise.is_exercise_in_library, exercise.exercise_title]);

  const [asyncCheckResult, setAsyncCheckResult] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (exercise.is_exercise_in_library !== false || !exercise.exercise_title) {
      return;
    }

    const check = async () => {
      try {
        const response = await fetch(
          `/api/exercises/by-title?title=${encodeURIComponent(exercise.exercise_title!)}`,
        );
        if (response.ok) setAsyncCheckResult(false);
        else if (response.status === 404) setAsyncCheckResult(true);
        else setAsyncCheckResult(true);
      } catch {
        setAsyncCheckResult(true);
      }
    };

    check();
  }, [exercise.is_exercise_in_library, exercise.exercise_title]);

  const shouldShow = synchronousResult ?? asyncCheckResult;

  if (shouldShow !== true) return null;

  return (
    <Badge variant="outline" className="ml-2 border-amber-500 text-amber-600">
      <AlertCircle className="mr-1 size-3" />
      Not in library
    </Badge>
  );
}
