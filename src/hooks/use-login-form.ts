"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/db/supabase.client";
import { useAuthStore } from "@/stores/auth-store";
import { mapAuthError } from "@/lib/auth-errors";
import { useAuthRedirect } from "@/contexts/auth-redirect-context";
import { useTranslations } from "@/i18n/client";

// ViewModel - stan formularza logowania
export type LoginFormState = {
  email: string;
  password: string;
};

// Błędy walidacji
export type LoginFormErrors = {
  email?: string;
  password?: string;
  _form?: string[];
};

function createLoginFormSchema(t: (key: string) => string) {
  return z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, t("validationEmailRequired"))
      .pipe(z.email({ error: t("validationEmailInvalid") })),
    password: z.string().min(6, t("validationPasswordMin")),
  });
}

type UseLoginFormProps = {
  onSuccess?: () => void;
};

export function useLoginForm({ onSuccess }: UseLoginFormProps = {}) {
  const t = useTranslations("auth.loginForm");
  const tAuthErrors = useTranslations("auth.errors");
  const loginFormSchema = useMemo(() => createLoginFormSchema(t), [t]);
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const { basePath } = useAuthRedirect();
  const [fields, setFields] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Walidacja pojedynczego pola
  const validateField = useCallback(
    (
      field: keyof LoginFormState,
      value: string | boolean
    ): string | undefined => {
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
    [loginFormSchema]
  );

  // Handler zmiany wartości pola
  const handleChange = useCallback(
    (field: keyof LoginFormState, value: string | boolean) => {
      setFields((prev) => ({ ...prev, [field]: value }));

      // Czyszczenie błędu dla tego pola przy zmianie wartości
      if (
        (field === "email" && errors.email) ||
        (field === "password" && errors.password)
      ) {
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
          email: fields.email.trim().toLowerCase(),
          password: fields.password,
        });

        if (error) {
          // Użycie centralnego mapowania błędów
          const errorMessage = mapAuthError(error, tAuthErrors);
          const formErrors: string[] = [errorMessage];

          toast.error(errorMessage);

          setErrors({
            _form: formErrors,
            password: t("errorInvalidPassword"),
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
        } else if (data.session && data.user) {
          // Aktualizacja Zustand store
          setUser(data.user);

          // Sukces - przekierowanie
          toast.success(t("successLoggedIn"));

          if (onSuccess) {
            onSuccess();
          } else {
            router.push(basePath || "/");
            router.refresh();
          }
        }
      } catch (error) {
        // Obsługa błędów sieci i innych nieoczekiwanych błędów
        const errorMessage = mapAuthError(error as Error, tAuthErrors);

        toast.error(errorMessage);
        setErrors({
          _form: [errorMessage],
        });

        // Scroll do pierwszego błędu
        setTimeout(() => {
          const firstErrorElement = document.querySelector('[role="alert"]');
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
    [fields, router, onSuccess, setUser, basePath, loginFormSchema, tAuthErrors, t]
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
