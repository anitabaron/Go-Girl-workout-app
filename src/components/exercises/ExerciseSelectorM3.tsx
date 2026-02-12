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
import { formatDuration } from "@/lib/utils/time-format";
import { useTranslations } from "@/i18n/client";

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
  const t = useTranslations("exerciseSelector");
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
      if (!response.ok) throw new Error(t("fetchFailed"));

      const data = await response.json();
      const filtered = (data.items ?? []).filter(
        (ex: ExerciseDTO) => !excludedExerciseIds.includes(ex.id),
      );
      setExercises(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("fetchFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [search, part, type, currentExerciseId, excludedExerciseIds, t]);

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

  const hasFilters =
    search || part !== "all" || type !== "all" || currentExerciseId !== "all";
  const emptyMessage = hasFilters
    ? t("emptyFiltered")
    : t("emptyBase");

  const getPartLabel = (value: string) => {
    if (value === "Legs") return t("partOption.legs");
    if (value === "Core") return t("partOption.core");
    if (value === "Back") return t("partOption.back");
    if (value === "Arms") return t("partOption.arms");
    if (value === "Chest") return t("partOption.chest");
    if (value === "Glutes") return t("partOption.glutes");
    return value;
  };

  const getTypeLabel = (value: string) => {
    if (value === "Warm-up") return t("typeOption.warmup");
    if (value === "Main Workout") return t("typeOption.mainworkout");
    if (value === "Cool-down") return t("typeOption.cooldown");
    return value;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[200px]"
        />
        <Select
          value={currentExerciseId}
          onValueChange={(v) => setCurrentExerciseId(v === "all" ? "all" : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("exercisePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allExercises")}</SelectItem>
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
            <SelectValue placeholder={t("bodyPartPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allParts")}</SelectItem>
            {exercisePartValues.map((p) => (
              <SelectItem key={p} value={p}>
                {getPartLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => setType(v as ExerciseType | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("typePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            {exerciseTypeValues.map((typeValue) => (
              <SelectItem key={typeValue} value={typeValue}>
                {getTypeLabel(typeValue)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-[400px] max-h-[400px] overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}
        {!isLoading && !error && exercises.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--m3-outline-variant)] p-8 text-center">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
        {!isLoading && !error && exercises.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {exercises.map((exercise) => {
            const selected = isSelected(exercise.id);
            return (
              <Card
                key={exercise.id}
                data-test-id="exercise-selector-card"
                className={`cursor-pointer gap-0 transition-all hover:shadow-md ${
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
                      aria-label={`${t("select")} ${exercise.title}`}
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
                      {getPartLabel(exercise.part)}
                    </Badge>
                    {exercise.level && (
                      <Badge variant="outline">{exercise.level}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span>
                      <span className="text-muted-foreground">{t("sets")} </span>
                      <span className="font-semibold text-foreground">
                        {exercise.series}
                      </span>
                    </span>
                    {exercise.reps != null && (
                      <span>
                        <span className="text-muted-foreground">
                          {t("reps")}{" "}
                        </span>
                        <span className="font-semibold text-foreground">
                          {exercise.reps}
                        </span>
                      </span>
                    )}
                    {exercise.duration_seconds != null && (
                      <span>
                        <span className="text-muted-foreground">{t("time")} </span>
                        <span className="font-semibold text-foreground">
                          {exercise.duration_seconds}s
                        </span>
                      </span>
                    )}
                    {exercise.rest_in_between_seconds != null && (
                      <span>
                        <span className="text-muted-foreground">
                          {t("restBetween")}{" "}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatDuration(exercise.rest_in_between_seconds)}
                        </span>
                      </span>
                    )}
                    {exercise.rest_after_series_seconds != null && (
                      <span>
                        <span className="text-muted-foreground">
                          {t("restAfter")}{" "}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatDuration(exercise.rest_after_series_seconds)}
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
        )}
      </div>
    </div>
  );
}
