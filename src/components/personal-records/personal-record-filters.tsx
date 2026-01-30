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
import type { PRMetricType } from "@/types";
import { prMetricTypeValues } from "@/lib/validation/personal-records";

const metricTypeLabels: Record<PRMetricType, string> = {
  total_reps: "Maks. powtórzenia",
  max_duration: "Maks. czas",
  max_weight: "Maks. ciężar",
};

type ExerciseTitle = { id: string; title: string };

type PersonalRecordFiltersProps = {
  exercises: ExerciseTitle[];
};

export function PersonalRecordFilters({
  exercises,
}: Readonly<PersonalRecordFiltersProps>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentExerciseId = searchParams.get("exercise_id");
  const currentMetricType = searchParams.get(
    "metric_type",
  ) as PRMetricType | null;

  const handleExerciseChange = (exerciseId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (exerciseId && exerciseId !== "all") {
      // Walidacja czy ćwiczenie istnieje na liście
      const exerciseExists = exercises.some((ex) => ex.id === exerciseId);
      if (exerciseExists) {
        params.set("exercise_id", exerciseId);
      }
    } else {
      params.delete("exercise_id");
    }

    // Reset cursor przy zmianie filtrów
    params.delete("cursor");

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleMetricTypeChange = (metricType: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (metricType && metricType !== "all") {
      // Walidacja czy typ metryki jest poprawny
      if (prMetricTypeValues.includes(metricType as PRMetricType)) {
        params.set("metric_type", metricType);
      }
    } else {
      params.delete("metric_type");
    }

    // Reset cursor przy zmianie filtrów
    params.delete("cursor");

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("exercise_id");
    params.delete("metric_type");
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters =
    currentExerciseId !== null || currentMetricType !== null;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap gap-4">
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
          value={currentMetricType || "all"}
          onValueChange={handleMetricTypeChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Typ metryki" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            {prMetricTypeValues.map((metricType) => (
              <SelectItem key={metricType} value={metricType}>
                {metricTypeLabels[metricType]}
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
