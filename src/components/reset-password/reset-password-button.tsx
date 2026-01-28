"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResetPasswordButtonProps = Readonly<{
  isLoading: boolean;
  disabled?: boolean;
}>;

export function ResetPasswordButton({
  isLoading,
  disabled,
}: ResetPasswordButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isLoading || disabled}
      className="w-full"
      aria-busy={isLoading}
      data-test-id="reset-password-submit-button"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Wysyłanie...
        </>
      ) : (
        "Wyślij link resetujący"
      )}
    </Button>
  );
}
