"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/db/supabase.client";

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
          // Przekierowanie do /reset-password po krótkim opóźnieniu
          setTimeout(() => {
            router.push("/reset-password?error=invalid_token");
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
        setTimeout(() => {
          router.push("/reset-password?error=invalid_token");
        }, 2000);
      }
    };

    checkToken();
  }, [router]);

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
      if (error instanceof z.ZodError && error.issues && error.issues.length > 0) {
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
    const error = validateField("confirmPassword", confirmPassword, newPassword);
    setErrors((prev) => ({ ...prev, confirmPassword: error }));
  };

  /**
   * Handler submit formularza.
   */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    // Sprawdzenie ważności tokenu
    if (isTokenValid === false) {
      toast.error(
        "Link resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy link."
      );
      router.push("/reset-password?error=invalid_token");
      return;
    }

    if (isTokenValid === null) {
      // Czekamy na weryfikację tokenu
      toast.info("Weryfikacja tokenu...");
      return;
    }

    // Walidacja formularza
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Wywołanie updateUser do zmiany hasła
      // Supabase automatycznie weryfikuje, czy sesja recovery jest ważna
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        // Obsługa błędów Supabase Auth
        if (
          error.message.includes("invalid") ||
          error.message.includes("expired") ||
          error.message.includes("token")
        ) {
          toast.error(
            "Link resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy link."
          );
          router.push("/reset-password?error=invalid_token");
        } else if (error.message.includes("password")) {
          setErrors({
            newPassword: "Hasło nie spełnia wymagań. Minimum 6 znaków.",
          });
          toast.error("Hasło nie spełnia wymagań. Minimum 6 znaków.");
        } else {
          toast.error(
            "Nie udało się zmienić hasła. Spróbuj ponownie później."
          );
        }
        setIsLoading(false);
        return;
      }

      // Sukces - hasło zostało zmienione
      // Supabase automatycznie loguje użytkownika po updateUser, więc musimy go wylogować
      // aby użytkownik mógł się zalogować z nowym hasłem
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error("Error signing out after password reset:", signOutError);
        // Kontynuujemy mimo błędu wylogowania - przekierowanie do /login
      }

      toast.success("Hasło zostało pomyślnie zmienione. Możesz się teraz zalogować.");
      
      // Przekierowanie do /login po krótkim opóźnieniu
      setTimeout(() => {
        router.push("/login");
        router.refresh(); // Odświeżenie routera, aby upewnić się, że sesja została usunięta
      }, 1500);
    } catch (error) {
      // Obsługa błędów sieciowych
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
        console.error("Unexpected error during password update:", error);
      }
      setIsLoading(false);
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
