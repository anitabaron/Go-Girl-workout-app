"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PersonalRecordQueryParams } from "@/types";

type SortField = NonNullable<PersonalRecordQueryParams["sort"]>;
type SortOrder = NonNullable<PersonalRecordQueryParams["order"]>;

const sortOptions = [
  {
    value: "achieved_at_desc",
    label: "Najnowsze pierwsze",
    sort: "achieved_at" as SortField,
    order: "desc" as SortOrder,
  },
  {
    value: "achieved_at_asc",
    label: "Najstarsze pierwsze",
    sort: "achieved_at" as SortField,
    order: "asc" as SortOrder,
  },
  {
    value: "value_desc",
    label: "Największa wartość",
    sort: "value" as SortField,
    order: "desc" as SortOrder,
  },
  {
    value: "value_asc",
    label: "Najmniejsza wartość",
    sort: "value" as SortField,
    order: "asc" as SortOrder,
  },
] as const;

export function PersonalRecordSort() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentSort =
    (searchParams.get("sort") as SortField) || ("achieved_at" as SortField);
  const currentOrder =
    (searchParams.get("order") as SortOrder) || ("desc" as SortOrder);

  // Znajdź aktualną opcję sortowania
  const currentOption =
    sortOptions.find(
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
          Sortuj rekordy osobiste
        </label>
        <Select value={currentOption.value} onValueChange={handleSortChange}>
          <SelectTrigger
            id="sort-select"
            className="w-[200px]"
            aria-label="Sortuj rekordy osobiste"
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
