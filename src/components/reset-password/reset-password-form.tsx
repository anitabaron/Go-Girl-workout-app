"use client";

import { CircleCheck } from "lucide-react";
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
    isSubmitted,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useResetPasswordForm();

  if (isSubmitted) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CircleCheck className="h-10 w-10" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Sprawdź email</h2>
          <p className="text-base text-muted-foreground">
            Wysłaliśmy link do resetu hasła na podany adres email.
          </p>
        </div>
        <div className="pt-2">
          <BackToLoginLink />
        </div>
      </div>
    );
  }

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
        disabled={isLoading}
      />

      <div className="pt-2">
        <BackToLoginLink />
      </div>
    </form>
  );
}
