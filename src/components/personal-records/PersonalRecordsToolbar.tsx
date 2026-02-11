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
import { Toolbar } from "@/components/layout/Toolbar";
import type { PersonalRecordQueryParams, PRMetricType } from "@/types";
import { prMetricTypeValues } from "@/lib/validation/personal-records";
import { useTranslations } from "@/i18n/client";

type SortField = NonNullable<PersonalRecordQueryParams["sort"]>;
type SortOrder = NonNullable<PersonalRecordQueryParams["order"]>;

const SORT_OPTIONS = [
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

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function parseSortValue(sort?: string, order?: string): SortValue {
  const found = SORT_OPTIONS.find(
    (o) => o.sort === (sort ?? "achieved_at") && o.order === (order ?? "desc"),
  );
  return found?.value ?? "achieved_at_desc";
}

type ExerciseTitle = { id: string; title: string };

type PersonalRecordsToolbarProps = {
  exercises: ExerciseTitle[];
  exerciseId?: string | null;
  metricType?: PRMetricType | null;
  sort?: string;
  order?: string;
};

export function PersonalRecordsToolbar({
  exercises,
  exerciseId = null,
  metricType = null,
  sort = "achieved_at",
  order = "desc",
}: PersonalRecordsToolbarProps) {
  const t = useTranslations("personalRecordsToolbar");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const sortValue = parseSortValue(sort, order);

  const updateParams = useCallback(
    (updates: {
      exercise_id?: string | null;
      metric_type?: PRMetricType | null;
      sort?: string;
      order?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.exercise_id !== undefined) {
        if (updates.exercise_id) params.set("exercise_id", updates.exercise_id);
        else params.delete("exercise_id");
      }
      if (updates.metric_type !== undefined) {
        if (updates.metric_type) params.set("metric_type", updates.metric_type);
        else params.delete("metric_type");
      }
      if (updates.sort !== undefined) params.set("sort", updates.sort);
      if (updates.order !== undefined) params.set("order", updates.order);
      params.delete("cursor");
      startTransition(() => {
        router.push(`/personal-records?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handleExerciseChange = (value: string) => {
    const exerciseIdValue = value && value !== "all" ? value : null;
    if (exerciseIdValue && !exercises.some((ex) => ex.id === exerciseIdValue)) {
      return;
    }
    updateParams({ exercise_id: exerciseIdValue });
  };

  const handleMetricTypeChange = (value: string) => {
    const metricTypeValue =
      value &&
      value !== "all" &&
      prMetricTypeValues.includes(value as PRMetricType)
        ? (value as PRMetricType)
        : null;
    updateParams({ metric_type: metricTypeValue });
  };

  const handleSortChange = (value: SortValue) => {
    const option = SORT_OPTIONS.find((o) => o.value === value);
    if (option) {
      updateParams({ sort: option.sort, order: option.order });
    }
  };

  const handleClearFilters = () => {
    updateParams({ exercise_id: null, metric_type: null });
  };

  const hasActiveFilters = exerciseId != null || metricType != null;

  return (
    <Toolbar className="flex flex-wrap items-center gap-4">
      <div className="flex flex-col gap-1">
          <label htmlFor="exercise-filter" className="sr-only">
            {t("exerciseFilterLabel")}
          </label>
        <Select
          value={exerciseId ?? "all"}
          onValueChange={handleExerciseChange}
          disabled={isPending}
        >
          <SelectTrigger
            id="exercise-filter"
            className="w-[200px]"
            aria-label={t("exerciseFilterAria")}
          >
            <SelectValue placeholder={t("exercisePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allExercises")}</SelectItem>
            {exercises.map((exercise) => (
              <SelectItem key={exercise.id} value={exercise.id}>
                {exercise.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="metric-type-filter" className="sr-only">
          {t("metricTypeFilterLabel")}
        </label>
        <Select
          value={metricType ?? "all"}
          onValueChange={handleMetricTypeChange}
          disabled={isPending}
        >
          <SelectTrigger
            id="metric-type-filter"
            className="w-[200px]"
            aria-label={t("metricTypeFilterAria")}
          >
            <SelectValue placeholder={t("metricTypePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            {prMetricTypeValues.map((mt) => (
              <SelectItem key={mt} value={mt}>
                {t(`metric.${mt}`)}
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
            className="w-[200px]"
            aria-label={t("sortAria")}
          >
            <SelectValue placeholder={t("sortPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={handleClearFilters}
          disabled={isPending}
          aria-label={t("clearFiltersAria")}
        >
          {t("clearFilters")}
        </Button>
      )}
    </Toolbar>
  );
}
