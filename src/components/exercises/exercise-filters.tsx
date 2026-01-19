"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExercisePart, ExerciseType } from "@/types";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";
import {
  EXERCISE_PART_LABELS,
  EXERCISE_TYPE_LABELS,
} from "@/lib/constants";

export function ExerciseFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentPart = searchParams.get("part") as ExercisePart | null;
  const currentType = searchParams.get("type") as ExerciseType | null;

  const handleFilterChange = (
    filterType: "part" | "type",
    value: string | null
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
    params.delete("part");
    params.delete("type");
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = currentPart !== null || currentType !== null;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap gap-4">
        <Select
          value={currentPart || "all"}
          onValueChange={(value) =>
            handleFilterChange("part", value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[180px]">
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
        <Button
          variant="outline"
          onClick={handleClearFilters}
          aria-label="Wyczyść filtry"
        >
          Wyczyść filtry
        </Button>
      )}
    </div>
  );
}
