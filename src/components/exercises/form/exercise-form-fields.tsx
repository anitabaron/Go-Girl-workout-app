"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";
import type {
  ExerciseFormState,
  ExerciseFormErrors,
} from "@/hooks/use-exercise-form";

type ExerciseFormFieldsProps = {
  fields: ExerciseFormState;
  errors: ExerciseFormErrors;
  onChange: (field: keyof ExerciseFormState, value: string) => void;
  onBlur: (field: keyof ExerciseFormState) => void;
  disabled: boolean;
};

export function ExerciseFormFields({
  fields,
  errors,
  onChange,
  onBlur,
  disabled,
}: Readonly<ExerciseFormFieldsProps>) {
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  return (
    <div className="space-y-4">
      <FormField label="Tytuł" htmlFor="title" error={errors.title} required>
        <Input
          ref={titleInputRef}
          id="title"
          type="text"
          data-test-id="exercise-form-title"
          value={fields.title}
          onChange={(e) => onChange("title", e.target.value)}
          onBlur={() => onBlur("title")}
          disabled={disabled}
          aria-invalid={errors.title ? "true" : "false"}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
      </FormField>

      <div className="sm:flex gap-2 justify-between items-center">
        <FormField
          label="Typ"
          htmlFor="type"
          error={errors.type}
          className="w-full"
        >
          <Select
            value={fields.type}
            onValueChange={(value) => onChange("type", value)}
            disabled={disabled}
          >
            <SelectTrigger
              id="type"
              aria-invalid={errors.type ? "true" : "false"}
              aria-describedby={errors.type ? "type-error" : undefined}
              data-test-id="exercise-form-type"
            >
              <SelectValue placeholder="Wybierz typ" />
            </SelectTrigger>
            <SelectContent>
              {exerciseTypeValues.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Partia"
          htmlFor="part"
          error={errors.part}
          className="w-full"
        >
          <Select
            value={fields.part}
            onValueChange={(value) => onChange("part", value)}
            disabled={disabled}
          >
            <SelectTrigger
              id="part"
              aria-invalid={errors.part ? "true" : "false"}
              aria-describedby={errors.part ? "part-error" : undefined}
              data-test-id="exercise-form-part"
            >
              <SelectValue placeholder="Wybierz partię" />
            </SelectTrigger>
            <SelectContent>
              {exercisePartValues.map((part) => (
                <SelectItem key={part} value={part}>
                  {part}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Poziom"
          htmlFor="level"
          error={errors.level}
          className="w-full"
        >
          <Select
            value={fields.level || ""}
            onValueChange={(value) =>
              onChange("level", value === "none" ? "" : value)
            }
            disabled={disabled}
          >
            <SelectTrigger
              id="level"
              aria-invalid={errors.level ? "true" : "false"}
              aria-describedby={errors.level ? "level-error" : undefined}
              data-test-id="exercise-form-level"
            >
              <SelectValue placeholder="Wybierz poziom (opcjonalnie)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Brak</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="Szczegóły" htmlFor="details" error={errors.details}>
        <Textarea
          id="details"
          value={fields.details}
          onChange={(e) => onChange("details", e.target.value)}
          onBlur={() => onBlur("details")}
          disabled={disabled}
          rows={4}
          aria-invalid={errors.details ? "true" : "false"}
          aria-describedby={errors.details ? "details-error" : undefined}
          data-test-id="exercise-form-details"
        />
      </FormField>

      <div className="flex gap-2 justify-between items-center">
        <FormField
          label="Powtórzenia"
          htmlFor="reps"
          error={errors.reps}
          className="w-full"
        >
          <Input
            id="reps"
            type="number"
            min="1"
            value={fields.reps}
            onChange={(e) => onChange("reps", e.target.value)}
            onBlur={() => onBlur("reps")}
            disabled={disabled}
            aria-invalid={errors.reps ? "true" : "false"}
            aria-describedby={errors.reps ? "reps-error" : undefined}
            data-test-id="exercise-form-reps"
          />
        </FormField>
        <p className="text-sm font-medium mt-7">lub</p>
        <FormField
          label="Czas (sek)"
          htmlFor="duration_seconds"
          error={errors.duration_seconds}
          className="w-full"
        >
          <Input
            id="duration_seconds"
            type="number"
            min="1"
            value={fields.duration_seconds}
            onChange={(e) => onChange("duration_seconds", e.target.value)}
            onBlur={() => onBlur("duration_seconds")}
            disabled={disabled}
            aria-invalid={errors.duration_seconds ? "true" : "false"}
            aria-describedby={
              errors.duration_seconds ? "duration_seconds-error" : undefined
            }
            data-test-id="exercise-form-duration"
          />
        </FormField>
        <FormField
          label="Serie"
          htmlFor="series"
          error={errors.series}
          required
        >
          <Input
            id="series"
            type="number"
            min="1"
            value={fields.series}
            onChange={(e) => onChange("series", e.target.value)}
            onBlur={() => onBlur("series")}
            disabled={disabled}
            aria-invalid={errors.series ? "true" : "false"}
            aria-describedby={errors.series ? "series-error" : undefined}
            data-test-id="exercise-form-series"
          />
        </FormField>
      </div>

      <div className="sm:flex gap-2 justify-between items-center">
        <FormField
          label="Odpoczynek między seriami (sekundy)"
          htmlFor="rest_in_between_seconds"
          error={errors.rest_in_between_seconds}
          className="w-full"
        >
          <Input
            id="rest_in_between_seconds"
            type="number"
            min="0"
            value={fields.rest_in_between_seconds}
            onChange={(e) =>
              onChange("rest_in_between_seconds", e.target.value)
            }
            onBlur={() => onBlur("rest_in_between_seconds")}
            disabled={disabled}
            aria-invalid={errors.rest_in_between_seconds ? "true" : "false"}
            aria-describedby={
              errors.rest_in_between_seconds
                ? "rest_in_between_seconds-error"
                : undefined
            }
            data-test-id="exercise-form-rest-between"
          />
        </FormField>
        <FormField
          label="Odpoczynek po seriach (sekundy)"
          htmlFor="rest_after_series_seconds"
          error={errors.rest_after_series_seconds}
          className="w-full"
        >
          <Input
            id="rest_after_series_seconds"
            type="number"
            min="0"
            value={fields.rest_after_series_seconds}
            onChange={(e) =>
              onChange("rest_after_series_seconds", e.target.value)
            }
            onBlur={() => onBlur("rest_after_series_seconds")}
            disabled={disabled}
            aria-invalid={errors.rest_after_series_seconds ? "true" : "false"}
            aria-describedby={
              errors.rest_after_series_seconds
                ? "rest_after_series_seconds-error"
                : undefined
            }
            data-test-id="exercise-form-rest-after"
          />
        </FormField>
      </div>

      <FormField
        label="Szacunkowy czas zestawu (sekundy)"
        htmlFor="estimated_set_time_seconds"
        error={errors.estimated_set_time_seconds}
      >
        <Input
          id="estimated_set_time_seconds"
          type="number"
          min="1"
          value={fields.estimated_set_time_seconds}
          onChange={(e) =>
            onChange("estimated_set_time_seconds", e.target.value)
          }
          onBlur={() => onBlur("estimated_set_time_seconds")}
          disabled={disabled}
          aria-invalid={errors.estimated_set_time_seconds ? "true" : "false"}
          aria-describedby={
            errors.estimated_set_time_seconds
              ? "estimated_set_time_seconds-error"
              : undefined
          }
          data-test-id="exercise-form-estimated-set-time"
        />
      </FormField>
    </div>
  );
}
