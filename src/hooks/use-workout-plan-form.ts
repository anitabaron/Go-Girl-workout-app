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
import { useFormErrorHandlers } from "./use-form-error-handlers";
import { useBeforeUnload } from "./use-before-unload";

type UseWorkoutPlanFormProps = {
  initialData?: Parameters<typeof dtoToFormState>[0];
  mode: "create" | "edit";
  onSuccess?: () => void;
  /** Redirect when plan not found (default: /workout-plans) */
  notFoundRedirect?: string;
  /** Redirect after successful submit when onSuccess not provided (default: /workout-plans) */
  successRedirect?: string;
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
      exercise_is_unilateral: ex.exercise_is_unilateral,
      section_type: ex.section_type,
      section_order: ex.section_order,
      scope_id: ex.scope_id ?? undefined,
      in_scope_nr: ex.in_scope_nr ?? undefined,
      scope_repeat_count: ex.scope_repeat_count ?? undefined,
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
  notFoundRedirect = "/workout-plans",
  successRedirect = "/workout-plans",
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

  const { handleBadRequest, handleConflict, handleNotFound, handleAuth } =
    useFormErrorHandlers<WorkoutPlanFormValues>({
      setError,
      fieldMapping: { name: "name", description: "description", part: "part" },
      conflictMessage: "Duplikat pozycji w sekcji planu treningowego.",
      notFoundRedirect,
      authRedirect: "/",
    });

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
          exercise_is_unilateral: exercise.is_unilateral,
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

  const handleAddScope = (
    exercises: ExerciseDTO[],
    sectionType: ExerciseDTO["type"],
    repeatCount: number,
  ) => {
    if (exercises.length === 0 || repeatCount < 1) return;

    const currentExercises = watch("exercises");
    const exercisesInSection = currentExercises.filter(
      (e) => e.section_type === sectionType,
    );
    const nextSlotOrder =
      exercisesInSection.length > 0
        ? Math.max(...exercisesInSection.map((e) => e.section_order)) + 1
        : 1;

    const scopeId = crypto.randomUUID();
    const toAppend = exercises.map((ex, i) => ({
      exercise_id: ex.id,
      exercise_title: ex.title,
      exercise_type: ex.type,
      exercise_part: ex.part,
      exercise_is_unilateral: ex.is_unilateral,
      section_type: sectionType,
      section_order: nextSlotOrder,
      scope_id: scopeId,
      in_scope_nr: i + 1,
      scope_repeat_count: repeatCount,
      planned_sets: ex.series ?? null,
      planned_reps: ex.reps ?? null,
      planned_duration_seconds: ex.duration_seconds ?? null,
      planned_rest_seconds: ex.rest_in_between_seconds ?? null,
      planned_rest_after_series_seconds: ex.rest_after_series_seconds ?? null,
      estimated_set_time_seconds: ex.estimated_set_time_seconds ?? null,
    }));

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

    const sectionType = currentExercise.section_type;

    const slotKeys = new Map<
      string,
      { indices: number[]; sectionOrder: number }
    >();
    const withIndex = currentExercises
      .map((ex, i) => ({ exercise: ex, originalIndex: i }))
      .filter(({ exercise }) => exercise.section_type === sectionType)
      .sort((a, b) => {
        if (a.exercise.section_order !== b.exercise.section_order) {
          return a.exercise.section_order - b.exercise.section_order;
        }
        const aNr = a.exercise.in_scope_nr ?? 0;
        const bNr = b.exercise.in_scope_nr ?? 0;
        return aNr - bNr;
      });

    for (const { exercise, originalIndex } of withIndex) {
      const scopeId =
        exercise.in_scope_nr != null && exercise.scope_id != null
          ? exercise.scope_id
          : `single-${originalIndex}`;
      const key = `${exercise.section_order}:${scopeId}`;
      if (!slotKeys.has(key)) {
        slotKeys.set(key, {
          indices: [],
          sectionOrder: exercise.section_order,
        });
      }
      slotKeys.get(key)!.indices.push(originalIndex);
    }

    const slotsInOrder = [...slotKeys.entries()].sort(
      (a, b) => a[1].sectionOrder - b[1].sectionOrder,
    );
    const currentSlotIndex = slotsInOrder.findIndex(([, data]) =>
      data.indices.includes(index),
    );
    if (currentSlotIndex === -1) return;
    if (direction === "up" && currentSlotIndex === 0) return;
    if (direction === "down" && currentSlotIndex === slotsInOrder.length - 1) {
      return;
    }

    const swapIndex =
      direction === "up" ? currentSlotIndex - 1 : currentSlotIndex + 1;
    const currentSlot = slotsInOrder[currentSlotIndex][1];
    const swapSlot = slotsInOrder[swapIndex][1];
    const newOrderCurrent = swapSlot.sectionOrder;
    const newOrderSwap = currentSlot.sectionOrder;

    const newExercises = currentExercises.map((ex, i) => {
      if (currentSlot.indices.includes(i)) {
        return { ...ex, section_order: newOrderCurrent };
      }
      if (swapSlot.indices.includes(i)) {
        return { ...ex, section_order: newOrderSwap };
      }
      return ex;
    });
    setValue("exercises", newExercises, { shouldDirty: true });
  };

  const handleUpdateScopeSectionOrder = (
    indices: number[],
    sectionOrder: number,
  ) => {
    if (indices.length === 0 || sectionOrder < 1) return;
    const currentExercises = watch("exercises");
    const next = currentExercises.map((ex, i) =>
      indices.includes(i) ? { ...ex, section_order: sectionOrder } : ex,
    );
    setValue("exercises", next, { shouldDirty: true });
  };

  const handleMoveWithinScope = (index: number, direction: "up" | "down") => {
    const currentExercises = watch("exercises");
    const current = currentExercises[index];
    if (!current || current.scope_id == null || current.in_scope_nr == null) {
      return;
    }
    const scopeId = current.scope_id;
    const inScope = currentExercises
      .map((ex, i) => ({ exercise: ex, index: i }))
      .filter(
        ({ exercise }) =>
          exercise.scope_id === scopeId && exercise.in_scope_nr != null,
      )
      .sort(
        (a, b) => (a.exercise.in_scope_nr ?? 0) - (b.exercise.in_scope_nr ?? 0),
      );
    const pos = inScope.findIndex(({ index: i }) => i === index);
    if (pos === -1) return;
    if (direction === "up" && pos === 0) return;
    if (direction === "down" && pos === inScope.length - 1) return;
    const swapPos = direction === "up" ? pos - 1 : pos + 1;
    const currentNr = inScope[pos].exercise.in_scope_nr ?? 0;
    const swapNr = inScope[swapPos].exercise.in_scope_nr ?? 0;
    const next = currentExercises.map((ex, i) => {
      if (i === inScope[pos].index) {
        return { ...ex, in_scope_nr: swapNr };
      }
      if (i === inScope[swapPos].index) {
        return { ...ex, in_scope_nr: currentNr };
      }
      return ex;
    });
    setValue("exercises", next, { shouldDirty: true });
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

  const handleSubmitError = (result: {
    success: false;
    error: string;
    code?: string;
    details?: string;
  }) => {
    if (result.code === "BAD_REQUEST") {
      handleBadRequest({
        message: result.error,
        details: result.details,
      });
      return;
    }
    if (result.code === "CONFLICT") {
      handleConflict({ message: result.error });
      return;
    }
    if (result.error.includes("nie został znaleziony")) {
      handleNotFound();
      return;
    }
    if (
      result.error.includes("autoryzacji") ||
      result.error.includes("Zaloguj")
    ) {
      handleAuth();
      return;
    }
    toast.error(result.error);
  };

  const handleSubmitSuccess = async () => {
    toast.success(
      mode === "create"
        ? "Plan treningowy został utworzony."
        : "Plan treningowy został zaktualizowany.",
    );
    if (onSuccess) {
      onSuccess();
      return;
    }
    try {
      await (router.push(successRedirect) as unknown as Promise<void>);
    } catch (error) {
      console.error("Navigation error:", error);
      if (typeof globalThis !== "undefined" && globalThis.location) {
        globalThis.location.href = successRedirect;
      }
    }
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
      handleSubmitError(result);
      return;
    }

    await handleSubmitSuccess();
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
    handleAddScope,
    handleRemoveExercise,
    handleUpdateExercise,
    handleMoveExercise,
    handleUpdateScopeSectionOrder,
    handleMoveWithinScope,
    handleSubmit,
  };
}
