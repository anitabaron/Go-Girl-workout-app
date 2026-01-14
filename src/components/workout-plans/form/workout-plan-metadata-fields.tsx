"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exercisePartValues } from "@/lib/validation/exercises";
import type { WorkoutPlanMetadataFieldsProps } from "@/types/workout-plan-form";
import { useId } from "react";

export function WorkoutPlanMetadataFields({
  fields,
  errors,
  onChange,
  onBlur,
  disabled,
}: WorkoutPlanMetadataFieldsProps) {
  const nameId = useId();
  const descriptionId = useId();
  const partId = useId();
  const nameErrorId = useId();
  const descriptionErrorId = useId();
  const partErrorId = useId();

  return (
    <div className="space-y-4">
      {/* Name field */}
      <div>
        <label
          htmlFor={nameId}
          className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Nazwa planu <span className="text-destructive">*</span>
        </label>
        <Input
          id={nameId}
          value={fields.name}
          onChange={(e) => onChange("name", e.target.value)}
          onBlur={() => onBlur("name")}
          disabled={disabled}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? nameErrorId : undefined}
          placeholder="np. Trening siłowy - górna część ciała"
          className="mt-2"
        />
        {errors.name && (
          <p
            id={nameErrorId}
            className="mt-1 text-sm text-destructive"
            role="alert"
          >
            {errors.name}
          </p>
        )}
      </div>

      {/* Description field */}
      <div>
        <label
          htmlFor={descriptionId}
          className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Opis (opcjonalny)
        </label>
        <Textarea
          id={descriptionId}
          value={fields.description ?? ""}
          onChange={(e) =>
            onChange("description", e.target.value || null)
          }
          onBlur={() => onBlur("description")}
          disabled={disabled}
          aria-invalid={errors.description ? "true" : "false"}
          aria-describedby={errors.description ? descriptionErrorId : undefined}
          placeholder="Dodatkowe informacje o planie treningowym..."
          className="mt-2 min-h-[100px] resize-y"
        />
        {errors.description && (
          <p
            id={descriptionErrorId}
            className="mt-1 text-sm text-destructive"
            role="alert"
          >
            {errors.description}
          </p>
        )}
      </div>

      {/* Part field */}
      <div>
        <label
          htmlFor={partId}
          className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Partia ciała (opcjonalny)
        </label>
        <Select
          value={fields.part ?? "none"}
          onValueChange={(value) =>
            onChange("part", value === "none" ? null : value)
          }
          disabled={disabled}
        >
          <SelectTrigger id={partId} className="mt-2">
            <SelectValue placeholder="Wybierz partię ciała" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Brak</SelectItem>
            {exercisePartValues.map((part) => (
              <SelectItem key={part} value={part}>
                {part}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.part && (
          <p
            id={partErrorId}
            className="mt-1 text-sm text-destructive"
            role="alert"
          >
            {errors.part}
          </p>
        )}
      </div>
    </div>
  );
}
