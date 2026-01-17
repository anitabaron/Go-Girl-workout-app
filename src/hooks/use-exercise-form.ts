"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import type { ExerciseDTO, ExerciseCreateCommand, ExerciseType, ExercisePart } from "@/types";
import {
  validateExerciseBusinessRules,
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";

// ViewModel - stan formularza (wszystkie pola jako stringi dla łatwiejszej obsługi)
export type ExerciseFormState = {
  title: string;
  type: ExerciseType | "";
  part: ExercisePart | "";
  level: string;
  details: string;
  reps: string;
  duration_seconds: string;
  series: string;
  rest_in_between_seconds: string;
  rest_after_series_seconds: string;
};

// Błędy walidacji
export type ExerciseFormErrors = {
  title?: string;
  type?: string;
  part?: string;
  level?: string;
  details?: string;
  reps?: string;
  duration_seconds?: string;
  series?: string;
  rest_in_between_seconds?: string;
  rest_after_series_seconds?: string;
  _form?: string[]; // Błędy na poziomie formularza (reguły biznesowe)
};

type UseExerciseFormProps = {
  initialData?: ExerciseDTO;
  mode: "create" | "edit";
  onSuccess?: () => void;
};

// Schema dla walidacji pojedynczych pól
const fieldSchemas = {
  title: z.string().trim().min(1, "Tytuł jest wymagany").max(120, "Tytuł może mieć maksymalnie 120 znaków"),
  type: z.enum(exerciseTypeValues, { message: "Typ jest wymagany" }),
  part: z.enum(exercisePartValues, { message: "Partia jest wymagana" }),
  level: z.string().transform((val) => {
    if (!val || val.trim() === "" || val === "none") return null;
    if (["Beginner", "Intermediate", "Advanced"].includes(val)) {
      return val as "Beginner" | "Intermediate" | "Advanced";
    }
    throw new z.ZodError([{
      code: "custom",
      path: [],
      message: "Wybierz poprawny poziom",
    }]);
  }).nullable().optional(),
  details: z.string().trim().max(1000, "Szczegóły mogą mieć maksymalnie 1000 znaków").optional().nullable(),
  reps: z.string().transform((val) => {
    if (!val || val.trim() === "") return null;
    const num = Number(val);
    if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) {
      throw new z.ZodError([{
        code: "custom",
        path: [],
        message: "Powtórzenia muszą być liczbą całkowitą większą od zera",
      }]);
    }
    return num;
  }).nullable().optional(),
  duration_seconds: z.string().transform((val) => {
    if (!val || val.trim() === "") return null;
    const num = Number(val);
    if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) {
      throw new z.ZodError([{
        code: "custom",
        path: [],
        message: "Czas trwania musi być liczbą całkowitą większą od zera",
      }]);
    }
    return num;
  }).nullable().optional(),
  series: z.string().transform((val) => {
    if (!val || val.trim() === "") {
      throw new z.ZodError([{
        code: "custom",
        path: [],
        message: "Serie są wymagane",
      }]);
    }
    const num = Number(val);
    if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) {
      throw new z.ZodError([{
        code: "custom",
        path: [],
        message: "Serie muszą być liczbą całkowitą większą od zera",
      }]);
    }
    return num;
  }),
  rest_in_between_seconds: z.string().transform((val) => {
    if (!val || val.trim() === "") return null;
    const num = Number(val);
    if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) {
      throw new z.ZodError([{
        code: "custom",
        path: [],
        message: "Odpoczynek między seriami nie może być ujemny",
      }]);
    }
    return num;
  }).nullable().optional(),
  rest_after_series_seconds: z.string().transform((val) => {
    if (!val || val.trim() === "") return null;
    const num = Number(val);
    if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) {
      throw new z.ZodError([{
        code: "custom",
        path: [],
        message: "Odpoczynek po serii nie może być ujemny",
      }]);
    }
    return num;
  }).nullable().optional(),
};

// Funkcja pomocnicza do konwersji DTO na ViewModel
function dtoToFormState(dto?: ExerciseDTO): ExerciseFormState {
  if (!dto) {
    return {
      title: "",
      type: "",
      part: "",
      level: "",
      details: "",
      reps: "",
      duration_seconds: "",
      series: "",
      rest_in_between_seconds: "",
      rest_after_series_seconds: "",
    };
  }

  return {
    title: dto.title ?? "",
    type: dto.type ?? "",
    part: dto.part ?? "",
    level: dto.level ?? "",
    details: dto.details ?? "",
    reps: dto.reps?.toString() ?? "",
    duration_seconds: dto.duration_seconds?.toString() ?? "",
    series: dto.series.toString(),
    rest_in_between_seconds: dto.rest_in_between_seconds?.toString() ?? "",
    rest_after_series_seconds: dto.rest_after_series_seconds?.toString() ?? "",
  };
}

// Funkcja pomocnicza do konwersji ViewModel na Command
function formStateToCommand(
  state: ExerciseFormState
): ExerciseCreateCommand {
  const command: ExerciseCreateCommand = {
    title: state.title.trim(),
    type: state.type as ExerciseType,
    part: state.part as ExercisePart,
    series: Number(state.series),
  };

  const trimmedLevel = state.level?.trim();
  if (trimmedLevel && ["Beginner", "Intermediate", "Advanced"].includes(trimmedLevel)) {
    command.level = trimmedLevel as "Beginner" | "Intermediate" | "Advanced";
  } else {
    command.level = null;
  }

  if (state.details.trim()) {
    command.details = state.details.trim() || null;
  }

  if (state.reps.trim()) {
    const reps = Number(state.reps);
    if (!Number.isNaN(reps) && Number.isInteger(reps) && reps > 0) {
      command.reps = reps;
    }
  }

  if (state.duration_seconds.trim()) {
    const duration = Number(state.duration_seconds);
    if (!Number.isNaN(duration) && Number.isInteger(duration) && duration > 0) {
      command.duration_seconds = duration;
    }
  }

  if (state.rest_in_between_seconds.trim()) {
    const rest = Number(state.rest_in_between_seconds);
    if (!Number.isNaN(rest) && Number.isInteger(rest) && rest >= 0) {
      command.rest_in_between_seconds = rest;
    }
  }

  if (state.rest_after_series_seconds.trim()) {
    const rest = Number(state.rest_after_series_seconds);
    if (!Number.isNaN(rest) && Number.isInteger(rest) && rest >= 0) {
      command.rest_after_series_seconds = rest;
    }
  }

  return command;
}

export function useExerciseForm({
  initialData,
  mode,
  onSuccess,
}: UseExerciseFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<ExerciseFormState>(() =>
    dtoToFormState(initialData)
  );
  const [errors, setErrors] = useState<ExerciseFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const initialDataRef = useRef(initialData);

  // Aktualizacja initialDataRef gdy się zmienia
  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  // Obliczanie czy są niezapisane zmiany - używamy useMemo zamiast bezpośredniego obliczenia
  const hasUnsavedChanges = useMemo(() => {
    if (!initialData) {
      // W trybie tworzenia - sprawdź czy jakiekolwiek pole jest wypełnione
      return Object.values(fields).some((val) => val !== "");
    }

    // W trybie edycji - porównaj z initialData
    try {
      const current = formStateToCommand(fields);

      return (
        current.title !== initialData.title ||
        current.type !== initialData.type ||
        current.part !== initialData.part ||
        (current.level ?? null) !== (initialData.level ?? null) ||
        (current.details ?? null) !== (initialData.details ?? null) ||
        (current.reps ?? null) !== (initialData.reps ?? null) ||
        (current.duration_seconds ?? null) !== (initialData.duration_seconds ?? null) ||
        current.series !== initialData.series ||
        (current.rest_in_between_seconds ?? null) !== (initialData.rest_in_between_seconds ?? null) ||
        (current.rest_after_series_seconds ?? null) !== (initialData.rest_after_series_seconds ?? null)
      );
    } catch {
      // Jeśli nie można przekonwertować, uznaj że są zmiany
      return true;
    }
  }, [fields, initialData]);

  // Walidacja pojedynczego pola
  const validateField = (field: keyof ExerciseFormState, value: string): string | undefined => {
    try {
      const schema = fieldSchemas[field];
      if (schema) {
        schema.parse(value);
      }
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError && error.issues && error.issues.length > 0) {
        return error.issues[0]?.message;
      }
      return undefined;
    }
  };

  // Walidacja całego formularza
  const validateForm = (): boolean => {
    const newErrors: ExerciseFormErrors = {};
    let isValid = true;

    // Walidacja pól wymaganych
    for (const field of Object.keys(fields) as Array<keyof ExerciseFormState>) {
      const value = fields[field];
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    // Walidacja reguł biznesowych - tylko jeśli podstawowe pola są poprawne
    if (isValid || (fields.title.trim() && fields.type && fields.part && fields.series.trim())) {
      try {
        const command = formStateToCommand(fields);
        const businessErrors = validateExerciseBusinessRules(command);

        if (businessErrors.length > 0) {
          newErrors._form = businessErrors;
          isValid = false;
        }
      } catch {
        // Jeśli nie można przekonwertować, błędy pól już są ustawione
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (field: keyof ExerciseFormState, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    // Wyczyść błąd dla tego pola przy zmianie
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: keyof ExerciseFormState) => {
    const value = fields[field];
    const error = validateField(field, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const command = formStateToCommand(fields);
      const url = mode === "create" ? "/api/exercises" : `/api/exercises/${initialData?.id}`;
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
          // Błąd walidacji - parsuj i przypisz błędy do odpowiednich pól
          const newErrors: ExerciseFormErrors = parseValidationErrors(errorData);
          setErrors(newErrors);
        } else if (response.status === 409) {
          // Duplikat tytułu
          setErrors({ title: "Ćwiczenie o tej nazwie już istnieje" });
          toast.error("Ćwiczenie o tej nazwie już istnieje.");
        } else if (response.status === 404) {
          toast.error("Ćwiczenie nie zostało znalezione.");
          setTimeout(() => {
            router.push("/exercises");
          }, 1500);
          return;
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Brak autoryzacji. Zaloguj się ponownie.");
          setTimeout(() => {
            router.push("/");
          }, 1500);
          return;
        } else if (response.status >= 500) {
          toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
        } else {
          toast.error(errorData.message || "Wystąpił błąd. Spróbuj ponownie.");
        }

        setIsLoading(false);
        return;
      }

      // Sukces
      await response.json();
      toast.success("Ćwiczenie zostało zapisane.");
      
      // Wywołaj callback sukcesu (który przekieruje do listy)
      onSuccess?.();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        // Network error
        toast.error("Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.");
      } else if (error instanceof SyntaxError) {
        // Błąd parsowania JSON
        toast.error("Nieprawidłowa odpowiedź z serwera. Spróbuj ponownie.");
      } else {
        toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      }
      setIsLoading(false);
    }
  };

  return {
    fields,
    errors,
    isLoading,
    hasUnsavedChanges,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}

/**
 * Parsuje błędy walidacji z odpowiedzi API i przypisuje je do odpowiednich pól formularza.
 * Obsługuje zarówno błędy pól jak i błędy reguł biznesowych.
 */
function parseValidationErrors(errorData: {
  message?: string;
  code?: string;
  details?: string;
}): ExerciseFormErrors {
  const errors: ExerciseFormErrors = {};

  if (!errorData.message) {
    return errors;
  }

  const message = errorData.message;
  const details = errorData.details || "";

  // Jeśli message zawiera wiele błędów oddzielonych "; ", rozdziel je
  const errorMessages = message.split("; ").filter((msg) => msg.trim());

  // Mapowanie nazw pól z API na nazwy pól w formularzu
  const fieldMapping: Record<string, keyof ExerciseFormState> = {
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
  };

  for (const errorMsg of errorMessages) {
    let assigned = false;

    // Sprawdź czy błąd dotyczy konkretnego pola
    for (const [apiField, formField] of Object.entries(fieldMapping)) {
      const normalizedField = apiField.replaceAll("_", " ").toLowerCase();
      if (
        errorMsg.toLowerCase().includes(apiField.toLowerCase()) ||
        errorMsg.toLowerCase().includes(normalizedField)
      ) {
        errors[formField] = errorMsg;
        assigned = true;
        break;
      }
    }

    // Jeśli nie przypisano do pola, dodaj jako błąd formularza
    if (!assigned) {
      errors._form ??= [];
      errors._form.push(errorMsg);
    }
  }

  // Jeśli są szczegóły, które nie zostały przypisane, dodaj je jako błędy formularza
  if (details && !errorMessages.some((msg) => details.includes(msg))) {
    errors._form ??= [];
    errors._form.push(details);
  }

  return errors;
}
