import * as React from "react";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  label: React.ReactNode;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  "data-test-id"?: string;
  className?: string;
};

/**
 * Wrapper dla pola formularza: label + children + komunikat błędu.
 * Zachowuje aria-invalid, aria-describedby, role="alert" dla dostępności.
 * Children (Input, Select) muszą mieć przekazane id, aria-invalid, aria-describedby.
 */
export function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
  "data-test-id": dataTestId,
  className,
}: Readonly<FormFieldProps>) {
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)} data-test-id={dataTestId}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
