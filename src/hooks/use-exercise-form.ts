"use client";

import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ExerciseDTO } from "@/types";
import {
  exerciseFormSchema,
  formValuesToCommand,
  type ExerciseFormValues,
} from "@/lib/validation/exercise-form";

type UseExerciseFormProps = {
  initialData?: ExerciseDTO;
  mode: "create" | "edit";
  onSuccess?: () => void | Promise<void>;
};

type ParsedErrors = {
  fieldErrors: Record<string, string>;
  formErrors: string[];
};

function dtoToFormValues(dto?: ExerciseDTO): ExerciseFormValues {
  if (!dto) {
    return {
      title: "",
      type: "" as ExerciseFormValues["type"],
      part: "" as ExerciseFormValues["part"],
      level: "",
      details: "",
      reps: "",
      duration_seconds: "",
      series: "",
      rest_in_between_seconds: "",
      rest_after_series_seconds: "",
      estimated_set_time_seconds: "",
    };
  }

  return {
    title: dto.title ?? "",
    type: dto.type ?? ("" as ExerciseFormValues["type"]),
    part: dto.part ?? ("" as ExerciseFormValues["part"]),
    level: dto.level ?? "",
    details: dto.details ?? "",
    reps: dto.reps?.toString() ?? "",
    duration_seconds: dto.duration_seconds?.toString() ?? "",
    series: dto.series.toString(),
    rest_in_between_seconds: dto.rest_in_between_seconds?.toString() ?? "",
    rest_after_series_seconds: dto.rest_after_series_seconds?.toString() ?? "",
    estimated_set_time_seconds:
      dto.estimated_set_time_seconds?.toString() ?? "",
  };
}

function parseValidationErrors(errorData: {
  message?: string;
  code?: string;
  details?: string;
}): ParsedErrors {
  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];

  if (!errorData.message) {
    return { fieldErrors, formErrors };
  }

  const message = errorData.message;
  const errorMessages = message.split("; ").filter((msg) => msg.trim());

  const fieldMapping: Record<string, keyof ExerciseFormValues> = {
    title: "title",
    type: "type",
    part: "part",
    level: "level",
    details: "details",
    reps: "reps",
    duration_seconds: "duration_seconds",
    series: "series",
    rest_in_between_seconds: "rest_in_between_seconds",
    rest_after_series_seconds: "rest_after_series_seconds",
    estimated_set_time_seconds: "estimated_set_time_seconds",
  };

  for (const errorMsg of errorMessages) {
    let assigned = false;

    for (const [apiField, formField] of Object.entries(fieldMapping)) {
      const normalizedField = apiField.replaceAll("_", " ").toLowerCase();
      if (
        errorMsg.toLowerCase().includes(apiField.toLowerCase()) ||
        errorMsg.toLowerCase().includes(normalizedField)
      ) {
        fieldErrors[formField] = errorMsg;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      formErrors.push(errorMsg);
    }
  }

  if (
    errorData.details &&
    !errorMessages.some((msg) => errorData.details?.includes(msg))
  ) {
    formErrors.push(errorData.details);
  }

  return { fieldErrors, formErrors };
}

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
        const { fieldErrors, formErrors } = parseValidationErrors(errorData);
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
