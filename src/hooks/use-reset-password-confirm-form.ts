"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/db/supabase.client";
import { useAuthRedirect } from "@/contexts/auth-redirect-context";

/**
 * Schema Zod do walidacji formularza potwierdzenia resetu hasła.
 */
const resetPasswordConfirmFormSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, "Hasło jest wymagane")
      .min(6, "Hasło musi mieć minimum 6 znaków")
      .regex(/^[^\s]+$/, "Hasło nie może zawierać spacji"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

/**
 * Stan formularza potwierdzenia resetu hasła.
 */
export type ResetPasswordConfirmFormState = {
  newPassword: string;
  confirmPassword: string;
};

/**
 * Błędy walidacji formularza potwierdzenia resetu hasła.
 */
export type ResetPasswordConfirmFormErrors = {
  newPassword?: string;
  confirmPassword?: string;
  _form?: string[];
};

/**
 * Custom hook zarządzający stanem i logiką formularza potwierdzenia resetu hasła.
 *
 * Hook obsługuje:
 * - Walidację pól (minimum 6 znaków, zgodność haseł)
 * - Wywołanie `supabase.auth.updateUser({ password })` do zmiany hasła
 * - Obsługę błędów (nieprawidłowy/wygasły token, błędy sieci, walidacja)
 * - Przekierowanie do `/login` po sukcesie
 */
export function useResetPasswordConfirmForm() {
  const router = useRouter();
  const { basePath } = useAuthRedirect();
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [errors, setErrors] = useState<ResetPasswordConfirmFormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  /**
   * Sprawdzenie ważności tokenu recovery przy montowaniu komponentu.
   * Supabase automatycznie przetwarza hash fragment (#access_token=...) i ustawia sesję recovery w cookies.
   * Sprawdzamy, czy sesja recovery istnieje.
   */
  useEffect(() => {
    const checkToken = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          setIsTokenValid(false);
          toast.error(
            "Link resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy link."
          );
          const resetPath = basePath
            ? `${basePath}/reset-password?error=invalid_token`
            : "/reset-password?error=invalid_token";
          setTimeout(() => {
            router.push(resetPath);
          }, 2000);
          return;
        }

        // Sprawdzenie, czy sesja jest sesją recovery (reset hasła)
        // W Supabase, sesja recovery jest ustawiana automatycznie po kliknięciu linku w emailu
        // Jeśli sesja istnieje, token jest ważny
        setIsTokenValid(true);
      } catch (error) {
        console.error("Error checking token:", error);
        setIsTokenValid(false);
        toast.error("Wystąpił błąd podczas weryfikacji tokenu.");
        const resetPath = basePath
          ? `${basePath}/reset-password?error=invalid_token`
          : "/reset-password?error=invalid_token";
        setTimeout(() => {
          router.push(resetPath);
        }, 2000);
      }
    };

    checkToken();
  }, [router, basePath]);

  /**
   * Walidacja pojedynczego pola.
   */
  const validateField = (
    field: "newPassword" | "confirmPassword",
    value: string,
    otherValue?: string
  ): string | undefined => {
    try {
      if (field === "newPassword") {
        resetPasswordConfirmFormSchema.shape.newPassword.parse(value);
      } else if (field === "confirmPassword") {
        // Dla confirmPassword potrzebujemy również newPassword do sprawdzenia zgodności
        if (value !== otherValue) {
          return "Hasła nie są identyczne";
        }
        resetPasswordConfirmFormSchema.shape.confirmPassword.parse(value);
      }
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
    const formData = {
      newPassword,
      confirmPassword,
    };
    const result = resetPasswordConfirmFormSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: ResetPasswordConfirmFormErrors = {};
      result.error.issues.forEach((error) => {
        const field = error.path[0] as keyof ResetPasswordConfirmFormState;
        if (field === "newPassword") {
          fieldErrors.newPassword = error.message;
        } else if (field === "confirmPassword") {
          fieldErrors.confirmPassword = error.message;
        } else {
          // Błędy globalne (np. z refine)
          fieldErrors._form ??= [];
          fieldErrors._form.push(error.message);
        }
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  /**
   * Handler zmiany wartości pola newPassword.
   */
  const handleNewPasswordChange = (value: string): void => {
    setNewPassword(value);
    // Czyszczenie błędu dla tego pola, jeśli występował
    if (errors.newPassword) {
      setErrors((prev) => ({ ...prev, newPassword: undefined }));
    }
    // Jeśli confirmPassword ma wartość, sprawdź zgodność
    if (confirmPassword && value !== confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Hasła nie są identyczne",
      }));
    } else if (confirmPassword && value === confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  /**
   * Handler zmiany wartości pola confirmPassword.
   */
  const handleConfirmPasswordChange = (value: string): void => {
    setConfirmPassword(value);
    // Czyszczenie błędu dla tego pola, jeśli występował
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
    // Sprawdź zgodność z newPassword
    if (value === newPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    } else {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Hasła nie są identyczne",
      }));
    }
  };

  /**
   * Handler opuszczenia pola newPassword.
   */
  const handleNewPasswordBlur = (): void => {
    const error = validateField("newPassword", newPassword);
    setErrors((prev) => ({ ...prev, newPassword: error }));
    // Jeśli confirmPassword ma wartość, sprawdź zgodność
    if (confirmPassword && newPassword !== confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Hasła nie są identyczne",
      }));
    }
  };

  /**
   * Handler opuszczenia pola confirmPassword.
   */
  const handleConfirmPasswordBlur = (): void => {
    const error = validateField(
      "confirmPassword",
      confirmPassword,
      newPassword
    );
    setErrors((prev) => ({ ...prev, confirmPassword: error }));
  };

  const redirectToInvalidTokenPage = (): void => {
    toast.error(
      "Link resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy link."
    );
    const resetPath = basePath
      ? `${basePath}/reset-password?error=invalid_token`
      : "/reset-password?error=invalid_token";
    router.push(resetPath);
  };

  const handleAuthUpdateError = (error: { message: string }): void => {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("invalid") ||
      msg.includes("expired") ||
      msg.includes("token")
    ) {
      redirectToInvalidTokenPage();
    } else if (msg.includes("password")) {
      setErrors({
        newPassword: "Hasło nie spełnia wymagań. Minimum 6 znaków.",
      });
      toast.error("Hasło nie spełnia wymagań. Minimum 6 znaków.");
    } else {
      toast.error("Nie udało się zmienić hasła. Spróbuj ponownie później.");
    }
    setIsLoading(false);
  };

  const finishPasswordResetSuccess = async (): Promise<void> => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Error signing out after password reset:", signOutError);
    }
    toast.success(
      "Hasło zostało pomyślnie zmienione. Możesz się teraz zalogować."
    );
    const loginPath = basePath ? `${basePath}/login` : "/login";
    setTimeout(() => {
      router.push(loginPath);
      router.refresh();
    }, 1500);
  };

  const handlePasswordUpdateUnexpectedError = (error: unknown): void => {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      toast.error(
        "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
      );
    } else {
      toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      console.error("Unexpected error during password update:", error);
    }
    setIsLoading(false);
  };

  /**
   * Handler submit formularza.
   */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (isTokenValid === false) {
      redirectToInvalidTokenPage();
      return;
    }
    if (isTokenValid === null) {
      toast.info("Weryfikacja tokenu...");
      return;
    }
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        handleAuthUpdateError(error);
        return;
      }

      await finishPasswordResetSuccess();
    } catch (error) {
      handlePasswordUpdateUnexpectedError(error);
    }
  };

  return {
    newPassword,
    confirmPassword,
    errors,
    isLoading,
    isTokenValid,
    handleNewPasswordChange,
    handleConfirmPasswordChange,
    handleNewPasswordBlur,
    handleConfirmPasswordBlur,
    handleSubmit,
  };
}
