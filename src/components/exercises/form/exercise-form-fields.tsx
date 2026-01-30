"use client";

import { useEffect, useRef } from "react";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { FormNumberInput } from "@/components/ui/form-number-input";
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
import type { ExerciseFormValues } from "@/lib/validation/exercise-form";

const LEVEL_OPTIONS = [
  { value: "none", label: "Brak" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
] as const;

type FieldConfig =
  | {
      key: keyof ExerciseFormValues;
      label: string;
      type: "text";
      required?: boolean;
      "data-test-id"?: string;
    }
  | {
      key: keyof ExerciseFormValues;
      label: string;
      type: "textarea";
      rows?: number;
      "data-test-id"?: string;
    }
  | {
      key: keyof ExerciseFormValues;
      label: string;
      type: "select";
      options: readonly string[];
      placeholder?: string;
      "data-test-id"?: string;
    }
  | {
      key: keyof ExerciseFormValues;
      label: string;
      type: "select-level";
      placeholder?: string;
      "data-test-id"?: string;
    }
  | {
      key: keyof ExerciseFormValues;
      label: string;
      type: "number";
      min?: number;
      required?: boolean;
      "data-test-id"?: string;
    };

const METADATA_FIELDS: FieldConfig[] = [
  {
    key: "title",
    label: "Tytuł",
    type: "text",
    required: true,
    "data-test-id": "exercise-form-title",
  },
  {
    key: "type",
    label: "Typ",
    type: "select",
    options: exerciseTypeValues,
    placeholder: "Wybierz typ",
    "data-test-id": "exercise-form-type",
  },
  {
    key: "part",
    label: "Partia",
    type: "select",
    options: exercisePartValues,
    placeholder: "Wybierz partię",
    "data-test-id": "exercise-form-part",
  },
  {
    key: "level",
    label: "Poziom",
    type: "select-level",
    placeholder: "Wybierz poziom (opcjonalnie)",
    "data-test-id": "exercise-form-level",
  },
  {
    key: "details",
    label: "Szczegóły",
    type: "textarea",
    rows: 4,
    "data-test-id": "exercise-form-details",
  },
];

const METRICS_FIELDS: FieldConfig[] = [
  {
    key: "reps",
    label: "Powtórzenia",
    type: "number",
    min: 1,
    "data-test-id": "exercise-form-reps",
  },
  {
    key: "duration_seconds",
    label: "Czas (sek)",
    type: "number",
    min: 1,
    "data-test-id": "exercise-form-duration",
  },
  {
    key: "series",
    label: "Serie",
    type: "number",
    min: 1,
    required: true,
    "data-test-id": "exercise-form-series",
  },
];

const REST_FIELDS: FieldConfig[] = [
  {
    key: "rest_in_between_seconds",
    label: "Odpoczynek między seriami (sekundy)",
    type: "number",
    min: 0,
    "data-test-id": "exercise-form-rest-between",
  },
  {
    key: "rest_after_series_seconds",
    label: "Odpoczynek po seriach (sekundy)",
    type: "number",
    min: 0,
    "data-test-id": "exercise-form-rest-after",
  },
];

const ESTIMATED_SET_FIELD: FieldConfig = {
  key: "estimated_set_time_seconds",
  label: "Szacunkowy czas zestawu (sekundy)",
  type: "number",
  min: 1,
  "data-test-id": "exercise-form-estimated-set-time",
};

type ExerciseFormFieldsProps = {
  control: Control<ExerciseFormValues>;
  errors: FieldErrors<ExerciseFormValues>;
  disabled: boolean;
};

export function ExerciseFormFields({
  control,
  errors,
  disabled,
}: Readonly<ExerciseFormFieldsProps>) {
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  const renderField = (config: FieldConfig) => {
    const error = errors[config.key]?.message as string | undefined;

    if (config.type === "text") {
      return (
        <Controller
          key={config.key}
          name={config.key}
          control={control}
          render={({ field }) => (
            <FormField
              label={config.label}
              htmlFor={config.key}
              error={error}
              required={config.required}
            >
              <Input
                ref={config.key === "title" ? titleInputRef : undefined}
                id={config.key}
                type="text"
                data-test-id={config["data-test-id"]}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                disabled={disabled}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? `${config.key}-error` : undefined}
              />
            </FormField>
          )}
        />
      );
    }

    if (config.type === "textarea") {
      return (
        <Controller
          key={config.key}
          name={config.key}
          control={control}
          render={({ field }) => (
            <FormField label={config.label} htmlFor={config.key} error={error}>
              <Textarea
                id={config.key}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                disabled={disabled}
                rows={config.rows ?? 4}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? `${config.key}-error` : undefined}
                data-test-id={config["data-test-id"]}
              />
            </FormField>
          )}
        />
      );
    }

    if (config.type === "select" && "options" in config) {
      return (
        <Controller
          key={config.key}
          name={config.key}
          control={control}
          render={({ field }) => (
            <FormField
              label={config.label}
              htmlFor={config.key}
              error={error}
              className="w-full"
            >
              <Select
                value={String(field.value ?? "")}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id={config.key}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? `${config.key}-error` : undefined}
                  data-test-id={config["data-test-id"]}
                >
                  <SelectValue placeholder={config.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {config.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        />
      );
    }

    if (config.type === "select-level") {
      return (
        <Controller
          key={config.key}
          name="level"
          control={control}
          render={({ field }) => (
            <FormField
              label={config.label}
              htmlFor="level"
              error={error}
              className="w-full"
            >
              <Select
                value={field.value || ""}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger
                  id="level"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "level-error" : undefined}
                  data-test-id={config["data-test-id"]}
                >
                  <SelectValue placeholder={config.placeholder} />
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
      );
    }

    if (config.type === "number") {
      return (
        <Controller
          key={config.key}
          name={config.key}
          control={control}
          render={({ field }) => (
            <FormNumberInput
              id={config.key}
              label={config.label}
              value={String(field.value ?? "")}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={error}
              disabled={disabled}
              min={config.min ?? 0}
              required={config.required}
              data-test-id={config["data-test-id"]}
              className="w-full"
            />
          )}
        />
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <ExerciseMetadataFields
        control={control}
        errors={errors}
        disabled={disabled}
        renderField={renderField}
      />
      <ExerciseMetricsFields
        control={control}
        errors={errors}
        disabled={disabled}
        renderField={renderField}
      />
      <ExerciseRestFields
        control={control}
        errors={errors}
        disabled={disabled}
        renderField={renderField}
      />
      {renderField(ESTIMATED_SET_FIELD)}
    </div>
  );
}

function ExerciseMetadataFields({
  renderField,
}: {
  control: Control<ExerciseFormValues>;
  errors: FieldErrors<ExerciseFormValues>;
  disabled: boolean;
  renderField: (config: FieldConfig) => React.ReactNode;
}) {
  return (
    <>
      {renderField(METADATA_FIELDS[0])}
      <div className="sm:flex gap-2 justify-between items-center">
        {METADATA_FIELDS.slice(1, 4).map((config) => renderField(config))}
      </div>
      {renderField(METADATA_FIELDS[4])}
    </>
  );
}

function ExerciseMetricsFields({
  renderField,
}: {
  control: Control<ExerciseFormValues>;
  errors: FieldErrors<ExerciseFormValues>;
  disabled: boolean;
  renderField: (config: FieldConfig) => React.ReactNode;
}) {
  return (
    <div className="flex gap-2 justify-between items-center">
      {renderField(METRICS_FIELDS[0])}
      <p className="text-sm font-medium mt-7">lub</p>
      {renderField(METRICS_FIELDS[1])}
      {renderField(METRICS_FIELDS[2])}
    </div>
  );
}

function ExerciseRestFields({
  renderField,
}: {
  control: Control<ExerciseFormValues>;
  errors: FieldErrors<ExerciseFormValues>;
  disabled: boolean;
  renderField: (config: FieldConfig) => React.ReactNode;
}) {
  return (
    <div className="sm:flex gap-2 justify-between items-center">
      {REST_FIELDS.map((config) => renderField(config))}
    </div>
  );
}
