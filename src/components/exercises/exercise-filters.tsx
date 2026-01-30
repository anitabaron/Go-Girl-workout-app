"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ExerciseDTO, ExercisePart, ExerciseType } from "@/types";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";
import { EXERCISE_PART_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";

type ExerciseFiltersProps = {
  exercises: ExerciseDTO[];
};

export function ExerciseFilters({ exercises }: Readonly<ExerciseFiltersProps>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentExerciseId = searchParams.get("exercise_id");
  const currentPart = searchParams.get("part") as ExercisePart | null;
  const currentType = searchParams.get("type") as ExerciseType | null;
  const currentSearch = searchParams.get("search") || "";

  const [searchValue, setSearchValue] = useState(currentSearch);

  // Synchronizuj wartość inputa z URL przy inicjalizacji i zmianie searchParams z zewnątrz
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch !== searchValue) {
      setSearchValue(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounce dla wyszukiwania - aktualizacja URL po 500ms od ostatniego wpisania
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmedSearch = searchValue.trim();

      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      } else {
        params.delete("search");
      }

      // Reset cursor przy zmianie wyszukiwania
      params.delete("cursor");

      const newUrl = `${pathname}?${params.toString()}`;
      const currentUrl = `${pathname}?${searchParams.toString()}`;

      // Aktualizuj URL tylko jeśli się zmienił
      if (newUrl !== currentUrl) {
        router.push(newUrl);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const handleExerciseChange = (exerciseId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (exerciseId && exerciseId !== "all") {
      const exerciseExists = exercises.some((ex) => ex.id === exerciseId);
      if (exerciseExists) {
        params.set("exercise_id", exerciseId);
      }
    } else {
      params.delete("exercise_id");
    }

    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleFilterChange = (
    filterType: "part" | "type",
    value: string | null,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "all") {
      // Walidacja wartości enum
      if (filterType === "part") {
        if (exercisePartValues.includes(value as ExercisePart)) {
          params.set("part", value);
        }
      } else if (filterType === "type") {
        if (exerciseTypeValues.includes(value as ExerciseType)) {
          params.set("type", value);
        }
      }
    } else {
      params.delete(filterType);
    }

    // Reset cursor przy zmianie filtrów
    params.delete("cursor");

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("exercise_id");
    params.delete("part");
    params.delete("type");
    params.delete("search");
    params.delete("cursor");
    setSearchValue("");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters =
    currentExerciseId !== null ||
    currentPart !== null ||
    currentType !== null ||
    currentSearch !== "";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Wyszukaj po nazwie..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-8 w-full sm:w-[180px] text-sm"
          aria-label="Wyszukaj ćwiczenie po nazwie"
        />
        <Select
          value={currentExerciseId || "all"}
          onValueChange={handleExerciseChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Ćwiczenie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie ćwiczenia</SelectItem>
            {exercises.map((exercise) => (
              <SelectItem key={exercise.id} value={exercise.id}>
                {exercise.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={currentPart || "all"}
          onValueChange={(value) =>
            handleFilterChange("part", value === "all" ? null : value)
          }
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue placeholder="Część ciała" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie części</SelectItem>
            {exercisePartValues.map((part) => (
              <SelectItem key={part} value={part}>
                {EXERCISE_PART_LABELS[part]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentType || "all"}
          onValueChange={(value) =>
            handleFilterChange("type", value === "all" ? null : value)
          }
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue placeholder="Typ ćwiczenia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            {exerciseTypeValues.map((type) => (
              <SelectItem key={type} value={type}>
                {EXERCISE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleClearFilters}
                aria-label="Wyczyść filtry"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Wyczyść filtry</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
