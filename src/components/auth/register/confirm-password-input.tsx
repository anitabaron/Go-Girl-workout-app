"use client";

import { useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

type ConfirmPasswordInputProps = {
  value: string;
  password: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
};

/**
 * Komponent pola input dla potwierdzenia hasła z walidacją zgodności i możliwością pokazania/ukrycia.
 */
export function ConfirmPasswordInput({
  value,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  password: _password,
  error,
  onChange,
  onBlur,
  disabled,
  isVisible,
  onToggleVisibility,
}: ConfirmPasswordInputProps) {
  const t = useTranslations("auth");
  const id = useId();
  const errorId = `${id}-error`;
  const toggleId = `${id}-toggle`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("registerForm.confirmPassword")}</Label>
      <div className="relative">
        <Input
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete="new-password"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          className={error ? "border-destructive pr-10" : "pr-10"}
        />
        <Button
          id={toggleId}
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={
            isVisible ? t("common.hidePassword") : t("common.showPassword")
          }
          aria-pressed={isVisible}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
