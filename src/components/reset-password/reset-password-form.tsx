"use client";

import { useResetPasswordForm } from "@/hooks/use-reset-password-form";
import { ResetPasswordFormFields } from "./reset-password-form-fields";
import { ResetPasswordInstructions } from "./reset-password-instructions";
import { ResetPasswordButton } from "./reset-password-button";
import { BackToLoginLink } from "./back-to-login-link";

const SUCCESS_MESSAGE =
  "Sprawdź swoją skrzynkę email. Jeśli podany adres istnieje w systemie, otrzymasz link do resetu hasła.";

export function ResetPasswordForm() {
  const {
    email,
    errors,
    isLoading,
    isSubmitted,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useResetPasswordForm();

  if (isSubmitted) {
    return (
      <div className="space-y-6" data-test-id="reset-password-success">
        <p
          className="text-sm text-muted-foreground"
          data-test-id="reset-password-success-message"
        >
          {SUCCESS_MESSAGE}
        </p>
        <BackToLoginLink />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
      data-test-id="reset-password-form"
    >
      <ResetPasswordInstructions />

      <ResetPasswordFormFields
        email={email}
        error={errors.email}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={isLoading}
      />

      <ResetPasswordButton isLoading={isLoading} disabled={isLoading} />

      <BackToLoginLink />
    </form>
  );
}
