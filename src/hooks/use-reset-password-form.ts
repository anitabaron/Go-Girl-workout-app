"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/db/supabase.client";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormInput,
} from "@/lib/validation/reset-password";
import { useAuthRedirect } from "@/contexts/auth-redirect-context";

/**
 * Stan formularza resetu hasła.
 */
export type ResetPasswordFormState = {
  email: string;
};

/**
 * Błędy walidacji formularza resetu hasła.
 */
export type ResetPasswordFormErrors = {
  email?: string;
  _form?: string[];
};

/**
 * Custom hook zarządzający stanem i logiką formularza resetu hasła.
 */
export function useResetPasswordForm() {
  const { basePath } = useAuthRedirect();
  const [email, setEmail] = useState<string>("");
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  /**
   * Walidacja pojedynczego pola.
   */
  const validateField = (field: "email", value: string): string | undefined => {
    try {
      resetPasswordFormSchema.shape[field].parse(value);
      return undefined;
    } catch (error) {
      if (
        error instanceof z.ZodError &&
        error.issues &&
        error.issues.length > 0
      ) {
        return error.issues[0]?.message;
      }
      return "Nieprawidłowa wartość";
    }
  };

  /**
   * Walidacja całego formularza.
   */
  const validateForm = (): boolean => {
    const formData: ResetPasswordFormInput = { email };
    const result = resetPasswordFormSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: ResetPasswordFormErrors = {};
      result.error.issues.forEach((error) => {
        const field = error.path[0] as keyof ResetPasswordFormState;
        if (field === "email") {
          fieldErrors.email = error.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  /**
   * Handler zmiany wartości pola.
   */
  const handleChange = (value: string): void => {
    setEmail(value);
    // Czyszczenie błędu dla tego pola, jeśli występował
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  /**
   * Handler opuszczenia pola.
   */
  const handleBlur = (): void => {
    const error = validateField("email", email);
    setErrors((prev) => ({ ...prev, email: error }));
  };

  /**
   * Handler submit formularza.
   */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    // Walidacja formularza
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const callbackPath = basePath ? `${basePath}/auth/callback` : "/auth/callback";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Route through auth callback so PKCE/code links are exchanged for a session
        // before rendering the password change form.
        redirectTo: `${globalThis.location.origin}${callbackPath}`,
      });

      if (error) {
        // Obsługa błędów Supabase Auth
        if (
          error.message.includes("rate_limit") ||
          error.message.includes("too many")
        ) {
          toast.error(
            "Zbyt wiele prób wysłania linku resetującego. Spróbuj ponownie za chwilę."
          );
        } else if (error.message.includes("invalid_email")) {
          setErrors({ email: "Nieprawidłowy format adresu email" });
          toast.error("Nieprawidłowy format adresu email");
        } else {
          toast.error(
            "Nie udało się wysłać linku resetującego. Spróbuj ponownie później."
          );
        }
        setIsLoading(false);
        return;
      }

      // Sukces - zawsze wyświetlamy pozytywny komunikat (dla bezpieczeństwa)
      toast.success(
        "Sprawdź swoją skrzynkę email. Jeśli podany adres istnieje w systemie, otrzymasz link do resetu hasła."
      );
      setIsSubmitted(true);
      setIsLoading(false);
    } catch (error) {
      // Obsługa błędów sieciowych
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
        console.error("Unexpected error during password reset:", error);
      }
      setIsLoading(false);
    }
  };

  return {
    email,
    errors,
    isLoading,
    isSubmitted,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
