"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Toolbar } from "./Toolbar";
import type { PlanQueryParams } from "@/types";
import { exercisePartValues } from "@/lib/validation/exercises";
import {
  EXERCISE_LABELS_NAMESPACE,
  getExercisePartLabel,
} from "@/lib/exercises/labels";
import { useTranslations } from "@/i18n/client";

type SortField = NonNullable<PlanQueryParams["sort"]>;
type SortOrder = NonNullable<PlanQueryParams["order"]>;

const SORT_OPTIONS = [
  {
    value: "created_at-desc",
    labelKey: "sortNewest",
    sort: "created_at" as SortField,
    order: "desc" as SortOrder,
  },
  {
    value: "created_at-asc",
    labelKey: "sortOldest",
    sort: "created_at" as SortField,
    order: "asc" as SortOrder,
  },
  {
    value: "name-asc",
    labelKey: "sortNameAsc",
    sort: "name" as SortField,
    order: "asc" as SortOrder,
  },
  {
    value: "name-desc",
    labelKey: "sortNameDesc",
    sort: "name" as SortField,
    order: "desc" as SortOrder,
  },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function parseSortValue(sort?: string, order?: string): SortValue {
  const key = `${sort ?? "created_at"}-${order ?? "desc"}`;
  const found = SORT_OPTIONS.find((o) => o.value === key);
  return found?.value ?? "created_at-desc";
}

type WorkoutPlansToolbarProps = {
  part?: string | null;
  sort?: string;
  order?: string;
};

export function WorkoutPlansToolbar({
  part = null,
  sort = "created_at",
  order = "desc",
}: WorkoutPlansToolbarProps) {
  const t = useTranslations("workoutPlansToolbar");
  const tExerciseLabel = useTranslations(EXERCISE_LABELS_NAMESPACE);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const sortValue = parseSortValue(sort, order);

  const updateParams = useCallback(
    (updates: { part?: string | null; sort?: string; order?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.part !== undefined) {
        if (updates.part) params.set("part", updates.part);
        else params.delete("part");
      }
      if (updates.sort !== undefined) params.set("sort", updates.sort);
      if (updates.order !== undefined) params.set("order", updates.order);
      params.delete("cursor");
      startTransition(() => {
        router.push(`/workout-plans?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handlePartChange = (value: string) => {
    const partValue = value === "all" ? null : value;
    updateParams({ part: partValue });
  };

  const handleSortChange = (value: SortValue) => {
    const option = SORT_OPTIONS.find((o) => o.value === value);
    if (option) {
      updateParams({ sort: option.sort, order: option.order });
    }
  };

  const hasActiveFilters = part != null && part !== "";

  return (
    <Toolbar className="flex flex-wrap items-center gap-4">
      <div className="flex flex-nowrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="part-filter" className="sr-only">
            {t("partFilterLabel")}
          </label>
          <Select
            value={part ?? "all"}
            onValueChange={handlePartChange}
            disabled={isPending}
          >
            <SelectTrigger
              id="part-filter"
              className="w-[180px]"
              aria-label={t("partFilterAria")}
            >
              <SelectValue placeholder={t("partPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allParts")}</SelectItem>
              {exercisePartValues.map((p) => (
                <SelectItem key={p} value={p}>
                  {getExercisePartLabel(tExerciseLabel, p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sort-select" className="sr-only">
            {t("sortLabel")}
          </label>
          <Select
            value={sortValue}
            onValueChange={handleSortChange}
            disabled={isPending}
          >
            <SelectTrigger
              id="sort-select"
              className="w-[180px]"
              aria-label={t("sortAria")}
            >
              <SelectValue placeholder={t("sortPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={() => updateParams({ part: null })}
          disabled={isPending}
          aria-label={t("clearFiltersAria")}
        >
          {t("clearFilters")}
        </Button>
      )}
    </Toolbar>
  );
}
