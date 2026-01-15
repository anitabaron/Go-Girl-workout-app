"use client";

import { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type PasswordInputProps = {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled: boolean;
};

export function PasswordInput({
  value,
  error,
  onChange,
  onBlur,
  disabled,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const id = useId();
  const errorId = `${id}-error`;
  const toggleId = `${id}-toggle`;

  const handleToggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Hasło</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete="current-password"
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
          onClick={handleToggleVisibility}
          disabled={disabled}
          aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
          aria-pressed={showPassword}
        >
          {showPassword ? (
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
