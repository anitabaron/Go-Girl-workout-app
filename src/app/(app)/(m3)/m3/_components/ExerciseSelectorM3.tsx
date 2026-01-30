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
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import { EXERCISE_PART_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";
import { formatTotalDuration } from "@/lib/utils/time-format";

type ExerciseSelectorM3Props = {
  selectedExerciseIds: string[];
  onToggleExercise: (exercise: ExerciseDTO) => void;
  excludedExerciseIds?: string[];
};

export function ExerciseSelectorM3({
  selectedExerciseIds,
  onToggleExercise,
  excludedExerciseIds = [],
}: Readonly<ExerciseSelectorM3Props>) {
  const [search, setSearch] = useState("");
  const [part, setPart] = useState<ExercisePart | "all">("all");
  const [type, setType] = useState<ExerciseType | "all">("all");
  const [currentExerciseId, setCurrentExerciseId] = useState<string>("all");
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [allExercises, setAllExercises] = useState<
    { id: string; title: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllExercises = useCallback(async () => {
    try {
      const response = await fetch("/api/exercises/titles?limit=50");
      if (!response.ok) return;
      const data = await response.json();
      const filtered = (data.items ?? []).filter(
        (ex: { id: string; title: string }) =>
          !excludedExerciseIds.includes(ex.id),
      );
      setAllExercises(filtered);
    } catch {
      // ignore
    }
  }, [excludedExerciseIds]);

  const fetchExercises = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (part !== "all") params.set("part", part);
      if (type !== "all") params.set("type", type);
      if (currentExerciseId && currentExerciseId !== "all") {
        params.set("exercise_id", currentExerciseId);
      }
      params.set("limit", "50");

      const response = await fetch(`/api/exercises?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch exercises");

      const data = await response.json();
      const filtered = (data.items ?? []).filter(
        (ex: ExerciseDTO) => !excludedExerciseIds.includes(ex.id),
      );
      setExercises(filtered);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch exercises",
      );
    } finally {
      setIsLoading(false);
    }
  }, [search, part, type, currentExerciseId, excludedExerciseIds]);

  useEffect(() => {
    fetchAllExercises();
  }, [fetchAllExercises]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleExerciseClick = (exercise: ExerciseDTO) => {
    onToggleExercise(exercise);
  };

  const isSelected = (exerciseId: string) =>
    selectedExerciseIds.includes(exerciseId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
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
    const hasFilters =
      search || part !== "all" || type !== "all" || currentExerciseId !== "all";
    const emptyMessage = hasFilters
      ? "No exercises match the filters."
      : "No exercises available. Add your first exercise to the library.";

    return (
      <div className="rounded-lg border border-dashed border-[var(--m3-outline-variant)] p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search exercise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[200px]"
        />
        <Select
          value={currentExerciseId}
          onValueChange={(v) => setCurrentExerciseId(v === "all" ? "all" : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Exercise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All exercises</SelectItem>
            {allExercises.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={part}
          onValueChange={(v) => setPart(v as ExercisePart | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Body part" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All parts</SelectItem>
            {exercisePartValues.map((p) => (
              <SelectItem key={p} value={p}>
                {EXERCISE_PART_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => setType(v as ExerciseType | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {exerciseTypeValues.map((t) => (
              <SelectItem key={t} value={t}>
                {EXERCISE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {exercises.map((exercise) => {
            const selected = isSelected(exercise.id);
            return (
              <Card
                key={exercise.id}
                data-test-id="exercise-selector-card"
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selected ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleExerciseClick(exercise)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 flex-1 text-base">
                      {exercise.title}
                    </CardTitle>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => handleExerciseClick(exercise)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 shrink-0"
                      aria-label={`Select ${exercise.title}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-0">
                  <div className="flex flex-wrap gap-2">
                    <ExerciseTypeBadge type={exercise.type} />
                    <Badge
                      variant="outline"
                      className="border-primary text-primary"
                    >
                      {EXERCISE_PART_LABELS[exercise.part]}
                    </Badge>
                    {exercise.level && (
                      <Badge variant="outline">{exercise.level}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span>
                      <span className="text-muted-foreground">Serie </span>
                      <span className="font-semibold text-foreground">
                        {exercise.series}
                      </span>
                    </span>
                    {exercise.reps != null && (
                      <span>
                        <span className="text-muted-foreground">
                          Powtórzenia{" "}
                        </span>
                        <span className="font-semibold text-foreground">
                          {exercise.reps}
                        </span>
                      </span>
                    )}
                    {exercise.duration_seconds != null && (
                      <span>
                        <span className="text-muted-foreground">Czas </span>
                        <span className="font-semibold text-foreground">
                          {exercise.duration_seconds}s
                        </span>
                      </span>
                    )}
                    {exercise.rest_in_between_seconds != null && (
                      <span>
                        <span className="text-muted-foreground">
                          Przerwa między{" "}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatTotalDuration(
                            exercise.rest_in_between_seconds,
                          )}
                        </span>
                      </span>
                    )}
                    {exercise.rest_after_series_seconds != null && (
                      <span>
                        <span className="text-muted-foreground">
                          Przerwa po{" "}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatTotalDuration(
                            exercise.rest_after_series_seconds,
                          )}
                        </span>
                      </span>
                    )}
                  </div>
                  {exercise.details && (
                    <p className="text-[0.8125rem] leading-relaxed text-muted-foreground line-clamp-2">
                      {exercise.details}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
