"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/auth/register/password-input";
import { ConfirmPasswordInput } from "@/components/auth/register/confirm-password-input";
import { ResetPasswordConfirmButton } from "./reset-password-confirm-button";
import { ResetPasswordConfirmInstructions } from "./reset-password-confirm-instructions";
import { BackToLoginLink } from "@/components/reset-password/back-to-login-link";

/**
 * Główny komponent formularza potwierdzenia resetu hasła.
 * Zarządza stanem formularza z polami: newPassword, confirmPassword.
 * 
 * Uwaga: Logika backendowa (weryfikacja tokenu, updateUser) będzie zaimplementowana później.
 */
export function ResetPasswordConfirmForm() {
  // Stan formularza
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Błędy walidacji
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
    _form?: string[];
  }>({});

  // Stan ładowania
  const [isLoading, setIsLoading] = useState(false);

  // Widoczność haseł
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // Handler submit formularza
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // TODO: Implementacja walidacji i logiki backendowej w dalszej kolejności
    // Na razie tylko UI - formularz nie wykonuje żadnych akcji
    setIsLoading(true);
    
    // Symulacja opóźnienia dla UX
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <ResetPasswordConfirmInstructions />

      <PasswordInput
        value={newPassword}
        error={errors.newPassword}
        onChange={(value) => setNewPassword(value)}
        onBlur={() => {
          // TODO: Walidacja pola
        }}
        disabled={isLoading}
        isVisible={isNewPasswordVisible}
        onToggleVisibility={() => setIsNewPasswordVisible((prev) => !prev)}
      />

      <ConfirmPasswordInput
        value={confirmPassword}
        password={newPassword}
        error={errors.confirmPassword}
        onChange={(value) => setConfirmPassword(value)}
        onBlur={() => {
          // TODO: Walidacja pola
        }}
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

      <ResetPasswordConfirmButton isLoading={isLoading} disabled={isLoading} />

      <BackToLoginLink />
    </form>
  );
}
