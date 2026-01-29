"use client";

import { forwardRef } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type FormNumberInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
  min?: number;
  required?: boolean;
  "data-test-id"?: string;
  className?: string;
};

export const FormNumberInput = forwardRef<
  HTMLInputElement,
  FormNumberInputProps
>(function FormNumberInput(
  {
    id,
    label,
    value,
    onChange,
    onBlur,
    error,
    disabled,
    min = 0,
    required,
    "data-test-id": dataTestId,
    className,
  },
  ref,
) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <FormField
      label={label}
      htmlFor={id}
      error={error}
      required={required}
      className={className}
    >
      <Input
        ref={ref}
        id={id}
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId}
        data-test-id={dataTestId}
      />
    </FormField>
  );
});
