"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/db/supabase.client";
import type { RegisterFormState, RegisterFormErrors } from "@/types/auth";
import {
  validateRegisterField,
  validateRegisterForm,
} from "@/lib/validation/register-form";
import { EmailInput } from "./email-input";
import { PasswordInput } from "./password-input";
import { ConfirmPasswordInput } from "./confirm-password-input";
import { SubmitButton } from "./submit-button";
import { LoginLink } from "./login-link";

/**
 * Główny komponent formularza rejestracji.
 * Zarządza stanem formularza, walidacją i integracją z Supabase Auth.
 */
export function RegisterForm() {
  const router = useRouter();

  // Stan formularza
  const [formState, setFormState] = useState<RegisterFormState>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Błędy walidacji
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  // Stan ładowania
  const [isLoading, setIsLoading] = useState(false);

  // Widoczność haseł
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  // Handler zmiany wartości pola
  const handleChange = (field: keyof RegisterFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));

    // Wyczyść błąd dla tego pola przy zmianie
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handler opuszczenia pola (walidacja)
  const handleBlur = (field: keyof RegisterFormState) => {
    const value = formState[field];
    const password = field === "confirmPassword" ? formState.password : undefined;
    const error = validateRegisterField(field, value, password);

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handler submit formularza
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Walidacja całego formularza
    const validationErrors = validateRegisterForm(formState);
    if (validationErrors) {
      setErrors(validationErrors);
      toast.error("Popraw błędy w formularzu przed rejestracją.");
      return;
    }

    // Wyczyść błędy formularza
    setErrors({});
    setIsLoading(true);

    try {
      // Wywołanie Supabase Auth API
      const { data, error } = await supabase.auth.signUp({
        email: formState.email.trim(),
        password: formState.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Obsługa błędów z Supabase Auth
        let errorMessage = "Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.";
        const fieldErrors: RegisterFormErrors = {};

        // Mapowanie błędów na komunikaty po polsku
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          errorMessage = "Konto z tym adresem email już istnieje. Zaloguj się lub zresetuj hasło.";
          fieldErrors.email = "Konto z tym adresem email już istnieje";
        } else if (error.message.includes("Password") || error.message.includes("password")) {
          errorMessage = "Hasło nie spełnia wymagań. Upewnij się, że ma minimum 6 znaków.";
          fieldErrors.password = "Hasło nie spełnia wymagań";
        } else if (error.message.includes("email") || error.message.includes("Email")) {
          errorMessage = "Nieprawidłowy format email.";
          fieldErrors.email = "Nieprawidłowy format email";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.";
        }

        toast.error(errorMessage);
        setErrors(fieldErrors);
        setIsLoading(false);
        return;
      }

      // Sukces - sprawdź, czy użytkowniczka została automatycznie zalogowana
      if (data.user && data.session) {
        // Automatyczne logowanie (enable_confirmations = false)
        toast.success("Rejestracja zakończona pomyślnie! Zostałaś zalogowana.");
        router.push("/");
        router.refresh();
      } else if (data.user && !data.session) {
        // Wymagane potwierdzenie emaila (enable_confirmations = true)
        toast.success(
          "Rejestracja zakończona pomyślnie! Sprawdź swoją skrzynkę email, aby potwierdzić konto."
        );
        router.push("/login");
      } else {
        // Nieoczekiwany stan
        toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");
        setIsLoading(false);
      }
    } catch (error) {
      // Obsługa błędów sieciowych i innych nieoczekiwanych błędów
      console.error("Registration error:", error);
      toast.error("Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <EmailInput
        value={formState.email}
        error={errors.email}
        onChange={(value) => handleChange("email", value)}
        onBlur={() => handleBlur("email")}
        disabled={isLoading}
      />

      <PasswordInput
        value={formState.password}
        error={errors.password}
        onChange={(value) => handleChange("password", value)}
        onBlur={() => handleBlur("password")}
        disabled={isLoading}
        isVisible={isPasswordVisible}
        onToggleVisibility={() => setIsPasswordVisible((prev) => !prev)}
      />

      <ConfirmPasswordInput
        value={formState.confirmPassword}
        password={formState.password}
        error={errors.confirmPassword}
        onChange={(value) => handleChange("confirmPassword", value)}
        onBlur={() => handleBlur("confirmPassword")}
        disabled={isLoading}
        isVisible={isConfirmPasswordVisible}
        onToggleVisibility={() => setIsConfirmPasswordVisible((prev) => !prev)}
      />

      {errors._form && errors._form.length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3">
          <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
            {errors._form.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <SubmitButton isLoading={isLoading} disabled={isLoading} />

      <div className="text-center">
        <LoginLink />
      </div>
    </form>
  );
}
