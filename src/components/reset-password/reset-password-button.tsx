"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResetPasswordButtonProps = Readonly<{
  isLoading: boolean;
  disabled?: boolean;
  cooldownRemaining?: number;
}>;

export function ResetPasswordButton({
  isLoading,
  disabled,
  cooldownRemaining = 0,
}: ResetPasswordButtonProps) {
  const isCooldownActive = cooldownRemaining > 0;

  return (
    <Button
      type="submit"
      disabled={isLoading || disabled}
      className="w-full"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Wysyłanie...
        </>
      ) : isCooldownActive ? (
        `Wyślij ponownie za ${cooldownRemaining}s`
      ) : (
        "Wyślij link resetujący"
      )}
    </Button>
  );
}
