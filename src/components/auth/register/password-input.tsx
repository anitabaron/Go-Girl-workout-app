"use client";

import { useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

type PasswordInputProps = {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
};

/**
 * Komponent pola input dla hasła z możliwością pokazania/ukrycia hasła i walidacją inline.
 */
export function PasswordInput({
  value,
  error,
  onChange,
  onBlur,
  disabled,
  isVisible,
  onToggleVisibility,
}: PasswordInputProps) {
  const t = useTranslations("auth.common");
  const id = useId();
  const errorId = `${id}-error`;
  const toggleId = `${id}-toggle`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("password")}</Label>
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
          aria-label={isVisible ? t("hidePassword") : t("showPassword")}
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
