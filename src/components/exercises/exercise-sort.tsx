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
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { ExerciseQueryParams } from "@/types";
import { exerciseSortFields } from "@/lib/validation/exercises";

type SortField = NonNullable<ExerciseQueryParams["sort"]>;
type SortOrder = NonNullable<ExerciseQueryParams["order"]>;

const sortLabels: Record<SortField, string> = {
  created_at: "Data utworzenia",
  title: "Tytuł",
  part: "Część ciała",
  type: "Typ",
};

export function ExerciseSort() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentSort =
    (searchParams.get("sort") as SortField) || ("created_at" as SortField);
  const currentOrder =
    (searchParams.get("order") as SortOrder) || ("desc" as SortOrder);

  const handleSortChange = (field: string) => {
    if (!exerciseSortFields.includes(field as SortField)) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    params.delete("cursor"); // Reset cursor przy zmianie sortowania
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOrderToggle = () => {
    const newOrder = currentOrder === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("order", newOrder);
    params.delete("cursor"); // Reset cursor przy zmianie sortowania
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger size="sm" className="w-[140px]">
          <SelectValue placeholder="Sortuj według" />
        </SelectTrigger>
        <SelectContent>
          {exerciseSortFields.map((field) => (
            <SelectItem key={field} value={field}>
              {sortLabels[field]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={handleOrderToggle}
        aria-label={`Sortuj ${currentOrder === "asc" ? "rosnąco" : "malejąco"}`}
        title={currentOrder === "asc" ? "Sortuj malejąco" : "Sortuj rosnąco"}
      >
        {currentOrder === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
