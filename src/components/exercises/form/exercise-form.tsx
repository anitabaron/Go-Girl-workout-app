"use client";

import { useRouter } from "next/navigation";
import { useExerciseForm } from "@/hooks/use-exercise-form";
import { useBeforeUnload } from "@/hooks/use-before-unload";
import { ExerciseFormFields } from "./exercise-form-fields";
import { ValidationErrors } from "./validation-errors";
import { SaveButton } from "./save-button";
import { CancelButton } from "./cancel-button";
import type { ExerciseDTO } from "@/types";

type ExerciseFormProps = {
  initialData?: ExerciseDTO;
  mode: "create" | "edit";
};

export function ExerciseForm({
  initialData,
  mode,
}: Readonly<ExerciseFormProps>) {
  const router = useRouter();
  const {
    fields,
    errors,
    isLoading,
    hasUnsavedChanges,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useExerciseForm({
    initialData,
    mode,
    onSuccess: async () => {
      // Przekierowanie do listy ćwiczeń po udanym zapisie
      // Next.js router.push returns a Promise in App Router
      await (router.push("/exercises") as unknown as Promise<void>);
    },
  });

  useBeforeUnload(hasUnsavedChanges);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
      data-test-id="exercise-form"
    >
      <ExerciseFormFields
        fields={fields}
        errors={errors}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={isLoading}
      />

      {errors._form && errors._form.length > 0 && (
        <ValidationErrors errors={errors._form} />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
        <CancelButton hasUnsavedChanges={hasUnsavedChanges} />
        <SaveButton isLoading={isLoading} disabled={isLoading} />
      </div>
    </form>
  );
}
