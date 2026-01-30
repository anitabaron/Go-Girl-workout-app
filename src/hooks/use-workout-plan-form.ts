"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Resolver } from "react-hook-form";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createWorkoutPlan,
  updateWorkoutPlan,
} from "@/app/actions/workout-plans";
import type { ExerciseDTO } from "@/types";
import type {
  WorkoutPlanFormErrors,
  WorkoutPlanExerciseItemState,
} from "@/types/workout-plan-form";
import { dtoToFormState } from "@/types/workout-plan-form";
import {
  workoutPlanFormSchema,
  formValuesToCreateCommand,
  formValuesToUpdateCommand,
  type WorkoutPlanFormValues,
} from "@/lib/validation/workout-plan-form";
import { useBeforeUnload } from "./use-before-unload";

type UseWorkoutPlanFormProps = {
  initialData?: Parameters<typeof dtoToFormState>[0];
  mode: "create" | "edit";
  onSuccess?: () => void;
};

function formStateToFormValues(
  state: ReturnType<typeof dtoToFormState>,
): WorkoutPlanFormValues {
  return {
    name: state.name,
    description: state.description,
    part: state.part,
    exercises: state.exercises.map((ex) => ({
      id: ex.id,
      exercise_id: ex.exercise_id,
      exercise_title: ex.exercise_title,
      exercise_type: ex.exercise_type,
      exercise_part: ex.exercise_part,
      section_type: ex.section_type,
      section_order: ex.section_order,
      planned_sets: ex.planned_sets,
      planned_reps: ex.planned_reps,
      planned_duration_seconds: ex.planned_duration_seconds,
      planned_rest_seconds: ex.planned_rest_seconds,
      planned_rest_after_series_seconds: ex.planned_rest_after_series_seconds,
      estimated_set_time_seconds: ex.estimated_set_time_seconds,
    })),
  };
}

function rhfErrorsToFormErrors(
  errors: Record<string, unknown>,
): WorkoutPlanFormErrors {
  const result: WorkoutPlanFormErrors = {};

  const getMessage = (val: unknown): string | undefined =>
    val &&
    typeof val === "object" &&
    "message" in val &&
    typeof (val as { message: unknown }).message === "string"
      ? (val as { message: string }).message
      : undefined;

  const nameMsg = getMessage(errors.name);
  if (nameMsg) result.name = nameMsg;

  const descMsg = getMessage(errors.description);
  if (descMsg) result.description = descMsg;

  const partMsg = getMessage(errors.part);
  if (partMsg) result.part = partMsg;

  const exerciseErrors = errors.exercises;
  if (exerciseErrors && Array.isArray(exerciseErrors)) {
    const mapped: Record<string, string> = {};
    exerciseErrors.forEach((ex, index) => {
      if (ex && typeof ex === "object") {
        const exObj = ex as Record<string, unknown>;
        for (const [key, val] of Object.entries(exObj)) {
          const msg = getMessage(val);
          if (msg) mapped[`exercise_${index}.${key}`] = msg;
        }
      }
    });
    if (Object.keys(mapped).length > 0) result.exercises = mapped;
  }

  return result;
}

export function useWorkoutPlanForm({
  initialData,
  mode,
  onSuccess,
}: UseWorkoutPlanFormProps) {
  const router = useRouter();
  const defaultValues = formStateToFormValues(dtoToFormState(initialData));

  const form = useForm<WorkoutPlanFormValues>({
    resolver: zodResolver(
      workoutPlanFormSchema,
    ) as unknown as Resolver<WorkoutPlanFormValues>,
    defaultValues,
  });

  const { append, remove, update } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const {
    formState,
    setError,
    setValue,
    watch,
    reset,
    handleSubmit: rhfHandleSubmit,
  } = form;
  const { errors, isSubmitting, isDirty } = formState;

  useEffect(() => {
    reset(formStateToFormValues(dtoToFormState(initialData)));
  }, [initialData, reset]);

  useBeforeUnload(isDirty);

  const fieldsState = watch();
  const formErrors: WorkoutPlanFormErrors = rhfErrorsToFormErrors(
    errors as Record<string, unknown>,
  );

  const rootMsg =
    errors.root && typeof errors.root === "object" && "message" in errors.root
      ? (errors.root as { message: string }).message
      : undefined;
  if (rootMsg) {
    formErrors._form = [...(formErrors._form ?? []), rootMsg];
  }

  const handleChange = (field: string, value: unknown) => {
    if (field === "name" || field === "description" || field === "part") {
      setValue(field, value as never, { shouldDirty: true });
    }
  };

  const handleBlur = (field: string) => {
    form.trigger(field as keyof WorkoutPlanFormValues);
  };

  const handleAddExercise = (exercises: ExerciseDTO | ExerciseDTO[]) => {
    const exercisesArray = Array.isArray(exercises) ? exercises : [exercises];
    if (exercisesArray.length === 0) return;

    const exercisesBySection = new Map<ExerciseDTO["type"], ExerciseDTO[]>();
    exercisesArray.forEach((ex) => {
      const sectionType = ex.type;
      if (!exercisesBySection.has(sectionType)) {
        exercisesBySection.set(sectionType, []);
      }
      exercisesBySection.get(sectionType)!.push(ex);
    });

    const currentExercises = watch("exercises");
    const toAppend: Parameters<typeof append>[0][] = [];

    exercisesBySection.forEach((sectionExercises, sectionType) => {
      const exercisesInSection = currentExercises.filter(
        (e) => e.section_type === sectionType,
      );
      let nextOrder =
        exercisesInSection.length > 0
          ? Math.max(...exercisesInSection.map((e) => e.section_order)) + 1
          : 1;

      sectionExercises.forEach((exercise) => {
        toAppend.push({
          exercise_id: exercise.id,
          exercise_title: exercise.title,
          exercise_type: exercise.type,
          exercise_part: exercise.part,
          section_type: sectionType,
          section_order: nextOrder,
          planned_sets: exercise.series ?? null,
          planned_reps: exercise.reps ?? null,
          planned_duration_seconds: exercise.duration_seconds ?? null,
          planned_rest_seconds: exercise.rest_in_between_seconds ?? null,
          planned_rest_after_series_seconds:
            exercise.rest_after_series_seconds ?? null,
          estimated_set_time_seconds:
            exercise.estimated_set_time_seconds ?? null,
        });
        nextOrder += 1;
      });
    });

    toAppend.forEach((item) => append(item));
  };

  const handleRemoveExercise = (index: number) => {
    remove(index);
  };

  const handleUpdateExercise = (
    index: number,
    updates: Partial<WorkoutPlanExerciseItemState>,
  ) => {
    const currentExercises = watch("exercises");
    const currentExercise = currentExercises[index];
    if (!currentExercise) return;

    const finalUpdates = { ...updates };
    if (
      updates.section_type &&
      updates.section_type !== currentExercise.section_type
    ) {
      const exercisesInNewSection = currentExercises.filter(
        (ex, i) => i !== index && ex.section_type === updates.section_type,
      );
      const nextOrder =
        exercisesInNewSection.length > 0
          ? Math.max(...exercisesInNewSection.map((e) => e.section_order)) + 1
          : 1;
      finalUpdates.section_order = nextOrder;
    }

    if (
      updates.section_order !== undefined &&
      (!updates.section_type ||
        updates.section_type === currentExercise.section_type)
    ) {
      const targetSection =
        updates.section_type || currentExercise.section_type;
      const exercisesInSection = currentExercises.filter(
        (ex, i) => i !== index && ex.section_type === targetSection,
      );
      const orderExists = exercisesInSection.some(
        (ex) => ex.section_order === updates.section_order,
      );
      if (orderExists) {
        const maxOrder =
          exercisesInSection.length > 0
            ? Math.max(...exercisesInSection.map((e) => e.section_order))
            : 0;
        finalUpdates.section_order = maxOrder + 1;
      }
    }

    update(index, { ...currentExercise, ...finalUpdates });
  };

  const handleMoveExercise = (index: number, direction: "up" | "down") => {
    const currentExercises = watch("exercises");
    const currentExercise = currentExercises[index];
    if (!currentExercise) return;

    const exercisesInSection = currentExercises
      .map((ex, i) => ({ exercise: ex, originalIndex: i }))
      .filter(
        ({ exercise }) =>
          exercise.section_type === currentExercise.section_type,
      )
      .sort((a, b) => a.exercise.section_order - b.exercise.section_order);

    const currentPosition = exercisesInSection.findIndex(
      ({ originalIndex }) => originalIndex === index,
    );
    if (currentPosition === -1) return;
    if (direction === "up" && currentPosition === 0) return;
    if (
      direction === "down" &&
      currentPosition === exercisesInSection.length - 1
    )
      return;

    const newPosition =
      direction === "up" ? currentPosition - 1 : currentPosition + 1;
    const reorderedSection = [...exercisesInSection];
    const [movedItem] = reorderedSection.splice(currentPosition, 1);
    reorderedSection.splice(newPosition, 0, movedItem);

    const newExercises = [...currentExercises];
    reorderedSection.forEach(({ originalIndex }, orderIndex) => {
      newExercises[originalIndex] = {
        ...newExercises[originalIndex],
        section_order: orderIndex + 1,
      };
    });
    setValue("exercises", newExercises, { shouldDirty: true });
  };

  const scrollToFirstError = () => {
    const firstErrorElement = document.querySelector(
      '[aria-invalid="true"], [role="alert"]',
    );
    firstErrorElement?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handleValidationError = (errorData: {
    message?: string;
    details?: string;
  }) => {
    const message = errorData.message ?? "";
    const details = errorData.details ?? "";
    const errorMessages = message.split("; ").filter((m) => m.trim());
    if (details && !errorMessages.some((m) => details.includes(m))) {
      errorMessages.push(details);
    }

    const fieldMapping: Record<string, keyof WorkoutPlanFormValues> = {
      name: "name",
      description: "description",
      part: "part",
    };

    const formLevelErrors: string[] = [];
    for (const errorMsg of errorMessages) {
      let assigned = false;
      for (const [apiField, formField] of Object.entries(fieldMapping)) {
        if (errorMsg.toLowerCase().includes(apiField.toLowerCase())) {
          setError(formField, { message: errorMsg });
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        formLevelErrors.push(errorMsg);
      }
    }
    if (formLevelErrors.length > 0) {
      setError("root", { message: formLevelErrors.join("; ") });
    }
    toast.error("Popraw błędy w formularzu.");
  };

  const handleConflictError = (errorData: { message?: string }) => {
    setError("root", {
      message:
        errorData.message || "Duplikat pozycji w sekcji planu treningowego.",
    });
    toast.error(
      errorData.message || "Duplikat pozycji w sekcji planu treningowego.",
    );
  };

  const handleNotFoundError = () => {
    toast.error("Plan treningowy nie został znaleziony.");
    setTimeout(() => router.push("/workout-plans"), 1500);
  };

  const handleAuthError = () => {
    toast.error("Brak autoryzacji. Zaloguj się ponownie.");
    setTimeout(() => router.push("/"), 1500);
  };

  const onSubmit = async (data: WorkoutPlanFormValues) => {
    const result =
      mode === "create"
        ? await createWorkoutPlan(formValuesToCreateCommand(data))
        : await updateWorkoutPlan(
            initialData?.id ?? "",
            formValuesToUpdateCommand(data),
          );

    if (!result.success) {
      if (result.code === "BAD_REQUEST") {
        handleValidationError({
          message: result.error,
          details: result.details,
        });
      } else if (result.code === "CONFLICT") {
        handleConflictError({ message: result.error });
      } else if (result.error.includes("nie został znaleziony")) {
        handleNotFoundError();
      } else if (
        result.error.includes("autoryzacji") ||
        result.error.includes("Zaloguj")
      ) {
        handleAuthError();
      } else {
        toast.error(result.error);
      }
      return;
    }

    toast.success(
      mode === "create"
        ? "Plan treningowy został utworzony."
        : "Plan treningowy został zaktualizowany.",
    );

    if (onSuccess) {
      onSuccess();
    } else {
      try {
        await (router.push("/workout-plans") as unknown as Promise<void>);
      } catch (error) {
        console.error("Navigation error:", error);
        if (typeof globalThis !== "undefined" && globalThis.location) {
          globalThis.location.href = "/workout-plans";
        }
      }
    }
  };

  const handleSubmit = rhfHandleSubmit(onSubmit, () => scrollToFirstError());

  const fieldsForComponents = {
    name: fieldsState.name ?? "",
    description: fieldsState.description ?? null,
    part: fieldsState.part ?? null,
    exercises: (fieldsState.exercises ?? []) as WorkoutPlanExerciseItemState[],
  };

  return {
    fields: fieldsForComponents,
    errors: formErrors,
    isLoading: isSubmitting,
    hasUnsavedChanges: isDirty,
    handleChange,
    handleBlur,
    handleAddExercise,
    handleRemoveExercise,
    handleUpdateExercise,
    handleMoveExercise,
    handleSubmit,
  };
}
