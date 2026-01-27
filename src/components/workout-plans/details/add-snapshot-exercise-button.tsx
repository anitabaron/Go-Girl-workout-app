"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { normalizeTitle } from "@/lib/validation/exercises";
import type { WorkoutPlanExerciseDTO } from "@/types";

type AddSnapshotExerciseButtonProps = {
  readonly exercise: WorkoutPlanExerciseDTO;
  readonly planId: string;
};

/**
 * Przycisk do dodawania ćwiczenia ze snapshotu do bazy ćwiczeń.
 * Wyświetla się tylko dla ćwiczeń, które nie są w bibliotece (is_exercise_in_library === false).
 */
export function AddSnapshotExerciseButton({
  exercise,
  planId,
}: AddSnapshotExerciseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Konwersja danych snapshot na dane ćwiczenia
  const convertSnapshotToExerciseData = () => {
    if (!exercise.exercise_title || !exercise.exercise_part) {
      throw new Error("Brak wymaganych danych ćwiczenia (tytuł lub partia)");
    }

    // Użyj exercise_type jeśli dostępne, w przeciwnym razie section_type
    const exerciseType = exercise.exercise_type ?? exercise.section_type;

    if (!exerciseType) {
      throw new Error("Brak typu ćwiczenia");
    }

    // Konwersja planned_* na pola ćwiczenia
    const exerciseData: {
      title: string;
      type: string;
      part: string;
      series: number;
      reps?: number | null;
      duration_seconds?: number | null;
      rest_in_between_seconds?: number | null;
      rest_after_series_seconds?: number | null;
      estimated_set_time_seconds?: number | null;
      details?: string | null;
    } = {
      title: exercise.exercise_title,
      type: exerciseType,
      part: exercise.exercise_part,
      series: exercise.planned_sets ?? 1,
    };

    // Dodaj opis (details) jeśli dostępny
    if (exercise.exercise_description) {
      exerciseData.details = exercise.exercise_description;
    }

    // Dodaj reps lub duration_seconds (musi być dokładnie jedno)
    if (exercise.planned_reps !== null && exercise.planned_reps !== undefined) {
      exerciseData.reps = exercise.planned_reps;
    } else if (
      exercise.planned_duration_seconds !== null &&
      exercise.planned_duration_seconds !== undefined
    ) {
      exerciseData.duration_seconds = exercise.planned_duration_seconds;
    } else {
      // Jeśli brak obu, użyj domyślnej wartości (reps = 10)
      exerciseData.reps = 10;
    }

    // Dodaj odpoczynek (wymagane co najmniej jedno)
    if (
      exercise.planned_rest_seconds !== null &&
      exercise.planned_rest_seconds !== undefined
    ) {
      exerciseData.rest_in_between_seconds = exercise.planned_rest_seconds;
    }

    if (
      exercise.planned_rest_after_series_seconds !== null &&
      exercise.planned_rest_after_series_seconds !== undefined
    ) {
      exerciseData.rest_after_series_seconds =
        exercise.planned_rest_after_series_seconds;
    }

    // Jeśli brak obu pól odpoczynku, użyj domyślnej wartości
    if (
      !exerciseData.rest_in_between_seconds &&
      !exerciseData.rest_after_series_seconds
    ) {
      exerciseData.rest_after_series_seconds = 60;
    }

    // Dodaj estimated_set_time_seconds jeśli dostępne
    if (
      exercise.exercise_estimated_set_time_seconds !== null &&
      exercise.exercise_estimated_set_time_seconds !== undefined
    ) {
      exerciseData.estimated_set_time_seconds =
        exercise.exercise_estimated_set_time_seconds;
    }

    return exerciseData;
  };

  const handleAddToLibrary = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Konwertuj snapshot na dane ćwiczenia
      const exerciseData = convertSnapshotToExerciseData();

      // 1. Utwórz ćwiczenie w bazie (walidacja znormalizowanej nazwy nastąpi automatycznie)
      const createResponse = await fetch("/api/exercises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exerciseData),
      });

      let exerciseId: string;

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        
        if (createResponse.status === 409) {
          // Ćwiczenie już istnieje - znajdź je w bazie i użyj jego ID
          // Pobierz listę ćwiczeń użytkownika i znajdź po znormalizowanej nazwie
          const searchResponse = await fetch(
            `/api/exercises?search=${encodeURIComponent(exerciseData.title)}&limit=100`
          );

          if (!searchResponse.ok) {
            toast.error(
              "Ćwiczenie o tej nazwie już istnieje, ale nie udało się go znaleźć."
            );
            return;
          }

          const searchResult = await searchResponse.json();
          const normalizedTitle = normalizeTitle(exerciseData.title);

          const existingExercise = searchResult.items?.find(
            (ex: { title: string }) => {
              const exNormalized = normalizeTitle(ex.title);
              return exNormalized === normalizedTitle;
            }
          );

          if (!existingExercise) {
            toast.error(
              "Ćwiczenie o tej nazwie już istnieje, ale nie udało się go znaleźć."
            );
            return;
          }

          exerciseId = existingExercise.id;
          toast.info("Ćwiczenie już istnieje w bazie. Łączenie z istniejącym ćwiczeniem.");
        } else if (createResponse.status === 400) {
          toast.error(
            errorData.message || "Nieprawidłowe dane ćwiczenia."
          );
          return;
        } else {
          throw new Error(
            errorData.message || "Nie udało się dodać ćwiczenia do bazy."
          );
        }
      } else {
        const createdExercise = await createResponse.json();
        exerciseId = createdExercise.id;
      }

      // 2. Zaktualizuj wszystkie wystąpienia snapshotu w planie (używając snapshot_id)
      if (!exercise.snapshot_id) {
        // Fallback: jeśli nie ma snapshot_id, użyj starej metody (aktualizuj tylko jedno ćwiczenie)
        const updateResponse = await fetch(`/api/workout-plans/${planId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exercises: [
              {
                id: exercise.id,
                exercise_id: exerciseId,
                // Usuń pola snapshot (ustaw na null)
                exercise_title: null,
                exercise_type: null,
                exercise_part: null,
              },
            ],
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              "Nie udało się zaktualizować planu treningowego."
          );
        }
      } else {
        // Użyj nowej metody: masowa aktualizacja wszystkich wystąpień snapshotu
        const linkResponse = await fetch(
          `/api/workout-plans/snapshots/${exercise.snapshot_id}/link`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              exercise_id: exerciseId,
            }),
          }
        );

        if (!linkResponse.ok) {
          const errorData = await linkResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              "Nie udało się połączyć snapshotu z ćwiczeniem w bazie."
          );
        }
      }

      toast.success("Ćwiczenie zostało połączone z bazą ćwiczeń.");
      
      // Odśwież stronę, aby pokazać zaktualizowane dane
      router.refresh();
    } catch (error) {
      console.error("Error adding exercise to library:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas dodawania ćwiczenia do bazy."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Przycisk wyświetla się tylko dla ćwiczeń, które nie są w bibliotece
  if (exercise.is_exercise_in_library !== false) {
    return null;
  }

  return (
    <Button
      onClick={handleAddToLibrary}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="mt-4"
    >
      <Plus className="mr-2 h-4 w-4" />
      {isLoading ? "Dodawanie..." : "Dodaj to ćwiczenie do bazy ćwiczeń"}
    </Button>
  );
}
