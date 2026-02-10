"use client";

import { useEffect, useRef, useState } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormNumberInput } from "@/components/ui/form-number-input";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBeforeUnload } from "@/hooks/use-before-unload";
import { useExerciseForm } from "@/hooks/use-exercise-form";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";
import {
  calculateEstimatedSetTimeSeconds,
  getEstimatedSetTimeLabel,
} from "@/lib/exercises/estimated-set-time";
import type { ExerciseFormValues } from "@/lib/validation/exercise-form";
import type { ExerciseDTO } from "@/types";

const LEVEL_OPTIONS = [
  { value: "none", label: "None" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
] as const;

function createArrayCheckboxChangeHandler(
  field: { value: unknown; onChange: (value: string[]) => void },
  opt: string,
) {
  return (checked: boolean) => {
    const current = Array.isArray(field.value) ? field.value : [];
    if (checked) {
      field.onChange([...current, opt]);
    } else {
      field.onChange(current.filter((v) => v !== opt));
    }
  };
}

type ExerciseFormM3Props = {
  initialData?: ExerciseDTO;
  mode: "create" | "edit";
};

export function ExerciseFormM3({ initialData, mode }: ExerciseFormM3Props) {
  const router = useRouter();
  const {
    control,
    errors,
    formErrors,
    isLoading,
    hasUnsavedChanges,
    handleSubmit,
  } = useExerciseForm({
    initialData,
    mode,
    onSuccess: async () => {
      await (router.push("/exercises") as unknown as Promise<void>);
    },
  });

  useBeforeUnload(hasUnsavedChanges);

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      router.push("/exercises");
    }
  };
  const handleConfirmLeave = () => {
    setShowUnsavedDialog(false);
    router.push("/exercises");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
      data-test-id="exercise-form"
    >
      <ExerciseFormM3Fields
        control={control as Control<ExerciseFormValues>}
        errors={errors}
        disabled={isLoading}
      />

      {formErrors.length > 0 && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <ul className="flex-1 space-y-2 text-sm text-destructive">
              {formErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleCancelClick}
          data-test-id="exercise-form-cancel-button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto m3-cta"
          data-test-id="exercise-form-save-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

type ExerciseFormM3FieldsProps = {
  control: Control<ExerciseFormValues>;
  errors: FieldErrors<ExerciseFormValues>;
  disabled: boolean;
};

function ExerciseFormM3Fields({
  control,
  errors,
  disabled,
}: ExerciseFormM3FieldsProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const watched = useWatch({
    control,
    name: [
      "series",
      "reps",
      "duration_seconds",
      "rest_in_between_seconds",
      "rest_after_series_seconds",
      "is_unilateral",
    ],
  });
  const [
    series,
    reps,
    duration_seconds,
    rest_in_between_seconds,
    rest_after_series_seconds,
    is_unilateral,
  ] = watched;
  const estimatedResult = calculateEstimatedSetTimeSeconds({
    series: series ?? "",
    reps: reps ?? null,
    duration_seconds: duration_seconds ?? null,
    rest_in_between_seconds: rest_in_between_seconds ?? null,
    rest_after_series_seconds: rest_after_series_seconds ?? null,
    exercise_is_unilateral: is_unilateral ?? undefined,
  });

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <FormField
              label="Title"
              htmlFor="title"
              error={errors.title?.message as string | undefined}
              required
            >
              <Input
                ref={titleInputRef}
                id="title"
                type="text"
                data-test-id="exercise-form-title"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                disabled={disabled}
                aria-invalid={!!errors.title}
                className="w-full"
              />
            </FormField>
          )}
        />
        <Controller
          name="level"
          control={control}
          render={({ field }) => (
            <FormField
              label="Level"
              htmlFor="level"
              error={errors.level?.message as string | undefined}
              className="w-full md:min-w-[140px]"
            >
              <Select
                value={field.value || ""}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger
                  id="level"
                  aria-invalid={!!errors.level}
                  data-test-id="exercise-form-level"
                  className="w-full"
                >
                  <SelectValue placeholder="Select level (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Controller
          name="types"
          control={control}
          render={({ field }) => (
            <FormField
              label="Type"
              htmlFor="exercise-form-types"
              error={errors.types?.message as string | undefined}
              required
              className="w-full"
            >
              <fieldset
                className="flex flex-wrap gap-3 border-0 p-0"
                data-test-id="exercise-form-types"
              >
                <legend id="types-label" className="sr-only">
                  Select types (at least one)
                </legend>
                {exerciseTypeValues.map((opt) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={
                        Array.isArray(field.value) && field.value.includes(opt)
                      }
                      onCheckedChange={createArrayCheckboxChangeHandler(
                        field,
                        opt,
                      )}
                      disabled={disabled}
                      aria-invalid={!!errors.types}
                    />
                    {opt}
                  </label>
                ))}
              </fieldset>
            </FormField>
          )}
        />
        <Controller
          name="parts"
          control={control}
          render={({ field }) => (
            <FormField
              label="Part"
              htmlFor="exercise-form-parts"
              error={errors.parts?.message as string | undefined}
              required
              className="w-full"
            >
              <fieldset
                className="flex flex-wrap gap-3 border-0 p-0"
                data-test-id="exercise-form-parts"
              >
                <legend id="parts-label" className="sr-only">
                  Select parts (at least one)
                </legend>
                {exercisePartValues.map((opt) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={
                        Array.isArray(field.value) && field.value.includes(opt)
                      }
                      onCheckedChange={createArrayCheckboxChangeHandler(
                        field,
                        opt,
                      )}
                      disabled={disabled}
                      aria-invalid={!!errors.parts}
                    />
                    {opt}
                  </label>
                ))}
              </fieldset>
            </FormField>
          )}
        />
        <Controller
          name="is_unilateral"
          control={control}
          render={({ field }) => (
            <FormField
              label="Unilateral"
              htmlFor="is_unilateral"
              error={errors.is_unilateral?.message as string | undefined}
            >
              <div
                className="flex items-center gap-2"
                data-test-id="exercise-form-is-unilateral"
              >
                <Checkbox
                  id="is_unilateral"
                  checked={field.value ?? false}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  disabled={disabled}
                  aria-invalid={!!errors.is_unilateral}
                />
                <label
                  htmlFor="is_unilateral"
                  className="cursor-pointer text-sm font-medium"
                >
                  Left and right
                </label>
              </div>
            </FormField>
          )}
        />
        <Controller
          name="is_save_to_pr"
          control={control}
          render={({ field }) => (
            <FormField
              label="PR"
              htmlFor="is_save_to_pr"
              error={errors.is_save_to_pr?.message as string | undefined}
            >
              <div
                className="flex items-center gap-2"
                data-test-id="exercise-form-is-save-to-pr"
              >
                <Checkbox
                  id="is_save_to_pr"
                  checked={field.value ?? false}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  disabled={disabled}
                  aria-invalid={!!errors.is_save_to_pr}
                />
                <label
                  htmlFor="is_save_to_pr"
                  className="cursor-pointer text-sm font-medium"
                >
                  Save results to PRs
                </label>
              </div>
            </FormField>
          )}
        />
      </div>

      <Controller
        name="details"
        control={control}
        render={({ field }) => (
          <FormField
            label="Details"
            htmlFor="details"
            error={errors.details?.message as string | undefined}
          >
            <Textarea
              id="details"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              disabled={disabled}
              rows={4}
              aria-invalid={!!errors.details}
              data-test-id="exercise-form-details"
              className="w-full"
            />
          </FormField>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Controller
          name="reps"
          control={control}
          render={({ field }) => (
            <FormNumberInput
              id="reps"
              label={
                <>
                  Reps <span className="text-destructive">**</span>
                </>
              }
              value={String(field.value ?? "")}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.reps?.message as string | undefined}
              disabled={disabled}
              min={1}
              data-test-id="exercise-form-reps"
              className="w-full"
            />
          )}
        />
        <Controller
          name="duration_seconds"
          control={control}
          render={({ field }) => (
            <FormNumberInput
              id="duration_seconds"
              label={
                <>
                  Duration (sec) <span className="text-destructive">**</span>
                </>
              }
              value={String(field.value ?? "")}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.duration_seconds?.message as string | undefined}
              disabled={disabled}
              min={1}
              data-test-id="exercise-form-duration"
              className="w-full"
            />
          )}
        />
        <Controller
          name="series"
          control={control}
          render={({ field }) => (
            <FormNumberInput
              id="series"
              label="Series"
              value={String(field.value ?? "")}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.series?.message as string | undefined}
              disabled={disabled}
              min={1}
              required
              data-test-id="exercise-form-series"
              className="w-full"
            />
          )}
        />
      </div>
      <p className="m3-label text-muted-foreground">
        Provide exactly one: reps or duration{" "}
        <span className="text-destructive">**</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Controller
          name="rest_in_between_seconds"
          control={control}
          render={({ field }) => (
            <FormNumberInput
              id="rest_in_between_seconds"
              label={
                <>
                  Rest between sets (sec){" "}
                  <span className="text-destructive">***</span>
                </>
              }
              value={String(field.value ?? "")}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={
                errors.rest_in_between_seconds?.message as string | undefined
              }
              disabled={disabled}
              min={0}
              data-test-id="exercise-form-rest-between"
              className="w-full"
            />
          )}
        />
        <Controller
          name="rest_after_series_seconds"
          control={control}
          render={({ field }) => (
            <FormNumberInput
              id="rest_after_series_seconds"
              label={
                <>
                  Rest after series (sec){" "}
                  <span className="text-destructive">***</span>
                </>
              }
              value={String(field.value ?? "")}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={
                errors.rest_after_series_seconds?.message as string | undefined
              }
              disabled={disabled}
              min={0}
              data-test-id="exercise-form-rest-after"
              className="w-full"
            />
          )}
        />
        <Controller
          name="estimated_set_time_seconds"
          control={control}
          render={({ field }) => (
            <FormNumberInput
              id="estimated_set_time_seconds"
              label={getEstimatedSetTimeLabel(estimatedResult, "sec")}
              value={String(field.value ?? "")}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={
                errors.estimated_set_time_seconds?.message as string | undefined
              }
              disabled={disabled}
              min={1}
              data-test-id="exercise-form-estimated-set-time"
              className="w-full"
            />
          )}
        />
      </div>
      <p className="m3-label text-muted-foreground">
        Provide at least one rest field{" "}
        <span className="text-destructive">***</span>
      </p>
    </div>
  );
}
