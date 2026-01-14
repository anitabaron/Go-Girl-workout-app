"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlanQueryParams } from "@/types";
import { workoutPlanSortFields } from "@/lib/validation/workout-plans";

type SortField = NonNullable<PlanQueryParams["sort"]>;
type SortOrder = NonNullable<PlanQueryParams["order"]>;

const sortOptions = [
  { value: "created_at_desc", label: "Najnowsze", sort: "created_at" as SortField, order: "desc" as SortOrder },
  { value: "created_at_asc", label: "Najstarsze", sort: "created_at" as SortField, order: "asc" as SortOrder },
  { value: "name_asc", label: "Nazwa A-Z", sort: "name" as SortField, order: "asc" as SortOrder },
  { value: "name_desc", label: "Nazwa Z-A", sort: "name" as SortField, order: "desc" as SortOrder },
] as const;

export function WorkoutPlanSort() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentSort =
    (searchParams.get("sort") as SortField) || ("created_at" as SortField);
  const currentOrder =
    (searchParams.get("order") as SortOrder) || ("desc" as SortOrder);

  // Znajdź aktualną opcję sortowania
  const currentOption = sortOptions.find(
    (opt) => opt.sort === currentSort && opt.order === currentOrder
  ) || sortOptions[0];

  const handleSortChange = (value: string) => {
    const option = sortOptions.find((opt) => opt.value === value);
    if (!option) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", option.sort);
    params.set("order", option.order);
    params.delete("cursor"); // Reset cursor przy zmianie sortowania
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="sort-select" className="sr-only">
          Sortuj plany treningowe
        </label>
        <Select value={currentOption.value} onValueChange={handleSortChange}>
          <SelectTrigger
            id="sort-select"
            className="w-[180px]"
            aria-label="Sortuj plany treningowe"
          >
            <SelectValue placeholder="Sortuj według" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
