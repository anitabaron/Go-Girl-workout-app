"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";

type PlannedParamFieldProps = {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  disabled?: boolean;
  min?: number;
  step?: number;
  placeholder?: string;
  "data-test-id"?: string;
};

export function PlannedParamField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  min = 0,
  step = 1,
  placeholder = "—",
  "data-test-id": dataTestId,
}: Readonly<PlannedParamFieldProps>) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw.trim() === "") {
      onChange(null);
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <Input
        id={inputId}
        type="number"
        min={min}
        step={step}
        value={value ?? ""}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1"
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        data-test-id={dataTestId}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
