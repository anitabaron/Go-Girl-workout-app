"use client";

import { useId } from "react";
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
import { EXERCISE_PART_LABELS } from "@/lib/constants";
import type { WorkoutPlanMetadataFieldsProps } from "@/types/workout-plan-form";

export function WorkoutPlanMetadataFieldsM3({
  fields,
  errors,
  onChange,
  onBlur,
  disabled,
}: Readonly<WorkoutPlanMetadataFieldsProps>) {
  const nameId = useId();
  const descriptionId = useId();
  const partId = useId();

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={nameId}
          className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Plan name <span className="text-destructive">*</span>
        </label>
        <Input
          id={nameId}
          data-test-id="workout-plan-form-name"
          value={fields.name}
          onChange={(e) => onChange("name", e.target.value)}
          onBlur={() => onBlur("name")}
          disabled={disabled}
          aria-invalid={!!errors.name}
          placeholder="e.g. Upper body strength"
          className="mt-2"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={descriptionId}
          className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Description (optional)
        </label>
        <Textarea
          id={descriptionId}
          data-test-id="workout-plan-form-description"
          value={fields.description ?? ""}
          onChange={(e) => onChange("description", e.target.value || null)}
          onBlur={() => onBlur("description")}
          disabled={disabled}
          aria-invalid={!!errors.description}
          placeholder="Additional info about the plan..."
          className="mt-2 min-h-[100px] resize-y"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {errors.description}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={partId}
          className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Body part (optional)
        </label>
        <Select
          value={fields.part ?? "none"}
          onValueChange={(value) =>
            onChange("part", value === "none" ? null : value)
          }
          disabled={disabled}
        >
          <SelectTrigger
            id={partId}
            className="mt-2"
            data-test-id="workout-plan-form-part"
          >
            <SelectValue placeholder="Select body part" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {exercisePartValues.map((part) => (
              <SelectItem key={part} value={part}>
                {EXERCISE_PART_LABELS[part]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.part && (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {errors.part}
          </p>
        )}
      </div>
    </div>
  );
}
