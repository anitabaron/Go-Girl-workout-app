"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Toolbar } from "./Toolbar";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";
import { EXERCISE_PART_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";
import type { ExercisePart, ExerciseType } from "@/types";

type ExerciseTitle = { id: string; title: string };

type ExercisesToolbarProps = {
  exercises: ExerciseTitle[];
  search?: string;
  part?: string | null;
  type?: string | null;
  exerciseId?: string | null;
};

/**
 * Exercises toolbar - search + filters + sort. Updates URL; page re-renders with new data.
 */
export function ExercisesToolbar({
  exercises,
  search = "",
  part = null,
  type = null,
  exerciseId = null,
}: ExercisesToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: {
      search?: string;
      part?: string | null;
      type?: string | null;
      exercise_id?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.search !== undefined) {
        if (updates.search) params.set("search", updates.search);
        else params.delete("search");
      }
      if (updates.part !== undefined) {
        if (updates.part) params.set("part", updates.part);
        else params.delete("part");
      }
      if (updates.type !== undefined) {
        if (updates.type) params.set("type", updates.type);
        else params.delete("type");
      }
      if (updates.exercise_id !== undefined) {
        if (updates.exercise_id) params.set("exercise_id", updates.exercise_id);
        else params.delete("exercise_id");
      }
      params.delete("cursor");
      startTransition(() => {
        router.push(`/m3/exercises?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handlePartChange = (value: string) => {
    const partValue =
      value && value !== "all" && exercisePartValues.includes(value as ExercisePart)
        ? (value as ExercisePart)
        : null;
    updateParams({ part: partValue });
  };

  const handleTypeChange = (value: string) => {
    const typeValue =
      value && value !== "all" && exerciseTypeValues.includes(value as ExerciseType)
        ? (value as ExerciseType)
        : null;
    updateParams({ type: typeValue });
  };

  const handleExerciseChange = (value: string) => {
    const exerciseIdValue = value && value !== "all" ? value : null;
    if (
      exerciseIdValue &&
      !exercises.some((ex) => ex.id === exerciseIdValue)
    ) {
      return;
    }
    updateParams({ exercise_id: exerciseIdValue });
  };

  const handleClearFilters = () => {
    updateParams({ part: null, type: null, exercise_id: null });
  };

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        updateParams({ search: value || undefined });
      }, 300);
    },
    [updateParams],
  );

  const hasActiveFilters =
    part != null || type != null || exerciseId != null;

  return (
    <Toolbar className="flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[180px] flex-1 sm:max-w-[280px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            key={`search-${search}`}
            type="search"
            placeholder="Search exercises..."
            className="pl-9"
            aria-label="Search exercises"
            defaultValue={search}
            onChange={handleSearchChange}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="exercise-filter" className="sr-only">
            Filter by exercise
          </label>
          <Select
            value={exerciseId ?? "all"}
            onValueChange={handleExerciseChange}
            disabled={isPending}
          >
            <SelectTrigger
              id="exercise-filter"
              className="w-[180px]"
              aria-label="Filter by exercise"
            >
              <SelectValue placeholder="Exercise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All exercises</SelectItem>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="part-filter" className="sr-only">
            Filter by body part
          </label>
          <Select
            value={part ?? "all"}
            onValueChange={handlePartChange}
            disabled={isPending}
          >
            <SelectTrigger
              id="part-filter"
              className="w-[140px]"
              aria-label="Filter by body part"
            >
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
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="type-filter" className="sr-only">
            Filter by exercise type
          </label>
          <Select
            value={type ?? "all"}
            onValueChange={handleTypeChange}
            disabled={isPending}
          >
            <SelectTrigger
              id="type-filter"
              className="w-[140px]"
              aria-label="Filter by exercise type"
            >
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
      </div>
      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={handleClearFilters}
          disabled={isPending}
          aria-label="Clear filters"
        >
          Clear filters
        </Button>
      )}
    </Toolbar>
  );
}
