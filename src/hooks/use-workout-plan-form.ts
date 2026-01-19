"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  WorkoutPlanDTO,
  WorkoutPlanCreateCommand,
  WorkoutPlanUpdateCommand,
  WorkoutPlanExerciseInput,
  ExerciseDTO,
} from "@/types";
import type {
  WorkoutPlanFormState,
  WorkoutPlanFormErrors,
  WorkoutPlanExerciseItemState,
} from "@/types/workout-plan-form";
import { dtoToFormState } from "@/types/workout-plan-form";
import {
  validateWorkoutPlanFormBusinessRules,
  validateWorkoutPlanFormField,
  validatePlannedParam,
} from "@/lib/validation/workout-plan-form";
import { useBeforeUnload } from "./use-before-unload";

type UseWorkoutPlanFormProps = {
  initialData?: WorkoutPlanDTO;
  mode: "create" | "edit";
  onSuccess?: () => void;
};

export function useWorkoutPlanForm({
  initialData,
  mode,
  onSuccess,
}: UseWorkoutPlanFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<WorkoutPlanFormState>(() =>
    dtoToFormState(initialData)
  );
  const [errors, setErrors] = useState<WorkoutPlanFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const initialDataRef = useRef(initialData);

  // Aktualizacja initialDataRef gdy się zmienia
  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  // Obliczanie czy są niezapisane zmiany
  const hasUnsavedChanges = useMemo(() => {
    if (!initialData) {
      // W trybie tworzenia - sprawdź czy jakiekolwiek pole jest wypełnione
      return (
        fields.name.trim() !== "" ||
        fields.description !== null ||
        fields.part !== null ||
        fields.exercises.length > 0
      );
    }

    // W trybie edycji - porównaj z initialData
    const current = fields;
    const initial = dtoToFormState(initialData);

    return (
      current.name !== initial.name ||
      current.description !== initial.description ||
      current.part !== initial.part ||
      JSON.stringify(current.exercises) !== JSON.stringify(initial.exercises)
    );
  }, [fields, initialData]);

  // Integracja z useBeforeUnload
  useBeforeUnload(hasUnsavedChanges);

  // Walidacja pojedynczego pola
  const validateField = (
    field: keyof WorkoutPlanFormState,
    value: unknown
  ): string | undefined => {
    return validateWorkoutPlanFormField(field, value);
  };

  // Walidacja pól metadanych
  const validateMetadataFields = (
    newErrors: WorkoutPlanFormErrors
  ): boolean => {
    let isValid = true;

    const nameError = validateField("name", fields.name);
    if (nameError) {
      newErrors.name = nameError;
      isValid = false;
    }

    const descriptionError = validateField("description", fields.description);
    if (descriptionError) {
      newErrors.description = descriptionError;
      isValid = false;
    }

    const partError = validateField("part", fields.part);
    if (partError) {
      newErrors.part = partError;
      isValid = false;
    }

    return isValid;
  };

  // Walidacja pojedynczego ćwiczenia
  const validateExercise = (
    exercise: WorkoutPlanExerciseItemState,
    index: number
  ): Record<string, string> => {
    const exerciseErrors: Record<string, string> = {};
    const exerciseKey = `exercise_${index}`;

    if (!exercise.exercise_id || exercise.exercise_id.trim() === "") {
      exerciseErrors[`${exerciseKey}.exercise_id`] = "Ćwiczenie jest wymagane";
    }

    if (!exercise.section_type) {
      exerciseErrors[`${exerciseKey}.section_type`] = "Typ sekcji jest wymagany";
    }

    if (
      !exercise.section_order ||
      !Number.isInteger(exercise.section_order) ||
      exercise.section_order <= 0
    ) {
      exerciseErrors[`${exerciseKey}.section_order`] =
        "Kolejność musi być liczbą całkowitą większą od zera";
    }

    const setsError = validatePlannedParam("planned_sets", exercise.planned_sets);
    if (setsError) {
      exerciseErrors[`${exerciseKey}.planned_sets`] = setsError;
    }

    const repsError = validatePlannedParam("planned_reps", exercise.planned_reps);
    if (repsError) {
      exerciseErrors[`${exerciseKey}.planned_reps`] = repsError;
    }

    const durationError = validatePlannedParam(
      "planned_duration_seconds",
      exercise.planned_duration_seconds
    );
    if (durationError) {
      exerciseErrors[`${exerciseKey}.planned_duration_seconds`] = durationError;
    }

    const restError = validatePlannedParam(
      "planned_rest_seconds",
      exercise.planned_rest_seconds
    );
    if (restError) {
      exerciseErrors[`${exerciseKey}.planned_rest_seconds`] = restError;
    }

    return exerciseErrors;
  };

  // Walidacja całego formularza
  const validateForm = (): boolean => {
    const newErrors: WorkoutPlanFormErrors = {};
    let isValid = true;

    // Walidacja pól metadanych
    const metadataValid = validateMetadataFields(newErrors);
    isValid = isValid && metadataValid;

    // Walidacja ćwiczeń
    if (fields.exercises.length === 0) {
      newErrors._form = [
        "Plan treningowy musi zawierać co najmniej jedno ćwiczenie.",
      ];
      isValid = false;
    } else {
      const exerciseErrors: Record<string, string> = {};
      fields.exercises.forEach((exercise, index) => {
        const errors = validateExercise(exercise, index);
        Object.assign(exerciseErrors, errors);
      });

      if (Object.keys(exerciseErrors).length > 0) {
        newErrors.exercises = exerciseErrors;
        isValid = false;
      }

      const businessErrors = validateWorkoutPlanFormBusinessRules(
        fields.exercises
      );
      if (businessErrors.length > 0) {
        newErrors._form = businessErrors;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (field: string, value: unknown) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    // Wyczyść błąd dla tego pola przy zmianie
    if (errors[field as keyof WorkoutPlanFormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof WorkoutPlanFormErrors];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: string) => {
    const value = fields[field as keyof WorkoutPlanFormState];
    const error = validateField(field as keyof WorkoutPlanFormState, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof WorkoutPlanFormErrors];
        return newErrors;
      });
    }
  };

  const handleAddExercise = (exercises: ExerciseDTO | ExerciseDTO[]) => {
    // Normalizuj do tablicy
    const exercisesArray = Array.isArray(exercises) ? exercises : [exercises];

    if (exercisesArray.length === 0) {
      return;
    }

    // Grupuj ćwiczenia według typu sekcji
    const exercisesBySection = new Map<
      ExerciseDTO["type"],
      ExerciseDTO[]
    >();
    exercisesArray.forEach((exercise) => {
      const sectionType = exercise.type;
      if (!exercisesBySection.has(sectionType)) {
        exercisesBySection.set(sectionType, []);
      }
      exercisesBySection.get(sectionType)!.push(exercise);
    });

    // Dla każdej sekcji, znajdź następną dostępną pozycję
    const newExercises: WorkoutPlanExerciseItemState[] = [];

    exercisesBySection.forEach((sectionExercises, sectionType) => {
      const exercisesInSection = fields.exercises.filter(
        (e) => e.section_type === sectionType
      );
      let nextOrder =
        exercisesInSection.length > 0
          ? Math.max(...exercisesInSection.map((e) => e.section_order)) + 1
          : 1;

      // Dodaj wszystkie ćwiczenia z tej sekcji
      sectionExercises.forEach((exercise) => {
        const newExercise: WorkoutPlanExerciseItemState = {
          exercise_id: exercise.id,
          exercise_title: exercise.title,
          exercise_type: exercise.type,
          exercise_part: exercise.part,
          section_type: sectionType,
          section_order: nextOrder,
          // Mapowanie wartości z ćwiczenia do parametrów planowanych
          planned_sets: exercise.series ?? null,
          planned_reps: exercise.reps ?? null,
          planned_duration_seconds: exercise.duration_seconds ?? null,
          // Używamy rest_in_between_seconds jako głównego odpoczynku
          // Jeśli nie ma, używamy rest_after_series_seconds
          planned_rest_seconds:
            exercise.rest_in_between_seconds ??
            exercise.rest_after_series_seconds ??
            null,
        };

        newExercises.push(newExercise);
        nextOrder += 1;
      });
    });

    setFields((prev) => ({
      ...prev,
      exercises: [...prev.exercises, ...newExercises],
    }));

    // Wyczyść błędy ćwiczeń przy dodaniu
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors.exercises) {
        delete newErrors.exercises;
      }
      if (newErrors._form) {
        delete newErrors._form;
      }
      return newErrors;
    });
  };

  const handleRemoveExercise = (index: number) => {
    setFields((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));

    // Wyczyść błędy dla usuniętego ćwiczenia
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors.exercises) {
        const exerciseErrors = { ...newErrors.exercises };
        Object.keys(exerciseErrors).forEach((key) => {
          if (key.startsWith(`exercise_${index}.`)) {
            delete exerciseErrors[key];
          }
        });
        newErrors.exercises =
          Object.keys(exerciseErrors).length > 0 ? exerciseErrors : undefined;
      }
      return newErrors;
    });
  };

  const handleUpdateExercise = (
    index: number,
    updates: Partial<WorkoutPlanExerciseItemState>
  ) => {
    setFields((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise, i) =>
        i === index ? { ...exercise, ...updates } : exercise
      ),
    }));

    // Wyczyść błędy dla zaktualizowanego ćwiczenia
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors.exercises) {
        const exerciseErrors = { ...newErrors.exercises };
        Object.keys(updates).forEach((field) => {
          const key = `exercise_${index}.${field}`;
          delete exerciseErrors[key];
        });
        newErrors.exercises =
          Object.keys(exerciseErrors).length > 0 ? exerciseErrors : undefined;
      }
      return newErrors;
    });
  };

  const handleMoveExercise = (index: number, direction: "up" | "down") => {
    setFields((prev) => {
      const currentExercise = prev.exercises[index];
      if (!currentExercise) return prev;

      // Znajdź wszystkie ćwiczenia w tej samej sekcji
      const exercisesInSection = prev.exercises
        .map((ex, i) => ({ exercise: ex, originalIndex: i }))
        .filter(
          ({ exercise }) => exercise.section_type === currentExercise.section_type
        )
        .sort((a, b) => a.exercise.section_order - b.exercise.section_order);

      // Znajdź pozycję bieżącego ćwiczenia w posortowanej liście sekcji
      const currentPosition = exercisesInSection.findIndex(
        ({ originalIndex }) => originalIndex === index
      );

      if (currentPosition === -1) return prev;

      // Sprawdź czy można przesunąć
      if (direction === "up" && currentPosition === 0) return prev;
      if (
        direction === "down" &&
        currentPosition === exercisesInSection.length - 1
      )
        return prev;

      // Znajdź ćwiczenie do zamiany
      const targetPosition =
        direction === "up" ? currentPosition - 1 : currentPosition + 1;
      const targetItem = exercisesInSection[targetPosition];
      const currentItem = exercisesInSection[currentPosition];

      // Zamień section_order
      const newExercises = [...prev.exercises];
      newExercises[currentItem.originalIndex] = {
        ...currentItem.exercise,
        section_order: targetItem.exercise.section_order,
      };
      newExercises[targetItem.originalIndex] = {
        ...targetItem.exercise,
        section_order: currentItem.exercise.section_order,
      };

      // Przepisz section_order dla wszystkich ćwiczeń w sekcji, aby były kolejne (1, 2, 3...)
      const updatedExercisesInSection = newExercises
        .map((ex, i) => ({ exercise: ex, originalIndex: i }))
        .filter(
          ({ exercise }) =>
            exercise.section_type === currentExercise.section_type
        )
        .sort((a, b) => a.exercise.section_order - b.exercise.section_order);

      updatedExercisesInSection.forEach(({ exercise, originalIndex }, orderIndex) => {
        newExercises[originalIndex] = {
          ...exercise,
          section_order: orderIndex + 1,
        };
      });

      return {
        ...prev,
        exercises: newExercises,
      };
    });

    // Wyczyść błędy związane z kolejnością
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors.exercises) {
        const exerciseErrors = { ...newErrors.exercises };
        const key = `exercise_${index}.section_order`;
        delete exerciseErrors[key];
        newErrors.exercises =
          Object.keys(exerciseErrors).length > 0 ? exerciseErrors : undefined;
      }
      return newErrors;
    });
  };

  // Konwersja formState na Command dla API
  const formStateToCreateCommand = (): WorkoutPlanCreateCommand => {
    const exercises: WorkoutPlanExerciseInput[] = fields.exercises.map(
      (exercise) => ({
        exercise_id: exercise.exercise_id,
        section_type: exercise.section_type,
        section_order: exercise.section_order,
        planned_sets: exercise.planned_sets ?? undefined,
        planned_reps: exercise.planned_reps ?? undefined,
        planned_duration_seconds: exercise.planned_duration_seconds ?? undefined,
        planned_rest_seconds: exercise.planned_rest_seconds ?? undefined,
      })
    );

    return {
      name: fields.name.trim(),
      description: fields.description?.trim() || null,
      part: fields.part || null,
      exercises,
    };
  };

  const formStateToUpdateCommand = (): WorkoutPlanUpdateCommand => {
    // W trybie edycji, zgodnie z planem, używamy workoutPlanExerciseUpdateSchema
    // który wymaga id dla każdego ćwiczenia
    const exercises = fields.exercises.map((exercise) => ({
      id: exercise.id!,
      exercise_id: exercise.exercise_id,
      section_type: exercise.section_type,
      section_order: exercise.section_order,
      planned_sets: exercise.planned_sets ?? null,
      planned_reps: exercise.planned_reps ?? null,
      planned_duration_seconds: exercise.planned_duration_seconds ?? null,
      planned_rest_seconds: exercise.planned_rest_seconds ?? null,
    }));

    return {
      name: fields.name.trim(),
      description: fields.description?.trim() || null,
      part: fields.part || null,
      exercises,
    };
  };

  const handleValidationError = (errorData: {
    message?: string;
    code?: string;
    details?: string;
  }) => {
    const newErrors: WorkoutPlanFormErrors = parseValidationErrors(errorData);
    setErrors(newErrors);
    toast.error("Popraw błędy w formularzu.");
  };

  const handleConflictError = (errorData: { message?: string }) => {
    const newErrors: WorkoutPlanFormErrors = {
      _form: [
        errorData.message || "Duplikat pozycji w sekcji planu treningowego.",
      ],
    };
    setErrors(newErrors);
    toast.error(
      errorData.message || "Duplikat pozycji w sekcji planu treningowego."
    );
  };

  const handleNotFoundError = () => {
    toast.error("Plan treningowy nie został znaleziony.");
    setTimeout(() => {
      router.push("/workout-plans");
    }, 1500);
  };

  const handleAuthError = () => {
    toast.error("Brak autoryzacji. Zaloguj się ponownie.");
    setTimeout(() => {
      router.push("/");
    }, 1500);
  };

  const handleServerError = (errorData: { message?: string }) => {
    if (errorData.message) {
      toast.error(errorData.message);
    } else {
      toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
    }
  };

  const handleApiError = async (response: Response) => {
    const errorData = await response.json().catch(() => ({
      message: "Wystąpił błąd",
      code: "INTERNAL",
    }));

    if (response.status === 400) {
      handleValidationError(errorData);
      return;
    }

    if (response.status === 409) {
      handleConflictError(errorData);
      return;
    }

    if (response.status === 404) {
      handleNotFoundError();
      return;
    }

    if (response.status === 401 || response.status === 403) {
      handleAuthError();
      return;
    }

    if (response.status >= 500) {
      handleServerError(errorData);
    } else {
      toast.error(errorData.message || "Wystąpił błąd. Spróbuj ponownie.");
    }
  };

  const scrollToFirstError = () => {
    const firstErrorElement = document.querySelector(
      '[aria-invalid="true"], [role="alert"]'
    );
    if (firstErrorElement) {
      firstErrorElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const handleSuccess = () => {
    toast.success(
      mode === "create"
        ? "Plan treningowy został utworzony."
        : "Plan treningowy został zaktualizowany."
    );

    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/workout-plans");
    }
  };

  const handleNetworkError = (error: unknown) => {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      toast.error(
        "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
      );
    } else if (error instanceof SyntaxError) {
      toast.error("Nieprawidłowa odpowiedź z serwera. Spróbuj ponownie.");
    } else {
      toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      scrollToFirstError();
      return;
    }

    setIsLoading(true);

    try {
      const url =
        mode === "create"
          ? "/api/workout-plans"
          : `/api/workout-plans/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const command =
        mode === "create"
          ? formStateToCreateCommand()
          : formStateToUpdateCommand();

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        await handleApiError(response);
        setIsLoading(false);
        return;
      }

      await response.json();
      handleSuccess();
    } catch (error) {
      handleNetworkError(error);
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
    handleAddExercise,
    handleRemoveExercise,
    handleUpdateExercise,
    handleMoveExercise,
    handleSubmit,
  };
}

/**
 * Parsuje błędy walidacji z odpowiedzi API i przypisuje je do odpowiednich pól formularza.
 */
function parseValidationErrors(errorData: {
  message?: string;
  code?: string;
  details?: string;
}): WorkoutPlanFormErrors {
  const errors: WorkoutPlanFormErrors = {};

  if (!errorData.message) {
    return errors;
  }

  const message = errorData.message;
  const details = errorData.details || "";

  // Jeśli message zawiera wiele błędów oddzielonych "; ", rozdziel je
  const errorMessages = message.split("; ").filter((msg) => msg.trim());

  // Mapowanie nazw pól z API na nazwy pól w formularzu
  const fieldMapping: Record<string, keyof WorkoutPlanFormState> = {
    name: "name",
    description: "description",
    part: "part",
  };

  for (const errorMsg of errorMessages) {
    let assigned = false;

    // Sprawdź czy błąd dotyczy konkretnego pola
    for (const [apiField, formField] of Object.entries(fieldMapping)) {
      if (errorMsg.toLowerCase().includes(apiField.toLowerCase())) {
        (errors as Record<string, string>)[formField] = errorMsg;
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
