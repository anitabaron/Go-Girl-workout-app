"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UseFormSetError, FieldValues, Path } from "react-hook-form";
import { parseApiValidationErrors } from "@/lib/form/parse-api-validation-errors";

export type FormErrorHandlersConfig<TFieldValues extends FieldValues> = {
  setError: UseFormSetError<TFieldValues>;
  fieldMapping: Record<string, string>;
  conflictMessage?: string;
  notFoundRedirect?: string;
  authRedirect?: string;
};

export type FormErrorHandlers = {
  handleBadRequest: (errorData: { message?: string; details?: string }) => void;
  handleConflict: (errorData: { message?: string }) => void;
  handleNotFound: (message?: string) => void;
  handleAuth: () => void;
};

/**
 * Hook zwracający handlery błędów API dla formularzy (400, 409, 404, 401).
 * Używany przez use-workout-plan-form i potencjalnie use-exercise-form.
 */
export function useFormErrorHandlers<TFieldValues extends FieldValues>({
  setError,
  fieldMapping,
  conflictMessage = "Duplikat pozycji w sekcji planu treningowego.",
  notFoundRedirect = "/workout-plans",
  authRedirect = "/",
}: FormErrorHandlersConfig<TFieldValues>): FormErrorHandlers {
  const router = useRouter();

  const handleBadRequest = useCallback(
    (errorData: { message?: string; details?: string }) => {
      const { fieldErrors, formErrors } = parseApiValidationErrors(
        errorData.message,
        errorData.details,
        fieldMapping,
      );

      for (const [field, msg] of Object.entries(fieldErrors)) {
        setError(field as Path<TFieldValues>, { message: msg });
      }
      if (formErrors.length > 0) {
        setError("root" as Path<TFieldValues>, {
          message: formErrors.join("; "),
        });
      }
      toast.error("Popraw błędy w formularzu.");
    },
    [setError, fieldMapping],
  );

  const handleConflict = useCallback(
    (errorData: { message?: string }) => {
      const message = errorData.message || conflictMessage;
      setError("root" as Path<TFieldValues>, { message });
      toast.error(message);
    },
    [setError, conflictMessage],
  );

  const handleNotFound = useCallback(
    (message?: string) => {
      toast.error(message ?? "Plan treningowy nie został znaleziony.");
      setTimeout(() => router.push(notFoundRedirect), 1500);
    },
    [router, notFoundRedirect],
  );

  const handleAuth = useCallback(() => {
    toast.error("Brak autoryzacji. Zaloguj się ponownie.");
    setTimeout(() => router.push(authRedirect), 1500);
  }, [router, authRedirect]);

  return {
    handleBadRequest,
    handleConflict,
    handleNotFound,
    handleAuth,
  };
}
