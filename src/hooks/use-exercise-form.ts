"use client";

import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ExerciseDTO } from "@/types";
import { DEFAULT_EXERCISE_VALUE } from "@/lib/constants";
import {
  exerciseFormSchema,
  formValuesToCommand,
  type ExerciseFormValues,
} from "@/lib/validation/exercise-form";
import { parseApiValidationErrors } from "@/lib/form/parse-api-validation-errors";

type UseExerciseFormProps = {
  initialData?: ExerciseDTO;
  mode: "create" | "edit";
  onSuccess?: () => void | Promise<void>;
};

function toFormArray(
  arr: string[] | undefined,
  fallback: string | undefined,
): string[] {
  if (arr?.length) return [...arr];
  if (fallback) return [fallback];
  return [];
}

function applyDefaultIfEmpty<T>(value: T, defaultVal: T): T {
  if (value === "" || value === undefined || value === null) return defaultVal;
  if (Array.isArray(value) && value.length === 0) return defaultVal;
  return value;
}

function dtoToFormValues(dto?: ExerciseDTO): ExerciseFormValues {
  const raw: ExerciseFormValues = dto
    ? {
        title: dto.title ?? "",
        types: toFormArray(dto.types, dto.type) as ExerciseFormValues["types"],
        parts: toFormArray(dto.parts, dto.part) as ExerciseFormValues["parts"],
        level: dto.level ?? "",
        details: dto.details ?? "",
        is_unilateral: dto.is_unilateral ?? false,
        is_save_to_pr: dto.is_save_to_pr ?? true,
        reps: dto.reps?.toString() ?? "",
        duration_seconds: dto.duration_seconds?.toString() ?? "",
        series: dto.series?.toString() ?? "",
        rest_in_between_seconds: dto.rest_in_between_seconds?.toString() ?? "",
        rest_after_series_seconds:
          dto.rest_after_series_seconds?.toString() ?? "",
        estimated_set_time_seconds:
          dto.estimated_set_time_seconds?.toString() ?? "",
      }
    : {
        title: "",
        types: [] as ExerciseFormValues["types"],
        parts: [] as ExerciseFormValues["parts"],
        level: "",
        details: "",
        is_unilateral: false,
        is_save_to_pr: true,
        reps: "",
        duration_seconds: "",
        series: "",
        rest_in_between_seconds: "",
        rest_after_series_seconds: "",
        estimated_set_time_seconds: "",
      };

  const defaultValues = DEFAULT_EXERCISE_VALUE;
  const typesDefault = [
    defaultValues.section_type,
  ] as ExerciseFormValues["types"];

  return {
    ...raw,
    types: applyDefaultIfEmpty(raw.types, typesDefault),
    series: applyDefaultIfEmpty(raw.series, String(defaultValues.planned_sets)),
    reps: raw.reps,
    duration_seconds: raw.duration_seconds,
    rest_in_between_seconds: raw.rest_in_between_seconds,
    rest_after_series_seconds: applyDefaultIfEmpty(
      raw.rest_after_series_seconds,
      String(defaultValues.planned_rest_after_series_seconds),
    ),
    estimated_set_time_seconds: applyDefaultIfEmpty(
      raw.estimated_set_time_seconds,
      String(defaultValues.estimated_set_time_seconds),
    ),
  };
}

const EXERCISE_FIELD_MAPPING: Record<string, string> = {
  title: "title",
  types: "types",
  parts: "parts",
  level: "level",
  details: "details",
  is_unilateral: "is_unilateral",
  is_save_to_pr: "is_save_to_pr",
  reps: "reps",
  duration_seconds: "duration_seconds",
  series: "series",
  rest_in_between_seconds: "rest_in_between_seconds",
  rest_after_series_seconds: "rest_after_series_seconds",
  estimated_set_time_seconds: "estimated_set_time_seconds",
};

export function useExerciseForm({
  initialData,
  mode,
  onSuccess,
}: UseExerciseFormProps) {
  const router = useRouter();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(
      exerciseFormSchema,
    ) as unknown as Resolver<ExerciseFormValues>,
    defaultValues: dtoToFormValues(initialData),
  });

  const { formState, setError, handleSubmit: rhfHandleSubmit } = form;
  const { errors, isSubmitting, isDirty } = formState;

  const onSubmit = async (data: unknown) => {
    const command = formValuesToCommand(
      data as Parameters<typeof formValuesToCommand>[0],
    );
    const url =
      mode === "create"
        ? "/api/exercises"
        : `/api/exercises/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: "Wystąpił błąd",
        code: "INTERNAL",
      }));

      if (response.status === 400) {
        const { fieldErrors, formErrors } = parseApiValidationErrors(
          errorData.message,
          errorData.details,
          EXERCISE_FIELD_MAPPING,
        );
        setFormErrors(formErrors);
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof ExerciseFormValues, { message });
        }
      } else if (response.status === 409) {
        setError("title", { message: "Ćwiczenie o tej nazwie już istnieje" });
        toast.error("Ćwiczenie o tej nazwie już istnieje.");
      } else if (response.status === 404) {
        toast.error("Ćwiczenie nie zostało znalezione.");
        setTimeout(() => router.push("/exercises"), 1500);
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Brak autoryzacji. Zaloguj się ponownie.");
        setTimeout(() => router.push("/"), 1500);
      } else if (response.status >= 500) {
        toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
      } else {
        toast.error(errorData.message || "Wystąpił błąd. Spróbuj ponownie.");
      }
      return;
    }

    await response.json();
    setFormErrors([]);
    toast.success("Ćwiczenie zostało zapisane.");
    await onSuccess?.();
  };

  const handleSubmit = rhfHandleSubmit(onSubmit);

  const hasUnsavedChanges = isDirty;

  return {
    form,
    control: form.control,
    errors,
    formErrors,
    isLoading: isSubmitting,
    hasUnsavedChanges,
    handleSubmit,
  };
}
