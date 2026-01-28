"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/auth/register/password-input";
import { ConfirmPasswordInput } from "@/components/auth/register/confirm-password-input";
import { ResetPasswordConfirmButton } from "./reset-password-confirm-button";
import { ResetPasswordConfirmInstructions } from "./reset-password-confirm-instructions";
import { BackToLoginLink } from "@/components/reset-password/back-to-login-link";
import { useResetPasswordConfirmForm } from "@/hooks/use-reset-password-confirm-form";

/**
 * Główny komponent formularza potwierdzenia resetu hasła.
 * Zarządza stanem formularza z polami: newPassword, confirmPassword.
 * 
 * Używa hooka useResetPasswordConfirmForm do:
 * - Walidacji pól (minimum 6 znaków, zgodność haseł)
 * - Weryfikacji tokenu recovery
 * - Wywołania supabase.auth.updateUser({ password }) do zmiany hasła
 * - Obsługi błędów i przekierowania do /login po sukcesie
 */
export function ResetPasswordConfirmForm() {
  const {
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
  } = useResetPasswordConfirmForm();

  // Widoczność haseł
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // Jeśli token jest nieprawidłowy, formularz jest wyłączony
  const isFormDisabled = isLoading || isTokenValid === false || isTokenValid === null;

  return (
    <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
        data-test-id="reset-password-confirm-form"
      >
      <ResetPasswordConfirmInstructions />

      {isTokenValid === false && (
        <div className="rounded-md bg-destructive/10 p-3">
          <p className="text-sm text-destructive">
            Link resetu hasła jest nieprawidłowy lub wygasł. Przekierowujemy Cię do strony resetu hasła...
          </p>
        </div>
      )}

      {isTokenValid === null && (
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm text-muted-foreground">
            Weryfikacja tokenu...
          </p>
        </div>
      )}

      <PasswordInput
        value={newPassword}
        error={errors.newPassword}
        onChange={handleNewPasswordChange}
        onBlur={handleNewPasswordBlur}
        disabled={isFormDisabled}
        isVisible={isNewPasswordVisible}
        onToggleVisibility={() => setIsNewPasswordVisible((prev) => !prev)}
      />

      <ConfirmPasswordInput
        value={confirmPassword}
        password={newPassword}
        error={errors.confirmPassword}
        onChange={handleConfirmPasswordChange}
        onBlur={handleConfirmPasswordBlur}
        disabled={isFormDisabled}
        isVisible={isConfirmPasswordVisible}
        onToggleVisibility={() => setIsConfirmPasswordVisible((prev) => !prev)}
      />

      {errors._form && errors._form.length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3">
          <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
            {errors._form.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <ResetPasswordConfirmButton isLoading={isLoading} disabled={isFormDisabled} />

      <BackToLoginLink />
    </form>
  );
}
