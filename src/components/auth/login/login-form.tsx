"use client";

import { useLoginForm } from "@/hooks/use-login-form";
import { LoginFormFields } from "./login-form-fields";
import { RememberMeCheckbox } from "./remember-me-checkbox";
import { ValidationErrors } from "@/components/shared/validation-errors";
import { LoginButton } from "./login-button";
import { LoginLinks } from "./login-links";

export function LoginForm() {
  const { fields, errors, isLoading, handleChange, handleBlur, handleSubmit } =
    useLoginForm();

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
      data-test-id="login-form"
    >
      <LoginFormFields
        fields={fields}
        errors={errors}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={isLoading}
      />

      <RememberMeCheckbox
        checked={fields.rememberMe}
        onChange={(checked) => handleChange("rememberMe", checked)}
        disabled={isLoading}
      />

      {errors._form && errors._form.length > 0 && (
        <ValidationErrors errors={errors._form} />
      )}

      <LoginButton isLoading={isLoading} />

      <LoginLinks />
    </form>
  );
}
