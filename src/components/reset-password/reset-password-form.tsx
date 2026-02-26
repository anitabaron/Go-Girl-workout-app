"use client";

import { useResetPasswordForm } from "@/hooks/use-reset-password-form";
import { ResetPasswordFormFields } from "./reset-password-form-fields";
import { ResetPasswordInstructions } from "./reset-password-instructions";
import { ResetPasswordButton } from "./reset-password-button";
import { BackToLoginLink } from "./back-to-login-link";

export function ResetPasswordForm() {
  const {
    email,
    errors,
    isLoading,
    cooldownRemaining,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useResetPasswordForm();

  const isCooldownActive = cooldownRemaining > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <ResetPasswordInstructions />

      <ResetPasswordFormFields
        email={email}
        error={errors.email}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={isLoading}
      />

      <ResetPasswordButton
        isLoading={isLoading}
        disabled={isLoading || isCooldownActive}
        cooldownRemaining={cooldownRemaining}
      />

      <div className="pt-2">
        <BackToLoginLink />
      </div>
    </form>
  );
}
