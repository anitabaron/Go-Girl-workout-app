"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

  // Automatyczne ustawienie focus na pierwsze pole przy załadowaniu
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Tytuł <span className="text-destructive">*</span>
        </label>
        <Input
          ref={titleInputRef}
          id="title"
          type="text"
          value={fields.title}
          onChange={(e) => onChange("title", e.target.value)}
          onBlur={() => onBlur("title")}
          disabled={disabled}
          aria-invalid={errors.title ? "true" : "false"}
          aria-describedby={errors.title ? "title-error" : undefined}
          data-test-id="exercise-form-title"
        />
        {errors.title && (
          <p id="title-error" className="text-sm text-destructive" role="alert">
            {errors.title}
          </p>
        )}
      </div>
      <div className="sm:flex gap-2 justify-between items-center">
        {/* Type */}
        <div className="space-y-2 w-full">
          <label htmlFor="type" className="text-sm font-medium">
            Typ
          </label>
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
          {errors.type && (
            <p
              id="type-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.type}
            </p>
          )}
        </div>
        {/* Part */}
        <div className="space-y-2 w-full">
          <label htmlFor="part" className="text-sm font-medium">
            Partia
          </label>
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
          {errors.part && (
            <p
              id="part-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.part}
            </p>
          )}
        </div>
        {/* Level */}
        <div className="space-y-2 w-full">
          <label htmlFor="level" className="text-sm font-medium">
            Poziom
          </label>
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
          {errors.level && (
            <p
              id="level-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.level}
            </p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <label htmlFor="details" className="text-sm font-medium">
          Szczegóły
        </label>
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
        {errors.details && (
          <p
            id="details-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.details}
          </p>
        )}
      </div>
      <div className="flex gap-2 justify-between items-center ">
        {/* Reps */}
        <div className="space-y-2 w-full">
          <label htmlFor="reps" className="text-sm font-medium">
            Powtórzenia
          </label>
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
          {errors.reps && (
            <p
              id="reps-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.reps}
            </p>
          )}
        </div>
        <p className="text-sm font-medium mt-7 ">lub</p>
        {/* Duration */}
        <div className="space-y-2 w-full">
          <label htmlFor="duration_seconds" className="text-sm font-medium">
            Czas (sek)
          </label>
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
          {errors.duration_seconds && (
            <p
              id="duration_seconds-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.duration_seconds}
            </p>
          )}
        </div>

        {/* Series */}
        <div className="space-y-2">
          <label htmlFor="series" className="text-sm font-medium">
            Serie <span className="text-destructive">*</span>
          </label>
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
          {errors.series && (
            <p
              id="series-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.series}
            </p>
          )}
        </div>
      </div>
      <div className="sm:flex gap-2 justify-between items-center">
        {/* Rest in between */}
        <div className="space-y-2 w-full">
          <label
            htmlFor="rest_in_between_seconds"
            className="text-sm font-medium"
          >
            Odpoczynek między seriami (sekundy)
          </label>
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
          {errors.rest_in_between_seconds && (
            <p
              id="rest_in_between_seconds-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.rest_in_between_seconds}
            </p>
          )}
        </div>

        {/* Rest after series */}
        <div className="space-y-2 w-full">
          <label
            htmlFor="rest_after_series_seconds"
            className="text-sm font-medium"
          >
            Odpoczynek po seriach (sekundy)
          </label>
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
          {errors.rest_after_series_seconds && (
            <p
              id="rest_after_series_seconds-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.rest_after_series_seconds}
            </p>
          )}
        </div>
      </div>

      {/* Estimated set time */}
      <div className="space-y-2">
        <label
          htmlFor="estimated_set_time_seconds"
          className="text-sm font-medium"
        >
          Szacunkowy czas zestawu (sekundy)
        </label>
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
        {errors.estimated_set_time_seconds && (
          <p
            id="estimated_set_time_seconds-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.estimated_set_time_seconds}
          </p>
        )}
      </div>
    </div>
  );
}
