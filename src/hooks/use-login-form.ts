"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/db/supabase.client";

// ViewModel - stan formularza logowania
export type LoginFormState = {
  email: string;
  password: string;
  rememberMe: boolean;
};

// Błędy walidacji
export type LoginFormErrors = {
  email?: string;
  password?: string;
  _form?: string[];
};

// Schema Zod do walidacji formularza
const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email jest wymagany")
    .email("Nieprawidłowy format email"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  rememberMe: z.boolean().optional().default(false),
});

type UseLoginFormProps = {
  onSuccess?: () => void;
};

export function useLoginForm({ onSuccess }: UseLoginFormProps = {}) {
  const router = useRouter();
  const [fields, setFields] = useState<LoginFormState>({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Walidacja pojedynczego pola
  const validateField = useCallback(
    (field: keyof LoginFormState, value: string | boolean): string | undefined => {
      if (field === "rememberMe") {
        return undefined; // rememberMe nie wymaga walidacji
      }

      const fieldSchema =
        field === "email"
          ? loginFormSchema.shape.email
          : loginFormSchema.shape.password;

      const result = fieldSchema.safeParse(value);

      if (!result.success) {
        return result.error.issues[0]?.message;
      }

      return undefined;
    },
    []
  );

  // Handler zmiany wartości pola
  const handleChange = useCallback(
    (field: keyof LoginFormState, value: string | boolean) => {
      setFields((prev) => ({ ...prev, [field]: value }));

      // Czyszczenie błędu dla tego pola przy zmianie wartości
      if ((field === "email" && errors.email) || (field === "password" && errors.password)) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (field === "email") {
            delete newErrors.email;
          } else if (field === "password") {
            delete newErrors.password;
          }
          return newErrors;
        });
      }

      // Czyszczenie błędów formularza przy zmianie wartości
      if (errors._form && errors._form.length > 0) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors._form;
          return newErrors;
        });
      }
    },
    [errors]
  );

  // Handler blur dla walidacji
  const handleBlur = useCallback(
    (field: keyof LoginFormState) => {
      const value = fields[field];
      const error = validateField(field, value);

      if (error) {
        if (field === "email") {
          setErrors((prev) => ({ ...prev, email: error }));
        } else if (field === "password") {
          setErrors((prev) => ({ ...prev, password: error }));
        }
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (field === "email") {
            delete newErrors.email;
          } else if (field === "password") {
            delete newErrors.password;
          }
          return newErrors;
        });
      }
    },
    [fields, validateField]
  );

  // Handler submit formularza
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Walidacja całego formularza
      const validationResult = loginFormSchema.safeParse({
        email: fields.email.trim(),
        password: fields.password,
        rememberMe: fields.rememberMe,
      });

      if (!validationResult.success) {
        const fieldErrors: LoginFormErrors = {};
        validationResult.error.issues.forEach((issue) => {
          const field = issue.path[0] as keyof LoginFormState;
          if (field === "email" || field === "password") {
            if (field === "email") {
              fieldErrors.email = issue.message;
            } else if (field === "password") {
              fieldErrors.password = issue.message;
            }
          }
        });
        setErrors(fieldErrors);
        
        // Scroll do pierwszego błędu walidacji
        setTimeout(() => {
          const firstErrorElement = document.querySelector(
            '[aria-invalid="true"]'
          );
          if (firstErrorElement) {
            firstErrorElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            // Focus na pierwsze pole z błędem
            const input = firstErrorElement as HTMLInputElement;
            input?.focus();
          }
        }, 100);
        return;
      }

      // Czyszczenie błędów przed wysłaniem
      setErrors({});
      setIsLoading(true);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: fields.email.trim(),
          password: fields.password,
        });

        if (error) {
          // Obsługa błędów autoryzacji
          let errorMessage = "Nieprawidłowy email lub hasło";
          const formErrors: string[] = [];

          // Sprawdzenie typu błędu
          const errorMsg = error.message.toLowerCase();
          
          if (
            errorMsg.includes("email not confirmed") ||
            errorMsg.includes("email_not_confirmed")
          ) {
            errorMessage =
              "Konto nie zostało aktywowane. Sprawdź email i kliknij link aktywacyjny.";
            formErrors.push(errorMessage);
            toast.error(errorMessage);
          } else if (
            errorMsg.includes("rate limit") ||
            errorMsg.includes("too many requests") ||
            error.status === 429
          ) {
            errorMessage =
              "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.";
            formErrors.push(errorMessage);
            toast.error(errorMessage);
          } else if (error.status && error.status >= 500) {
            errorMessage = "Wystąpił błąd serwera. Spróbuj ponownie później.";
            formErrors.push(errorMessage);
            toast.error(errorMessage);
          } else {
            // Domyślny komunikat błędu (już ustawiony na początku)
            formErrors.push(errorMessage);
            toast.error(errorMessage);
          }

          setErrors({
            _form: formErrors,
            password: "Nieprawidłowe hasło",
          });

          // Wyczyszczenie hasła ze względów bezpieczeństwa
          setFields((prev) => ({ ...prev, password: "" }));

          // Scroll do pierwszego błędu
          setTimeout(() => {
            const firstErrorElement = document.querySelector(
              '[aria-invalid="true"], [role="alert"]'
            );
            if (firstErrorElement) {
              firstErrorElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              // Focus na pierwsze pole z błędem
              const input = firstErrorElement.querySelector("input");
              if (input) {
                input.focus();
              }
            }
          }, 100);
        } else if (data.session) {
          // Sukces - przekierowanie
          toast.success("Zalogowano pomyślnie");
          if (onSuccess) {
            onSuccess();
          } else {
            router.push("/");
          }
        }
      } catch (error) {
        // Obsługa błędów sieci
        let errorMessage: string;
        
        if (error instanceof TypeError) {
          // Network error (brak połączenia, timeout)
          if (
            error.message.includes("fetch") ||
            error.message.includes("network") ||
            error.message.includes("Failed to fetch")
          ) {
            errorMessage =
              "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.";
          } else {
            errorMessage =
              "Wystąpił błąd połączenia. Sprawdź połączenie i spróbuj ponownie.";
          }
        } else {
          // Nieoczekiwany błąd
          errorMessage =
            "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.";
          console.error("Unexpected error during login:", error);
        }

        toast.error(errorMessage);
        setErrors({
          _form: [errorMessage],
        });

        // Scroll do pierwszego błędu
        setTimeout(() => {
          const firstErrorElement = document.querySelector(
            '[role="alert"]'
          );
          if (firstErrorElement) {
            firstErrorElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }, 100);
      } finally {
        setIsLoading(false);
      }
    },
    [fields, router, onSuccess]
  );

  return {
    fields,
    errors,
    isLoading,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
