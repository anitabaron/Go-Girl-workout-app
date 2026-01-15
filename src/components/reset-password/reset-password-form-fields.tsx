"use client";

import { useEffect, useRef, useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetPasswordFormFieldsProps = Readonly<{
  email: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled: boolean;
}>;

export function ResetPasswordFormFields({
  email,
  error,
  onChange,
  onBlur,
  disabled,
}: ResetPasswordFormFieldsProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Automatyczne ustawienie focus na pole email przy załadowaniu
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        Adres email <span className="text-destructive">*</span>
      </Label>
      <Input
        ref={emailInputRef}
        id={id}
        type="email"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        autoComplete="email"
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        className={error ? "border-destructive" : ""}
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
