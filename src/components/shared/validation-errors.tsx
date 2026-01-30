"use client";

import { AlertCircle } from "lucide-react";

export type ValidationErrorsProps = {
  errors: string[];
  /** Optional heading above the error list (e.g. "Błędy walidacji") */
  title?: string;
};

export function ValidationErrors({
  errors,
  title,
}: Readonly<ValidationErrorsProps>) {
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
        <AlertCircle
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="flex-1">
          {title && (
            <h3 className="mb-2 font-semibold text-destructive">{title}</h3>
          )}
          <ul
            className={
              title
                ? "list-inside list-disc space-y-1 text-sm text-destructive"
                : "space-y-2 text-sm text-destructive"
            }
          >
            {errors.map((error, index) => (
              <li
                key={index}
                className={title ? undefined : "flex items-start gap-2"}
              >
                {title ? error : <span>{error}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
