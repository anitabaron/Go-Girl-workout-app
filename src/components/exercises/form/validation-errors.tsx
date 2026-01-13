"use client";

import { AlertCircle } from "lucide-react";

type ValidationErrorsProps = {
  errors: string[];
};

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-destructive bg-destructive/10 p-4"
      role="alert"
      aria-live="polite"
    >
      <ul className="space-y-2">
        {errors.map((error, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
