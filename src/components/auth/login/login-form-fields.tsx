"use client";

import type { LoginFormState, LoginFormErrors } from "@/hooks/use-login-form";
import { EmailInput } from "./email-input";
import { PasswordInput } from "./password-input";

type LoginFormFieldsProps = {
  fields: LoginFormState;
  errors: LoginFormErrors;
  onChange: (field: keyof LoginFormState, value: string | boolean) => void;
  onBlur: (field: keyof LoginFormState) => void;
  disabled: boolean;
};

export function LoginFormFields({
  fields,
  errors,
  onChange,
  onBlur,
  disabled,
}: LoginFormFieldsProps) {
  return (
    <div className="space-y-4">
      <EmailInput
        value={fields.email}
        error={errors.email}
        onChange={(value) => onChange("email", value)}
        onBlur={() => onBlur("email")}
        disabled={disabled}
      />
      <PasswordInput
        value={fields.password}
        error={errors.password}
        onChange={(value) => onChange("password", value)}
        onBlur={() => onBlur("password")}
        disabled={disabled}
      />
    </div>
  );
}
