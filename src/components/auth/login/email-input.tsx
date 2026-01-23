"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EmailInputProps = {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled: boolean;
};

export function EmailInput({
  value,
  error,
  onChange,
  onBlur,
  disabled,
}: EmailInputProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Email</Label>
      <Input
        id={id}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        autoComplete="email"
        autoFocus
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        className={error ? "border-destructive" : ""}
        data-test-id="login-email-input"
      />
      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
