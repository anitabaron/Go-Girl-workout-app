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
import type { ExercisePart } from "@/types";
import { exercisePartValues } from "@/lib/validation/exercises";

const partLabels: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

export function WorkoutPlanFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentPart = searchParams.get("part") as ExercisePart | null;

  const handleFilterChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "all") {
      // Walidacja wartości enum
      if (exercisePartValues.includes(value as ExercisePart)) {
        params.set("part", value);
      }
    } else {
      params.delete("part");
    }

    // Reset cursor przy zmianie filtra
    params.delete("cursor");

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("part");
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = currentPart !== null;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Select
        value={currentPart || "all"}
        onValueChange={(value) =>
          handleFilterChange(value === "all" ? null : value)
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Część ciała" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie części</SelectItem>
          {exercisePartValues.map((part) => (
            <SelectItem key={part} value={part}>
              {partLabels[part]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
