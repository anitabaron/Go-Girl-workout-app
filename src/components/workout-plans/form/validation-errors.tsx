"use client";

import { AlertCircle } from "lucide-react";
import type { ValidationErrorsProps } from "@/types/workout-plan-form";

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex-1">
          <h3 className="mb-2 font-semibold text-destructive">
            Błędy walidacji
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-destructive">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
