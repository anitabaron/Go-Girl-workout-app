"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { ExerciseDTO, ExercisePart, ExerciseType } from "@/types";
import type { ExerciseSelectorProps } from "@/types/workout-plan-form";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const partLabels: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

const typeLabels: Record<ExerciseType, string> = {
  "Warm-up": "Rozgrzewka",
  "Main Workout": "Główny trening",
  "Cool-down": "Schłodzenie",
};

export function ExerciseSelector({
  onSelectExercise,
  excludedExerciseIds = [],
}: Readonly<ExerciseSelectorProps>) {
  const [search, setSearch] = useState("");
  const [part, setPart] = useState<ExercisePart | "all">("all");
  const [type, setType] = useState<ExerciseType | "all">("all");
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (part !== "all") {
        params.set("part", part);
      }
      if (type !== "all") {
        params.set("type", type);
      }
      params.set("limit", "50"); // Większy limit dla dialogu

      const response = await fetch(`/api/exercises?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Nie udało się pobrać ćwiczeń");
      }

      const data = await response.json();
      const filteredExercises = data.items.filter(
        (exercise: ExerciseDTO) => !excludedExerciseIds.includes(exercise.id)
      );
      setExercises(filteredExercises);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Wystąpił błąd podczas pobierania ćwiczeń"
      );
    } finally {
      setIsLoading(false);
    }
  }, [search, part, type, excludedExerciseIds]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleExerciseClick = (exercise: ExerciseDTO) => {
    onSelectExercise(exercise);
  };

  return (
    <div className="space-y-4">
      {/* Wyszukiwanie i filtry */}
      <div className="space-y-4">
        <Input
          placeholder="Wyszukaj ćwiczenie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />

        <div className="flex flex-wrap gap-4">
          <Select
            value={part}
            onValueChange={(value) => setPart(value as ExercisePart | "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Część ciała" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie części</SelectItem>
              {exercisePartValues.map((p) => (
                <SelectItem key={p} value={p}>
                  {partLabels[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={type}
            onValueChange={(value) => setType(value as ExerciseType | "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Typ ćwiczenia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie typy</SelectItem>
              {exerciseTypeValues.map((t) => (
                <SelectItem key={t} value={t}>
                  {typeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista ćwiczeń */}
      {(() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          );
        }

        if (error) {
          return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
              {error}
            </div>
          );
        }

        if (exercises.length === 0) {
          const hasFilters = search || part !== "all" || type !== "all";
          const emptyMessage = hasFilters
            ? "Nie znaleziono ćwiczeń pasujących do filtrów."
            : "Brak dostępnych ćwiczeń. Dodaj pierwsze ćwiczenie do biblioteki.";

          return (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
          );
        }

        return (
        <div className="max-h-[400px] space-y-2 overflow-y-auto">
          {exercises.map((exercise) => (
            <Card
              key={exercise.id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleExerciseClick(exercise)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-2 text-base">
                  {exercise.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {typeLabels[exercise.type]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {partLabels[exercise.part]}
                  </Badge>
                  {exercise.level && (
                    <Badge variant="outline" className="text-xs">
                      {exercise.level}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        );
      })()}
    </div>
  );
}
